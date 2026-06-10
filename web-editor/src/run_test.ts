import { parseMechTeX } from "./parser.js";
import { Solver } from "./solver.js";

const code = `\\begin{system}[scale=1.0]
  \\ceiling[id=ceil, width=20]{y=8}
  \\floor[id=gnd, width=20]{y=-8}

  % Incline on the ground
  \\incline[id=inc1, angle=30, length=12, x=2]{on={anchor=gnd.surface, mu=0.2}}

  % Main pulley suspended from ceiling
  \\pulley[id=p_main, radius=0.8]{x=0, y=5}
  \\string[id=p_main_support]{connects=(ceil.center, p_main.center)}

  % Second pulley fixed to the crest of the incline
  \\pulley[id=p_inc, radius=0.8]{from=inc1.top, distance=0.9, direction=60, relative_to=inc1.surface}
  \\rod[id=p_inc_support]{connects=(inc1.top, p_inc.center)}

  % Mass m1 hanging vertically from the main pulley
  \\block[id=m1, width=1.8, height=1.8, label_mass=$m_1$]{hang=p_main.left, y=0}

  % Mass m2 resting on the incline
  \\block[id=m2, width=2, height=2, label_mass=$m_2$]{on=inc1.surface, position=5}

  % String routing: m1 -> main pulley -> incline pulley -> m2
  \\string[id=str_main]{connects=(m1.top -> over(p_main) -> over(p_inc) -> m2.right)}
\\end{system}`;

try {
  const ast = parseMechTeX(code);
  if (!ast) throw new Error("Parsed AST is null");
  const solver = new Solver(ast);
  const resolved = solver.resolve();
  const strMain = resolved.find(c => c.id === "str_main");
  if (strMain) {
    console.log(JSON.stringify(strMain.pathSegments, null, 2));
  }
} catch(e) {
  console.error(e);
}
