# Example: Pulley, Incline, Blocks

This example is derived from the project's default sample and demonstrates an incline, a pulley, two blocks (one on the incline, one hanging), and a routed string.

Paste into the editor:

```
\begin{system}[scale=1.0]
    \ceiling[id=top, width=20]{y=8}
    \floor[id=gnd, width=20]{y=-8}

    % Fixed incline position in properties
    \incline[id=inc1, angle=30, length=12, x=-3]{on={anchor=gnd.surface, mu=0.35}}

    % Pulley supported from the incline crest with a rod
    \pulley[id=p1, radius=0.8]{from=inc1.top, distance=0.7, direction=0, relative_to=inc1.surface}
    \rod[id=p1_support]{connects=(inc1.top, p1.center)}

    % Block sitting ON the slope
    \block[id=m1, width=2, height=2, label_mass=$m_1$]{on=inc1.surface, position=6}

    % Hanging block on the outside
    \block[id=m2, width=1.8, height=1.8, label_mass=$m_2$]{hang=p1.right, y=-6}

    % String routing
    \string[id=str1]{connects=(m1.right -> over(p1) -> m2.top)}

    % Forces (Gravity is absolute down, Normal is perpendicular 90+30=120)
    \vector[id=mg, color=#ef4444, label=$m_1g$, length=2.5, angle=-90]{connects=m1.center}
    \vector[id=normal, color=#10b981, label=$N$, length=2.5, angle=120]{connects=m1.top}

    \label[id=q1, label=$\text{Find acceleration and tension}$]{at=top.surface, dy=-1}
  \end{system}
```

What this demonstrates

- incline positioning using `on={anchor=..., mu=...}`
- pulley placement relative to an incline
- string routing over a pulley
- blocks with `on=` and `hang=` constraints
- vector (force) rendering with KaTeX labels
