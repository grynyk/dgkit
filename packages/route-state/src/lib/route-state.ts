import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  inject,
  isDevMode,
  PLATFORM_ID,
  type Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type ParamMap, Router } from '@angular/router';

import type {
  DgAnyParamDef,
  DgNavigateOptions,
  DgParamDefs,
  DgRouteState,
  DgRouteStateOptions,
  DgWritableParamSignal,
} from './route-state.types';

/** Raw values for a key, as a plain array (`[]` when absent). */
function readAll(map: ParamMap, key: string): readonly string[] {
  return map.has(key) ? map.getAll(key) : [];
}

/**
 * Type-safe, bidirectional synchronization between signals and the URL.
 *
 * ```ts
 * const route = injectRouteState({
 *   id: pathParam(numberParam()),
 *   page: numberParam(1),
 *   tab: stringParam('overview'),
 *   archived: booleanParam(false),
 *   statuses: arrayParam<string>(),
 * });
 *
 * route.id();          // read (path param — read-only)
 * route.page();        // read
 * route.page.set(3);   // write
 * route.statuses.update((v) => [...v, 'active']);
 * route.patch({ page: 3, tab: 'history' }); // one navigation
 * ```
 *
 * Reads are driven by the `ActivatedRoute` observables, so browser back/forward
 * and any other navigation flow through automatically. Writes navigate with
 * `queryParamsHandling: 'merge'`; a parameter equal to its default is removed
 * from the URL unless `keepDefaults` is set.
 *
 * Must be called from an injection context.
 */
export function injectRouteState<D extends DgParamDefs>(
  defs: D,
  options: DgRouteStateOptions = {},
): DgRouteState<D> {
  const { keepDefaults = false, replaceUrl: defaultReplaceUrl = true } =
    options;

  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Snapshot-seeded so the first read is correct during SSR and before the
  // first emission.
  const queryMap = toSignal(route.queryParamMap, {
    initialValue: route.snapshot.queryParamMap,
  });
  const pathMap = toSignal(route.paramMap, {
    initialValue: route.snapshot.paramMap,
  });

  const entries = Object.entries(defs);

  /** Serialize one value into the `queryParams` shape Router expects. */
  function toQueryValue(def: DgAnyParamDef, value: unknown): unknown {
    // Default elision keeps URLs clean: `null` removes the key when merging.
    if (!keepDefaults && def.equal(value, def.defaultValue)) {
      return null;
    }
    const raw = def.serialize(value);
    if (raw === null || raw.length === 0) {
      return null;
    }
    return raw.length === 1 ? raw[0] : [...raw];
  }

  function navigate(
    queryParams: Record<string, unknown>,
    navOptions?: DgNavigateOptions,
  ): void {
    if (!isBrowser) {
      // Navigating while server-rendering would fight the incoming request.
      if (isDevMode()) {
        console.warn(
          '[injectRouteState] Ignoring a URL write during server-side ' +
            'rendering. Route state is read-only on the server.',
        );
      }
      return;
    }

    void router.navigate([], {
      relativeTo: route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: navOptions?.replaceUrl ?? defaultReplaceUrl,
    });
  }

  const state: Record<string, unknown> = {};

  for (const [name, def] of entries) {
    const key = def.key ?? name;

    // `DgAnyParamDef.parse` is `any`-typed for variance reasons; narrow it to
    // `unknown` locally so nothing `any` leaks into the returned signals.
    const parse = def.parse as (raw: readonly string[]) => unknown;

    const read: Signal<unknown> =
      def.source === 'path'
        ? computed(() => parse(readAll(pathMap(), key)))
        : computed(() => parse(readAll(queryMap(), key)));

    if (def.source === 'path') {
      state[name] = read;
      continue;
    }

    const writable = read as DgWritableParamSignal<unknown>;
    writable.set = (value: unknown, navOptions?: DgNavigateOptions): void => {
      navigate({ [key]: toQueryValue(def, value) }, navOptions);
    };
    writable.update = (
      updater: (current: unknown) => unknown,
      navOptions?: DgNavigateOptions,
    ): void => {
      writable.set(updater(read()), navOptions);
    };
    state[name] = writable;
  }

  function patch(
    values: Record<string, unknown>,
    navOptions?: DgNavigateOptions,
  ): void {
    const queryParams: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(values)) {
      const def = defs[name];
      if (!def || def.source === 'path') {
        continue;
      }
      queryParams[def.key ?? name] = toQueryValue(def, value);
    }
    navigate(queryParams, navOptions);
  }

  function reset(navOptions?: DgNavigateOptions): void {
    const queryParams: Record<string, unknown> = {};
    for (const [name, def] of entries) {
      if (def.source === 'path') {
        continue;
      }
      queryParams[def.key ?? name] = keepDefaults
        ? toQueryValue(def, def.defaultValue)
        : null;
    }
    navigate(queryParams, navOptions);
  }

  return Object.assign(state, { patch, reset }) as DgRouteState<D>;
}
