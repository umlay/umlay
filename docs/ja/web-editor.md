# Web エディタ

`https://umlay.keydrop.net/` — インストール不要の Umlay 編集環境。
VS Code 拡張と同じ parser / renderer / lint (`@umlay/webview-ui` 共有)。

## AI プロバイダ

AI Review / AI Generate パネルは **BYOK** (bring-your-own-key)。
Umlay サーバは DSL も API key も見ない。

| プロバイダ | 実行場所 | API key |
| --- | --- | --- |
| `anthropic` | Anthropic (クラウド) | 必要 (`sk-ant-…`, User settings) |
| `openai` | OpenAI (クラウド) | 必要 (`sk-…`, User settings) |
| `webgpu` | **ブラウザ内** (`@mlc-ai/web-llm`) | **不要** |

### WebGPU プロバイダ (spec 1.3.0)

- 遅延ロード (~5 MB JS + 2-4 GB モデル、OPFS / IndexedDB にキャッシュ → 2 回目以降は即起動)
- 3 モデル:
  - Llama 3.2 3B — 2.0 GB, VRAM 4 GB+
  - Phi 3.5 mini — 2.2 GB, VRAM 4 GB+
  - Qwen 2.5 7B — 4.4 GB, VRAM 8 GB+
- `navigator.gpu` がアダプタを返せる環境でのみ選択肢として表示。WebGPU 非対応環境ではクラウド 2 社にフォールバック
- 初回は DL + WebGPU 向けコンパイル進捗が表示される。以降はオフライン実行

## `@@sample(from: "./file.jsonl")` の解決

Web エディタは **添付ファイルパネル** 経由で外部 sample を読み込む:

1. 右サイドバーの Attachments パネルを開く
2. `.jsonl` / `.json` / `.csv` / `.yaml` ファイルをアップロード
3. 次の編集時に parser が拾う — ファイル名は **basename 先、path 末尾マッチ後** の順で照合

ファイルはブラウザの IndexedDB に保存。サーバアップロードなし。

## URL 共有 (`?d=`)

現在の DSL を URL フラグメントに圧縮 (~8 KB 以下)。共有リンクを開くと
同じ IR が再構築される。ログイン不要、サーバ状態なし。

## Diff レビュー機能 (spec 1.3+)

右サイドバーの **Diff タブ** は、最後に保存した IR スナップショット (IndexedDB) と現在の IR を構造比較します。

### 1. Risk 分類ヘッダ
各変更を `@umlay/core` の field-level ルールで 3 バケットに自動分類:

| レベル | 代表例 | 色 |
| --- | --- | --- |
| 🔴 **Breaking** | model 削除、attribute 削除、nullable→not-null 昇格、PK 変更 | 赤 |
| 🟡 **Caution** | stereotype 変更、rename、`onDelete: CASCADE` 追加、UNIQUE 追加、型変更、非 null 属性追加 (default なし) | 橙 |
| 🟢 **Safe** | model 追加、nullable 属性追加、default 付き追加、ドキュメント更新 | 緑 |

### 2. モデルごと delta chip
各モデル行に `+2 / −1 / ~3 / ⇄1` のバッジで attribute 変更を要約 + Breaking/Caution の左側ボーダー。

### 3. SVG ホットスポットオーバーレイ
**ER / Class 図のキャンバス上**で、追加 model は緑の太枠 + ハロー、変更 model は橙の太枠で強調。どの model が diff の対象か、**描画されたグラフを見ただけで把握**できる。

### 4. 影響範囲レポート
各変更モデルの `<details>` 内に「誰がこの model を参照しているか」を列挙:
- **ref**: `@ref(Model.id)` / 関連で参照している attribute
- **view**: `include: ns.Model` / `ns.*` / `**` でこの model を含む view
- **participant**: sequence 図の participant として使われている

### 5. AI 3 行要約 (BYOK)
🤖 ボタンで LLM を呼び、「何が変わったか / なぜ重要か / レビュアーが次に見るべき点」の 3 文サマリを生成。Anthropic / OpenAI / **WebGPU** いずれのプロバイダでも動作。

## エクスポート

| 形式 | 備考 |
| --- | --- |
| SVG | 個別 view / All views、ベクタ |
| PNG | 2× 解像度 + 白背景 (canvas 経由) |
| DSL | 現在のバッファそのまま |
| IR JSON | parse + trait 展開 + selector projection 後 |

## VS Code との機能差分

描画系は完全共有 (`@umlay/webview-ui`)。LSP (hover / completion / rename /
references / workspace symbols / semantic tokens) は VS Code 側のみ。
