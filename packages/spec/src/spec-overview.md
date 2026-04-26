# Umlay Spec — at a glance

One-page overview of `@umlay/spec` 1.6.1. For deep dives see
[`grammar.md`](./grammar.md), [`ir.schema.json`](./ir.schema.json),
[`lint-rules.md`](./lint-rules.md), and individual RFCs in
[`rfcs/`](./rfcs/).

## File shape

```
@@mode(strict)?            // file-level: lint mode
@@theme("dark")?           // file-level: render theme
@@boundary(...)?           // namespace contract (RFC 0044)
@@compliance(...)?         // namespace default tags (RFC 0040)

namespace <ns>             // exactly one per file (or zero for index files)

@@doc("...")?              // pre-decl directives can attach to next decl
import <path|ns>

enum <E> { A, B, ... }
type <T> @value_object { ... }
trait <Tr> { fields }
protocol <P> { fn signatures }
union <U> = A | B
impl <P> for <T> { ... }

model <M> @<stereotype> {  // entity / aggregate_root / value_object / service / interface
  // body directives + attributes + relations + methods
}

view <id> @<kind> { include / exclude / kind-specific body }

---                        // optional Markdown trailer (RFC 0031)
<Markdown body>
```

## IR shape (root)

```ts
IR = {
  version: "1.0",          // IR schema version (stable)
  specVersion: "1.6.1",    // semantic spec version (RFC 0037)
  kind: "UmlModel",
  mode: "draft" | "beta" | "strict",
  meta?: { theme?, imports? },
  docTrailer?: string,     // RFC 0031 Markdown trailer
  namespaces: Record<string, Namespace>,
  views: View[],
}
```

### Per-namespace

```ts
Namespace = {
  models, types, enums, reservedBlocks, cloudPrimitives,
  protocols, unions, impls, traits,
  boundary?,    // RFC 0044
  compliance?,  // RFC 0040
}
```

### Per-model

```ts
Model = {
  _id, name, stereotype?,
  abstract?, typeParams?, identity?,
  attributes, relations, methods,
  doc?, docs[],
  attachments[], reviews[], fixes[],
  rationale?: { intent, invariants[], structuredInvariants[],
                preconditions[], postconditions[], raises[] },
  sampleSources[], sampleFileRefs[],
  dependencies[], codegen[], implements[], includedTraits[],
  deprecated?, experimental?,
  // spec 1.6:
  owner?, status?, adrRefs[], provenance?, confidence?, compliance?,
  since?, locked?, examples[],
}
```

## Block directive catalog (model body, ~30)

| Group | Directives |
| --- | --- |
| **Structural** | `@@id`, `@@unique`, `@@index`, `@@identity` |
| **Documentation** | `@@doc`, `@@md` |
| **Composition** | `@@include` (trait expansion / composite view) |
| **Codegen** | `@@codegen`, `@@implements` |
| **Sample data** | `@@sample` (RFC 0004 / 0008) |
| **Dependencies** | `@@dependencies` (RFC 0005, Gantt / WBS) |
| **Contract (1.6)** | `@@inv`, `@@pre`, `@@post`, `@@example` |
| **Review (1.6)** | `@@owner`, `@@status`, `@@adrRef` |
| **Provenance (1.6)** | `@@provenance`, `@@confidence` |
| **Governance (1.6)** | `@@compliance`, `@@locked` |
| **Lifecycle (1.6)** | `@@since`, `@@deprecated` |
| **View body** | `@@detail` (sequence, RFC 0037), `@@boundary` (namespace) |
| **File-level** | `@@mode`, `@@theme` |

> **1.7 plan (RFC 0050)** consolidates groups 7–11 behind 4 umbrella
> directives (`@@review`, `@@governance`, `@@lifecycle`, `@@contract`).

## View kinds (11)

| Kind | Renderer | Purpose |
| --- | --- | --- |
| `er_diagram` | `renderER` | Entity-relationship |
| `class_diagram` | `renderClass` | UML classes + methods |
| `sequence_diagram` | `renderSequence` | Interaction flow |
| `component_diagram` | `renderComponent` | Component / service topology |
| `package_diagram` | `renderPackage` | Module / namespace structure |
| `state_machine` | `renderStateMachine` | State transitions |
| `activity_diagram` | `renderActivity` | Process flow |
| `wbs_diagram` | `renderWbs` | Work breakdown |
| `gantt_chart` | `renderGantt` | Schedule with deps |
| `deployment_diagram` | (cloud primitives) | Cloud / infra topology |
| `composite` | `renderComposite` | View of views (RFC 0033) |

### View-level constructs

| Construct | Spec | RFC |
| --- | --- | --- |
| `include: ns.Model, ns.*, **` | 1.0 | — |
| `exclude: visibility:private, stereotype:service, ...` | 1.2 | 0032 |
| `refs: N` (class / ER hop expansion) | 1.5 | 0036 |
| `level: high|low|...` (sequence detail filter) | 1.5 | 0037 |
| `@@include(viewId)` (composite composition) | 1.3 | 0033 |
| `participants: ...; seq { ... }` | 1.0–1.5 | 0007/0017/0021/0028 |
| `layout: direction(LR|TB|RL|BT)` | 1.3 | 0002 |
| `criticalPath: highlight\|compute\|ignore` | 1.3 | 0024 |

## Lint catalog (73 rules, summary)

| Prefix | Range | Purpose | Severity by mode |
| --- | --- | --- | --- |
| **S** | S01–S17 | Spec violation (parser / IR schema) | error always |
| **L** | L001–L049 | Lint (mode-dependent) | draft / beta / strict |
| **R** | R01–R13 | Risk (structural heuristic) | info / warn |
| **W** | W001–W002 | Warning (deprecated / experimental usage) | info |
| **C** | C001–C002 | Compatibility (spec version delta) | warn |

Notable groups: L020/L021 (rationale), L033 (image attachment), L034–L036
(view selectors, RFC 0032), L037–L039 (composite views, RFC 0033),
L040–L045 (traits, RFC 0034), **L046–L049 (metadata bundle, RFC 0049 /
spec 1.6.1)**.

See [`lint-rules.md`](./lint-rules.md) for the canonical table.

## RFC roadmap

| Range | Era | Focus |
| --- | --- | --- |
| 0001–0030 | spec 0.x → 1.1 | Grammar foundation, IR shape, lint baseline |
| 0031 | 1.1 | Markdown integration |
| 0032–0036 | 1.2–1.5 | View selectors, traits, composite views, refs hop |
| 0037 | 1.5 | Sequence detail levels |
| **0038–0044** | **1.6** | **Metadata bundle (review / governance / lifecycle)** |
| **0049** | **1.6.1** | **Structured `@@inv` + L046–L049** |
| **0050** | **1.7 (planned)** | **Directive consolidation (umbrella names)** |
| TBD | 1.8 | Codegen expansion (runtime validators / unit tests / CI gates) |
| TBD | 2.0 | Drop legacy 1.x directive aliases |

## Where to start

| Audience | Read first |
| --- | --- |
| New user | [`docs/<lang>/getting-started.md`](../../../docs) |
| Author writing `.umlay` | [`grammar.md`](./grammar.md), [`docs/<lang>/dsl-guide.md`](../../../docs) |
| Tool / library author | [`ir.schema.json`](./ir.schema.json), [`grammar.bnf`](./grammar.bnf) |
| Reviewer / linter author | [`lint-rules.md`](./lint-rules.md) |
| AI agent | [`skills/<lang>/`](../../../skills) — start with `umlay` (consultation entry) |
| Conformance test | [`conformance/`](./conformance) — fixtures + reports per spec version |
