---
rfc: 0050
title: State machine cross-view consistency lints
author: '@umlay'
status: accepted
created: 2026-04-27
updated: 2026-04-27
spec-version-target: 1.7.0
change-class: A
---

# RFC 0050 — State machine cross-view consistency lints

## 要約

`view ... @state_machine` と、対象 model の `fn @pre / @post`、宣言済み
`event` (RFC 0052) との **整合性をリントで強制する** 7 本の新ルール
(L050–L056) を追加する。スペック・IR・パーサーは変更しない。

## 背景 / モチベーション

これまでの spec では、状態マシン図は `enum` の値を線形に並べて描くだけで、

- どの `fn` がどの遷移を起こすのか
- どの `event` がどの遷移と紐付くのか
- シーケンス図のメッセージは状態遷移と一致しているか

を機械的に検査する手段がなかった。AI と一緒に設計する場面では、
これらの「ビュー間の整合」を人間がいちいち追うのが現実的でない。

このギャップを **既存の構文だけで** 埋めるため、リントを追加する。

## 提案内容

### 新規ルール (lint)

| Code | Severity (draft / beta / strict) | 検査内容 |
| --- | --- | --- |
| `L050` | info / warning / error | state_machine view 上の隣接遷移 (X→Y) に対応する `fn @pre("status==X") @post("status==Y")` の存在 |
| `L051` | info / info / warning | `fn @pre/@post` で参照される状態が enum に存在するか |
| `L052` | info / info / warning | state_machine の状態のうち、初期状態でも、いかなる @post の対象でもなく到達不能なもの |
| `L053` | info / info / info | state を持つ model 上の fn が状態遷移にもシーケンスにも `@intent` にも現れない |
| `L054` | info / info / warning | sequence のメッセージが状態を持つ model のメソッドを呼ぶとき、その fn が状態を変えていない |
| `L055` | warning / warning / error | `@emits(X)` で参照する event が宣言されているか (RFC 0052 と相互依存) |
| `L056` | info / info / warning | 宣言された event がどこからも emit / 参照されていない |

### 検査の前提

- L050–L054 は **state_machine view が IR に少なくとも 1 つ存在する** ときのみ稼働。
- ガード条件 (`status == X && balance > 0`) や複合 boolean 表現は **対象外** — `<field> == <STATE>` の素朴な等式のみを「状態判別の述語」として扱う。
- `fn @post(...) @emits(...)` は L055/L056 だけで検査し、状態遷移とは独立。

### IR schema への影響

なし (RFC 0051 / 0052 で導入するフィールドを利用するのみ)。

### 後方互換性

A (additive)。新リントは既存のサンプル・ユーザ DSL を破壊しない。
*draft* モードでは全て `info` で出るため、CI が赤くならない。

## 代替案

- **状態遷移を専用構文で書く** — 例 `status @state_machine { DRAFT -> CONFIRMED on confirm() }`。**却下**: メソッドがすでに `@pre/@post` で同じ情報を持っており、二重管理になる。
- **シーケンス図に明示的なバインドを追加** (`Order ->> Order: confirm() @transition(DRAFT->CONFIRMED)`) — **却下**: AI が書きやすいフラットな DSL にとって複雑すぎる。

## サンプル / テスト

- `packages/examples/samples/order-events.umlay` (RFC 0052 と共有)
- `packages/lint/src/spec-1.7-rules.test.ts` (L050 / L055 / L056 のスモーク)

## 受諾時にやること

- [x] `packages/lint/src/rules/index.ts` に L050–L056 を追加
- [x] テストファイル `spec-1.7-rules.test.ts` を追加
- [x] `packages/examples/samples/order-events.umlay` を追加
- [x] `umlay-oss/packages/spec/src/index.ts` で SPEC_VERSION を 1.7.0 に bump
