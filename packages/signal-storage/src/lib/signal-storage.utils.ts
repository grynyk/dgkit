import type {
  DgStorageKind,
  DgStorageSerializer,
} from './signal-storage.types';

/** Plain `JSON.stringify`/`JSON.parse` — the default serializer. */
export const DEFAULT_SERIALIZER: DgStorageSerializer<unknown> = {
  parse: (raw): unknown => JSON.parse(raw) as unknown,
  stringify: (value) => JSON.stringify(value),
};

/**
 * Resolve the requested `Storage` object.
 *
 * Returns `undefined` rather than throwing when storage is unreachable —
 * Safari's private-browsing mode (older versions) and some locked-down
 * embeds throw merely accessing `window.localStorage`/`sessionStorage`.
 */
export function resolveStorage(kind: DgStorageKind): Storage | undefined {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Normalize a debounce duration in milliseconds.
 *
 * Negative, `NaN` and non-finite values (e.g. `Infinity`) are treated as `0`,
 * which is interpreted as "write synchronously, no debounce".
 */
export function normalizeDebounce(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}
