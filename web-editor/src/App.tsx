import {
  useState,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from "react";
import { parseMechTeX } from "./parser";
import { Solver, type ResolvedComponent } from "./solver";
import katex from "katex";
import "./index.css";
import domtoimage from "dom-to-image-more";

interface DisplayOptions {
  showAngles: boolean;
  showDistances: boolean;
  showProperties: boolean;
  textOnTop: boolean;
}

const DEFAULT_CODE = `\\begin{system}[scale=1.0]
    \\ceiling[id=top, width=20, hideProperties=[width, length, L]]{y=8}
    \\floor[id=gnd, width=20, hideProperties=[width, length, L]]{y=-8}

    % Fixed incline position in properties
    \\incline[id=inc1, angle=30, length=12, x=-6, hideProperties=[length, L]]{on={anchor=gnd.surface, mu=0.35}}
    
    % Pulley supported from the incline crest with a rod
    \\pulley[id=p1, radius=0.8]{from=inc1.top, distance=1.1, direction=0, relative_to=inc1.surface}
    \\rod[id=p1_support, hideProperties=[length, L]]{connects=(inc1.top, p1.center)}
    
    % Block sitting ON the slope
    \\block[id=m1, width=2, height=2, label_mass=$m_1$, hideProperties=[width, height]]{on={anchor=inc1.surface, mu=0}, position=6}
    
    % Hanging block on the outside
    \\block[id=m2, width=1.8, height=1.8, label_mass=$m_2$, hideProperties=[width, height]]{hang=p1.right, y=-6}
    
    % String routing
    \\string[id=str1]{connects=(m1.right -> over(p1) -> m2.top)}
    
    % Forces (Gravity is absolute down, Normal is perpendicular 90+30=120)
    \\vector[id=mg, color=#ef4444, label=$m_1g$, length=2.5, angle=-90, hideProperties=[length, L]]{connects=m1.center}
    \\vector[id=normal, color=#10b981, label=$N$, length=2.5, angle=120, hideProperties=[length, L]]{connects=m1.top}

    \\label[id=q1, label=$\\text{Find acceleration and tension}$]{at=top.surface, dy=-1}
  \\end{system}`;

const EXAMPLES = [
  {
    title: "1. Simple Incline",
    code: `\\begin{system}[scale=1.0]
  % Define a basic floor
  \\floor[id=gnd]{y=-5}

  % Place an incline resting on the floor
  \\incline[id=ramp, angle=30, length=15]{on=gnd.surface}

  % Place a block on the incline at position 8
  \\block[id=m1, width=2, height=2, label_mass=$m$]{on=ramp.surface, position=8}

  % Draw force vectors with labels included
  \\vector[id=fg, length=3, label=$mg$]{connects=m1.center, direction=270}

  \\vector[id=fn, length=2.5, label=$F_N$]{connects=m1.top, direction=90, relative_to=ramp.surface}
\\end{system}`
  },
  {
    title: "2. Atwood's Machine",
    code: `\\begin{system}[scale=1.0]
  % Define a ceiling to hang things from
  \\ceiling[id=ceil, width=15]{y=10}

  % Hang a pulley from the ceiling
  \\pulley[id=p1, radius=1.5]{hang=ceil.bottom}

  % Define two masses hanging on either side of the pulley
  \\block[id=m1, width=2, height=2, label_mass=$m_1$]{
    below=p1.left,
    distance=4,
    align_x=p1.left
  }

  \\block[id=m2, width=2.5, height=2.5, label_mass=$m_2$]{
    below=p1.right,
    distance=6,
    align_x=p1.right
  }

  % Connect the two masses with a string routed over the pulley
  \\string[id=str1]{connects=(m1.top -> over(p1) -> m2.top)}
\\end{system}`
  },
  {
    title: "3. Complex Routing",
    code: `\\begin{system}[scale=1.0]
    \\ceiling[id=top, width=20, hideProperties=[width, length, L]]{y=8}
    \\floor[id=gnd, width=20, hideProperties=[width, length, L]]{y=-8}

    % Fixed incline position in properties
    \\incline[id=inc1, angle=30, length=12, x=-6, hideProperties=[length, L]]{on={anchor=gnd.surface, mu=0.35}}
    
    % Pulley supported from the incline crest with a rod
    \\pulley[id=p1, radius=0.8]{from=inc1.top, distance=1.1, direction=0, relative_to=inc1.surface}
    \\rod[id=p1_support, hideProperties=[length, L]]{connects=(inc1.top, p1.center)}
    
    % Block sitting ON the slope
    \\block[id=m1, width=2, height=2, label_mass=$m_1$, hideProperties=[width, height]]{on={anchor=inc1.surface, mu=0}, position=6}
    
    % Hanging block on the outside
    \\block[id=m2, width=1.8, height=1.8, label_mass=$m_2$, hideProperties=[width, height]]{hang=p1.right, y=-6}
    
    % String routing
    \\string[id=str1]{connects=(m1.right -> over(p1) -> m2.top)}
    
    % Forces (Gravity is absolute down, Normal is perpendicular 90+30=120)
    \\vector[id=mg, color=#ef4444, label=$m_1g$, length=2.5, angle=-90, hideProperties=[length, L]]{connects=m1.center}
    \\vector[id=normal, color=#10b981, label=$N$, length=2.5, angle=120, hideProperties=[length, L]]{connects=m1.top}

    \\label[id=q1, label=$\\text{Find acceleration and tension}$]{at=top.surface, dy=-1}
\\end{system}`
  },
  {
    title: "4. Simple Routing",
    code: `\\begin{system}[scale=1.0]
  \\ceiling[id=ceil, width=20]{y=8}

  % Suspend pulley from ceiling via a string
  \\pulley[id=p1, radius=0.8]{below=ceil.bottom, distance=3, align_x=ceil.center}
  \\string[id=sup]{connects=(ceil.center, p1.center)}
  
  % Block A pulled to the side
  \\block[id=a, width=1.6, height=1.6, label_mass=$m_1$]{x=-5, y=0}
  
  % Block B hanging vertically
  \\block[id=b, width=1.6, height=1.6, label_mass=$m_2$]{hang=p1.right, distance=5}

  % Connect them over the pulley
  \\string[id=s]{connects=(a.top -> over(p1) -> b.top)}
\\end{system}`
  }
];

function MathLabel({
  text,
  x,
  y,
  color = "var(--diagram-ink)",
  fontSize = 24,
  withBackdrop = false,
}: {
  text: string;
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
  withBackdrop?: boolean;
}) {
  const isMath = text.startsWith("$") && text.endsWith("$");
  const content = isMath ? text.slice(1, -1) : text;

  if (isMath) {
    const html = katex.renderToString(content, {
      throwOnError: false,
      displayMode: false,
      output: "html",
    });
    const w = 200;
    const h = 100;
    return (
      <foreignObject
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        style={{ overflow: "visible" }}
        transform={`scale(1, -1) translate(0, ${-2 * y})`}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            textShadow: "var(--label-text-shadow)",
            background: withBackdrop ? "var(--label-backdrop)" : "transparent",
            borderRadius: withBackdrop ? "6px" : "0px",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </foreignObject>
    );
  } else {
    return (
      <text
        x={x}
        y={y}
        fill={color}
        fontSize={fontSize}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="middle"
        stroke="var(--label-stroke)"
        strokeWidth={1.6}
        paintOrder="stroke fill"
        transform={`scale(1, -1) translate(0, ${-2 * y})`}
      >
        {text}
      </text>
    );
  }
}

function SvgRenderer({
  components,
  options,
  svgRef,
  onSelect,
}: {
  components: ResolvedComponent[];
  options: DisplayOptions;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  onSelect?: (comp: ResolvedComponent | null) => void;
}) {
  const scale = 50;
  const LABEL_FONT = {
    angle: 22,
    distance: 18,
    property: 18,
    dimension: 17,
    generic: 21,
  };
  const AXIS_EPSILON_DEG = 1.5;
  const fmt = (value: number) =>
    Number.isInteger(value)
      ? `${value}`
      : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  const distance = (x1: number, y1: number, x2: number, y2: number) =>
    Math.hypot(x2 - x1, y2 - y1);
  const placedLabelBoxes: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
  }> = [];
  const textOverlayNodes: ReactElement[] = [];
  const placeText = (node: ReactElement) => {
    if (options.textOnTop) {
      textOverlayNodes.push(
        <g key={`text-layer-${textOverlayNodes.length}`}>{node}</g>,
      );
      return null;
    }
    return node;
  };
  const localSvgRef = useRef<SVGSVGElement | null>(null);
  const effectiveSvgRef = svgRef || localSvgRef;
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const normalizeAngleDeg = (deg: number) => ((deg % 360) + 360) % 360;
  const shortestSignedDeltaDeg = (fromDeg: number, toDeg: number) => {
    const from = normalizeAngleDeg(fromDeg);
    const to = normalizeAngleDeg(toDeg);
    return ((to - from + 540) % 360) - 180;
  };
  const axisCandidates = [0, 90, 180, 270];
  const nearestAxis = (angleDeg: number) => {
    const normalized = normalizeAngleDeg(angleDeg);
    let bestAxis = axisCandidates[0];
    let bestDelta = shortestSignedDeltaDeg(bestAxis, normalized);
    for (let i = 1; i < axisCandidates.length; i++) {
      const axis = axisCandidates[i];
      const delta = shortestSignedDeltaDeg(axis, normalized);
      if (Math.abs(delta) < Math.abs(bestDelta)) {
        bestAxis = axis;
        bestDelta = delta;
      }
    }
    return { axis: bestAxis, delta: bestDelta };
  };
  const toAcuteDelta = (deltaDeg: number) => {
    let acute = deltaDeg;
    if (Math.abs(acute) > 90) {
      acute = acute > 0 ? acute - 180 : acute + 180;
    }
    return acute;
  };
  const arcPoints = (
    cx: number,
    cy: number,
    radius: number,
    fromDeg: number,
    deltaDeg: number,
  ) => {
    const steps = Math.max(10, Math.ceil(Math.abs(deltaDeg) / 8));
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = fromDeg + deltaDeg * t;
      const r = toRadians(a);
      points.push({
        x: cx + radius * Math.cos(r),
        y: cy + radius * Math.sin(r),
      });
    }
    return points;
  };
  const BLOCK_OFFSET_PX = -2;
  const chooseSmartLabelPosition = ({
    candidates,
    avoidPoints = [],
    preferredPoint,
    labelText = "",
    fontSize = LABEL_FONT.distance,
  }: {
    candidates: Array<{ x: number; y: number }>;
    avoidPoints?: Array<{ x: number; y: number }>;
    preferredPoint?: { x: number; y: number };
    labelText?: string;
    fontSize?: number;
  }) => {
    if (!candidates.length) return { x: 0, y: 0 };
    if (!avoidPoints.length) return candidates[0];
    const estimatedLength = labelText.replace(/[\$\{\}\\_]/g, "").length;
    const boxW = Math.max(34, estimatedLength * fontSize * 0.6 + 14);
    const boxH = Math.max(22, fontSize * 1.2);
    const scored = candidates.map((candidate) => {
      const nearestAvoid = Math.min(
        ...avoidPoints.map((p) =>
          Math.hypot(candidate.x - p.x, candidate.y - p.y),
        ),
      );
      const nearestLabel = placedLabelBoxes.length
        ? Math.min(
            ...placedLabelBoxes.map((box) => {
              const dx = Math.max(
                Math.abs(candidate.x - box.x) - (boxW + box.w) / 2,
                0,
              );
              const dy = Math.max(
                Math.abs(candidate.y - box.y) - (boxH + box.h) / 2,
                0,
              );
              return Math.hypot(dx, dy);
            }),
          )
        : 120;
      const hasBoxOverlap = placedLabelBoxes.some(
        (box) =>
          Math.abs(candidate.x - box.x) < (boxW + box.w) / 2 &&
          Math.abs(candidate.y - box.y) < (boxH + box.h) / 2,
      );
      const preferredBonus = preferredPoint
        ? Math.max(
            0,
            120 -
              Math.hypot(
                candidate.x - preferredPoint.x,
                candidate.y - preferredPoint.y,
              ),
          ) * 0.1
        : 0;
      const overlapPenalty = hasBoxOverlap ? 150 : 0;
      return {
        ...candidate,
        score:
          nearestAvoid + nearestLabel * 1.25 + preferredBonus - overlapPenalty,
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  };
  const reserveLabelBox = (
    x: number,
    y: number,
    text: string,
    fontSize: number,
  ) => {
    const estimatedLength = text.replace(/[\$\{\}\\_]/g, "").length;
    const w = Math.max(34, estimatedLength * fontSize * 0.6 + 14);
    const h = Math.max(22, fontSize * 1.2);
    placedLabelBoxes.push({ x, y, w, h });
  };
  const radialLabelCandidates = ({
    centerX,
    centerY,
    baseAngleDeg,
    baseRadius,
    angleOffsets,
    radiusOffsets,
  }: {
    centerX: number;
    centerY: number;
    baseAngleDeg: number;
    baseRadius: number;
    angleOffsets: number[];
    radiusOffsets: number[];
  }) => {
    const candidates: Array<{ x: number; y: number }> = [];
    for (const angleOffset of angleOffsets) {
      for (const radiusOffset of radiusOffsets) {
        const a = toRadians(baseAngleDeg + angleOffset);
        const r = baseRadius + radiusOffset;
        candidates.push({
          x: centerX + r * Math.cos(a),
          y: centerY + r * Math.sin(a),
        });
      }
    }
    return candidates;
  };
  const lineDistanceCandidates = ({
    x1,
    y1,
    x2,
    y2,
    offsets,
    alongOffsets,
  }: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    offsets: number[];
    alongOffsets: number[];
  }) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return [{ x: x1, y: y1 }];
    const nx = dx / len;
    const ny = dy / len;
    const perpX = -ny;
    const perpY = nx;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const candidates: Array<{ x: number; y: number }> = [];
    for (const along of alongOffsets) {
      for (const offset of offsets) {
        candidates.push({
          x: mx + nx * along + perpX * offset,
          y: my + ny * along + perpY * offset,
        });
      }
    }
    return candidates;
  };
  const renderAngleAnnotation = ({
    centerX,
    centerY,
    objectAngle,
    referenceAngle,
    color,
    referenceLength = 28,
    arcRadius = 22,
    avoidPoints = [],
    preferredPoint,
    labelText,
    labelFontSize = LABEL_FONT.angle,
    placeTextNode,
  }: {
    centerX: number;
    centerY: number;
    objectAngle: number;
    referenceAngle: number;
    color: string;
    referenceLength?: number;
    arcRadius?: number;
    avoidPoints?: Array<{ x: number; y: number }>;
    preferredPoint?: { x: number; y: number };
    labelText?: string;
    labelFontSize?: number;
    placeTextNode?: (node: ReactElement) => ReactElement | null;
  }) => {
    const acuteDelta = toAcuteDelta(
      shortestSignedDeltaDeg(referenceAngle, objectAngle),
    );
    if (Math.abs(acuteDelta) < AXIS_EPSILON_DEG) return null;

    const refRad = toRadians(referenceAngle);
    const refX2 = centerX + referenceLength * Math.cos(refRad);
    const refY2 = centerY + referenceLength * Math.sin(refRad);
    const points = arcPoints(
      centerX,
      centerY,
      arcRadius,
      referenceAngle,
      acuteDelta,
    )
      .map((p) => `${p.x},${p.y}`)
      .join(" ");
    const bisectorDeg = referenceAngle + acuteDelta / 2;
    const angleText = labelText ?? `$${fmt(Math.abs(acuteDelta))}^\\circ$`;
    const labelPos = chooseSmartLabelPosition({
      candidates: radialLabelCandidates({
        centerX,
        centerY,
        baseAngleDeg: bisectorDeg,
        baseRadius: arcRadius + 18,
        angleOffsets: [0, 14, -14, 28, -28, 40, -40],
        radiusOffsets: [0, 10, 20, 30],
      }),
      avoidPoints,
      labelText: angleText,
      fontSize: labelFontSize,
      preferredPoint: preferredPoint ?? {
        x: centerX + (arcRadius + 18) * Math.cos(toRadians(bisectorDeg)),
        y: centerY + (arcRadius + 18) * Math.sin(toRadians(bisectorDeg)),
      },
    });
    reserveLabelBox(labelPos.x, labelPos.y, angleText, labelFontSize);

    return (
      <>
        <line
          x1={centerX}
          y1={centerY}
          x2={refX2}
          y2={refY2}
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="4,4"
          opacity={0.7}
        />
        <polyline
          points={points}
          stroke={color}
          strokeWidth="2"
          fill="none"
          opacity={0.9}
        />
        {(placeTextNode ?? ((node) => node))(
          <MathLabel
            text={angleText}
            x={labelPos.x}
            y={labelPos.y}
            color={color}
            fontSize={labelFontSize}
          />,
        )}
      </>
    );
  };
  const textProp = (props: Record<string, any>, names: string[]) => {
    for (const name of names) {
      if (props[name] !== undefined) return props[name];
    }
    return undefined;
  };
  const toHiddenPropertySet = (value: unknown) => {
    if (Array.isArray(value)) return new Set(value.map((item) => String(item)));
    if (typeof value === "string") {
      return new Set(
        value
          .split(/[,\s]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }
    return new Set<string>();
  };
  const hiddenPropertiesFor = (comp: ResolvedComponent) =>
    toHiddenPropertySet(comp.properties.hideProperties);
  const isPropertyHidden = (comp: ResolvedComponent, propertyName: string) => {
    const hidden = hiddenPropertiesFor(comp);
    if (hidden.has(propertyName)) return true;
    for (const h of Array.from(hidden)) {
      if (h && propertyName.startsWith(h)) return true;
    }
    return false;
  };
  const isAnyPropertyHidden = (
    comp: ResolvedComponent,
    propertyNames: string[],
  ) =>
    propertyNames.some((propertyName) => isPropertyHidden(comp, propertyName));

  const interactiveProps = (comp: ResolvedComponent) => ({
    onClick: (event: ReactMouseEvent<SVGElement>) => {
      event.stopPropagation();
      onSelect?.(comp);
    },
    style: { cursor: "pointer" as const },
  });

  const propertyLabels = (comp: ResolvedComponent) => {
    const labels: string[] = [];
    const muKey = Object.keys(comp.properties).find(
      (k) =>
        k === "label_mu" || k === "contact_mu" || k.startsWith("contact_mu_"),
    );
    const mu = muKey ? comp.properties[muKey] : undefined;
    const k = textProp(comp.properties, ["label_k", "k", "spring_constant"]);
    if (
      mu !== undefined &&
      !isPropertyHidden(comp, muKey ?? "contact_mu") &&
      !isPropertyHidden(comp, "label_mu")
    ) {
      labels.push(String(mu).startsWith("$") ? String(mu) : `$\\mu=${mu}$`);
    }
    if (
      k !== undefined &&
      !isPropertyHidden(comp, "k") &&
      !isPropertyHidden(comp, "spring_constant") &&
      !isPropertyHidden(comp, "label_k")
    ) {
      labels.push(String(k).startsWith("$") ? String(k) : `$k=${k}$`);
    }
    return labels;
  };
  const buildArcPoints = (seg: any) => {
    const radius = seg.r;
    const startAngle = Math.atan2(seg.inP.y - seg.cy, seg.inP.x - seg.cx);
    const endAngle = Math.atan2(seg.outP.y - seg.cy, seg.outP.x - seg.cx);
    const twoPi = Math.PI * 2;
    const normalize = (angle: number) => (angle + twoPi) % twoPi;
    const ccwDelta = normalize(endAngle - startAngle);
    const cwDelta = ccwDelta - twoPi;
    const sample = (delta: number) => {
      const steps = Math.max(8, Math.ceil(Math.abs(delta) / (Math.PI / 18)));
      const points = [];
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + delta * t;
        points.push({
          x: seg.cx + radius * Math.cos(angle),
          y: seg.cy + radius * Math.sin(angle),
        });
      }
      return points;
    };
    const candidates = [sample(ccwDelta), sample(cwDelta)];
    const score = (points: Array<{ x: number; y: number }>) => {
      if (seg.method === "under" || seg.method === "bottom") {
        return -Math.min(...points.map((p) => p.y));
      }
      if (seg.method === "left") {
        return -Math.min(...points.map((p) => p.x));
      }
      if (seg.method === "right") {
        return Math.max(...points.map((p) => p.x));
      }
      return Math.max(...points.map((p) => p.y));
    };
    const preferLower = seg.method === "under" || seg.method === "bottom";
    const [a, b] = candidates;
    return preferLower
      ? score(a) < score(b)
        ? a
        : b
      : score(a) > score(b)
        ? a
        : b;
  };
  const renderLayer = (type: string) => {
    if (["floor", "ceiling", "wall", "incline"].includes(type)) return 0;
    if (type === "block") return 1;
    if (type === "rod") return 2;
    if (["spring", "string"].includes(type)) return 3;
    if (type === "pulley") return 4;
    if (type === "vector") return 5;
    if (type === "label") return 6;
    return 6;
  };
  const orderedComponents = [...components].sort(
    (a, b) => renderLayer(a.type) - renderLayer(b.type),
  );

  const getVisualStyles = (
    comp: ResolvedComponent,
    opts?: { baseStrokeMultiplier?: number },
  ) => {
    const cs =
      typeof window !== "undefined"
        ? getComputedStyle(document.documentElement)
        : ({} as CSSStyleDeclaration);
    const fillOpacity =
      parseFloat(cs.getPropertyValue("--glass-fill-opacity")) || 0.06;
    const strokeOpacity =
      parseFloat(cs.getPropertyValue("--glass-stroke-opacity")) || 0.95;
    const baseStrokeWidth =
      parseFloat(cs.getPropertyValue("--glass-stroke-width")) || 1.9;
    const colorProp = comp.properties.color;
    const defaultColor =
      comp.type === "block"
        ? "var(--diagram-block)"
        : comp.type === "incline"
          ? "#967BB6"
          : comp.type === "pulley"
            ? "red"
            : "var(--diagram-ink)";
    const resolvedColor = colorProp || defaultColor;
    return {
      fill: resolvedColor,
      fillOpacity,
      stroke: resolvedColor,
      strokeOpacity,
      strokeWidth: baseStrokeWidth * (opts?.baseStrokeMultiplier ?? 1),
    };
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        ref={effectiveSvgRef}
        className="svg-canvas"
        viewBox="-500 -500 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        onClick={() => onSelect?.(null)}
      >
        <g transform="translate(0, 0) scale(1, -1)">
          {orderedComponents.map((comp) => {
            if (comp.type === "ceiling") {
              if (!comp.bounds) return null;
              const { x, y, width, height } = comp.bounds;
              return (
                <g key={comp.id} {...interactiveProps(comp)}>
                  <rect
                    x={x * scale}
                    y={y * scale}
                    width={width * scale}
                    height={height * scale}
                    fill="#cbd5e1"
                  />
                  <line
                    x1={x * scale}
                    y1={y * scale}
                    x2={(x + width) * scale}
                    y2={y * scale}
                    stroke="#475569"
                    strokeWidth="4"
                  />
                </g>
              );
            }

            if (comp.type === "pulley") {
              if (!comp.bounds) return null;
              const { x, y, width, height } = comp.bounds;
              const cx = (x + width / 2) * scale;
              const cy = (y + height / 2) * scale;
              const r = (width / 2) * scale;
              const vs = getVisualStyles(comp);
              return (
                <g key={comp.id} {...interactiveProps(comp)}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={vs.fill}
                    fillOpacity={vs.fillOpacity}
                    stroke={vs.stroke}
                    strokeOpacity={vs.strokeOpacity}
                    strokeWidth={Math.max(vs.strokeWidth, r * 0.08)}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 0.18}
                    fill="var(--diagram-ink)"
                    stroke="var(--diagram-ink)"
                    strokeWidth={Math.max(1, r * 0.04)}
                  />
                  {options.showDistances &&
                    !isAnyPropertyHidden(comp, ["radius", "r"]) &&
                    (() => {
                      const radiusText = `$r=${fmt(width / 2)}$`;
                      const radiusCandidates = radialLabelCandidates({
                        centerX: cx,
                        centerY: cy,
                        baseAngleDeg: 45,
                        baseRadius: r + 10,
                        angleOffsets: [0, 25, -25, 50, -50, 90],
                        radiusOffsets: [0, 12, 22],
                      });
                      const radiusPos = chooseSmartLabelPosition({
                        candidates: radiusCandidates,
                        labelText: radiusText,
                        fontSize: LABEL_FONT.distance,
                        avoidPoints: [
                          { x: cx, y: cy },
                          { x: cx + r, y: cy },
                          { x: cx, y: cy + r },
                          { x: cx - r, y: cy },
                          { x: cx, y: cy - r },
                        ],
                      });
                      reserveLabelBox(
                        radiusPos.x,
                        radiusPos.y,
                        radiusText,
                        LABEL_FONT.distance,
                      );
                      return placeText(
                        <MathLabel
                          text={radiusText}
                          x={radiusPos.x}
                          y={radiusPos.y}
                          color="var(--diagram-ink)"
                          fontSize={LABEL_FONT.distance}
                        />,
                      );
                    })()}
                  {options.showProperties &&
                    propertyLabels(comp).map((label, index) =>
                      placeText(
                        <MathLabel
                          key={label}
                          text={label}
                          x={cx}
                          y={cy - r - (0.35 + index * 0.35) * scale}
                          color="#0f172a"
                          fontSize={LABEL_FONT.property}
                        />,
                      ),
                    )}
                </g>
              );
            }

            if (["string", "rod", "spring", "vector"].includes(comp.type)) {
              if (
                comp.pathSegments &&
                comp.startX !== undefined &&
                comp.startY !== undefined
              ) {
                let d = `M ${comp.startX * scale} ${comp.startY * scale}`;
                comp.pathSegments.forEach((seg: any) => {
                  if (seg.type === "line") {
                    d += ` L ${seg.x * scale} ${seg.y * scale}`;
                  } else if (seg.type === "arc") {
                    buildArcPoints({
                      ...seg,
                      r: seg.r,
                    }).forEach((point) => {
                      d += ` L ${point.x * scale} ${point.y * scale}`;
                    });
                  }
                });

                if (comp.type === "string") {
                  return (
                    <path
                      key={comp.id}
                      d={d}
                      stroke="#334155"
                      strokeWidth="4"
                      fill="none"
                      strokeLinejoin="round"
                      {...interactiveProps(comp)}
                    />
                  );
                }
                return (
                  <path
                    key={comp.id}
                    d={d}
                    stroke="#64748b"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="5,5"
                    {...interactiveProps(comp)}
                  />
                );
              } else if (comp.endpoints) {
                const { x1, y1, x2, y2 } = comp.endpoints;
                const sx1 = x1 * scale,
                  sy1 = y1 * scale;
                const sx2 = x2 * scale,
                  sy2 = y2 * scale;

                if (comp.type === "string") {
                  return (
                    <line
                      key={comp.id}
                      x1={sx1}
                      y1={sy1}
                      x2={sx2}
                      y2={sy2}
                      stroke="#334155"
                      strokeWidth="4"
                      {...interactiveProps(comp)}
                    />
                  );
                }
                if (comp.type === "rod") {
                  const rodDx = sx2 - sx1;
                  const rodDy = sy2 - sy1;
                  const rodLen = Math.hypot(rodDx, rodDy);
                  const rodPerpX = rodLen > 1e-6 ? -rodDy / rodLen : 0;
                  const rodPerpY = rodLen > 1e-6 ? rodDx / rodLen : 0;
                  const rodMidX = (sx1 + sx2) / 2;
                  const rodMidY = (sy1 + sy2) / 2;
                  return (
                    <g key={comp.id} {...interactiveProps(comp)}>
                      <line
                        x1={sx1}
                        y1={sy1}
                        x2={sx2}
                        y2={sy2}
                        stroke="#475569"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                      {options.showDistances &&
                        !isAnyPropertyHidden(comp, ["length", "L"]) &&
                        (() => {
                          const rodLengthText = `$L=${fmt(distance(x1, y1, x2, y2))}$`;
                          const distPos = chooseSmartLabelPosition({
                            candidates: lineDistanceCandidates({
                              x1: sx1,
                              y1: sy1,
                              x2: sx2,
                              y2: sy2,
                              offsets: [44, 56, 68, -44],
                              alongOffsets: [0, 22, -22, 38],
                            }),
                            avoidPoints: [
                              { x: sx1, y: sy1 },
                              { x: sx2, y: sy2 },
                              { x: rodMidX, y: rodMidY },
                            ],
                            labelText: rodLengthText,
                            fontSize: LABEL_FONT.distance,
                            preferredPoint: {
                              x: rodMidX + rodPerpX * 64,
                              y: rodMidY + rodPerpY * 64,
                            },
                          });
                          reserveLabelBox(
                            distPos.x,
                            distPos.y,
                            rodLengthText,
                            LABEL_FONT.distance,
                          );
                          return placeText(
                            <MathLabel
                              text={rodLengthText}
                              x={distPos.x}
                              y={distPos.y}
                              color="#0f172a"
                              fontSize={LABEL_FONT.distance}
                            />,
                          );
                        })()}
                    </g>
                  );
                }
                if (comp.type === "spring") {
                  const dx = sx2 - sx1;
                  const dy = sy2 - sy1;
                  const len = Math.hypot(dx, dy);
                  const nx = dx / len;
                  const ny = dy / len;
                  const perpX = -ny;
                  const perpY = nx;

                  const zigs = 15;
                  const step = len / zigs;
                  const amp = 10;
                  let d = `M ${sx1} ${sy1}`;
                  for (let i = 1; i < zigs; i++) {
                    const cx = sx1 + nx * (i * step);
                    const cy = sy1 + ny * (i * step);
                    const sign = i % 2 === 0 ? 1 : -1;
                    const px = cx + perpX * amp * sign;
                    const py = cy + perpY * amp * sign;
                    d += ` L ${px} ${py}`;
                  }
                  d += ` L ${sx2} ${sy2}`;

                  return (
                    <g key={comp.id} {...interactiveProps(comp)}>
                      <path
                        d={d}
                        stroke="#334155"
                        strokeWidth="4"
                        fill="none"
                        strokeLinejoin="round"
                      />
                      {options.showDistances &&
                        !isAnyPropertyHidden(comp, ["length", "L"]) &&
                        (() => {
                          const springLengthText = `$L=${fmt(distance(x1, y1, x2, y2))}$`;
                          const distPos = chooseSmartLabelPosition({
                            candidates: lineDistanceCandidates({
                              x1: sx1,
                              y1: sy1,
                              x2: sx2,
                              y2: sy2,
                              offsets: [30, -30, 44, -44],
                              alongOffsets: [0, 16, -16],
                            }),
                            avoidPoints: [
                              { x: sx1, y: sy1 },
                              { x: sx2, y: sy2 },
                              { x: (sx1 + sx2) / 2, y: (sy1 + sy2) / 2 },
                            ],
                            labelText: springLengthText,
                            fontSize: LABEL_FONT.distance,
                          });
                          reserveLabelBox(
                            distPos.x,
                            distPos.y,
                            springLengthText,
                            LABEL_FONT.distance,
                          );
                          return placeText(
                            <MathLabel
                              text={springLengthText}
                              x={distPos.x}
                              y={distPos.y}
                              color="#0f172a"
                              fontSize={LABEL_FONT.distance}
                            />,
                          );
                        })()}
                      {options.showProperties &&
                        propertyLabels(comp).map((label, index) =>
                          placeText(
                            <MathLabel
                              key={label}
                              text={label}
                              x={(sx1 + sx2) / 2}
                              y={(sy1 + sy2) / 2 - (22 + index * 18)}
                              color="#0f172a"
                              fontSize={LABEL_FONT.property}
                            />,
                          ),
                        )}
                    </g>
                  );
                }
                if (comp.type === "vector") {
                  const dx = sx2 - sx1;
                  const dy = sy2 - sy1;
                  const len = Math.hypot(dx, dy);
                  if (len < 1e-6) return null;
                  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                  const color = comp.properties.color || "#ef4444";
                  const perpX = (dy / len) * 28;
                  const perpY = (-dx / len) * 28;
                  const labelX = sx1 + dx * 0.72 + perpX;
                  const labelY = sy1 + dy * 0.72 + perpY;
                  const resolvedAngle =
                    comp.properties.angle ?? comp.properties.direction ?? angle;
                  const normalizedAngle = normalizeAngleDeg(resolvedAngle);
                  const nearest = nearestAxis(normalizedAngle);
                  const isAxisAligned =
                    Math.abs(nearest.delta) < AXIS_EPSILON_DEG;
                  const vectorMidX = sx1 + dx * 0.5;
                  const vectorMidY = sy1 + dy * 0.5;

                  return (
                    <g key={comp.id} {...interactiveProps(comp)}>
                      <line
                        x1={sx1}
                        y1={sy1}
                        x2={sx2}
                        y2={sy2}
                        stroke={color}
                        strokeWidth="3"
                      />
                      <polygon
                        points="0,0 -10,5 -10,-5"
                        fill={color}
                        transform={`translate(${sx2}, ${sy2}) rotate(${angle})`}
                      />
                      {comp.properties.label &&
                        !isAnyPropertyHidden(comp, ["label"]) &&
                        placeText(
                          <MathLabel
                            text={comp.properties.label}
                            x={labelX}
                            y={labelY}
                            color={color}
                            fontSize={LABEL_FONT.generic}
                          />,
                        )}
                      {options.showAngles &&
                        !isAxisAligned &&
                        !isAnyPropertyHidden(comp, ["angle", "direction"]) &&
                        renderAngleAnnotation({
                          centerX: sx1,
                          centerY: sy1,
                          objectAngle: normalizedAngle,
                          referenceAngle: nearest.axis,
                          color,
                          avoidPoints: [
                            { x: vectorMidX, y: vectorMidY },
                            { x: sx2, y: sy2 },
                            { x: labelX, y: labelY },
                          ],
                          placeTextNode: placeText,
                        })}
                    </g>
                  );
                }
              }
            }

            if (!comp.bounds) return null;
            const { x, y, width, height } = comp.bounds;

            if (comp.type === "label") {
              const label =
                comp.properties.label ||
                comp.properties.text ||
                comp.properties.value;
              if (!label) return null;
              const hideLabel =
                !!comp.properties.label && isAnyPropertyHidden(comp, ["label"]);
              const hideText =
                !!comp.properties.text && isAnyPropertyHidden(comp, ["text"]);
              const hideValue =
                !!comp.properties.value && isAnyPropertyHidden(comp, ["value"]);
              if (hideLabel || hideText || hideValue) return null;
              return placeText(
                <MathLabel
                  key={comp.id}
                  text={label}
                  x={(comp.properties.x || x) * scale}
                  y={(comp.properties.y || y) * scale}
                  color={comp.properties.color || "var(--diagram-ink)"}
                  fontSize={comp.properties.size || LABEL_FONT.generic}
                />,
              );
            }

            if (comp.type === "incline") {
              const angle = comp.rotation || 0;
              const rad = (angle * Math.PI) / 180;
              const len = comp.properties.length || 5;
              const ix = (comp.properties.x || 0) * scale;
              const iy = (comp.properties.y || 0) * scale;
              const peakX = ix + len * Math.cos(rad) * scale;
              const peakY = iy + len * Math.sin(rad) * scale;
              const normalizedInclineAngle = normalizeAngleDeg(angle);
              const inclineIsAxisAligned =
                Math.abs(shortestSignedDeltaDeg(0, normalizedInclineAngle)) <
                  AXIS_EPSILON_DEG ||
                Math.abs(shortestSignedDeltaDeg(90, normalizedInclineAngle)) <
                  AXIS_EPSILON_DEG ||
                Math.abs(shortestSignedDeltaDeg(180, normalizedInclineAngle)) <
                  AXIS_EPSILON_DEG ||
                Math.abs(shortestSignedDeltaDeg(270, normalizedInclineAngle)) <
                  AXIS_EPSILON_DEG;
              const inclineReference = Math.cos(rad) >= 0 ? 0 : 180;
              const inclineMidX = (ix + peakX) / 2;
              const inclineMidY = (iy + peakY) / 2;
              const points = `${ix},${iy} ${peakX},${iy} ${peakX},${peakY}`;
              const vs = getVisualStyles(comp);
              return (
                <g key={comp.id} {...interactiveProps(comp)}>
                  <polygon
                    points={points}
                    fill={vs.fill}
                    fillOpacity={vs.fillOpacity}
                    stroke={vs.stroke}
                    strokeOpacity={vs.strokeOpacity}
                    strokeWidth={Math.max(2, vs.strokeWidth)}
                    strokeLinejoin="round"
                  />
                  {options.showAngles &&
                    !inclineIsAxisAligned &&
                    !isAnyPropertyHidden(comp, ["angle"]) &&
                    renderAngleAnnotation({
                      centerX: ix,
                      centerY: iy,
                      objectAngle: normalizedInclineAngle,
                      referenceAngle: inclineReference,
                      color: "#0f172a",
                      referenceLength: 32,
                      arcRadius: 24,
                      avoidPoints: [
                        { x: inclineMidX, y: inclineMidY },
                        { x: peakX, y: peakY },
                        { x: peakX - 28, y: iy + 24 },
                        { x: ix + 24, y: iy },
                        { x: ix + 44, y: iy },
                        { x: ix + 64, y: iy },
                      ],
                      preferredPoint: {
                        x: ix + 76 * Math.cos(toRadians(20)),
                        y: iy + 76 * Math.sin(toRadians(20)) + 12,
                      },
                      placeTextNode: placeText,
                    })}
                  {options.showDistances &&
                    !isAnyPropertyHidden(comp, ["length", "L"]) &&
                    (() => {
                      const inclineLengthText = `$L=${fmt(len)}$`;
                      const inclineDistPos = chooseSmartLabelPosition({
                        candidates: lineDistanceCandidates({
                          x1: ix,
                          y1: iy,
                          x2: peakX,
                          y2: peakY,
                          offsets: [28, -28, 42, -42],
                          alongOffsets: [0, 20, -20],
                        }),
                        avoidPoints: [
                          { x: ix, y: iy },
                          { x: peakX, y: peakY },
                          { x: (ix + peakX) / 2, y: (iy + peakY) / 2 },
                          { x: peakX - 28, y: iy + 24 },
                        ],
                        labelText: inclineLengthText,
                        fontSize: LABEL_FONT.distance,
                      });
                      reserveLabelBox(
                        inclineDistPos.x,
                        inclineDistPos.y,
                        inclineLengthText,
                        LABEL_FONT.distance,
                      );
                      return placeText(
                        <MathLabel
                          text={inclineLengthText}
                          x={inclineDistPos.x}
                          y={inclineDistPos.y}
                          color="#0f172a"
                          fontSize={LABEL_FONT.distance}
                        />,
                      );
                    })()}
                  {options.showProperties &&
                    propertyLabels(comp).map((label, index) =>
                      placeText(
                        <MathLabel
                          key={label}
                          text={label}
                          x={peakX - 28}
                          y={iy + 24 + index * 18}
                          color="#0f172a"
                          fontSize={LABEL_FONT.property}
                        />,
                      ),
                    )}
                </g>
              );
            }

            if (comp.type === "floor") {
              return (
                <g key={comp.id} {...interactiveProps(comp)}>
                  <rect
                    x={x * scale}
                    y={y * scale}
                    width={width * scale}
                    height={height * scale}
                    fill="#94a3b8"
                  />
                  <line
                    x1={x * scale}
                    y1={(y + height) * scale}
                    x2={(x + width) * scale}
                    y2={(y + height) * scale}
                    stroke="#334155"
                    strokeWidth="4"
                  />
                  {options.showDistances &&
                    !isAnyPropertyHidden(comp, ["length", "width", "L"]) &&
                    (() => {
                      const floorLengthText = `$L=${fmt(width)}$`;
                      const floorY = (y + height) * scale;
                      const leftX = x * scale;
                      const rightX = (x + width) * scale;
                      const floorDistPos = chooseSmartLabelPosition({
                        candidates: [
                          { x: (leftX + rightX) / 2, y: floorY + 18 },
                          { x: (leftX + rightX) / 2, y: floorY + 30 },
                          { x: (leftX + rightX) / 2 - 40, y: floorY + 22 },
                          { x: (leftX + rightX) / 2 + 40, y: floorY + 22 },
                        ],
                        avoidPoints: [
                          { x: leftX, y: floorY },
                          { x: rightX, y: floorY },
                        ],
                        labelText: floorLengthText,
                        fontSize: LABEL_FONT.distance,
                      });
                      reserveLabelBox(
                        floorDistPos.x,
                        floorDistPos.y,
                        floorLengthText,
                        LABEL_FONT.distance,
                      );
                      return placeText(
                        <MathLabel
                          text={floorLengthText}
                          x={floorDistPos.x}
                          y={floorDistPos.y}
                          color="#0f172a"
                          fontSize={LABEL_FONT.distance}
                        />,
                      );
                    })()}
                  {options.showProperties &&
                    propertyLabels(comp).map((label, index) =>
                      placeText(
                        <MathLabel
                          key={label}
                          text={label}
                          x={(x + width / 2) * scale}
                          y={(y + height + 0.75 + index * 0.35) * scale}
                          color="#0f172a"
                          fontSize={LABEL_FONT.property}
                        />,
                      ),
                    )}
                </g>
              );
            }

            if (comp.type === "block") {
              const rotation = comp.rotation || 0;
              const cx = (x + width / 2) * scale;
              const cy = (y + height / 2) * scale;
              const blockTextRotation = options.textOnTop ? 0 : -rotation;
              const vs = getVisualStyles(comp);
              const blockOffsetPx = BLOCK_OFFSET_PX;
              return (
                <g
                  key={comp.id}
                  transform={`rotate(${rotation} ${cx} ${cy})`}
                  {...interactiveProps(comp)}
                >
                  <g transform={`translate(0 ${-blockOffsetPx})`}>
                    <rect
                      x={x * scale}
                      y={y * scale}
                      width={width * scale}
                      height={height * scale}
                      fill={vs.fill}
                      fillOpacity={vs.fillOpacity}
                      stroke={vs.stroke}
                      strokeOpacity={vs.strokeOpacity}
                      strokeWidth={Math.max(1.5, vs.strokeWidth)}
                      rx="4"
                    />
                    {comp.properties.label_mass &&
                      !isAnyPropertyHidden(comp, ["label_mass", "mass"]) &&
                      placeText(
                        <g
                          transform={`rotate(${blockTextRotation} ${cx} ${cy})`}
                        >
                          <MathLabel
                            text={comp.properties.label_mass}
                            x={cx}
                            y={cy}
                          />
                        </g>,
                      )}
                    {options.showDistances &&
                      !isAnyPropertyHidden(comp, ["width", "height"]) &&
                      (() => {
                        const dimensionText = `$${fmt(width)}\\times${fmt(height)}$`;
                        const topY = cy - (height * scale) / 2;
                        const dimensionPos = chooseSmartLabelPosition({
                          candidates: [
                            { x: cx, y: topY - 20 },
                            { x: cx + 26, y: topY - 22 },
                            { x: cx - 26, y: topY - 22 },
                            { x: cx, y: topY - 32 },
                          ],
                          avoidPoints: [{ x: cx, y: cy }],
                          labelText: dimensionText,
                          fontSize: LABEL_FONT.dimension,
                        });
                        reserveLabelBox(
                          dimensionPos.x,
                          dimensionPos.y,
                          dimensionText,
                          LABEL_FONT.dimension,
                        );
                        return placeText(
                          <g
                            transform={`rotate(${blockTextRotation} ${cx} ${cy})`}
                          >
                            <MathLabel
                              text={dimensionText}
                              x={dimensionPos.x}
                              y={dimensionPos.y}
                              color="#1d4ed8"
                              fontSize={LABEL_FONT.dimension}
                            />
                          </g>,
                        );
                      })()}
                    {options.showProperties &&
                      propertyLabels(comp).map((label, index) =>
                        placeText(
                          <g
                            key={label}
                            transform={`rotate(${blockTextRotation} ${cx} ${cy})`}
                          >
                            <MathLabel
                              text={label}
                              x={cx}
                              y={cy + (height * scale) / 2 + 18 + index * 18}
                              color="#1d4ed8"
                              fontSize={LABEL_FONT.property}
                            />
                          </g>,
                        ),
                      )}
                  </g>
                </g>
              );
            }

            if (comp.type === "wall") {
              if (!comp.bounds) return null;
              const { x, y, width, height } = comp.bounds;
              return (
                <g key={comp.id} {...interactiveProps(comp)}>
                  <rect
                    x={x * scale}
                    y={y * scale}
                    width={width * scale}
                    height={height * scale}
                    fill="#94a3b8"
                  />
                  <line
                    x1={(x + width) * scale}
                    y1={y * scale}
                    x2={(x + width) * scale}
                    y2={(y + height) * scale}
                    stroke="#334155"
                    strokeWidth="4"
                  />
                  {options.showProperties &&
                    propertyLabels(comp).map((label, index) =>
                      placeText(
                        <MathLabel
                          key={label}
                          text={label}
                          x={(x + width + 0.4) * scale}
                          y={(y + height / 2 + index * 0.4) * scale}
                          color="#0f172a"
                          fontSize={LABEL_FONT.property}
                        />,
                      ),
                    )}
                </g>
              );
            }

            return null;
          })}
          {options.textOnTop && <g pointerEvents="none">{textOverlayNodes}</g>}
        </g>
      </svg>
    </div>
  );
}

function PropertyRow({
  compId,
  propKey,
  val,
  onUpdate,
}: {
  compId: string;
  propKey: string;
  val: any;
  onUpdate: (id: string, k: string, v: string) => void;
}) {
  // Helper to format values specifically for MechTeX
  const formatValue = (v: any) => {
    if (Array.isArray(v)) {
      // Join arrays with a comma and space, NO quotes!
      return `[${v.join(", ")}]`;
    }
    if (typeof v === "object" && v !== null) {
      return JSON.stringify(v);
    }
    return String(v);
  };

  const initialStr = formatValue(val);
  const [localVal, setLocalVal] = useState(initialStr);

  // Sync local state when component/property selection changes
  // We strictly depend on compId and propKey to avoid interrupting the user mid-keystroke
  useEffect(() => {
    setLocalVal(formatValue(val));
  }, [compId, propKey]);

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "8px 0",
        borderBottom: "1px solid var(--line)",
        alignItems: "center",
      }}
    >
      <div style={{ color: "var(--accent-2)", minWidth: 110 }}>{propKey}:</div>
      <input
        value={localVal}
        onChange={(e) => {
          setLocalVal(e.target.value);
          onUpdate(compId, propKey, e.target.value);
        }}
        style={{
          flex: 1,
          background:
            "color-mix(in srgb, var(--panel-strong) 40%, transparent)",
          border: "1px solid var(--line)",
          color: "var(--text)",
          padding: "6px 8px",
          borderRadius: "4px",
          fontFamily: "monospace",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function Inspector({
  comp,
  onClose,
  onUpdateProperty,
}: {
  comp: ResolvedComponent;
  onClose?: () => void;
  onUpdateProperty?: (id: string, k: string, v: string) => void;
}) {
  const rows = Object.entries(comp.properties).filter(([k]) => k !== "id");
  return (
    <div style={{ padding: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>
            {comp.type} ({comp.id})
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {comp.bounds
              ? `${Math.round((comp.bounds.width || 0) * 100) / 100}×${Math.round((comp.bounds.height || 0) * 100) / 100}`
              : ""}
          </div>
        </div>
        <button
          className="icon-button"
          onClick={() => onClose?.()}
          aria-label="Close inspector"
        >
          ✕
        </button>
      </div>
      <div
        style={{
          maxHeight: "calc(100vh - 200px)",
          overflow: "auto",
          paddingRight: 4,
        }}
      >
        {rows.length ? (
          rows.map(([k, v]) => (
            <PropertyRow
              key={k}
              compId={comp.id}
              propKey={k}
              val={v}
              onUpdate={onUpdateProperty!}
            />
          ))
        ) : (
          <div style={{ color: "var(--muted)" }}>No properties</div>
        )}
      </div>
    </div>
  );
}

function App() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedComponent[]>([]);
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    showAngles: false,
    showDistances: false,
    showProperties: false,
    textOnTop: true,
  });
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selectedComp, setSelectedComp] = useState<ResolvedComponent | null>(
    null,
  );
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const lineCount = code.split("\n").length;
  const lineNumbers = Array.from(
    { length: lineCount },
    (_, i) => `${i + 1}`,
  ).join("\n");

  const [editorTab, setEditorTab] = useState<'code' | 'prompt' | 'examples'>('code');
  const [docType, setDocType] = useState<'concise' | 'detailed'>('concise');
  const [showTooltip, setShowTooltip] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const generateCode = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(' https://mechtex-backend.onrender.com/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, docType })
      });
      const data = await res.json();
      if (data.code) {
        setCode(data.code);
        setEditorTab('code');
      } else {
        setGenerateError(data.error + (data.details ? `: ${data.details}` : ''));
      }
    } catch (err: any) {
      setGenerateError('Error connecting to backend: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const [globalCursor, setGlobalCursor] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Track global cursor for the halo to be across the whole interface
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => {
      setGlobalCursor({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleGlobalMove);
    return () => window.removeEventListener("mousemove", handleGlobalMove);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };
  const exportPNG = async () => {
    if (!previewRef.current) return;

    try {
      const cs =
        typeof window !== "undefined"
          ? getComputedStyle(document.documentElement)
          : ({} as CSSStyleDeclaration);
      const bgcolor =
        cs.getPropertyValue("--canvas-bg")?.trim() ||
        (theme === "dark" ? "#0b0d12" : "#f5f7fb");

      const dataUrl = await domtoimage.toPng(previewRef.current, {
        scale: 4,
        bgcolor,
      });

      const link = document.createElement("a");
      link.download = "mechtex-diagram.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export diagram:", err);
    }
  };

  const toggleDisplayOption = (key: keyof DisplayOptions) => {
    setDisplayOptions((options) => ({ ...options, [key]: !options[key] }));
  };

  const handleUpdateProperty = (id: string, key: string, val: string) => {
    setCode((prev) => {
      const lines = prev.split("\n");
      return lines
        .map((line) => {
          // Verify component id is on the line (lookahead for commas/brackets)
          const idRegex = new RegExp(`id=${id}(?=[,\\]\\s])`);
          if (idRegex.test(line)) {
            // 1. Map synthetic keys generated by the solver back to their raw source code equivalents
            let sourceKey = key;
            if (key.startsWith("contact_mu")) {
              sourceKey = "mu";
            } else if (key.startsWith("contact_anchor")) {
              sourceKey = "anchor";
            }

            // 2. Find the exact property, respecting nested curly braces
            const propRegex = new RegExp(
              `\\b(${sourceKey}\\s*=\\s*)(?:\\[.*?\\]|\\(.*?\\)|\\{.*?\\}|[^,\\]\\}]*)`,
            );

            if (propRegex.test(line)) {
              // Update standard property (e.g., anchor=inc1.surface)
              return line.replace(propRegex, `$1${val}`);
            } else if (sourceKey === "anchor") {
              // 3. SHORTHAND FALLBACK:
              // If looking for 'anchor=' fails, check if the shorthand 'on=...' was used
              // instead of 'on={anchor=...}'. We ensure 'on=' is NOT followed by a '{'.
              const onShorthandRegex = new RegExp(
                `\\b(on\\s*=\\s*)(?!\\{)([^,\\]\\}]*)`,
              );
              if (onShorthandRegex.test(line)) {
                return line.replace(onShorthandRegex, `$1${val}`);
              }
            }

            // 4. Add property directly after the id parameter if not found at all
            return line.replace(idRegex, `$&, ${sourceKey}=${val}`);
          }
          return line;
        })
        .join("\n");
    });
  };

  useEffect(() => {
    try {
      const ast = parseMechTeX(code);
      if (ast) {
        const solver = new Solver(ast);
        const components = solver.resolve();
        setResolved(components);
        setError(null);
        // Refresh selectedComp object so its properties accurately update the inputs in the Inspector
        setSelectedComp((prev) => {
          if (!prev) return null;
          return components.find((c) => c.id === prev.id) || null;
        });
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [code]);

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">MechTeX</h1>
            <p className="app-subtitle">Physics Diagram Editor</p>
          </div>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={toggleTheme}
              title="Toggle dark/light mode"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              className="icon-button"
              onClick={exportPNG}
              title="Export as PNG"
              aria-label="Export PNG"
            >
              ⬇️
            </button>
          </div>
        </div>
      </header>

      <div className="editor-container">
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '20px', padding: '0 4px 12px 4px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>
            <span 
              onClick={() => setEditorTab('code')} 
              style={{ cursor: 'pointer', opacity: editorTab === 'code' ? 1 : 0.5, borderBottom: editorTab === 'code' ? '2px solid var(--accent)' : 'none', paddingBottom: '4px', transition: 'opacity 0.2s' }}
            >
              Code Editor
            </span>
            <span 
              onClick={() => setEditorTab('prompt')} 
              style={{ cursor: 'pointer', opacity: editorTab === 'prompt' ? 1 : 0.5, borderBottom: editorTab === 'prompt' ? '2px solid var(--accent)' : 'none', paddingBottom: '4px', transition: 'opacity 0.2s' }}
            >
              Prompt AI
            </span>
            <span 
              onClick={() => setEditorTab('examples')} 
              style={{ cursor: 'pointer', opacity: editorTab === 'examples' ? 1 : 0.5, borderBottom: editorTab === 'examples' ? '2px solid var(--accent)' : 'none', paddingBottom: '4px', transition: 'opacity 0.2s' }}
            >
              Examples
            </span>
          </div>
          <div className="pane" style={{ borderRight: "1px solid #334155", flex: 1, minHeight: 0 }}>
          {editorTab === 'code' ? (
            <div className="editor-wrapper">
              <div className="gutter" ref={gutterRef} aria-hidden>
                <pre>{lineNumbers}</pre>
              </div>
              <textarea
                ref={editorRef}
                className="editor"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  if (gutterRef.current)
                    gutterRef.current.scrollTop = t.scrollTop;
                }}
                spellCheck={false}
              />
            </div>
          ) : editorTab === 'prompt' ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '12px', boxSizing: 'border-box', overflow: 'hidden' }}>
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  background: "color-mix(in srgb, var(--panel-strong) 40%, transparent)",
                  border: "1px solid var(--line)",
                  borderRadius: "16px",
                  padding: "16px",
                  boxSizing: "border-box"
                }}
              >
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Ask anything, @ to mention, / for actions"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "var(--text)",
                    fontFamily: "inherit",
                    fontSize: "15px",
                    resize: "none",
                    outline: "none",
                    paddingBottom: "12px"
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <button 
                        onClick={() => { setShowTooltip(!showTooltip); setShowInfo(false); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', padding: '4px 8px', borderRadius: '6px', transition: 'background 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'color-mix(in srgb, var(--text) 5%, transparent)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {docType === 'concise' ? 'Concise Docs' : 'Detailed Docs'}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showTooltip ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                      {showTooltip && (
                        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '0', background: 'var(--panel-strong)', border: '1px solid var(--line)', borderRadius: '10px', overflow: 'hidden', zIndex: 10, display: 'flex', flexDirection: 'column', minWidth: '220px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', animation: 'slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                          <div 
                            onClick={() => { setDocType('concise'); setShowTooltip(false); }}
                            style={{ padding: '10px 14px', cursor: 'pointer', background: docType === 'concise' ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent', color: docType === 'concise' ? 'var(--accent)' : 'var(--text)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s' }}
                            onMouseOver={(e) => { if(docType !== 'concise') e.currentTarget.style.background = 'color-mix(in srgb, var(--text) 5%, transparent)' }}
                            onMouseOut={(e) => { if(docType !== 'concise') e.currentTarget.style.background = 'transparent' }}
                          >
                            Concise (Fast) {docType === 'concise' && '✓'}
                          </div>
                          <div 
                            onClick={() => { setDocType('detailed'); setShowTooltip(false); }}
                            style={{ padding: '10px 14px', cursor: 'pointer', background: docType === 'detailed' ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent', color: docType === 'detailed' ? 'var(--accent)' : 'var(--text)', fontSize: '13px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s' }}
                            onMouseOver={(e) => { if(docType !== 'detailed') e.currentTarget.style.background = 'color-mix(in srgb, var(--text) 5%, transparent)' }}
                            onMouseOut={(e) => { if(docType !== 'detailed') e.currentTarget.style.background = 'transparent' }}
                          >
                            Detailed (For Complex Figures) {docType === 'detailed' && '✓'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => { setShowInfo(!showInfo); setShowTooltip(false); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'background 0.2s, color 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--text) 5%, transparent)'; e.currentTarget.style.color = 'var(--text)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
                        title="What is this?"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                      </button>
                      {showInfo && (
                        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '0', background: 'var(--panel-strong)', border: '1px solid var(--line)', borderRadius: '10px', padding: '14px', zIndex: 10, minWidth: '280px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', animation: 'slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)', fontSize: '13px', lineHeight: '1.5', color: 'var(--text)' }}>
                          <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            What is this?
                            <button onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </div>
                          <div style={{ color: 'var(--muted)', marginBottom: '10px' }}>This setting controls how much context the AI is given about MechTeX.</div>
                          <div style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--accent)' }}>Concise:</strong> Gives the AI a minimal cheatsheet. Faster generation, cheaper, and works well for simple prompts.</div>
                          <div><strong style={{ color: 'var(--accent)' }}>Detailed:</strong> Gives the AI the complete API documentation. Slower to generate, but necessary for complex figures and advanced routing logic.</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={generateCode}
                    disabled={isGenerating || !promptText.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      background: isGenerating || !promptText.trim() ? 'color-mix(in srgb, var(--text) 10%, transparent)' : 'var(--text)',
                      color: 'var(--canvas-bg)',
                      border: 'none',
                      borderRadius: '50%',
                      cursor: isGenerating || !promptText.trim() ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title="Send"
                  >
                    {isGenerating ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5"></line>
                        <polyline points="5 12 12 5 19 12"></polyline>
                      </svg>
                    )}
                  </button>
                  <style>{`
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                  `}</style>
                </div>
              </div>
              {generateError && (
                <div style={{ color: '#ef4444', padding: '8px', border: '1px solid #ef4444', borderRadius: '8px', fontSize: '13px', background: 'color-mix(in srgb, #ef4444 10%, transparent)' }}>
                  {generateError}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '16px', boxSizing: 'border-box', overflowY: 'auto' }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>Select an example to load it into the editor.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {EXAMPLES.map((ex, i) => (
                  <div key={i} style={{ 
                    background: "color-mix(in srgb, var(--panel-strong) 40%, transparent)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    padding: "12px",
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text)' }}>{ex.title}</h3>
                    <pre style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', maxHeight: '100px', overflow: 'hidden', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {ex.code.substring(0, 150)}...
                    </pre>
                    <button
                      onClick={() => {
                        setCode(ex.code);
                        setEditorTab('code');
                      }}
                      style={{
                        padding: '8px',
                        background: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        alignSelf: 'flex-start'
                      }}
                    >
                      Load Example
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
        <div className="pane">
          <div className="pane-header preview-header">
            <span>Live Render</span>
            <div className="toggle-row">
              <button
                className={
                  displayOptions.showAngles ? "toggle active" : "toggle"
                }
                onClick={() => toggleDisplayOption("showAngles")}
              >
                Angles
              </button>
              <button
                className={
                  displayOptions.showDistances ? "toggle active" : "toggle"
                }
                onClick={() => toggleDisplayOption("showDistances")}
              >
                Distances
              </button>
              <button
                className={
                  displayOptions.showProperties ? "toggle active" : "toggle"
                }
                onClick={() => toggleDisplayOption("showProperties")}
              >
                Properties
              </button>
              <button
                className={
                  displayOptions.textOnTop ? "toggle active" : "toggle"
                }
                onClick={() => toggleDisplayOption("textOnTop")}
              >
                Text On Top
              </button>
            </div>
          </div>
          <div className="preview">
            <div className="preview-main">
              <div className="preview-area" ref={previewRef}>
                {" "}
                {/* <--- Add it here! */}
                <SvgRenderer
                  components={resolved}
                  options={displayOptions}
                  onSelect={(c) => setSelectedComp(c)}
                />
                {error && <div className="error-banner">{error}</div>}
              </div>
              <aside className="inspector" aria-label="Inspector">
                {selectedComp ? (
                  <Inspector
                    comp={selectedComp}
                    onClose={() => setSelectedComp(null)}
                    onUpdateProperty={handleUpdateProperty}
                  />
                ) : (
                  <div className="inspector-empty">
                    Click an object on the diagram to inspect its properties.
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <p>
          Built with <span className="heart">♥</span> by{" "}
          <a
            href="https://github.com/shahaayush265"
            target="_blank"
            rel="noopener noreferrer"
          >
            @shahaayush265
          </a>
        </p>
      </footer>
      {/* Global Cursor Halo Implementation */}
      {globalCursor && (
        <div
          className="cursor-halo"
          style={{ left: globalCursor.x, top: globalCursor.y }}
        />
      )}
    </div>
  );
}

export default App;
