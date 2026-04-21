---
rfc: 0003
title: Sequence diagram `alt` の `else` 分岐
author: "@kigi"
status: accepted
created: 2026-04-18
updated: 2026-04-19
accepted: 2026-04-19
spec-version-target: 0.2.0
change-class: A
---

# RFC 0003 — Sequence diagram `alt` の `else` 分岐

## 要約

現状 `alt "label" { ... }` は単一分岐のみ。Mermaid / PlantUML と同等の `else` 分岐 (N 分岐 + default) を追加する。

## 背景 / モチベーション

- OAuth / 認証フローで「成功時」「失敗時」「キャンセル時」のような複数分岐を描きたい
- `login.umlay` サンプルで `alt "Deny"` のみ表現しており「Allow」のフローが暗黙
- 既存の if-else セマンティクスを素直に表現する構文が必要

## 提案内容

### 構文 (EBNF)

```ebnf
AltBlock   ::= "alt" String "{" SeqStatement* "}"
               ("else" String "{" SeqStatement* "}")*
               ("else"        "{" SeqStatement* "}")?  /* 無条件 default */
```

### 使用例

```prisma
view login-flow @sequence_diagram {
  participants: Browser as br, Lambda as fn, Google as gg
  seq {
    br ->> gg : GET /authorize
    alt "Allow" {
      gg -.> br : 302 → /callback?code=...
      br ->> fn : GET /callback?code=...
    } else "Deny" {
      gg -.> br : 302 → /auth/error?reason=denied
    } else "TimeoutExpired" {
      gg -.> br : 302 → /auth/error?reason=timeout
    } else {
      /* 上記以外の全エラー */
      gg -.> br : 302 → /auth/error?reason=unknown
    }
  }
}
```

### セマンティクス

- 最初の `alt "L" { ... }` は**必須**
- `else "L" { ... }` は**0 回以上**
- label 無しの `else { ... }` は**最後に高々 1 回**、default 節として扱う
- 実装は分岐ラベルを縦方向フレームとして描画

## IR 影響

```jsonc
// IR ではフラット化せず、block tree のまま保持
"altBlocks": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["branches"],
    "properties": {
      "branches": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["statements"],
          "properties": {
            "label":      { "type": ["string", "null"] },
            "statements": { "type": "array" }
          }
        }
      }
    }
  }
}
```

`label: null` が default branch を示す。

## 後方互換性

**Class A (additive)**: 既存の `alt "X" { ... }` (else なし) は 1 分岐の `altBlock` として IR 化される。

## 代替案

- **案 B: `case` / `when` 構文** — 却下: UML シーケンス文化との乖離
- **案 C: `opt` (optional) 追加導入** — 別 RFC で検討

## サンプル / テスト

- `packages/examples/samples/login/login.umlay` の Google OAuth Deny 分岐を `else` で拡張
- conformance: `alt` 単独、`alt + else + label`、`alt + else (default)`、ネスト

## 受諾時にやること

- [ ] `grammar.md` §9 更新
- [ ] `ir.schema.json` に `altBlocks` 構造追加 (view.body 内)
- [ ] RFC 0001 の BNF に反映
- [ ] `docs/{ja,en}/dsl-guide.md` のシーケンス節に追記
- [ ] `login/login.umlay` の sequence view を else 節に書き換え

## 未解決事項

- `opt` (単一分岐 "オプショナル") は本 RFC スコープ外、別 RFC で検討
- `par` (並行) も別途検討
