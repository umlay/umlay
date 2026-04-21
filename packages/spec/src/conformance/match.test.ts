import { describe, expect, it } from 'vitest';
import { assertIRMatches, formatDiffs } from './match';

describe('assertIRMatches', () => {
  it('returns ok=true for identical IRs', () => {
    const ir = {
      version: '1.0',
      kind: 'UmlModel',
      mode: 'strict',
      namespaces: { shop: { models: {} } },
      views: [],
    };
    const result = assertIRMatches(ir, ir);
    expect(result.ok).toBe(true);
    expect(result.diffs).toHaveLength(0);
  });

  it('ignores _id by default', () => {
    const actual = { _id: 'abc123', name: 'User', attributes: [] };
    const expected = { _id: 'different', name: 'User', attributes: [] };
    const result = assertIRMatches(actual, expected);
    expect(result.ok).toBe(true);
    expect(result.skipped).toContain('_id');
  });

  it('flags _id mismatch when strictIds=true', () => {
    const actual = { _id: 'abc', name: 'User' };
    const expected = { _id: 'xyz', name: 'User' };
    const result = assertIRMatches(actual, expected, { strictIds: true });
    expect(result.ok).toBe(false);
    expect(result.diffs[0]!.path).toBe('_id');
  });

  it('detects missing field in actual', () => {
    const actual = { name: 'User' };
    const expected = { name: 'User', stereotype: 'entity' };
    const result = assertIRMatches(actual, expected);
    expect(result.ok).toBe(false);
    expect(result.diffs[0]!.kind).toBe('missing-in-actual');
    expect(result.diffs[0]!.path).toBe('stereotype');
  });

  it('allows aspirational fields in expected not present in actual — wait, strictExtras:false means actual extras are OK', () => {
    // With strictExtras=false (default), actual can have MORE fields than expected
    const actual = { name: 'User', extra: 'future field' };
    const expected = { name: 'User' };
    const result = assertIRMatches(actual, expected);
    // missing-in-expected is skipped when strictExtras=false
    expect(result.ok).toBe(true);
    expect(result.skipped).toContain('extra');
  });

  it('flags extra fields when strictExtras=true', () => {
    const actual = { name: 'User', extra: 'future' };
    const expected = { name: 'User' };
    const result = assertIRMatches(actual, expected, { strictExtras: true });
    expect(result.ok).toBe(false);
    expect(result.diffs[0]!.kind).toBe('missing-in-expected');
  });

  it('detects value mismatch in primitives', () => {
    const result = assertIRMatches({ a: 1 }, { a: 2 });
    expect(result.ok).toBe(false);
    expect(result.diffs[0]!.kind).toBe('value-mismatch');
    expect(result.diffs[0]!.actual).toBe(1);
    expect(result.diffs[0]!.expected).toBe(2);
  });

  it('walks nested objects + arrays', () => {
    const actual = {
      namespaces: { ns1: { models: { User: { name: 'User', attributes: [{ name: 'id' }] } } } },
    };
    const expected = {
      namespaces: { ns1: { models: { User: { name: 'User', attributes: [{ name: 'uid' }] } } } },
    };
    const result = assertIRMatches(actual, expected);
    expect(result.ok).toBe(false);
    expect(result.diffs[0]!.path).toBe('namespaces.ns1.models.User.attributes[0].name');
  });

  it('respects ignorePaths', () => {
    const actual = { meta: { imports: ['core'] }, name: 'A' };
    const expected = { meta: { imports: [] }, name: 'A' };
    const result = assertIRMatches(actual, expected, {
      ignorePaths: ['meta.imports'],
    });
    expect(result.ok).toBe(true);
  });

  it('array length mismatch is reported', () => {
    const result = assertIRMatches([1, 2], [1, 2, 3]);
    expect(result.ok).toBe(false);
    const lengthDiff = result.diffs.find((d) => d.path.includes('length'));
    expect(lengthDiff).toBeDefined();
  });

  it('formatDiffs produces readable output', () => {
    const result = assertIRMatches({ a: 1 }, { a: 2, b: 3 });
    const out = formatDiffs(result);
    expect(out).toContain('✗');
    expect(out).toContain('value-mismatch');
    expect(out).toContain('missing-in-actual');
  });

  it('formatDiffs for ok result', () => {
    const result = assertIRMatches({ a: 1 }, { a: 1 });
    expect(formatDiffs(result)).toContain('✓');
  });
});
