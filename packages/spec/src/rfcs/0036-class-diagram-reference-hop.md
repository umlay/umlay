# RFC 0036 — Class / ER diagram reference-hop expansion (`refs: N`)

- Status: **Accepted**
- Shipped in: spec **1.5.0**
- Class: **A — additive**
- Related: RFC 0032 (view selectors), RFC 0033 (composite views)

## Motivation

When a system is split across many `.umlay` files (one namespace per file
or smaller), reviewers frequently want to switch between two granularities
of the **same** class:

1. **Single class card** — show only `User`, no surrounding context
2. **Class + 1-hop neighbors** — show `User` plus everything it directly
   references (`Profile`, `Address`, `Order` …)
3. **Class + 2-hop neighbors** — show `User` and the closure of its
   references at depth 2

Spec 1.4 only offers the first granularity natively; the others require
hand-listing every neighbor in the view's `include:` clause:

```umlay
view user-with-refs @class_diagram {
  include: shop.User, shop.Order, shop.Address, billing.Invoice, ...
}
```

This is brittle: every time `User` gains or drops a reference, the view
goes out of sync silently.

## Decision

Add an optional **`refs: N`** integer property to view declarations. When
present, the renderer (or any consumer of `resolveIncludedModels`) BFS-
expands the seed include set by N reference hops following
`attribute.ref.target` and the `relations[]` graph.

```umlay
view user-only       @class_diagram { include: shop.User }
view user-with-refs  @class_diagram { include: shop.User; refs: 1 }
view user-deep       @class_diagram { include: shop.User; refs: 2 }
view user-no-address @class_diagram {
  include: shop.User
  refs:    2
  exclude: shop.Address    // explicit excludes still win on hop-added models
}
```

### Semantics

- `refs: 0` (default) is equivalent to omitting `refs` — exact include only.
- `refs: N` performs N rounds of BFS over the union of `attribute.ref.target`
  and `relations[].target`. New nodes added in round k may contribute their
  refs in round k+1.
- `exclude:` patterns apply to **both** seeds and hop-expanded nodes — i.e.
  excluding `shop.Address` removes it even when it is reached by hop
  expansion.
- `refs:` is meaningful for kinds whose IR carries reference graphs:
  `er_diagram`, `class_diagram`, `package_diagram`, `component_diagram`.
  Other kinds ignore it (e.g. `gantt_chart`, `sequence_diagram`).

### Direction

Only **outgoing** references are followed. Reverse navigation (callers /
consumers) is intentionally out of scope for 1.5; a future RFC may add
`refs-in: N` if the use case proves common.

## IR change

`ViewSchema.refs?: number` (additive — default omitted).

```jsonc
{
  "id": "user-with-refs",
  "kind": "class_diagram",
  "include": ["shop.User"],
  "exclude": [],
  "refs": 1
}
```

## Grammar

```bnf
ViewProperty ::= Identifier ":" ( NumberLiteral | Selector ("," Selector)* )
```

`refs:` is a number-valued view property. The number must be a
non-negative integer; non-integer values clamp to `Math.trunc`.

## Backward compatibility

- All spec ≤ 1.4 inputs continue to parse and render unchanged.
- The new `refs` field has no default in JSON — older readers see no
  property and behave as if `refs: 0`.

## Test coverage

- `packages/core/src/rfc-0036.test.ts` — 5 cases:
  - `refs` unset → seed only
  - `refs: 1` → 1-hop expansion via outgoing refs
  - `refs: 2` adds further hops in a deeper graph
  - explicit `exclude:` removes hop-added nodes
  - `refs: 0` is equivalent to unset

## Future work

- `refs-in: N` for reverse expansion (incoming refs / call sites)
- Edge-only filter when N hops add too many models (e.g. "expand refs
  but keep the seed-card layout dominant")
- Renderer-side toggle (CLI flag / VS Code slider) for ad-hoc
  exploration without editing the DSL

## Conformance

L3 implementations MUST:

1. Parse `refs: N` as a view property and reject non-integer or negative
   values with a parse error.
2. Honor `view.refs` in their include resolver — the published
   `resolveIncludedModels` reference implementation is the contract.
3. Apply `exclude:` after `refs:` expansion, not before.
