import type { Signal } from '@angular/core';

/** Where a parameter is read from. */
export type DgParamSource = 'query' | 'path';

/** Options common to every parameter factory. */
export interface DgParamOptions {
  /**
   * URL key, when it differs from the property name.
   * `{ page: numberParam(1, { key: 'p' }) }` reads/writes `?p=…`.
   */
  readonly key?: string;
}

/**
 * A fully described parameter: how to read it from the URL, how to write it
 * back, and what it falls back to.
 *
 * `S` is tracked in the type so path parameters can be exposed as read-only —
 * writing one would require rewriting the route's path segments, which this
 * package deliberately does not guess at.
 */
export interface DgParamDef<T, S extends DgParamSource = 'query'> {
  readonly source: S;
  readonly key?: string;
  readonly defaultValue: T;
  /** Parse all raw values for this key (`[]` when absent). */
  readonly parse: (raw: readonly string[]) => T;
  /** Serialize to raw values, or `null` to omit the key from the URL. */
  readonly serialize: (value: T) => readonly string[] | null;
  /** Equality used for default-elision and change detection. */
  readonly equal: (a: T, b: T) => boolean;
}

/** Any parameter definition, regardless of value type or source. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DgAnyParamDef = DgParamDef<any, DgParamSource>;

/** A map of property name → parameter definition. */
export type DgParamDefs = Record<string, DgAnyParamDef>;

/** Options controlling a single navigation. */
export interface DgNavigateOptions {
  /**
   * Replace the current history entry instead of pushing a new one.
   * Defaults to `true` — filter/paging state rarely deserves a back-button
   * stop. Pass `false` for changes that are genuinely navigational.
   */
  readonly replaceUrl?: boolean;
}

/** A query-parameter signal that can also be written. */
export interface DgWritableParamSignal<T> extends Signal<T> {
  /** Write a new value to the URL. */
  set(value: T, options?: DgNavigateOptions): void;
  /** Derive a new value from the current one and write it to the URL. */
  update(updater: (current: T) => T, options?: DgNavigateOptions): void;
}

/** Extract the value type of a parameter definition. */
export type DgParamValue<D> =
  D extends DgParamDef<infer T, DgParamSource> ? T : never;

/** The writable (query-sourced) subset of a definitions map. */
export type DgWritableValues<D extends DgParamDefs> = {
  [
    K in keyof D as D[K] extends DgParamDef<unknown, 'path'> ? never : K
  ]: DgParamValue<D[K]>;
};

/**
 * The object returned by `injectRouteState`: one signal per parameter, plus
 * batch helpers. Path parameters are read-only `Signal`s; query parameters are
 * writable.
 */
export type DgRouteState<D extends DgParamDefs> = {
  readonly [K in keyof D]: D[K] extends DgParamDef<infer T, 'path'>
    ? Signal<T>
    : DgWritableParamSignal<DgParamValue<D[K]>>;
} & {
  /** Write several query parameters in a single navigation. */
  patch(
    values: Partial<DgWritableValues<D>>,
    options?: DgNavigateOptions,
  ): void;
  /** Reset every managed query parameter back to its default. */
  reset(options?: DgNavigateOptions): void;
};

/** Options for `injectRouteState`. */
export interface DgRouteStateOptions {
  /**
   * Keep parameters in the URL even when they equal their default value.
   * Defaults to `false`, which keeps URLs clean by omitting defaults.
   */
  readonly keepDefaults?: boolean;
  /** Default history behaviour for writes. Defaults to `true` (replace). */
  readonly replaceUrl?: boolean;
}
