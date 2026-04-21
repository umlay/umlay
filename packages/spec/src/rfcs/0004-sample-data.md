---
rfc: 0004
title: `@@sample(...)` インスタンスデータ構文
author: "@kigi"
status: accepted
created: 2026-04-18
updated: 2026-04-19
accepted: 2026-04-19
spec-version-target: 0.2.0
change-class: A
---

# RFC 0004 — `@@sample(...)` インスタンスデータ構文

## 要約

現状 DSL は「スキーマ」のみを表現する。具体インスタンスデータ (Gantt のタスク行、テストフィクスチャ等) を表現する `@@sample(...)` ブロックを追加する。

## 背景 / モチベーション

- `project-schedule.uml` で `@default("2026-04-20")` を「インスタンス確定値」として流用している (semantic abuse)
- 本来の `@default` は DB デフォルト。Gantt の「このタスクの開始日」とは意味が違う
- テストフィクスチャ、Storybook モック、Playground 初期値等の用途にも同じ要求がある
- インスタンス DSL を独立した手段として提供すべき

## 提案内容

### 構文 (EBNF)

```ebnf
SampleBlock   ::= "@@sample" "(" SampleRow ("," SampleRow)* ")"
SampleRow     ::= "{" SampleField ("," SampleField)* "}"
SampleField   ::= Identifier ":" (Expr | Identifier)
```

### 使用例

```prisma
model Task @entity @intent("WBS の最小作業単位") {
  +id           UUID!    @id
  +name         string!
  +plannedStart Date!
  +plannedEnd   Date!
  +progress     decimal! @default(0.0)
  +assignee     string!

  @@sample(
    { id: "t001", name: "Kickoff",          plannedStart: "2026-04-20",
      plannedEnd: "2026-04-20", progress: 1.0, assignee: "Alice" },
    { id: "t002", name: "Discovery",        plannedStart: "2026-04-20",
      plannedEnd: "2026-04-25", progress: 1.0, assignee: "Alice" },
    { id: "t003", name: "RequirementsDef",  plannedStart: "2026-04-26",
      plannedEnd: "2026-04-30", progress: 1.0, assignee: "Bob"   }
  )
}
```

### セマンティクス

- `@@sample(...)` は **model スコープ** (1 model に複数個 OK、連結扱い)
- 各 row は当該 model のスキーマに従ってバリデーションされる
- `@default` があるフィールドは省略可能 (default が適用される)
- 用途:
  - Gantt / WBS 描画: 各 row が 1 task
  - Storybook / テストフィクスチャ: seed データ
  - Playground: エディタのサンプル表示

### 参照解決

- `@@sample` 内で `@ref` 対象を文字列 ID で参照可能 (例: `parentId: "t001"`)
- 参照先 row が同一 sample セット内に存在することは型チェック対象

## IR 影響

```jsonc
// model 定義に samples[] を追加
"samples": {
  "type": "array",
  "items": {
    "type": "object",
    "description": "Instance data for rendering / fixture / playground",
    "additionalProperties": true
  }
}
```

## 後方互換性

**Class A (additive)**: 既存の `@@sample` 未使用の model は無影響。`@default` のセマンティクスは変更しない (DB default のまま)。

## 代替案

- **案 B: 別ファイル `<name>.uml.fixtures.yaml` に分離** — 却下: DSL と乖離、執筆コスト増
- **案 C: `instance Kickoff of Task { ... }` 宣言構文** — 却下: 宣言トップレベルが肥大化
- **案 D: `@default` の semantic 拡張** — 却下: DB default と競合

## サンプル / テスト

- `packages/examples/samples/project-schedule.uml` を `@@sample` ベースに書き換え、`@default` の abuse を解消
- 新サンプル `with-sample-data.uml` を追加し、テストフィクスチャ用途を示す

## 受諾時にやること

- [ ] `grammar.md` §8 に追加
- [ ] `ir.schema.json` に `model.samples[]` 追加
- [ ] RFC 0001 の BNF に反映
- [ ] `docs/{ja,en}/dsl-guide.md` に節追加
- [ ] `project-schedule.uml` を書き換え、`@default` 依存を除去
- [ ] `skills/{ja,en}/codegen-mapping.md` に「samples はコード生成のテストフィクスチャ供給源」の節を追加

## 未解決事項

- `@@sample` 内の参照 (`@ref` 対応)の型チェック厳密性
- 大量サンプル時の外部ファイル参照 (`@@sample(from: "./fixtures.jsonl")`)
- サンプル間の ID 衝突ルール
