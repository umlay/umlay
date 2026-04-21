---
rfc: 0007
title: Sequence diagram の `opt` / `par` ブロック
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.3.0
change-class: A
supersedes:
superseded-by:
---

# RFC 0007 — Sequence diagram の `opt` / `par` ブロック

## 要約

RFC 0003 で `alt` に `else` を追加したが、**単一分岐のオプショナル** (`opt`) と **並行処理** (`par`) は別途必要。UML 仕様の `opt` / `par` フラグメントを正式に追加する。

## 背景 / モチベーション

- `alt` は分岐、`opt` は「もしあれば実行される単一ブロック」。現状 `alt` で代用すると余分な else が必要
- `par` は「並列に実行される複数ブロック」。並行処理 / Promise.all 的なフローで必要
- UML 標準のフラグメント名 (`alt` / `opt` / `par` / `loop`) と揃えることで学習曲線が下がる

## 提案内容

### 構文 (EBNF)

```ebnf
SeqStatement    ::= SeqMessage | AltBlock | LoopBlock | OptBlock | ParBlock

OptBlock        ::= "opt" String "{" SeqStatement* "}"

ParBlock        ::= "par" String "{" SeqStatement* "}"
                    ("and" String "{" SeqStatement* "}")+
```

### 使用例

#### `opt` (単一オプショナル)

```prisma
view confirm-flow @sequence_diagram {
  participants: Customer as c, Order as o, EmailSvc as e
  seq {
    c ->> o : confirm()
    o -.> c : OrderConfirmed
    opt "メール通知が有効な場合" {
      o ->> e : send(confirmation_mail)
    }
  }
}
```

#### `par` (並行)

```prisma
view save-order @sequence_diagram {
  participants: API as api, DB as db, Cache as cache, Queue as q
  seq {
    api ->> db    : writeOrder()
    par "並行通知" {
      api ->> cache : invalidate(orderId)
    } and "並行メトリクス" {
      api ->> q     : publish(OrderSaved)
    }
  }
}
```

`par` は最低 2 つの並行ブロック (`par ... and ...`) を必須とする。

## IR 影響

```jsonc
// seqStatement の oneOf に opt / par を追加
{
  "type": "object",
  "required": ["kind", "label", "statements"],
  "properties": {
    "kind":       { "const": "opt" },
    "label":      { "type": "string" },
    "statements": { "type": "array" }
  }
},
{
  "type": "object",
  "required": ["kind", "branches"],
  "properties": {
    "kind": { "const": "par" },
    "branches": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "object",
        "required": ["label", "statements"],
        "properties": {
          "label":      { "type": "string" },
          "statements": { "type": "array" }
        }
      }
    }
  }
}
```

## 後方互換性

**Class A (additive)**: 既存サンプルは無影響。

## 代替案

- **案 B: `alt` のみで代用** — 却下: 意味論の明確性が失われる (UML 標準との乖離)
- **案 C: `opt` だけ追加して `par` は見送り** — 却下: `par` は並行処理の現代的 stack で必須

## サンプル / テスト

- `packages/examples/samples/login/login.umlay` の「メール通知」追加シナリオで `opt` を使用
- 新サンプル `packages/examples/samples/concurrent-save.umlay` で `par` を使用
- Conformance: `opt` 単体 / `par` 2 分岐以上 / ネスト (`alt` 内 `opt` 等)

## 受諾時にやること

- [ ] `grammar.md` §9 と `grammar.en.md` §9 を更新
- [ ] `grammar.bnf` の `SeqStatement` を拡張
- [ ] `ir.schema.json` の `seqStatement` に opt / par を追加
- [ ] `docs/{ja,en}/dsl-guide.md` に例を追加
- [ ] `SPEC_VERSION` 0.3.0 に bump

## 未解決事項

- `par` のブランチ間同期 (`await`) の表現必要か
- `critical` (UML の critical region フラグメント) の要否
