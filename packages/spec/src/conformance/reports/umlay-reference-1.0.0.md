---
implementation: umlay-reference (TypeScript)
version: 1.0.0
spec-version: 1.0.0
report-date: 2026-04-22
reporter: "@keydrop"
level-claim: L2
---

# Conformance Report — umlay-reference 1.0.0

Reference implementation (`@umlay/core` + `@umlay/lint` + `@umlay/renderer-er` + `@umlay/lsp`)
at the spec 1.0 freeze.

## Summary

| Metric | Score |
| --- | --- |
| L1 (parse) | 35 / 35 (100%) |
| L2 (IR)    | 35 / 35 (100%) |
| L3 (render)| 35 / 35 (100%) — all 10 view kinds |
| Overall    | 105 / 105 |

Verified locally by `packages/core/src/conformance.test.ts`
(`assertIRMatches` against every fixture in `expected-ir/`) and
`packages/renderer-er/src/render.test.ts` (SVG render per view kind).

## Implementation details

- **Type**: full stack (parser + IR validator + lint + renderer + LSP)
- **Language**: TypeScript (Node ≥ 20)
- **Repository**: https://github.com/keydrop/umlay
- **License**: Apache-2.0
- **Packages**:
  - `@umlay/core` — parser, IR, importers, generators, rename detection, AI loop
  - `@umlay/lint` — 52 rules (S11-S17 semantic checks + L/R/W/C catalog)
  - `@umlay/renderer-er` — 10 view renderers, CPM with PMBOK FS/SS/FF/SF + lag
  - `@umlay/lsp` — diagnostics / hover / go-to-definition over LSP stdio
  - `apps/vscode` — editor host (syntax highlight + LSP client + preview webview)

## RFC coverage

All RFCs accepted during the 0.1 → 0.8 evolution are implemented and verified by
fixtures + tests. The full lint catalog (53/53) is live in `@umlay/lint`,
including structured `@@codegen` hooks (RFC 0025), `@@sample(from:)` external
file refs (RFC 0008 follow-up), and a static-approximation R11 that flags
`@experimental` elements surfacing on a computed critical path or inside a
`critical` sequence region.

| RFC | Feature | Status |
| --- | --- | --- |
| 0001 | BNF formalization | ✅ |
| 0002 | view `layout:` | ✅ |
| 0003 | alt / else | ✅ |
| 0004 / 0008 | `@@sample` inline + from | ✅ |
| 0005 | cross-ns `@@dependencies` | ✅ (S11/S12 validate) |
| 0006 / 0010 / 0012 | protocol / union / recursive variant | ✅ |
| 0007 / 0013 | opt / par / await | ✅ |
| 0009 / 0014 | `import` / glob import | ✅ |
| 0011 / 0015 / 0019 / 0030 | MRO / bounds / variance / type inference | ✅ (S13/S14/S16) |
| 0016 / 0020 | impl blocks / blanket impl | ✅ (S15 orphan rule) |
| 0017 / 0021 / 0028 | critical / timeout / retry | ✅ |
| 0018 / 0022 | well-foundedness check | ✅ (S17) |
| 0023 / 0027 | `@deprecated` / `@experimental` | ✅ (W001/W002) |
| 0024 | Gantt critical path | ✅ |
| 0025 | `@@codegen` hooks | ✅ |
| 0026 | `_id` hash algorithm | ✅ (80bit sha1 prefix) |
| 0029 | Lint catalog | ✅ (53/53 rules — R11 implemented as static approximation) |

## Signature

- Reporter: `@keydrop`
- Date: 2026-04-22
- Spec freeze tag: `spec-1.0.0`
