/**
 * @umlay/spec
 *
 * Umlay DSL specification surface.
 * Grammar and IR schema live as sibling files; this module exposes metadata only.
 */

export const SPEC_VERSION = '1.3.0' as const;
export const IR_SCHEMA_VERSION = '1.0' as const;
export const DSL_VERSION = '1.0' as const;

/** Reserved keywords the Phase 1 parser must accept (but may not yet render/execute). */
export const RESERVED_KEYWORDS = [
  // v1 implemented
  'namespace',
  'type',
  'enum',
  'model',
  'view',
  // future UML / modern-stack (accepted in Phase 1, rendered later)
  'protocol',
  'union',
  'trait',
  'fn',
  'module',
  // React / Next.js
  'component',
  'page',
  'layout',
  'action',
  'route',
  'context',
  'hook',
  // Cloud-native primitives
  'function',
  'worker',
  'queue',
  'topic',
  'stream',
  'cache',
  'store',
  'scheduler',
  'webhook',
  'integration',
  'gateway',
  'cdn',
] as const;

export type ReservedKeyword = (typeof RESERVED_KEYWORDS)[number];
