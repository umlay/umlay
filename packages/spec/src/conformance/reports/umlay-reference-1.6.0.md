---
implementation: umlay-reference (TypeScript)
version: 1.6.0
spec-version: 1.6.0
report-date: 2026-04-26
reporter: "@keydrop"
level-claim: L3
---

# Conformance Report — umlay-reference 1.6.0

Reference implementation (`@umlay/core` + `@umlay/lint` + `@umlay/renderer-er`
+ `@umlay/lsp` + `@umlay/webview-ui` + `@umlay/cli`) at spec 1.6.0
(RFC 0038–0044 metadata bundle: ownership / status / ADR refs /
provenance / confidence / compliance / since / locked / examples /
boundary, plus IR-level `specVersion`).

## Summary

| Metric | Score |
| --- | --- |
| L1 (parse) | 41 / 41 (100%) |
| L2 (IR)    | 41 / 41 (100%) |
| L3 (render)| 41 / 41 (100%) — all 11 view kinds |
| Overall    | 123 / 123 |

## What's new since 1.5.0

| Change | Scope |
| --- | --- |
| RFC 0037 — `IR.specVersion` (semantic version, distinct from IR schema version) | `@umlay/core` (Zod), regen |
| RFC 0038 — `@@owner` / `@@status` / `@@adrRef` on model | `@umlay/core` (visitor + IR) |
| RFC 0039 — `@@provenance` / `@@confidence` on model | `@umlay/core` |
| RFC 0040 — `@@compliance(tags:[...], residency:..., retention:...)` on namespace / model / attribute | `@umlay/core` |
| RFC 0041 — `@@since("X.Y.Z")` on model / attribute | `@umlay/core` |
| RFC 0042 — `@@locked(reason:..., by:...)` on model / attribute | `@umlay/core` |
| RFC 0043 — `@@example(input:{...}, expect:accept|reject, reason:...)` on model | `@umlay/core` |
| RFC 0044 — `@@boundary(exposes:[...], hides:[...])` on namespace | `@umlay/core` |
| Grammar: `directiveArgToken` accepts `[ ... ]` array literals (`nestedSquare`) | `@umlay/core` |
| Visitor: `parseDirectiveObject` (object / array / negative-number / quoted-string parser for directive bodies) | `@umlay/core` |

All additions are **additive** — pre-1.6 inputs continue to parse and
render unchanged. IR JSON without the new fields is also valid.

## RFC coverage

| RFC | Feature | Status |
| --- | --- | --- |
| 0001–0037 | See 1.5.0 report | ✅ |
| **0038** | **spec 1.6 metadata bundle (Owner / Status / AdrRef)** | **✅ new in 1.6.0** |
| **0039** | **Provenance + Confidence** | **✅ new in 1.6.0** |
| **0040** | **Compliance tags** | **✅ new in 1.6.0** |
| **0041** | **`@@since` lifecycle marker** | **✅ new in 1.6.0** |
| **0042** | **`@@locked` AI / codegen guard** | **✅ new in 1.6.0** |
| **0043** | **Structured `@@example`** | **✅ new in 1.6.0** |
| **0044** | **Namespace `@@boundary`** | **✅ new in 1.6.0** |

## Test suite snapshot

| Package | Tests | Coverage (lines) |
| --- | --- | --- |
| `@umlay/core` | 345 (+9 spec 1.6) | ~90% |
| `@umlay/lint` | 94 | ~88% |
| `@umlay/renderer-er` | 81 | ~85% |
| `@umlay/lsp` | 74 | 95.4% |
| `@umlay/webview-ui` | 49 | 92.1% |
| `@umlay/cli` | 5 | (smoke) |
| `apps/web` | 159 | 86.1% |
| **Total** | **807** (+ 1 skipped) | — |

## Signature

- Reporter: `@keydrop`
- Date: 2026-04-26
- Spec tag: `spec-1.6.0`
