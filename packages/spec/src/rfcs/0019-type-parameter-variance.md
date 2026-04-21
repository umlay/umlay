---
rfc: 0019
title: 型パラメータの variance (`<out T>` / `<in T>`)
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.6.0
change-class: A
parent-rfc: 0015
---

# RFC 0019 — 型パラメータの variance

## 要約

RFC 0015 で導入した bounded generics を拡張し、型パラメータの **共変 (`<out T>`)** / **反変 (`<in T>`)** / **不変 (既定)** を宣言できるようにする。

## 背景 / モチベーション

- `Repository<Dog>` を `Repository<Animal>` の代わりに渡せるか? (共変性)
- `EventHandler<Animal>` を `EventHandler<Dog>` の代わりに渡せるか? (反変性)
- Kotlin / Scala / C# が採用、TypeScript は structural typing で暗黙

現状 Umlay では全てのジェネリクスが不変 (invariant)。実用では:

- **出力位置** (return / read) — 共変が欲しい (`protocol Producer<out T> { fn get() -> T }`)
- **入力位置** (parameter / write) — 反変が欲しい (`protocol Consumer<in T> { fn accept(x: T!) -> void }`)

## 提案内容

### 構文 (EBNF 差分)

```ebnf
TypeParam ::= VarianceModifier? Identifier (":" TypeBound)?
VarianceModifier ::= "out"    (* 共変 *)
                   | "in"     (* 反変 *)
                   (* 省略時: 不変 (invariant) *)
```

### 使用例

```prisma
// 共変: T は出力位置のみ (return 値、read-only field)
protocol Producer<out T> @intent("T を生産する") {
  fn produce() -> T!
}

// 反変: T は入力位置のみ (parameter、write-only field)
protocol Consumer<in T> @intent("T を消費する") {
  fn consume(item: T!) -> void
}

// 混在 (一般的な Repository パターン)
protocol Collection<out R, in W> {
  fn read()          -> R?          // out 位置
  fn write(item: W!) -> void        // in 位置
}
```

### 使用位置の検証

- `<out T>` の T は **return 型 / read-only field** のみに出現可能。input 位置で使うと error
- `<in T>` の T は **parameter** のみに出現可能。return 位置で使うと error
- 不変 T は両方 OK

### Subtyping 規則

```
Dog <: Animal (Dog は Animal のサブタイプ) のとき:

Producer<out T>:
  Producer<Dog>    <: Producer<Animal>      ✅ 共変で渡せる

Consumer<in T>:
  Consumer<Animal> <: Consumer<Dog>         ✅ 反変 (逆向き)

Repository<T>: (invariant)
  Repository<Dog>  と Repository<Animal> は無関係          ❌
```

## IR 影響

```jsonc
"protocol.typeParams.items": {
  "properties": {
    "variance": {
      "enum": ["in", "out", null],
      "description": "共変 / 反変 / 不変 (null = invariant)"
    }
  }
}
```

## 後方互換性

**Class A (additive)**: 既存のジェネリクスは全て不変扱い、variance 修飾子未指定は従来と同等。

## 代替案

- **案 B: 変性を推論 (site-variance)** — 却下: 型検査が複雑、読み手に判別しづらい
- **案 C: Scala の `[+T]` / `[-T]` 記法** — 却下: `+` は他の DSL 構文と衝突 (visibility `+`)

## サンプル / テスト

- `modules-ddd.umlay` の Repository を `Repository<out T: Identifiable>` に拡張した版
- 新サンプル `samples/variance-demo.umlay`: Producer / Consumer / Collection
- Conformance: 使用位置違反 (in T を return に使う等) の error 検出

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §4.2 に variance 節追加
- [ ] `grammar.bnf` の `TypeParam` を拡張
- [ ] `ir.schema.json` の typeParams に variance 追加
- [ ] `skills/{ja,en}/write-uml.md` に out/in の例と使用位置ルール追加
- [ ] `SPEC_VERSION` 0.6.0 bump

## 未解決事項

- Declaration-site variance の他に use-site variance (`Producer<out Dog>`) を許すか
- 不変位置に変性パラメータを渡した場合の暗黙昇格ルール
- variance と recursive variant (RFC 0012) との相互作用
