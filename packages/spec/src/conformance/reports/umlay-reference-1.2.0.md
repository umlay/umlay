---
implementation: umlay-reference (TypeScript)
version: 1.2.0
spec-version: 1.2.0
report-date: 2026-04-23
reporter: "@keydrop"
level-claim: L3
---

# Conformance Report — umlay-reference 1.2.0

Reference implementation (`@umlay/core` + `@umlay/lint` + `@umlay/renderer-er`
+ `@umlay/lsp` + `@umlay/webview-ui`) at spec 1.2.0 (RFC 0032 view
selectors — Phase 1 + Phase 2).

## Summary

| Metric | Score |
| --- | --- |
| L1 (parse) | 38 / 38 (100%) |
| L2 (IR)    | 38 / 38 (100%) |
| L3 (render)| 38 / 38 (100%) — all 10 view kinds |
| Overall    | 114 / 114 |

Verified by `packages/core/src/conformance.test.ts` + per-renderer render
tests. `regen:fixtures` script keeps expected-ir JSON in sync with parser
output.

## What's new since 1.1.0

| Change | Scope |
| --- | --- |
| RFC 0032 — View Selectors Phase 1 | `visibility:X` / `seq:X` / `**.attr` in `include:` / `exclude:` |
| RFC 0032 — View Selectors Phase 2 | `stereotype:X` / `kind:X` (model drop / relation drop) |
| Lint catalog | +3 rules (L034 unknown selector, L035 zero-match, L036 redundant visibility). Total **60/60**. |
| `parseSelector(raw)` / `parseSelectors(raws)` API | `@umlay/core` 1.2+ — type-safe selector decode |
| `projectIrForView(ir, view)` API | `@umlay/core` 1.2+ — applies every selector in one pass |
| `@umlay/webview-ui` shared React components | New sibling package — same viewer for web and VS Code |
| New sample | `examples/samples/google-oauth-login.umlay` with 5 canonical views demonstrating every selector family |
| tree-sitter-umlay skeleton | New `packages/tree-sitter-umlay` for editor ecosystem (GitHub / Neovim / Zed) |

## Implementation details

- **Type**: full stack (parser + IR validator + lint + renderer + LSP +
  VS Code extension 0.4.1 + shared web UI)
- **Language**: TypeScript (Node ≥ 22)
- **Repository**: https://github.com/umlay/umlay (spec + public docs) +
  https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net (reference
  implementation, private)
- **License**: Apache-2.0
- **Packages published as**: `@umlay/{spec,core,lint,renderer-er,lsp,webview-ui}`
  @ 1.2.0 (npm publish pending token configuration — dry-run verified)
- **Editor**: `keydrop.umlay-vscode` 0.4.1 (`.vsix` local distribution;
  Marketplace publish pending publisher account).

## RFC coverage

All accepted RFCs (0001–0032) are implemented and exercised by tests /
fixtures.

| RFC | Feature | Status |
| --- | --- | --- |
| 0001 | BNF formalization | ✅ |
| 0002 | view `layout:` | ✅ |
| 0003 | alt / else | ✅ |
| 0004 / 0008 | `@@sample` inline + external file refs | ✅ |
| 0005 | cross-ns `@@dependencies` | ✅ |
| 0006 / 0010 / 0012 | protocol / union / recursive variant | ✅ |
| 0007 / 0013 | opt / par / await | ✅ |
| 0009 / 0014 | `import` / glob import | ✅ |
| 0011 / 0015 / 0019 / 0030 | MRO / bounds / variance / type inference | ✅ |
| 0016 / 0020 | impl blocks / blanket impl | ✅ |
| 0017 / 0021 / 0028 | critical / timeout / retry | ✅ |
| 0018 / 0022 | well-foundedness check | ✅ |
| 0023 / 0027 | `@deprecated` / `@experimental` | ✅ |
| 0024 | Gantt critical path | ✅ |
| 0025 | `@@codegen` hooks | ✅ |
| 0026 | `_id` hash algorithm | ✅ |
| 0029 | Lint catalog | ✅ (60/60 rules) |
| 0031 | Markdown integration (4 layers) | ✅ |
| **0032** | **View selectors (Phase 1 + Phase 2)** | **✅ new in 1.2.0** |

## Test suite snapshot

| Package | Tests | Coverage (lines) |
| --- | --- | --- |
| `@umlay/core` | 278 | ~90% |
| `@umlay/lint` | 94 | ~88% |
| `@umlay/renderer-er` | 59 | ~82% |
| `@umlay/lsp` | 61 | 95.4% |
| `@umlay/webview-ui` | 40 | 92.1% |
| `apps/web` | 128 | 92.1% |
| **Total** | **660** (+ 1 skipped) | — |

## Signature

- Reporter: `@keydrop`
- Date: 2026-04-23
- Spec tag: `spec-1.2.0`
