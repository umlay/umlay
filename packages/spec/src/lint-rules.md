# Umlay Lint Rule Catalog

**spec version**: 1.10.0 (latest additions: RFC 0055 — `@flowchart_diagram` view kind + L059–L064)

> Note: This catalog body is currently an L001–L016 snapshot taken at
> spec 1.3.0. The reference implementation (`@umlay/lint`) ships
> additional rules introduced by later spec releases — see the
> "Spec 1.4.0+ additions (reference implementation)" section at the
> bottom of this file for the recently-added rule IDs (L017–L064).
> Backfilling each rule's full prose into this catalog is tracked
> separately; until then, source-of-truth is the
> [reference implementation](https://github.com/keydrop/umlay/blob/main/packages/lint/src/rules/index.ts).

`skills/*/review-uml.md` から Lint ルールを一元化した正本カタログ。全実装は本カタログに記載されたルール ID / 重大度 / mandatory 区分を尊重する。

## カテゴリ prefix

| Prefix | 用途 | 既定 severity | 番号範囲 |
| --- | --- | --- | --- |
| **S** | Spec violation (文法違反、必ず error) | error (blocker) | S01〜S99 |
| **L** | Lint (慣習違反、mode 依存) | mode-dependent | L001〜L199 |
| **R** | Risk (設計アンチパターン、ヒューリスティック) | warn/info | R001〜R099 |
| **W** | Warning (deprecated/experimental 使用等) | info | W001〜W099 |
| **C** | Compatibility (spec バージョン差分) | warn | C001〜C099 |

## 実装ステータス凡例

| マーク | 意味 |
| --- | --- |
| ✅ | 参照実装 (`@umlay/lint`) で実装済 |
| ⏳ | spec 1.0 RC までに実装予定 (現状は catalog のみ) |
| 🟡 | 実装は parser / IR validator 側で別途担保 (`@umlay/core`) |

参照実装のルール定義は [`packages/lint/src/rules/index.ts`](https://github.com/keydrop/umlay/blob/main/packages/lint/src/rules/index.ts) (別リポジトリ)。

---

## S — Spec violations (必須、mandatory)

S ルールは parser / IR validator 側で検知される想定 (blocker)。lint package は S ルールを評価しない。

| ID | 内容 | Applies to | RFC | 状態 |
| --- | --- | --- | --- | --- |
| S01 | `namespace` がファイル先頭にない | file | — | 🟡 parser |
| S02 | view 内にモデル本体が書かれている | view | — | 🟡 parser |
| S03 | 未定義 stereotype (entity/aggregate_root/value_object/service/interface 以外) | model | — | 🟡 parser (Zod) |
| S04 | 未定義 view kind (10 種の enum 外) | view | 0001 | 🟡 parser (Zod) |
| S05 | `visibility` が 4 値以外 (public/private/protected/package) | attribute | — | 🟡 parser (Zod) |
| S06 | `@ref` `onDelete`/`onUpdate` が 4 値外 (CASCADE/RESTRICT/SET_NULL/NO_ACTION) | attribute | — | 🟡 parser (Zod) |
| S07 | identifier が RESERVED_KEYWORDS と衝突 | any | — | 🟡 parser |
| S08 | IR 必須フィールド欠落 (version/kind/namespaces/views) | file | — | 🟡 parser (Zod) |
| S09 | model に `_id`/`name`/`attributes` が欠落 | model | — | 🟡 parser (Zod) |
| S10 | attribute に `_id`/`name`/`type` が欠落 | attribute | — | 🟡 parser (Zod) |
| S11 | `@@dependencies(...)` の `on` が解決不能 | model | 0005 | ✅ |
| S12 | `@@dependencies(...)` の `kind` が 4 値外 (FS/SS/FF/SF) | model | 0005 | ✅ |
| S13 | 型 bound 違反 (`@@implements(Repository<T>)` で T が bound 未準拠) | model | 0015 / 0030 | ✅ |
| S14 | variance 使用位置違反 (`<out T>` を in 位置に使う等) | protocol | 0019 / 0030 | ✅ |
| S15 | orphan rule 違反 (`impl P for M` でどちらも外部 namespace) | impl | 0016 | ✅ |
| S16 | Diamond MRO 曖昧性 (C3 で解決不能、明示 `@@override(from:)` 必須) | protocol | 0011 | ✅ (pragmatic — 2+ 親で同名 method を子で再定義していないケースを検出) |
| S17 | Non-well-founded union (再帰のみで終端 variant なし) | union | 0018 / 0022 | ✅ |

## L — Lint (mode-dependent)

| ID | ルール | Severity (Draft / Strict) | Applies to | RFC | 状態 |
| --- | --- | --- | --- | --- | --- |
| L001 | 全 attribute に `visibility` | info / error | attribute | — | ✅ (stub — parser が既に `public` を default で埋めるため no-op) |
| L002 | 全 relation に `multiplicity` | warn / error | relation | — | ✅ |
| L003 | `@ref(X.y)` が解決する | error / error | attribute | — | ✅ |
| L004 | 同一 namespace 内の model 名重複なし、attribute 名重複なし | error / error | any | — | ✅ |
| L005 | enum attribute の `@default` が values に含まれる | error / error | attribute | — | ✅ |
| L006 | 非 aggregate_root が他の aggregate を直接 composition | warn / warn | relation | — | ✅ |
| L007 | 循環 `inheritance` なし | error / error | model | — | ✅ |
| L008 | 全 model に `@intent` | — / warn | model | — | ✅ |
| L009 | 多値 relation に `ordered`/`unique` 指定 | info / info | relation | — | ✅ |
| L010 | `Manager`/`Helper`/`Data` 等の曖昧単独名なし | warn / warn | model | — | ✅ |
| L011 | `string`/`int` 型に長さ/min/max 等の制約 | info / info | attribute | — | ✅ |
| L012 | Sequence participant が model に存在 | error / error | view | — | ✅ |
| L013 | Method `@pre` が参照する state 変数が実在 | warn / warn | fn | — | ✅ |
| L014 | `@default` の型が attribute 型と整合 | warn / error | attribute | 0029 | ✅ |
| L015 | `@ref(onDelete: CASCADE)` の循環検出 | warn / error | attribute | 0029 | ✅ |
| L016 | protocol `extends` の深さ 3 超で警告 | info / warn | protocol | 0029 | ✅ (heuristic: method 数 10+ を警告) |

### L 実装拡張 (参照実装独自)

spec 1.0 RC までに catalog に昇格予定の参照実装ルール:

| ID | ルール | Severity (Draft / Beta / Strict) | Applies to | 状態 |
| --- | --- | --- | --- | --- |
| L017 | namespace 未宣言 | warn / warn / warn | file | ✅ |
| L020 | model に `@@doc` / `@intent` が無い (rationale 不足) | — / warn / error | model | ✅ (L008 と機能重複、1.0 RC で統合) |
| L021 | `@aggregate_root` に `@inv` が無い | — / info / error | model | ✅ (R04 相当) |
| L033 | モデルが画像添付に依存している疑い (ヒューリスティック) | — / info / warn | model | ✅ |
| L034 | view の include/exclude に未知の selector kind (`foo:bar` 等) | warn / warn / error | view | ✅ (RFC 0032) |
| L035 | view の exclude selector が 1 件もマッチしなかった | — / info / info | view | ✅ (RFC 0032) |
| L036 | `exclude: visibility:X` を指定したが include 対象のモデルに属性が無い | — / info / info | view | ✅ (RFC 0032) |
| L037 | 非 `@composite` view で `@@include(viewId)` を使用 (無効) | info / info / warn | view | ✅ (RFC 0033) |
| L038 | `@composite` が参照する viewId が存在しない | warn / warn / error | view | ✅ (RFC 0033) |
| L039 | `@composite` の include に循環 (`A → B → A`) | error / error / error | view | ✅ (RFC 0033) |
| L040 | model の属性と trait の属性が同名で衝突 | error / error / error | model | ✅ (RFC 0034) |
| L041 | 2 つの trait が同名属性を提供 | error / error / error | model | ✅ (RFC 0034) |
| L042 | trait の `@@include` に循環 | error / error / error | trait | ✅ (RFC 0034) |
| L043 | 宣言されただけで `@@include` されない trait | — / warn / warn | trait | ✅ (RFC 0034) |
| L044 | trait の attribute が 2 未満 (過抽象化の疑い) | — / info / info | trait | ✅ (RFC 0034) |
| L045 | `@@include(UnknownTrait)` — 未定義の trait 参照 | error / error / error | model | ✅ (RFC 0034) |
| L046 | `@@locked` 要素はレビュー必須 (info で常時可視化) + `@@adrRef` 推奨 | info / info / info | model / attribute | ✅ (RFC 0042 / spec 1.6.1) |
| L047 | `@@boundary.exposes` / `hides` の参照先が IR に存在しない | warn / warn / error | namespace | ✅ (RFC 0044 / spec 1.6.1) |
| L048 | PII / GDPR / PCI-DSS タグ付き attribute を持つ model に `@@example(expect: reject)` が無い | info / warn / error | model | ✅ (RFC 0040 / spec 1.6.1) |
| L049 | `@@example(input: ...)` が構造化 `@@inv(field, op, value)` と矛盾する | warn / warn / error | model | ✅ (RFC 0049 / spec 1.6.1) |

## R — Risk (設計ヒューリスティック、常に warn/info)

| ID | パターン | Severity | RFC | 状態 |
| --- | --- | --- | --- | --- |
| R01 | 1 aggregate_root に 10+ entity がぶら下がる | info | — | ✅ |
| R02 | cross-namespace composition | warn | — | ✅ |
| R03 | 属性数 20 超の model | info | — | ✅ |
| R04 | aggregate_root without `@inv`/`@pre`/`@post` | info | — | ✅ (L021 で実装) |
| R05 | 全 attribute が public | info | — | ✅ |
| R06 | 自己参照 with `onDelete: CASCADE` | warn | — | ✅ |
| R07 | `@@attachments` に非画像拡張子 | info | — | ✅ |
| R08 | 巨大 enum (30+ values) | info | — | ✅ |
| R09 | 循環 `@@dependencies` (A → B → A) | error | 0005 | ✅ |
| R10 | Gantt/WBS model で `plannedStart`/`plannedEnd` 欠落 | error | — | ✅ |
| R11 | `@experimental` 要素が runtime critical path 上 | warn | 0029 | ✅ (static: CPM view / sequence critical 領域を検査) |
| R12 | `union` の variant が 10 超 (ADT 爆発) | info | 0029 | ✅ |
| R13 | model の `@@md` / `@@doc` 合計 200 行超 (別ファイルへの分離を検討) | info | 0031 | ✅ |

## W — Warning (実行時通知、常に info)

| ID | 内容 | RFC | 状態 |
| --- | --- | --- | --- |
| W001 | `@deprecated` 要素の使用 | 0023 | ✅ |
| W002 | `@experimental` 要素の使用 | 0027 | ✅ |

## C — Compatibility (バージョン差分)

| ID | 内容 | RFC | 状態 |
| --- | --- | --- | --- |
| C001 | IR version と現行 spec の不一致 | — | ✅ |
| C002 | 使用機能の `min-spec-version` が現行より新しい | 0029 | ✅ |

## 実装カバレッジサマリ (参照実装 `@umlay/lint` @ spec 1.3.0)

| カテゴリ | 実装済 | 実装予定 | 実装率 |
| --- | --- | --- | --- |
| S (parser / Zod + 追加 lint 側) | 17 (🟡 10 / ✅ 7) | 0 | **17/17 = 100%** |
| L 本流 (L001-L016) | 16 (L001-L016 全て) | 0 | **16/16 = 100%** |
| L 拡張 (L017+) | 16 (L017/L020/L021/L033-L045) | — | 実装独自 |
| R | 13 (R01-R13) | 0 | **13/13 = 100%** |
| W | 2 (W001/W002) | 0 | 100% |
| C | 2 (C001/C002) | 0 | 100% |
| **全体** | **69** | **0** | **69/69 = 100%** |

> 1.3.0 で **L037-L039** (composite views, RFC 0033) と **L040-L045**
> (traits, RFC 0034) を追加。R11 は runtime trace 無しの **static 近似**
> (CPM view / sequence critical 領域を検査)。将来 runtime trace が導入
> されたら同 rule をアップグレード。

## Mandatory / Optional 区分

実装 (パーサ / lint / IR validator) は以下を参照:

| レベル | 対応必須ルール | 備考 |
| --- | --- | --- |
| **L1 parse** | S01〜S17 | parse error 相当、全て blocker |
| **L2 IR** | S01〜S17 + L003 / L005 / L007 | IR 生成時に検証 |
| **L3 render** | L1 + L2 + view 関連 (L012) | renderer 自身の責務範囲 |
| **Lint service (optional)** | L001〜L016 + R01〜R12 + W001〜W002 + C001〜C002 | Lint 専用パッケージが担当 |

## Spec 1.4.0+ additions (reference implementation)

Added by spec releases after this catalog body was authored.
Each row is a one-liner; full prose lives in the rule source.

| ID | Spec | RFC | 内容 (要約) |
| --- | --- | --- | --- |
| L017 | 1.4.0 | 0035 | namespace 未宣言 |
| L020 | 1.4.0 | 0035 | model に `@@doc` / `@intent` が無い (rationale 不足) |
| L021 | 1.4.0 | 0035 | `@aggregate_root` に `@inv` が無い |
| L033 | 1.4.0 | — | モデルが画像添付に依存している疑い |
| L034 | 1.2.0 | 0032 | view selector に未知の kind |
| L035 | 1.2.0 | 0032 | exclude selector が 1 件もマッチしなかった |
| L036 | 1.2.0 | 0032 | `exclude: visibility:X` で対象属性が無い |
| L037 | 1.3.0 | 0033 | 非 `@composite` で `@@include(viewId)` 使用 |
| L038 | 1.3.0 | 0033 | `@composite` 参照 viewId が存在しない |
| L039 | 1.3.0 | 0033 | `@composite` の include に循環 |
| L040 | 1.3.0 | 0034 | model 属性と trait 属性の同名衝突 |
| L041 | 1.3.0 | 0034 | 2 trait が同名属性を提供 |
| L042 | 1.3.0 | 0034 | trait の `@@include` に循環 |
| L043 | 1.3.0 | 0034 | 宣言だけで `@@include` されない trait |
| L044 | 1.3.0 | 0034 | trait 属性が 2 未満 (過抽象化) |
| L045 | 1.3.0 | 0034 | `@@include(UnknownTrait)` |
| L046 | 1.6.1 | 0042 | `@@locked` 要素はレビュー必須 |
| L047 | 1.6.1 | 0044 | `@@boundary.exposes` / `hides` の参照先が無い |
| L048 | 1.6.1 | 0040 | PII/GDPR/PCI-DSS 属性に `@@example(expect: reject)` 無し |
| L049 | 1.6.1 | 0049 | `@@example(input: ...)` が `@@inv` と矛盾 |
| L050 | 1.7.0 | 0050 | state 遷移と methodの`@pre/@post` 整合 |
| L051 | 1.7.0 | 0050 | state を mutate する method は遷移として現れる |
| L052 | 1.7.0 | 0051 | 到達不能な state 値 |
| L053 | 1.7.0 | 0050 | state-bearing model に状態遷移と無関係な method |
| L054 | 1.7.0 | 0050 | sequence message が state-bearing method を呼ぶ |
| L055 | 1.7.0 | 0052 | `@emits(X)` が宣言済みイベントを参照 |
| L056 | 1.7.0 | 0052 | 宣言済みイベントがどこかで `@emits` される |
| L057 | 1.8.0 | 0053 | 同一 view の `seq` ブロックは命名+ユニーク |
| L058 | 1.9.0 | 0054 | `@@style(...)` のキーは theme/layout 許可リスト内 |
| L059 | 1.10.0 | 0055 | `@flowchart_diagram` に `start` / `end` ノード必須 |
| L060 | 1.10.0 | 0055 | flowchart のノードは `start` から到達可能 |
| L061 | 1.10.0 | 0055 | `end` 以外の flowchart ノードは出力エッジ必須 |
| L062 | 1.10.0 | 0055 | flowchart エッジは宣言済みノードのみ参照可 |
| L063 | 1.10.0 | 0055 | flowchart のノード ID は同一 view 内で一意 |
| L064 | 1.10.0 | 0055 | 1 view あたり `flow { }` ブロックは 1 つを推奨 |

## ルールの書き方 (新規追加時)

1. 番号割当: 該当 prefix の未使用最小番号を選ぶ
2. RFC 参照: 新ルールが RFC 由来なら RFC 番号を必ず記載
3. severity 既定: 想定重大度を記入 (mode-dependent なら `info/error` 等)
4. Example: 失敗例と修正例を 1 組以上添える
5. PR で本カタログに追記

## サプレッション

個別の false positive は `// umlay-lint-disable L001 next-line` 等のコメントで抑止可能 (将来正式化、RFC 0029 §未解決事項)。

## 参照

- [`grammar.md`](./grammar.md) — DSL 文法
- [`ir.schema.json`](./ir.schema.json) — IR schema
- [`rfcs/0029-lint-rule-catalog.md`](./rfcs/0029-lint-rule-catalog.md) — 本カタログ導入 RFC
- [`skills/{ja,en}/review-uml.md`](../../../skills/ja/review-uml.md) — レビュー手順 (本カタログを参照)
