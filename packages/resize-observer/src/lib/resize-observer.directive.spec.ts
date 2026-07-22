/**
 * Jest entry point. The behavioral suite is shared with the Vitest runner (see
 * `resize-observer.directive.vitest.spec.ts`) and lives in
 * `resize-observer.directive.shared-spec.ts`.
 */
import { runResizeObserverDirectiveSuite } from './resize-observer.directive.shared-spec';

runResizeObserverDirectiveSuite({
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
});
