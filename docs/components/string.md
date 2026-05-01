# `\string` — Rope / string / cable

## Overview

`\string` defines a connector that links anchors via a routing expression. It supports routing through pulleys using `over(...)`, `under(...)`, and other routing hints.

Syntax

```
\string[id=ID]{connects=(anchorA -> routingMethod(pulleyId) -> anchorB -> ...)}
```

Value: `connects` uses the path expression grammar:

```
( m1.right -> over(p1) -> m2.top )
```

Routing methods

- `over(pulleyId)` — route the string so it passes over the named pulley (tangent behavior)
- `under(pulleyId)` — route under a pulley
- `vover`, `left`, `right` — additional routing hints supported by the parser

Examples

```
\string[id=str1]{connects=(m1.right -> over(p1) -> m2.top)}
```

Rendering notes

- The solver computes piecewise straight segments and tangent contacts for segments that pass over pulleys. Strings are drawn as thin stroked paths and appear above rods but below vectors and labels by default.
