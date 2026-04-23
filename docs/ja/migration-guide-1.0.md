# Migration Guide — spec 0.x → 1.0

**Status**: **final (1.0 release — 2026-04-22 freeze)**

spec 0.1〜0.8 で段階的に追加された機能を踏まえ、**1.0 で整理/固定化された変更**の確定版。

## 0. 1.0 の位置づけ

- `@umlay/spec` 1.0 は「**spec の freeze**」を意味する: この時点で **IR schema version** も `1.0` 固定確認、文法も BNF で完全確定
- 以降の **破壊的変更** (Class C) は **spec 2.0** を要する
- 0.x 系は additive 改修 (Class A) + 緩和 (Class B) のみ

## 1. 廃止予定 (removeIn: 1.0.0)

0.x 系で `@deprecated({ removeIn: "1.0.0" })` マークされた要素は 1.0 で削除される:

| 要素 | 代替 | 導入時期 | 対応 RFC |
| --- | --- | --- | --- |
| `User.username` (旧フィールド名パターン) | `displayName` 系 | 0.3.0 | — |
| `LegacyUser` / `LegacyRepository<T>` (サンプル参考) | `User` / `Repository<T>` | 0.3.0 | — |
| `OrderStatus.EXPIRED` (enum value) | `CANCELLED` + `reason: "expired"` | — | — |
| 暗黙 namespace スキャン | 明示 `import` (RFC 0009) | 0.3.0 → 1.0 で廃止 | 0009 |

## 2. 強制化される検査

0.x では warning だったが 1.0 で error 化するルール (lint-rules.md 参照):

| Rule | 変更前 | 変更後 |
| --- | --- | --- |
| L001 (visibility 必須) | draft: info / strict: error | **全 mode で error** |
| L002 (multiplicity 必須) | draft: warn / strict: error | **全 mode で error** |
| L008 (`@intent` 必須) | strict: warn | strict: **error** |
| L014 (`@default` 型整合) | draft: warn | 全 mode: **error** |
| C002 (min-spec-version 不整合) | warn | **error** |

現状 draft mode で動いているコードは strict mode に事前移行しておくと安全。

## 3. 構文の固定化

### 3.1 予約語の正式化

0.x 系の RESERVED_KEYWORDS 一覧 (index.ts 参照) に対し、以下は 1.0 で**正式な宣言キーワード**になる:

| キーワード | 役割 |
| --- | --- |
| `protocol` | protocol 宣言 (RFC 0006、0.3.0 で実装済) |
| `union` | union 宣言 (RFC 0006、0.3.0 で実装済) |
| `module` | module 宣言 (RFC 0006、0.3.0 で実装済) |
| `fn` | method 宣言 (RFC 0001 の Phase 1 から実装) |
| `import` | import 宣言 (RFC 0009、0.3.0) |
| `impl` | impl ブロック (RFC 0016、0.5.0) |

以降の新キーワード追加は spec 2.0 相当の major change。

### 3.2 IR `_id` のアルゴリズム確定

RFC 0026 で定めた sha1 80bit アルゴリズムが 1.0 で固定。現行 0.8.x 以前の IR を持つデータは、1.0 移行時に `_id` 再計算が必要。

マイグレーション script (概念):

```ts
import { computeId } from '@umlay/spec/id';

for (const model of oldIR.namespaces.*.models.*) {
  model._id = computeId({ kind: 'model', namespace: ns, name: model.name });
  // attributes も同様に再計算
}
```

### 3.3 view kind の固定

現在 10 kind + 将来予約 (RFC 0024 の `materialized_view` 検討中 等)。1.0 でこのセットを確定し、以降の追加は RFC を経た minor bump で。

## 4. 新規追加されたが破壊的変更は無い機能 (0.x → 1.0 で無影響)

以下は全て Class A (additive) なので、1.0 移行時に既存コードの変更は不要:

- `@@sample(...)` (RFC 0004)
- cross-namespace `@@dependencies` (RFC 0005)
- `protocol` / `union` / `module` (RFC 0006)
- `opt` / `par` / `await` (RFC 0007 / 0013)
- `@@sample(from: ...)` (RFC 0008)
- `import` / glob import (RFC 0009 / 0014)
- inline variant / recursive union (RFC 0010 / 0012)
- C3 MRO / `@@override` (RFC 0011)
- bounded generics / variance (RFC 0015 / 0019)
- impl blocks / blanket impl (RFC 0016 / 0020)
- critical / timeout / retry (RFC 0017 / 0021 / 0028)
- well-foundedness 検査 (RFC 0018 / 0022)
- `@deprecated` / `@experimental` (RFC 0023 / 0027)
- Gantt critical path (RFC 0024)
- `@@codegen` hooks (RFC 0025)
- `_id` hash algorithm (RFC 0026)
- Lint catalog / Type inference (RFC 0029 / 0030)

## 5. 移行チェックリスト (1.0 RC 時点で確認)

### プロジェクト側

- [ ] `@deprecated({ removeIn: "1.0.0" })` な要素を全て移行
- [ ] 暗黙 namespace スキャン → `import` 明示に全面移行
- [ ] lint の `L001` / `L002` / `L008` / `L014` が全て pass
- [ ] `@@mode(strict)` で全サンプルが通る
- [ ] IR `_id` を再計算 (RFC 0026 sha1 形式)

### ツール / 実装側

- [ ] parser が 1.0 の BNF に準拠
- [ ] IR validator が 1.0 schema に準拠
- [ ] conformance report (`conformance/reports/`) を 1.0 向けに再提出
- [ ] codegen hooks (`@@codegen`) が全 target で期待通り動く
- [ ] LSP 実装 (該当すれば) が 1.0 構文に対応

## 5.5 実装状況 (spec 1.0.0 freeze 時点)

参照実装 (`packages/core`, `@umlay/lint`, `@umlay/renderer-er`, `@umlay/lsp`) のカバレッジ:

| 領域 | 1.0.0 状況 |
| --- | --- |
| DSL parser (BNF 準拠) | **100%** — 公開全サンプルが parse error なし |
| IR schema (Zod → JSON Schema 自動生成) | 全 RFC 受諾分反映済 (sequenceBody / layout / PMBOK deps / imports / protocol / union / impl / sampleSources / criticalPath / deprecated / experimental / `@@dependencies` / `@@implements`) |
| Lint rules | **53/53 (100%)** 実装 ([lint-rules.md](../../packages/spec/src/lint-rules.md))。R11 は runtime trace 無しの static 近似で暫定対応 |
| Renderer (全 10 view kind) | **100%** 実装 + CPM (PMBOK FS/SS/FF/SF + lag 対応) |
| Conformance L1 (parse) | **100%** (35/35 sample) |
| Conformance L2 (IR match) | **100%** — `conformance.test.ts` で `assertIRMatches` 全パス、`regen:fixtures` スクリプトで再生成可能 |
| LSP | `@umlay/lsp` 新規パッケージで diagnostics / hover / go-to-definition 提供 (VS Code 拡張は client として動作) |
| VS Code 拡張 | `apps/vscode/` skeleton 公開 — syntax highlight + LSP client + SVG preview |

## 6. 1.0 以降の拡張方針

1.0 freeze 後は:

- **minor (1.1 / 1.2 / ...)**: additive のみ (新 RFC)
- **major (2.0)**: 破壊的変更のみ (例: IR schema version を 2.0 にバンプ)

各 1.x release では [`rfcs/README.md`](../../packages/spec/src/rfcs/README.md) のインデックスを参照。

### 6.1 spec 1.1.0 の追加機能

| 機能 | RFC | 影響 |
| --- | --- | --- |
| `@@md(""" ... """)` model directive | 0031 | grammar 1 行追加 (additive)、IR `Model.docs[]` |
| Markdown trailer (`---` 以降) | 0031 | parser pre-処理、IR `docTrailer?` |
| Literate `.umlay.md` | 0031 | 新 API `parseLiterate(source)` |
| (Layer A: 既存 doc 文字列の Markdown レンダリング) | 0031 | 表示側のみ、grammar / IR 不変 |
| R13 lint rule (`@@md` 合計 200 行超で info) | 0031 follow-up | `@umlay/lint` 1.1+、54/54 |
| `irToDsl(ir)` canonical formatter | — | `@umlay/core` 1.1+ の新 public API (format-on-save / round-trip 用) |
| `renderDocument(ir)` Markdown + inline SVG | — | `@umlay/renderer-er` 1.1+ — web editor Document Mode の基盤 |

**移行作業: 不要**。全て後方互換。既存 `.umlay` ファイルはそのまま動く。新 API は
opt-in — 呼び出しコードを足さない限り挙動に影響しない。

### 6.2 spec 1.2.0 の追加機能

| 機能 | RFC | 影響 |
| --- | --- | --- |
| View selectors: `visibility:X` / `seq:X` / `**.attr` (Phase 1) | 0032 | grammar additive、IR 不変(`view.include/exclude` は `string[]` のまま) |
| View selectors: `stereotype:X` / `kind:X` (Phase 2) | 0032 | 同上 |
| `projectIrForView(ir, view)` 公開 API | — | `@umlay/core` 1.2+ — renderer / lint が共有 |
| `parseSelector(raw)` 公開 API | — | `@umlay/core` 1.2+ — selector の型安全 decode |
| L034 / L035 / L036 lint rules | 0032 | `@umlay/lint` 1.2+、**60/60 = 100%** |

**移行作業: 不要**。既存 `include: ns.*` / `exclude: ns.X` DSL は何も変えず
に動作。renderer / lint が selector を解釈するのは DSL 側に新しい selector
を書いた時だけ。IR consumer 側も `view.include` を `string[]` として扱う
既存コードは無変更で OK(selector は知らない文字列として素通りする)。

## 7. 参照

- [Roadmap](./roadmap.md)
- [Extending Guide](./extending.md)
- [Evolve Schema skill](../../skills/ja/evolve-schema.md)
- [Lint Rules](../../packages/spec/src/lint-rules.md)
- [Type Inference](../../packages/spec/src/type-inference.md)
- [English version](../en/migration-guide-1.0.md)
