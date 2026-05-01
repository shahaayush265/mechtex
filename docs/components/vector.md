# `\vector` — Force / directional arrow

## Overview

`\vector` draws an arrow representing a force or a direction. Vectors support a `label` (math or text), `color`, `length`, and `angle`.

Syntax

```
\vector[id=ID, color=#RRGGBB, label=$...$, length=NUMBER, angle=NUMBER]{connects=anchor}
```

Properties
| Property | Type | Example | Default | Notes |
|---|---:|---|---|---|
| `id` | word | `id=mg` | required | Identifier |
| `color` | color | `color=#ef4444` | renderer default | Arrow color |
| `label` | math/text | `label=$m_1g$` | none | KaTeX rendered when using `$...$` |
| `length` | number | `length=2.5` | 1.0 | Length in world units |
| `angle` | number | `angle=-90` | 0 | Angle in degrees; 0 = right, 90 = up |

Examples

```
\vector[id=mg, color=#ef4444, label=$m_1g$, length=2.5, angle=-90]{connects=m1.center}
```

Rendering notes

- Vectors are drawn above strings and rods. Labels are positioned intelligently to avoid overlaps. If `showAngles` is enabled, angles may be annotated relative to a nearest axis.
