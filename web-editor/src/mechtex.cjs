// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const moo = require("moo");

const lexer = moo.compile({
  ws:      /[ \t]+/,
  nl:      { match: /\n/, lineBreaks: true },
  comment: /%.*$/,
  backslash: /\\/,
  begin:   /begin/,
  end:     /end/,
  system:  /system/,
  word:    /[a-zA-Z_][a-zA-Z0-9_]*/,
  number:  /-?(?:[0-9]|[1-9][0-9]+)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?\b/,
  lbracket: /\[/,
  rbracket: /\]/,
  lbrace:  /\{/,
  rbrace:  /\}/,
  lparen:  /\(/,
  rparen:  /\)/,
  comma:   /,/,
  eq:      /=/,
  dot:     /\./,
  arrow:   /->/,
  dollar:  /\$/,
  math:    /\$[^\$]*\$/,
});
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "main", "symbols": ["_", "system_block", "_"], "postprocess": d => d[1]},
    {"name": "system_block$ebnf$1", "symbols": ["properties"], "postprocess": id},
    {"name": "system_block$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "system_block", "symbols": [{"literal":"\\"}, {"literal":"begin"}, {"literal":"{"}, {"literal":"system"}, {"literal":"}"}, "system_block$ebnf$1", "_", "statements", "_", {"literal":"\\"}, {"literal":"end"}, {"literal":"{"}, {"literal":"system"}, {"literal":"}"}], "postprocess": d => ({ type: 'system', properties: d[5] || {}, statements: d[7] })},
    {"name": "statements$ebnf$1", "symbols": []},
    {"name": "statements$ebnf$1$subexpression$1", "symbols": ["_", "statement"]},
    {"name": "statements$ebnf$1", "symbols": ["statements$ebnf$1", "statements$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "statements", "symbols": ["statement", "statements$ebnf$1"], "postprocess": 
        d => [d[0]].concat(d[1].map(x => x[1]))
        },
    {"name": "statements", "symbols": [], "postprocess": d => []},
    {"name": "statement$ebnf$1", "symbols": ["properties"], "postprocess": id},
    {"name": "statement$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "statement$ebnf$2", "symbols": ["constraints"], "postprocess": id},
    {"name": "statement$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "statement", "symbols": [{"literal":"\\"}, (lexer.has("word") ? {type: "word"} : word), "statement$ebnf$1", "statement$ebnf$2"], "postprocess":  d => ({
            type: 'component',
            name: d[1].value,
            properties: d[2] || {},
            constraints: d[3] || {}
        }) },
    {"name": "properties", "symbols": [{"literal":"["}, "_", "kv_pairs", "_", {"literal":"]"}], "postprocess": d => d[2]},
    {"name": "constraints", "symbols": [{"literal":"{"}, "_", "kv_pairs", "_", {"literal":"}"}], "postprocess": d => d[2]},
    {"name": "kv_pairs$ebnf$1", "symbols": []},
    {"name": "kv_pairs$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "kv_pair"]},
    {"name": "kv_pairs$ebnf$1", "symbols": ["kv_pairs$ebnf$1", "kv_pairs$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "kv_pairs", "symbols": ["kv_pair", "kv_pairs$ebnf$1"], "postprocess": 
        d => {
            let obj = {};
            obj[d[0].key] = d[0].value;
            d[1].forEach(x => { obj[x[3].key] = x[3].value; });
            return obj;
        }
        },
    {"name": "kv_pairs", "symbols": [], "postprocess": d => ({})},
    {"name": "kv_pair", "symbols": [(lexer.has("word") ? {type: "word"} : word), "_", {"literal":"="}, "_", "value"], "postprocess": d => ({ key: d[0].value, value: d[4] })},
    {"name": "value", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": d => parseFloat(d[0].value)},
    {"name": "value", "symbols": [(lexer.has("word") ? {type: "word"} : word)], "postprocess": d => d[0].value},
    {"name": "value", "symbols": [(lexer.has("math") ? {type: "math"} : math)], "postprocess": d => d[0].value},
    {"name": "value", "symbols": ["path_expr"], "postprocess": d => d[0]},
    {"name": "value", "symbols": ["anchor_expr"], "postprocess": d => d[0]},
    {"name": "value", "symbols": ["tuple_expr"], "postprocess": d => d[0]},
    {"name": "anchor_expr", "symbols": [(lexer.has("word") ? {type: "word"} : word), {"literal":"."}, (lexer.has("word") ? {type: "word"} : word)], "postprocess": d => ({ type: 'anchor', id: d[0].value, anchor: d[2].value })},
    {"name": "path_expr", "symbols": [{"literal":"("}, "_", "path_nodes", "_", {"literal":")"}], "postprocess": d => d[2]},
    {"name": "path_nodes$ebnf$1", "symbols": []},
    {"name": "path_nodes$ebnf$1$subexpression$1", "symbols": ["_", {"literal":"->"}, "_", "path_node"]},
    {"name": "path_nodes$ebnf$1", "symbols": ["path_nodes$ebnf$1", "path_nodes$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "path_nodes", "symbols": ["path_node", "path_nodes$ebnf$1"], "postprocess": 
        d => [d[0]].concat(d[1].map(x => x[3]))
        },
    {"name": "path_node", "symbols": ["anchor_expr"], "postprocess": d => d[0]},
    {"name": "path_node", "symbols": [(lexer.has("word") ? {type: "word"} : word), {"literal":"("}, (lexer.has("word") ? {type: "word"} : word), {"literal":")"}], "postprocess": d => ({ type: 'routing', method: d[0].value, id: d[2].value })},
    {"name": "tuple_expr", "symbols": [{"literal":"("}, "_", "anchor_expr", "_", {"literal":","}, "_", "anchor_expr", "_", {"literal":")"}], "postprocess": d => [d[2], d[6]]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1$subexpression$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "_$ebnf$1$subexpression$1", "symbols": [(lexer.has("nl") ? {type: "nl"} : nl)]},
    {"name": "_$ebnf$1$subexpression$1", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)]},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "_$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": d => null}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
