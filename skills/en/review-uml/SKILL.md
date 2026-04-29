---
name: review-uml
version: 1.8.0
spec: "@umlay/spec >= 1.8.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, reviewer]
summary: Mechanically review Umlay DSL / IR for spec conformance and design quality
description: Use when the user asks to review, audit, or analyse an existing Umlay DSL / IR. **First check that the input parses** (LEX / PARSE / IR errors), then walk through spec conformance, lint violations, and design risks. Produces structured `@review` / `@fix` annotations.
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# review-uml

## Goal

Given a `.umlay` file (or IR JSON), detect issues across **four layers**:

0. **Parse errors** — input doesn't tokenise, parse, or build an IR. **Highest priority — block other layers when present.**
1. **Spec violations** — input parses but trips an `S` rule (S11–S17)
2. **Lint violations** — syntactically fine but missing / vague (L001–L056)
3. **Design risks** — structural antipatterns (R01–R12)

## Inputs / Outputs

| Item | Content |
| --- | --- |
| Input | `.umlay` text or IR JSON (version 1.0) |
| Output | List of findings (severity / location / rule ID / suggested fix) |

## Rule Catalog (single source of truth)

All rules used for review are normatively defined in [`packages/spec/src/lint-rules.md`](../../packages/spec/src/lint-rules.md). This skill does **not** restate the full tables; it only references the category prefixes and rule IDs.

| Prefix / Code | Purpose | Severity | Range |
| --- | --- | --- | --- |
| **`LEX` / `PARSE` / `IR`** | Parser-emitted diagnostics (Layer 0) | error (blocker) | single string codes |
| **S** | Spec violation (grammar violation, blocker) | error (blocker) | S01–S99 |
| **L** | Lint (mode-dependent conventions) | mode-dependent | L001–L199 |
| **R** | Risk (design antipattern, heuristic) | warn / info | R01–R99 |
| **W** | Warning (deprecated / experimental use) | info | W001–W099 |
| **C** | Compatibility (spec version mismatch) | warn | C001–C099 |

### Layer 0: Parse errors (top blocker)

`@umlay/core` emits these **before** the lint package even runs, so they
never appear in the `S/L/R/W/C` catalog. Three codes:

| `code` | Meaning | Source |
| --- | --- | --- |
| `LEX` | Tokeniser cannot read the bytes | Chevrotain lexer |
| `PARSE` | Token stream doesn't match the grammar | Chevrotain parser |
| `IR` | Parsed but Zod IR build failed | `IRSchema.parse()` |

If any error-severity Layer-0 finding exists, **stop the review here**.
Layers 1–3 assume a complete IR; running them on a partial IR yields
false positives and false negatives.

#### Pitfall hints (auto-attached by the parser)

For `code: PARSE`, `addPitfallHint` recognises five patterns AI agents
and newcomers commonly hit and appends a `\n  Hint: ...` line to the
message. Always read the hint when surfacing the finding:

| Hint | Pattern | Fix |
| --- | --- | --- |
| **A** | `attr: Type` (Prisma-style colon) | drop the colon (`attr Type`). Spec 1.6.3+ tolerates it inside attribute decls but not in enum bodies / view headers |
| **B** | `attr = Type` | colon / equals are not separators; `=` is reserved for `type X = Y` aliases only |
| **C** | `model Foo:` (Python/YAML style) | model bodies use `{ ... }`, not `:` |
| **D** | `fn name() => T` / `fn name(): T` | `fn name() -> T` (single arrow) |
| **E** | `@@directive(...)` at a header | `@@` is body-only; headers take single-`@` annotations |

#### Already-tolerated AI traps (no hint, just works since 1.6.x)

These were rejected before 1.6 but are now accepted by parser tolerance
upgrades — useful to know when reviewing pre-1.6 samples migrating
forward:

| Input | Pre-1.5 behaviour | Current behaviour |
| --- | --- | --- |
| `'single-quoted'` strings | `LEX` | accepted (1.6.0+) |
| `@@min-spec-version("1.7")` hyphenated arg | `PARSE` | accepted (1.6.1+) |
| `@maxLength(1024)` retained in IR | silently dropped | stored on `attribute.constraints.maxLength` (1.6.2+) |
| `@@identity(a, b, \`date\`)` backtick-escaped reserved word | `PARSE` | accepted (1.6.4+) |

#### How to extract them

```sh
umlay check schema.umlay --json | jq '.diagnostics[] | select(.code == "LEX" or .code == "PARSE" or .code == "IR")'
```

Filter by `code` to isolate parser-layer findings; each one carries a
`range` with line / column.

### Layer 1: Spec violations (blocker) — see `lint-rules.md` S section

- Parser succeeded but an S-rule (S11–S17) flagged the IR
- All modes: **error** (mandatory)
- Any single hit → report as blocker and do NOT proceed to later layers

### Layer 2: Lint violations — see `lint-rules.md` L section

- L001–L016 (as of spec 0.8.0); Draft / Strict severities defined in the catalog
- L034–L036 — view selectors (RFC 0032, spec 1.2+)
- **L037–L039** — `@composite` views (spec 1.3+): `@@include` in a non-composite / unresolved view id / include cycle
- **L040–L045** — traits (spec 1.3+): model ↔ trait name collision / two traits contributing the same attr / include cycle / unused trait / tiny trait / unknown trait
- **L046–L049** — metadata-bundle consistency (RFC 0049 / spec 1.6.1+):
  - L046: surface every `@@locked` element as info, recommend `@@adrRef`
  - L047: `@@boundary.exposes` / `hides` ghost references
  - L048: PII / GDPR / PCI-DSS attribute in a model that has no reject `@@example`
  - L049: `@@example` × structured `@@inv(field, op, value)` mismatch (expect=accept but inv broken / expect=reject but inv satisfied)
- **L050–L056** — state machine ↔ event ↔ sequence integrity (RFC 0050 / 0051 / 0052, spec 1.7+):
  - L050: a `state_machine` view has a transition with no covering `fn @pre/@post`
  - L051: `fn @pre/@post` references a state name that isn't in the enum
  - L052: enum value is unreachable (not the initial state, not the target of any `@post`)
  - L053: `fn` on a state-bearing model that doesn't transition state and isn't called from any sequence
  - L054: a sequence message calls a method that doesn't change state (likely consistency drift)
  - L055: `@emits(EventName)` references an undeclared event
  - L056: a declared event is never emitted or referenced
- **L057** — multi-seq integrity (RFC 0053, spec 1.8+): when a view has
  2+ `seq` blocks, each must have a unique name (`seq <Identifier> { ... }`).
- `@@mode(strict)` will promote all rules to error at spec 1.0 (see migration-guide-1.0.md)

### Layer 3: Design risks — see `lint-rules.md` R section

- R01–R12 structural heuristics
- Attach a suggested fix (split / rename / boundary redesign) to each finding

### Layer 4: Deprecated / Compatibility — see `lint-rules.md` W / C sections

- W001 / W002: usage of `@deprecated` / `@experimental` elements
- C001 / C002: spec version deltas, `min-spec-version` mismatch

## Procedure

### Step 0 — Parsability check (top blocker)

1. Run `umlay check <file> --json` (or call `parse(source)` directly)
2. Filter `diagnostics[]` for `code in {LEX, PARSE, IR}`
3. If any error-severity finding exists, **stop here and return**:

   ```yaml
   findings:
     - layer: parse
       rule: PARSE
       severity: error
       location: { line: 12, column: 8 }
       message: "Expecting token of type --> Identifier <-- but found --> ':' <--"
       hint: "Hint A — Umlay's canonical attribute form omits the colon (`id UUID! @id`, not `id: UUID!`)..."
       fix: "Drop the colon: `attr Type` (not `attr: Type`)"
   ```

4. Only when parsing is clean do we move to Steps 1–3.

### Step 1 — Spec conformance

1. The IR is already validated by Step 0 (Zod runs as part of `parse`)
2. Walk through `lint-rules.md` S section (S11–S17) using `@umlay/lint`
3. **If even one violation exists, return them as blockers without proceeding to later layers**

### Step 2 — Lint detection

1. Read `@@mode` at the file top (default `draft` if missing)
2. Evaluate `lint-rules.md` L section (L001–L016) at the severity appropriate for the mode
3. Record violation locations per attribute / relation / view / model

### Step 3 — Risk heuristics

1. Compute `lint-rules.md` R section (R01–R12): structural statistics / antipattern matching
2. Attach a **suggested fix** to each (split / rename / boundary redesign, etc.)

### Step 3.5 — Deprecated / Compatibility notices

1. Collect W001 / W002 hits (usage of `@deprecated` / `@experimental`)
2. Emit C001 / C002 if spec version deltas or `min-spec-version` mismatches are detected

### Step 4 — Report shape

```yaml
findings:
  - layer: parse                         # Layer 0
    rule: PARSE
    severity: error
    location: { line: 8, column: 12 }
    message: "Expecting token of type --> Identifier <-- but found --> '@@' <--"
    hint: "Hint E — `@@directive(...)` is body-only. Move @@confidence inside `{ ... }`."
    fix: "Move `@@confidence(0.6)` into the model body"
  - layer: spec                          # Layer 1
    rule: S03
    severity: error
    location: "ordering.Invoice"
    message: "Unknown stereotype '@master'. Allowed: entity / aggregate_root / value_object / service / interface"
    fix: "Replace '@master' with '@aggregate_root'"
  - layer: lint                          # Layer 2
    rule: L001
    severity: warn
    location: "ordering.Order.total"
    message: "Attribute lacks explicit visibility"
    fix: "Prefix with '-' (private) or '+' (public)"
  - layer: lint                          # Layer 2 (spec 1.7)
    rule: L055
    severity: warn
    location: "shop.Order.confirm"
    message: "@emits(OrderConfirmed) — そのような event 宣言が見つかりません"
    fix: "Declare `event OrderConfirmed { ... }` or rename the @emits target"
  - layer: risk                          # Layer 3
    rule: R04
    severity: info
    location: "ordering.Order"
    message: "aggregate_root without @inv / @pre / @post"
    fix: "Add invariants describing domain rules"
```

## Example input

```prisma
namespace ordering

model Order @master {                        // ← S03: unknown stereotype
  id         UUID! @id
  customerId UUID! @ref(Customer.id)         // ← L003: Customer undefined
  totaL      Money                           // ← L001: visibility/nullability missing
}

view shop @er_diagram {
  include: ordering.*
  model ExtraFoo { id UUID! }                // ← S02: model body inside a view
}
```

Findings:

1. `S03` `Order @master` — unknown stereotype; use `@aggregate_root`
2. `S02` Views cannot contain model bodies; move out
3. `L003` `Customer.id` unresolved — add `model Customer`
4. `L001` `totaL` missing visibility — use `-totaL` etc.
5. Nullability missing — error in Strict, defaults to `!` in Draft
6. `Money` undefined — declare `type Money @value_object { ... }` first

## Matching the review grain — View Selectors (RFC 0032, spec 1.2+)

When one `.umlay` serves multiple reviewer audiences, **make the grain
explicit via view selectors** instead of saying "ignore this part" in
prose. The view name + its `exclude:` list become the contract.

```umlay
view exec @sequence_diagram {
  // PM / exec view — hide critical / catch / opt to show the happy path.
  include: auth.Browser, auth.App, auth.Google, auth.AppCallback
  exclude: seq:critical, seq:opt, seq:alt
}

view senior-review @sequence_diagram {
  include: auth.*
  exclude: seq:catch, seq:finally        // retry frame in scope, cleanup out
}

view er-overview @er_diagram {
  include: auth.*
  exclude: visibility:private, **.createdAt, **.updatedAt, stereotype:service
}
```

Review checklist:

- Is the view name (`exec`, `senior-review`, `sre`, …) aligned with
  **who** will read it?
- Is the `exclude` list too aggressive (hiding important `critical` /
  `catch`) or too lax (keeping audit columns that add noise)?
- Are L034 (unknown selector) or L035 (zero-match exclude) firing?

See RFC 0032 and [dsl-guide §10.6](../../docs/en/dsl-guide.md).

## Recommended workflow — use the Web Diff tab

Umlay's Diff tab is designed for **change-impact analysis**, not
git-style line diffs. It surfaces *what a change is for / where it
ripples / what a naive read would miss* instead of "here's every field
that moved".

### Reading order (top-down)

1. **Risk header** (🔴 Breaking / 🟡 Caution / 🟢 Safe) — 1+ breaking ⇒
   prioritise verifying those
2. **🤖 AI change-impact summary** button → three fixed sentences:
   - ① **Purpose**: the business/product outcome this change enables
   - ② **Touch points**: downstream components that must pick it up
     (specific model / view names)
   - ③ **Do-not-miss**: the single thing a naive diff read misses
     (migration, cascading delete, semantic shift, etc.)
3. **🔀 Before/After comparison** button → side-by-side ER of the
   baseline IR vs. the current IR, purely for visual sanity check
4. **Reviewer checklist** (☑ rule-based, no AI): auto-generated
   actionable TODOs from the Risk × Impact crossjoin:
   - attribute removed → "Plan DB column-drop migration" + "Update
     N referrer sites"
   - CASCADE added → "Verify cascading delete is intended"
   - stereotype changed → "Document the semantic shift (ADR)"
   - view include hit → "Re-review N views"
   - sequence participant hit → "Re-validate sequence flow"
5. **Namespace grouping**: `auth (3 changes) / billing (1 change)`
   headers let you see feature-level impact before drilling in
6. Each changed model row shows its **intent** ("User is the
   authenticated end-user…") italicised — purpose is anchored before
   the attribute diffs
7. **Impact `<details>`** per model, broken into `ref` / `view` /
   `participant` hits
8. **Hotspot overlay** on the ER / Class canvas (green = added,
   amber = modified) shows visual distribution

### Severity matrix

| Color | Criterion | Examples |
| --- | --- | --- |
| 🔴 Breaking | Existing data / callers break | model removed, attribute removed, nullable→not-null, PK change |
| 🟡 Caution | Needs a migration plan or an ADR | stereotype change, rename, `onDelete: CASCADE` added, UNIQUE added, type change, non-null attribute added w/o default |
| 🟢 Safe | Additive-only, backward-compatible | model added, nullable attr added, default-backed add, doc-only |

### When the structural diff isn't available

First-time review / no snapshot yet → fall back to Layers 1–4.

Canonical: `@umlay/core`'s `buildIrDiffSummary` + `apps/web/lib/ir-diff-risk.ts`.
Checklist generation rules: `apps/web/lib/review-checklist.ts`.

## spec 1.3 review checkpoints

- **trait (RFC 0034)**: flag traits with < 2 attrs (L044, possible
  over-abstraction). Unused traits → L043 warn. Include cycles → L042
  error.
- **@composite (RFC 0033)**: watch for L038 (unresolved child view id
  — usually a typo). Composite-of-composite loops → L039 error.
- **@abstract models**: ensure at least one concrete model realises
  the abstract one; otherwise the hierarchy has no users.
- **@static / @readonly / @derived**: when codegen is in play
  (Prisma / SQL / TS), call out how each modifier should map — e.g.
  `@derived` typically becomes a getter, not a DB column.
- **Backtick idents** (`` `limit` ``): reviewer must confirm whether
  the downstream DBMS quotes identifiers (MySQL backticks, Postgres
  double quotes). Codegen dialect matters.
- **ER layout**: with ≥ 8 tables and no `layout.direction`, the
  renderer auto-switches to DOWN. If the reviewer expects LR (wide
  screen docs), add `layout: direction(LR)` explicitly.

## spec 1.6 review checkpoints (RFC 0038–0044 + RFC 0049)

Metadata-bundle review checklist:

| Concern | Directive / lint | What to inspect |
| --- | --- | --- |
| Ownership | `@@owner(team:..., reviewer:...)` | Aggregate-roots / public-API models without `@@owner` block follow-ups; in strict mode, warn → error candidate |
| Lifecycle state | `@@status("in-review", blockedBy:...)` | Confirm `state == "in-review"` is not left dangling at merge time |
| ADR trail | `@@adrRef("ADR-…")` (L046 recommends one for `@@locked` items) | Design-critical models should reference an ADR |
| AI-import confidence | `@@provenance` / `@@confidence` | Promote `confidence < 0.7` rows to verified one-by-one |
| Compliance | `@@compliance(tags: ["PII", "GDPR"])` | Tags attached at namespace / model / attribute scope; L048 fires when a PII attr has no reject `@@example` |
| Locked elements | `@@locked(reason:...)` | L046 surfaces these as info; cross-check the PR diff against the locked surface |
| Boundary contract | namespace `@@boundary(exposes:[...], hides:[...])` | L047 detects ghost references (rename / delete leftovers) |
| Testable invariants | `@@inv(field:..., op:..., value:...)` + `@@example` | L049 catches example × invariant mismatches — flag "invariant is just a string" anti-pattern |

### Recommended review output

Run the corpus aggregator first, then drill into the highest-firing
rules:

```sh
umlay check schema.umlay --stats --json | jq '.byRule[] | select(.severity != "info")'
```

The structured output feeds directly into `change-impact-diff` and
`plan-from-diff` as input.

## References

- Grammar: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- Reserved words: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts)
- **Lint rule source of truth**: [`packages/spec/src/lint-rules.md`](../../packages/spec/src/lint-rules.md)
- Type inference rules: [`packages/spec/src/type-inference.md`](../../packages/spec/src/type-inference.md)
- Related skills: [`write-uml`](./write-uml.md), [`evolve-schema`](./evolve-schema.md)
