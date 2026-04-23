# IR Guide — for tool authors

The **normalized IR** (Intermediate Representation) is the internal form after a `.umlay` file is parsed. Although the `.umlay` → IR conversion lives in the implementation (separate repository), the IR structure itself is canonical in this repository's JSON Schema.

- JSON Schema: [`../../packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json) (Draft 2020-12)
- Version: `1.0`

## Where the IR fits

```
.umlay ─ parse ─▶ Normalized IR (JSON) ─ consume ─┬─▶ SVG renderer
                                                 ├─▶ Prisma / SQL / TS generators
                                                 ├─▶ Lint / scoring / risk detection
                                                 └─▶ Review / diff / annotation
```

Regardless of how the DSL evolves, once a model reaches the IR it has a uniform shape. All downstream processing (render / generate / lint / review) targets the IR.

## Example

`.umlay`:

```prisma
model Order @aggregate_root @intent("Customer order aggregate") {
  id          UUID! @id
  customerId  UUID! @ref(Customer.id)
  -> composition 1..* lines: OrderLine
}
```

IR (excerpt):

```jsonc
{
  "version": "1.0",
  "kind": "UmlModel",
  "namespaces": {
    "ordering": {
      "models": {
        "Order": {
          "_id": "sha1:ordering.Order",
          "stereotype": "aggregate_root",
          "intent": "Customer order aggregate",
          "identity": ["id"],
          "attributes": [
            {
              "_id": "sha1:ordering.Order.id",
              "name": "id",
              "type": "UUID",
              "visibility": "public",
              "nullable": false,
              "pk": true
            }
          ],
          "relations": [
            {
              "kind": "composition",
              "target": "ordering.OrderLine",
              "multiplicity": "1..*",
              "role": "lines"
            }
          ]
        }
      }
    }
  },
  "views": []
}
```

## Design principles

### 1. Stable IDs (`_id`)

Every model, attribute, and relation carries a content-derived stable ID (`sha1:...`).

- Renaming an identifier leaves `_id` unchanged as long as the structure is unchanged, so IR diffs can surface renames
- Review annotations (`@review`, `@fix`) bind to `_id`, giving rename resilience

### 2. Required fields

By the time a model reaches the IR, the following are always populated (enforced at DSL time in Strict mode, filled with defaults in Draft mode):

- `visibility` — `public` / `private` / `protected`
- `nullable` — boolean
- `multiplicity` — for relations: `"1"`, `"0..1"`, `"1..*"`, `"0..*"`, ...

### 3. References are fully qualified

All references (`@ref`, view `include`) are normalized to `<namespace>.<name>` in the IR.

### 4. Views never duplicate models

`views[]` hold **projections** only. `include` patterns select which models to draw, and view-scoped attributes (layout, participant aliasing, etc.) attach here.

### 4.1 View selector encoding in the IR (RFC 0032, spec 1.2+)

`view.include` / `view.exclude` stay as `string[]` for backward compat,
but each string may be one of:

- legacy model patterns — `"auth.User"`, `"auth.*"`, `"**"`
- attribute name — `"**.passwordHash"`
- `kind:value` form — `"visibility:private"`, `"seq:critical"`,
  `"stereotype:value_object"`, `"kind:dependency"`

Consumers have two strategies:

1. **Pattern-only consumers** — keep reading `view.include` as
   `string[]` of model patterns; selectors they don't recognise are
   safely ignored.
2. **Selector-aware consumers** — use `parseSelector(raw)` from
   `@umlay/core`, which returns a discriminated union:

```ts
import { parseSelector } from '@umlay/core';

for (const raw of view.exclude) {
  const sel = parseSelector(raw);
  switch (sel.kind) {
    case 'pattern':     // "auth.User" / "auth.*" / "**"
    case 'attr':        // "**.passwordHash" → { name: 'passwordHash' }
    case 'visibility':
    case 'seq':
    case 'stereotype':
    case 'relation':    // "kind:composition"
    case 'unknown':     // "foo:bar" — lint L034 fires
  }
}
```

Renderers typically call `projectIrForView(ir, view)` which applies
every selector in one pass and returns a projected IR.

## Recommendations for IR consumers

| Goal | Suggested approach |
| --- | --- |
| Visualization | Pick one `views[]` entry, resolve referenced `namespaces[*].models[*]`, and render |
| Code generation | Use template conversion for deterministic output (types / DDL / OpenAPI); feed IR + `intent` + contracts to the LLM for non-deterministic parts |
| Diff / review | Use `_id` to classify changes (new / removed / renamed) |
| Lint / risk | Feed `attributes[*].nullable`, `relations[*].multiplicity`, etc. into the rule engine |

## Version compatibility

- Additive changes under `version: "1.0"` are **backward compatible**
- Breaking changes bump to `version: "2.0"` with a published migration guide
- Schema changes go through the RFC process in `packages/spec` (see [CONTRIBUTING.md](../../CONTRIBUTING.md))

## Fields added in spec 0.8.0

All optional; legacy 0.x IRs remain valid.

### view.sequenceBody (RFC 0007 / 0017 / 0021 / 0028)

Structured participants + statement tree for sequence diagrams:

```json
{
  "kind": "sequence_diagram",
  "sequenceBody": {
    "participants": [{ "id": "api", "label": "API", "ref": "auth.AuthAPI" }],
    "statements": [
      { "kind": "message", "from": "api", "to": "db", "arrow": "sync", "label": "SELECT user" },
      {
        "kind": "critical", "label": "external call",
        "timeout": { "duration": "3s" },
        "retry": { "attempts": 3, "backoff": "exponential", "initial": "100ms", "jitter": true },
        "body": [ /* statements */ ],
        "catchBlock": { "label": "exhausted", "body": [ /* */ ] },
        "finallyBlock": { "body": [ /* */ ] }
      },
      { "kind": "alt", "cases": [{ "condition": "ok", "body": [...] }], "elseBody": [...] },
      { "kind": "opt", "condition": "debug", "body": [...] },
      { "kind": "par", "branches": [{ "label": "cache", "body": [...] }], "awaitSpec": { "labels": ["cache"] } },
      { "kind": "loop", "condition": "more rows", "body": [...] },
      { "kind": "await", "labels": ["cache", "log"] }
    ]
  }
}
```

### view.layout (RFC 0002)

```json
{ "layout": { "direction": "LR", "engine": "elk", "spacing": 40, "align": "center" } }
```

### GanttTask.dependsOn — PMBOK form (RFC 0024)

```json
{
  "dependsOn": [
    "task-a",                                              // short: FS + lag=0
    { "id": "task-b", "kind": "SS", "lag": 2 },
    { "id": "task-c", "kind": "FF", "lag": 0 },
    { "id": "task-d", "kind": "SF", "lag": -1 }
  ]
}
```

### ir.meta.imports (RFC 0009 / 0014)

```json
{
  "meta": {
    "imports": [
      { "kind": "ns",   "value": "pm_core" },
      { "kind": "path", "value": "./tasks/sprint-1.umlay", "alias": "sprint1" },
      { "kind": "path", "value": "./tasks/*.umlay" }
    ]
  }
}
```

## Fields arriving in spec 1.0 RC

Accepted RFCs not yet in `ir.schema.json` (Zod-generated):

- `namespace.protocols[]` / `namespace.unions[]` / `namespace.impls[]` (RFC 0006 / 0010 / 0016 / 0020)
- `model.sampleSources[]` (RFC 0004 / 0008)
- `view.criticalPath` (RFC 0024)
- `attribute.deprecated` / `attribute.experimental` (RFC 0023 / 0027)

See [`migration-guide-1.0.md`](./migration-guide-1.0.md) §4.

## Reference-implementation APIs (`@umlay/core` 1.1+)

Companion APIs shipped alongside the IR by the reference parser:

### `parseLiterate(source)` — RFC 0031 Layer C

Extracts ` ```umlay ` fenced blocks from a Markdown document, concatenates
them, and parses the result as one IR. Diagnostic line numbers are remapped
back to the original Markdown. Use for `.umlay.md` files.

```ts
import { parseLiterate } from '@umlay/core';
const { ir, blocks, hasUmlay, diagnostics } = parseLiterate(mdSource);
```

### `irToDsl(ir)` — canonical formatter (round-trip)

Regenerates a `.umlay` source from an IR. Drives format-on-save, codegen
reconciliation, and golden-file test fixtures.

```ts
import { parse, irToDsl } from '@umlay/core';
const { ir } = parse(source);
const formatted = irToDsl(ir);
parse(formatted);   // round-trips
```

Covered: namespaces, enums, models (stereotype + intent + identity +
attributes), relations, block directives (`@@id` / `@@unique` / `@@index`
/ `@@dependencies` / `@@implements` / `@@codegen` / `@@doc` / `@@md`),
views (include / exclude / layout / criticalPath), `docTrailer`.

**Not yet covered (as of 1.1)**: protocols, unions, impl blocks,
sequence-body rich form, Gantt task tables. Round-tripping an IR with
these parts will lose some detail.

### `expandSampleFileRefs(ir, { readFile })` — RFC 0008

Resolves `@@sample(from: "./file.jsonl")` external references through a
caller-supplied `readFile` callback and appends rows to
`model.sampleSources[]`.

```ts
import { expandSampleFileRefs } from '@umlay/core';
await expandSampleFileRefs(ir, { readFile: (p) => fs.readFileSync(p, 'utf8') });
```

### `renderDocument(ir, opts)` — IR → Markdown + inline SVG (`@umlay/renderer-er`)

Composes a full Markdown document with diagrams inlined as SVG. Powers
the web editor's Document Mode and literate-ready exports.

```ts
import { renderDocument } from '@umlay/renderer-er';
const md = await renderDocument(ir);
// Feed to any Markdown renderer — inline <svg> survives because the
// renderer emits raw HTML alongside the Markdown source.
```

### `parseSelector(raw)` / `projectIrForView(ir, view)` — RFC 0032 (1.2+)

Type-safe decoding for the selector strings in `view.include` /
`view.exclude` (`visibility:private`, `seq:critical`, `**.attr`,
`stereotype:X`, `kind:X`) plus a one-pass view projection used by
renderers.

```ts
import { parseSelector, projectIrForView } from '@umlay/core';
const projected = projectIrForView(ir, view);
// projected models reflect the view's exclude list.
```

### `buildIrDiffSummary(before, after)` / `irDiffToPrompt(summary)` (1.2+)

Produces a structured diff suited for an LLM prompt. Picks up
renamed / added / removed models, attribute changes, intent shifts,
and stereotype changes. Used by AI review and codegen reconcile flows.

```ts
import { buildIrDiffSummary, irDiffToPrompt } from '@umlay/core';
const summary = buildIrDiffSummary(prevIr, ir);
const md = irDiffToPrompt(summary);   // Markdown string ready for a prompt
```

### `findModelsNeedingIntent(ir)` / `generateIntentDrafts(ir, llm)` (1.2+)

Enumerate every model whose `@intent(...)` is missing or blank, then
ask the LLM for concise drafts in a single round-trip. Uses the
`LLMClient` interface so production plugs in BYOK clients while tests
use `MockLLM`.

```ts
import {
  findModelsNeedingIntent,
  generateIntentDrafts,
} from '@umlay/core';

const gaps = findModelsNeedingIntent(ir);
const drafts = await generateIntentDrafts(ir, llmClient);
// drafts is `{ namespace, name, intent }[]`
```

## See also

- [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json) — auto-generated via `pnpm --filter @umlay/core gen:ir-schema`
- [DSL Guide](./dsl-guide.md)
- [Design Principles](./design-principles.md)
- [Lint Rules](../../packages/spec/src/lint-rules.md)
- [Conformance helper](../../packages/spec/src/conformance/match.ts) — `assertIRMatches`
