import nearley from "nearley";
// @ts-ignore
import grammar from "./mechtex.ts";


export interface ASTNode {
  type: string;
  [key: string]: any;
}

export function parseMechTeX(code: string): ASTNode | null {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  try {
    parser.feed(code);
    if (parser.results.length === 0) {
      throw new Error("Unexpected end of input.");
    }
    if (parser.results.length > 1) {
      console.warn("Ambiguous grammar! Multiple parses found. Using first.");
    }
    return parser.results[0];
  } catch (err: any) {
    console.error("Parse Error:", err.message);
    throw err;
  }
}
