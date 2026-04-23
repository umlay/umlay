# RFC 0034 — Model traits (attribute mixins)

- Status: **Draft**
- Class: **A — additive**
- Target release: spec **1.3.0** (tentative)
- Related: RFC 0006 (protocol), RFC 0016 (impl blocks)

## Motivation

Audit columns (`createdAt`, `updatedAt`, `deletedAt`), soft-delete flags,
tenancy discriminators (`tenantId`), and version tokens (`version`) appear
on dozens of models. Copy-pasting them produces 3 failure modes:

1. **Drift** — one team adds `deletedAt` to `User` but forgets on `Order`.
2. **Bulk renames** — changing `createdAt` → `created_at` for a codegen
   target means touching every model.
3. **Reviewer noise** — PR diffs for a new model repeat the same 4 rows.

Protocols (RFC 0006) solve this for **methods** but not **attributes** —
they declare `fn` signatures, not data fields. `impl` blocks (RFC 0016)
implement protocols, they don't inject attributes either.

## Decision

Introduce **`trait`** declarations: a named bag of attributes (and
optionally relations) that a model can pull in with `@@include(Trait)`.
The trait expands at parse time into the model's own attribute list —
*before* lint runs — so downstream (codegen, renderer, lint) sees a
concrete model with no knowledge of traits.

```umlay
namespace core

// Declaration: not a model — cannot be instantiated.
trait Timestamped {
  -createdAt DateTime!
  -updatedAt DateTime!
}

trait SoftDelete {
  -deletedAt DateTime?
}

// Usage — multiple traits can be included.
model User @aggregate_root {
  @@include(Timestamped)
  @@include(SoftDelete)
  +id    UUID!   @id
  +email string! @unique
}
```

After parse-time expansion, `User` has 5 attributes:
`createdAt, updatedAt, deletedAt, id, email`.

## Grammar

```bnf
(* Top-level declaration *)
TraitDecl        ::= "trait" Identifier "{" (Attribute | Relation)* "}"

(* Inside model body, an include directive *)
ModelDirective   ::= ...existing...
                  | "@@include" "(" QualifiedIdent ")"
```

`trait` becomes a new reserved keyword (add to `RESERVED_KEYWORDS`). The
`@@include(...)` directive is already tentatively reserved for RFC 0033
(composite views); this RFC scopes it separately: inside a `trait` vs.
inside a model vs. inside a view — parser routes by context.

## IR shape

```ts
interface Namespace {
  // ...existing...
  traits: Record<string, Trait>;  // NEW
}

interface Trait {
  _id: string;
  name: string;
  attributes: Attribute[];
  relations: Relation[];
  /** Authoring origin; retained for `go-to-definition`. */
  origin?: { file: string; line: number };
}

interface Model {
  // ...existing...
  /** FQNs of traits expanded into this model at parse time. */
  includedTraits: string[];  // NEW — for diagnostics / `find references` reverse lookup
}
```

The model's `attributes` / `relations` arrays **already contain the
expanded trait members** so downstream code doesn't need to know about
traits.

## Expansion semantics

1. Traits expand **after all declarations are gathered** but **before
   lint** runs, so name-collision / unresolved-ref checks see the final
   model shape.
2. **Collision**: if a trait contributes an attribute with the same name
   as an existing model attribute, lint **L040** (error) fires — authors
   must pick one or rename.
3. **Multi-include**: a model can include N traits. Conflicts between
   traits themselves fire L041 (error).
4. **Nested traits**: a trait can `@@include` another trait. Cycles fire
   L042 (error).
5. **Cross-namespace**: `@@include(shared.Timestamped)` works through the
   existing `import` system.

## What traits CAN'T do (on purpose)

- **No methods**. Traits are attribute-level only; method mixin is the job
  of `impl` + `protocol` (RFC 0016).
- **No annotations on the include site**. `@@include(X)` does not take
  parameters — a trait either fits or doesn't. (If you need parametric
  traits, declare two separate traits.)
- **No trait hierarchy beyond inclusion**. No `trait X extends Y` — use
  `@@include(Y)` inside X's body.
- **No visibility override on include**. Trait attributes keep their own
  visibility (`-` private / `+` public / etc.).

## Lint rules

| Rule | Severity | Trigger |
| --- | --- | --- |
| L040 | error | trait-contributed attribute collides with existing model attribute |
| L041 | error | two traits contribute the same attribute name |
| L042 | error | trait inclusion cycle (`A` includes `B` includes `A`) |
| L043 | warn  | unused trait (declared but not `@@include`d anywhere) |
| L044 | info  | trait with < 2 attributes (might be over-abstraction) |

## Example

```umlay
namespace shared

trait Timestamped {
  -createdAt DateTime!
  -updatedAt DateTime!
}

trait Tenanted {
  -tenantId UUID!
}

trait Audited {
  @@include(Timestamped)       // nested include
  -createdBy UUID!
  -updatedBy UUID!
}

namespace shop
import shared

model Order @aggregate_root {
  @@include(shared.Tenanted)
  @@include(shared.Audited)    // brings Timestamped transitively
  +id    UUID!    @id
  +total decimal!
}
```

After expansion, `Order` has 8 attributes:
`tenantId, createdAt, updatedAt, createdBy, updatedBy, id, total`.

## `irToDsl` round-trip

Traits must round-trip so `pnpm format` doesn't destroy them. The
formatter:

1. Emits `trait X { ... }` declarations based on `namespace.traits`.
2. For each model, emits `@@include(TraitName)` *before* the model's own
   attributes, using `model.includedTraits`.
3. **Does not** emit the expanded attribute copies — those are restored
   by the next parse.

## Non-goals

- **Parametric traits** (`trait Owned<T>`). Addresses a tiny fraction of
  use cases; defer to future RFC if a need emerges.
- **Trait-level constraints** (`@inv`). Traits stay purely structural.
- **Deprecation per trait member** — use the existing `@deprecated`
  annotation on individual attributes inside the trait.

## Rejected alternatives

- **Multiple inheritance via `model X extends Y, Z`**: conflicts with the
  existing inheritance semantics (single-parent, behavioural). Traits are
  additive-only, a cleaner orthogonal tool.
- **`@@mixin` + separate keyword**: same mechanism, uglier syntax. `trait`
  borrows terminology from Scala / Rust where it's well understood.
- **Codegen-time macros**: breaks spec-is-source-of-truth.

## Work items

Phase 1 (spec 1.3.0):

- [ ] Grammar: `trait` declaration + `@@include(trait)` inside models
- [ ] Reserved keyword: `trait`
- [ ] IR: `Namespace.traits`, `Model.includedTraits`, trait expansion pass
- [ ] Visitor: expand traits into model attribute lists before IR emission
- [ ] Lint: L040 / L041 / L042 / L043 / L044
- [ ] `irToDsl`: round-trip trait declarations + `@@include` directives
- [ ] Example sample: `traits-audit.umlay` + conformance fixture
- [ ] `dsl-guide` §10.8 — trait walkthrough

Phase 2 (later, pending real-world feedback):

- [ ] `find references` shows which models include a given trait
- [ ] Hover on `@@include(X)` surfaces the trait's attributes inline
- [ ] LSP rename refactor: renaming a trait renames its `@@include` sites
