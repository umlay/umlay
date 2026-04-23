# RFC 0032 — View Selectors (expressive `include` / `exclude`)

- Status: **Accepted (Phase 1 implemented in spec 1.2.0-draft)**
- Class: **A — additive** (existing DSL keeps working verbatim)
- Target release: spec **1.2.0**
- Supersedes: nothing
- Related: RFC 0002 (view layout), RFC 0009 (imports)

## Motivation

Sequence diagrams that exercise RFC 0017 (critical / retry / catch / finally)
can easily reach 80+ messages. ER models with 30 attributes produce walls
of text. Reviewers ask for *progressive disclosure*: a PM wants the 5-message
overview; a senior reviewer wants the API contract; an SRE wants only the
error/retry paths.

Today, `include` and `exclude` only accept model-name patterns
(`auth.*`, `auth.User`). To slice the diagram by anything else — visibility,
stereotype, relation kind, sequence-body kind, attribute name — you must
duplicate the model declarations in a second file, which violates "one
source of truth".

## Decision

Extend the grammar of `include:` / `exclude:` values from "pattern or
comma-separated patterns" to **`Selector, Selector, …`**, where each
selector is either a bare pattern (the current syntax) or `kind:value`.

### Phase 1 selector kinds

| Selector | Matches | Example |
| --- | --- | --- |
| `ns.Model` / `ns.*` / `**` | model(s) by name | `auth.*` |
| `**.attr` | attributes by name (any model) | `**.passwordHash` |
| `visibility:X` | attributes / methods by visibility | `visibility:private` |
| `seq:X` | sequence-body statement kinds | `seq:critical`, `seq:retry`, `seq:catch`, `seq:finally`, `seq:opt`, `seq:alt` |

### Phase 2 (deferred, spec 1.3)

| Selector | Matches |
| --- | --- |
| `stereotype:X` | models by stereotype (`@aggregate_root`, …) |
| `kind:X` | relations by kind (`composition`, `dependency`, …) |
| `@attr:X` | elements bearing the named annotation (`@attr:deprecated`) |

### Semantics

1. An empty `include` still means "every model in the file". Unchanged.
2. `exclude` is always applied **after** `include`, to the same candidate set.
3. A specific selector overrides a broader one. Given
   `exclude: auth.*, include: auth.User`, `User` still renders.
4. Attribute-level and seq-level selectors keep the enclosing model / frame
   and prune only the inner item.
5. Unknown selector kinds raise lint **L034: unknown selector kind**
   (non-blocking warning so draft files keep working).

### Grammar

```bnf
view-property       ::= "include" ":" selector-list
                     |  "exclude" ":" selector-list
                     |  ...existing...

selector-list       ::= selector ("," selector)*

selector            ::= pattern
                     |  selector-kind ":" selector-value

selector-kind       ::= "visibility" | "seq"        ; Phase 1
                     |  "stereotype" | "kind"       ; Phase 2
                     |  "@attr"                     ; Phase 2

selector-value      ::= IDENT                       ; e.g. `private`, `critical`

pattern             ::= (IDENT ".")+ IDENT          ; `auth.User`
                     |  (IDENT ".")+ "*"            ; `auth.*`
                     |  "**" "." IDENT              ; `**.passwordHash`
                     |  "**"                        ; rare wildcard
```

`**` is a new terminal; it was previously allowed only via string literal
tricks. All production rules existing before remain valid.

### IR shape

Backward-compatible widening of `View.include` / `View.exclude`:

```ts
type Selector =
  | string                                       // bare pattern (legacy)
  | { kind: 'visibility'; value: Visibility }
  | { kind: 'seq'; value: SeqBlockKind }
  | { kind: 'attr'; name: string }               // **.attrName
  | { kind: 'model'; pattern: string };          // normalized ns.Model / ns.*

View.include: Selector[]
View.exclude: Selector[]
```

Old consumers reading `View.include` as `string[]` still work for patterns
that *were* patterns. New selector kinds appear only when the DSL used them.

### Renderer contract

Each renderer (`er`, `class`, `sequence`, `component`, …) receives the
filtered IR already resolved:

```ts
interface RenderContext {
  ir: IR;
  view: View;
  applySelectors(ir: IR, view: View): IR;  // pure, memoised
}
```

`applySelectors` runs once per view per render. The ER / class renderers
drop attributes that match `visibility:…` or `**.name`; the sequence
renderer drops statements whose kind matches `seq:…` (retry/catch blocks
collapse to a single dashed arrow to preserve "something happens here"
without the body).

### Lint rules introduced

| Rule | Severity | Trigger |
| --- | --- | --- |
| L034 | warn | unknown selector kind (`foo:bar`) |
| L035 | info | `exclude` selector matches 0 elements |
| L036 | warn | `exclude: visibility:private` applied to a view that already
  has no private attributes (noise) |

## Examples

```umlay
// Executive overview — 4 actors, happy path only.
view exec @sequence_diagram {
  include: auth.Browser, auth.App, auth.Google, auth.AppCallback
  exclude: seq:critical, seq:retry, seq:catch, seq:finally, seq:opt
}

// SRE view — error / retry paths only.
view sre @sequence_diagram {
  include: auth.*, seq:critical, seq:retry, seq:timeout, seq:catch
}

// ER overview — no private / audit columns.
view shop-overview @er_diagram {
  include: shop.*
  exclude: visibility:private, **.passwordHash, **.createdAt, **.updatedAt
}
```

## Non-goals

- A dynamic layer slider in the viewer (see RFC 0033-draft).
- Annotation-based (`@level(L2)`) layer tagging (also 0033).
- Recursive cross-namespace glob beyond `**` (spec 1.3).

## Migration

None required. All existing `include: ns.*` / `exclude: ns.X` DSL
continues to parse and behave identically.

## Rejected alternatives

- **`@level(N)` taxonomy**: creates per-project meaning drift; "L2" is
  not cross-team interpretable.
- **UI-only collapse**: cannot be committed to Git, so review parity is
  lost.
- **A second DSL file per audience**: violates "one source of truth".

## Work items (Phase 1)

- [x] Grammar + visitor: parse `kind:value` selectors
- [x] IR: `Selector` union, backward-compat string carry-over
- [x] ER renderer: apply `visibility:` + `**.attr` filters
- [x] Class renderer: same
- [x] Sequence renderer: apply `seq:` filters (critical→dashed stub)
- [x] Example: `google-oauth-login.umlay` gets 4 canonical views
- [x] DSL guide §12.6 — selector catalogue
- [ ] Lint L034 / L035 / L036 (Phase 1.5, shipped with spec 1.2.0 RC)
