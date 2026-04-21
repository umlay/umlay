---
rfc: 0029
title: Lint ルールカタログの標準化
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.8.0
change-class: A
parent-rfc: null
---

# RFC 0029 — Lint ルールカタログの標準化

## 要約

`skills/*/review-uml.md` に散らばっている Lint ルール (S01〜S12 / L001〜L013 / R01〜R10) を**公式カタログ** (`packages/spec/src/lint-rules.md`) として一元化し、各 RFC からの参照元を確立する。

## 背景 / モチベーション

現状の問題:
- ルール ID (`L001`, `S11`, `R09` 等) が skill ファイルに散らばっており、番号衝突しかけている
- 実装側が lint 実装するとき、どのルールが mandatory / optional か不明瞭
- RFC で新 lint ルールを提案するときの番号体系が未確立

## 提案内容

### カタログファイル

`packages/spec/src/lint-rules.md` を新設、以下の体系で整理:

#### カテゴリ

| Prefix | 用途 | Severity |
| --- | --- | --- |
| **S** | Spec violation (spec レベルの違反、必ず error) | blocker |
| **L** | Lint (慣習違反、mode により error/warn/info) | mode-dependent |
| **R** | Risk (設計アンチパターン、ヒューリスティック) | warn/info |
| **W** | Warning (新機能 / deprecated 使用等、情報通知) | info |
| **C** | Compatibility (spec バージョン差分警告) | warn |

### 各ルールの定義フォーマット

```markdown
## L014 — attribute の `@default` が type と整合

**Prefix**: L (lint)
**Severity**: warn (draft) / error (strict)
**Introduced**: spec 0.8.0 (RFC 0029)
**Applies to**: attribute
**Category**: type consistency

### 説明

`@default(v)` の v が attribute の型と整合しない場合:

- `decimal! @default("abc")` は error
- `int! @default(null)` は error
- `string! @default(42)` は error (型変換は自動でしない)

### 例

```prisma
// ❌ NG
+price decimal! @default("0.0")

// ✅ OK
+price decimal! @default(0.0)
```

### Fix

型に合う literal に書き換える。
```

### 番号割当

- **S01〜S99**: Spec violation
- **L001〜L199**: Lint
- **R001〜R099**: Risk heuristic
- **W001〜W099**: Warning
- **C001〜C099**: Compatibility

新規 lint ルールは本カタログに追記し、番号重複を防ぐ。

### 実装側の実装責務

カタログ内の各ルールに `mandatory: true/false` を明示:

- mandatory: 実装は必ずサポート (conformance L1 の一部)
- optional: 実装できなくても conformance 合格

### 既存ルールの移設

現状 review-uml skill にある S01-S12 / L001-L013 / R01-R10 を全てカタログに移し、skill からはカタログへの参照に変更。

## 新ルール例 (本 RFC で追加)

| ID | 内容 |
| --- | --- |
| L014 | attribute の `@default` が型と整合 |
| L015 | `@ref` の onDelete に `CASCADE` を使う際、循環検出 |
| L016 | protocol extends の深さ (3 超は警告) |
| R011 | `@experimental` 要素が runtime criticalpath に入っている |
| R012 | `union` の variant が 10 を超える (ADT 爆発) |
| W001 | deprecated 要素の使用 |
| W002 | experimental 要素の使用 |
| C001 | IR version と current spec の mismatch |

## IR 影響

直接の影響なし (lint は IR 生成後の検査段階)。ただし `meta.lintReport` に結果を格納する optional フィールドを仕様化可能:

```jsonc
"meta": {
  "lintReport": {
    "ruleset": "0.8.0",
    "findings": [
      { "rule": "L001", "severity": "error", "location": "...", "fix": "..." }
    ]
  }
}
```

## 後方互換性

**Class A**: ルール番号は既存 (S01-S12 等) を維持。カタログ化による名前衝突はなし。

## 受諾時にやること

- [ ] `packages/spec/src/lint-rules.md` を新設
- [ ] `skills/{ja,en}/review-uml.md` を lint-rules.md への参照に差し替え
- [ ] `grammar.md` / `grammar.en.md` の §13 (残置課題) から lint rule 関連を削除 (解消)
- [ ] `ir.schema.json` の meta に lintReport 追加
- [ ] `SPEC_VERSION` 0.8.0 bump

## 未解決事項

- ユーザ定義 lint ルール (`@@lint(extend: "./my-rules.md")`) のサポート
- Rule suppression コメント (`// umlay-lint-disable L001 next-line`)
- CI 連動 (conformance report に lint score を含めるか)
