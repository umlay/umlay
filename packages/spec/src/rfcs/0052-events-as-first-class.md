---
rfc: 0052
title: First-class `event` declaration + `@emits(...)` annotation
author: '@umlay'
status: accepted
created: 2026-04-27
updated: 2026-04-27
spec-version-target: 1.7.0
change-class: A (with new reserved keyword)
---

# RFC 0052 — First-class `event` declaration

## 要約

`event Name { ...fields }` を **新しいトップレベル宣言** として導入し、
`fn ... @emits(EventName)` および sequence diagram のメッセージ側で
**同一の event 名を共有** する。これにより、状態遷移 / シーケンス /
コンポーネント port の 3 図が「同じ event」を点として参照できる。

## 背景 / モチベーション

CQRS / event sourcing / messaging 系の設計では、

- ある `fn` が状態を遷移させると同時に *event を emit* する
- その event を別の component が購読してさらに動く
- sequence diagram は両者を矢印で結ぶ

という流れが日常的に発生する。これまでは event は単なる文字列で、
ビュー間の整合性を取る方法がなかった。

`event` を一級宣言にすれば、この 3 図を機械的にリンクできる。

## 提案内容

### 新規キーワード

`event` を予約語に追加 (lexer)。`event` を識別子として使っていた既存
DSL は改名が必要 (現リポジトリ内のサンプルで該当した 2 箇所
`fn apply(event: ...)` / `fn publish(event: ...)` は `evt` に rename 済み)。

### 構文の追加

```prisma
event OrderConfirmed {
  orderId UUID!
  at      Timestamp!
}

model Order @aggregate_root {
  fn confirm()
    @pre("status == DRAFT")
    @post("status == CONFIRMED")
    @emits(OrderConfirmed)
}

view confirm-flow @sequence_diagram {
  participants:
    Customer as c, Order as o, EventBus as eb
  seq {
    c ->> o  : "confirm()"
    o ->> eb : "OrderConfirmed"   // ← この label が event 名と一致するとリンクされる
  }
}
```

### IR schema への影響

```jsonc
// 新規
"EventDecl": {
  "type": "object",
  "required": ["_id", "name"],
  "properties": {
    "_id":    { "type": "string" },
    "name":   { "type": "string" },
    "fields": { "type": "array", "items": { "$ref": "#/definitions/Attribute" } },
    "docs":   { "type": "array", "items": { "type": "string" } }
  }
}

// Namespace に追加
"events": {
  "type": "object",
  "additionalProperties": { "$ref": "#/definitions/EventDecl" }
}

// FnSignature に追加
"emits": { "type": "array", "items": { "type": "string" } }

// SeqMessage / SeqStatement(message) に追加
"eventRef": { "type": "string" }
```

### Resolver

`parser.ts` の post-pass `resolveEventRefs` が、
sequence diagram message の `label` が宣言済み event 名 (短縮 or FQN) と
一致する場合に `eventRef` を埋める。

### Lint との連動

- L055: `@emits(X)` で参照する event が宣言されているか
- L056: 宣言された event が、いずれかの fn `@emits` または sequence の `eventRef` から参照されているか

### Renderer への影響

sequence diagram は `eventRef` 付きメッセージを `«event» <name>` として
イタリック表示し、通常メソッド呼び出しと視覚的に区別する。

### 後方互換性

`event` キーワードを新たに予約するため、厳密には *minor breaking*。
ただし内部サンプルでの実害は 2 箇所のみ・rename で対応済み。
外部利用者向けには 1.7.0 リリースノートで明示する。

## 代替案

- **`@@event_name(...)` ブロックディレクティブで event を declare** —
  **却下**: 一級宣言の方が他言語 (Prisma の model など) と直感的に揃う。
- **interface 経由の event 定義 (`protocol Event<T>`)** — **却下**: protocol
  は契約であり、データ運搬を表現するには重い。

## サンプル / テスト

- `packages/examples/samples/order-events.umlay`
- `packages/lint/src/spec-1.7-rules.test.ts` の L055 / L056

## 受諾時にやること

- [x] `packages/core/src/lexer.ts` に `EventKw` 追加
- [x] `packages/core/src/grammar.ts` に `eventDecl` 規則追加
- [x] `packages/core/src/visitor.ts` に `eventDecl` ハンドラ + `@emits` 取得
- [x] `packages/core/src/ir.ts` に `EventDeclSchema`, `Namespace.events`, `FnSignature.emits`, `SeqMessage.eventRef` を追加
- [x] `packages/core/src/parser.ts` に `resolveEventRefs` post-pass を追加
- [x] `packages/lint/src/rules/index.ts` に L055 / L056 追加
- [x] `packages/renderer-er/src/sequence-renderer.ts` で `eventRef` を視覚化
- [x] サンプル `order-events.umlay` を追加
