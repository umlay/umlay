---
rfc: 0006
title: `protocol<T>` / `union` / `module` 宣言構文
author: "@kigi"
status: accepted
created: 2026-04-18
updated: 2026-04-19
accepted: 2026-04-19
spec-version-target: 0.2.0
change-class: A
---

# RFC 0006 — `protocol<T>` / `union` / `module` 宣言構文

## 要約

`RESERVED_KEYWORDS` に含まれている `protocol` / `union` / `module` の宣言構文を正式に定義し、現行 Phase 1 の「parse 受理のみ」から描画・解釈対象に昇格させる。

## 背景 / モチベーション

- `protocol<T> { fn get(id) -> T? }` のような抽象 interface は Java / Swift / Go 問わず必要
- `union OrderEvent = Created | Shipped | Cancelled` のような代数的データ型は イベントソーシング / 状態機械で頻出
- `module` は namespace より小さい命名境界として使われる (サブドメイン / バウンディッドコンテキスト)
- 3 つとも予約語として確保されているが宣言構文未定義 → 使えない状態

## 提案内容

### 1. `protocol<T>` (generic interface)

```ebnf
ProtocolDecl    ::= "protocol" Identifier TypeParams? IntentAnnotation?
                    "{" ProtocolMember* "}"
TypeParams      ::= "<" Identifier ("," Identifier)* ">"
ProtocolMember  ::= FnMethod | Field
```

```prisma
protocol Repository<T> @intent("永続化の汎用契約") {
  fn get(id: UUID!)   -> T?
  fn save(entity: T!) -> void
  fn delete(id: UUID!) -> bool!
}

model UserRepository @service @intent("User 専用 Repository") {
  // 契約準拠。具体型は codegen 時に解決
  @@implements(Repository<User>)
}
```

### 2. `union` (sum type / algebraic data type)

```ebnf
UnionDecl       ::= "union" Identifier "=" UnionVariant ("|" UnionVariant)+
                    IntentAnnotation?
UnionVariant    ::= Identifier
```

```prisma
union OrderEvent = Created | Confirmed | Shipped | Cancelled
  @intent("Order のドメインイベント (event sourcing)")

model Created @entity { +orderId UUID! @id +at Timestamp! }
model Confirmed @entity { +orderId UUID! @id +at Timestamp! }
/* ... */
```

discriminator は variant の model 名で自動生成。

### 3. `module` (sub-namespace)

```ebnf
ModuleDecl      ::= "module" Identifier ModelAnnotation?
                    "{" ModuleBody "}"
ModuleBody      ::= (TypeDecl | EnumDecl | ModelDecl | ViewDecl
                   | ProtocolDecl | UnionDecl | ModuleDecl)*
```

```prisma
namespace shop

module catalog @intent("商品カタログのサブドメイン") {
  model Product @aggregate_root { /* ... */ }
  model Category @entity { /* ... */ }
}

module checkout @intent("注文処理のサブドメイン") {
  model Order @aggregate_root { /* ... */ }
  model OrderLine @entity { /* ... */ }
}
```

参照は `shop.catalog.Product` のように `.` 連結。

## IR 影響

```jsonc
// namespace 定義にモジュール階層を追加
"namespace": {
  "type": "object",
  "properties": {
    "models": { /* 既存 */ },
    "types":  { /* 既存 */ },
    "enums":  { /* 既存 */ },
    "protocols": { "type": "object", "additionalProperties": { "$ref": "#/$defs/protocol" } },
    "unions":    { "type": "object", "additionalProperties": { "$ref": "#/$defs/union" } },
    "modules":   { "type": "object", "additionalProperties": { "$ref": "#/$defs/namespace" } }
  }
}

// $defs に追加
"protocol": {
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": { "type": "string" },
    "typeParams": { "type": "array", "items": { "type": "string" } },
    "methods": { "type": "array" },
    "intent": { "type": "string" }
  }
},
"union": {
  "type": "object",
  "required": ["name", "variants"],
  "properties": {
    "name": { "type": "string" },
    "variants": { "type": "array", "items": { "type": "string" } },
    "intent": { "type": "string" }
  }
}
```

## 後方互換性

**Class A (additive)**: 既存 `.umlay` は無影響。ただし `protocol` / `union` / `module` を識別子として使っていたコードはすでに **現行 Phase 1 でも parse error** (予約語のため)、本 RFC で状況悪化なし。

## 代替案

- **案 B: `interface` stereotype で済ます** — 却下: 既存 `@interface` は model の役割、generic を持たない
- **案 C: TypeScript の type alias 流用 (`type X = Y | Z`)** — 却下: Umlay の `type` は値オブジェクト専用
- **案 D: RFC を 3 つに分割 (protocol / union / module)** — 却下: 3 つとも class / ER の「補完」位置づけで独立性が弱い。一括で合意する方が spec の整合性が取りやすい

## サンプル / テスト

- 新サンプル `packages/examples/samples/event-sourcing.umlay` で `union` の使用例
- 新サンプル `packages/examples/samples/modules-ddd.umlay` で `module` + `protocol` の組み合わせ
- conformance: `protocol<T>` のジェネリクス解決、`union` variant の model 実在性、`module` の入れ子

## 受諾時にやること

- [ ] `grammar.md` に § 追加 (`protocol` / `union` / `module` の節)
- [ ] `ir.schema.json` に `protocol` / `union` / `modules` 定義追加
- [ ] `packages/spec/src/index.ts` の `RESERVED_KEYWORDS` コメントを更新 (`将来 UML` → `Phase 2 実装`)
- [ ] RFC 0001 の BNF に反映
- [ ] `docs/{ja,en}/dsl-guide.md` に 3 節追加
- [ ] `skills/{ja,en}/write-uml.md` に使用例追加
- [ ] `skills/{ja,en}/codegen-mapping.md` に `protocol` → TS interface、`union` → TS discriminated union のマッピング追加

## 未解決事項

- `protocol` の多重継承 (`protocol Foo extends Bar, Baz`)
- `union` に payload を持つ variant (`Created { orderId: UUID }` 形式の inline 定義)
- `module` の可視性制御 (`export` / `internal` 概念の必要性)
