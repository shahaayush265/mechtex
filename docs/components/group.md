# `\group` — Logical grouping

## Overview

`\group` is an invisible container that can be used to shift a set of components together. It does not render itself but affects child component resolution when referenced.

Syntax

```
\group[id=ID, x=NUMBER, y=NUMBER]{...}
```

Properties

- `id`, `x`, `y` — group id and offset.

Use

- Useful for composing subsystems and placing them as a unit.
