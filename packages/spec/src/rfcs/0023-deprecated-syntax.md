---
rfc: 0023
title: `@deprecated` アノテーションの正式仕様化
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.7.0
change-class: A
parent-rfc: null
---

# RFC 0023 — `@deprecated` アノテーションの正式仕様化

## 要約

`skills/*/evolve-schema.md` では `@deprecated("use X instead since 1.1")` を「将来構文」として参照しているが、spec 本体では未定義。正式に文法化し、broadcast (migration guide) と連動させる。

## 背景 / モチベーション

- 既存属性 / model / protocol を **段階的に廃止**する公式手段が spec に無い
- 現状は削除 → 再追加で C (breaking) を強いられる
- IDE / LSP / code review ツールが deprecation 警告を出せる統一表現が必要

## 提案内容

### 構文 (EBNF 差分)

`@deprecated` は既に 5.3 契約系アノテーションとして `grammar.bnf` に存在するが、引数形を拡張:

```ebnf
DeprecatedAnnotation ::= "@deprecated" "(" DeprecatedArgs ")"
DeprecatedArgs       ::= String                                    (* 短縮形: message *)
                       | "{" DeprecatedField ("," DeprecatedField)* "}"
DeprecatedField      ::= "message" ":" String
                       | "since"   ":" String                      (* semver *)
                       | "removeIn" ":" String                     (* semver (想定メジャーバージョン) *)
                       | "replaceWith" ":" QualifiedName
```

### 使用例

```prisma
model User @aggregate_root {
  +id       UUID!   @id
  +email    string! @unique
  +username string!  @deprecated("use displayName instead")    // 短縮形
  +displayName string?

  +fullName string! @deprecated({
    message:     "split into givenName + familyName",
    since:       "0.7.0",
    removeIn:    "1.0.0",
    replaceWith: User.displayName
  })
}

// protocol / model 単位でも使える
protocol LegacyRepo @deprecated({ since: "0.7.0", replaceWith: Repository }) {
  fn find(id: UUID!) -> any?
}
```

### 適用対象

attribute / method / model / protocol / enum value / view / type — DSL の任意要素。

### 検証規則

- `since` / `removeIn` は有効な semver
- `replaceWith` の QualifiedName が解決できる (未解決なら warning)
- Strict mode では deprecated 要素の使用時に warning 出力 (block はしない)

## IR 影響

```jsonc
"deprecated": {
  "type": "object",
  "properties": {
    "message":     { "type": "string" },
    "since":       { "type": "string" },
    "removeIn":    { "type": "string" },
    "replaceWith": { "type": "string" }
  }
}
```

attribute / model / protocol / union / enum / view 各 IR 要素に optional で付与される。

## 後方互換性

**Class A (additive)**: 短縮形 (`@deprecated("msg")`) は既に skills で参照されているので、本 RFC で構文を公式化するのみ。object 形は新規追加。

## サンプル / テスト

- 新サンプル `samples/deprecated-migration.umlay`: `@deprecated` の 4 パターン
- Conformance: since / removeIn の semver 検証、replaceWith 解決

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §5.3 に `@deprecated` の詳細引数形を追記
- [ ] `grammar.bnf` の `DeprecatedAnnotation` を拡張
- [ ] `ir.schema.json` に `deprecated` object を追加
- [ ] `skills/{ja,en}/evolve-schema.md` の `@deprecated` 説明を正式仕様に差し替え
- [ ] `skills/{ja,en}/review-uml.md` に「deprecated 要素の使用警告」ルール (W01) を追加
- [ ] `SPEC_VERSION` 0.7.0 bump

## 未解決事項

- `@deprecated` が適用された要素を使う**コード側**への警告伝播 (codegen マッピング)
- `deprecated` cascading (container が deprecated の場合の子要素扱い)
- `@experimental` との区別 / 並立
