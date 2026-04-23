# RFC 0033 — Composite views (`@@include` inside view bodies)

- Status: **Accepted**
- Shipped in: spec **1.3.0**
- Class: **A — additive** (existing DSL keeps working)
- Related: RFC 0002 (view layout), RFC 0032 (view selectors)

## Motivation

Today a `view` renders **one diagram kind** of the IR — `@er_diagram`
for structure, `@sequence_diagram` for flow, `@gantt_chart` for schedule.
For a system-overview reviewer (PM / architect / new joiner) the natural
ask is:

> "Show me the architecture, the data model, and the happy-path flow —
>  together, on one canvas."

Currently the DSL can describe each piece (`view er`, `view flow`,
`view schedule`) but they render as separate artefacts. A composite canvas
requires hand-arranging SVG exports in an external tool — which breaks
Git/PR reviewability and drifts from the source.

## Decision

Extend `view` bodies so they can **embed other views** via `@@include(viewId)`:

```umlay
view architecture-overview @composite {
  @@include(auth.er)        // ER sub-panel
  @@include(auth.sequence)  // Sequence sub-panel
  @@include(pm.schedule)    // Gantt sub-panel

  layout: direction(LR), spacing(48)
}
```

A new view kind **`@composite`** is the only kind where `@@include(...)` is
meaningful; other kinds ignore it (lint L037).

## Grammar

```bnf
ViewKind         ::= ...existing...
                  | "@composite"                  ; NEW

ViewBody         ::= (IncludeClause | ExcludeClause | LayoutClause | CompositeInclude)*
CompositeInclude ::= "@@include" "(" QualifiedViewId ")"
QualifiedViewId  ::= Identifier ("." Identifier)*
```

Existing `IncludeClause` (model patterns) is unchanged — `@@include(...)`
is a distinct top-level directive within the view body.

## IR shape

Backward-compat additive:

```ts
interface View {
  // ...existing fields...
  kind: ViewKind;           // now includes 'composite'
  composition?: {
    includes: string[];     // view ids to embed, in declaration order
  };
}
```

Non-composite views have `composition === undefined` as today.

## Semantics

1. **Transitive expansion resolved at render time.** The renderer looks up
   each included view by id and fetches its pre-rendered SVG.
2. **Order matters.** Sub-panels flow in declaration order, laid out per
   the composite view's `layout:` options (`direction(LR)` → horizontal).
3. **No recursion.** A composite cannot include itself (direct or
   transitive) — lint rule **L037** detects cycles and fails the lint.
4. **Missing target** → lint **L038: unknown composite target**, warning.
5. **Selectors pass through.** An included view keeps its own `include:` /
   `exclude:` so composites remain a pure *compose* operation, not a
   reselection.

## Renderer contract (`@umlay/renderer-er`)

```ts
async function renderComposite(ir: IR, viewId: string): Promise<string> {
  const view = ir.views.find((v) => v.id === viewId);
  if (!view || view.kind !== 'composite') return emptySvg();
  const parts = await Promise.all(
    view.composition!.includes.map(async (childId) => {
      const child = ir.views.find((v) => v.id === childId);
      if (!child) return placeholderSvg(`missing: ${childId}`);
      return renderByKind(ir, child);  // dispatches to renderER / renderSeq / …
    }),
  );
  // Lay out each sub-SVG per `layout.direction`, wrap with a caption.
  return composeSvg(parts, view.layout);
}
```

The composition layer is a thin outer SVG that aligns children; no
re-layout of the inner contents.

## Lint rules

| Rule | Severity | Trigger |
| --- | --- | --- |
| L037 | error  | composite view references itself (directly or transitively) |
| L038 | warn   | `@@include` target view id does not exist |
| L039 | info   | composite view includes 0 sub-views (should probably be a regular view) |

## Non-goals

- **Cross-file composite**: still requires existing `import` to pull the
  target view into scope first.
- **Inline diagrams**: no support for `@@include(./other.umlay:er)`. Use
  `import "./other.umlay" as other` then `@@include(other.er)`.
- **Per-child override of include/exclude**: the child view's `include:` /
  `exclude:` is authoritative. To produce a filtered variant, define the
  variant as its own view and reference that.

## Rejected alternatives

- **Extending `@er_diagram` to also render sequence**: mixes responsibilities,
  couples renderers.
- **UI-only dashboard layer**: loses Git reviewability and can't be
  exported to PDF via `renderDocument`.

## Work items

Phase 1 (spec 1.3.0):

- [ ] Grammar: `@composite` view kind + `@@include(...)` directive
- [ ] IR: `View.composition: { includes: string[] }`
- [ ] Visitor: collect `composition.includes`
- [ ] `@umlay/renderer-er`: new `renderComposite()` that delegates per child
- [ ] Lint L037 (self-reference), L038 (unknown target), L039 (empty)
- [ ] New example: `composite-overview.umlay` + conformance fixture
- [ ] `dsl-guide` §10.7 — composite view walkthrough

Phase 2 (spec 1.4.0 or later):

- [ ] Per-child caption / annotation (`@@include(auth.er, caption: "Data model")`)
- [ ] Conditional inclusion tied to `@@mode(X)`
- [ ] Viewer (web + VS Code) renders composite as a stitched canvas with
      click-through on each child
