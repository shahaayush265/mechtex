# `\label`, `\note`, `\text` — Annotations

## Overview

Text annotations are rendered using KaTeX for math and plain SVG text for non-math content. Labels can be positioned relative to component anchors or absolutely.

Syntax

```
\label[id=ID, label=$...$, size=NUMBER, color=#RRGGBB]{at=component.anchor, dx=NUMBER, dy=NUMBER}
```

Common properties
| Property | Type | Example | Default | Notes |
|---|---:|---|---|---|
| `id` | word | `id=q1` | required | Identifier |
| `label` | math/text | `label=$\text{Find acceleration}$` | required | Use `$...$` for math |
| `size` | number | `size=18` | renderer default | Font size in px |
| `color` | color | `color=#fff` | theme-dependent | Text color |

Positioning / Constraints

- `at=<anchor>` — attach label to an anchor (e.g., `at=top.surface`)
- `x`, `y` — absolute coordinates
- `dx`, `dy` — relative offsets (applied after base position)

Example (from `DEFAULT_CODE`):

```
\label[id=q1, label=$\text{Find acceleration and tension}$]{at=top.surface, dy=-1}
```

Rendering notes

- KaTeX is used for math content; plain text is drawn as SVG text. The renderer flips Y so math labels use `foreignObject` with KaTeX markup.
