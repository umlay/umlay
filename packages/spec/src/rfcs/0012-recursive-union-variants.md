---
rfc: 0012
title: `union` の recursive variant
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.4.0
change-class: A
parent-rfc: 0010
---

# RFC 0012 — `union` の recursive variant

## 要約

RFC 0010 で追加した inline payload variant で、自身の union 型を参照するフィールドを許可する。Tree / Linked list / AST 等の再帰構造を表現可能にする。

## 背景 / モチベーション

現行の inline variant は payload field に「他の model」「プリミティブ型」を取れるが、**自分自身 (union 名) を参照不可**。これだと以下のような構造が書けない:

- 式 AST: `Expr = Num { n: int } | Add { left: Expr, right: Expr }`
- 二分木: `Tree = Leaf | Node { left: Tree, right: Tree }`
- JSON 値: `JsonVal = Null | Bool { v: bool } | Obj { kvs: ... }`

## 提案内容

### 構文差分

BNF 変更なし (`Type ::= QualifiedName` のままで OK)。Semantic としてのみ、variant payload の型に **親 union 名** を許可する。

### 使用例

```prisma
union Expr =
  | Num { value: int! }
  | Var { name: string! }
  | Add { left: Expr!, right: Expr! }                  /* 再帰 */
  | Mul { left: Expr!, right: Expr! }                  /* 再帰 */
  | Let { name: string!, binding: Expr!, body: Expr! } /* 再帰 + 複数 */
  @intent("シンプルな算術式 AST")

union Tree<T> =
  | Leaf
  | Node { value: T!, left: Tree<T>!, right: Tree<T>! }
```

### 循環検出

- variant payload が親 union を含む場合、**末端** (non-recursive) な variant が最低 1 つ必須
- `union X = Node { child: X! }` のような「終端なし」は parse error (無限構造)
- 相互再帰 (`A.variant -> B`, `B.variant -> A`) も本 RFC の範囲内で許可

### JSON Schema 表現

```jsonc
"union": {
  "properties": {
    "variants": {
      "items": {
        "oneOf": [
          { "type": "string" },
          {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "fields": {
                "type": "array",
                "items": {
                  "allOf": [
                    { "$ref": "#/$defs/attribute" },
                    { "properties": { "_recursiveToUnion": { "type": "boolean" } } }
                  ]
                }
              }
            }
          }
        ]
      }
    },
    "hasRecursiveVariants": { "type": "boolean" }
  }
}
```

## IR 影響

上記 `_recursiveToUnion` と `hasRecursiveVariants` を追加。consumer は再帰 variant の型を `{ "$ref": "#/$defs/<unionName>" }` として扱える。

## 後方互換性

**Class A (additive)**: 既存の非再帰 union は無影響。

## 代替案

- **案 B: 再帰を禁止 (現状維持)** — 却下: AST / Tree ユースケースが実現不能
- **案 C: 親 model を切り出す必要あり (RFC 0006 のみ)** — 却下: 記述量増加

## サンプル / テスト

- 新サンプル `samples/ast-expr.umlay`: `Expr` の inline 再帰 variant
- Conformance: 終端 variant 欠落の検出、相互再帰、ジェネリクス + 再帰 (`Tree<T>`)

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §4.2 に再帰 variant の節追加
- [ ] `ir.schema.json` の `union` に `hasRecursiveVariants` / `_recursiveToUnion` 追加
- [ ] `skills/{ja,en}/write-uml.md` に「終端 variant 必須」チェック項目追加
- [ ] `skills/{ja,en}/review-uml.md` に R11 (recursion without base case) 追加
- [ ] `skills/{ja,en}/codegen-mapping.md` に TS discriminated union + recursive type のマッピング追加
- [ ] `SPEC_VERSION` 0.4.0 bump

## 未解決事項

- `Tree<T>` の T に再帰 union 自身を渡す `Tree<Tree<int>>` の扱い
- TypeScript 生成時の循環 type エラー回避 (lazy type `Expr & { payload: () => Expr }` 等)
