# `\spring` — Elastic connector

## Overview

`\spring` represents an elastic connector between two anchors. It is rendered as a zig-zag spring shape.

Syntax

```
\spring[id=ID, length=NUMBER, label_k=$...$]{connects=(anchorA, anchorB)}
```

Properties
| Property | Type | Example | Default | Notes |
|---|---:|---|---|---|
| `id` | word | `id=s1` | required | Identifier |
| `length` | number | `length=2.5` | renderer default | Natural/rest length used for rendering |
| `label_k` | math | `label_k=$k$` | none | Kept as a label near the spring |

Examples

```
\spring[id=s1]{connects=(m1.bottom, m2.top)}
```

Rendering notes

- The solver uses connector endpoints to compute a rendered polyline with spring segments.
