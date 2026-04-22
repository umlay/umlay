; Treat triple-quoted strings inside `@@doc` / `@@md` directives as markdown.
; The injection is opt-in: only when the directive name is `doc` or `md`.
;
; Editors pick this up via tree-sitter's language-injection feature; GitHub
; Linguist does not use injections but falls back to the string highlight.

((block_directive
   name: (identifier) @_name
   (string_literal) @injection.content)
 (#any-of? @_name "doc" "md")
 (#set! injection.language "markdown"))

; The file-level trailer is always markdown.
((doc_trailer) @injection.content
 (#set! injection.language "markdown"))
