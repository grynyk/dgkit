import type {
  DgParamDef,
  DgParamOptions,
  DgParamSource,
} from './route-state.types';

/** First raw value, or `undefined` when the key is absent. */
function first(raw: readonly string[]): string | undefined {
  return raw.length > 0 ? raw[0] : undefined;
}

/**
 * A string parameter.
 *
 * ```ts
 * tab: stringParam('overview');
 * ```
 */
export function stringParam(
  defaultValue = '',
  options: DgParamOptions = {},
): DgParamDef<string, 'query'> {
  return {
    source: 'query',
    key: options.key,
    defaultValue,
    parse: (raw) => first(raw) ?? defaultValue,
    serialize: (value) => [value],
    equal: Object.is,
  };
}

/**
 * A number parameter. Non-numeric values in the URL fall back to the default.
 *
 * ```ts
 * page: numberParam(1);
 * id: numberParam(); // number | undefined when absent
 * ```
 */
export function numberParam(
  defaultValue?: undefined,
  options?: DgParamOptions,
): DgParamDef<number | undefined, 'query'>;
export function numberParam(
  defaultValue: number,
  options?: DgParamOptions,
): DgParamDef<number, 'query'>;
// `DgParamDef<T>` is invariant in `T` (it both produces and consumes `T`), so
// the implementation signature is widened to satisfy both overloads.
export function numberParam(
  defaultValue?: number,
  options: DgParamOptions = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): DgParamDef<any, 'query'> {
  return {
    source: 'query',
    key: options.key,
    defaultValue,
    parse: (raw) => {
      const value = first(raw);
      if (value === undefined || value.trim() === '') {
        return defaultValue;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : defaultValue;
    },
    serialize: (value) => (value === undefined ? null : [String(value)]),
    equal: Object.is,
  };
}

/**
 * A boolean parameter. `'true'`/`'1'`/`''` (bare flag) are truthy;
 * `'false'`/`'0'` are falsy; anything else falls back to the default.
 *
 * ```ts
 * archived: booleanParam(false);
 * ```
 */
export function booleanParam(
  defaultValue = false,
  options: DgParamOptions = {},
): DgParamDef<boolean, 'query'> {
  return {
    source: 'query',
    key: options.key,
    defaultValue,
    parse: (raw) => {
      const value = first(raw);
      if (value === undefined) {
        return defaultValue;
      }
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === '') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
      return defaultValue;
    },
    serialize: (value) => (value ? ['true'] : ['false']),
    equal: Object.is,
  };
}

/**
 * A parameter constrained to a set of allowed values. Accepts a TypeScript enum
 * object or a literal array; unknown values fall back to the default.
 *
 * ```ts
 * sort: enumParam(Sort, Sort.Asc);
 * view: enumParam(['grid', 'list'] as const, 'grid');
 * ```
 */
export function enumParam<T extends string>(
  values: readonly T[] | Record<string, T>,
  defaultValue: T,
  options?: DgParamOptions,
): DgParamDef<T, 'query'>;
export function enumParam<T extends string>(
  values: readonly T[] | Record<string, T>,
  defaultValue?: undefined,
  options?: DgParamOptions,
): DgParamDef<T | undefined, 'query'>;
export function enumParam<T extends string>(
  values: readonly T[] | Record<string, T>,
  defaultValue?: T,
  options: DgParamOptions = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): DgParamDef<any, 'query'> {
  const allowed: readonly T[] = Array.isArray(values)
    ? values
    : Object.values(values as Record<string, T>);

  return {
    source: 'query',
    key: options.key,
    defaultValue,
    parse: (raw) => {
      const value = first(raw);
      return value !== undefined && allowed.includes(value as T)
        ? (value as T)
        : defaultValue;
    },
    serialize: (value) => (value === undefined ? null : [value]),
    equal: Object.is,
  };
}

/** Per-item codec used by {@link arrayParam}. */
export interface DgArrayItemCodec<T> {
  readonly parse: (raw: string) => T | undefined;
  readonly serialize: (value: T) => string;
}

const stringItem: DgArrayItemCodec<string> = {
  parse: (raw) => raw,
  serialize: (value) => value,
};

/** Item codec for numeric arrays. */
export const numberItem: DgArrayItemCodec<number> = {
  parse: (raw) => {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  },
  serialize: (value) => String(value),
};

/**
 * A repeated parameter (`?statuses=a&statuses=b`).
 *
 * ```ts
 * statuses: arrayParam<string>();
 * ids: arrayParam<number>([], { item: numberItem });
 * ```
 *
 * Items that fail to parse are dropped rather than poisoning the whole value.
 */
export function arrayParam<T = string>(
  defaultValue: readonly T[] = [],
  options: DgParamOptions & { readonly item?: DgArrayItemCodec<T> } = {},
): DgParamDef<readonly T[], 'query'> {
  const item = options.item ?? (stringItem as unknown as DgArrayItemCodec<T>);

  return {
    source: 'query',
    key: options.key,
    defaultValue,
    parse: (raw) => {
      if (raw.length === 0) {
        return defaultValue;
      }
      const parsed = raw
        .map((entry) => item.parse(entry))
        .filter((entry): entry is T => entry !== undefined);
      return parsed;
    },
    serialize: (value) =>
      value.length === 0 ? null : value.map((entry) => item.serialize(entry)),
    equal: (a, b) =>
      a.length === b.length && a.every((v, i) => Object.is(v, b[i])),
  };
}

/**
 * Read a parameter from the route **path** instead of the query string.
 *
 * ```ts
 * id: pathParam(numberParam());
 * ```
 *
 * Path parameters are exposed as read-only signals: changing one would mean
 * rewriting the route's path segments, which this package does not guess at.
 * Navigate explicitly with the `Router` instead.
 */
export function pathParam<T>(
  param: DgParamDef<T, DgParamSource>,
): DgParamDef<T, 'path'> {
  return { ...param, source: 'path' };
}
