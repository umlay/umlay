; tree-sitter-umlay — highlight captures.
;
; Capture names follow the tree-sitter convention shared by
; GitHub Linguist / Neovim / Helix. Editors that don't ship all of them
; fall back safely.

; Top-level keywords
[
  "namespace"
  "import"
  "model"
  "enum"
  "view"
  "type"
  "protocol"
  "union"
  "impl"
  "fn"
  "for"
  "as"
  "extends"
  "seq"
  "alt"
  "else"
  "opt"
  "par"
  "loop"
  "critical"
  "catch"
  "finally"
  "await"
  "in"
  "out"
] @keyword

; Declarations → identifier
(namespace_decl (identifier) @namespace)
(enum_decl name: (identifier) @type)
(model_decl name: (identifier) @type)
(type_alias name: (identifier) @type)
(view_decl id: (_view_id (identifier) @function))
(protocol_decl name: (identifier) @type.interface)
(union_decl name: (identifier) @type)
(union_variant name: (identifier) @constructor)
(impl_decl trait: (identifier) @type.interface)
(fn_signature name: (identifier) @function)

; Attribute + relation fields
(attribute name: (identifier) @property)
(union_field name: (identifier) @property)
(fn_param name: (identifier) @variable.parameter)
(relation kind: (identifier) @keyword.operator)

; Type parameters
(type_param name: (identifier) @type.parameter)

; Visibility / nullability / multiplicity
(visibility) @operator
(nullability) @operator
(multiplicity) @number

; View properties
(view_property key: (identifier) @property)
(layout_opt key: (identifier) @property)

; Participants (seq diagram)
(participant ref: (identifier) @variable)
(participant alias: (identifier) @variable.other.member)
(seq_message from: (identifier) @variable)
(seq_message to: (identifier) @variable)
(seq_message label: (string_literal) @string)

; Annotations
(annotation "@" @attribute)
(annotation name: (identifier) @attribute)

(block_directive "@@" @attribute)
(block_directive name: (identifier) @attribute)

; Type refs
(type_ref (_qualified_ident (identifier) @type))

; Comments
(line_comment) @comment
(block_comment) @comment

; Primitives
(string_literal) @string
(number_literal) @number
(pattern) @string.regexp

; Punctuation
[ "{" "}" "(" ")" "[" "]" "<" ">" ] @punctuation.bracket
[ "," ":" ";" "." "|" "=" "&" ] @punctuation.delimiter
[ "->" "->>" "-.>" ] @keyword.operator

; Markdown trailer (coloured as comment-ish)
(doc_trailer) @comment.documentation
