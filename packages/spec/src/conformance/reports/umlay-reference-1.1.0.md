---
implementation: umlay-reference (TypeScript)
version: 1.1.0
spec-version: 1.1.0
report-date: 2026-04-22
reporter: "@keydrop"
level-claim: L3
---

# Conformance Report — umlay-reference 1.1.0

Reference implementation (`@umlay/core` + `@umlay/lint` + `@umlay/renderer-er`
+ `@umlay/lsp`) at spec 1.1.0 (RFC 0031 Markdown integration).

## Summary

| Metric | Score |
| --- | --- |
| L1 (parse) | 35 / 35 (100%) |
| L2 (IR)    | 35 / 35 (100%) |
| L3 (render)| 35 / 35 (100%) — all 10 view kinds |
| Overall    | 105 / 105 |

Locally verified by `packages/core/src/conformance.test.ts` (`assertIRMatches`
against every fixture under `expected-ir/`) plus `packages/renderer-er/src/
render.test.ts`.

## What's new since 1.0.0

| Change | Scope |
| --- | --- |
| RFC 0031 — Markdown integration | 4 layers: doc-string md / `@@md` directive / `.umlay.md` literate / `---` trailer |
| `IR.docTrailer?: string` | New optional top-level field, zero-impact on older consumers |
| `Model.docs[]` / `View.docs[]` | New defaulted arrays; `model.doc` still present for back-compat |
| `parseLiterate(source)` API | `@umlay/core` extracts ` ```umlay ` fences from Markdown + remaps diagnostics |
| `irToDsl(ir)` API | Canonical round-trip formatter (format-on-save / codegen reconciliation) |
| `renderDocument(ir)` API | `@umlay/renderer-er` — IR → Markdown + inline SVG (powers web Document Mode) |
| Lint R13 | info when a single model's `@@md` / `@@doc` totals > 200 lines |

## Implementation details

- **Type**: full stack (parser + IR validator + lint + renderer + LSP +
  VS Code extension)
- **Language**: TypeScript (Node ≥ 22)
- **Repository**: https://github.com/umlay/umlay (spec + public docs) +
  https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net (reference
  implementation, private)
- **License**: Apache-2.0
- **Packages published as**: `@umlay/{spec,core,lint,renderer-er,lsp}`
  @ 1.1.0 (npm publish pending token configuration — dry-run verified)
- **Editor**: `keydrop.umlay-vscode` 0.2.0 on the Marketplace (pending
  publish).

## RFC coverage

All accepted RFCs (0001–0031) are implemented and exercised by tests /
fixtures. Only outstanding item is lint rule R11 (experimental on runtime
critical path) which ships as a static approximation until runtime-trace
instrumentation arrives.

| RFC | Feature | Status |
| --- | --- | --- |
| 0001 | BNF formalization | ✅ |
| 0002 | view `layout:` | ✅ |
| 0003 | alt / else | ✅ |
| 0004 / 0008 | `@@sample` inline + external file refs | ✅ (`expandSampleFileRefs` API) |
| 0005 | cross-ns `@@dependencies` | ✅ (S11 / S12 validate) |
| 0006 / 0010 / 0012 | protocol / union / recursive variant | ✅ |
| 0007 / 0013 | opt / par / await | ✅ |
| 0009 / 0014 | `import` / glob import | ✅ |
| 0011 / 0015 / 0019 / 0030 | MRO / bounds / variance / type inference | ✅ (S13 / S14 / S16) |
| 0016 / 0020 | impl blocks / blanket impl | ✅ (S15 orphan rule) |
| 0017 / 0021 / 0028 | critical / timeout / retry | ✅ |
| 0018 / 0022 | well-foundedness check | ✅ (S17) |
| 0023 / 0027 | `@deprecated` / `@experimental` | ✅ (W001 / W002) |
| 0024 | Gantt critical path | ✅ |
| 0025 | `@@codegen` hooks | ✅ (structured IR `Model.codegen[]`) |
| 0026 | `_id` hash algorithm | ✅ |
| 0029 | Lint catalog | ✅ (54/54 rules — 13 risk rules including R13) |
| **0031** | **Markdown integration (4 layers)** | **✅ new in 1.1.0** |

## Signature

- Reporter: `@keydrop`
- Date: 2026-04-22
- Spec tag: `spec-1.1.0`
