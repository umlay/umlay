---
name: plan-from-diff
version: 1.9.0
spec: "@umlay/spec >= 1.9.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer, architect]
summary: Turn a change-impact report (or raw IR diff) into a sequenced implementation plan — tasks, files, PR boundaries, rollback strategy
description: Use when the user has an Umlay IR delta (new → old) and needs the **next step** — a concrete, ordered set of engineering tasks to ship the change safely. Consumes the output of `change-impact-diff` (or a raw diff) and emits a plan with migration phasing, PR splits, verification hooks, and rollback points.
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# plan-from-diff

## Goal

Given an IR delta (or a `change-impact-diff` report), produce an
**executable plan**: the ordered list of engineering tasks that ships
the change safely from "the `.umlay` is updated" to "prod is on the new
shape".

The plan is the missing link between **concept** (change-impact-diff)
and **codegen** (codegen-mapping). It answers:

> "In what order, split across how many PRs, with which rollback points,
> and with which verification gates?"

## Preconditions

| Item | Content |
| --- | --- |
| Input A | A `change-impact-diff` report (preferred — contains risk, impact, intent) |
| Input A' | Or a raw baseline + current IR pair — this skill will compute the impact inline |
| Input B | The target stack: `{ orm: "prisma" \| "raw-sql" \| "drizzle" \| "typeorm" \| "none", runtime: "node" \| "bun" \| "edge", deploy: "zero-downtime" \| "maintenance-window" }` |
| Optional | Team constraints: merge-freeze dates, reviewer availability, on-call rotation — affects PR sequencing |
| Output | A plan in the shape of §7, projectable into Markdown checklist / GitHub issues / Jira / Linear |

## What this skill is not

- Not a **code generator** — actual Prisma / SQL / TS output belongs to `codegen-mapping`
- Not an **impact analyser** — that is `change-impact-diff` (upstream)
- Not a **quality reviewer** — that is `review-uml`
- Not an **auto-merger** — it emits tasks, not commits. Humans and downstream agents execute

## Determinism contract

- Task **decomposition rules** (§3) are deterministic. Same input + same target stack → same task set and same ordering
- Task **descriptions** (plain-English titles + acceptance criteria) may use an LLM for wording polish, but the **task identity (set + DAG)** must be derivable without one. This makes the plan testable

## 1. Axes of the plan

Every task is tagged on three axes so the plan is projectable to any tracker:

| Axis | Values | Purpose |
| --- | --- | --- |
| **Phase** | `schema`, `backfill`, `dual-write`, `cutover`, `cleanup`, `verify` | Staging order |
| **Surface** | `dsl`, `db-migration`, `app-code`, `view`, `docs`, `ops` | Which artifact the task touches |
| **Risk** | `breaking`, `caution`, `safe` | Inherited from change-impact-diff |

A task without all three tags is under-specified. Reject it.

## 2. Phase semantics

Phases exist in strict order. The planner must not emit a task from a
later phase before all blocking tasks from earlier phases are complete.

| Phase | Meaning | Typical tasks |
| --- | --- | --- |
| **schema** | IR / DSL itself settles | Update `.umlay`, run `codegen-mapping` to regenerate Prisma / DDL |
| **backfill** | Existing data becomes compatible with the new shape | Backfill scripts, data cleansing, shadow columns populated |
| **dual-write** | Old + new shape both served | Application writes both fields, reads old, for the compatibility window |
| **cutover** | Switch reads to new shape | Flip feature flag / config / ORM model; old column still exists as safety net |
| **cleanup** | Remove old shape | Drop old column, delete dual-write code, remove shim |
| **verify** | Confirm the change landed | Metrics, audit logs, query plans, downstream consumers acknowledged |

**Shortcut rule**: for `safe` changes (additive-only, default-backed)
the plan collapses to `schema → verify` (2 phases). **Do not** force
five phases onto a trivial change.

## 3. Task decomposition rules

Each rule takes a change category and emits a fixed set of tasks with
dependencies (DAG edges).

### Rule: model removed

```
[schema]   Update .umlay + regen Prisma (Breaking)
[schema]   Mark model @deprecated in one release first (if policy requires)
[verify]   Grep app code for model references — list must be empty
[cleanup]  Drop table (generates DROP TABLE migration)
[cleanup]  Remove TS types / repositories
Edges: schema → verify → cleanup
```

### Rule: attribute removed

```
[schema]    Update .umlay (remove attribute)
[backfill]  N/A (removal)
[app-code]  Remove all N referrer sites (list from impact scan)
[schema]    Generate DROP COLUMN migration — only after referrers clean
[verify]    Verify query logs no longer mention the column
Edges: schema(DSL) → app-code → schema(DDL) → verify
```

### Rule: nullability tightened (nullable → non-null, NO default)

```
[schema]     Update .umlay (add @default or plan 2-phase)
[backfill]   Write backfill script that fills the new non-null
[dual-write] Application tolerates nullable during rollout
[schema]     Run backfill in prod
[schema]     Alter column to NOT NULL (after verify)
[verify]     Count nulls in column — must be 0
[cleanup]    Remove "tolerates nullable" branch
Edges: schema(DSL) → backfill(code) → dual-write → backfill(data) → schema(DDL) → verify → cleanup
```

### Rule: PK change (identity extended / replaced)

```
[schema]     Update .umlay (new identity)
[backfill]   Populate new PK columns for existing rows
[dual-write] App writes both old + new PK
[schema]     Add unique constraint on new PK (not yet PRIMARY KEY)
[cutover]    Swap PRIMARY KEY in a single txn
[cleanup]    Drop old PK column / old unique
Edges: strict chain, do not parallelise
```

### Rule: `onDelete: CASCADE` added on existing FK

```
[schema]  Update .umlay
[verify]  Enumerate ALL referring rows; confirm cascade is intended (ADR)
[schema]  Apply ALTER FK migration (runs fast; data stays)
[verify]  Regression test: delete a parent in staging, observe children
Edges: schema(DSL) → verify(ADR) → schema(DDL) → verify(test)
```

### Rule: type changed (e.g. int → bigint)

```
[schema]     Update .umlay
[backfill]   Shadow column with the new type
[backfill]   Copy data into shadow column
[dual-write] Write to both
[cutover]    Swap primary reference / rename shadow → target
[cleanup]    Drop old column
```

### Rule: stereotype changed

```
[schema]     Update .umlay
[app-code]   Audit invariant expectations (@@inv, repository boundaries)
[docs]       Write ADR explaining the category shift
[verify]     Run review-uml to confirm no L-rule / R-rule regressions
No DB migration — stereotype is semantics, not DDL
Edges: schema → app-code + docs (parallel) → verify
```

### Rule: model added

```
[schema]     Update .umlay + regen
[schema]     Generate CREATE TABLE migration
[app-code]   Add repository / service stubs (optional, may be same PR)
[view]       Add or extend @er_diagram coverage (write-uml follow-up)
[verify]     Verify parse + renders
Edges: schema → app-code (parallel with view) → verify
```

### Rule: view added / renamed

```
[schema]  Update .umlay (view definition)
[docs]    Update dsl-guide or onboarding to reference the new view
No DB / app-code impact — view is a rendering contract
Edges: schema → docs
```

### Rule: rename (attribute or model)

```
[schema]     Update .umlay with rename
[schema]     Generate rename migration (not DROP + CREATE)
[app-code]   Grep code for old name; update all referrers
[docs]       Update external docs citing the old name
[verify]     Regression run
Edges: schema(DSL) → app-code → schema(DDL) → verify
```

## 4. PR boundary rules

Tasks within a phase can be bundled into a single PR when **all** hold:

1. Same **surface** (don't mix `db-migration` + `app-code` unless the
   deploy is atomic and the diff is small)
2. Same **risk** level (a Safe task next to a Breaking one loses its
   reviewer context)
3. Total diff size manageable for human review (≤ ~400 LOC as a default
   guideline — tune to team norms)

When any of the above fails, split. Bundle title template:

```
[Phase/Surface] <model or area>: <what + why>
```

Examples:

- `[schema/dsl] auth.User: rename email → contactEmail`
- `[backfill/db] auth.User: populate contactEmail from email`
- `[cleanup/db] auth.User: drop email column`

## 5. Verification gates per phase

Every phase emits a **verify-gate task** that must pass before the next
phase begins. The planner bakes these in automatically.

| Phase | Gate |
| --- | --- |
| `schema` | `@umlay/core` parse + `review-uml` (no new S / Strict violations) + `codegen-mapping` dry-run succeeds |
| `backfill` | Count mismatches between old and new shape = 0 in production |
| `dual-write` | Error rate in production unchanged within N σ for M hours |
| `cutover` | Old code path observed 0 calls for ≥ T minutes |
| `cleanup` | No ref in code / docs / telemetry to removed name |
| `verify` | Metrics board updated, ADR merged, on-call briefed |

## 6. Rollback points

For every `breaking` or `caution` task, the plan emits a paired
**rollback** annotation: what to revert, up to which commit, and the
data state needed for the revert to be safe.

```
Rollback for task "alter column NOT NULL":
  revert-to: <commit before ALTER>
  data-state: "all rows must still have the previous NULL-tolerant shape"
  note:      "if any writes happened under the new NOT NULL, backfill
              the shadow column before reverting"
```

Safe-only changesets skip rollback annotations (the revert is trivial
git revert + redeploy).

## 7. Output shape

```yaml
meta:
  generated_at: 2026-04-24T06:00:00Z
  source_diff_hash: <sha1 of the impact report / IR pair>
  target_stack:
    orm: prisma
    runtime: node
    deploy: zero-downtime

summary:
  total_tasks: 12
  phases:      [schema: 4, backfill: 2, dual-write: 1, cutover: 1, cleanup: 2, verify: 2]
  risk:        [breaking: 1, caution: 3, safe: 8]
  blocking_chain_length: 5       # longest dependency chain (min PR count)

tasks:
  - id: T01
    phase: schema
    surface: dsl
    risk: caution
    title: "Update auth.User — rename email → contactEmail, add phone?"
    description: "Apply DSL edit; regenerate Prisma / SQL with codegen-mapping"
    acceptance:
      - "`pnpm typecheck` passes"
      - "`review-uml` reports no new S-level or Strict-promoted violations"
    rollback:
      revert-to: <baseline>
      data-state: "DB still has `email` column"
    depends_on: []
  - id: T02
    phase: backfill
    surface: db-migration
    risk: caution
    title: "Write + apply backfill: contactEmail = email"
    acceptance:
      - "0 rows with contactEmail IS NULL after migration"
    rollback:
      revert-to: T01
      data-state: "safe — contactEmail is additive until T05"
    depends_on: [T01]
  # ...

pr_bundles:
  - title: "[schema/dsl] auth.User: rename email → contactEmail"
    tasks: [T01]
    reviewers: [@data-owner, @auth-lead]
  - title: "[backfill/db] auth.User: populate contactEmail"
    tasks: [T02]
    reviewers: [@dba, @auth-lead]
  # ...
```

This YAML projects cleanly into:

- Markdown checklist (one-line per task, grouped by PR bundle)
- GitHub / Jira / Linear issues (one per task, `depends_on` as links)
- Mermaid Gantt (phase as swim lane, `depends_on` as edges)
- Umlay `@gantt_chart` view (eats own dog food — emit a `.umlay` fragment)

## 8. Procedure

### Step 1 — ingest
Accept either a `change-impact-diff` report or a raw IR pair. If raw,
run `change-impact-diff` internally to obtain risk + impact.

### Step 2 — categorise each change
Map each model-level change to the Rule set in §3. If no rule matches,
emit a task with `phase: schema, surface: dsl, risk: <inherited>` and
a `TODO(author): uncategorised change — please specify phasing`.

### Step 3 — apply decomposition rules
Each triggered rule emits its task list with edges. Collect into a
global DAG.

### Step 4 — compute minimum blocking chain
Find the longest path in the DAG. That is the minimum number of
sequential PRs and the lower bound on deploy steps. Include in the
summary.

### Step 5 — bundle into PRs (§4)
Greedy pack tasks that share phase + surface + risk, respecting size
budget. Emit bundle titles.

### Step 6 — attach verify-gate tasks (§5)
Insert one gate task per phase boundary. Edges: all tasks in phase N →
gate → all tasks in phase N+1.

### Step 7 — attach rollback annotations (§6)
For every `breaking` / `caution` task, compute the rollback reference
and data-state precondition.

### Step 8 — emit output (§7)
Assemble the YAML. Optionally project into the consumer surface
(Markdown, Linear, `@gantt_chart`, etc.).

## Checklist

- [ ] Every change mapped to a §3 rule (or `TODO` if uncategorised)
- [ ] Phase, surface, risk tagged on every task
- [ ] DAG is acyclic; longest chain length reported as lower bound on PR count
- [ ] PR bundles respect phase + surface + risk; size budget noted
- [ ] Verify-gate task present between every phase transition
- [ ] Every breaking / caution task has a rollback annotation
- [ ] Safe-only changesets correctly collapsed to `schema → verify`
- [ ] Output includes hash of source diff for reproducibility

## Example (excerpt)

Change: `auth.User` gains `contactEmail` (rename of `email`) + new `phone: string?`.

Collapsed plan (happy path):

```
T01 schema/dsl    Rename User.email → contactEmail, add phone?  (caution)
T02 schema/dsl    Regen Prisma / SQL                              (caution)
------- verify gate: parse + review-uml + dry-run migration -------
T03 backfill/db   Backfill contactEmail from email                (caution)
T04 app-code      Update 4 referrer sites (list from impact)      (caution)
------- verify gate: all old-column writes routed through shim ----
T05 dual-write    Tolerate both contactEmail + email on write     (caution)
------- verify gate: error rate stable for 24h --------------------
T06 cutover       Drop `email` from Prisma model                  (breaking)
T07 cleanup/db    DROP COLUMN email                               (breaking)
------- verify gate: column not referenced in logs for 24h --------
T08 verify/ops    Metrics dashboard confirmed stable              (safe)
```

PR bundles:

- PR 1: T01, T02 (schema/dsl) — single reviewer, small diff
- PR 2: T03 (backfill/db) — DBA review
- PR 3: T04 (app-code) — service owner review
- PR 4: T05 (dual-write) — service owner review
- PR 5: T06, T07 (cutover + cleanup/db) — **paired** so there is no
  window where old code runs against a dropped column
- PR 6: T08 (verify) — close-out

## Extending the skill

- **New ORM** (Drizzle, TypeORM) → add mapping rules to §3 only where the
  ORM changes phasing. Most rules are schema-semantic and stack-agnostic
- **Different deploy profile** (maintenance-window instead of
  zero-downtime) → collapse `backfill + dual-write + cutover` into a
  single phase gated by the window start. Rollback annotations still
  apply
- **Team-level constraints** (merge freeze, vacation) → annotate
  bundles with `blocked_by: "freeze until 2026-03-05"`; the plan stays
  valid, execution shifts

## References

- Grammar: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- Upstream: [`change-impact-diff`](./change-impact-diff.md)
- Downstream execution: [`codegen-mapping`](./codegen-mapping.md) (generates the actual Prisma / SQL / TS)
- Sibling: [`evolve-schema`](./evolve-schema.md) (in-flight DSL modification; this skill consumes its output)
