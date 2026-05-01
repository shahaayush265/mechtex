# MechTeX (web-editor)

MechTeX is a small LaTeX-like language for describing mechanical diagrams (blocks, inclines, pulleys, strings, forces). This repository contains a React-based web editor and renderer.

## Quick install (development)

Requirements

- Node.js 16+ (or compatible LTS)

Steps

```bash
cd web-editor
npm install
npm run dev
# open the URL printed by Vite (commonly http://localhost:5173)
```

To run parser/lexer tests (basic):

```bash
cd web-editor
node test-lexer.js
node test-lexer2.js
node test-lexer3.js
```

## Project layout (important files)

- `web-editor/src/mechtex.ne` — Nearley grammar (language spec)
- `web-editor/src/mechtex.ts` / `mechtex.cjs` — compiled grammar artifacts
- `web-editor/src/parser.ts` — small wrapper to parse MechTeX source
- `web-editor/src/solver.ts` — resolver that converts AST to positioned geometries
- `web-editor/src/App.tsx` — editor, preview, and `SvgRenderer`

## Live demo

Placeholder live demo: https://example.com/mechtex (update with your hosted URL)

## Documentation

User language docs and examples are provided under the repository `docs/` directory. Start with [docs/index.md](docs/index.md).
