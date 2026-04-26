# Spec Release Policy

This document records when the `@umlay/spec` accepts new RFCs and when it
is held for stabilisation. It is intentionally short — the rule of
thumb is **add things slowly, fix and consolidate eagerly**.

## Active version: 1.6.x — **freeze**

As of 2026-04-26, spec 1.6.x is in a **feature freeze** for
stabilisation. The purpose of the freeze is to dogfood the eight new
metadata directives shipped in 1.6.0 (`@@owner` / `@@status` /
`@@adrRef` / `@@provenance` / `@@confidence` / `@@compliance` /
`@@since` / `@@locked` / `@@example` / `@@boundary`) and the four lint
rules added in 1.6.1 (L046–L049) before piling on more.

### Allowed during the 1.6.x freeze

- **Bug fixes** in parser / IR / lint that don't change observable
  semantics
- **Test additions**, fixture corrections
- **Documentation fixes** (typos, broken links, clarifications)
- **Performance fixes** at parser / lint layer
- **CLI / VS Code / Web** changes that don't add new spec constructs

### NOT allowed during the freeze

- **New `@@directive` names** (no new top-level / model-level / view-level
  directives)
- **New view kinds**
- **New IR fields** (model / attribute / view / namespace)
- **New lint rules** (the catalog stays at 73 / 73)
- **Grammar additions** (no new tokens, no new productions)

If a real-world `.umlay` use case demands one of the above during the
freeze, capture it in [`packages/spec/src/rfcs/_freeze-overflow.md`](../packages/spec/src/rfcs/_freeze-overflow.md)
and defer to spec **1.7 planning**.

## Next version: 1.7 — **directive consolidation**

Spec 1.7 is the planned **integration release**. Goals (see RFC 0050):

1. Reduce the block-directive surface from ~30 names to ~12 by
   collapsing semantically related directives behind a single name.
2. Standardise argument syntax (positional vs `key:value` vs object
   literal `{}`).
3. Mark legacy directives as `@deprecated(removeIn: "2.0")` while
   leaving them functional.

1.7 will be **additive + deprecating**, never breaking. Files that
parse cleanly under 1.6.x continue to parse under 1.7.

## After 1.7

- **1.8** — codegen expansion (RFC TBD): turn metadata into runtime
  validators / unit tests / CI gates.
- **2.0** — break: drop the deprecated 1.x directive aliases, lock the
  consolidated surface as the canonical form.

No 2.0 timeline. Trigger is when the consolidated surface has been
through ≥ 6 months of real use and the deprecation warnings are
acted on broadly.

## Velocity guardrails

- Maximum **1 minor bump per month** on average (1.0 → 1.6 cadence
  was too fast — adopters complained about churn).
- Each minor bump must include **≥ 1 real-world `.umlay` file**
  exercising every new construct in the conformance suite.
- Each minor bump must come with **at least 2 weeks** between the
  RFC `Accepted` mark and the actual release tag.

## How to propose new work during the freeze

1. Open a discussion / issue describing the gap.
2. Tag with `target: 1.7` or `target: 1.8` per scope.
3. Wait. Do **not** open a PR that adds spec surface during the freeze
   — those will be returned with "park in 1.7 RFC pile".

## Status snapshot

| Surface | Current | Frozen at |
| --- | --- | --- |
| `@@` block directives | ~30 | 1.6.1 |
| View kinds | 11 | 1.5.0 |
| Lint rules | 73 | 1.6.1 |
| RFCs accepted | 0001–0044, 0049 | 1.6.1 |
