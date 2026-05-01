# Developer Guide

This guide explains the key implementation pieces of MechTeX and how to extend the language or renderer.

## Core flow

1. The editor calls `parseMechTeX(code)` which uses the Nearley grammar compiled from `web-editor/src/mechtex.ne` via `web-editor/scripts/build-grammar.js`.
   - Parser entry: [web-editor/src/parser.ts](web-editor/src/parser.ts)
2. The parsed AST (a `system` node with child `component` nodes) is passed to the `Solver`:
   - Resolver: [web-editor/src/solver.ts](web-editor/src/solver.ts)
   - Call: `new Solver(ast).resolve()` → returns `ResolvedComponent[]`
3. The UI (`SvgRenderer` inside [web-editor/src/App.tsx](web-editor/src/App.tsx)) consumes the resolved components and draws them as SVG.

## Key files

- Grammar: [web-editor/src/mechtex.ne](web-editor/src/mechtex.ne) (Nearley source)
- Parser wrapper: [web-editor/src/parser.ts](web-editor/src/parser.ts)
- Solver / resolver: [web-editor/src/solver.ts](web-editor/src/solver.ts)
- Renderer / UI: [web-editor/src/App.tsx](web-editor/src/App.tsx) (see `SvgRenderer`)
- Grammar build helper: [web-editor/scripts/build-grammar.js](web-editor/scripts/build-grammar.js)
- Build scripts: [web-editor/package.json](web-editor/package.json)

## Resolved data shape

The resolver returns an array of `ResolvedComponent` objects. Example TypeScript shape (from `solver.ts`):

```ts
export interface ResolvedComponent {
  type: string;
  id: string;
  properties: Record<string, any>;
  bounds?: { x: number; y: number; width: number; height: number };
  endpoints?: { x1: number; y1: number; x2: number; y2: number };
  pathSegments?: Array<{
    type: "line" | "arc";
    x: number;
    y: number;
    r?: number;
    cx?: number;
    cy?: number;
  }>;
  startX?: number;
  startY?: number; // for path routing
  rotation?: number; // in degrees
}
```

## Regenerating the grammar

If you edit `web-editor/src/mechtex.ne`, regenerate the compiled grammar artifacts with:

```bash
cd web-editor
npm run build:grammar
```

This runs `node scripts/build-grammar.js` (see `package.json` scripts). After regenerating grammar, rebuild and run the dev server:

```bash
npm run dev
# or to build
npm run build
```

## Adding a new component (step-by-step)

The grammar accepts any `\<word>` as a component, so you typically don't need to change the grammar to add new component names. Most work is in the solver and renderer.

1. Design the component's semantics: properties, anchors, and how it should be positioned relative to other components.

2. Implement resolver logic in `solver.ts`:
   - Open `tryResolve(node: ASTNode)` and add a `if (node.name === "yourcomponent") { ... }` block that computes `bounds`, `endpoints`, `pathSegments`, `rotation`, and any resolved properties.
   - Use existing component sections as templates (see `block`, `pulley`, `incline`, and connector handling).
   - Ensure the block returns `this.resolved.set(id, resolvedComp)` and `return true` when resolved.

3. Add anchor support in `getAnchorPosition(targetId, anchorName)`:
   - Map `anchorName` strings to coordinates derived from the component's `bounds`, `rotation`, or other geometry.
   - For rotated shapes, consider computing rotated corner points (see `block` handling in `getAnchorPosition`).

4. Update the renderer in `SvgRenderer` (`web-editor/src/App.tsx`):
   - Add the new type to `renderLayer(...)` so it gets the correct draw order.
   - Add a JSX rendering block in the `orderedComponents.map(...)` where other component types are rendered. Follow the pattern used for `block`, `pulley`, or `rod` depending on what best matches.
   - Use `interactiveProps(comp)` so the component benefits from the tooltip and click handlers.

5. Add documentation and example usage to `docs/` (create a component doc and an example in `docs/examples`).

6. Add tests or simple parse checks: run `node test-lexer.js` or write small harnesses that call `parseMechTeX()` and `new Solver(ast).resolve()`.

Example: adding a `gizmo` component (minimal)

In `solver.ts` add:

```ts
if (node.name === "gizmo") {
  const size = node.properties.size || 1;
  const x = constraints.x ?? node.properties.x ?? 0;
  const y = constraints.y ?? node.properties.y ?? 0;
  this.resolved.set(id, {
    type: "gizmo",
    id,
    properties: node.properties,
    bounds: { x: x - size / 2, y: y - size / 2, width: size, height: size },
  });
  return true;
}
```

Then in `getAnchorPosition` add a mapping for `target.type === 'gizmo'` that returns `center` or `top/right` anchors based on `bounds`.

Finally, in `web-editor/src/App.tsx` add a rendering block similar to `block` or `pulley` that draws the gizmo using `rect` or `circle`.

## Testing & debugging

- Start the dev server and view the editor: `cd web-editor && npm install && npm run dev`.
- Paste your example into the editor and check the console for parse/solver errors.
- Use the `showProperties` / `showDistances` toggles in the UI to surface resolved properties and anchors.

## Tips

- Follow the patterns in `solver.ts` — connectors use `constraints.connects` and may produce `endpoints` or `pathSegments`.
- Use `applyContactProperties(...)` to attach `contact_anchor` and `contact_mu` metadata for surfaces.
- Keep visual-only properties in the component's `properties` object; solver attaches geometry only after resolution.
