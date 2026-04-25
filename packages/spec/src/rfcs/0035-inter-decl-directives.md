# RFC 0035 — Top-level directives between declarations (enum/type docblocks)

- Status: **Accepted**
- Shipped in: spec **1.4.0**
- Class: **A — additive**
- Related: RFC 0029 (lint catalog), RFC 0031 (markdown integration)

## Motivation

Through spec 1.3 the grammar treated `@@directive` as a strictly **prelude**
construct: `@@mode(...)`, `@@theme(...)` etc. were accepted before the first
declaration, and once a `model` / `enum` / `type` had been parsed no further
top-level `@@directive` was allowed. The error surface was opaque
(`Expecting EOF, found '@@'`).

Reviewers writing reverse-engineered `.umlay` files routinely wanted to
attach a docblock to a specific enum or value-object type:

```umlay
namespace messaging

@@doc("TS source: lowercase of enum value")
enum InferenceProgressPhase { LOADING, COMPILING, SAMPLING }

@@doc("TS source: lowercase of enum value")            // ← parse error pre-1.4
enum InferenceCommandKind { INIT, LOAD, GENERATE }
```

The first `@@doc(...)` was accepted (it sat in the post-namespace prelude),
but every subsequent one threw the parser into "expected EOF" mode. There
was also no IR slot to **carry** an enum-level doc — `EnumSchema` had only
`{_id, name, values}`.

The same pattern applies to `type X @value_object { ... }`: reviewers want
intent comments per type, not just per model.

## Decision

1. **Grammar** — allow `@@directive` arbitrarily interleaved with
   declarations after the namespace, by replacing the strict
   `topLevelDirective* topLevelDecl*` tail with a free sequence:

   ```bnf
   document     := topLevelDirective* namespaceDecl? topLevelChunk*
   topLevelChunk := topLevelDirective | topLevelDecl
   ```

2. **IR** — add `docs: string[]` (default `[]`) to `EnumSchema` and
   `TypeDefSchema`, mirroring what `Model` already had.

3. **Visitor** — accumulate `@@doc(...)` and `@@md(...)` directives into a
   `pendingDocs[]` register. On the next declaration:
   - `enum` / `type` / `model`: copy `pendingDocs` into the decl's `docs[]`
     and clear the register
   - other decls (view, protocol, union, impl, trait, import, reserved
     block, cloud-primitive): the directives are dropped (they have no
     designated attachment slot — see "Future work")

4. **File-level directives** (`@@mode(...)`, `@@theme(...)`) are recognised
   regardless of position. They are consumed by the document and never
   accumulate as attached docs.

5. **Trailing directives** at end of file (no following decl) are dropped
   silently. A future lint rule may flag them.

## Backward compatibility

- All spec 1.3 inputs continue to parse with identical IR shape — the
  grammar change is purely additive (new productions, no removal).
- The added `docs: []` defaults preserve serialised JSON shape for IR
  consumers that didn't ship the field; the JSON Schema migration is
  additive.

## Examples

### Per-enum docblock (the primary motivation)

```umlay
namespace billing

@@doc("Order lifecycle as observed by the warehouse system.")
enum OrderStatus {
  DRAFT,
  CONFIRMED,
  SHIPPED,
  CANCELLED
}

@@md("""
Internal: the *settlement* states are not user-visible.
Used by the finance pipeline only.
""")
enum SettlementStatus {
  PENDING,
  RECONCILED,
  WRITTEN_OFF
}
```

IR (excerpt):

```jsonc
"enums": {
  "OrderStatus": {
    "_id": "...",
    "name": "OrderStatus",
    "values": ["DRAFT", "CONFIRMED", "SHIPPED", "CANCELLED"],
    "docs": ["Order lifecycle as observed by the warehouse system."]
  },
  "SettlementStatus": {
    "_id": "...",
    "name": "SettlementStatus",
    "values": ["PENDING", "RECONCILED", "WRITTEN_OFF"],
    "docs": ["Internal: the *settlement* states are not user-visible.\nUsed by the finance pipeline only."]
  }
}
```

### Multiple `@@doc` entries are preserved in source order

```umlay
@@doc("first line")
@@doc("second line")
enum E { A }
```

→ `enums.E.docs = ["first line", "second line"]`.

### Per-type docblock (value-object intent)

```umlay
@@doc("Money is rounded half-even at currency.scale.")
type Money @value_object {
  amount   decimal!
  currency string!
}
```

### `@@mode` / `@@theme` are file-level regardless of position

```umlay
namespace app

enum First { A }

@@mode(strict)        // file-level — promotes lint severity
@@doc("documents Second")
enum Second { B }
```

`ir.mode = 'strict'`, `enums.Second.docs = ["documents Second"]`.

## Lint considerations

Spec 1.4 does not add new lint rules for this feature. A future revision
may add:

- **L046** (proposed) — *trailing directive without target* (any
  `@@doc` / `@@md` not followed by a declaration before EOF). Severity:
  draft warning, strict error.
- **L047** (proposed) — *duplicate `@@doc` on the same enum*. Severity:
  draft info.

These remain out of scope for 1.4 to keep the bump strictly additive.

## Renderer / VS Code

`@umlay/renderer-er` consumes `enum.docs[]` / `type.docs[]` on hover where
applicable. Existing renderers that ignore the field continue to work
unchanged.

## Future work

- Allow `@@doc` to attach to `view` / `protocol` / `union` / `impl` /
  `trait`. The grammar already permits the placement; only the visitor
  attachment is missing. Tracked separately because each of those decls
  needs an IR `docs[]` field added in the same release cycle.

## Test coverage

- `packages/core/src/rfc-0035.test.ts` — 6 cases covering single-enum,
  multi-line, type/model attachment, no-leak between enums, round-trip,
  file-level vs attached directives.
- All 14 sd.keydrop.net design files (which previously failed) now parse
  cleanly with `docs[]` populated on every annotated enum.

## Conformance

This RFC is required for L3 conformance at spec 1.4.0. Implementations
must:

1. Accept `@@directive` interleaved with declarations.
2. Populate `enum.docs[]` and `type.docs[]` from leading `@@doc` / `@@md`.
3. Round-trip via `irToDsl` (or equivalent formatter): an emitted doc must
   re-parse back into the same `docs[]` content.
