---
implementation: <impl-name>
version: <impl-version>
spec-version: 0.4.0
report-date: YYYY-MM-DD
reporter: "<@github-handle>"
level-claim: L1     # L1 / L2 / L3 (実装が目指すレベル)
---

# Conformance Report — <impl-name> <impl-version>

## Summary

| Metric | Score |
| --- | --- |
| L1 (parse) | NN / 17 |
| L2 (IR)    | NN / 17 |
| L3 (render)| NN / 17 |
| Overall    | NN / 51 |

## Implementation details

- **Type**: parser / renderer / full stack / other
- **Language**: TypeScript / Rust / Python / Go / etc
- **Repository**: https://github.com/...
- **License**: Apache-2.0 / MIT / etc

## Per-sample results

### `hello-order.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ✅ pass | IR matches `expected-ir/hello-order.ir.json` |
| L3 render| ✅ pass | |

### `blog.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ✅ pass | |
| L3 render| ⏭ skip | renderer が ER のみ対応、class は対象外 |

### `ecommerce.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ❌ fail | `@pattern` の IR マッピングが未実装 |
| L3 render| ✅ pass | |

### `saas-multitenant.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ✅ pass | |
| L3 render| ✅ pass | |

### `japanese-domain.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | Unicode identifier OK |
| L2 IR    | ✅ pass | `@codegenName` が IR に保持 |
| L3 render| ✅ pass | |

### `with-attachments.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ✅ pass | |
| L3 render| ⏭ skip | 添付画像のパネル表示は renderer 依存 |

### `with-custom-theme.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ✅ pass | |
| L3 render| ✅ pass | |

### `reserved-keywords.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | コメント内の予約語が identifier として扱われていないことを検証 |
| L2 IR    | ✅ pass | |
| L3 render| ✅ pass | |

### `project-schedule.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ❌ fail | `@@sample` 行数が期待と異なる (XX vs 13) |
| L3 render| ❌ fail | Gantt renderer が未実装 |

### `login/login.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ✅ pass | |
| L3 render| ⏭ skip | sequence renderer 未実装 |

### `event-sourcing.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ❌ fail | RFC 0010 inline variant の `{ ... }` 構文未対応 |
| L2 IR    | — | L1 fail のため未評価 |
| L3 render| — | |

### `modules-ddd.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ❌ fail | `extends A, B, C` の mro 計算未実装 |
| L3 render| ❌ fail | |

### `multi-project-schedule/pm-core.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ✅ pass | |
| L3 render| ❌ fail | Gantt renderer 未実装 |

### `multi-project-schedule/pm-feature-a.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ❌ fail | RFC 0009 `import` 未対応 |
| L2 IR    | — | |
| L3 render| — | |

### `multi-project-schedule/pm-feature-b.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ❌ fail | (同上) |
| L2 IR    | — | |
| L3 render| — | |

### `concurrent-flow.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ❌ fail | RFC 0007 `par` / RFC 0013 `await` 未対応 |
| L2 IR    | — | |
| L3 render| — | |

### `ast-expr.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ❌ fail | RFC 0012 recursive union variant 未対応 |
| L2 IR    | — | |
| L3 render| — | |

### `diamond-protocol.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ✅ pass | |
| L2 IR    | ❌ fail | RFC 0011 C3 MRO / `@@override` の IR 化未対応 |
| L3 render| ❌ fail | |

### `with-glob-imports/*.uml`

| Level | Status | Notes |
| --- | --- | --- |
| L1 parse | ❌ fail | RFC 0014 glob import 未対応 |
| L2 IR    | — | |
| L3 render| — | |

## RFC 対応状況

| RFC | 機能 | 対応レベル | 備考 |
| --- | --- | --- | --- |
| 0001 | BNF 正式化 | ✅ 準拠 | |
| 0002 | view `layout:` | ⚠ 部分 | direction のみ対応、engine / hint 未 |
| 0003 | alt / else | ✅ 準拠 | |
| 0004 | `@@sample` inline | ⚠ 部分 | 10 行程度まで、大規模時の挙動未検証 |
| 0005 | cross-ns `@@dependencies` | ✅ 準拠 | |
| 0006 | protocol / union / module | ⚠ 部分 | module 未対応 |
| 0007 | opt / par | ❌ 未対応 | |
| 0008 | `@@sample(from: ...)` | ❌ 未対応 | |
| 0009 | `import` | ❌ 未対応 | |
| 0010 | protocol extends / inline variant | ❌ 未対応 | |
| 0011 | diamond MRO / `@@override` | ❌ 未対応 | |
| 0012 | recursive union variant | ❌ 未対応 | |
| 0013 | par `await` | ❌ 未対応 | |
| 0014 | glob import | ❌ 未対応 | |

## 既知の制約 / 今後の対応予定

- [ ] RFC 0007 の opt / par を 1.3.0 で対応予定
- [ ] RFC 0009 の import を 1.4.0 で対応予定 (段階移行)
- [ ] RFC 0010 / 0011 は 2.0 メジャーバージョン向け

## 実行方法 (参考)

```bash
# L1 (parse)
pnpm test:conformance:parse
# L2 (IR)
pnpm test:conformance:ir
# L3 (render) — implementation が visual diff 機能を持つ場合
pnpm test:conformance:render
```

## 署名

本レポートは実装者による自己申告であり、spec の maintainer による正式な認証ではない。独立第三者監査は CONFORMANCE-AUDIT.md (別文書) に従う。

- Reporter: `<@github-handle>`
- Date: YYYY-MM-DD
- Commit SHA: `abcdef01`
