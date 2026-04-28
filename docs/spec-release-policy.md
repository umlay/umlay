# Spec Release Policy

This document records when the `@umlay/spec` accepts new RFCs and when it
is held for stabilisation. It is intentionally short — the rule of
thumb is **add things slowly, fix and consolidate eagerly**.

## Active version: 1.7.0 — **state machine ↔ event integration (released)**

As of 2026-04-27, spec **1.7.0 is released** with three bundled RFCs:

- **RFC 0050** — state machine cross-view consistency lints (L050–L056)
- **RFC 0051** — `@states(initial: ..., final: [...])` field marker
- **RFC 0052** — `event Name { ... }` first-class declaration +
  `fn @emits(EventName)` annotation

The 1.7 release is **additive + reserved-keyword**. Files that parse
cleanly under 1.6.x continue to parse under 1.7 with one rename: the
identifier `event` is now a reserved keyword. The two internal samples
that used `event` as a parameter name were renamed to `evt` at release
time; external users hitting the same conflict need the same rename.

> Note: the previously planned "directive consolidation" 1.7 was
> superseded — directive surface reduction did not deliver enough
> value to justify a release on its own and was deferred to 2.0
> alongside other deprecation cleanup.

### Allowed during 1.7.x (post-release)

- **Bug fixes** in parser / IR / lint that don't change observable
  semantics
- **Test additions**, fixture corrections
- **Documentation fixes** (typos, broken links, clarifications)
- **Performance fixes** at parser / lint layer
- **CLI / VS Code / Web** changes that don't add new spec constructs

### NOT allowed during 1.7.x

- **New `@@directive` names** (no new top-level / model-level / view-level
  directives)
- **New view kinds**
- **New IR fields** (model / attribute / view / namespace)
- **New lint rules**
- **Grammar additions** (no new tokens, no new productions)

If a real-world `.umlay` use case demands one of the above, capture it
in [`packages/spec/src/rfcs/_freeze-overflow.md`](../packages/spec/src/rfcs/_freeze-overflow.md)
and defer to **1.8 planning**.

## Next version: 1.8 — **codegen expansion (planned)**

Spec 1.8 turns the metadata captured in 1.6 + 1.7 into running code:

1. **Runtime validators** generated from structured `@@inv` (RFC 0049)
2. **Property-based test scaffolds** generated from `@@example` accept
   / reject pairs (RFC 0043)
3. **CI gates** that fail when state-machine lints (L050–L056) regress
4. (stretch) **AI-assisted** event-flow + state diagrams from natural
   language design notes via the `transcribe-design` skill

1.8 will be **additive**, never breaking. RFC numbers reserved for
this work begin at 0053.

## After 1.8

- **1.9** — VS Code AI re-introduction via `vscode.SecretStorage`
  (Marketplace-friendly), feature flags TBD.
- **2.0** — break: drop the deprecated 1.x directive aliases, drop the
  legacy `documentMarkdown` webview path, lock the consolidated
  surface as the canonical form.

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

## How to propose new work during 1.7.x

1. Open a discussion / issue describing the gap.
2. Tag with `target: 1.8` (or later) per scope.
3. Wait. Do **not** open a PR that adds spec surface during the
   minor-release freeze — those will be parked into the next RFC pile.

## Status snapshot

| Surface | Current | Frozen at |
| --- | --- | --- |
| `@@` block directives | ~30 | 1.6.1 |
| View kinds | 11 (er / class / sequence / component / package / state_machine / activity / deployment / wbs / gantt / composite) | 1.5.0 |
| First-class top-level decls | namespace / model / type / enum / view / protocol / union / impl / module / trait / **event** | 1.7.0 |
| Lint rules | 60 (S11–S17 + L001–L056 + R/W/C) | 1.7.0 |
| RFCs accepted | 0001–0044, 0049, 0050, 0051, 0052 | 1.7.0 |
| Reference impl | `@umlay/cli@0.7.0` (npm) + `Umlay.umlay@0.8.0` (VS Code Marketplace) | 1.7.0 |
