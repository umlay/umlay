---
rfc: 0051
title: '`@states(initial: X, final: [Y, Z])` field marker'
author: '@umlay'
status: accepted
created: 2026-04-27
updated: 2026-04-27
spec-version-target: 1.7.0
change-class: A
---

# RFC 0051 — `@states` field marker

## 要約

state machine view の駆動側 attribute に **明示的なマーカー
`@states(initial: ..., final: [...])`** を追加する。リント L050 / L052
が状態の初期値・終端を確実に判定できるようにし、enum-only 推論の
偽陽性をなくす。

## 背景 / モチベーション

RFC 0050 のリントは「enum 値の最初」を初期状態と仮定するが、これは
偶然の宣言順に依存して脆い。`OrderStatus { DRAFT, CONFIRMED, ... }` の
場合は通るが、`OrderStatus { CONFIRMED, DRAFT, ... }` のように再配置
されると初期状態判定が崩れる。

属性に明示的な意図表明を 1 個だけ書ければ、リントも
レンダラーも安定する。

## 提案内容

### 構文の追加

```prisma
model Order @aggregate_root {
  status OrderStatus! @states(initial: DRAFT, final: [SHIPPED, CANCELLED])
}
```

- `initial:` 必須、識別子
- `final:` 任意、識別子配列
- `@states` は **enum 型の attribute にのみ意味** を持つ (他では無視)

### IR schema への影響

```jsonc
// AttributeSchema.states
{
  "type": "object",
  "properties": {
    "initial": { "type": "string" },
    "final":   { "type": "array", "items": { "type": "string" } }
  },
  "required": ["initial"]
}
```

### レンダラーへの影響

- `state-machine-renderer.ts` は `attribute.states.initial` を初期状態として最前面に並べ替える。
- `attribute.states.final` が指定された値は二重枠で描画する (将来の拡張)。

### 後方互換性

A (additive)。`@states` を書かない既存 DSL は従来通り「enum 定義順の
最初を初期状態」とする推論にフォールバック。

## 代替案

- **enum 値に `@initial` annotation を載せる** — **却下**: enum の値は
  単なるリテラル列で annotation を取るのが構文的に重い。
- **専用 declaration `state Order.status { initial DRAFT, ... }`** — **却下**: 1 行で済むことを別宣言にするコストが大きい。

## サンプル / テスト

- `packages/examples/samples/order-events.umlay` (`status OrderStatus! @states(initial: DRAFT, final: [SHIPPED, CANCELLED])`)
- `packages/lint/src/spec-1.7-rules.test.ts` の L050 ケース

## 受諾時にやること

- [x] `packages/core/src/ir.ts` に `StateMarkerSchema`, `AttributeSchema.states` を追加
- [x] `packages/core/src/visitor.ts` で `@states` を解析
- [x] `packages/renderer-er/src/state-machine-renderer.ts` で `initial` 順に並べ替え
- [x] サンプル追加
