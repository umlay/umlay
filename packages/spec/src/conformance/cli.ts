/**
 * Conformance CLI — runs a user-supplied parser against all `.umlay` samples,
 * compares results to `expected-ir/*.ir.json`, and reports L1 (parse) + L2 (IR)
 * conformance levels.
 *
 * Usage (from implementation repo):
 *   import { runConformance } from '@umlay/spec/conformance/cli';
 *   import { parse } from 'my-parser';
 *
 *   const report = await runConformance({ parse });
 *   console.log(formatReport(report));
 *   process.exit(report.l1Pass === report.total && report.l2Pass === report.total ? 0 : 1);
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { type MatchOptions, assertIRMatches } from './match.js';

export type ParseFn = (source: string) => {
  diagnostics: Array<{ severity: string; message: string }>;
  ir: unknown;
};

export interface ConformanceInput {
  /** The implementation's parse function. */
  parse: ParseFn;
  /** Root directory that contains `packages/examples/samples/` + `packages/spec/src/conformance/expected-ir/`. Defaults to the spec package location. */
  specRoot?: string;
  /** Extra MatchOptions passed to assertIRMatches. */
  matchOptions?: MatchOptions;
}

export interface SampleReport {
  path: string;
  l1Errors: number; // parse errors
  l1Pass: boolean;
  l2Matched: boolean;
  l2Diffs: number;
  l2FirstDiffPath?: string | undefined;
}

export interface ConformanceReport {
  total: number;
  l1Pass: number;
  l2Pass: number;
  samples: SampleReport[];
}

function walkUml(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) out.push(...walkUml(p));
      else if (name.endsWith('.umlay')) out.push(p);
    }
  } catch {
    /* missing dir — empty result */
  }
  return out;
}

/**
 * Find the matching expected-ir fixture for a sample. The path is mirrored:
 *   packages/examples/samples/login/login.umlay
 *   → packages/spec/src/conformance/expected-ir/login/login.ir.json
 */
function fixtureFor(sampleAbs: string, samplesRoot: string, fixturesRoot: string): string {
  const rel = relative(samplesRoot, sampleAbs);
  return join(fixturesRoot, rel.replace(/\.umlay$/, '.ir.json'));
}

export async function runConformance(input: ConformanceInput): Promise<ConformanceReport> {
  const root = input.specRoot ?? dirname(dirname(dirname(new URL(import.meta.url).pathname)));
  const samplesRoot = join(root, '..', 'examples', 'samples');
  const fixturesRoot = join(root, 'src', 'conformance', 'expected-ir');

  const samples = walkUml(samplesRoot);
  const report: ConformanceReport = { total: samples.length, l1Pass: 0, l2Pass: 0, samples: [] };

  for (const samplePath of samples) {
    const src = readFileSync(samplePath, 'utf8');
    const { ir, diagnostics } = input.parse(src);
    const errors = diagnostics.filter((d) => d.severity === 'error').length;
    const l1Pass = errors === 0;
    if (l1Pass) report.l1Pass++;

    let l2Matched = false;
    let l2Diffs = 0;
    let l2FirstDiffPath: string | undefined;
    const fixturePath = fixtureFor(samplePath, samplesRoot, fixturesRoot);
    try {
      const expected = JSON.parse(readFileSync(fixturePath, 'utf8'));
      const result = assertIRMatches(ir, expected, input.matchOptions);
      l2Matched = result.ok;
      l2Diffs = result.diffs.length;
      if (!l2Matched) l2FirstDiffPath = result.diffs[0]?.path;
      if (l2Matched) report.l2Pass++;
    } catch {
      // no fixture present — L2 not applicable for this sample
    }

    const entry: SampleReport = {
      path: relative(samplesRoot, samplePath),
      l1Errors: errors,
      l1Pass,
      l2Matched,
      l2Diffs,
    };
    if (l2FirstDiffPath) entry.l2FirstDiffPath = l2FirstDiffPath;
    report.samples.push(entry);
  }

  return report;
}

export function formatReport(report: ConformanceReport): string {
  const lines: string[] = [
    'Umlay conformance report',
    '========================',
    `L1 (parse):   ${report.l1Pass} / ${report.total}`,
    `L2 (IR):      ${report.l2Pass} / ${report.total}`,
    '',
  ];
  const failures = report.samples.filter((s) => !s.l1Pass || (!s.l2Matched && s.l2Diffs > 0));
  if (failures.length === 0) {
    lines.push('All samples pass.');
  } else {
    lines.push('Failures:');
    for (const s of failures.slice(0, 30)) {
      const l1 = s.l1Pass ? '✓' : `✗ (${s.l1Errors} errors)`;
      const l2 = s.l2Matched
        ? '✓'
        : s.l2Diffs > 0
          ? `✗ (${s.l2Diffs} diffs, first: ${s.l2FirstDiffPath})`
          : 'n/a';
      lines.push(`  ${s.path}  L1=${l1}  L2=${l2}`);
    }
    if (failures.length > 30) lines.push(`  ... and ${failures.length - 30} more`);
  }
  return lines.join('\n');
}
