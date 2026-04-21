# Umlay Skills

Umlay DSL / IR を扱う開発者・AI エージェント向けの **skill 定義**。すべての skill は [`@umlay/spec`](../packages/spec/) (`grammar.md` と `ir.schema.json`) を正本とし、その枠内での手順・制約・DSL 例を提供します。

Skill definitions for developers and AI agents working with Umlay DSL / IR. Every skill is grounded in [`@umlay/spec`](../packages/spec/) (`grammar.md` and `ir.schema.json`) and provides procedures, constraints, and DSL examples within that contract.

## Skill 一覧 / Catalog

| Skill | 目的 (JA) | Purpose (EN) |
| --- | --- | --- |
| `write-uml` | 要件から `.umlay` を書き起こす | Produce a spec-conformant `.umlay` from requirements |
| `review-uml` | DSL / IR を spec + lint + リスクでレビュー | Review DSL / IR across spec / lint / risk layers |
| `evolve-schema` | 既存 DSL を後方互換性を守って拡張 | Safely evolve existing DSL |
| `codegen-mapping` | IR を Prisma / SQL / TS へ決定論的に変換 | Deterministic IR → Prisma / SQL / TS mapping |

## 日本語 🇯🇵

| Skill | リンク |
| --- | --- |
| write-uml | [`ja/write-uml.md`](./ja/write-uml.md) |
| review-uml | [`ja/review-uml.md`](./ja/review-uml.md) |
| evolve-schema | [`ja/evolve-schema.md`](./ja/evolve-schema.md) |
| codegen-mapping | [`ja/codegen-mapping.md`](./ja/codegen-mapping.md) |

## English 🇬🇧

| Skill | Link |
| --- | --- |
| write-uml | [`en/write-uml.md`](./en/write-uml.md) |
| review-uml | [`en/review-uml.md`](./en/review-uml.md) |
| evolve-schema | [`en/evolve-schema.md`](./en/evolve-schema.md) |
| codegen-mapping | [`en/codegen-mapping.md`](./en/codegen-mapping.md) |

## Claude Code への導入 / Install into Claude Code

Claude Code は `~/.claude/skills/` (全プロジェクト共通) もしくは `<project>/.claude/skills/` (プロジェクト固有) に置かれたスキルファイルを `/<skill-name>` として呼び出せます。以下のいずれかの方法で Umlay skills をインストールしてください。

### 方法 A: 全プロジェクト共通で使う (推奨)

```sh
# 1. リポジトリを任意の場所にクローン
git clone https://github.com/umlay/umlay.git ~/src/umlay

# 2. Claude Code のスキルディレクトリにシンボリックリンクを貼る
mkdir -p ~/.claude/skills
ln -s ~/src/umlay/umlay-oss/skills/ja/write-uml.md        ~/.claude/skills/write-uml.md
ln -s ~/src/umlay/umlay-oss/skills/ja/review-uml.md       ~/.claude/skills/review-uml.md
ln -s ~/src/umlay/umlay-oss/skills/ja/evolve-schema.md    ~/.claude/skills/evolve-schema.md
ln -s ~/src/umlay/umlay-oss/skills/ja/codegen-mapping.md  ~/.claude/skills/codegen-mapping.md

# 英語版を使いたい場合は `ja/` を `en/` に読み替え
```

シンボリックリンクなので `git pull` で自動的に最新版が反映されます。

### 方法 B: 特定プロジェクトだけで使う

```sh
cd <your-project>
mkdir -p .claude/skills
curl -sL https://raw.githubusercontent.com/umlay/umlay/main/umlay-oss/skills/ja/write-uml.md \
  -o .claude/skills/write-uml.md
# 必要な skill 分だけ繰り返す
```

### 方法 C: サブモジュールとして追跡

```sh
cd <your-project>
git submodule add https://github.com/umlay/umlay.git vendor/umlay
mkdir -p .claude/skills
ln -s ../../vendor/umlay/umlay-oss/skills/ja/write-uml.md .claude/skills/write-uml.md
# 他 skill も同様
```

### 使い方 / Usage

インストール後、Claude Code のチャットで以下のように呼び出せます:

```
/write-uml 「ECサイトで商品・カート・注文を扱う最小 DSL を書いて」
/review-uml 現在開いている .umlay ファイルをレビューして
/evolve-schema User モデルに role: UserRole を追加したい
/codegen-mapping この IR を Prisma schema に変換して
```

各 skill は `@umlay/spec` の grammar.md / ir.schema.json を正本として参照するため、**CLI ツールのインストールは不要**です。`.umlay` のパーサ / lint / レンダリングを併用したい場合のみ、以下を追加インストールしてください:

```sh
pnpm add -D @umlay/core @umlay/lint @umlay/renderer-er
# または VS Code 拡張 (LSP 内蔵):
# Marketplace で "Umlay" を検索
```

## フォーマット / Format

各 skill ファイルはフロントマター (YAML) と本文 (Markdown) で構成されます。

```markdown
---
name: <skill-id>
version: <semver>
spec: "@umlay/spec >= <min-version> (DSL X.Y / IR X.Y)"
audience: [ai-agent, developer, ...]
summary: <one-line summary>
references:
  grammar: <path>
  schema: <path>
  keywords: <path>
---

# <skill-id>

## Goal
## Preconditions
## Inputs / Outputs
## Procedure (Step-by-step)
## Constraints (from spec)
## Checklist
## Example
## References
```

### Frontmatter フィールド / fields

| Field | Required | 意味 / Meaning |
| --- | --- | --- |
| `name` | ✅ | Skill 識別子 (ファイル名と一致) |
| `version` | ✅ | skill 自体の semver |
| `spec` | ✅ | 対応する `@umlay/spec` のバージョン範囲 |
| `audience` | ✅ | `ai-agent` / `developer` / `reviewer` / `architect` / `codegen-author` / `tool-author` |
| `summary` | ✅ | 1 行要約 |
| `references` | ✅ | 正本ファイルへのパス (grammar / schema / keywords の最低 3 点) |

## 正本との関係 / Relation to the spec

Skill は次の 3 ファイルを**唯一の正本**とし、それに従わない記述を含みません。

1. [`packages/spec/src/grammar.md`](../packages/spec/src/grammar.md) — DSL 文法
2. [`packages/spec/src/ir.schema.json`](../packages/spec/src/ir.schema.json) — 正規IR JSON Schema
3. [`packages/spec/src/index.ts`](../packages/spec/src/index.ts) — 予約語、バージョン定数

正本が変わる場合は、全 skill の `spec` フィールドを一斉に更新し、差分を記録します。

Skills reference exactly these three sources as canonical:

1. [`packages/spec/src/grammar.md`](../packages/spec/src/grammar.md) — DSL grammar
2. [`packages/spec/src/ir.schema.json`](../packages/spec/src/ir.schema.json) — normalized IR JSON Schema
3. [`packages/spec/src/index.ts`](../packages/spec/src/index.ts) — reserved keywords and version constants

When the spec changes, bump every skill's `spec` field in lockstep and record the delta.

## Skill 追加の手順 / Adding a new skill

1. `skills/ja/<slug>.md` と `skills/en/<slug>.md` を作成
2. フロントマターに `references` (grammar / schema / keywords) を埋める
3. 本文中の DSL / IR 例は `grammar.md` と `ir.schema.json` で検証できる形にする
4. 本 README の表に行を追加
5. `CONTRIBUTING.md` の手順に沿って PR を提出

## ライセンス / License

`skills/` 配下の各ファイルは、特記がない限り **CC-BY 4.0** です。帰属表示は `Umlay contributors (https://github.com/umlay/umlay)` で統一します。

Unless noted otherwise, files under `skills/` are **CC-BY 4.0**. Attribute as `Umlay contributors (https://github.com/umlay/umlay)`.
