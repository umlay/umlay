---
rfc: 0055
title: Flowchart diagram view kind
author: '@umlay'
status: accepted
created: 2026-05-07
updated: 2026-05-07
spec-version-target: 1.10.0
change-class: B
---

# RFC 0055 — Flowchart diagram view kind

## 要約

新しい view kind **`@flowchart_diagram`** を追加する。古典的な
フローチャート (terminator / process / decision / io / document /
subroutine) を Umlay の declared / typed / lintable な原則の下で
書けるようにする。`activity_diagram` (UML 系) とは独立した
view kind として導入し、既存ファイルへの影響はゼロ。

## 背景 / モチベーション

Umlay の現状の view kind は UML / ER / Gantt / WBS をカバーするが、
**業務フロー / アルゴリズム / 障害対応手順** の記述で広く使われる
古典的フローチャートを表現する手段が無い。`activity_diagram` は UML
の Activity Diagram 寄りで、`page` / `action` / `route` / `worker` /
`function` のシェイプ集合 — terminator (oval) / decision (diamond) /
I/O (parallelogram) などの古典シェイプは持たない。

「Mermaid からの移行」「業務手順書の図解」用途では、Umlay 内で
古典的シェイプを使えるほうが自然。RFC 0055 はそれを満たす最小
セットを提案する。

## 提案内容

### 1. 構文

```umlay
view login-flow @flowchart_diagram @intent("ログインフロー") {
  flow {
    // ノード宣言: shape id "label"?
    start    begin    "ログイン開始"
    process  check    "認証情報チェック"
    decision validate "資格情報が有効?"
    process  create   "セッション作成"
    io       issue    "JWT 発行"
    end      ok       "成功"
    end      ng       "失敗"

    // エッジ: from -> to (-> to)* (: "label")?
    begin    -> check -> validate
    validate -> create : "Yes"
    validate -> ng     : "No"
    create   -> issue -> ok   // チェイン (順次)
  }
}
```

**`flow` は文脈キーワード**: `flow` 自体は予約語にせず、view body 内で
`flow {` の並びだけをフローチャート開始として認識する。これにより
`namespace flow` / `view payment-flow` / `flow.User` などの既存記述は
そのまま動く。識別子に `?` などの非英数字を含めることはできないので、
`valid?` のような名前は `validate` に置き換える。

**ノード宣言文法**:

```
flowchartNode := shape Identifier ( ":" String | String ) ?
shape         := "start" | "end" | "process" | "decision" | "io"
                | "document" | "subroutine"
```

- `start` / `end` は terminator (oval)
- `process` は rectangle (既定)
- `decision` は diamond
- `io` は parallelogram (input/output / data)
- `document` は document shape (波線下端)
- `subroutine` は double-edged rectangle (predefined process)

ラベルは `"..."` で囲む。**省略時は id を表示**。

**エッジ文法**:

```
flowchartEdge := edgeChain (":" String)?
edgeChain     := Identifier ("->" Identifier)+
```

- `A -> B` は単純なエッジ
- `A -> B -> C` はチェイン (シュガー)
- `:"..."` でエッジラベル (Yes / No / 条件式 など)

`decision` ノードからは **複数のエッジ** を出せ、ラベルが分岐条件を表す。

### 2. IR への追加

```ts
// ir.ts
ViewKindEnum += 'flowchart_diagram';

const FlowchartShapeEnum = z.enum([
  'start', 'end', 'process', 'decision', 'io', 'document', 'subroutine',
]);

const FlowchartNodeSchema = z.object({
  id: z.string(),
  shape: FlowchartShapeEnum,
  label: z.string().optional(), // omit → renderer falls back to id
});

const FlowchartEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});

const FlowchartBodySchema = z.object({
  nodes: z.array(FlowchartNodeSchema).default([]),
  edges: z.array(FlowchartEdgeSchema).default([]),
});

ViewSchema.flowchartBody?: FlowchartBody
```

エッジチェイン (`A -> B -> C`) は visitor 段階で個別エッジに展開される。

### 3. レンダラ

新規 `packages/renderer-er/src/flowchart-renderer.ts`:

- ELK `layered` algorithm + `direction: DOWN` (既定) / `LR` (`@@layout` で上書き可能)
- 各シェイプは SVG path で描画 (terminator は `rx`/`ry` 指定の rect、decision は path で diamond、io は path で平行四辺形、document は path で波線下端、subroutine は二重縁の rect)
- エッジは ortho 折れ線 + 矢印
- `data-id="<nodeId>"` を各ノードに付与 (ジャンプ機能との整合)

テーマ追従:
- `theme.bg` / `theme.surface` / `theme.text` / `theme.muted` / `theme.accent` を使用
- `decision` は `theme.warn`、`start` は `theme.success`、`end` は `theme.danger` を 12% 透明で塗り

### 4. Lint ルール (新規 3 件)

| code | severity (default) | 内容 |
|---|---|---|
| **L059** | warning | `@flowchart_diagram` view に `start` / `end` ノードが存在しない |
| **L060** | info | 到達不能ノード — `start` から辿れないノードが存在 |
| **L061** | info | デッドエンド — `end` 以外のノードに outgoing edge が無い |

L059 は構造の必須要件。L060/L061 は大きな図で意図しない孤立を防ぐ。

### 5. 後方互換

- 既存ファイルは `@flowchart_diagram` を使わない限り影響ゼロ
- `View.flowchartBody` は optional
- 既存 `activity_diagram` は変更なし

### 6. レンダラ統合

- `render-dispatch.ts` の `RENDERERS` に `flowchart_diagram: renderFlowchart` を追加
- a11y `<title>` / `<desc>` 注入は既存パスで自動対応
- VS Code Activity Bar tree のステレオタイプアイコン: `symbol-property` (なし → 既定 class アイコン)
- ViewTabs の KIND_ICONS: `flowchart_diagram → 🧭`

## 影響範囲

| パッケージ | 変更 |
|---|---|
| `@umlay/spec` | ViewKindEnum 拡張、grammar.md / grammar.bnf 更新 |
| `@umlay/core` | ir.ts (3 schemas), grammar.ts (flowchartDecl rule), visitor.ts |
| `@umlay/renderer-er` | flowchart-renderer.ts 新規、render-dispatch.ts に登録 |
| `@umlay/lint` | rules/index.ts に L059/L060/L061 追加 |
| `@umlay/lsp` | DocumentSymbol で flowchart_diagram view も列挙 |
| `@umlay/cli` | 自動的に新 view kind をサポート (renderByKind 経由) |
| `@umlay/webview-ui` | ViewTabs / AllViewsPane の kind label + icon |
| `apps/vscode` | 機能テスト (extension.ts は触らず — TreeProvider が自動拾い) |

## 例

`packages/examples/samples/login-flowchart.umlay` を新規追加:

```umlay
@@mode(strict)

namespace login

view login-flow @flowchart_diagram @intent("Web ログイン手順") {
  flow {
    start    begin    "ユーザがログインボタンを押下"
    process  input    "資格情報入力"
    process  submit   "POST /login"
    decision validate "資格情報 OK?"
    process  session  "Session 作成"
    io       cookie   "Cookie 発行"
    document audit    "監査ログ書き込み"
    end      ok       "ダッシュボードへ"
    end      ng       "エラー画面"

    begin    -> input -> submit -> validate
    validate -> session : "Yes"
    validate -> ng      : "No"
    session  -> cookie -> audit -> ok
  }
}
```

レンダリング結果: 縦型 (TD) のフローチャート、`begin` と `ok`/`ng`
が oval、`valid?` が diamond、`cookie` が平行四辺形、`audit` が
document、他は rect。

## 将来の拡張

- swimlane / partition (UML activity の `@@partition` に近い形式)
- subroutine から別 view への参照 (`subroutine login -> @ref(view: signup-flow)`)
- 並行分岐 (fork / join) の追加 — UML との重複を考慮し別 RFC に分離

## 採否 / 実装

- 採否: accepted (2026-05-07)
- 実装ターゲット: spec **1.10.0**
- VS Code: 0.16.0 で公開
