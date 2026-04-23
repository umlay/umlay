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
