@{%
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
  color:   /#[0-9a-fA-F]{3,8}/,
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
  math:    /\$[^\$]*\$/,
  dollar:  /\$/,
});
%}

@lexer lexer

main -> _ system_block _ {% d => d[1] %}

system_block ->
    "\\" "begin" "{" "system" "}" properties:? _ statements _ "\\" "end" "{" "system" "}"
    {% d => ({ type: 'system', properties: d[5] || {}, statements: d[7] }) %}

statements -> statement (_ statement):* {%
    d => [d[0]].concat(d[1].map(x => x[1]))
%} | null {% d => [] %}

statement ->
    "\\" %word properties:? constraints:?
    {% d => ({
        type: 'component',
        name: d[1].value,
        properties: d[2] || {},
        constraints: d[3] || {}
    }) %}

properties -> "[" _ kv_pairs _ "]" {% d => d[2] %}

constraints -> "{" _ kv_pairs _ "}" {% d => d[2] %}

kv_pairs -> kv_pair (_ "," _ kv_pair):* {%
    d => {
        let obj = {};
        obj[d[0].key] = d[0].value;
        d[1].forEach(x => { obj[x[3].key] = x[3].value; });
        return obj;
    }
%} | null {% d => ({}) %}

kv_pair -> %word _ "=" _ value {% d => ({ key: d[0].value, value: d[4] }) %}

value ->
      %number {% d => parseFloat(d[0].value) %}
    | %word {% d => d[0].value %}
    | %color {% d => d[0].value %}
    | %math {% d => d[0].value %}
    | path_expr {% d => d[0] %}
    | anchor_expr {% d => d[0] %}
    | tuple_expr {% d => d[0] %}
    | list_expr {% d => d[0] %}
    | object_expr {% d => d[0] %}

anchor_expr -> %word "." %word {% d => ({ type: 'anchor', id: d[0].value, anchor: d[2].value }) %}

path_expr -> "(" _ path_nodes _ ")" {% d => d[2] %}
path_nodes -> path_node (_ "->" _ path_node):* {%
    d => [d[0]].concat(d[1].map(x => x[3]))
%}
path_node ->
      anchor_expr {% d => d[0] %}
    | %word "(" %word ")" {% d => ({ type: 'routing', method: d[0].value, id: d[2].value }) %}

tuple_expr -> "(" _ anchor_expr _ "," _ anchor_expr _ ")" {% d => [d[2], d[6]] %}

list_expr -> "[" _ list_items _ "]" {% d => d[2] %}
list_items -> list_item (_ "," _ list_item):* {%
    d => [d[0]].concat(d[1].map(x => x[3]))
%}
list_item ->
      %word {% d => d[0].value %}
    | %number {% d => parseFloat(d[0].value) %}
    | %math {% d => d[0].value %}

object_expr -> "{" _ kv_pairs _ "}" {% d => d[2] %}

_ -> (%ws | %nl | %comment):* {% d => null %}
