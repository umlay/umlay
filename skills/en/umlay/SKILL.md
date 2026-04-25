---
name: umlay
version: 1.4.0
spec: "@umlay/spec >= 1.4.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer, architect, reviewer]
summary: Consultation skill that picks the right Umlay skill in at most 2 questions
description: Use only when the user is starting from "I want to use Umlay but don't know which skill to invoke" — i.e. their intent has not yet been narrowed to a verb. When the intent is concrete (review / import / plan / etc.) the dedicated skill (review-uml / reverse-engineer / plan-from-diff …) auto-invokes directly; this consultation should NOT intercept those.
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# umlay (consultation entry-point)

## Goal

Verbalise the user's goal in **at most 2 questions** and recommend the next skill to invoke as a single one-line command. This skill **does not implement, generate, or audit anything**; the only deliverable is "call this skill next".

## When to fire / not fire

| Fire | Don't fire |
| --- | --- |
| "I want to start using Umlay — where do I begin?" | "Review this `.umlay`" → `review-uml` directly |
| "Which `/<skill>` do I need?" | "Convert Prisma to Umlay" → `reverse-engineer` directly |
| "Take me from current state to an implementation plan" | "Generate a migration plan" → `plan-from-diff` directly |
| Goal is **not yet a verb** | Goal already maps to a single skill |

If a skill name is already implicit in the user's phrasing, that dedicated skill auto-invokes via its own `description`. This consultation is for ambiguous intent only.

## The 7 skills — at a glance

| Skill | Role | Input → Output |
| --- | --- | --- |
| `write-uml` | Requirements → first `.umlay` | Natural-language requirements → `.umlay` v0 |
| `reverse-engineer` | Existing code → `.umlay` import | Prisma / SQL / TS → structural `.umlay` |
| `review-uml` | `.umlay` quality audit (spec / lint / risk) | `.umlay` → finding list |
| `evolve-schema` | Compatible diff over an existing `.umlay` | current `.umlay` + requirements → next `.umlay` |
| `change-impact-diff` | Concept-first change-impact report | old + new IR → Purpose / Touch / Miss + Risk |
| `plan-from-diff` | Impact → sequenced implementation plan | impact → phase / PR / rollback |
| `codegen-mapping` | IR → Prisma / SQL / TS | IR → code delta |

## Procedure

### Step 1 — first question

> Which of these is closest? (a) **New** — no `.umlay` yet / (b) **Existing change** — `.umlay` or the target code already exists / (c) **Codegen only** — IR already settled / (d) **Review only** — audit a `.umlay`

#### Answer (a) — new

Recommend `write-uml`:

```
Next: /write-uml "<requirements in 1-3 sentences>"
Why:  the entry skill for authoring `.umlay` from scratch.
Then: /review-uml for quality audit → /evolve-schema to refine → /codegen-mapping
```

#### Answer (c) — codegen only

```
Next: /codegen-mapping <ir.json or .umlay path>
Why:  deterministic IR → Prisma / SQL DDL / TypeScript.
Note: if you have a `.umlay`, the chain auto-runs parse → IR → mapping.
```

#### Answer (d) — review only

```
Next: /review-uml <.umlay path>
Why:  spec / lint / risk / compatibility audit (4 layers).
Note: for strict mode pass `--mode strict` or put `@@mode(strict)` at the top.
```

#### Answer (b) — existing change → continue to Step 2

### Step 2 — only for (b)

> Which fits best? (b1) **Code-only**: the system is in TypeScript / Prisma / SQL, no `.umlay` yet / (b2) `.umlay` exists and the change to apply is decided / (b3) `.umlay` exists and you want to see the impact of a proposed change / (b4) the change is decided and you want a phased implementation plan

#### (b1) — code-only

```
Next (chain):
  1. /reverse-engineer <schema.prisma or DDL or TS path>
       structural import into `.umlay`.
  2. /review-uml current.umlay
       lock in stereotypes / intent (consume the TODO header).
  3. /write-uml to fill in views (per audience) and @@inv
       restore the "as it should be" of today.
```

#### (b2) — change to apply

```
Next: /evolve-schema <current.umlay> "<change in 1-3 sentences>"
Why:  diff DSL applied while preserving backward compat.
Then: /change-impact-diff (impact) → /plan-from-diff (PR plan) → /codegen-mapping
```

#### (b3) — see impact

```
Next: /change-impact-diff <baseline.umlay> <current.umlay>
Why:  not a line diff — Purpose / Touch / Miss + Risk + Impact + checklist.
Note: the YAML output projects cleanly into PR comments / Slack / release notes.
```

#### (b4) — implementation plan

```
Next: /plan-from-diff <impact.yaml or baseline+current>
Why:  impact → phases (schema / backfill / dual-write / cutover / cleanup / verify)
      + PR splits + rollback annotations. Stays inside the modification scope.
Then: invoke /codegen-mapping for each phase that touches the DSL.
```

## Constraints

- **At most two questions** — a third question is forbidden (that is the dedicated skill's job)
- The output is at most three lines: `Next:`, `Why:`, optional `Then:`
- **Do not encroach on dedicated skills**: never review / plan / generate inline; only recommend
- If two recommendations tie, ask one disambiguation question — e.g. "(b2) or (b3)?"
- If a skill name is already implicit in the user's phrasing, defer to the auto-invocation of that skill instead of running this consultation

## Checklist

- [ ] Step 1 was a 4-choice question
- [ ] If (b), Step 2 was a 4-choice question
- [ ] Recommendation is a single `/skill-name <args>` line
- [ ] One-line reason attached
- [ ] Chain recommendations are numbered, ≤ 3 steps
- [ ] No implementation / audit / generation done in-skill

## Example (full flow)

User: "I want to try Umlay. I already have a Prisma schema."

Router:

```
Which is closest?
(a) Nothing yet (Prisma included — net new)
(b) Existing change — Prisma is there, want to bring it into Umlay
(c) Codegen only (IR already settled)
(d) Review-only on a .umlay
```

User: "(b)"

Router:

```
Which fits best?
(b1) Prisma only, no .umlay yet
(b2) .umlay exists, change to apply is decided
(b3) .umlay exists, want to see the impact of a change
(b4) change decided, want a phased plan (PR splits)
```

User: "(b1)"

Router:

```
Next (chain):
  1. /reverse-engineer schema.prisma
       structural import into a `.umlay`.
  2. /review-uml current.umlay
       lock in stereotypes / intent.
  3. /write-uml to fill views and @@inv.

If unsure, run step 1 and paste the output back.
```

## References

- Static flow table: [`skills/README.md`](../../README.md) — "Workflow recipes"
- Sibling skills: [`write-uml`](../write-uml/SKILL.md) / [`reverse-engineer`](../reverse-engineer/SKILL.md) / [`review-uml`](../review-uml/SKILL.md) / [`evolve-schema`](../evolve-schema/SKILL.md) / [`change-impact-diff`](../change-impact-diff/SKILL.md) / [`plan-from-diff`](../plan-from-diff/SKILL.md) / [`codegen-mapping`](../codegen-mapping/SKILL.md)
