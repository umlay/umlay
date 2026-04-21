---
rfc: 0002
title: view `layout:` の具体構文
author: "@kigi"
status: accepted
created: 2026-04-18
updated: 2026-04-19
accepted: 2026-04-19
spec-version-target: 0.2.0
change-class: A
---

# RFC 0002 — view `layout:` の具体構文

## 要約

`view` 宣言の `layout:` 句は、現在 spec 上「指定可能」とだけ記述されており具体構文が未確定。方向・ヒント・レイアウトエンジン選択を表現する object-like 構文を正式化する。

## 背景 / モチベーション

- `plan.md §4` で `layout: direction(LR), hint("Order @center")` のような例が示されているが、BNF としては未定義
- ELK.js や Mermaid の algorithm 選択と互換な形が望ましい
- 実装依存で構文が分岐する前に spec で固定する

## 提案内容

### 構文 (EBNF)

```ebnf
LayoutClause    ::= "layout" ":" LayoutOption ("," LayoutOption)*
LayoutOption    ::= "direction" "(" Direction ")"
                  | "engine"    "(" Engine ")"
                  | "hint"      "(" String ")"
                  | "spacing"   "(" Integer ")"
                  | "align"     "(" Align ")"
Direction       ::= "TB" | "BT" | "LR" | "RL"
Engine          ::= "elk" | "dagre" | "grid" | "manual"
Align           ::= "start" | "center" | "end"
```

### 使用例

```prisma
view order-er @er_diagram {
  include: ordering.*
  layout: direction(LR), engine(elk), spacing(40)
}

view class-overview @class_diagram {
  include: ordering.*, customer.Customer
  layout: direction(TB), hint("Order @center"), align(center)
}
```

### セマンティクス

- `direction`: ノード配置の主方向 (既定 `TB`)
- `engine`: 使用するレイアウトアルゴリズム (既定 `elk`)
- `hint`: 実装依存の配置ヒント (文字列、実装ごとに解釈)
- `spacing`: ノード間隔 (px、既定 40)
- `align`: 親ノード基準の整列 (既定 `start`)

`hint` のみ実装依存余地を残す。他は意味を spec で固定。

## IR 影響

```jsonc
// ir.schema.json の view 定義に layout フィールドを追加
"layout": {
  "type": "object",
  "properties": {
    "direction": { "enum": ["TB", "BT", "LR", "RL"] },
    "engine":    { "enum": ["elk", "dagre", "grid", "manual"] },
    "hint":      { "type": "string" },
    "spacing":   { "type": "integer" },
    "align":     { "enum": ["start", "center", "end"] }
  }
}
```

## 後方互換性

**Class A (additive)**: `layout:` を使っていない既存 view は無影響。

## 代替案

- **案 B: Mermaid 互換構文 (`layout: TB`)** — 却下: オプションが増えた際に拡張困難
- **案 C: `@@layout` ブロック** — 却下: view 固有のため view body 内に収める方が自然

## サンプル / テスト

- `packages/examples/samples/with-custom-theme.uml` に `layout: direction(LR)` を追加
- conformance テスト: 全 enum 値、無効値の parse error

## 受諾時にやること

- [ ] `grammar.md` §4.5 / §5 を更新
- [ ] `ir.schema.json` に `layout` フィールド追加
- [ ] RFC 0001 の BNF に反映
- [ ] `docs/{ja,en}/dsl-guide.md` に使用例追加
- [ ] `SPEC_VERSION` 0.2.0 に bump

## 未解決事項

- `manual` engine の場合の座標指定方法 (別 RFC で `@@position(x, y)` を検討)
- クラスタリング (グループ化) 指定 (別 RFC 候補)
