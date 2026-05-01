# MechTeX — Language Reference & User Guide

Welcome to MechTeX — a lightweight, LaTeX-style domain language for describing mechanical diagrams (blocks, inclines, pulleys, strings, forces) and rendering them as interactive SVG in the web editor.

This documentation covers the language syntax, value types, components (with properties and anchors), and several practical examples you can copy into the editor.

## Quick links

- **Grammar & Syntax**: [docs/grammar.md](docs/grammar.md)
- **Components**: [docs/components/README.md](docs/components/README.md)
- **Examples**: [docs/examples/README.md](docs/examples/README.md)

## Quick start

Paste the following into the editor in `web-editor` and press Run / preview:

```
\begin{system}[scale=1.0]
  \floor[id=gnd, width=20]{y=-8}
  \block[id=m1, width=2, height=2, label_mass=$m_1$]{on=gnd.surface, x=3}
\end{system}
```

This will create a simple floor and a block sitting on it. See the examples collection for more advanced setups (pulleys, inclines, strings).

## Conventions

- Coordinates and lengths use arbitrary world units (the system-level `scale` property remaps units to pixels in the renderer).
- Math content is written in inline KaTeX using `$...$` (e.g., `$m_1$`).

---

If you want a compact list of files created, see the project root `README.md`.
