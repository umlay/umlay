---
implementation: umlay-reference (TypeScript)
version: 1.3.0
spec-version: 1.3.0
report-date: 2026-04-24
reporter: "@keydrop"
level-claim: L3
---

# Conformance Report — umlay-reference 1.3.0

Reference implementation (`@umlay/core` + `@umlay/lint` + `@umlay/renderer-er`
+ `@umlay/lsp` + `@umlay/webview-ui`) at spec 1.3.0 (RFC 0033 composite
views + RFC 0034 model traits + small parser additions).

## Summary

| Metric | Score |
| --- | --- |
| L1 (parse) | 41 / 41 (100%) |
| L2 (IR)    | 41 / 41 (100%) |
| L3 (render)| 41 / 41 (100%) — all 11 view kinds |
| Overall    | 123 / 123 |

Verified by `packages/core/src/conformance.test.ts` + per-renderer render
tests. `regen:fixtures` script keeps expected-ir JSON in sync with parser
output.

## What's new since 1.2.0

| Change | Scope |
| --- | --- |
| RFC 0033 — Composite views (`@composite` kind + `@@include(viewId)`) | `@umlay/core` / `@umlay/renderer-er` (new `renderComposite`) |
| RFC 0034 — Model traits (`trait X { attrs }` + `@@include(Trait)`) | `@umlay/core` (parse-time expansion in `trait-expand.ts`) |
| `type X = Y` alias form | `@umlay/core` (grammar OR with body form, IR gains `TypeDef.aliasOf`) |
| `~` package visibility | `@umlay/core` (`VisibilityEnum` already had `"package"`) |
| `@@sample(from: "./file")` expansion wired | `apps/web` (attachment-store) + `apps/vscode` (workspace-folder-constrained fs.readFile) |
| Lint catalog | +9 rules (L037-L039 composite, L040-L045 traits). Total **69/69** |
| WebGPU LLM provider | `apps/web` — on-device `@mlc-ai/web-llm` alongside Anthropic / OpenAI |
| Sample files | `traits-audit.umlay`, `composite-overview.umlay`, `all-features.umlay` |
| tree-sitter-umlay | No updates in 1.3 — editor highlighting deliberately behind the semantic grammar |

## Implementation details

- **Type**: full stack (parser + IR validator + lint + renderer + LSP +
  VS Code extension 0.4.3 + shared web UI + on-device WebGPU LLM)
- **Language**: TypeScript (Node ≥ 22)
- **Repository**: https://github.com/umlay/umlay (spec + public docs) +
  https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net (reference
  implementation, private)
- **License**: Apache-2.0
- **Packages published as**: `@umlay/{spec,core,lint,renderer-er,lsp,webview-ui}`
  @ 1.3.0 (npm publish pending token configuration — dry-run verified)
- **Editor**: `keydrop.umlay-vscode` 0.4.3 (`.vsix` local distribution;
  Marketplace publish pending publisher account).

## RFC coverage

All accepted RFCs (0001–0034) are implemented and exercised by tests /
fixtures.

| RFC | Feature | Status |
| --- | --- | --- |
| 0001–0031 | See 1.2.0 report | ✅ |
| 0032 | View selectors (Phase 1 + 2) | ✅ |
| **0033** | **Composite views** | **✅ new in 1.3.0** |
| **0034** | **Model traits** | **✅ new in 1.3.0** |

## Test suite snapshot

| Package | Tests | Coverage (lines) |
| --- | --- | --- |
| `@umlay/core` | 316 | ~90% |
| `@umlay/lint` | 94 | ~88% |
| `@umlay/renderer-er` | 66 | ~84% |
| `@umlay/lsp` | 74 | 95.4% |
| `@umlay/webview-ui` | 49 | 92.1% |
| `apps/web` | 128 | 86.3% |
| **Total** | **727** (+ 1 skipped) | — |

### LSP capability coverage (1.3.0)

No deltas since 1.2.0 — hover / definition / references (+comment/string
skip) / rename (+prepare) / formatting / documentSymbol / workspace/symbol /
semanticTokens/full / completion / codeAction (L001 / L002 / L008).

## Signature

- Reporter: `@keydrop`
- Date: 2026-04-24
- Spec tag: `spec-1.3.0`
