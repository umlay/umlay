---
implementation: umlay-reference (TypeScript)
version: 1.6.1
spec-version: 1.6.1
report-date: 2026-04-26
reporter: "@keydrop"
level-claim: L3
---

# Conformance Report — umlay-reference 1.6.1

Reference implementation at spec 1.6.1 — RFC 0049 (structured `@@inv` +
L046–L049 lint enforcement).

## Summary

| Metric | Score |
| --- | --- |
| L1 (parse) | 41 / 41 (100%) |
| L2 (IR)    | 41 / 41 (100%) |
| L3 (render)| 41 / 41 (100%) |
| Lint rules | **73** (was 69 at 1.5) |
| Overall    | 123 / 123 |

## What's new since 1.6.0

| Change | Scope |
| --- | --- |
| RFC 0049 — structured `@@inv(field, op, value/values)` | `@umlay/core` (visitor + IR) |
| `Rationale.structuredInvariants: StructuredInvariant[]` | `@umlay/core` (Zod) |
| L046 — `@@locked` review hint (info, ADR recommendation) | `@umlay/lint` |
| L047 — `@@boundary` ghost references (warn / error) | `@umlay/lint` |
| L048 — PII attribute without reject `@@example` (info / warn / error) | `@umlay/lint` |
| L049 — `@@example` × structured `@@inv` consistency (warn / error) | `@umlay/lint` |
| `@umlay/cli` 0.4.0 — bundled with spec 1.6.1 | new release |

## RFC coverage

| RFC | Feature | Status |
| --- | --- | --- |
| 0001–0044 | See 1.6.0 report | ✅ |
| **0049** | **Structured `@@inv` + L046–L049 enforcement** | **✅ new in 1.6.1** |

## Test suite snapshot

| Package | Tests | Coverage |
| --- | --- | --- |
| `@umlay/core` | 345 | ~90% |
| `@umlay/lint` | **107** (+13 spec 1.6.1 lint cases) | ~88% |
| `@umlay/renderer-er` | 81 | ~85% |
| `@umlay/lsp` | 74 | 95.4% |
| `@umlay/webview-ui` | 49 | 92.1% |
| `@umlay/cli` | 5 | (smoke) |
| `apps/web` | 159 | 86.1% |
| **Total** | **820** | — |

## Signature

- Reporter: `@keydrop`
- Date: 2026-04-26
- Spec tag: `spec-1.6.1`
