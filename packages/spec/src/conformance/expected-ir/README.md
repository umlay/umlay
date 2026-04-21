# Expected IR (L2 Conformance Fixtures)

各 `.uml` サンプルを spec 準拠パーサに通したときの**期待される正規IR**を JSON 固定値として格納する。

実装 (別リポジトリのパーサ) は自前の parse 結果を本ディレクトリの期待値と比較することで **L2 (IR) レベルの conformance** を検証できる。

## 比較方針

- **構造同一性**: `namespaces` / `models` / `views` の keys・値が完全一致
- **`_id` は無視可**: 内容ハッシュ由来のため実装間で差分が出る場合がある。keys の集合だけ照合すれば OK
- **順序は決定論**: 属性順は DSL ソース順、名前空間内の model 順はアルファベット順 (parser 実装のガイドライン)
- **前後 whitespace / 改行**: 無視

## ir.schema.json との関係

- `ir.schema.json` は `packages/core/src/ir.ts` (Zod) から `pnpm --filter @umlay/core gen:ir-schema` で**自動生成される正本**。手編集しない
- 本 fixture は参照実装 (`@umlay/core`) の parse 出力から再生成される。アスピレーショナルな差分は **spec 1.0 RC 時点で解消済**
- 再生成コマンド: `pnpm --filter @umlay/core run regen:fixtures`
- 実装側は JSON Schema の structural validation (`additionalProperties: true` なので余剰フィールドは warning に格下げ) + `_id` 省略可の慣習で互換運用する

## 対応表

| サンプル | 期待 IR | 検証対象の spec 機能 |
| --- | --- | --- |
| `hello-order.uml` | [`hello-order.ir.json`](./hello-order.ir.json) | 最小構成 (model + view + @ref + @@id) |
| `blog.uml` | [`blog.ir.json`](./blog.ir.json) | 基本 ER (User / Post / Comment / Tag、enum + @default + @unique) |
| `ecommerce.uml` | [`ecommerce.ir.json`](./ecommerce.ir.json) | `type @value_object` + cascade / inverse + `@pattern` |
| `event-sourcing.uml` | [`event-sourcing.ir.json`](./event-sourcing.ir.json) | RFC 0010 inline payload variant + fn method |
| `modules-ddd.uml` | [`modules-ddd.ir.json`](./modules-ddd.ir.json) | RFC 0006 / 0010 module + protocol extends |
| `project-schedule.uml` | [`project-schedule.ir.json`](./project-schedule.ir.json) | RFC 0004 `@@sample` の展開 (抜粋版) |
| `concurrent-flow.uml` | [`concurrent-flow.ir.json`](./concurrent-flow.ir.json) | RFC 0007 par / opt + RFC 0013 await (labels) |
| `ast-expr.uml` | [`ast-expr.ir.json`](./ast-expr.ir.json) | RFC 0012 recursive union variant + ジェネリクス Tree<T> |
| `diamond-protocol.uml` | [`diamond-protocol.ir.json`](./diamond-protocol.ir.json) | RFC 0011 C3 MRO + `@@override` の 4 パターン |
| `multi-project-schedule/pm-feature-a.uml` | [`multi-project-schedule/pm-feature-a.ir.json`](./multi-project-schedule/pm-feature-a.ir.json) | RFC 0005 cross-ns `@@dependencies` + RFC 0009 `import` |
| `multi-project-schedule/pm-core.uml` | [`multi-project-schedule/pm-core.ir.json`](./multi-project-schedule/pm-core.ir.json) | cross-ns 依存の参照元 (baseline タスク) |
| `multi-project-schedule/pm-feature-b.uml` | [`multi-project-schedule/pm-feature-b.ir.json`](./multi-project-schedule/pm-feature-b.ir.json) | 2 namespace への cross-ns 依存 + lag 指定 |
| `saas-multitenant.uml` | [`saas-multitenant.ir.json`](./saas-multitenant.ir.json) | 複合 PK / `@@unique(a,b)` / `@@index` / enum default |
| `japanese-domain.uml` | [`japanese-domain.ir.json`](./japanese-domain.ir.json) | Unicode 識別子 + `@codegenName` の IR 保持 |
| `bounded-generics.uml` | [`bounded-generics.ir.json`](./bounded-generics.ir.json) | RFC 0015 bounded typeParams (`T: Identifiable & Comparable`) |
| `transfer-critical.uml` | [`transfer-critical.ir.json`](./transfer-critical.ir.json) | RFC 0017 critical + RFC 0007 par/opt + RFC 0013 await 混在 |
| `reserved-keywords.uml` | [`reserved-keywords.ir.json`](./reserved-keywords.ir.json) | 予約語を identifier として使わない normal case |
| `with-attachments.uml` | [`with-attachments.ir.json`](./with-attachments.ir.json) | `@@attachments` の object 形、doc ブロック展開 |
| `with-custom-theme.uml` | [`with-custom-theme.ir.json`](./with-custom-theme.ir.json) | file-level `@@theme` 継承 + view-level theme override |
| `login/login.uml` | [`login/login.ir.json`](./login/login.ir.json) | 7 view 複合 (sequence with alt/else, state_machine, component_diagram 等) |
| `with-glob-imports/root.uml` | [`with-glob-imports/root.ir.json`](./with-glob-imports/root.ir.json) | RFC 0014 glob import の `meta.imports.glob` 展開記録 |
| `with-glob-imports/tasks/sprint-1.uml` | [`with-glob-imports/tasks/sprint-1.ir.json`](./with-glob-imports/tasks/sprint-1.ir.json) | glob 被 import 側 (独立 namespace、sprint 1) |
| `with-glob-imports/tasks/sprint-2.uml` | [`with-glob-imports/tasks/sprint-2.ir.json`](./with-glob-imports/tasks/sprint-2.ir.json) | glob 被 import 側 (sprint 2) |
| `with-glob-imports/tasks/sprint-3.uml` | [`with-glob-imports/tasks/sprint-3.ir.json`](./with-glob-imports/tasks/sprint-3.ir.json) | glob 被 import 側 (sprint 3) |
| `with-impl-blocks/core.uml` | [`with-impl-blocks/core.ir.json`](./with-impl-blocks/core.ir.json) | impl 注入前の protocol + model 宣言のみの状態 |
| `with-impl-blocks/feature-auth.uml` | [`with-impl-blocks/feature-auth.ir.json`](./with-impl-blocks/feature-auth.ir.json) | impl ブロック宣言側 (`_implApplications` に impl 情報) |
| `with-impl-blocks/feature-audit.uml` | [`with-impl-blocks/feature-audit.ir.json`](./with-impl-blocks/feature-audit.ir.json) | 追加の impl ブロック (audit 機能側) |
| `deprecated-migration.uml` | [`deprecated-migration.ir.json`](./deprecated-migration.ir.json) | RFC 0023: `@deprecated` の 5 レベル (attribute/model/protocol/enum value/view) の IR 保持 |
| `critical-path-demo.uml` | [`critical-path-demo.ir.json`](./critical-path-demo.ir.json) | RFC 0024: `criticalPath: highlight/compute/ignore` 3 view + 期待 CPM 結果 |
| `with-codegen-hooks.uml` | [`with-codegen-hooks.ir.json`](./with-codegen-hooks.ir.json) | RFC 0025: 6 target × 4 action の混合、model / attribute / deprecated との併用 |
| `experimental-api.uml` | [`experimental-api.ir.json`](./experimental-api.ir.json) | RFC 0027: `@experimental` (attribute/model/protocol/enum value) + `@deprecated` 併用 |
| `resilient-external-call.uml` | [`resilient-external-call.ir.json`](./resilient-external-call.ir.json) | RFC 0028: `critical` + `timeout` + `retry` (short / exponential / linear / constant / nested) |

**カバレッジ: 35 / 35 samples (100%)**。参照実装 (`@umlay/core`) の `conformance.test.ts` で全サンプルが `assertIRMatches` をパスすることを CI で検証。

## 実装側の検証手順

### 1 件ずつ検証

```ts
import { readFileSync } from 'fs';
import { parse } from 'my-parser';
import { assertIRMatches, formatDiffs } from '@umlay/spec/conformance';

const uml = readFileSync('packages/examples/samples/hello-order.uml', 'utf8');
const expected = JSON.parse(
  readFileSync('packages/spec/src/conformance/expected-ir/hello-order.ir.json', 'utf8'),
);
const { ir } = parse(uml);
const result = assertIRMatches(ir, expected);
// result.ok が true なら一致、false なら result.diffs[] に差分
if (!result.ok) console.error(formatDiffs(result));
```

### 全サンプルを一括検証 (L1 + L2 report)

```ts
import { runConformance, formatReport } from '@umlay/spec/conformance/cli';
import { parse } from 'my-parser';

const report = await runConformance({ parse });
console.log(formatReport(report));
process.exit(
  report.l1Pass === report.total && report.l2Pass === report.total ? 0 : 1,
);
```

### MatchOptions

- `strictIds` (default false) — `_id` の一致を要求。通常は false 推奨 (hash 差異を吸収)
- `strictExtras` (default false) — actual に expected にないフィールドがあれば fail。aspirational fixtures を許容するなら false
- `ignorePaths` — `"meta.imports"` のようなドット区切りパス配列で無視箇所を指定

## 更新ポリシー

- spec バージョンアップで IR スキーマが変わる場合: **受諾 RFC ごとに** 対応する expected-ir を更新
- サンプルが変更された場合: 該当 `.ir.json` を同時更新
- `_sampleSources[]` / `_id` 等は optional として省略可
