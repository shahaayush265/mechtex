# `\rod` — Rigid connector

## Overview

`\rod` draws a rigid bar between two anchor points. Use `connects=(anchorA, anchorB)` to create a rod; it is useful for supports and linkages.

Syntax

```
\rod[id=ID]{connects=(anchorA, anchorB)}
```

Properties
| Property | Type | Example | Default | Notes |
|---|---:|---|---|---|
| `id` | word | `id=r1` | required | Identifier |

Examples

```
\rod[id=p1_support]{connects=(inc1.top, p1.center)}
```

Rendering notes

- Rods are drawn as solid thick lines. Distance labels may be shown if `showDistances` is enabled in the UI.
