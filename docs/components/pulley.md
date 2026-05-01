# `\pulley` — Pulley / wheel

## Overview

`\pulley` renders a wheel that can route strings. The pulley has a center anchor and surface anchors used for rope routing and attachments.

Syntax

```
\pulley[id=ID, radius=NUMBER]{constraints}
```

Properties
| Property | Type | Example | Default | Notes |
|---|---:|---|---|---|
| `id` | word | `id=p1` | required | Identifier |
| `radius` | number | `radius=0.8` | renderer default | Radius in world units |
| `color` | color | `color=#9CA3AF` | renderer default | Stroke/fill color |

Anchors

- `center` — center point of the pulley
- `top` / `bottom` / `left` / `right` — cardinal anchors around the wheel
- `surface` — the rim contact point (synonym for `top` when used with routing)

Constraints / Positioning

- `from=<anchor>, distance=NUMBER, direction=NUMBER` — positions the pulley at an offset from an anchor. `direction` is an angle in degrees.
- `relative_to=<anchor>` — compute offset direction relative to another component's orientation.
- `hang=<anchor>` — suspend pulley at the given anchor.

Examples

```
\pulley[id=p1, radius=0.8]{from=inc1.top, distance=0.7, direction=0, relative_to=inc1.surface}
```

Routing example (used in string paths):

```
(m1.right -> over(p1) -> m2.top)
```

Rendering notes

- Pulley routing is handled by the solver which computes tangent contact points for strings when a path uses `over(pulleyId)` or similar.
