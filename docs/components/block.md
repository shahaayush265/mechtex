# `\block` — Rectangular object

## Overview

`\block` describes a rigid rectangular body. Blocks are commonly placed on surfaces (`on`) or hung from anchors (`hang`). The renderer draws a filled rectangle and exposes anchor points for connectors.

Syntax

```
\block[id=ID, width=NUMBER, height=NUMBER, label_mass=$...$, color=#RRGGBB]{constraints}
```

Properties
| Property | Type | Example | Default | Notes |
|---|---:|---|---|---|
| `id` | word | `id=m1` | required | Unique identifier; used for anchors and references |
| `width` | number | `width=2` | required | Horizontal size in world units |
| `height` | number | `height=2` | required | Vertical size |
| `label_mass` | math | `label_mass=$m_1$` | none | Rendered with KaTeX near block |
| `color` | color | `color=#3b82f6` | renderer default | Fill color for the block |
| `hideProperties` | list/word | `hideProperties=[mu]` | none | Flags to hide fields from tooltips |

Anchors

- `center` — geometric center
- `top` / `bottom` / `left` / `right` — face centers
- `top_left`, `top_right`, `bottom_left`, `bottom_right` — corners
- `surface` — the top surface point used when `on=<surface>` is used

Constraints (positioning)

- `on=<anchor>` — place the block so its bottom (or surface) contacts the referenced surface anchor (e.g., `on=inc1.surface`).
- `hang=<anchor>` — suspend the block at the given anchor point (useful for hanging masses).
- `position=<number>` — when `on` is used with an incline, `position` sets the distance along the incline from its base.
- `x`, `y` — absolute coordinates.
- `align_x=<anchor>` — horizontally align the block's center with given anchor.

Examples

Block resting on an incline (from `DEFAULT_CODE`):

```
\block[id=m1, width=2, height=2, label_mass=$m_1$]{on=inc1.surface, position=6}
```

Hanging block suspended from a pulley:

```
\block[id=m2, width=1.8, height=1.8, label_mass=$m_2$]{hang=p1.right, y=-6}
```

Rendering notes

- When a block is placed `on` an incline, the solver computes the rotation and the contact `surface` anchor used by strings and rods.
- `label_mass` is typeset via KaTeX — use `$...$` around math content.
