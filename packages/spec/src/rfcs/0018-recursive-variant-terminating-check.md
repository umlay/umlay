---
rfc: 0018
title: Recursive variant の terminating 検査 (well-foundedness)
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.5.0
change-class: A
parent-rfc: 0012
---

# RFC 0018 — Recursive variant の terminating 検査

## 要約

RFC 0012 で導入した再帰 union variant に対し、**必ず終端 (non-recursive) variant が存在する**ことをパーサが機械的に保証する well-foundedness 検査ルールを正式化する。

## 背景 / モチベーション

RFC 0012 では「終端 variant が最低 1 つ必須」と散文的に規定したが、以下が曖昧:

- **相互再帰** (A の variant に B が現れ、B の variant に A が現れる) の終端判定は?
- **optional 再帰** (`left: Expr?`) は終端扱いか?
- **list 内再帰** (`children: [Expr]`) は?
- **ジェネリクス経由** (`Tree<T>` の T に Tree 自身) の扱いは?

## 提案内容

### 定義: 到達可能性グラフ

1. 各 union を頂点
2. union U の variant の field 型が別 union V (または U 自身) を参照する場合、U → V の辺を張る
3. 辺には属性:
   - `required`: field が `!` (non-null)
   - `optional`: field が `?` / `??`
   - `contained-in-container`: `[T]` / `Map<K, V>` 等

### 終端判定

Union U が **well-founded** (有限構築可能) であるとは:

- **直接終端**: U の variant のうち少なくとも 1 つが、U 自身および同じ強連結成分に属する他の union を**required** には参照しない
- **間接終端**: 相互再帰グラフの強連結成分内で、少なくとも 1 つの union が直接終端を持つ

### 検査ルール (機械的)

```
1. 全 union の到達可能性グラフを構築
2. Tarjan の SCC (強連結成分) 分解
3. 各 SCC に対して、少なくとも 1 つの union が直接終端 variant を持つか検査
4. 満たさない SCC があれば parse error:
   "Recursive union(s) X, Y, ... have no terminating variant"
```

### 例

#### ✅ OK (直接終端あり)

```prisma
union Expr =
  | Num { value: int! }                     // 直接終端
  | Add { left: Expr!, right: Expr! }
```

#### ✅ OK (optional 再帰は required ではないので終端寄与)

```prisma
union LinkedList<T> =
  | Cons { head: T!, tail: LinkedList<T>? } // tail は optional、Cons 自体が終端可
```

#### ❌ NG (終端なし)

```prisma
union BadExpr =
  | Add { left: BadExpr!, right: BadExpr! }
  | Mul { left: BadExpr!, right: BadExpr! }
// → 全 variant が BadExpr を required 参照、終端不能 (parse error)
```

#### ✅ OK (相互再帰だが一方に終端)

```prisma
union Expr =
  | Num { value: int! }                     // 終端あり
  | Let { stmt: Stmt! }

union Stmt =
  | Assign { name: string!, value: Expr! }  // 直接終端は無いが...
  | Seq { stmts: [Stmt] }                   // 空リストで終端可 (container ルール)
```

`[Stmt]` は「空リスト許容」扱いで終端寄与。

### コンテナの扱い

以下は**終端寄与**とみなす:

- `?` / `??` 付き field (null で終端)
- 配列型 `[T]` (空配列で終端)
- Map / Set 型 (空で終端)

## IR 影響

```jsonc
"union": {
  "properties": {
    "wellFounded": {
      "type": "boolean",
      "description": "全 SCC で終端が保証されているか (RFC 0018)"
    },
    "terminatingVariants": {
      "type": "array",
      "description": "直接終端として機能する variant 名",
      "items": { "type": "string" }
    }
  }
}
```

parser は `wellFounded: false` を持つ union を IR 化できない (必ず error)。

## 後方互換性

**Class A (additive)**: 既存の well-founded な union は無影響。新規に書かれた non-well-founded は従来も意味的には壊れていたが parser が見逃していた可能性があり、本 RFC でそれを error 化する。

## 代替案

- **案 B: 警告のみ (error にしない)** — 却下: 実行時に無限ループ発生、受諾せず固めるべき
- **案 C: ユーザ annotation で明示 (`@well_founded`)** — 却下: 機械検査可能ならデフォルトで検査すべき

## サンプル / テスト

- `ast-expr.umlay` の `Expr` / `Tree` が well-founded であることの conformance テスト
- 新サンプル `samples/invalid-recursive-union.umlay`: 意図的に non-well-founded な union を書き、parse error になることを確認

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` に well-foundedness 節追加
- [ ] `ir.schema.json` の `union` に `wellFounded` / `terminatingVariants` 追加
- [ ] `skills/{ja,en}/review-uml.md` に R12 (non-well-founded union) 追加
- [ ] Conformance テストに invalid ケース追加
- [ ] `SPEC_VERSION` 0.5.0 bump

## 未解決事項

- 再帰 type (非 union) の同様な検査 (将来 `type X @value_object` が自身を参照したら)
- Generic 経由の再帰 (`Tree<Tree<T>>`) の検査精度
- 実装側でのエラーメッセージ品質 (どの variant が原因か特定)
