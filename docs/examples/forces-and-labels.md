# Example: Forces and Labels

This example shows vectors used to represent forces and how to place labels.

Paste into the editor:

```
\begin{system}[scale=1.0]
  \floor[id=gnd, width=20]{y=-8}
  \block[id=m1, width=2, height=2, label_mass=$m_1$]{on=gnd.surface, x=0}

  \vector[id=weight, color=#ef4444, label=$m_1g$, length=3, angle=-90]{connects=m1.center}
  \vector[id=normal, color=#10b981, label=$N$, length=2.2, angle=90]{connects=m1.top}

  \label[id=lbl, label=$\text{Weight and Normal}$]{at=m1.top, dy=1}
\end{system}
```

Notes

- Labels use KaTeX for math (`$...$`). Use `dx` and `dy` for small offsets.
- Vector `angle` is in degrees; `0` points right, `90` points up.
