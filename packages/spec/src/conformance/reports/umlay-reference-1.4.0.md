---
implementation: umlay-reference (TypeScript)
version: 1.4.0
spec-version: 1.4.0
report-date: 2026-04-26
reporter: "@keydrop"
level-claim: L3
---

# Conformance Report — umlay-reference 1.4.0

Reference implementation (`@umlay/core` + `@umlay/lint` + `@umlay/renderer-er`
+ `@umlay/lsp` + `@umlay/webview-ui`) at spec 1.4.0 (RFC 0035 inter-decl
directives).

## Summary

| Metric | Score |
| --- | --- |
| L1 (parse) | 41 / 41 (100%) |
| L2 (IR)    | 41 / 41 (100%) |
| L3 (render)| 41 / 41 (100%) — all 11 view kinds |
| Overall    | 123 / 123 |

Verified by `packages/core/src/conformance.test.ts` + per-renderer render
tests. `regen:fixtures` script keeps expected-ir JSON in sync with parser
output (now includes `enum.docs[]` / `type.docs[]`).

## What's new since 1.3.0

| Change | Scope |
| --- | --- |
| **RFC 0035 — top-level `@@doc` / `@@md` between declarations** | `@umlay/core` (grammar + visitor + IR) |
| `EnumSchema.docs: string[]` and `TypeDefSchema.docs: string[]` (additive) | `@umlay/core` (Zod), `@umlay/spec` (`ir.schema.json` regen) |
| `irToDsl` round-trip emits `@@doc` lines above each annotated enum | `@umlay/core` (format-dsl) |
| `parser.test.ts` + new `rfc-0035.test.ts` (6 cases) | `@umlay/core` |

Pre-1.4 input that **was** rejected with `Expecting EOF, found '@@'` now
parses, with the directive content attached as `docs[]` on the next
`enum` / `type` / `model`. Implementations claiming 1.4 conformance
must carry the field through `irToDsl` round-trip without loss.

## Implementation details

- **Type**: full stack (parser + IR validator + lint + renderer + LSP +
  VS Code extension 0.4.8 + shared web UI + on-device WebGPU LLM +
  change-impact review surface)
- **Language**: TypeScript (Node ≥ 22)
- **Repository**: https://github.com/umlay/umlay (spec + public docs) +
  https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net (reference
  implementation, private)
- **License**: Apache-2.0
- **Packages published as**: `@umlay/{spec,core,lint,renderer-er,lsp,webview-ui}`
  @ 1.4.0 (npm publish pending token configuration — dry-run verified)

## RFC coverage

All accepted RFCs (0001–0035) are implemented and exercised by tests /
fixtures.

| RFC | Feature | Status |
| --- | --- | --- |
| 0001–0034 | See 1.3.0 report | ✅ |
| **0035** | **Top-level `@@doc` between declarations** (`enum.docs[]` / `type.docs[]`) | **✅ new in 1.4.0** |

## Test suite snapshot

| Package | Tests | Coverage (lines) |
| --- | --- | --- |
| `@umlay/core` | 325 (+6 RFC 0035) | ~90% |
| `@umlay/lint` | 94 | ~88% |
| `@umlay/renderer-er` | 81 | ~85% |
| `@umlay/lsp` | 74 | 95.4% |
| `@umlay/webview-ui` | 49 | 92.1% |
| `apps/web` | 159 | 86.1% |
| **Total** | **782** (+ 1 skipped) | — |

### LSP capability coverage (1.4.0)

No LSP capability deltas since 1.3.0 — hover / definition / references
(+comment/string skip) / rename (+prepare) / formatting / documentSymbol /
workspace/symbol / semanticTokens/full / completion / codeAction
(L001 / L002 / L008). Hover for enum / type now surfaces `docs[]` when
present (existing model behavior extended to siblings).

## Signature

- Reporter: `@keydrop`
- Date: 2026-04-26
- Spec tag: `spec-1.4.0`
