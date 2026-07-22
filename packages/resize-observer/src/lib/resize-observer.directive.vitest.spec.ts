/**
 * Vitest entry point. Runs the exact same behavioral suite as the Jest runner
 * (see `resize-observer.directive.spec.ts`), sharing every assertion via
 * `resize-observer.directive.shared-spec.ts`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runResizeObserverDirectiveSuite } from './resize-observer.directive.shared-spec';

runResizeObserverDirectiveSuite({
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
});
