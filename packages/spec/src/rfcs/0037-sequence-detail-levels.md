# RFC 0037 — Sequence diagram detail levels (`@@detail` + `level:`)

- Status: **Accepted**
- Shipped in: spec **1.5.0**
- Class: **A — additive**
- Related: RFC 0007 (sequence body), RFC 0032 (view selectors)

## Motivation

When a single business flow is documented in one `.umlay` file, reviewers
often want **two granularities** of the same sequence:

- **Skeleton** — `Browser → OrderService → OrderDao → OrderEntity`
  (one arrow per hop, no internal calls)
- **Detail** — same skeleton **plus** internal calls inside `OrderService`
  (validation, tax calculation), inside `OrderDao` (id generation, SQL
  building), error branches, etc.

Spec ≤ 1.4 offers no way to mark "this part is detail" — reviewers either
write two separate sequence views (keeping the detail view's skeleton in
sync with the skeleton view manually) or settle for one fixed granularity.

## Decision

Two additive constructs:

1. **`@@detail("<level>") { ... }`** inside a `seq` body wraps inner
   statements in a *detail group* tagged with an arbitrary string
   level (typically `"low"` / `"high"` / `"errors"` / domain names).
2. **`level: <name>`** as a view property selects which detail groups
   to expand in projection.

### Filter semantics

When a view's `level:` is set:

- Statements **outside any detail group** are always shown.
- Statements **inside a detail group whose level == view's level**
  are expanded inline.
- Statements **inside a detail group with a different level** are
  dropped.

When a view's `level:` is **unset** (legacy default), every detail
group is expanded inline — i.e. the legacy behaviour of "show
everything".

### Example

```umlay
view checkout-skeleton @sequence_diagram {
  level: high
  participants: shop.OrderService as S, shop.OrderDao as D, shop.OrderEntity as E
  seq {
    S ->> D: "save"
    @@detail("low") {
      S ->> S: "validate"
      S ->> S: "calcTax"
    }
    D ->> E: "insert"
    @@detail("low") {
      D ->> D: "buildSql"
    }
  }
}

view checkout-detail @sequence_diagram {
  level: low
  participants: ...; seq { ...same body... }
}
```

`checkout-skeleton` (level: high) renders 2 messages: `save`, `insert`.
`checkout-detail` (level: low) renders 5: `save`, `validate`, `calcTax`,
`insert`, `buildSql`. The body itself is **written once**.

### Authoring guidelines

- Use `"high"` and `"low"` as the canonical pair when there is no
  domain-specific naming.
- Tag any deeply nested call chain (≥ 3 messages on the same
  participant) with `@@detail("low")` so high-level views stay
  readable.
- A detail group can nest other detail groups; matching is
  per-group, not transitive.

## Grammar

```bnf
SeqStatement   ::= ... | DetailGroupStmt
DetailGroupStmt ::= "@@detail" "(" String ")" "{" SeqStatement* "}"
```

`level:` is a view property whose value is treated as an identifier:

```bnf
ViewProperty ::= "level" ":" Identifier
```

(`level: "low"` is also accepted for symmetry with quoted detail tags;
the visitor strips quotes.)

## IR change

```jsonc
// SeqStatement union gains:
{ "kind": "detailGroup", "level": "low", "body": [ ... ] }

// ViewSchema gains:
{ "detailLevel": "high" }   // view's filter setting
```

Both fields are additive — older IR JSON without them remains valid.

## Projection

The reference implementation exposes a pure function:

```ts
applyDetailLevel(statements, level: string | undefined): SeqStatement[]
```

`projectIrForView` calls it on every view's `sequenceBody.statements`,
even when `level:` is unset (in which case it is a flat-expand pass that
removes the wrappers). Renderers therefore never see a `detailGroup`
statement and need no changes.

## Backward compatibility

- All spec ≤ 1.4 inputs continue to parse and render unchanged.
- IR consumers that didn't expect the new `detailGroup` variant continue
  to work because the reference projector flattens groups before
  renderers run.
- View JSON without `detailLevel` keeps the legacy "show everything"
  behaviour.

## Test coverage

- `packages/core/src/rfc-0037.test.ts` — 6 cases:
  - parse builds correct `detailGroup` wrapper
  - view without `level:` expands everything (legacy)
  - `level: high` drops `low` groups
  - `level: low` expands matching groups
  - direct `applyDetailLevel` call (unit, no view)
  - round-trip via `irToDsl` preserves `@@detail` and the IR shape

## Future work

- L046 (proposed) — *unbalanced detail levels* (group with level X used
  but no view selects X). Severity: draft info.
- A renderer toggle (CLI `--level high|low`, VS Code slider) so
  switching granularity does not require multiple view declarations.
- Multi-level threshold semantics (`level: ">=info"` style) — out of
  scope for 1.5 to keep `level:` a simple equality match.

## Conformance

L3 implementations MUST:

1. Parse `@@detail("<level>") { ... }` blocks anywhere a `SeqStatement`
   is allowed.
2. Build IR with the `detailGroup` variant carrying `level` and `body`.
3. Honor `view.detailLevel` via `applyDetailLevel` (or equivalent) so
   that the rendered statement stream matches the semantics in §2.
4. Round-trip via `irToDsl` (or equivalent formatter): an emitted
   `@@detail("X") { ... }` must re-parse into the same `detailGroup`
   shape.
