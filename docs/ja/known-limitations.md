# 未対応 / 実装中 / 注意事項一覧 (spec 1.6.1 時点)

`grammar.md` / RFC / dsl-guide に記載されているが、**現在の参照実装では parse / 動作しないか、用法に制限がある**項目の一覧です。実装が追いつくまでの間、これらは parser エラーや silent drop を引き起こすので避けてください。

最終更新: 2026-04-27 (spec 1.6.1)

---

## 1. ディレクティブの**位置 (scope)** に注意するもの

Umlay の `@` (single-at) と `@@` (double-at) は**位置が違う**:

- **`@directive(...)`** (single-at) — declaration の **header 位置 (annotation)**。例: `model Order @aggregate_root @intent("...")`
- **`@@directive(...)`** (double-at) — model / view の **body の中**。例: `{ @@inv("...") @@owner(...) ... }`

混同すると parse エラーになります。**よくある誤りパターン**:

| ❌ 間違い | parse エラー | ✅ 正解 |
| --- | --- | --- |
| `model X @aggregate_root @@confidence(0.3) { ... }` | `Expecting LCurly, found '@@'` | body 内に移動: `{ @@confidence(0.3) ... }` |
| `model X @aggregate_root @@owner(team:"x") { ... }` | 同上 | body 内に移動 |
| `model X @owner(team:"x") { ... }` (single-at で書く) | parser は通るが**何も attach されない** (`@owner` は未定義 annotation で**silently 無視**される) | `@@owner(team:"x")` を body に置く |
| `attribute UUID! @@since("1.6")` (attribute 直後にブロックディレクティブ) | OK (1.6+ で同行ならインライン attach) | 別行は `@@since` が model 級扱いに |

| body-only (`@@`) | header-only (`@`) | 両方 OK |
| --- | --- | --- |
| `@@id` `@@unique` `@@index` `@@identity` `@@doc` `@@md` `@@sample` `@@dependencies` `@@codegen` `@@implements` `@@include` `@@inv` (構造化) `@@owner` `@@status` `@@adrRef` `@@provenance` `@@confidence` `@@compliance` `@@since` `@@locked` `@@example` `@@boundary` `@@detail` `@@theme` `@@mode` | `@aggregate_root` `@entity` `@value_object` `@service` `@interface` `@id` `@unique` `@index` `@default` `@codegenName` `@ref` `@review` `@fix` `@intent` `@inv` (文字列形式) `@pre` `@post` `@raises` `@deprecated` `@experimental` `@abstract` `@static` `@readonly` `@derived` | (なし) |

## 2. 同名の `@inv` / `@@inv` の挙動差

文字列形式 `@inv("total >= 0")` と構造化 `@@inv(field: total, op: ge, value: 0)` は**別の場所に保存されます**:

| 書き方 | 保存先 | L021 (aggregate_root の invariants 必須) を満たす? |
| --- | --- | --- |
| header の `@inv("...")` | `model.rationale.invariants[]` (string) | ✅ 満たす |
| header の `@inv(field:..., op:..., value:...)` | `model.rationale.invariants[]` (string化される) | ✅ 満たす |
| body の `@@inv("...")` | `model.rationale.invariants[]` | ✅ 満たす |
| body の `@@inv(field:..., op:..., value:...)` | `model.rationale.structuredInvariants[]` | ⚠️ **満たさない場合あり** (ただし 1.6.1+ なら満たす) |
| **attribute** の `@inv("...")` | `attribute.rationale.invariants[]` | ❌ **満たさない** (model 級 invariant ではない) |

L049 (`@@example` × `@@inv` 整合性) は**構造化 `@@inv` のみ**を見ます。文字列形式は L049 評価対象外。

## 3. `@@example` の `op` (構造化 `@@inv`)

サポートされる op (L049 evaluator):

| op | 意味 | input value 型 |
| --- | --- | --- |
| `ge` / `gt` / `le` / `lt` | 数値比較 | number |
| `eq` / `ne` | 厳密一致 | any |
| `in` / `notIn` | `values: [...]` の membership | any |
| `match` | 正規表現 | string + pattern (string) |
| `present` | field が input に存在するか | n/a |

**未対応**:

- `between` / `range` (例: `op: between, values: [0, 100]`)
- `length-eq` / `length-gt` 等の集計演算子
- ネスト構造への deep equality (`field: addr.city`) — 現状は flat field 名のみ
- 算術式 (`@@inv("total - discount >= 0")`) — 構造化形式では未サポート、文字列形式で書くしかない (L049 でチェックされない)

## 4. namespace 境界 (RFC 0044 / `@@boundary`)

実装済:

- `@@boundary(exposes: [...], hides: [...])` の parse
- L047 (FQN 幽霊参照検知)

**未対応**:

- 他 namespace から `@@boundary.hides` の FQN を `@ref` / `import` した場合の **block error** (現状は L047 では拾えない)
- `@@boundary` の継承 / 親子 namespace 階層
- View が `@@boundary.hides` の model を `include:` した場合の警告

## 5. `@@locked` の効力

L046 で **info-level** の info 表示するだけ。**実際に edit を防ぐ仕組みは未実装** (CI 連携 hooks も含めて)。

予定:
- 1.7+: `@@locked` 要素を変更する `evolve-schema` skill が拒否
- 1.7+: change-impact-diff が `@@locked` 差分を Risk: Breaking に自動格上げ

## 6. 未実装の RFC / 計画機能

| RFC / 計画 | 内容 | spec 予定 | 現状 |
| --- | --- | --- | --- |
| RFC 0050 | directive 統合 (`@@review` / `@@governance` / `@@lifecycle` / `@@contract`) | 1.7 | **draft、parse 対応なし** |
| L050 | `@inv` (single-at) deprecated 警告 | 1.7 | 未実装 |
| L051 | subsumed directive (`@@since` 等) を使うと 1.7 統合形を勧告 | 1.7 | 未実装 |
| L052 | 引数で positional + keyword 混在 | 1.7 | 未実装 |
| (無番号) | 構造化 `@@inv` から runtime バリデータ自動生成 | 1.8 | 未実装 |
| (無番号) | `@@example` から property-based test 自動生成 | 1.8 | 未実装 |
| (無番号) | `@@review`/`@@status` の merge 前 CI gate | 1.8 | 未実装 |

→ **これらの新形式 directive (`@@review` / `@@governance` / `@@lifecycle` / `@@contract`) を今書くと parse エラー**。1.7 リリースまで待ってください。

## 7. View kind ごとの実装ステータス

| view kind | parse | レイアウト品質 | refs / detail / boundary | 備考 |
| --- | --- | --- | --- | --- |
| `er_diagram` | ✅ | ◎ ELK | `refs: N` ✅ | view 外への `@ref` は edge を silently drop |
| `class_diagram` | ✅ | ◎ ELK orthogonal | `refs: N` ✅ | UML modifier (`@abstract` `@static` `@readonly`) ✅ |
| `sequence_diagram` | ✅ | ○ | `level: high/low` ✅ (`@@detail`) | critical / retry / catch / finally ✅ |
| `component_diagram` | ✅ | ○ | — | 実用最低限 |
| `package_diagram` | ✅ | ○ | — | 実用最低限 |
| `state_machine` | ✅ | ○ | — | model.status の遷移を可視化 |
| `activity_diagram` | ✅ | △ | — | **レイアウト品質低**、改善余地あり |
| `wbs_diagram` | ✅ | ○ | — | `@@dependencies` 必須 |
| `gantt_chart` | ✅ | ○ | criticalPath ✅ | `@@dependencies` 必須 |
| `deployment_diagram` | ✅ | △ | — | **cloud primitive 描画は最低限**、AWS / GCP のアイコンセット未対応 |
| `composite` | ✅ | ○ (子 view を並置) | `@@include(viewId)` ✅ | drill-down / 動的折り畳みは未対応 |

## 8. AI agent 向け注意

`reverse-engineer` skill が Prisma / SQL / TS から取り込む際、以下は**今のところ自動推定できない**:

- ❌ `@aggregate_root` 推定 (証拠なしに付けない、`@@doc("candidate — confirm")` で `@@status("in-review")` フラグ)
- ❌ `@@inv` 自動生成 (人間レビューで追加)
- ❌ `@@example` 自動生成 (1.8 の codegen 拡充で予定)
- ❌ namespace `@@boundary` 自動推定
- ❌ ADR 紐付け (`@@adrRef`)

## 8.5. 文字列リテラルのクォート

spec 1.6.2+ は **`"…"` と `'…'` の両方を受理**します (TS / Prisma の習慣で AI が single quote を出すケースに対応)。`irToDsl` は正規化として常に **double quote** を出力。

```umlay
@codegenName('account_id')   // ✅ OK
@codegenName("account_id")   // ✅ OK (canonical)
```

## 8.6. ハイフン入りディレクティブ名

`@@min-spec-version("1.6.0")` のようなハイフン名は **1.6.2+ で解禁** (前は token 分解で parse error)。canonical な camelCase 別名 (`@@minSpecVersion("1.6.0")`) も同等に効きます。

```umlay
@@min-spec-version("1.6.0")     // ✅ kebab — IR.meta.minSpecVersion = "1.6.0"
@@minSpecVersion("1.6.0")       // ✅ camel — 同じ結果
```

L001–L045 等のメッセージは ja のままなので注意。

## 9. CLI / VS Code 拡張の制限

| 機能 | 状態 |
| --- | --- |
| `umlay check --lang ja|en` | **未実装** (現状はメッセージが日本語混在) |
| VS Code `umlay.language` 設定 | **未実装** (案として留保) |
| `umlay format --consolidate` (1.7 対応) | **未実装** (1.7 と同時) |
| VS Code Refresh ボタン | ✅ 実装済 (0.5.6) |
| VS Code 右クリック「Open Preview (分割なし)」 | ✅ 実装済 (0.5.2) |
| Diagnostics sidebar 内 source バッジ | ✅ 実装済 (0.5.5) |
| WebGPU 経由のローカル LLM (Web のみ) | ✅ |
| AdSense / 広告 (Web のみ) | ✅ |

## 10. 将来 RFC の placeholder (議論段階)

これらは**まだ accepted していない**ので名前だけ知っておく程度で:

- `@@boundary` の cross-namespace **enforce** (L053?)
- `@@example(autogen: true)` で codegen が自動 test を生成
- `@@review.state` の CI gate (`merge-blocking`)
- 多言語化 (`umlay.language` 設定 + lint i18n)
- `@@codegen` の hook (1.6 までで部分実装、1.8 で完成予定)
- `@@deployment` (deployment_diagram の高度なレンダリング)

---

## トラブルシュート手順

1. parse error が出たら、まず**位置を確認**: `@@directive` は body 内、`@directive` は header
2. それでもダメなら **`@@confidence`、`@@status`、`@@boundary` の引数構文**を [`grammar.md`](../packages/spec/src/grammar.md) で確認 (1.6 で配列リテラル `[...]` 対応)
3. lint warning が**理解できない**場合は [`lint-rules.md`](../packages/spec/src/lint-rules.md) で該当 ID を引く
4. `umlay check --stats --json | jq` でルール頻度を見て、よく出るルールから対処

参考: [spec-overview.md](../packages/spec/src/spec-overview.md) — 1 ページサマリ。
