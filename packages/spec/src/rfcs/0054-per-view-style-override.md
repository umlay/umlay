---
rfc: 0054
title: Per-view `@@style` override
author: '@umlay'
status: accepted
created: 2026-05-01
updated: 2026-05-01
spec-version-target: 1.9.0
change-class: A
---

# RFC 0054 — Per-view `@@style` override

## 要約

view 宣言の中に **`@@style(key: value, key: value, ...)`** ブロックディレクティブを置けるようにする。
この `@@style` はその view だけに適用される **テーマトークン上書き** (色) と
**レイアウト微調整** (行高さ・列幅 など) を持ち、`theme` プリセットの上から
マージされる。Gantt / WBS で「この図だけ done を緑、進行中を紫にしたい」
「行を狭くして 1 ページに収めたい」というニーズに spec レベルで応える。

## 背景 / モチベーション

spec 1.8 までは:

- 図の色は `themes` プリセット (editorial/dark/technical/...) の **6 種固定**
- レンダラ内で `STATUS_COLORS` などをハードコード
- view ごとに調整したい場合はソースを fork するしかない

スプリント計画書 (Gantt) や提案資料 (色覚多様性配慮) でこのギャップが顕在化。
spec 1.9 はテーマを **(プリセット) × (per-view 上書き)** に拡張する。

## 提案内容

### 構文

```umlay
view sprint1 @gantt_chart {
  @@style(
    status_done: "#10B981",
    status_in_progress: "#F59E0B",
    gantt_today_line: "#3B82F6",
    gantt_progress_fg: "#FFFFFF",
    row_height: 28,
    day_width: 32,
    label_width: 240
  )
  include: "sprint1.*"
}
```

`@@style(...)` は他のブロックディレクティブ (`@@md`, `@@include`) と同じ
構文で、**カンマ区切りの key: value ペア**を取る。値は次のいずれか:

- `"#RRGGBB"` / `"#RGB"` 文字列 → テーマ色トークンを上書き
- 名前付き CSS 色文字列 → 同上 (`"red"` `"transparent"` など)
- 数値 → レイアウト寸法 (`row_height: 28` など)

### IR への追加

```ts
View.style?: Record<string, string | number>
```

未指定なら `undefined`。指定があれば key→value がそのまま入り、
レンダラ側がテーマにマージする。

### 許可キー (1.9.0 時点)

| カテゴリ | キー | 適用先 |
| --- | --- | --- |
| 全体色 | `bg` `surface` `text` `muted` `accent` `danger` `warn` `success` | 全レンダラ |
| ステレオタイプ色 | `stereo_entity` `stereo_aggregate_root` `stereo_value_object` `stereo_service` `stereo_interface` | ER / class |
| ステータス色 | `status_pending` `status_in_progress` `status_done` `status_blocked` | Gantt / WBS |
| Gantt アクセント | `gantt_today_line` `gantt_critical` `gantt_progress_fg` | Gantt |
| Gantt 寸法 | `row_height` `day_width` `label_width` | Gantt |

許可リスト外のキーはレンダラ側で**無視**され、lint **L058** が
`未知のキー` と注意を出す。

### 後方互換

- `View.style` は optional。未指定 view は **bit-identical** に従来通りレンダリング。
- 既存テーマプリセットには変更なし。
- `@@style` を一切使わない `.umlay` ファイルは IR shape にも変化なし。

## レンダラ仕様

レンダラは以下の手順で適用:

1. `themes[options.theme]` でプリセットを解決
2. `applyViewStyle(theme, view.style)` で文字列値を Theme にマージ
3. 数値値はレンダラ固有 (Gantt は `view.style?.row_height` を直接参照)

文字列キーが Theme の正規プロパティと衝突する場合は **後勝ち** (style が勝つ)。

## Lint L058 — 未知 key / 不正値

| 違反 | severity (mode) |
| --- | --- |
| 許可リスト外のキー | strict: warning / beta / draft: info |
| 色キーに数値 / 不正 hex | strict: warning / beta / draft: info |
| 数値キーに文字列 / 0以下 | strict: warning / beta / draft: info |

メッセージ例:
- `view sprint1: @@style(progress_color: ...) は未知のキーです (RFC 0054 の許可リストを参照)`
- `view sprint1: @@style(row_height: N) の値は正の数値が必要です`

## 例

### Gantt — done を緑強調

```umlay
view sprint1 @gantt_chart {
  @@style(status_done: "#10B981")
  include: "sprint1.*"
}
```

### 行を狭く詰める

```umlay
view backlog @gantt_chart {
  @@style(row_height: 22, day_width: 18)
  include: "backlog.*"
}
```

### 色覚多様性対応 (Deuteranopia 安全)

```umlay
view sprint1 @gantt_chart {
  @@style(
    status_done: "#0173B2",
    status_in_progress: "#DE8F05",
    status_blocked: "#CC78BC"
  )
  include: "sprint1.*"
}
```

## 影響範囲

- spec 1.8.0 → **1.9.0**
- `@umlay/core` IR + visitor: `View.style?` 追加、`@@style` ディレクティブ解析
- `@umlay/lint`: L058 追加
- `@umlay/renderer-er`: `applyViewStyle()` ヘルパ + Gantt / WBS で参照
- VS Code / Web: 変更不要 (renderer 経由で透過適用)

## 将来の拡張

- ステートマシン / シーケンス / コンポーネント図への `row_height` 等の波及
- `@@style(preset: "colorblind-safe")` のような **named tokens** 受付
- ファイル末尾に `--- @@style { ... }` のような **大域** 上書き
