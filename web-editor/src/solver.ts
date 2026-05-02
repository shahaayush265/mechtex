import type { ASTNode } from "./parser";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PathSegment {
  type: "line" | "arc";
  x: number;
  y: number;
  r?: number;
  cx?: number;
  cy?: number;
  method?: string;
  inP?: { x: number; y: number };
  outP?: { x: number; y: number };
}

export interface ResolvedComponent {
  type: string;
  id: string;
  properties: Record<string, any>;
  bounds?: BoundingBox;
  endpoints?: { x1: number; y1: number; x2: number; y2: number };
  pathSegments?: PathSegment[];
  startX?: number;
  startY?: number;
  rotation?: number;
}

interface NormalizedOnConstraint {
  anchorRef: { id: string; anchor: string };
  mu?: number;
}

export class Solver {
  private ast: ASTNode;
  private components: Map<string, ASTNode> = new Map();
  private resolved: Map<string, ResolvedComponent> = new Map();

  constructor(ast: ASTNode) {
    this.ast = ast;
    if (this.ast.type !== "system") throw new Error("Root node must be system");

    // Register all components
    for (const stmt of this.ast.statements) {
      if (stmt.type === "component" && stmt.properties.id) {
        this.components.set(stmt.properties.id, stmt);
      }
    }
  }

  resolve(): ResolvedComponent[] {
    // Topological sort: resolve dependencies first
    // For MVP, we'll use a simple iterative approach:
    // Keep trying to resolve unresolved components until no progress is made.

    let progress = true;
    while (progress && this.resolved.size < this.components.size) {
      progress = false;
      for (const [id, node] of this.components.entries()) {
        if (!this.resolved.has(id)) {
          if (this.tryResolve(node)) {
            progress = true;
          }
        }
      }
    }

    if (this.resolved.size < this.components.size) {
      throw new Error("Cyclic or Unresolvable dependencies detected!");
    }

    return Array.from(this.resolved.values());
  }

  private tryResolve(node: ASTNode): boolean {
    const id = node.properties.id;
    const constraints = this.normalizeConstraints(node);
    const onConstraint = this.normalizeOnConstraint(constraints.on);
    const groupId =
      node.name === "group"
        ? undefined
        : constraints.group || node.properties.group;
    if (groupId && !this.resolved.has(groupId)) return false;
    const groupOffset = this.shouldApplyGroupOffset(groupId, constraints)
      ? this.getGroupOffset(groupId)
      : { x: 0, y: 0 };
    let x = 0,
      y = 0;
    let width = node.properties.width || 0;
    let height = node.properties.height || 0;

    // Group logic: invisible translation handle for member components.
    if (node.name === "group") {
      x = constraints.x !== undefined ? constraints.x : node.properties.x || 0;
      y = constraints.y !== undefined ? constraints.y : node.properties.y || 0;
      this.resolved.set(id, {
        type: node.name,
        id,
        properties: { ...node.properties, x, y },
        bounds: { x, y, width: 0, height: 0 },
      });
      return true;
    }

    // Miscellaneous label/note logic.
    if (node.name === "label" || node.name === "note" || node.name === "text") {
      const anchorRef =
        constraints.at || constraints.origin || constraints.connects;
      if (anchorRef) {
        if (!this.resolved.has(anchorRef.id)) return false;
        const anchorPos = this.getAnchorPosition(
          anchorRef.id,
          anchorRef.anchor,
        );
        x = anchorPos.x;
        y = anchorPos.y;
      } else {
        x =
          constraints.x !== undefined ? constraints.x : node.properties.x || 0;
        y =
          constraints.y !== undefined ? constraints.y : node.properties.y || 0;
      }
      x += constraints.dx || node.properties.dx || 0;
      y += constraints.dy || node.properties.dy || 0;
      this.resolved.set(
        id,
        this.offsetComponent(
          {
            type: "label",
            id,
            properties: { ...node.properties, x, y },
            bounds: { x, y, width: 0, height: 0 },
          },
          groupOffset,
        ),
      );
      return true;
    }

    // Floor logic
    if (node.name === "floor") {
      width = node.properties.width || 1000; // Default large width
      height = node.properties.thickness || 0.5;
      let surfaceY = 0;
      if (constraints.y !== undefined) {
        surfaceY = constraints.y;
      }
      y = surfaceY - height;
      // x defaults to center=0 for infinite floors, or 0
      x = -width / 2;
      this.resolved.set(
        id,
        this.offsetComponent(
          {
            type: node.name,
            id,
            properties: node.properties,
            bounds: { x, y, width, height },
          },
          groupOffset,
        ),
      );
      return true;
    }

    // Block logic
    if (node.name === "block") {
      width = node.properties.width;
      height = node.properties.height;
      let resolvedX = false;
      let resolvedY = false;

      // hang=anchor: primary placement for freely-suspended blocks.
      if (constraints.hang) {
        const hangRef = constraints.hang;
        if (!this.resolved.has(hangRef.id)) return false;
        const anchorPos = this.getAnchorPosition(hangRef.id, hangRef.anchor);
        // center-x of block = anchor x
        x = anchorPos.x - width / 2;
        resolvedX = true;
        if (constraints.y !== undefined) {
          // y constraint = bottom of block
          y = constraints.y;
        } else if (constraints.top !== undefined) {
          y = constraints.top - height;
        } else {
          // block top touches anchor
          y = anchorPos.y - height;
        }
        resolvedY = true;
      }

      // Vertical constraint (block resting on a surface)
      if (!resolvedY && onConstraint) {
        const anchorId = onConstraint.anchorRef.id;
        const target = this.resolved.get(anchorId);
        if (!target) return false;
        if (onConstraint.anchorRef.anchor === "surface") {
          if (target.type === "incline") {
            const angle = target.rotation || 0;
            const rad = (angle * Math.PI) / 180;
            const pos = constraints.position || 0;

            // Base vertex of the incline
            const ix = target.properties.x;
            const iy = target.properties.y;

            // Point on the surface
            const sx = ix + pos * Math.cos(rad);
            const sy = iy + pos * Math.sin(rad);

            // Normal unit vector: (-sin, cos)
            const nx = -Math.sin(rad);
            const ny = Math.cos(rad);

            // Shift center out by height/2 along normal
            const cx = sx + (height / 2) * nx;
            const cy = sy + (height / 2) * ny;

            this.resolved.set(
              id,
              this.offsetComponent(
                {
                  type: node.name,
                  id,
                  properties: this.applyContactProperties(
                    node.properties,
                    onConstraint,
                  ),
                  bounds: {
                    x: cx - width / 2,
                    y: cy - height / 2,
                    width,
                    height,
                  },
                  rotation: angle,
                },
                groupOffset,
              ),
            );
            return true;
          } else {
            y = target.bounds!.y + target.bounds!.height;
            resolvedY = true;
          }
        }
      }

      if (!resolvedX && constraints.align_x) {
        const anchorRef = constraints.align_x;
        if (!this.resolved.has(anchorRef.id)) return false;
        const anchorPos = this.getAnchorPosition(
          anchorRef.id,
          anchorRef.anchor,
        );
        x = anchorPos.x - width / 2;
        resolvedX = true;
      }

      if (!resolvedY && constraints.below) {
        const anchorRef = constraints.below;
        if (!this.resolved.has(anchorRef.id)) return false;
        const anchorPos = this.getAnchorPosition(
          anchorRef.id,
          anchorRef.anchor,
        );
        y = anchorPos.y - (constraints.distance || 0) - height;
        resolvedY = true;
      }

      // Horizontal constraint: below=anchor places block center under anchor's x
      if (!resolvedX && constraints.below) {
        const anchorRef = constraints.below;
        if (!this.resolved.has(anchorRef.id)) return false;
        const anchorPos = this.getAnchorPosition(
          anchorRef.id,
          anchorRef.anchor,
        );
        x = anchorPos.x - width / 2; // Convert center to left edge
        resolvedX = true;
      } else if (!resolvedX && constraints.position !== undefined) {
        x = constraints.position;
        resolvedX = true;
      } else if (!resolvedX && constraints.x !== undefined) {
        x = constraints.x;
        resolvedX = true;
      }

      if (!resolvedX) x = -width / 2;
      if (!resolvedY) y = 0;

      this.resolved.set(
        id,
        this.offsetComponent(
          {
            type: node.name,
            id,
            properties: this.applyContactProperties(
              node.properties,
              onConstraint,
            ),
            bounds: { x, y, width, height },
          },
          groupOffset,
        ),
      );
      return true;
    }

    // Ceiling logic
    if (node.name === "ceiling") {
      width = node.properties.width || 1000;
      height = node.properties.thickness || 0.5;
      y = constraints.y !== undefined ? constraints.y : 10;
      x = -width / 2;
      this.resolved.set(
        id,
        this.offsetComponent(
          {
            type: node.name,
            id,
            properties: node.properties,
            bounds: { x, y, width, height },
          },
          groupOffset,
        ),
      );
      return true;
    }

    // Incline logic
    if (node.name === "incline") {
      const angle = node.properties.angle || 0;
      const length = node.properties.length || 5;
      const rad = (angle * Math.PI) / 180;

      const x0 =
        constraints.x !== undefined ? constraints.x : node.properties.x || 0;
      let y0 =
        constraints.y !== undefined ? constraints.y : node.properties.y || 0;
      if (onConstraint) {
        const anchorRef = onConstraint.anchorRef;
        if (!this.resolved.has(anchorRef.id)) return false;
        const anchorPos = this.getAnchorPosition(
          anchorRef.id,
          anchorRef.anchor,
        );
        y0 = anchorPos.y;
      }

      const base = length * Math.cos(rad);
      const h = length * Math.sin(rad);

      const minX = Math.min(x0, x0 + base);
      const minY = Math.min(y0, y0 + h);

      this.resolved.set(
        id,
        this.offsetComponent(
          {
            type: node.name,
            id,
            properties: this.applyContactProperties(
              { ...node.properties, x: x0, y: y0 },
              onConstraint,
            ),
            bounds: {
              x: minX,
              y: minY,
              width: Math.abs(base),
              height: Math.abs(h),
            },
            rotation: angle,
          },
          groupOffset,
        ),
      );
      return true;
    }

    // Pulley logic
    if (node.name === "pulley") {
      const r = node.properties.radius || 1;
      width = 2 * r;
      height = 2 * r;
      let resolvedX = false;
      let resolvedY = false;

      if (constraints.hang) {
        const hangRef = constraints.hang;
        if (!this.resolved.has(hangRef.id)) return false;
        const anchorPos = this.getAnchorPosition(hangRef.id, hangRef.anchor);
        // Center of pulley = anchor point
        x = anchorPos.x;
        resolvedX = true;
        y = constraints.y !== undefined ? constraints.y : anchorPos.y;
        resolvedY = true;
      }

      if (!resolvedX && !resolvedY && constraints.from) {
        const anchorRef = constraints.from;
        if (!this.resolved.has(anchorRef.id)) return false;
        const anchorPos = this.getAnchorPosition(
          anchorRef.id,
          anchorRef.anchor,
        );
        let angle =
          constraints.direction !== undefined ? constraints.direction : 0;
        if (constraints.relative_to) {
          const relative = this.resolved.get(constraints.relative_to.id);
          if (!relative) return false;
          angle += relative.rotation || 0;
        }
        const distance =
          constraints.distance !== undefined ? constraints.distance : 0;
        const rad = (angle * Math.PI) / 180;
        x = anchorPos.x + distance * Math.cos(rad);
        y = anchorPos.y + distance * Math.sin(rad);
        resolvedX = true;
        resolvedY = true;
      }

      if (!resolvedX && constraints.align_x) {
        const anchorRef = constraints.align_x;
        if (!this.resolved.has(anchorRef.id)) return false;
        const anchorPos = this.getAnchorPosition(
          anchorRef.id,
          anchorRef.anchor,
        );
        x = anchorPos.x;
        resolvedX = true;
      }

      if (!resolvedY && constraints.below) {
        const anchorRef = constraints.below;
        if (!this.resolved.has(anchorRef.id)) return false;
        const anchorPos = this.getAnchorPosition(
          anchorRef.id,
          anchorRef.anchor,
        );
        y = anchorPos.y - (constraints.distance || 0) - r;
        resolvedY = true;
      }

      if (!resolvedX && constraints.x !== undefined) {
        x = constraints.x;
        resolvedX = true;
      }
      if (!resolvedY && constraints.y !== undefined) {
        y = constraints.y;
        resolvedY = true;
      }
      if (!resolvedX) x = 0;
      if (!resolvedY) y = 0;
      // For pulley, x, y is center. Bounds are [x - r, y - r, 2r, 2r]
      this.resolved.set(
        id,
        this.offsetComponent(
          {
            type: node.name,
            id,
            properties: node.properties,
            bounds: { x: x - r, y: y - r, width, height },
          },
          groupOffset,
        ),
      );
      return true;
    }

    // Connectors (Spring)
    if (
      node.name === "spring" ||
      node.name === "string" ||
      node.name === "rod" ||
      node.name === "vector"
    ) {
      let canResolve = true;
      let endpoints:
        | { x1: number; y1: number; x2: number; y2: number }
        | undefined = undefined;
      let pathSegments: PathSegment[] | undefined = undefined;
      let startX: number | undefined = undefined;
      let startY: number | undefined = undefined;

      if (constraints.connects) {
        if (Array.isArray(constraints.connects)) {
          // Check if it's a simple 2-anchor or advanced routing
          const hasRouting = constraints.connects.some(
            (n) => n.type === "routing",
          );

          if (!hasRouting && constraints.connects.length === 2) {
            const [start, end] = constraints.connects;
            if (!this.resolved.has(start.id) || !this.resolved.has(end.id)) {
              canResolve = false;
            } else {
              try {
                const p1 = this.getAnchorPosition(start.id, start.anchor);
                const p2 = this.getAnchorPosition(end.id, end.anchor);
                let y1 = p1.y;
                let y2 = p2.y;
                if (
                  constraints.align === "horizontal" ||
                  node.properties.align === "horizontal"
                ) {
                  y1 = y2;
                }
                endpoints = { x1: p1.x, y1, x2: p2.x, y2 };
              } catch (e) {
                canResolve = false;
              }
            }
          } else {
            // Advanced Routing
            for (const n of constraints.connects) {
              if (!this.resolved.has(n.id)) canResolve = false;
            }
            if (canResolve) {
              try {
                const startNode = constraints.connects[0];
                const startP = this.getAnchorPosition(
                  startNode.id,
                  startNode.anchor,
                );
                startX = startP.x;
                startY = startP.y;
                let currentP = startP;
                pathSegments = [];

                for (let i = 1; i < constraints.connects.length; i++) {
                  const cnode = constraints.connects[i];
                  if (cnode.type === "anchor") {
                    const endP = this.getAnchorPosition(cnode.id, cnode.anchor);
                    pathSegments.push({ type: "line", x: endP.x, y: endP.y });
                    currentP = endP;
                  } else if (cnode.type === "routing") {
                    const pulleyNode = this.resolved.get(cnode.id)!;
                    const r = pulleyNode.properties.radius || 1;
                    const C = {
                      x: pulleyNode.bounds!.x + r,
                      y: pulleyNode.bounds!.y + r,
                    };
                    const isVover = cnode.method === "vover";
                    const baseMethod = isVover ? "over" : cnode.method;

                    // --- Compute T_in (entry tangent point) ---
                    let T_in: { x: number; y: number };
                    if (isVover) {
                      const clampedX = Math.max(
                        C.x - r,
                        Math.min(C.x + r, currentP.x),
                      );
                      const ey =
                        C.y +
                        Math.sqrt(Math.max(0, r * r - (clampedX - C.x) ** 2));
                      T_in = { x: clampedX, y: ey };
                    } else {
                      const t1_arr = this.getTangents(currentP, C, r);
                      const picked = this.pickTangent(t1_arr, baseMethod);
                      if (!picked) throw new Error("No tangent");
                      T_in = picked;
                    }
                    pathSegments.push({ type: "line", x: T_in.x, y: T_in.y });

                    // --- Look ahead to find exit target ---
                    const nextNode = constraints.connects[i + 1];
                    let nextTargetP: { x: number; y: number };
                    if (nextNode.type === "anchor") {
                      nextTargetP = this.getAnchorPosition(
                        nextNode.id,
                        nextNode.anchor,
                      );
                    } else if (nextNode.type === "routing") {
                      const nextPulley = this.resolved.get(nextNode.id)!;
                      const nextR = nextPulley.properties.radius || 1;
                      nextTargetP = {
                        x: nextPulley.bounds!.x + nextR,
                        y: nextPulley.bounds!.y + nextR,
                      };
                    } else {
                      throw new Error("Invalid next node");
                    }

                    // --- Compute T_out (exit tangent point) ---
                    let T_out: { x: number; y: number };
                    if (isVover) {
                      const clampedX = Math.max(
                        C.x - r,
                        Math.min(C.x + r, nextTargetP.x),
                      );
                      const ey =
                        C.y +
                        Math.sqrt(Math.max(0, r * r - (clampedX - C.x) ** 2));
                      T_out = { x: clampedX, y: ey };
                    } else {
                      const t2_arr = this.getTangents(nextTargetP, C, r);
                      const picked = this.pickTangent(t2_arr, baseMethod);
                      if (!picked) throw new Error("No tangent");
                      T_out = picked;
                    }

                    pathSegments.push({
                      type: "arc",
                      x: T_out.x,
                      y: T_out.y,
                      r,
                      cx: C.x,
                      cy: C.y,
                      method: baseMethod,
                      inP: T_in,
                      outP: T_out,
                    });
                    currentP = T_out;
                  }
                }
              } catch (e) {
                canResolve = false;
              }
            }
          }
        } else {
          // Single anchor vector
          const start = constraints.connects;
          if (!this.resolved.has(start.id)) {
            canResolve = false;
          } else {
            try {
              const p1 = this.getAnchorPosition(start.id, start.anchor);
              let length =
                node.properties.length !== undefined
                  ? node.properties.length
                  : 2;
              let angle =
                node.properties.angle !== undefined ? node.properties.angle : 0;
              if (constraints.direction !== undefined)
                angle = constraints.direction;
              if (node.properties.direction !== undefined)
                angle = node.properties.direction;
              if (constraints.relative_to) {
                const relative = this.resolved.get(constraints.relative_to.id);
                if (!relative) return false;
                angle += relative.rotation || 0;
              }
              let rad = (angle * Math.PI) / 180;
              let dx = length * Math.cos(rad);
              let dy = length * Math.sin(rad);
              endpoints = { x1: p1.x, y1: p1.y, x2: p1.x + dx, y2: p1.y + dy };
            } catch (e) {
              canResolve = false;
            }
          }
        }
      }

      if (canResolve) {
        this.resolved.set(
          id,
          this.offsetComponent(
            {
              type: node.name,
              id,
              properties: node.properties,
              endpoints,
              pathSegments,
              startX,
              startY,
            },
            groupOffset,
          ),
        );
        return true;
      }
      return false;
    }

    // Wall logic
    if (node.name === "wall") {
      width = node.properties.thickness || 0.5;
      height = node.properties.height || 1000;
      if (constraints.x !== undefined) x = constraints.x;
      if (constraints.bottom) {
        const anchorId = constraints.bottom.id;
        const target = this.resolved.get(anchorId);
        if (!target) return false;
        if (constraints.bottom.anchor === "surface") {
          y = target.bounds!.y + target.bounds!.height;
        }
      } else if (constraints.y !== undefined) {
        y = constraints.y;
      }
      this.resolved.set(
        id,
        this.offsetComponent(
          {
            type: node.name,
            id,
            properties: node.properties,
            bounds: { x, y, width, height },
          },
          groupOffset,
        ),
      );
      return true;
    }

    // Unrecognized component (resolve immediately to avoid blocking)
    this.resolved.set(
      id,
      this.offsetComponent(
        { type: node.name, id, properties: node.properties },
        groupOffset,
      ),
    );
    return true;
  }

  private getAnchorPosition(
    targetId: string,
    anchorName: string,
  ): { x: number; y: number } {
    const target = this.resolved.get(targetId);
    if (!target || !target.bounds)
      throw new Error(`Cannot find anchor ${targetId}.${anchorName}`);

    const { x, y, width, height } = target.bounds;

    let cx = x + width / 2;
    let cy = y + height / 2;

    if (target.type === "incline") {
      // Incline properties: x0,y0 is base corner, angle, length
      const px = target.properties.x;
      const py = target.properties.y;
      const angle = target.rotation || 0;
      const rad = (angle * Math.PI) / 180;
      const length = target.properties.length || 5;
      // Peak (top of slope)
      const peakX = px + length * Math.cos(rad);
      const peakY = py + length * Math.sin(rad);
      if (
        anchorName === "top" ||
        anchorName === "peak" ||
        anchorName === "crest"
      )
        return { x: peakX, y: peakY };
      if (
        anchorName === "base" ||
        anchorName === "bottom" ||
        anchorName === "origin"
      )
        return { x: px, y: py };
      if (anchorName === "center")
        return { x: (px + peakX) / 2, y: (py + peakY) / 2 };
      if (anchorName === "surface")
        return { x: (px + peakX) / 2, y: (py + peakY) / 2 };
      return { x: peakX, y: peakY }; // default: peak
    }

    if (target.type === "floor") {
      cx = x + width / 2; // Center of the floor
      if (anchorName === "surface" || anchorName === "top")
        return { x: cx, y: y + height };
    }

    if (target.type === "wall") {
      // Wall x is left edge, y is bottom edge.
      if (anchorName === "center") return { x: x + width / 2, y: cy };
      if (anchorName === "left") return { x: x, y: cy };
      if (anchorName === "right" || anchorName === "surface")
        return { x: x + width, y: cy };
    }

    if (target.type === "ceiling") {
      cx = x + width / 2;
      if (anchorName === "surface" || anchorName === "bottom")
        return { x: cx, y: y };
    }

    if (target.type === "pulley") {
      cx = x + width / 2;
      if (anchorName === "center") return { x: cx, y: cy };
      if (anchorName === "surface" || anchorName === "top")
        return { x: cx, y: cy + width / 2 };
      if (anchorName === "bottom") return { x: cx, y: cy - width / 2 };
      if (anchorName === "left") return { x: cx - width / 2, y: cy };
      if (anchorName === "right") return { x: cx + width / 2, y: cy };
    }

    if (target.type === "block") {
      cx = x + width / 2; // x is left edge
      cy = y + height / 2;
      const angle = target.rotation || 0;
      const rad = (angle * Math.PI) / 180;
      const rotatePoint = (px: number, py: number) => ({
        x: cx + (px - cx) * Math.cos(rad) - (py - cy) * Math.sin(rad),
        y: cy + (px - cx) * Math.sin(rad) + (py - cy) * Math.cos(rad),
      });
      const left = x;
      const right = x + width;
      const bottom = y;
      const top = y + height;
      if (anchorName === "center") return { x: cx, y: cy };
      if (anchorName === "surface" || anchorName === "top")
        return rotatePoint(cx, top);
      if (anchorName === "bottom") return rotatePoint(cx, bottom);
      if (anchorName === "left") return rotatePoint(left, cy);
      if (anchorName === "right") return rotatePoint(right, cy);
      if (anchorName === "top_left") return rotatePoint(left, top);
      if (anchorName === "top_right") return rotatePoint(right, top);
      if (anchorName === "bottom_left") return rotatePoint(left, bottom);
      if (anchorName === "bottom_right") return rotatePoint(right, bottom);
    }

    // Default fallback
    return { x: cx, y: cy };
  }

  private getTangents(
    A: { x: number; y: number },
    C: { x: number; y: number },
    r: number,
  ) {
    const dx = C.x - A.x;
    const dy = C.y - A.y;
    const d = Math.hypot(dx, dy);
    if (d <= r) return []; // inside
    const phi = Math.atan2(dy, dx);
    const beta = Math.asin(r / d);
    const L = Math.sqrt(d * d - r * r);
    return [
      { x: A.x + L * Math.cos(phi + beta), y: A.y + L * Math.sin(phi + beta) },
      { x: A.x + L * Math.cos(phi - beta), y: A.y + L * Math.sin(phi - beta) },
    ];
  }

  private pickTangent(tangents: { x: number; y: number }[], method: string) {
    if (tangents.length === 0) return null;
    if (tangents.length === 1) return tangents[0];
    const [T1, T2] = tangents;
    if (method === "over" || method === "top") return T1.y > T2.y ? T1 : T2;
    if (method === "under" || method === "bottom") return T1.y < T2.y ? T1 : T2;
    if (method === "right") return T1.x > T2.x ? T1 : T2;
    if (method === "left") return T1.x < T2.x ? T1 : T2;
    return T1;
  }

  private getGroupOffset(groupId?: string): { x: number; y: number } {
    if (!groupId) return { x: 0, y: 0 };
    const group = this.resolved.get(groupId);
    if (!group || group.type !== "group") return { x: 0, y: 0 };
    return { x: group.properties.x || 0, y: group.properties.y || 0 };
  }

  private shouldApplyGroupOffset(
    groupId: string | undefined,
    constraints: Record<string, any>,
  ): boolean {
    if (!groupId) return false;
    const refs = this.getConstraintRefs(constraints);
    if (refs.length === 0) return true;
    return !refs.some((ref) => this.getComponentGroup(ref.id) === groupId);
  }

  private getComponentGroup(componentId: string): string | undefined {
    const component = this.components.get(componentId);
    if (!component) return undefined;
    const constraints = component.constraints || {};
    return constraints.group || component.properties.group;
  }

  private getConstraintRefs(value: any): Array<{ id: string; anchor: string }> {
    if (!value) return [];
    if (Array.isArray(value))
      return value.flatMap((item) => this.getConstraintRefs(item));
    if (typeof value !== "object") return [];
    if (value.type === "anchor" && value.id && value.anchor) return [value];
    return Object.values(value).flatMap((item) => this.getConstraintRefs(item));
  }

  private offsetComponent(
    component: ResolvedComponent,
    offset: { x: number; y: number },
  ): ResolvedComponent {
    if (offset.x === 0 && offset.y === 0) return component;

    const shifted: ResolvedComponent = {
      ...component,
      properties: { ...component.properties },
    };

    if (shifted.bounds) {
      shifted.bounds = {
        ...shifted.bounds,
        x: shifted.bounds.x + offset.x,
        y: shifted.bounds.y + offset.y,
      };
    }

    if (shifted.properties.x !== undefined) shifted.properties.x += offset.x;
    if (shifted.properties.y !== undefined) shifted.properties.y += offset.y;

    if (shifted.endpoints) {
      shifted.endpoints = {
        x1: shifted.endpoints.x1 + offset.x,
        y1: shifted.endpoints.y1 + offset.y,
        x2: shifted.endpoints.x2 + offset.x,
        y2: shifted.endpoints.y2 + offset.y,
      };
    }

    if (shifted.startX !== undefined) shifted.startX += offset.x;
    if (shifted.startY !== undefined) shifted.startY += offset.y;

    if (shifted.pathSegments) {
      shifted.pathSegments = shifted.pathSegments.map((segment) => ({
        ...segment,
        x: segment.x + offset.x,
        y: segment.y + offset.y,
        cx: segment.cx !== undefined ? segment.cx + offset.x : undefined,
        cy: segment.cy !== undefined ? segment.cy + offset.y : undefined,
        inP: segment.inP
          ? { x: segment.inP.x + offset.x, y: segment.inP.y + offset.y }
          : undefined,
        outP: segment.outP
          ? { x: segment.outP.x + offset.x, y: segment.outP.y + offset.y }
          : undefined,
      }));
    }

    return shifted;
  }

  private normalizeConstraints(node: ASTNode): Record<string, any> {
    const constraints = { ...(node.constraints || {}) };

    if (constraints.attached_to && !constraints.hang) {
      constraints.hang = constraints.attached_to;
    }
    if (constraints.path && !constraints.connects) {
      constraints.connects = constraints.path;
    }
    if (constraints.origin && !constraints.connects) {
      constraints.connects = constraints.origin;
    }

    if (
      node.properties.direction !== undefined &&
      node.properties.angle === undefined
    ) {
      node.properties.angle = node.properties.direction;
    }

    return constraints;
  }

  private normalizeOnConstraint(
    rawOn: any,
  ): NormalizedOnConstraint | undefined {
    if (!rawOn) return undefined;
    if (rawOn.type === "anchor" && rawOn.id && rawOn.anchor) {
      return { anchorRef: rawOn };
    }
    if (
      typeof rawOn === "object" &&
      rawOn.anchor &&
      rawOn.anchor.type === "anchor"
    ) {
      const normalized: NormalizedOnConstraint = { anchorRef: rawOn.anchor };
      if (typeof rawOn.mu === "number") normalized.mu = rawOn.mu;
      return normalized;
    }
    return undefined;
  }

  private applyContactProperties(
    properties: Record<string, any>,
    onConstraint?: NormalizedOnConstraint,
  ): Record<string, any> {
    const nextProps = { ...properties };
    delete nextProps.mu;
    delete nextProps.friction;
    if (!onConstraint) return nextProps;
    nextProps.contact_anchor = `${onConstraint.anchorRef.id}.${onConstraint.anchorRef.anchor}`;
    if (typeof onConstraint.mu === "number") {
      // Create a more specific contact mu key that names both contacting surfaces/components
      // Caller should pass the owner component id in order to construct a meaningful key.
      // If owner id was provided as properties.__ownerId, use it; otherwise fall back to 'unknown'.
      const ownerId =
        (properties && (properties.__ownerId || properties.id)) || "unknown";
      const otherId = onConstraint.anchorRef.id || "other";
      const keyName = `contact_mu_${ownerId}_${otherId}`;
      nextProps[keyName] = onConstraint.mu;
    }
    return nextProps;
  }
}
