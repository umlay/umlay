---
rfc: 0025
title: Code generation hooks (`@@codegen` 拡張ポイント)
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.7.0
change-class: A
parent-rfc: null
---

# RFC 0025 — Code generation hooks

## 要約

DSL → コード生成 (Prisma / SQL / TS / OpenAPI 等) のパイプラインに、**宣言的な hook 機構** (`@@codegen(...)`) を導入する。生成器ごとに出力をカスタマイズできる。

## 背景 / モチベーション

現状 `skills/*/codegen-mapping.md` は決定論的 1:1 マッピングを規定しているが、実際のプロジェクトでは:

- 特定 attribute は DB には出したくない (`@@codegen(prisma: skip)`)
- Prisma では camelCase、SQL では snake_case にしたい
- ある model の生成には独自テンプレート文字列を使いたい
- protocol 実装のテンプレートにカスタマイズフックを入れたい

現状はユーザ側で IR → 変換器 → 手編集、という流れを強いる。spec レベルで拡張ポイントを標準化する。

## 提案内容

### 構文 (EBNF 差分)

```ebnf
BlockDirective      ::= ... | CodegenBlock

CodegenBlock        ::= "@@codegen" "(" CodegenSpec ("," CodegenSpec)* ")"
CodegenSpec         ::= TargetName ":" CodegenAction
TargetName          ::= "prisma" | "sql" | "ts" | "openapi" | Identifier
CodegenAction       ::= "skip"
                      | "rename" "(" String ")"
                      | "template" "(" String ")"
                      | "type"   "(" String ")"
                      | "{" CodegenField ("," CodegenField)* "}"
CodegenField        ::= Identifier ":" (Expr | Identifier)
```

### 使用例

```prisma
model User @aggregate_root {
  +id           UUID!   @id
  +internalCode string! @@codegen(prisma: skip, openapi: skip)
  +email        string! @@codegen(sql: rename("email_address"))
  +metadata     string? @@codegen(ts: type("Record<string, unknown>"))
}

model Order @aggregate_root {
  @@codegen(
    prisma: { tableName: "orders_v2" },
    sql:    { tablespace: "orders_ts" },
    ts:     { extend: "Domain<Order>" }
  )

  +id         UUID!    @id
  +customerId UUID!    @ref(User.id)
}
```

### セマンティクス

- `skip`: そのターゲットでの出力を省略
- `rename(S)`: 識別子を別名に変更 (@codegenName の target-specific 版)
- `template(S)`: カスタムテンプレートを利用 (内容は実装依存)
- `type(S)`: 生成型の型表現を差し替え
- object 形: 複数フィールドをまとめて指定

### ターゲット名

標準: `prisma` / `sql` / `ts` / `openapi` / `graphql` / `zod`。ユーザ定義ターゲットは任意 (実装側で認識)。

## IR 影響

```jsonc
"codegen": {
  "type": "object",
  "additionalProperties": {
    "oneOf": [
      { "const": "skip" },
      { "type": "string" },
      {
        "type": "object",
        "properties": {
          "action": { "enum": ["skip", "rename", "template", "type"] },
          "value":  { "type": ["string", "object"] }
        }
      }
    ]
  }
}
```

model / attribute / enum / view / protocol / union 各要素に optional で付与。

## 後方互換性

**Class A (additive)**: 既存の `@codegenName` は継続利用可。`@@codegen(prisma: rename("..."))` は **model / attribute 単位で target 別** に指定できる拡張。

## 代替案

- **案 B: 外部 `codegen.config.yaml` に分離** — 却下: モデル直近にあるほうがレビューしやすい
- **案 C: `@@codegen_for_prisma(...)` のような target 別ブロック** — 却下: ブロック数が増える
- **案 D: テンプレート言語標準化 (Handlebars 等)** — 却下: spec の範囲を超える

## サンプル / テスト

- 新サンプル `samples/with-codegen-hooks.uml`: 各ターゲットの各 action デモ
- Conformance: 未知ターゲット名の warning、object 形の parse

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §8 に `@@codegen` 追加
- [ ] `grammar.bnf` の `BlockDirective` に `CodegenBlock` 追加
- [ ] `ir.schema.json` の model / attribute / enum / view / protocol / union に `codegen` 追加
- [ ] `skills/{ja,en}/codegen-mapping.md` に hook 対応表と実例追加
- [ ] `SPEC_VERSION` 0.7.0 bump

## 未解決事項

- 複数ターゲット同時生成時の優先順位 (例: Prisma の `rename` と SQL の `rename` が衝突)
- Template 言語の統一 (一旦はターゲット実装の自由、将来 RFC)
- `@@codegen` とブランド変数 (`${ENV_VAR}`) の相互作用
