---
name: umlay
version: 1.4.0
spec: "@umlay/spec >= 1.4.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer, architect, reviewer]
summary: Umlay の skill 7 本のうちどれから始めるべきかを 2 質問以内で決める「相談窓口」skill
description: 「Umlay を使い始めたいが何から?」「どの skill を呼べばいい?」「.umlay をどう作る?」など、ユーザの意図がまだ skill 名に落ちていないときに起動する。レビュー / 取り込み / 計画など個別目的が明確なときは個別 skill (review-uml / reverse-engineer / plan-from-diff など) が直接動くため、本 skill を経由する必要はない。
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# umlay (相談窓口)

## ゴール

ユーザに **2 質問以内**でゴールを言語化させ、`skills/README.md` のフロー表に基づいて**次に呼ぶべき skill** を 1 行コマンドで提示する。本 skill は**実装も生成もしない**。次の skill に渡すまでが仕事。

## いつ起動するか / しないか

| 起動する | 起動しない |
| --- | --- |
| 「Umlay を試したい / 何から始めれば?」 | 「この `.umlay` をレビューして」 → `review-uml` 直接 |
| 「`/<skill>` を選びたいが分からない」 | 「Prisma を Umlay に変換して」 → `reverse-engineer` 直接 |
| 「現状から実装計画まで一気に通したい」 | 「migration 計画立てて」 → `plan-from-diff` 直接 |
| ゴールが**まだ動詞**になっていない | ゴールが**1 つの skill の責務**に収まる |

意図が明確なユーザは個別 skill が auto-invoke される設計。本 skill は迷子向けで、強制中継ではない。

## 7 つの skill — 一覧

| skill | 役割 | 入力 → 出力 |
| --- | --- | --- |
| `write-uml` | 要求 → `.umlay` を書き起こす | 自然言語要件 → `.umlay` 初版 |
| `reverse-engineer` | 既存コード → `.umlay` 取り込み | Prisma / SQL / TS → 構造のみ `.umlay` |
| `review-uml` | `.umlay` の品質監査 (spec / lint / risk) | `.umlay` → 指摘リスト |
| `evolve-schema` | 既存 `.umlay` の互換変更 | 現行 `.umlay` + 要件 → 新 `.umlay` |
| `change-impact-diff` | 概念先行の change-impact レポート | 旧 + 新 IR → Purpose / Touch / Miss + Risk |
| `plan-from-diff` | impact → 順序付き実装計画 | impact → phase / PR / rollback |
| `codegen-mapping` | IR → Prisma / SQL / TS コード生成 | IR → コード差分 |

## Procedure (相談手順)

### Step 1 — 1 つ目の質問

> 「次のうちどれに近いですか? (a) 新規 — まだ `.umlay` がない / (b) 既存改修 — 既に `.umlay` か対象コードがある / (c) コード生成だけしたい / (d) `.umlay` のレビューだけしたい」

#### 回答が (a) 新規

そのまま `write-uml` を推奨。出力例:

```
次は: /write-uml 「<要件を 1-3 文で>」
理由: ゼロから `.umlay` を起こす最初の skill。
その後: /review-uml で品質監査 → /evolve-schema で詳細化 → /codegen-mapping
```

#### 回答が (c) コード生成だけ

`codegen-mapping` を推奨。出力例:

```
次は: /codegen-mapping <ir.json or .umlay path>
理由: 確定 IR を Prisma / SQL DDL / TypeScript に決定論的変換するため。
備考: .umlay があるなら parse → IR → 変換まで自動。
```

#### 回答が (d) レビューだけ

`review-uml` を推奨。出力例:

```
次は: /review-uml <.umlay path>
理由: spec / lint / risk / compatibility の 4 層監査。
備考: strict で実行したい場合は --mode strict、または `.umlay` 先頭に @@mode(strict)。
```

#### 回答が (b) 既存改修 → Step 2 へ

### Step 2 — 改修系のみ追加質問

> 「現状はどちらですか? (b1) 既存システムは TypeScript / Prisma / SQL のコードのみで `.umlay` はまだない / (b2) `.umlay` がすでにあり、改修したい部分が決まっている / (b3) `.umlay` がすでにあり、改修内容の影響範囲を見たい / (b4) 改修内容は決まっており、PR / phase に分けた実装計画が欲しい」

#### 回答が (b1) コードのみ

```
次は (チェーン):
  1. /reverse-engineer <schema.prisma or DDL or TS path>
       既存コードを構造だけ `.umlay` に取り込む。
  2. /review-uml current.umlay
       intent / stereotype を確定させる (TODO ヘッダの内容を消化)。
  3. /write-uml で view (audience 別) と `@@inv` を補完
       現行のあるべき完成形を Umlay 上に置く。
```

#### 回答が (b2) `.umlay` あり、改修したい

```
次は: /evolve-schema <current.umlay> 「<変更点を 1-3 文で>」
理由: 後方互換を守りつつ差分 DSL を当てる skill。
その後: /change-impact-diff (影響確認) → /plan-from-diff (PR 計画) → /codegen-mapping
```

#### 回答が (b3) 影響範囲を見たい

```
次は: /change-impact-diff <baseline.umlay> <current.umlay>
理由: 行 diff ではなく Purpose / Touch / Miss + Risk + Impact + checklist を生成。
備考: 出力 YAML は PR コメント / Slack / リリースノートに projection 可。
```

#### 回答が (b4) 計画が欲しい

```
次は: /plan-from-diff <impact.yaml or baseline+current>
理由: impact から phase (schema / backfill / dual-write / cutover / cleanup / verify)
      と PR 分割と rollback 注記つきの計画を生成。改修スコープ外には触れない。
その後: 計画の各 phase で /codegen-mapping を呼ぶ。
```

## Constraints (このスキルが守ること)

- **2 質問以内**で次の skill に振る (3 つ目の質問は禁止 — それは個別 skill の仕事)
- 出力は「次は」「理由」「その後 (任意)」の 3 行を超えない
- **個別 skill の責務を侵さない**: review / 計画生成 / コード生成は呼ばず、推奨だけ出す
- 推奨が 1 つに絞れない場合は素直に「(b2) と (b3) のどちらに近いか?」と再質問
- 既に skill 名がユーザの発話に出ているなら本 skill は出ず、その個別 skill が直接動く

## Checklist

- [ ] Step 1 の質問は 4 択で出した
- [ ] (b) なら Step 2 で 4 択を出した
- [ ] 推奨は **1 行コマンド**で書いた (`/skill-name <args>`)
- [ ] 推奨理由を 1 行で添えた
- [ ] チェーン推奨の場合は番号付きで 3 ステップ以内
- [ ] 自分では実装 / 生成 / 監査をしていない (次の skill に渡している)

## 例 (full flow)

ユーザ: 「Umlay 試したい。既存の Prisma スキーマがあるんだけど」

router 応答:

```
次のうちどれに近いですか?
(a) まだ何も書いていない (Prisma も含めて新規)
(b) 既存改修 — Prisma があり Umlay に取り込みたい
(c) コード生成だけしたい (IR は既にある)
(d) `.umlay` のレビューだけしたい
```

ユーザ: 「(b)」

router 応答:

```
現状はどちらですか?
(b1) Prisma だけあり .umlay はまだない
(b2) .umlay があり、改修したい部分が決まっている
(b3) .umlay があり、改修内容の影響範囲を見たい
(b4) 改修内容は決まっており、実装計画 (PR 分割) が欲しい
```

ユーザ: 「(b1)」

router 応答:

```
次は (チェーン):
  1. /reverse-engineer schema.prisma
       既存 Prisma を構造だけ .umlay に取り込む。
  2. /review-uml current.umlay
       stereotype / intent を確定させる。
  3. /write-uml で view と @@inv を補完。

迷ったら 1 まで実行して結果を貼ってください。
```

## References

- 静的フロー表: [`skills/README.md`](../../README.md) の「ユースケース別フロー」
- 個別 skill: [`write-uml`](../write-uml/SKILL.md) / [`reverse-engineer`](../reverse-engineer/SKILL.md) / [`review-uml`](../review-uml/SKILL.md) / [`evolve-schema`](../evolve-schema/SKILL.md) / [`change-impact-diff`](../change-impact-diff/SKILL.md) / [`plan-from-diff`](../plan-from-diff/SKILL.md) / [`codegen-mapping`](../codegen-mapping/SKILL.md)
