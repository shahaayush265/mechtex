# `\ceiling` — Fixed top surface

## Overview

`\ceiling` draws a fixed horizontal surface near the top of the scene. It is used as a positioning anchor for labels and other components.

Syntax

```
\ceiling[id=ID, width=NUMBER]{y=NUMBER}
```

Properties
| Property | Type | Example | Default | Notes |
|---|---:|---|---|---|
| `id` | word | `id=top` | required | Identifier |
| `width` | number | `width=20` | renderer default | Horizontal span of the ceiling |

Anchors

- `surface` — surface anchor used by `at=` or other positioning
- `bottom` — anchor on the underside

Example

```
\ceiling[id=top, width=20]{y=8}
```
