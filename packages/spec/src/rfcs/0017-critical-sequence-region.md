---
rfc: 0017
title: Sequence の `critical` リージョン
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.5.0
change-class: A
parent-rfc: 0007
---

# RFC 0017 — Sequence の `critical` リージョン

## 要約

UML 2 の `critical` combined fragment を追加し、シーケンスの一部を**クリティカルセクション** (排他実行領域) として明示できるようにする。

## 背景 / モチベーション

並行実行フロー (`par` / `opt`) が増えると、「この部分だけは排他」を示したいケースが出てくる:

- DB の楽観/悲観ロック区間
- 分散ロック (Redis SETNX / Zookeeper) 下のクリティカル処理
- メッセージの順序保証が必要な区間
- モニタリング計測の厳密なウィンドウ

現状は sequence 中に `opt` や `alt` を使って間接表現しているが、「排他」という意図が伝わらない。

## 提案内容

### 構文 (EBNF)

```ebnf
SeqStatement ::= SeqMessage | AltBlock | LoopBlock | OptBlock | ParBlock | CriticalBlock
CriticalBlock ::= "critical" String "{" SeqStatement* "}"
                  ("on" LockTarget)?
LockTarget    ::= Identifier                               (* 単一リソース *)
                | "(" Identifier ("," Identifier)* ")"     (* 複数リソース *)
```

### 使用例

```prisma
view transfer @sequence_diagram
  @intent("口座間送金 (排他必須)") {
  participants:
    API as api, LockSvc as lock, DB as db, AccountA as a, AccountB as b

  seq {
    api ->> lock : acquire("account-pair")
    lock -.> api : acquired

    critical "残高チェックと引落し・入金" on (a, b) {
      api ->> db : read A balance
      api ->> db : read B balance
      api ->> a  : debit(amount)
      api ->> b  : credit(amount)
      api ->> db : commit transaction
    }

    api ->> lock : release("account-pair")
    lock -.> api : released
  }
}
```

`on` 句で保護対象のリソース (participant の alias) を明示可能。

### ネスト規則

- `critical` 内に `alt` / `opt` / `loop` を配置可能
- `par` 内に `critical` を配置した場合: ブランチごとにクリティカル (ブランチ間では排他しない、並列実行のため)
- `critical` のネスト (ロック階層) は許可: 外側→内側の順序でロック取得する慣習を推奨

### セマンティクス

本 RFC は**描画と意図表現**のみ規定。実装への強制力はない:

- Renderer は背景色 / 枠線でクリティカル区間をハイライト
- Lint は「critical 外で共有リソースへの書き込み」等を警告可能 (将来拡張)
- 実装側のロック機構 (Mutex / DB 行ロック等) はユーザ責任

## IR 影響

```jsonc
"seqStatement": {
  "oneOf": [
    /* 既存: message / alt / loop / opt / par */
    {
      "type": "object",
      "description": "critical リージョン (RFC 0017)",
      "required": ["kind", "label", "statements"],
      "properties": {
        "kind":       { "const": "critical" },
        "label":      { "type": "string" },
        "statements": { "type": "array", "items": { "$ref": "#/$defs/seqStatement" } },
        "lockTargets": {
          "type": "array",
          "items": { "type": "string", "description": "participant alias" }
        }
      }
    }
  ]
}
```

## 後方互換性

**Class A (additive)**: 既存サンプルは無影響。

## 代替案

- **案 B: `@@critical(...)` アノテーション** — 却下: sequence body の中に書くので in-body 構文が自然
- **案 C: `lock` / `sync` キーワード導入** — 却下: UML 標準と揃える方が学習コスト低い

## サンプル / テスト

- 新サンプル `samples/transfer-critical.uml`: 口座送金の critical 区間
- `concurrent-flow.uml` に critical 節を追加し、Order の status 更新を保護

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §9 に critical 節追加
- [ ] `grammar.bnf` の `SeqStatement` に CriticalBlock 追加
- [ ] `ir.schema.json` の `seqStatement` に critical kind 追加
- [ ] `skills/{ja,en}/write-uml.md` に使用例追加
- [ ] `SPEC_VERSION` 0.5.0 bump

## 未解決事項

- `critical on` のリソース識別子が participant alias と別種の場合 (例: DB 行レベルロック)
- Timeout 指定 (`critical "X" timeout(5s)`) の要否
- UML `break` / `consider` / `ignore` フラグメントも合わせて導入するか
