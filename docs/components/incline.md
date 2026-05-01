# `\incline` — Ramp / inclined plane

## Overview

`\incline` defines a straight sloped surface (ramp). It is often used as a support for blocks and as an anchor for pulleys and strings.

Syntax

```
\incline[id=ID, angle=NUMBER, length=NUMBER, x=NUMBER, y=NUMBER]{constraints}
```

Properties
| Property | Type | Example | Default | Notes |
|---|---:|---|---|---|
| `id` | word | `id=inc1` | required | Identifier |
| `angle` | number (degrees) | `angle=30` | `0` | Angle measured CCW from +x (0 = horizontal right) |
| `length` | number | `length=12` | renderer default | Length of incline surface |
| `x`, `y` | number | `x=-3`, `y=0` | `0` | Base (origin) coordinates for the incline |

Anchors

- `top` / `peak` — the upper end of the incline
- `base` / `bottom` / `origin` — the lower end of the incline
- `surface` — a logical point on the top surface used by `on=` constraints
- `center` — midpoint along the incline

Constraints

- `on={anchor=ID.anchor, mu=NUMBER}` — positions the incline relative to another surface and optionally attaches a friction coefficient used for annotation. Example: `on={anchor=gnd.surface, mu=0.35}`.

Examples

```
\incline[id=inc1, angle=30, length=12, x=-3]{on={anchor=gnd.surface, mu=0.35}}
```

Rendering notes

- The renderer draws the incline as a filled triangular/rectangular surface and exposes a `surface` anchor used by blocks and pulleys.
- Angle annotations can be displayed when `showAngles` is enabled in the UI.
