---
implementation: umlay-parser-ts
version: 0.1.0
spec-version: 0.5.0
report-date: 2026-04-20
reporter: "@kigi"
level-claim: L2
---

# Conformance Report — umlay-parser-ts 0.1.0

**注記**: 本レポートは雛形 (sample stub)。実装はまだ別リポジトリで開発中のため、数値は予想値。実装完了後に再提出する。

## Summary

| Metric | Score | 割合 |
| --- | --- | --- |
| L1 (parse)  | 15 / 22 | 68% |
| L2 (IR)     | 12 / 22 | 55% |
| L3 (render) |  0 / 22 | 0% (renderer は別パッケージ) |
| Overall     | 27 / 66 | 41% |

## Implementation details

- **Type**: parser + IR builder
- **Language**: TypeScript (Chevrotain base)
- **Repository**: https://github.com/umlay/parser-ts (予定)
- **License**: Apache-2.0
- **Last commit**: (予想) TBD
- **Dependencies**: `chevrotain` / `zod` (IR schema validation)

## 対応状況

### ✅ 完全対応 (15 RFCs)

| RFC | 機能 |
| --- | --- |
| 0001 | BNF 正式化 |
| 0002 | view `layout:` (direction/engine/hint/spacing/align) |
| 0003 | alt / else / default |
| 0004 | `@@sample(...)` inline |
| 0005 | cross-ns `@@dependencies` |
| 0006 | protocol / union / module (+ `@@implements`) |
| 0007 | opt / par |
| 0008 | `@@sample(from: ...)` 外部ファイル (json / jsonl のみ、yaml / csv は next) |
| 0009 | `import` 構文 (単純 import、glob は 0014 で対応) |
| 0010 | protocol extends / inline variant |
| 0011 | C3 MRO / `@@override` |
| 0012 | recursive union variant |
| 0013 | par `await all / any / (labels) / timeout` |
| 0014 | glob import (単純パターンのみ、`**` は next) |
| 0017 | critical リージョン |

### ⚠ 部分対応 (2 RFCs)

| RFC | 機能 | 制約 |
| --- | --- | --- |
| 0015 | 型パラメータ制約 | 単一 bound のみ、`&` intersection は next |
| 0016 | impl ブロック | orphan rule 検査未実装 |

### ❌ 未対応 (1 RFC)

| RFC | 機能 | 予定 |
| --- | --- | --- |
| 0018 | well-foundedness 検査 | 0.2.0 で対応予定 |

## Per-sample results

### 基本サンプル

| Sample | L1 | L2 | Notes |
| --- | --- | --- | --- |
| `hello-order.umlay` | ✅ | ✅ | |
| `blog.umlay` | ✅ | ✅ | |
| `ecommerce.umlay` | ✅ | ✅ | |
| `saas-multitenant.umlay` | ✅ | ✅ | |
| `japanese-domain.umlay` | ✅ | ✅ | Unicode identifier OK |
| `with-attachments.umlay` | ✅ | ⚠ | `@@attachments` の object 形が未対応 (旧 string 形のみ) |
| `with-custom-theme.umlay` | ✅ | ✅ | |
| `reserved-keywords.umlay` | ✅ | ✅ | |

### 機能デモサンプル

| Sample | L1 | L2 | Notes |
| --- | --- | --- | --- |
| `project-schedule.umlay` | ✅ | ✅ | @@sample 13 rows 展開 OK |
| `login/login.umlay` | ✅ | ✅ | 4 分岐 alt/else/default 対応 |
| `event-sourcing.umlay` | ✅ | ✅ | inline variant 4 種対応 |
| `modules-ddd.umlay` | ✅ | ⚠ | `UserRepository extends` の MRO 計算は現状 simple linearization |
| `concurrent-flow.umlay` | ✅ | ✅ | par + opt + await labels 対応 |
| `ast-expr.umlay` | ✅ | ❌ | well-foundedness 検査未実装 (RFC 0018)、parse は通る |
| `diamond-protocol.umlay` | ✅ | ⚠ | `@@override(from: ...)` は parse OK、IR `overrides[]` マッピング未 |
| `bounded-generics.umlay` | ✅ | ⚠ | 単一 bound OK、intersection (`&`) は未 |
| `transfer-critical.umlay` | ✅ | ✅ | |

### 複数ファイルサンプル

| Sample | L1 | L2 | Notes |
| --- | --- | --- | --- |
| `multi-project-schedule/pm-core.umlay` | ✅ | ✅ | |
| `multi-project-schedule/pm-feature-a.umlay` | ✅ | ✅ | import OK |
| `multi-project-schedule/pm-feature-b.umlay` | ✅ | ✅ | 複数 import OK |
| `with-glob-imports/root.umlay` | ⚠ | ⚠ | `*.umlay` の glob OK、`**/*.umlay` は未 |
| `with-glob-imports/tasks/sprint-*.umlay` | ✅ | ✅ | |
| `with-impl-blocks/core.umlay` | ✅ | ✅ | |
| `with-impl-blocks/feature-auth.umlay` | ✅ | ⚠ | impl block parse OK、IR `implSource` 未 |
| `with-impl-blocks/feature-audit.umlay` | ✅ | ⚠ | 同上 |

## 既知の制約 / 今後のロードマップ

### v0.2.0 (予定、2026-05)

- [ ] RFC 0018 well-foundedness 検査
- [ ] RFC 0008 yaml / csv 外部ファイル
- [ ] RFC 0014 `**` 再帰 glob
- [ ] RFC 0015 `&` intersection bound
- [ ] RFC 0016 impl block IR 化 (`implSource`)

### v0.3.0 (予定、2026-06)

- [ ] L3 renderer 連携 (別パッケージ `@umlay/renderer-er` 等)
- [ ] diamond MRO の C3 linearization 厳密実装 (現行 simple linearization から)

### 将来

- [ ] RFC 0019 (型パラメータ variance) — 別途提案予定
- [ ] Incremental parsing (LSP 対応)

## 実行方法

```bash
git clone https://github.com/umlay/parser-ts.git
cd parser-ts
pnpm install
pnpm test:conformance
# → packages/spec/src/conformance/manifest.yaml を読み込み
# → 各 sample に対して parse + IR 比較を実行
# → reports/TEMPLATE.md 形式の結果を stdout に出力
```

## 署名

- Reporter: `@kigi`
- Date: 2026-04-20
- Commit SHA: `<TBD>` (実装完了時に記入)
- Notes: 本レポートは**雛形**のため、実数値は予想。正式提出時に更新する。
