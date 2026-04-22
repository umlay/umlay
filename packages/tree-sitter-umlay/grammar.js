/**
 * tree-sitter-umlay — Umlay DSL grammar for tree-sitter.
 *
 * Scope of this skeleton:
 *   - declarations: namespace, import, enum, model, view, protocol, union,
 *     impl, type
 *   - model body: visibility-prefixed attributes, relation arrows, block
 *     directives (`@@doc` / `@@md` / `@@id` / `@@unique` / `@@index` /
 *     `@@dependencies` / `@@implements` / `@@codegen` / `@@sample` /
 *     `@@mode`), inline annotations (`@intent`, `@ref`, …)
 *   - view body: `include:` / `exclude:` / `layout:` / `criticalPath:` /
 *     `participants:` / `seq { ... }` / arbitrary block directives
 *   - Markdown trailer (`---` separator → everything after)
 *   - comments (line `//`, block `/* * /`)
 *   - primitives: identifiers, strings (single + triple), numbers,
 *     glob pattern segments
 *
 * Intentionally *not* covered (syntax highlighting doesn't need it):
 *   - well-foundedness / MRO / variance checks
 *   - lint / scope resolution
 *   - `@@sample(from: ...)` external-file expansion
 *
 * Used for:
 *   - GitHub syntax highlighting on `.umlay` + `.umlay.md` files
 *   - neovim / Zed / any tree-sitter-aware editor
 *   - code-folding, indentation, textobjects
 *
 * Reference implementation of parse semantics is `@umlay/core` (Chevrotain).
 * This grammar intentionally accepts a slightly larger surface (forgiving
 * recovery) so highlighting still works in the middle of incomplete edits.
 */

/// <reference types="tree-sitter-cli/dsl" />

module.exports = grammar({
  name: 'umlay',

  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  word: ($) => $.identifier,

  rules: {
    source_file: ($) => seq(repeat($._top_level), optional($.doc_trailer)),

    _top_level: ($) =>
      choice(
        $.namespace_decl,
        $.import_decl,
        $.enum_decl,
        $.model_decl,
        $.type_alias,
        $.view_decl,
        $.protocol_decl,
        $.union_decl,
        $.impl_decl,
        $.file_directive,
      ),

    // ---------- Comments ---------------------------------------------------

    line_comment: (_) => token(seq('//', /[^\n]*/)),
    block_comment: (_) => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')),

    // ---------- Declarations ----------------------------------------------

    namespace_decl: ($) => seq('namespace', $.identifier),

    import_decl: ($) =>
      seq('import', choice($.string_literal, $.identifier), optional(seq('as', $.identifier))),

    enum_decl: ($) =>
      seq(
        'enum',
        field('name', $.identifier),
        '{',
        optional(seq($.identifier, repeat(seq(',', $.identifier)), optional(','))),
        '}',
      ),

    type_alias: ($) => seq('type', field('name', $.identifier), '=', $.type_ref),

    model_decl: ($) =>
      seq(
        'model',
        field('name', $.identifier),
        repeat($.annotation),
        '{',
        repeat($._model_body),
        '}',
      ),

    _model_body: ($) => choice($.attribute, $.relation, $.block_directive),

    view_decl: ($) =>
      seq('view', field('id', $._view_id), repeat($.annotation), '{', repeat($._view_body), '}'),

    _view_id: ($) => seq($.identifier, repeat(seq('-', $.identifier))),

    _view_body: ($) => choice($.view_property, $.participants_decl, $.seq_block, $.block_directive),

    protocol_decl: ($) =>
      seq(
        'protocol',
        field('name', $.identifier),
        optional($.type_params),
        optional(seq('extends', $.type_ref, repeat(seq(',', $.type_ref)))),
        '{',
        repeat($.fn_signature),
        '}',
      ),

    union_decl: ($) =>
      seq(
        'union',
        field('name', $.identifier),
        optional($.type_params),
        '=',
        optional('|'),
        $.union_variant,
        repeat(seq('|', $.union_variant)),
      ),

    union_variant: ($) =>
      seq(
        field('name', $.identifier),
        optional(
          choice(
            seq('{', optional($._union_fields), '}'),
            seq('(', optional($._union_fields), ')'),
          ),
        ),
      ),

    _union_fields: ($) => seq($.union_field, repeat(seq(',', $.union_field)), optional(',')),

    union_field: ($) => seq(field('name', $.identifier), ':', $.type_ref, optional($.nullability)),

    impl_decl: ($) =>
      seq(
        'impl',
        optional($.type_params),
        field('trait', $.identifier),
        'for',
        field('target', $._qualified_ident),
        '{',
        repeat($.fn_signature),
        '}',
      ),

    fn_signature: ($) =>
      seq(
        'fn',
        field('name', $.identifier),
        optional($.type_params),
        '(',
        optional($._fn_params),
        ')',
        optional(seq('->', $.type_ref)),
        optional(seq('{', repeat(choice(/[^{}]+/, seq('{', repeat(/[^{}]+/), '}'))), '}')),
      ),

    _fn_params: ($) => seq($.fn_param, repeat(seq(',', $.fn_param)), optional(',')),
    fn_param: ($) => seq(field('name', $.identifier), ':', $.type_ref),

    type_params: ($) => seq('<', $.type_param, repeat(seq(',', $.type_param)), '>'),
    type_param: ($) =>
      seq(
        optional(choice('in', 'out')),
        field('name', $.identifier),
        optional(seq(':', $.type_ref, repeat(seq('&', $.type_ref)))),
      ),

    // ---------- Model attribute / relation --------------------------------

    attribute: ($) =>
      seq(
        optional($.visibility),
        field('name', $.identifier),
        $.type_ref,
        optional($.nullability),
        repeat($.annotation),
      ),

    relation: ($) =>
      seq(
        '->',
        field('kind', $.identifier),
        optional($.multiplicity),
        optional(seq($.identifier, ':')),
        $._qualified_ident,
        repeat($.annotation),
      ),

    visibility: (_) => token(choice('+', '-', '#', '~')),

    multiplicity: (_) => token(choice('1', '0..1', '1..*', '0..*', /[0-9]+\.\.[0-9*]+/, /[0-9]+/)),

    nullability: (_) => token(choice('?', '!', '??')),

    // ---------- View body properties --------------------------------------

    view_property: ($) => seq(field('key', $.identifier), ':', $.view_property_value),
    view_property_value: ($) =>
      choice($.pattern_list, $.layout_options, $.identifier, $.string_literal, $.number_literal),

    pattern_list: ($) => seq($.pattern, repeat(seq(',', $.pattern))),
    pattern: (_) => token(/[A-Za-z_][A-Za-z0-9_.]*(\*)?/),

    layout_options: ($) =>
      seq('{', optional(seq($.layout_opt, repeat(seq(',', $.layout_opt)), optional(','))), '}'),
    layout_opt: ($) =>
      seq(
        field('key', $.identifier),
        ':',
        choice($.string_literal, $.number_literal, $.identifier),
      ),

    participants_decl: ($) =>
      seq('participants', ':', $.participant, repeat(seq(',', $.participant))),
    participant: ($) =>
      seq(field('ref', $.identifier), optional(seq('as', field('alias', $.identifier)))),

    seq_block: ($) => seq('seq', '{', repeat($._seq_stmt), '}'),
    _seq_stmt: ($) =>
      choice(
        $.seq_message,
        $.seq_alt,
        $.seq_opt,
        $.seq_par,
        $.seq_critical,
        $.seq_loop,
        $.seq_await,
      ),
    seq_message: ($) =>
      seq(
        field('from', $.identifier),
        choice('->', '->>', '-.>'),
        field('to', $.identifier),
        ':',
        field('label', $.string_literal),
      ),
    seq_alt: ($) =>
      seq(
        'alt',
        $.string_literal,
        '{',
        repeat($._seq_stmt),
        '}',
        repeat(
          seq(choice('alt', 'else'), optional($.string_literal), '{', repeat($._seq_stmt), '}'),
        ),
      ),
    seq_opt: ($) => seq('opt', optional($.string_literal), '{', repeat($._seq_stmt), '}'),
    seq_par: ($) => seq('par', optional($.string_literal), '{', repeat($._seq_stmt), '}'),
    seq_loop: ($) => seq('loop', optional($.string_literal), '{', repeat($._seq_stmt), '}'),
    seq_critical: ($) =>
      seq(
        'critical',
        optional($.string_literal),
        optional(seq('timeout', '(', /[^)]+/, ')')),
        optional(seq('retry', '(', /[^)]+/, ')')),
        '{',
        repeat($._seq_stmt),
        '}',
        optional(seq('catch', optional($.string_literal), '{', repeat($._seq_stmt), '}')),
        optional(seq('finally', '{', repeat($._seq_stmt), '}')),
      ),
    seq_await: (_) => seq('await', '(', optional(/[^)]*/), ')'),

    // ---------- Directives / Annotations ----------------------------------

    /** Inline `@intent(...)`, `@unique`, `@ref(X.id)`, `@entity`, `@er_diagram`… */
    annotation: ($) =>
      seq('@', field('name', $.identifier), optional(seq('(', optional($._annotation_args), ')'))),
    _annotation_args: ($) =>
      repeat1(choice($.string_literal, $.number_literal, $.identifier, ',', ':', '.', '*')),

    /** Block-level `@@doc(...)`, `@@md("""...""")`, `@@codegen(...)` — content
     *  is opaque for highlighting purposes. */
    block_directive: ($) =>
      seq(
        '@@',
        field('name', $.identifier),
        optional(
          seq(
            '(',
            optional(
              repeat(
                choice($.string_literal, $.number_literal, $.identifier, /[,:.{}*<>=\[\]+\-\/]/),
              ),
            ),
            ')',
          ),
        ),
      ),

    /** `@@mode(strict)` as a file-level directive. */
    file_directive: ($) => $.block_directive,

    // ---------- Type references -------------------------------------------

    type_ref: ($) =>
      seq($._qualified_ident, optional(seq('<', $.type_ref, repeat(seq(',', $.type_ref)), '>'))),

    _qualified_ident: ($) => seq($.identifier, repeat(seq('.', $.identifier))),

    // ---------- Markdown trailer ------------------------------------------

    /**
     * Everything after a line containing exactly `---`. tree-sitter has no
     * good way to emit "rest of file", so we approximate with a greedy
     * token that captures lines.
     */
    doc_trailer: (_) => token(prec(-1, seq(/\n---\s*\n/, /[\s\S]*/))),

    // ---------- Primitives ------------------------------------------------

    identifier: (_) =>
      token(/[A-Za-z_\u3040-\u30ff\u4e00-\u9fff][A-Za-z0-9_\u3040-\u30ff\u4e00-\u9fff]*/),

    string_literal: ($) => choice($._triple_string, $._double_string),
    _double_string: (_) => token(seq('"', /[^"\\\n]*/, '"')),
    _triple_string: (_) => token(seq('"""', /([^"]|"[^"]|""[^"])*/, '"""')),

    number_literal: (_) => token(/-?[0-9]+(\.[0-9]+)?/),
  },
});
