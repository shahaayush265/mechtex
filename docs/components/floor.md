# `\floor` — Fixed bottom surface

## Overview

`\floor` draws a fixed horizontal surface near the bottom of the scene (ground). Use it to anchor inclines, blocks, and other components.

Syntax

```
\floor[id=ID, width=NUMBER]{y=NUMBER}
```

Properties
| Property | Type | Example | Default | Notes |
|---|---:|---|---|---|
| `id` | word | `id=gnd` | required | Identifier |
| `width` | number | `width=20` | renderer default | Horizontal span |

Anchors

- `surface` — top surface used by `on=` constraints
- `top` — alias for `surface`

Example

```
\floor[id=gnd, width=20]{y=-8}
```
