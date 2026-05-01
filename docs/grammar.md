# MechTeX Grammar & Syntax

This page documents the surface syntax of MechTeX: tokens, value types, component statements, and routing expressions.

## File structure

MechTeX documents are enclosed in a `system` block:

```
\begin{system}[scale=1.0]
  \componentName[properties]{constraints}
  ...
\end{system}
```

A component statement looks like `\name[...]{...}`. Both `[...]` (properties) and `{...}` (constraints) are optional.

## Lexer tokens (high level)

- `word` — identifiers and component names: `[a-zA-Z_][a-zA-Z0-9_]*` (e.g., `m1`, `inc1`, `pulley_A`).
- `number` — integers or floating-point numbers, optionally in scientific notation (e.g., `3`, `-1.5`, `2.0e-3`).
- `color` — hexadecimal colors: `#RGB`, `#RRGGBB`, or with alpha `#RRGGBBAA` (e.g., `#10b981`).
- `math` — inline KaTeX math wrapped with single dollar signs: `$m_1$`, `$\theta$`.
- punctuation: `=`, `,`, `[`, `]`, `{`, `}`, `(`, `)`, `->`, `.`
- `comment` — line comments start with `%` and continue to EOL.

## Value types

- number — numeric values parsed with `parseFloat`.
- word — plain unquoted identifiers (component ids, method names).
- color — `#`-prefixed hex color string.
- math — `$...$` KaTeX string preserved for renderer to typeset.
- anchor expression — `id.anchor` (e.g., `inc1.surface`, `m1.center`).
- path expression — parenthesized routing: `(m1.right -> over(p1) -> m2.top)`
  - routing methods supported in parentheses include `over`, `under`, `vover`, `left`, `right`, and method-style `method(pulleyId)` forms
- tuple expression — 2-element anchor tuple: `(anchorA, anchorB)` used by connectors such as rods and springs.
- list expression — square-bracket lists: `[...]` with items that are numbers, words, or math tokens.
- object expression — curly-brace maps: `{key=value, ...}` used for nested constraint objects.

## Anchor expressions

Anchors reference a named component and one of its anchor points:

```
<component-id>.<anchor-name>
```

Example anchors: `m1.center`, `gnd.surface`, `p1.center`, `inc1.top`

Anchor names are component-specific — see the component reference for anchors available on each type.

## Path / routing expressions

A `path` chains anchors and routing methods using `->` to show how a connector (string, rod, etc.) travels between anchors. Example:

```
( m1.right -> over(p1) -> m2.top )
```

This says: start at `m1.right`, route over pulley `p1` (tangent routing), then end at `m2.top`.

## Comments and whitespace

Line comments start with `%` and run to the end of the line. Whitespace and newlines are not significant.

## Examples

Property assignment and nested object example:

```
\incline[id=inc1, angle=30, length=12, x=-3]{on={anchor=gnd.surface, mu=0.35}}
```

Vector example using math labels:

```
\vector[id=mg, color=#ef4444, label=$m_1 g$, length=2.5, angle=-90]{connects=m1.center}
```

See the components reference for exact parsing details per component.
