---
rfc: 0013
title: `par` ブランチ間の同期 (`await` / `join`)
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.4.0
change-class: A
parent-rfc: 0007
---

# RFC 0013 — `par` ブランチ間の同期 (`await` / `join`)

## 要約

RFC 0007 で導入した `par "A" { ... } and "B" { ... }` は fire-and-forget 的な並行を表す。実際のフローでは「全ブランチ完了後に次のステップへ進む」同期点や、「特定ブランチだけ待つ」部分待機が必要。`await` / `join` シンタックスを追加する。

## 背景 / モチベーション

`concurrent-flow.umlay` の注文 API を例にとると:

```prisma
par "cache" { api ->> cache : SET }
and "event" { api ->> queue : publish }

api ->> db : update Order status = PLACED    // ← この前に両ブランチの完了を待ちたい
```

現状は並行ブロックの終わりで**暗黙同期**するが、以下が表現できない:
- 一部ブランチだけ `await` して先に進む
- 片方の結果に基づいて他方の完了を待たずに進む
- タイムアウト付き `await`

## 提案内容

### 構文 (EBNF 差分)

```ebnf
ParBlock    ::= "par" String "{" SeqStatement* "}"
                ("and" String "{" SeqStatement* "}")+
                ("await" AwaitSpec)?
AwaitSpec   ::= "all"                         (* 既定、全ブランチ待機 *)
              | "any"                         (* 最初に完了したブランチで進む *)
              | "(" String ("," String)* ")"  (* 指定ラベルのみ待機 *)
              | "all" "timeout" "(" Duration ")"    (* タイムアウト付き *)
Duration    ::= Integer ("ms" | "s" | "m")
```

### 使用例

#### 全待機 (既定)

```prisma
par "cache" { api ->> cache : SET }
and "event" { api ->> queue : publish }
await all

api ->> db : update status    // ← 上記 2 つの完了後に実行
```

#### 任意一方で先に進む

```prisma
par "primary" { api ->> db1 : write }
and "replica" { api ->> db2 : write }
await any                     // ← どちらか成功で先に進む

api -.> c : 200 OK
```

#### 部分待機

```prisma
par "fast"     { api ->> cache : SET }
and "medium"   { api ->> queue : publish }
and "slow"     { api ->> analytics : track }
await ("fast", "medium")      // ← analytics は待たない (fire-and-forget)

api -.> c : 201 Created
```

#### タイムアウト

```prisma
par "primary"   { api ->> p : query }
and "secondary" { api ->> s : query }
await all timeout(500ms)      // ← 0.5 秒で打ち切り
```

### `await` 省略時のデフォルト

`await` 句が無い `par` は `await all` 相当 (後方互換)。

## IR 影響

```jsonc
{
  "type": "object",
  "required": ["kind", "branches"],
  "properties": {
    "kind": { "const": "par" },
    "branches": { /* 既存 */ },
    "await": {
      "oneOf": [
        { "const": "all" },
        { "const": "any" },
        {
          "type": "object",
          "required": ["labels"],
          "properties": {
            "labels": { "type": "array", "items": { "type": "string" } }
          }
        },
        {
          "type": "object",
          "required": ["mode", "timeoutMs"],
          "properties": {
            "mode":      { "const": "all" },
            "timeoutMs": { "type": "integer" }
          }
        }
      ]
    }
  }
}
```

## 後方互換性

**Class A (additive)**: `await` 省略時は現行 `par` と同一挙動。

## 代替案

- **案 B: `Promise.all` / `Promise.race` 風のメソッド構文** — 却下: sequence diagram の宣言的スタイルと乖離
- **案 C: 常に全待機 (`await` 不可)** — 却下: 実用的なフロー表現を制限

## サンプル / テスト

- `concurrent-flow.umlay` に `await` 各モードの節を追加
- Conformance: await all / any / partial / timeout の parse + IR 化

## 受諾時にやること

- [ ] `grammar.bnf` / `grammar.md` / `grammar.en.md` §9 更新
- [ ] `ir.schema.json` の par block に `await` 追加
- [ ] `skills/ja/write-uml.md` / `en/write-uml.md` に使用例追加
- [ ] `concurrent-flow.umlay` を拡張して await デモを追加
- [ ] `SPEC_VERSION` 0.4.0 bump

## 未解決事項

- `await any` でのエラー伝播 (他ブランチの失敗を無視するか)
- Duration の単位追加 (`h` / `d`)
- `critical` (UML critical region) との共存
