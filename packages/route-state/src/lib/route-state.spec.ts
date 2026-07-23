import { Component, PLATFORM_ID, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  type NavigationExtras,
  provideRouter,
  Router,
  RouterOutlet,
} from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  arrayParam,
  booleanParam,
  enumParam,
  numberItem,
  numberParam,
  pathParam,
  stringParam,
} from './params';
import { injectRouteState } from './route-state';
import type { DgRouteStateOptions } from './route-state.types';

const DEFS = {
  id: pathParam(numberParam()),
  page: numberParam(1),
  tab: stringParam('overview'),
  archived: booleanParam(false),
  sort: enumParam(['asc', 'desc'] as const, 'asc'),
  statuses: arrayParam<string>(),
  ids: arrayParam<number>([], { item: numberItem }),
  size: numberParam(10, { key: 'ps' }),
};

/** Options picked up by the routed component's field initializer. */
let stateOptions: DgRouteStateOptions = {};

@Component({ selector: 'dg-route-target', standalone: true, template: '' })
class TargetComponent {
  readonly state = injectRouteState(DEFS, stateOptions);
}

@Component({
  selector: 'dg-router-host',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class RouterHost {}

/** Let the router finish an in-flight navigation. */
const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

async function setup(
  url = '/items/7',
  options: DgRouteStateOptions = {},
  providers: Provider[] = [],
): Promise<{
  state: TargetComponent['state'];
  router: Router;
  extras: NavigationExtras[];
}> {
  stateOptions = options;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'items/:id', component: TargetComponent }]),
      ...providers,
    ],
  });

  const router = TestBed.inject(Router);
  const harness = TestBed.createComponent(RouterHost);
  harness.detectChanges();
  await router.navigateByUrl(url);
  harness.detectChanges();

  const target = harness.debugElement.query(By.directive(TargetComponent))
    .componentInstance as TargetComponent;

  // Record the extras every write passes to the router, so history semantics
  // can be asserted precisely rather than by poking at `history.length`.
  const extras: NavigationExtras[] = [];
  const original = router.navigate.bind(router);
  router.navigate = ((commands, navExtras?: NavigationExtras) => {
    if (navExtras) {
      extras.push(navExtras);
    }
    return original(commands, navExtras);
  }) as Router['navigate'];

  return { state: target.state, router, extras };
}

beforeEach(() => {
  stateOptions = {};
});

afterEach(() => {
  TestBed.resetTestingModule();
});

describe('injectRouteState — reading', () => {
  it('reads a path parameter', async () => {
    const { state } = await setup('/items/7');
    expect(state.id()).toBe(7);
  });

  it('reads query parameters with defaults applied', async () => {
    const { state } = await setup('/items/7');
    expect(state.page()).toBe(1);
    expect(state.tab()).toBe('overview');
    expect(state.archived()).toBe(false);
    expect(state.sort()).toBe('asc');
    expect(state.statuses()).toEqual([]);
  });

  it('parses query parameters from the URL', async () => {
    const { state } = await setup(
      '/items/7?page=3&tab=history&archived=true&sort=desc',
    );
    expect(state.page()).toBe(3);
    expect(state.tab()).toBe('history');
    expect(state.archived()).toBe(true);
    expect(state.sort()).toBe('desc');
  });

  it('parses repeated array parameters', async () => {
    const { state } = await setup('/items/7?statuses=a&statuses=b');
    expect(state.statuses()).toEqual(['a', 'b']);
  });

  it('parses a numeric array and drops unparsable items', async () => {
    const { state } = await setup('/items/7?ids=1&ids=x&ids=3');
    expect(state.ids()).toEqual([1, 3]);
  });

  it('falls back to defaults for invalid values', async () => {
    const { state } = await setup('/items/7?page=abc&sort=sideways');
    expect(state.page()).toBe(1);
    expect(state.sort()).toBe('asc');
  });

  it('honours a custom URL key', async () => {
    const { state } = await setup('/items/7?ps=50');
    expect(state.size()).toBe(50);
  });
});

describe('injectRouteState — writing', () => {
  it('writes a query parameter to the URL', async () => {
    const { state, router } = await setup('/items/7');
    state.page.set(3);
    await settle();
    expect(router.url).toContain('page=3');
    expect(state.page()).toBe(3);
  });

  it('removes a parameter when it returns to its default', async () => {
    const { state, router } = await setup('/items/7?page=3');
    expect(state.page()).toBe(3);
    state.page.set(1);
    await settle();
    expect(router.url).not.toContain('page=');
    expect(state.page()).toBe(1);
  });

  it('keeps defaults in the URL when keepDefaults is set', async () => {
    const { state, router } = await setup('/items/7?page=3', {
      keepDefaults: true,
    });
    state.page.set(1);
    await settle();
    expect(router.url).toContain('page=1');
  });

  it('supports update()', async () => {
    const { state, router } = await setup('/items/7?statuses=a');
    state.statuses.update((current) => [...current, 'active']);
    await settle();
    expect(router.url).toContain('statuses=a');
    expect(router.url).toContain('statuses=active');
    expect(state.statuses()).toEqual(['a', 'active']);
  });

  it('writes several parameters in one navigation via patch()', async () => {
    const { state, router, extras } = await setup('/items/7');
    state.patch({ page: 3, tab: 'history' });
    await settle();
    expect(extras).toHaveLength(1); // a single navigation, not one per key
    expect(router.url).toContain('page=3');
    expect(router.url).toContain('tab=history');
  });

  it('preserves unrelated query params when writing (merge)', async () => {
    const { state, router } = await setup('/items/7?keepme=1');
    state.page.set(2);
    await settle();
    expect(router.url).toContain('keepme=1');
    expect(router.url).toContain('page=2');
  });

  it('reset() clears every managed query parameter', async () => {
    const { state, router } = await setup(
      '/items/7?page=3&tab=history&statuses=a&keepme=1',
    );
    state.reset();
    await settle();
    expect(router.url).not.toContain('page=');
    expect(router.url).not.toContain('tab=');
    expect(router.url).not.toContain('statuses=');
    expect(router.url).toContain('keepme=1'); // unmanaged keys survive
    expect(state.page()).toBe(1);
    expect(state.tab()).toBe('overview');
  });

  it('reset() writes defaults explicitly when keepDefaults is set', async () => {
    const { state, router } = await setup('/items/7?page=3', {
      keepDefaults: true,
    });
    state.reset();
    await settle();
    expect(router.url).toContain('page=1');
  });

  it('ignores unknown and path keys in patch()', async () => {
    const { state, router } = await setup('/items/7');
    state.patch({ page: 2, nope: 'x', id: 99 } as unknown as Parameters<
      typeof state.patch
    >[0]);
    await settle();
    expect(router.url).toContain('page=2');
    expect(router.url).not.toContain('nope');
    expect(state.id()).toBe(7);
  });

  it('writes an array parameter and omits it when emptied', async () => {
    const { state, router } = await setup('/items/7?statuses=a&statuses=b');
    state.statuses.set([]);
    await settle();
    expect(router.url).not.toContain('statuses=');
    expect(state.statuses()).toEqual([]);
  });
});

describe('injectRouteState — history semantics', () => {
  it('replaces history by default', async () => {
    const { state, extras } = await setup('/items/7');
    state.page.set(2);
    await settle();
    expect(extras[0].replaceUrl).toBe(true);
  });

  it('can push a history entry for a single write', async () => {
    const { state, extras } = await setup('/items/7');
    state.page.set(2, { replaceUrl: false });
    await settle();
    expect(extras[0].replaceUrl).toBe(false);
  });

  it('honours a workspace-level replaceUrl default', async () => {
    const { state, extras } = await setup('/items/7', { replaceUrl: false });
    state.page.set(2);
    await settle();
    expect(extras[0].replaceUrl).toBe(false);
  });

  it('applies the option to patch() and reset() too', async () => {
    const { state, extras } = await setup('/items/7');
    state.patch({ page: 2 }, { replaceUrl: false });
    await settle();
    state.reset({ replaceUrl: false });
    await settle();
    expect(extras[0].replaceUrl).toBe(false);
    expect(extras[1].replaceUrl).toBe(false);
  });

  it('reflects external navigation (back/forward)', async () => {
    const { state, router } = await setup('/items/7?page=1');
    await router.navigateByUrl('/items/7?page=5');
    expect(state.page()).toBe(5);
    await router.navigateByUrl('/items/7?page=1');
    expect(state.page()).toBe(1);
  });

  it('reflects a path parameter change', async () => {
    const { state, router } = await setup('/items/7');
    expect(state.id()).toBe(7);
    await router.navigateByUrl('/items/9');
    expect(state.id()).toBe(9);
  });
});

describe('injectRouteState — SSR', () => {
  const SERVER: Provider[] = [{ provide: PLATFORM_ID, useValue: 'server' }];

  it('reads normally but ignores writes on the server', async () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]): void => {
      warnings.push(args.join(' '));
    };
    try {
      const { state, router } = await setup('/items/7?page=4', {}, SERVER);
      expect(state.page()).toBe(4);
      state.page.set(9);
      await settle();
      expect(router.url).toContain('page=4'); // unchanged
      expect(warnings.some((w) => w.includes('server-side'))).toBe(true);
    } finally {
      console.warn = original;
    }
  });
});
