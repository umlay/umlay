# Umlay Documentation

Umlay DSL / 正規IR / 設計原則などの公開ドキュメント。Public documentation for the Umlay DSL, normalized IR, and design principles.

## 日本語 🇯🇵

| # | ドキュメント | 内容 |
| --- | --- | --- |
| 1 | [overview.md](./ja/overview.md) | Umlay とは / 解く問題 / 他ツールとの関係 |
| 2 | [getting-started.md](./ja/getting-started.md) | 最初の `.umlay` を書く最短ルート |
| 3 | [dsl-guide.md](./ja/dsl-guide.md) | DSL 文法の実践ガイド |
| 4 | [ir-guide.md](./ja/ir-guide.md) | 正規IR の構造とツール開発者向けガイド |
| 5 | [design-principles.md](./ja/design-principles.md) | North Star 6 原則 |
| 6 | [roadmap.md](./ja/roadmap.md) | 公開範囲とロードマップ |
| 7 | [faq.md](./ja/faq.md) | よくある質問 |
| 8 | [extending.md](./ja/extending.md) | DSL 拡張チュートリアル (L0 / L1 / L2 の 3 層構造 + RFC 起票手順) |
| 9 | [lsp-integration.md](./ja/lsp-integration.md) | Language Server / IDE 拡張の実装ガイド (LSP メソッド × spec マッピング) |
| 10 | [migration-guide-1.0.md](./ja/migration-guide-1.0.md) | spec 0.x → 1.0 移行ガイド (draft、1.0 freeze 時の整理事項先取り) |

## English 🇬🇧

| # | Document | Content |
| --- | --- | --- |
| 1 | [overview.md](./en/overview.md) | What Umlay is, the problem it solves, related tools |
| 2 | [getting-started.md](./en/getting-started.md) | Shortest path to your first `.umlay` file |
| 3 | [dsl-guide.md](./en/dsl-guide.md) | Practical DSL guide |
| 4 | [ir-guide.md](./en/ir-guide.md) | Normalized IR reference for tool authors |
| 5 | [design-principles.md](./en/design-principles.md) | The 6 North Star principles |
| 6 | [roadmap.md](./en/roadmap.md) | What is public, what is planned |
| 7 | [faq.md](./en/faq.md) | Frequently asked questions |
| 8 | [extending.md](./en/extending.md) | Practical guide to extending Umlay DSL (L0 / L1 / L2 + RFC filing) |
| 9 | [lsp-integration.md](./en/lsp-integration.md) | LSP / IDE extension implementation guide (LSP method × spec mapping) |
| 10 | [migration-guide-1.0.md](./en/migration-guide-1.0.md) | spec 0.x → 1.0 migration guide (draft, previews 1.0 freeze consolidations) |

---

DSL 文法の正本は [`../packages/spec/src/grammar.md`](../packages/spec/src/grammar.md)、正規IR の正本は [`../packages/spec/src/ir.schema.json`](../packages/spec/src/ir.schema.json) です。本ドキュメントはそれらを補完する利用者向け解説です。

The canonical grammar lives in [`../packages/spec/src/grammar.md`](../packages/spec/src/grammar.md) and the normalized IR schema in [`../packages/spec/src/ir.schema.json`](../packages/spec/src/ir.schema.json). These documents are user-oriented companions.
