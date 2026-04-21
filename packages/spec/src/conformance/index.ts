/**
 * @umlay/spec/conformance
 *
 * Conformance manifest ローダー + 自己検証 (L0)。
 * 実装側はこのマニフェストを読み込み、各サンプルを自前パーサに通して
 * L1 (parse) / L2 (IR) / L3 (render) レベルを申告する。
 */

import { SPEC_VERSION } from '../index.js';

export { assertIRMatches, formatDiffs } from './match.js';
export type { MatchOptions, MatchDiff, MatchResult } from './match.js';

// ---------- Types ----------

export interface ConformanceManifest {
  version: '1.0';
  'spec-version': string;
  updated: string;
  samples: SampleEntry[];
  'feature-markers': FeatureMarkers;
}

export interface SampleEntry {
  path: string;
  summary: string;
  'min-spec-version': string;
  features: SampleFeatures;
}

export interface SampleFeatures {
  declarations?: string[];
  stereotypes?: string[];
  annotations?: string[];
  blocks?: string[];
  'view-kinds'?: string[];
  'view-features'?: string[];
  'ref-options'?: string[];
  visibility?: string[];
  modes?: string[];
  rfcs?: number[];
  'fn-methods'?: boolean;
  'type-params'?: boolean;
  'reserved-demo'?: boolean;
  'dependencies-cross-ns'?: boolean;
  'dependencies-lag'?: boolean;
  special?: string[];
}

export type FeatureMarkers = Record<string, Record<string, string>>;

// ---------- Version comparison ----------

/** semver の patch 精度までの大小比較 (pre-release は扱わない)。 */
export function cmpSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (ai < bi) return -1;
    if (ai > bi) return 1;
  }
  return 0;
}

// ---------- Self-validation (L0) ----------

export interface ValidationIssue {
  sample: string;
  kind: 'missing-file' | 'missing-feature' | 'version-mismatch';
  detail: string;
}

/**
 * L0 conformance: manifest 整合性の自己検証。
 * - 各 sample.path が実在する
 * - 各 sample.features に宣言された機能マーカーが DSL 中に出現する
 * - min-spec-version が現行 SPEC_VERSION 以下
 *
 * 実パーサを持たないため grep ベース。
 */
export async function selfValidate(
  manifest: ConformanceManifest,
  readFile: (path: string) => Promise<string | null>,
  resolvePath: (relative: string) => string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const sample of manifest.samples) {
    const absolute = resolvePath(sample.path);
    const content = await readFile(absolute);

    if (content === null) {
      issues.push({
        sample: sample.path,
        kind: 'missing-file',
        detail: `File not found: ${absolute}`,
      });
      continue;
    }

    if (cmpSemver(sample['min-spec-version'], SPEC_VERSION) > 0) {
      issues.push({
        sample: sample.path,
        kind: 'version-mismatch',
        detail: `sample requires ${sample['min-spec-version']}, spec is ${SPEC_VERSION}`,
      });
    }

    // 機能マーカー照合
    const markers = manifest['feature-markers'];
    const checkMarkers = (category: keyof FeatureMarkers, claimed: string[] | undefined) => {
      if (!claimed) return;
      for (const feature of claimed) {
        const pattern = markers[category]?.[feature];
        if (!pattern) continue; // マーカー未定義はスキップ
        const re = new RegExp(pattern, 'm');
        if (!re.test(content)) {
          issues.push({
            sample: sample.path,
            kind: 'missing-feature',
            detail: `Claimed ${category}.${feature} but pattern ${pattern} not found`,
          });
        }
      }
    };

    checkMarkers('declarations', sample.features.declarations);
    checkMarkers('blocks', sample.features.blocks);
    checkMarkers('annotations', sample.features.annotations);
  }

  return issues;
}

// ---------- Summary helpers ----------

/** 全サンプル × 機能のカバレッジマトリクスを集計。 */
export function coverageMatrix(manifest: ConformanceManifest): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const sample of manifest.samples) {
    const f = sample.features;
    const all: string[] = [
      ...(f.declarations ?? []).map(x => `decl:${x}`),
      ...(f.blocks ?? []).map(x => `block:${x}`),
      ...(f.annotations ?? []).map(x => `anno:${x}`),
      ...(f['view-kinds'] ?? []).map(x => `view:${x}`),
      ...(f.stereotypes ?? []).map(x => `stereo:${x}`),
    ];
    for (const item of all) counts[item] = (counts[item] ?? 0) + 1;
  }
  return counts;
}
