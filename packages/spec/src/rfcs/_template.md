---
rfc: NNNN
title: <短い題名>
author: <@github-handle>
status: draft            # draft / open / accepted / rejected / superseded
created: YYYY-MM-DD
updated: YYYY-MM-DD
spec-version-target: 0.X.Y
change-class: A          # A (additive) / B (relaxation) / C (breaking)
supersedes:              # (もしあれば NNNN)
superseded-by:           # (もしあれば NNNN)
---

# RFC NNNN — <タイトル>

## 要約

1〜2 文で、この RFC が何を提案するか。

## 背景 / モチベーション

なぜこの変更が必要か。現状の制約、ユースケース、関連 Issue。

## 提案内容

### 構文の追加 / 変更

```prisma
// DSL 例
```

### IR schema への影響

```jsonc
// 追加 / 変更する JSON Schema のフラグメント
```

### 後方互換性

skills/ja/evolve-schema.md の分類に照らし、A / B / C のいずれか。
- A の場合: `IR_SCHEMA_VERSION` は据え置き
- B の場合: 既存消費者への影響評価
- C の場合: 2 段階移行計画 (deprecate → sunset)

## 代替案

- **案 X**: 〜 (却下理由: 〜)
- **案 Y**: 〜 (却下理由: 〜)

## サンプル / テスト

- 追加するサンプル: `packages/examples/samples/<name>.umlay`
- conformance テスト (該当時)

## 受諾時にやること

- [ ] `packages/spec/src/grammar.md` 更新
- [ ] `packages/spec/src/ir.schema.json` 更新
- [ ] `packages/spec/src/index.ts` のバージョン bump (A なら patch、B なら minor、C なら major)
- [ ] 関連 skill の `spec:` フロントマター更新
- [ ] `docs/{ja,en}/dsl-guide.md` / `docs/{ja,en}/roadmap.md` 更新
- [ ] サンプル追加または既存サンプル更新

## 未解決事項

- (未決)
