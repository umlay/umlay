---
rfc: 0005
title: Cross-namespace `@@dependencies`
author: "@kigi"
status: accepted
created: 2026-04-18
updated: 2026-04-19
accepted: 2026-04-19
spec-version-target: 0.2.0
change-class: A
---

# RFC 0005 — Cross-namespace `@@dependencies`

## 要約

現行 `@@dependencies(...)` は同一 namespace 内の model しか参照できない。複数プロジェクト / モジュール境界を跨ぐ依存を許可する。

## 背景 / モチベーション

- 1 リポジトリで複数プロジェクトの Gantt を横並びで見たい場合、各 Project を個別 namespace に分ける運用がある
- 現状: `pm_project_a.Task` が `pm_project_b.InfraReady` に依存することを表現できない
- `@ref` は fully qualified name をサポートしているので `@@dependencies` も同様に揃えるべき

## 提案内容

### 構文 (EBNF 差分)

```ebnf
/* 変更前 */
DependencyItem ::= Identifier | "{" DepField ("," DepField)* "}"

/* 変更後 */
DependencyItem ::= QualifiedName | "{" DepField ("," DepField)* "}"
DepField       ::= "on" ":" QualifiedName
                 | "kind" ":" ("FS" | "SS" | "FF" | "SF")
                 | "lag"  ":" SignedInteger
```

`QualifiedName ::= Identifier ("." Identifier)?` は既存。

### 使用例

```prisma
namespace pm_core

model InfraReady @entity @intent("インフラ準備完了 (共通)") {
  +id UUID! @id
  +plannedEnd Date! @default("2026-05-10")
  +progress decimal! @default(1.0)
}
```

```prisma
namespace pm_feature_a

model BackendDev @entity @intent("機能 A のバックエンド") {
  @@dependencies(pm_core.InfraReady)           /* ← 短縮形で cross-ns */
  /* ... */
}

model FrontendDev @entity @intent("機能 A のフロントエンド") {
  @@dependencies(
    { on: pm_core.InfraReady, kind: FS, lag: 2 }   /* 完全形 cross-ns */
  )
  /* ... */
}
```

### セマンティクス

- `on` の値が単一 `Identifier` なら同一 namespace 内で解決 (現状維持)
- `on` の値が `<ns>.<Model>` なら当該 namespace 内で解決
- 解決失敗時は S11 (Unknown dependency target) として error

### 循環検出

- 名前空間を跨ぐ依存グラフも含めて循環検出 (R09)
- 複数ファイルにまたがる場合は import 解決後に一括検証

## IR 影響

```jsonc
// model.dependencies[*].on の型定義変更 (既存フィールドの拡張)
"on": {
  "type": "string",
  "description": "Either 'ModelName' (same namespace) or '<namespace>.ModelName' (cross-namespace)"
}
```

IR では常に fully qualified (`<ns>.<Model>`) に正規化される。短縮形は糖衣。

## 後方互換性

**Class A (additive)**: 既存の単一 Identifier 形式はそのまま動作。

## 代替案

- **案 B: `import` 構文で別ファイルを取り込む** — 却下: 本 RFC より大規模、別 RFC で検討
- **案 C: 常に FQN 必須にする** — 却下: 同一 ns 内のコードが冗長化

## サンプル / テスト

- `packages/examples/samples/multi-project-schedule/` を新設:
  - `pm-core.uml` (共通インフラタスク)
  - `pm-feature-a.uml` (機能 A タスク、core に依存)
  - `pm-feature-b.uml` (機能 B タスク、core + feature-a に依存)
- conformance: `@@dependencies(ns.Model)` の解決、解決不能時の S11 挙動

## 受諾時にやること

- [ ] `grammar.md` §8 と §10 を更新
- [ ] `ir.schema.json` の `on` 説明を更新
- [ ] RFC 0001 の BNF に反映
- [ ] `skills/{ja,en}/write-uml.md` / `review-uml.md` の S11 説明に cross-ns 例を追加
- [ ] `docs/{ja,en}/dsl-guide.md` に cross-ns 例を追加

## 未解決事項

- `import pm_core` のような形式的な import 構文を追加すべきか (別 RFC 候補)
- namespace alias (`as`) の要否
