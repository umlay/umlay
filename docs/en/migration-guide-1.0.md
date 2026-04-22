# Migration Guide — spec 0.x → 1.0

**Status**: **final (1.0 release — 2026-04-22 freeze)**

Consolidated view of the changes that are now **fixed / tightened at spec 1.0**, building on the incremental additions across 0.1 through 0.8.

## 0. What 1.0 means

- `@umlay/spec` 1.0 is the **spec freeze**: IR schema version `1.0` is confirmed, the grammar is finalized in BNF.
- After 1.0, any **breaking change** (Class C) requires **spec 2.0**.
- The 0.x line accepts only additive (A) and relaxation (B) changes.

## 1. To be removed (removeIn: 1.0.0)

Elements marked `@deprecated({ removeIn: "1.0.0" })` in the 0.x line will be removed at 1.0:

| Element | Replacement | Deprecated since | RFC |
| --- | --- | --- | --- |
| `User.username` (legacy field pattern) | `displayName` family | 0.3.0 | — |
| `LegacyUser` / `LegacyRepository<T>` (sample reference) | `User` / `Repository<T>` | 0.3.0 | — |
| `OrderStatus.EXPIRED` | `CANCELLED` + `reason: "expired"` | — | — |
| Implicit namespace scan | Explicit `import` (RFC 0009) | 0.3.0 → removed at 1.0 | 0009 |

## 2. Checks that become strict at 1.0

Rules that were warnings in 0.x and become errors at 1.0 (see `lint-rules.md`):

| Rule | Before | After |
| --- | --- | --- |
| L001 (visibility required) | draft: info / strict: error | **error in all modes** |
| L002 (multiplicity required) | draft: warn / strict: error | **error in all modes** |
| L008 (`@intent` required) | strict: warn | strict: **error** |
| L014 (`@default` type match) | draft: warn | **error in all modes** |
| C002 (min-spec-version mismatch) | warn | **error** |

Code running in draft mode today should migrate to strict pre-emptively.

## 3. Grammar finalizations

### 3.1 Reserved word promotions

The current `RESERVED_KEYWORDS` list (see `index.ts`) becomes **proper declaration keywords** at 1.0:

| Keyword | Role |
| --- | --- |
| `protocol` | Protocol declaration (RFC 0006, shipped in 0.3.0) |
| `union` | Union declaration (RFC 0006, shipped in 0.3.0) |
| `module` | Module declaration (RFC 0006, shipped in 0.3.0) |
| `fn` | Method declaration (Phase 1 from RFC 0001) |
| `import` | Import declaration (RFC 0009, 0.3.0) |
| `impl` | Impl block (RFC 0016, 0.5.0) |

Adding new keywords thereafter is a major-change (spec 2.0) operation.

### 3.2 IR `_id` algorithm freeze

The sha1 80-bit algorithm in RFC 0026 freezes at 1.0. Existing IR data from ≤ 0.8.x needs `_id` re-computation when migrating to 1.0.

Migration sketch:

```ts
import { computeId } from '@umlay/spec/id';

for (const model of oldIR.namespaces.*.models.*) {
  model._id = computeId({ kind: 'model', namespace: ns, name: model.name });
  // attributes and other elements similarly
}
```

### 3.3 View kind freeze

The current 10 kinds (plus a few reserved in-review RFCs like `materialized_view`) lock in at 1.0. Further additions require a minor bump behind an RFC.

## 4. Additive features (no migration required)

All items below are Class A (additive) and need no migration from existing 0.x code:

- `@@sample(...)` (RFC 0004)
- Cross-namespace `@@dependencies` (RFC 0005)
- `protocol` / `union` / `module` (RFC 0006)
- `opt` / `par` / `await` (RFC 0007 / 0013)
- `@@sample(from: ...)` (RFC 0008)
- `import` / glob import (RFC 0009 / 0014)
- Inline variant / recursive union (RFC 0010 / 0012)
- C3 MRO / `@@override` (RFC 0011)
- Bounded generics / variance (RFC 0015 / 0019)
- impl blocks / blanket impl (RFC 0016 / 0020)
- `critical` / timeout / retry (RFC 0017 / 0021 / 0028)
- Well-foundedness checks (RFC 0018 / 0022)
- `@deprecated` / `@experimental` (RFC 0023 / 0027)
- Gantt critical path (RFC 0024)
- `@@codegen` hooks (RFC 0025)
- `_id` hash algorithm (RFC 0026)
- Lint catalog / Type inference (RFC 0029 / 0030)

## 5. Migration checklist (for 1.0 RC)

### Project side

- [ ] Migrate every `@deprecated({ removeIn: "1.0.0" })` element
- [ ] Move all implicit namespace scans to explicit `import`s
- [ ] All samples pass `L001` / `L002` / `L008` / `L014`
- [ ] Every sample passes under `@@mode(strict)`
- [ ] Recompute IR `_id` per RFC 0026 sha1 form

### Tooling / implementations

- [ ] Parser conforms to 1.0 BNF
- [ ] IR validator conforms to 1.0 schema
- [ ] Conformance report (`conformance/reports/`) re-submitted for 1.0
- [ ] Codegen hooks (`@@codegen`) behave for all targets
- [ ] LSP implementations (if any) updated for 1.0

## 5.5 Implementation status (at spec 1.0.0 freeze)

Reference implementation (`packages/core`, `@umlay/lint`, `@umlay/renderer-er`, `@umlay/lsp`) coverage:

| Area | 1.0.0 status |
| --- | --- |
| DSL parser (BNF-compliant) | **100%** — every public sample parses cleanly |
| IR schema (Zod → JSON Schema auto-generated) | All accepted RFCs reflected (sequenceBody / layout / PMBOK deps / imports / protocol / union / impl / sampleSources / criticalPath / deprecated / experimental / `@@dependencies` / `@@implements`) |
| Lint rules | **53/53 (100%)** implemented ([lint-rules.md](../../packages/spec/src/lint-rules.md)). R11 ships as a static approximation until runtime-trace instrumentation arrives |
| Renderer (all 10 view kinds) | **100%** incl. CPM with PMBOK FS/SS/FF/SF + lag |
| Conformance L1 (parse) | **100%** (35/35 samples) |
| Conformance L2 (IR match) | **100%** — `conformance.test.ts` asserts every fixture via `assertIRMatches`; `regen:fixtures` script keeps them in sync |
| LSP | New `@umlay/lsp` package — diagnostics / hover / go-to-definition (the VS Code extension consumes it as a client) |
| VS Code extension | `apps/vscode/` skeleton published — syntax highlight + LSP client + SVG preview |

## 6. Post-1.0 evolution

After freeze:

- **minor (1.1 / 1.2 / ...)**: additive only (new RFCs)
- **major (2.0)**: breaking changes only (e.g. IR schema version bump to 2.0)

See [`rfcs/README.md`](../../packages/spec/src/rfcs/README.md) for the running index of RFCs per 1.x release.

### 6.1 Spec 1.1.0 additions

| Feature | RFC | Impact |
| --- | --- | --- |
| `@@md(""" ... """)` model directive | 0031 | One grammar rule (additive); IR `Model.docs[]` |
| Markdown trailer (after `---`) | 0031 | Parser pre-pass; IR `docTrailer?` |
| Literate `.umlay.md` | 0031 | New API `parseLiterate(source)` |
| (Layer A: render existing doc strings as Markdown) | 0031 | Display-side only; grammar / IR unchanged |

**Migration: none required.** Every change is backward compatible — existing
`.umlay` files keep parsing identically.

## 7. See also

- [Roadmap](./roadmap.md)
- [Extending Guide](./extending.md)
- [Evolve Schema skill](../../skills/en/evolve-schema.md)
- [Lint Rules](../../packages/spec/src/lint-rules.md)
- [Type Inference](../../packages/spec/src/type-inference.md)
- [Japanese version](../ja/migration-guide-1.0.md)
