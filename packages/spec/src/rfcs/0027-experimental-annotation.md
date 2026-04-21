---
rfc: 0027
title: `@experimental` アノテーションの導入
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.8.0
change-class: A
parent-rfc: 0023
---

# RFC 0027 — `@experimental` アノテーション

## 要約

RFC 0023 の `@deprecated` と対をなす`@experimental` アノテーションを導入する。新機能の予告用途として、「仕様が安定していない」「将来破壊的変更がありうる」ことを明示する。

## 背景 / モチベーション

新 feature を spec に入れた直後は、ユーザーからのフィードバックで構文が変わる可能性がある。現状は:

- 入れる → 互換性を守る (変更困難)
- 入れない → 検証データが取れない

中間の「試験導入」として `@experimental` を入れることで、新機能を公開しつつ破壊的変更の余地を残せる。

## 提案内容

### 構文 (EBNF 差分)

```ebnf
ExperimentalAnnotation ::= "@experimental" "(" ExperimentalArgs? ")"
ExperimentalArgs       ::= String                                 (* 短縮形: note *)
                         | "{" ExperimentalField ("," ExperimentalField)* "}"
ExperimentalField      ::= "since"      ":" String
                         | "note"       ":" String
                         | "stabilizeIn" ":" String
                         | "trackingIssue" ":" String
```

### 使用例

```prisma
// 短縮形
model StreamProcessor @aggregate_root
  @experimental("async interface may change before 1.0") {
  +id UUID! @id
  // ...
}

// 完全形
protocol ResourcePoolV2<T> @experimental({
  since:          "0.8.0",
  note:           "replacing ResourcePool; syntax of retry() is unstable",
  stabilizeIn:    "1.0.0",
  trackingIssue:  "umlay/umlay#456"
}) {
  fn acquire() -> T!
  fn release(resource: T!) -> void
}
```

### 適用対象

attribute / method / model / protocol / enum value / view / type — `@deprecated` と同じ範囲。

### 検証規則

- `since` / `stabilizeIn` は有効な semver
- `trackingIssue` は `<owner>/<repo>#<number>` 形式を推奨 (URL でも可)
- Strict mode では experimental 要素の使用時に **info** 通知 (警告ではなく「追跡されている不安定機能」の情報)

## IR 影響

```jsonc
"experimental": {
  "type": "object",
  "properties": {
    "since":         { "type": "string" },
    "note":          { "type": "string" },
    "stabilizeIn":   { "type": "string" },
    "trackingIssue": { "type": "string" }
  }
}
```

attribute / model / protocol / union / enum / view 各要素に optional。

## 後方互換性

**Class A (additive)**

## 代替案

- **案 B: `@unstable`** — 却下: TypeScript / Rust の "experimental" 慣習と揃える方が学習コスト低い
- **案 C: コメントで代用 (`// EXPERIMENTAL: ...`)** — 却下: 機械可読性が低い

## サンプル / テスト

- 新サンプル `samples/experimental-api.uml`
- Conformance: experimental + deprecated の組み合わせ (experimental から deprecated への遷移)

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §5.3 に追記
- [ ] `grammar.bnf` に `ExperimentalAnnotation` 追加
- [ ] `ir.schema.json` に `experimental` object を追加
- [ ] `skills/{ja,en}/write-uml.md` / `review-uml.md` で情報レベル通知ルール W02 追加
- [ ] `SPEC_VERSION` 0.8.0 bump

## 未解決事項

- `@experimental` → `@deprecated` の自動遷移マーカー
- experimental の伝播 (親 model が experimental なら子 attribute も experimental 扱いか)
