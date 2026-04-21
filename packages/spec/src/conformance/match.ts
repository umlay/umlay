/**
 * @umlay/spec/conformance/match
 *
 * IR fixture matcher. An implementation (downstream parser) calls
 * `assertIRMatches(actual, expected, opts)` to check its L2 (IR) conformance
 * against the fixtures in `expected-ir/`.
 *
 * Design:
 *   - Structural diff — field-by-field deep compare
 *   - `_id` ignored by default (content-hash, differs across implementations)
 *   - `additionalProperties` allowed: aspirational fixture fields that the
 *     implementation doesn't yet produce do NOT fail by default (treated as
 *     "future spec surface"). Toggle with `opts.strictExtras: true`.
 *   - Returns a report object (doesn't throw); callers can format / assert.
 */

export interface MatchOptions {
  /** If true, `_id` on any object must match exactly. Default false. */
  strictIds?: boolean;
  /** If true, extra keys in `expected` that are missing from `actual` count as a diff. Default false — aspirational fixtures may carry forward-looking fields. */
  strictExtras?: boolean;
  /** Paths to ignore (dot notation, e.g. "meta.imports"). */
  ignorePaths?: string[];
}

export interface MatchDiff {
  path: string;
  kind: 'missing-in-actual' | 'missing-in-expected' | 'value-mismatch' | 'type-mismatch';
  expected?: unknown;
  actual?: unknown;
  message: string;
}

export interface MatchResult {
  ok: boolean;
  diffs: MatchDiff[];
  /** Paths skipped due to ignore rules or strictExtras=false. */
  skipped: string[];
}

/**
 * Compare two IR objects. Returns a structured diff.
 *
 * Usage:
 *   const result = assertIRMatches(actual, expected);
 *   if (!result.ok) { console.error(formatDiffs(result)); process.exit(1); }
 */
export function assertIRMatches(
  actual: unknown,
  expected: unknown,
  opts: MatchOptions = {},
): MatchResult {
  const diffs: MatchDiff[] = [];
  const skipped: string[] = [];
  const strictIds = opts.strictIds ?? false;
  const strictExtras = opts.strictExtras ?? false;
  const ignorePaths = new Set(opts.ignorePaths ?? []);

  const shouldIgnore = (path: string): boolean => {
    if (ignorePaths.has(path)) return true;
    // ignore `_id` unless strictIds (works for root `_id` and nested `foo._id`)
    if (!strictIds && (path === '_id' || path.endsWith('._id'))) return true;
    return false;
  };

  const walk = (a: unknown, e: unknown, path: string): void => {
    if (shouldIgnore(path)) {
      skipped.push(path);
      return;
    }

    // Null / undefined handling
    if (e == null && a == null) return;
    if (e == null) {
      if (strictExtras) {
        diffs.push({
          path,
          kind: 'missing-in-expected',
          actual: a,
          expected: e,
          message: `actual has unexpected value at ${path}`,
        });
      } else {
        skipped.push(path);
      }
      return;
    }
    if (a == null) {
      diffs.push({
        path,
        kind: 'missing-in-actual',
        actual: a,
        expected: e,
        message: `actual missing expected value at ${path}`,
      });
      return;
    }

    // Type mismatch
    if (typeof a !== typeof e) {
      diffs.push({
        path,
        kind: 'type-mismatch',
        actual: a,
        expected: e,
        message: `type mismatch at ${path}: actual=${typeof a}, expected=${typeof e}`,
      });
      return;
    }

    // Arrays — compare by index
    if (Array.isArray(e)) {
      if (!Array.isArray(a)) {
        diffs.push({
          path,
          kind: 'type-mismatch',
          actual: a,
          expected: e,
          message: `expected array at ${path}, got ${typeof a}`,
        });
        return;
      }
      if (a.length !== e.length) {
        diffs.push({
          path: `${path}.length`,
          kind: 'value-mismatch',
          actual: a.length,
          expected: e.length,
          message: `array length mismatch at ${path}: actual=${a.length}, expected=${e.length}`,
        });
      }
      const max = Math.max(a.length, e.length);
      for (let i = 0; i < max; i++) walk(a[i], e[i], `${path}[${i}]`);
      return;
    }

    // Objects — compare by key set (union)
    if (typeof e === 'object') {
      if (typeof a !== 'object' || Array.isArray(a)) {
        diffs.push({
          path,
          kind: 'type-mismatch',
          actual: a,
          expected: e,
          message: `expected object at ${path}`,
        });
        return;
      }
      const eObj = e as Record<string, unknown>;
      const aObj = a as Record<string, unknown>;
      const allKeys = new Set([...Object.keys(eObj), ...Object.keys(aObj)]);
      for (const key of allKeys) {
        walk(aObj[key], eObj[key], path ? `${path}.${key}` : key);
      }
      return;
    }

    // Primitives
    if (a !== e) {
      diffs.push({
        path,
        kind: 'value-mismatch',
        actual: a,
        expected: e,
        message: `value mismatch at ${path}: actual=${JSON.stringify(a)}, expected=${JSON.stringify(e)}`,
      });
    }
  };

  walk(actual, expected, '');
  return { ok: diffs.length === 0, diffs, skipped };
}

/** Format a MatchResult for human display. */
export function formatDiffs(result: MatchResult, maxDiffs = 20): string {
  if (result.ok) return `✓ IR matches (${result.skipped.length} paths skipped)`;
  const lines: string[] = [`✗ ${result.diffs.length} diff(s):`];
  for (const d of result.diffs.slice(0, maxDiffs)) {
    lines.push(`  [${d.kind}] ${d.path}: ${d.message}`);
  }
  if (result.diffs.length > maxDiffs) {
    lines.push(`  ... and ${result.diffs.length - maxDiffs} more`);
  }
  return lines.join('\n');
}
