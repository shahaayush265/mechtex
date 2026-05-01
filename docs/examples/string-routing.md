# Example: String routing through a pulley

This example demonstrates how to describe a routed string that passes over a pulley between two masses.

Paste into the editor:

```
\begin{system}[scale=1.0]
  \floor[id=gnd, width=20]{y=-8}

  \block[id=a, width=1.6, height=1.6]{on=gnd.surface, x=-4}
  \block[id=b, width=1.6, height=1.6]{hang=p1.right, y=-6}

  \pulley[id=p1, radius=0.6]{from=gnd.surface, distance=1.5}

  \string[id=s]{connects=(a.right -> over(p1) -> b.top)}
\end{system}
```

Notes

- `over(p1)` tells the solver to compute tangent points on pulley `p1` so the string wraps correctly.
- Replace `over` with `under` or `vover` for alternative routing behaviors.
