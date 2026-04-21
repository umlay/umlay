---
rfc: 0001
title: DSL 文法の BNF 正式化
author: "@kigi"
status: accepted
created: 2026-04-18
updated: 2026-04-19
accepted: 2026-04-19
spec-version-target: 0.2.0
change-class: A
supersedes:
superseded-by:
---

# RFC 0001 — DSL 文法の BNF 正式化

## 要約

現状 `grammar.md` は散文的な列挙形式で書かれており、パーサ実装ごとの解釈揺れが生じる余地がある。W3C EBNF 準拠の形式文法を正式導入する。

## 背景 / モチベーション

- パーサ実装 (Chevrotain ベース等) と DSL 執筆者の間で「受理/拒否」の境界が曖昧な箇所がある
- 例: `fn` メソッドと予約語 `fn` の扱い、`alt`/`loop` のネスト、日本語識別子の文字クラス
- 複数実装の conformance 検証には機械可読な文法が必要
- `@umlay/spec` を「契約」として機能させるには BNF が正本として必要

## 提案内容

### 採用記法

W3C EBNF (XML 1.0 準拠) を基調とする:

| 記号 | 意味 |
| --- | --- |
| `::=` | 生成規則 |
| `\|` | 選択 |
| `?` | 0 または 1 |
| `*` | 0 回以上 |
| `+` | 1 回以上 |
| `( ... )` | グループ化 |
| `"..."` | 終端記号 (文字列) |
| `/* ... */` | コメント |

### 本体 (Phase 1)

```ebnf
/* ─────────────── ファイル構造 ─────────────── */

File            ::= FileDirective* NamespaceDecl TopLevel*
NamespaceDecl   ::= "namespace" Identifier
TopLevel        ::= TypeDecl | EnumDecl | ModelDecl | ViewDecl | FileDirective

FileDirective   ::= ModeDirective | ThemeDirective
ModeDirective   ::= "@@mode" "(" ("draft" | "strict") ")"
ThemeDirective  ::= "@@theme" "(" String ")"

/* ─────────────── 宣言 ─────────────── */

TypeDecl        ::= "type" Identifier "@value_object" ModelAnnotation*
                    "{" (Field | BlockDirective)* "}"

EnumDecl        ::= "enum" Identifier ModelAnnotation*
                    "{" EnumValue ("," EnumValue)* ","? "}"
EnumValue       ::= Identifier

ModelDecl       ::= "model" Identifier Stereotype ModelAnnotation*
                    "{" ModelMember* "}"
Stereotype      ::= "@entity" | "@aggregate_root" | "@value_object"
                  | "@service" | "@interface"
ModelMember     ::= Field | Relation | FnMethod | BlockDirective
ModelAnnotation ::= IntentAnnotation | CodegenNameAnnotation

/* ─────────────── 属性 (field) ─────────────── */

Field           ::= Visibility? Identifier Type Nullability FieldAnnotation*
Visibility      ::= "+" | "-" | "#"
Nullability     ::= "!" | "?" | "??"
Type            ::= QualifiedName
QualifiedName   ::= Identifier ("." Identifier)?

FieldAnnotation ::= IdAnnotation
                  | RefAnnotation
                  | UniqueAnnotation
                  | IndexAnnotation
                  | DefaultAnnotation
                  | CodegenNameAnnotation
                  | MaxLengthAnnotation
                  | PatternAnnotation
                  | ScaleAnnotation
                  | IntentAnnotation
                  | InvAnnotation
                  | AutoAnnotation
                  | DeprecatedAnnotation

IdAnnotation    ::= "@id"
RefAnnotation   ::= "@ref" "(" RefTarget ("," RefOption)* ")"
RefTarget       ::= Identifier "." Identifier
RefOption       ::= ("onDelete" | "onUpdate") ":" RefAction
                  | "inverse" ":" String
RefAction       ::= "CASCADE" | "RESTRICT" | "SET_NULL" | "NO_ACTION"

UniqueAnnotation    ::= "@unique"
IndexAnnotation     ::= "@index"
DefaultAnnotation   ::= "@default" "(" Expr ")"
CodegenNameAnnotation ::= "@codegenName" "(" String ")"
MaxLengthAnnotation ::= "@maxLength" "(" Integer ")"
PatternAnnotation   ::= "@pattern" "(" String ")"
ScaleAnnotation     ::= "@scale" "(" Integer ")"
IntentAnnotation    ::= "@intent" "(" String ")"
InvAnnotation       ::= "@inv" "(" String ")"
AutoAnnotation      ::= "@auto"
DeprecatedAnnotation ::= "@deprecated" "(" String ")"

/* ─────────────── リレーション ─────────────── */

Relation        ::= "->" RelationKind Multiplicity Identifier ":" QualifiedName
RelationKind    ::= "composition" | "aggregation" | "association" | "inheritance"
Multiplicity    ::= "1" | "0..1" | "1..*" | "0..*"
                  | Integer ".." (Integer | "*")

/* ─────────────── fn メソッド ─────────────── */

FnMethod        ::= "fn" Identifier "(" FnParams? ")" "->" ReturnType MethodAnnotation*
FnParams        ::= FnParam ("," FnParam)*
FnParam         ::= Identifier ":" Type Nullability?
ReturnType      ::= "void" | Type Nullability?
MethodAnnotation ::= "@pre" "(" String ")"
                   | "@post" "(" String ")"
                   | "@raises" "(" Identifier ")"
                   | "@intent" "(" String ")"

/* ─────────────── ブロックディレクティブ ─────────────── */

BlockDirective  ::= CompositeIdBlock
                  | CompositeUniqueBlock
                  | CompositeIndexBlock
                  | DocBlock
                  | AttachmentsBlock
                  | DependenciesBlock
                  | ThemeDirective

CompositeIdBlock     ::= "@@id" "(" IdentifierList ")"
CompositeUniqueBlock ::= "@@unique" "(" IdentifierList ")"
CompositeIndexBlock  ::= "@@index" "(" IdentifierList ")"

DocBlock        ::= "@@doc" "(" TripleQuotedString ")"

AttachmentsBlock ::= "@@attachments" "(" AttachmentItem ("," AttachmentItem)* ")"
AttachmentItem  ::= "{" ObjectField ("," ObjectField)* "}"

DependenciesBlock ::= "@@dependencies" "(" DependencyItem ("," DependencyItem)* ")"
DependencyItem    ::= Identifier                                 /* 短縮形 */
                    | "{" DepField ("," DepField)* "}"           /* 完全形 */
DepField          ::= "on"   ":" Identifier
                    | "kind" ":" ("FS" | "SS" | "FF" | "SF")
                    | "lag"  ":" SignedInteger

IdentifierList  ::= Identifier ("," Identifier)*

/* ─────────────── view ─────────────── */

ViewDecl        ::= "view" Identifier ViewKind ModelAnnotation*
                    "{" ViewBody "}"
ViewKind        ::= "@er_diagram" | "@class_diagram" | "@sequence_diagram"
                  | "@component_diagram" | "@package_diagram" | "@state_machine"
                  | "@activity_diagram" | "@deployment_diagram"
                  | "@wbs_diagram" | "@gantt_chart"

ViewBody        ::= IncludeClause ExcludeClause? LayoutClause? ThemeDirective?
                    (SequenceBody)?

IncludeClause   ::= "include" ":" ModelPatternList
ExcludeClause   ::= "exclude" ":" ModelPatternList
ModelPatternList ::= ModelPattern ("," ModelPattern)*
ModelPattern    ::= QualifiedName ".*"? 

LayoutClause    ::= "layout" ":" LayoutSpec       /* RFC 0002 で確定 */
LayoutSpec      ::= /* TBD */

SequenceBody    ::= ParticipantsDecl SeqBlock
ParticipantsDecl ::= "participants" ":" Participant ("," Participant)*
Participant     ::= Identifier ("as" Identifier)?
SeqBlock        ::= "seq" "{" SeqStatement* "}"
SeqStatement    ::= SeqMessage | AltBlock | LoopBlock
SeqMessage      ::= Identifier Arrow Identifier ":" MessageLabel
Arrow           ::= "->>" | "-.>"
MessageLabel    ::= LineText
AltBlock        ::= "alt" String "{" SeqStatement* "}"     /* else は RFC 0003 で追加 */
LoopBlock       ::= "loop" String "{" SeqStatement* "}"

/* ─────────────── 式 (アノテーション引数) ─────────────── */

Expr            ::= Literal | Identifier | FunctionCall
FunctionCall    ::= Identifier "(" (Expr ("," Expr)*)? ")"
Literal         ::= Integer | Float | String | Boolean | Null
SignedInteger   ::= "-"? Integer
Boolean         ::= "true" | "false"
Null            ::= "null"

ObjectField     ::= Identifier ":" (Expr | Identifier)

/* ─────────────── 語彙 (字句) ─────────────── */

Identifier      ::= IdStart IdCont*
IdStart         ::= UnicodeLetter | "_"     /* 日本語識別子を許容 */
IdCont          ::= IdStart | Digit

String          ::= '"' (StringChar | EscapeSeq)* '"'
TripleQuotedString ::= '"""' (AnyChar)* '"""'    /* 非貪欲 */
StringChar      ::= AnyChar - ('"' | '\' | Newline)
EscapeSeq       ::= "\" ('"' | '\' | 'n' | 't' | 'r' | 'u' HexDigit HexDigit HexDigit HexDigit)

Integer         ::= Digit+
Float           ::= Digit+ "." Digit+
Digit           ::= "0".."9"
HexDigit        ::= Digit | "a".."f" | "A".."F"
UnicodeLetter   ::= /* Unicode category L 全般 (日本語含む) */
Newline         ::= "\n" | "\r\n"

LineText        ::= (AnyChar - Newline)*
AnyChar         ::= /* any Unicode code point */

/* ─────────────── コメント / 空白 ─────────────── */

Comment         ::= LineComment | BlockComment
LineComment     ::= "//" LineText Newline
BlockComment    ::= "/*" AnyChar* "*/"
Whitespace      ::= " " | "\t" | Newline | Comment
```

### 結合律 / 優先順位

- `Field` 内のアノテーションは**順不同** (パース順に IR に配置、semantic は順序非依存)
- `Stereotype` は 1 model に 1 個
- `BlockDirective` は `ModelBody` 内で 0 回以上、`IntentAnnotation` の後ろ / `Field` 群の前後どちらでも可

### 曖昧解消

- `fn` は **`model` / `type` の body 内**でのみメソッド宣言キーワード。それ以外の位置では識別子として使うと parse error (RESERVED_KEYWORDS)
- `alt` / `loop` は **`seq` block 内**でのみブロック。それ以外では識別子扱い
- `as` は **`participants` 宣言内**でのみキーワード。それ以外では識別子扱い
- `include` / `exclude` / `layout` / `participants` / `seq` は **`view` body 内**でのみキーワード

## IR 影響

なし (本 RFC は文法の正式化のみで、IR schema は変更しない)。

## 後方互換性

**Class A (additive)**: 既存の合法な `.umlay` はすべて本 BNF にも合致する。既存パーサ実装が寛容に受理していた曖昧な形 (例: `alt` 後の label 引用符省略) のうち、BNF で拒否される形があれば実装側で修正が必要。

## 代替案

- **案 B: ANTLR grammar** — ANTLR4 ツールチェインに依存。却下理由: 中立な仕様記法として EBNF を優先
- **案 C: PEG (TreeSitter)** — Chevrotain 実装と相性が良い。却下理由: 読み手の裾野が狭い
- **案 D: 散文継続 (現状維持)** — 却下理由: 実装間のばらつきを放置する

## サンプル / テスト

- `packages/examples/samples/*.umlay` の全 10 サンプルが本 BNF に合致することを `spec/conformance/` で回帰テスト (別途 RFC)
- 反例集 (parse error となる形) を `packages/spec/src/rfcs/0001-counter-examples/` にまとめる

## 受諾時にやること

- [ ] `packages/spec/src/grammar.md` の末尾に本 BNF を転載、または別ファイル `grammar.bnf` として切り出し
- [ ] `packages/spec/src/index.ts` の `SPEC_VERSION` を 0.2.0 に bump
- [ ] 既存 skills (`write-uml` / `review-uml`) の曖昧表現を BNF 参照に書き換え
- [ ] パーサ実装 (別リポジトリ) の行動と本 BNF の差分を監査 (conformance gap レポート)

## 未解決事項

- `layout:` 内の具体構文は RFC 0002 に委譲
- `alt` の `else` 分岐は RFC 0003 に委譲
- Unicode identifier の厳密な文字クラス定義 (Unicode 16.0 の `XID_Start` / `XID_Continue` を参照するか)
- 複数行 `MessageLabel` の扱い (現在は 1 行のみ)
