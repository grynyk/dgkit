/**
 * Public API of `@dgkit/route-state`.
 */
export { injectRouteState } from './lib/route-state';
export {
  arrayParam,
  booleanParam,
  dateParam,
  enumParam,
  numberItem,
  numberParam,
  pathParam,
  stringParam,
  type DgArrayItemCodec,
} from './lib/params';
export type {
  DgAnyParamDef,
  DgNavigateOptions,
  DgParamDef,
  DgParamDefs,
  DgParamOptions,
  DgParamSource,
  DgParamValue,
  DgRouteState,
  DgRouteStateOptions,
  DgWritableParamSignal,
  DgWritableValues,
} from './lib/route-state.types';
