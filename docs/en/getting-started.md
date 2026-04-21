# Getting Started — your first `.umlay`

A short guide for people who have never written Umlay DSL, starting from the smallest possible example.

## Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 22+ (pinned in `.node-version`) |
| pnpm | 10+ |

[Volta](https://volta.sh) / [fnm](https://github.com/Schniz/fnm) / nvm all pick up `.node-version`.

## 1. Clone the repository

```bash
git clone https://github.com/umlay/umlay.git
cd umlay
pnpm install
pnpm typecheck
```

This repository ships **spec, examples, and skills** only. Implementations (parser, renderer) live in other repositories.

## 2. Browse the samples

`packages/examples/samples/` contains `.umlay` files ordered roughly by complexity.

| # | File | What it demonstrates |
| --- | --- | --- |
| 1 | `hello-order.umlay` | Smallest sample |
| 2 | `blog.umlay` | Users / Posts / Comments / Tags |
| 3 | `ecommerce.umlay` | cascade / inverse demo |
| 4 | `saas-multitenant.umlay` | Orgs / Users / Teams / Invitations |
| 5 | `japanese-domain.umlay` | Non-Latin identifiers + `@codegenName` |
| 6 | `with-attachments.umlay` | Image attachment demo |
| 7 | `with-custom-theme.umlay` | External CSS theme demo |
| 8 | `reserved-keywords.umlay` | Future keywords (function / queue / component) |
| 9 | `project-schedule.umlay` | Schedule material for WBS / Gantt |

## 3. Write a minimal `.umlay`

Save the following as `hello.umlay`:

```prisma
namespace shop

model Customer @aggregate_root {
  id    UUID! @id
  name  string!
  email string! @unique
}

model Order @aggregate_root {
  id          UUID! @id
  customerId  UUID! @ref(Customer.id)
  total       decimal!
}

view shop-er @er_diagram {
  include: shop.*
}
```

What this says:

- Two `model`s (`Customer`, `Order`) are defined as entities
- `@ref(Customer.id)` wires `Order.customerId` to `Customer.id`
- `view` picks the set of models to draw as one ER diagram

## 4. Dig into the grammar

- [dsl-guide.md](./dsl-guide.md) — grammar, annotations, views, nullability
- [ir-guide.md](./ir-guide.md) — the normalized IR for tool authors
- `../../packages/spec/src/grammar.md` — the canonical grammar

## 5. Getting help

- Reserved words and `@` forms → [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- Bugs and proposals → [GitHub Issues](https://github.com/umlay/umlay/issues)
- Common questions → [faq.md](./faq.md)
