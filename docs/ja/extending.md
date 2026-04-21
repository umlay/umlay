# Extending — Umlay DSL の拡張チュートリアル

Umlay DSL を**自分のプロジェクトで拡張する**ときの実践ガイド。独自の protocol / union / module / impl を足すときの定石と、spec 範囲内でどこまでできるかの境界を示す。

## このガイドの想定読者

- Umlay DSL を使って自前のドメインモデルを拡張したい
- 共有の protocol 契約 (Repository / Auditable) を自作したい
- 複数ファイル / 複数 namespace で cross-module な依存を扱いたい
- 既存 spec で足りない場合に RFC を起票したい

## 1. 拡張の 3 層構造

Umlay の拡張は以下の 3 層に分けて考える:

| 層 | 例 | spec 変更 |
| --- | --- | --- |
| **L0 モデル追加** | 新 model / enum / type を足す | 不要 |
| **L1 構造拡張** | 新 protocol / union / module を足す + `impl` / `@@implements` で合成 | 不要 |
| **L2 言語拡張** | 新アノテーション / 新 view kind / 新 block directive を足す | RFC 必要 |

L0 / L1 は自前プロジェクトで自由に、L2 は RFC プロセスを経る。

## 2. L0: 新 model を足す

```prisma
@@mode(strict)
namespace myapp

model Subscription @aggregate_root @intent("月次契約") {
  +id        UUID!       @id
  +userId    UUID!       @ref(User.id, onDelete: RESTRICT)
  +plan      string!
  +startedAt Timestamp!  @auto
  +endsAt    Timestamp?
}
```

`skills/ja/write-uml.md` の Step 1〜10 に従う。新規機能は不要。

## 3. L1a: 新 protocol で契約を合成

既存 protocol の複数を束ねた高水準 protocol を作る (RFC 0010 多重継承):

```prisma
namespace myapp

protocol SoftDeletable @intent("論理削除可能") {
  fn markDeleted() -> void
  fn isDeleted()   -> bool!
}

// 既存 protocol を継承 + 自作 protocol を組み合わせ
protocol AuditableSoftDelete extends Auditable, SoftDeletable, Timestamped
  @intent("監査 + 論理削除 + 時刻追跡を合成した契約")
```

## 4. L1b: impl で外部 model に契約を後付け

`core.User` に後から `SoftDeletable` を実装する (RFC 0016 impl):

```prisma
namespace myapp

import core

// orphan rule: SoftDeletable は myapp 所有 → OK
impl SoftDeletable for core.User {
  fn markDeleted() -> void { /* ... */ }
  fn isDeleted()   -> bool! { /* ... */ }
}
```

## 5. L1c: Blanket impl で自動派生 (RFC 0020)

```prisma
namespace myapp

// Timestamped かつ SoftDeletable な全型に自動で Archivable を供給
impl<T> Archivable for T where (T: Timestamped & SoftDeletable) {
  fn archive() -> void { /* ... */ }
}
```

## 6. L1d: union / recursive union で式・状態機械を表現

```prisma
namespace myapp.ast

// RFC 0010 inline variant + RFC 0012 recursive
union Expr =
  | NumLit { value: int! }
  | Ref    { name: string! }
  | Call   { fn: Expr!, args: string! }
  | Let    { name: string!, binding: Expr!, body: Expr! }
  @intent("ドメイン固有言語の AST")
```

## 7. L1e: module でサブドメインを分離

```prisma
namespace myapp

module billing {
  model Invoice @aggregate_root { /* ... */ }
  model Payment @aggregate_root { /* ... */ }
}

module notifications {
  model EmailTemplate @entity { /* ... */ }
}
```

参照は `myapp.billing.Invoice` / `myapp.notifications.EmailTemplate`。

## 8. L1f: 型制約で汎用 protocol を強化 (RFC 0015 / 0019)

```prisma
namespace myapp

// RFC 0015: bounded + RFC 0019: variance
protocol EventBus<in E: Hashable> @intent("hashable なイベントを発行") {
  fn publish(event: E!) -> void
}

protocol TypedRepository<T: Identifiable & SoftDeletable, out K>
  @intent("Identifiable かつ論理削除可能な型のリポジトリ") {
  fn findByKey(key: K!) -> T?
}
```

## 9. L1g: Gantt / WBS の拡張 (RFC 0004 / 0005 / 0014)

自前プロジェクトのタスクスキーマは `project-schedule.uml` / `with-glob-imports/` を参考に:

```prisma
namespace myapp.planning

import "./tasks/*.uml"    // glob で sprint ファイルを集約

view global-roadmap @gantt_chart {
  include: sprint_q1.Task, sprint_q2.Task, sprint_q3.Task, sprint_q4.Task
  layout: direction(LR), engine(elk)
}
```

## 10. L2: spec 本体の拡張 (RFC 起票)

以下のような場合は自前プロジェクトでは完結せず、RFC プロセスが必要:

- 新 view kind (既存 10 種以外、例: `@sankey_diagram`)
- 新 block directive (`@@policy(...)` 等)
- 新アノテーション (`@memo(...)` 等)
- 既存アノテーションのセマンティクス変更

### RFC 起票手順

1. `packages/spec/src/rfcs/_template.md` をコピーして `NNNN-<slug>.md` に
2. 番号割当ルール ([`rfcs/README.md`](../../packages/spec/src/rfcs/README.md)) に従って番号を付ける
3. 提案内容 / 代替案 / 後方互換 / サンプル案 を書く
4. PR 提出 → コメント期間 (7 日以上)
5. accepted になれば spec 本体 (`grammar.md` / `grammar.bnf` / `ir.schema.json` / `index.ts`) を更新

## 11. チェックリスト (拡張前の自己確認)

- [ ] 自分の拡張は L0 / L1 / L2 のどの層?
- [ ] L1 の場合、既存 spec 機能 (RFC 0001〜0022 受諾済) で実現可能か?
- [ ] `@intent` / visibility / nullability を適切に付与したか
- [ ] `skills/ja/review-uml.md` の S01〜S12 / L001〜L013 / R01〜R10 を満たすか
- [ ] `skills/ja/evolve-schema.md` の Class A / B / C 分類を確認したか
- [ ] L2 を必要とする場合、RFC を起票したか

## 12. よくある拡張パターンと対応 RFC

| 要件 | 使う RFC |
| --- | --- |
| タスクのインスタンスデータを宣言したい | RFC 0004 (`@@sample`) |
| 複数ファイルに分割したい | RFC 0009 (`import`) + RFC 0014 (glob) |
| 共通契約を合成して具体型に適用したい | RFC 0010 (extends) + RFC 0016 (impl) |
| 制約を満たす全型に自動機能を供給したい | RFC 0020 (blanket impl) |
| 式や AST などの再帰構造を表現したい | RFC 0012 (recursive union) |
| 並行処理 / 排他区間 / タイムアウトを描きたい | RFC 0007 + 0013 + 0017 + 0021 |
| ジェネリクスの型安全性を強化したい | RFC 0015 (bounds) + 0019 (variance) |

## 13. 実装側の拡張 (参照実装リポジトリ向け)

spec はこの `umlay-oss` リポジトリで定義されますが、**実装**は別リポジトリで追加されます。以下は実装者向けの典型的な拡張手順。

### 13.1 新 lint rule を実装する

1. `packages/spec/src/lint-rules.md` の該当 prefix (S/L/R/W/C) で未使用の最小番号を予約
2. `lint-rules.md` の該当テーブルに行追加 + RFC 番号 (あれば)
3. 実装側 (`packages/lint/src/rules/index.ts`) に `Rule` を実装:
   ```ts
   const L018: Rule = {
     code: 'L018',
     description: '...',
     fires: ['strict'],        // 発火 mode (省略時は全 mode)
     severityByMode: { strict: 'error' },
     check(ir) { /* return diags */ },
   };
   ```
4. `rules` export に追加、`packages/lint/src/lint.test.ts` に test を足す
5. 該当カタログ行の `状態` 列を `⏳` → `✅` に更新

### 13.2 新 view kind を追加する

1. RFC 起票 (view kind 追加は **additive**、Class A 相当)
2. `packages/spec/src/ir.ts` の `ViewKindEnum` に追加
3. `pnpm --filter @umlay/core gen:ir-schema` で JSON Schema 再生成
4. `packages/core/src/visitor.ts` の `viewKindMap` に mapping 追加
5. renderer を新規作成 (`packages/renderer-er/src/<kind>-renderer.ts`)
   - テンプレート: `activity-renderer.ts` / `state-machine-renderer.ts` が最小構成の参考
6. `packages/renderer-er/src/index.ts` から re-export
7. `apps/web/lib/worker-client.ts` の `SUPPORTED_KINDS` set と dispatch chain に追加
8. `apps/web/app/editor/page.tsx` の `VIEW_KIND_LABELS` に略称追加
9. サンプルファイル + expected-ir fixture を追加
10. `umlay-oss/packages/spec/src/conformance/expected-ir/README.md` の対応表を更新

### 13.3 新 annotation / block directive を追加する

1. RFC 起票 (新 annotation は通常 additive)
2. `packages/core/src/grammar.ts` に新 rule (通常 `annotation` は既存のまま、`visitAnnotations` で意味処理)
3. `packages/core/src/visitor.ts` の `visitAnnotations` に分岐追加
4. 該当 IR フィールドを `packages/core/src/ir.ts` に追加 (optional)
5. lint rule も必要に応じて追加 (上記 13.1)

### 13.4 conformance 検証を実装側で回す

```ts
import { runConformance, formatReport } from '@umlay/spec/conformance/cli';
import { parse } from 'my-parser';

const report = await runConformance({ parse });
console.log(formatReport(report));
process.exit(report.l1Pass === report.total ? 0 : 1);
```

## 14. 参照

- [DSL Guide](./dsl-guide.md) — 基本文法
- [IR Guide](./ir-guide.md) — IR 構造
- [Design Principles](./design-principles.md) — 北極星原則
- [Roadmap](./roadmap.md) — 対応機能と今後の予定
- [Lint rule catalog](../../packages/spec/src/lint-rules.md)
- [Skills](../../skills/) — 開発者 / AI 向け手順書
- [RFC](../../packages/spec/src/rfcs/README.md) — 受諾済み RFC 一覧
- [Conformance helper](../../packages/spec/src/conformance/match.ts)
- [English version](../en/extending.md)
