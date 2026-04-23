# Corpus tests

Corpus files (`*.txt`) go here in the standard `tree-sitter test` format:

```
==================
test name
==================

source code

---

(expected-ast)
```

Run with:

```sh
pnpm run test
```

The previous declarations / directives snapshots were removed because the
grammar's current `doc_trailer` handling trails `ERROR (UNEXPECTED '\0')`
at EOF — a known issue to fix before adding corpus again (tracked as part
of the Phase-0.2 grammar hardening task).
