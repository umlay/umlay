---
name: change-impact-diff
version: 1.3.0
spec: "@umlay/spec >= 1.3.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, reviewer, architect]
summary: Produce a concept-first change-impact report (not a git-line diff) from a baseline + current Umlay IR pair
description: Use when the user wants to analyse what a change means — not which lines moved. Given two `.umlay` / IR snapshots, produce Purpose / Touch-points / Do-not-miss + risk classification + impact scan + reviewer checklist. Reusable outside the Web Diff tab (PR comments, release notes, Slack summaries).
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# change-impact-diff

## Goal

Turn two IRs (baseline → current) into a **change-impact report**, answering:

> "What is this change **for**, **where** does it ripple, and what would a
> naive line-diff reader **miss**?"

Not "which lines / columns moved" — that is what `git diff` already does.
This skill is the reusable contract behind the Web Diff tab and the VS
Code review strip, packaged so AI agents can emit the same analysis on
PRs, release notes, or Slack summaries.

## Preconditions

| Item | Content |
| --- | --- |
| Input A | `baseline.ir.json` (or `.umlay` to be parsed into IR 1.0) |
| Input B | `current.ir.json` (or `.umlay`) |
| Optional | A short intent note from the author (1–2 sentences). If absent, derive from rationale.intent; if that is absent too, note the gap in the output |
| Output | Structured report with 5 sections (see §8) |

Both IRs must share `version: "1.0"`, `kind: "UmlModel"`. Cross-version diff is out of scope.

## What this skill is not

- Not a **git-style** diff — line / column output belongs to VCS tools
- Not a **review** of the new IR's quality — that is `review-uml`
- Not a **migration plan** — that is `plan-from-diff` (sibling skill)
- Not a **stereotype inference** — that is `reverse-engineer`

The scope is **impact only**: risk + ripple + narrative.

## Determinism contract

- Sections 1–4 (risk / impact / namespace / checklist) are **deterministic** — same IR pair → same output. No LLM involved
- Section 5 (Purpose / Touch-points / Do-not-miss) **requires an LLM** and has a fixed 3-sentence structure. Temperature should be low (≤ 0.3) so the same inputs produce stable narratives

## 1. Risk classification (Breaking / Caution / Safe)

Walk the model-level diff and bucket each change by field-level rules.

### Breaking (🔴) — existing data or callers break

| Trigger | Example |
| --- | --- |
| Model removed | `model User` removed from `current` |
| Attribute removed | `User.email` removed |
| Nullability tightened (nullable → non-null) | `name: string?` → `name: string!` |
| PK changed (identity or `@id` moved) | `identity: [id]` → `identity: [tenantId, id]` |
| Required attribute added without default | `model Order` gains `currency: string!` with no `@default(...)` |

### Caution (🟡) — needs a migration plan or ADR

| Trigger | Example |
| --- | --- |
| Stereotype changed | `@entity` → `@aggregate_root` (or any cross-category change) |
| Rename (same `_id` hash, different `name`) | `total` → `grandTotal` |
| `onDelete: CASCADE` added on existing `@ref` | `@ref(Order.id, onDelete: RESTRICT)` → `CASCADE` |
| `@unique` added to an existing attribute | |
| Type changed | `int` → `bigint`, `string` → `UUID`, `decimal @scale(2)` → `@scale(4)` |

### Safe (🟢) — additive-only, backward-compatible

| Trigger | Example |
| --- | --- |
| Model added | new `model InvoiceLine` |
| Nullable attribute added | `memo: string?` |
| Default-backed non-null added | `status: OrderStatus! @default(DRAFT)` |
| Doc-only edit | `@@md` / `@@doc` text changed |

**When unsure**, bucket **up** (Caution before Safe, Breaking before Caution). False alarms cost a reviewer a minute; missed Breakings cost the release.

Canonical: `apps/web/lib/ir-diff-risk.ts` in the reference implementation.

## 2. Impact scan (ref / view / participant)

For every model in the changed-set, walk the **current** IR and collect:

| Kind | Rule |
| --- | --- |
| `ref` | Any attribute whose `ref.target` resolves back to this model (`User.id` / `auth.User.id` — parse right-to-left for the last PascalCase) |
| `view` | Any `view X { include: ... }` where the include pattern (exact `ns.Model` / `ns.*` / `**`) covers this model |
| `participant` | Any sequence diagram participant whose declared model resolves to this one |

Emit the **full list**, not counts — reviewers need names to open follow-up PRs.

Canonical: `apps/web/lib/impact-report.ts`.

## 3. Namespace grouping

Cluster changed models under their namespace before any detail. Readers need feature-level orientation before drilling in:

```
auth       (3 changes) — User, Session, PasswordReset
billing    (1 change)  — Invoice
```

When a change crosses namespaces (e.g. a new FK from `billing.Invoice` to `auth.User`), list it under **both**, clearly tagged:

```
auth    — User       (+ referenced by billing.Invoice.userId)
billing — Invoice    (+ new @ref → auth.User.id)
```

## 4. Reviewer checklist (rule-based, no AI)

Cross-join risk × impact and emit actionable TODOs. Examples:

| Trigger | Checklist item |
| --- | --- |
| Attribute removed + ≥1 referrer | `Plan DB column-drop migration` + `Update N referrer sites: [Order.customerId, Report.customerId]` |
| `onDelete: CASCADE` added | `Verify cascading delete is intended` |
| Stereotype changed | `Document the semantic shift (ADR)` |
| View includes a changed model | `Re-review N views: [auth-overview, senior-review]` |
| Sequence participant resolves to a changed model | `Re-validate sequence flow: [checkout-happy-path]` |
| Nullable → non-null (no default) | `Plan backfill migration + add default or 2-phase deploy` |
| New model with `@aggregate_root` | `Confirm repository boundary + add @@inv` |

**De-dupe by (target, action)**. A checklist with 40 entries is worse than one with 12 — merge aggressively.

Canonical: `apps/web/lib/review-checklist.ts`.

## 5. Purpose / Touch-points / Do-not-miss (LLM narrative)

The **only** LLM-generated section. Fixed 3-sentence structure — do not vary.

### Prompt template

```
You are reviewing a change to a DSL model. Emit exactly three sentences
in this order and nothing else. No preamble, no bullets.

1. PURPOSE — What business / product outcome does this change enable?
   Lead with the noun, not "The change ...".
2. TOUCH POINTS — Which downstream components must pick this up? Cite
   specific model / view names from the impact list below.
3. DO-NOT-MISS — What is the one thing a naive diff read would miss
   (migration, cascade, semantic shift, ordering)?

---
AUTHOR INTENT (if provided): {{authorIntent or "none"}}
RATIONALE.INTENT OF CHANGED MODELS (if any):
{{modelIntents}}

RISK SUMMARY:
  breaking: {{breakingCount}} ({{breakingNames}})
  caution:  {{cautionCount}}  ({{cautionNames}})
  safe:     {{safeCount}}

IMPACT MAP (current IR):
{{impactYaml}}

STRUCTURAL DIFF:
{{modelDiffList}}
```

### Why this shape

- **Intent + Impact injected** → the LLM cannot paraphrase the diff;
  it has to say what the change is **for** and where it lands
- **Fixed sentence count** → output is cacheable, testable, and stable
  across providers (Anthropic / OpenAI / WebGPU)
- **No bullets / no preamble** → embeds cleanly in PR comments, Slack,
  release notes without reformatting

### Failure modes to reject

If the LLM returns any of the following, regenerate once, then escalate:

- Four or more sentences ("Also, …", "Additionally, …")
- Any sentence that starts with "This PR …" / "The change …" (passive framing)
- Any sentence that is a pure paraphrase of the structural diff

## 6. Model intent surfacing

For each changed model, include its `rationale.intent` (italicised in
rendered output) **directly under the name** before the attribute diff.
Purpose anchors the reader before they see field changes.

If `rationale.intent` is missing, emit a ⚠️ flag — the author lost the
"why" for this model.

## 7. Before / After sanity check

Where possible, render the baseline IR and current IR as ER (or class)
diagrams side-by-side. Use `@umlay/renderer-er` (`renderER`) with
`diffOverlay: { added, modified }` on the current side — added models
get green halo, modified get amber. This is visual sanity, not content.

Skip when the environment cannot render SVG (pure text surfaces like
Slack) — the narrative + checklist are enough.

## 8. Output shape

```yaml
meta:
  generated_at: 2026-04-24T06:00:00Z
  baseline_hash: <sha1 of baseline IR>
  current_hash:  <sha1 of current IR>

narrative:                                # §5
  purpose:        "..."
  touch_points:   "..."
  do_not_miss:    "..."

risk:                                     # §1
  breaking:  [User.email removed, Order.total → decimal @scale(4)]
  caution:   [User renamed email → contactEmail]
  safe:      [model InvoiceLine added]

groups:                                   # §3
  - namespace: auth
    changes:
      - model:   User
        intent: "The authenticated end-user — owns sessions, not data"
        delta:  { added: 0, removed: 1, modified: 1, renamed: 1 }
        impact:
          ref:         [Session.userId, Order.customerId]
          view:        [auth-overview, senior-review]
          participant: [checkout-happy-path]
  - namespace: billing
    changes: [...]

checklist:                                # §4
  - "Plan DB column-drop migration for User.email"
  - "Update 2 referrer sites: Session.userId, Order.customerId"
  - "Re-review auth-overview, senior-review"
```

Renderers can project this into Markdown, Slack blocks, or the Web Diff
tab's component tree.

## 9. Procedure

### Step 1 — load + canonicalise
Parse both inputs into IR 1.0. If either is `.umlay`, run through
`@umlay/core` first. Reject version mismatches.

### Step 2 — structural diff
Call `buildIrDiffSummary(baseline, current)` (or reproduce the walk:
model × attribute × relation × view × sequence). Collect added /
removed / modified / renamed sets.

### Step 3 — risk bucket (§1)
Classify each element-level change. Cache the results per `_id`.

### Step 4 — impact scan (§2)
For every changed-model `_id`, scan the **current** IR's refs, views,
participants. Build the impact map.

### Step 5 — namespace grouping (§3) + intent lookup (§6)
Cluster changes by namespace; look up `rationale.intent` for each
changed model; flag missing.

### Step 6 — checklist emission (§4)
Cross-join risk × impact; apply rules; de-dupe.

### Step 7 — LLM narrative (§5)
Render the prompt with `authorIntent`, impact map, structural diff.
Call LLM at temperature ≤ 0.3. Retry once on shape failure; on second
failure, emit the deterministic sections without the narrative and
flag it.

### Step 8 — assemble output (§8)
Emit the YAML shape (or project into Markdown / Slack for the
specific channel).

## Checklist

- [ ] Both IRs validated against schema 1.0
- [ ] Structural diff produced (added / removed / modified / renamed)
- [ ] Every element-level change bucketed into Breaking / Caution / Safe
- [ ] When ambiguous, bucketed **up** (conservative)
- [ ] Impact scan enumerates names, not counts
- [ ] Models clustered by namespace; cross-namespace changes listed under both
- [ ] `rationale.intent` surfaced per changed model (or flagged missing)
- [ ] Checklist rules applied + de-duped by (target, action)
- [ ] LLM narrative is exactly three sentences, no preamble
- [ ] Narrative cites **specific** model / view names, not generic phrasing
- [ ] Output includes baseline / current IR hashes so it is reproducible

## Example (excerpt)

Input delta:

```diff
-  email     string! @unique
+  contactEmail string! @unique
+  phone     string?
```

Output narrative:

> **Purpose**: Centralise customer contact on a single explicit field so
> the CRM team can drive outbound campaigns without guessing which column
> holds the reachable address.
>
> **Touch points**: `auth.Session`, `billing.Order.customerId` keep
> pointing to `User.id` — no schema break on the FK side — but the two
> ER views `auth-overview` and `senior-review` need re-rendering, and the
> sequence `checkout-happy-path` references `User.email` directly (line
> 42 of the DSL).
>
> **Do-not-miss**: This is a **rename + added sibling**, not a pure add.
> The migration needs to backfill `contactEmail` from `email` in a single
> statement before the old column is dropped; otherwise open sessions
> break on the next read.

Output checklist:

- Plan DB column rename `email` → `contactEmail` with backfill
- Update sequence `checkout-happy-path` line 42 (`.email` reference)
- Re-render views `auth-overview`, `senior-review`
- Confirm `phone` is intentional (new attribute, Caution)

## Extending the skill

- Different **audience** (exec / architect / SRE) → adjust the LLM
  prompt's focus, not the structural sections. The 3-sentence shape
  stays fixed
- Different **output surface** (PR comment / Slack / release note) →
  change the projection of §8's YAML. The YAML itself is the contract
- Different **risk policy** (e.g. PostgreSQL-only teams may treat
  `varchar` size reduction as Breaking) → extend §1 rules, do not
  change the shape

## References

- Grammar: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- Canonical risk classifier: `apps/web/lib/ir-diff-risk.ts` (reference impl)
- Canonical impact builder: `apps/web/lib/impact-report.ts`
- Canonical checklist rules: `apps/web/lib/review-checklist.ts`
- Sibling: [`plan-from-diff`](./plan-from-diff.md) — next step after impact
- Upstream: [`review-uml`](./review-uml.md) — quality review (not impact)
