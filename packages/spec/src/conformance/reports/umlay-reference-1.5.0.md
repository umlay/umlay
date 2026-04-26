---
implementation: umlay-reference (TypeScript)
version: 1.5.0
spec-version: 1.5.0
report-date: 2026-04-26
reporter: "@keydrop"
level-claim: L3
---

# Conformance Report — umlay-reference 1.5.0

Reference implementation (`@umlay/core` + `@umlay/lint` + `@umlay/renderer-er`
+ `@umlay/lsp` + `@umlay/webview-ui` + `@umlay/cli`) at spec 1.5.0
(RFC 0036 reference-hop + RFC 0037 sequence detail levels).

## Summary

| Metric | Score |
| --- | --- |
| L1 (parse) | 41 / 41 (100%) |
| L2 (IR)    | 41 / 41 (100%) |
| L3 (render)| 41 / 41 (100%) — all 11 view kinds |
| Overall    | 123 / 123 |

## What's new since 1.4.0

| Change | Scope |
| --- | --- |
| **RFC 0036 — `refs: N` reference-hop expansion** | `@umlay/core` (grammar / visitor / `resolveIncludedModels` BFS) |
| **RFC 0037 — sequence detail levels (`@@detail` + `level:`)** | `@umlay/core` (grammar / visitor / IR / `applyDetailLevel` projector / format-dsl round-trip) |
| `ViewSchema` gains `refs?: number` and `detailLevel?: string` (additive) | `@umlay/core` (Zod), `@umlay/spec` (`ir.schema.json` regen) |
| `SeqStatement` union gains `{ kind: 'detailGroup', level, body }` | `@umlay/core` (Zod), `@umlay/spec` |
| `@umlay/cli` 0.1.0 published to npm | new package |
| Skill catalog: `umlay` (consultation) added | umlay-oss `skills/` |

## RFC coverage

All accepted RFCs (0001–0037) are implemented and exercised by tests /
fixtures.

| RFC | Feature | Status |
| --- | --- | --- |
| 0001–0035 | See 1.4.0 report | ✅ |
| **0036** | **Class / ER reference-hop (`refs: N`)** | **✅ new in 1.5.0** |
| **0037** | **Sequence detail levels (`@@detail` + `level:`)** | **✅ new in 1.5.0** |

## Test suite snapshot

| Package | Tests | Coverage (lines) |
| --- | --- | --- |
| `@umlay/core` | 336 (+11 RFC 0036 + 0037) | ~90% |
| `@umlay/lint` | 94 | ~88% |
| `@umlay/renderer-er` | 81 | ~85% |
| `@umlay/lsp` | 74 | 95.4% |
| `@umlay/webview-ui` | 49 | 92.1% |
| `@umlay/cli` | 5 | (smoke) |
| `apps/web` | 159 | 86.1% |
| **Total** | **798** (+ 1 skipped) | — |

## Signature

- Reporter: `@keydrop`
- Date: 2026-04-26
- Spec tag: `spec-1.5.0`
