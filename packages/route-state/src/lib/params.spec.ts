import { describe, expect, it } from 'vitest';

import {
  arrayParam,
  booleanParam,
  enumParam,
  numberItem,
  numberParam,
  pathParam,
  stringParam,
} from './params';

describe('stringParam', () => {
  const p = stringParam('overview');

  it('parses the first raw value', () => {
    expect(p.parse(['history'])).toBe('history');
    expect(p.parse(['a', 'b'])).toBe('a');
  });

  it('falls back to the default when absent', () => {
    expect(p.parse([])).toBe('overview');
  });

  it('serializes', () => {
    expect(p.serialize('x')).toEqual(['x']);
  });

  it('defaults to an empty string', () => {
    expect(stringParam().parse([])).toBe('');
  });
});

describe('numberParam', () => {
  const p = numberParam(1);

  it('parses numbers', () => {
    expect(p.parse(['3'])).toBe(3);
    expect(p.parse(['-2.5'])).toBe(-2.5);
  });

  it('falls back for invalid, empty and absent values', () => {
    expect(p.parse(['abc'])).toBe(1);
    expect(p.parse([''])).toBe(1);
    expect(p.parse(['   '])).toBe(1);
    expect(p.parse([])).toBe(1);
    expect(p.parse(['Infinity'])).toBe(1);
  });

  it('supports no default (undefined)', () => {
    const optional = numberParam();
    expect(optional.parse([])).toBeUndefined();
    expect(optional.parse(['7'])).toBe(7);
    expect(optional.serialize(undefined)).toBeNull();
  });

  it('serializes', () => {
    expect(p.serialize(5)).toEqual(['5']);
  });
});

describe('booleanParam', () => {
  const p = booleanParam(false);

  it('parses truthy forms', () => {
    expect(p.parse(['true'])).toBe(true);
    expect(p.parse(['TRUE'])).toBe(true);
    expect(p.parse(['1'])).toBe(true);
    expect(p.parse([''])).toBe(true); // bare flag: ?archived
  });

  it('parses falsy forms', () => {
    expect(p.parse(['false'])).toBe(false);
    expect(p.parse(['0'])).toBe(false);
  });

  it('falls back for junk and absence', () => {
    expect(p.parse(['maybe'])).toBe(false);
    expect(p.parse([])).toBe(false);
    expect(booleanParam(true).parse(['maybe'])).toBe(true);
    expect(booleanParam(true).parse([])).toBe(true);
  });

  it('serializes', () => {
    expect(p.serialize(true)).toEqual(['true']);
    expect(p.serialize(false)).toEqual(['false']);
  });
});

describe('enumParam', () => {
  const Sort = { Asc: 'asc', Desc: 'desc' } as const;

  it('accepts an enum-like object', () => {
    const p = enumParam(Sort, 'asc');
    expect(p.parse(['desc'])).toBe('desc');
    expect(p.parse(['sideways'])).toBe('asc');
    expect(p.parse([])).toBe('asc');
  });

  it('accepts a literal array', () => {
    const p = enumParam(['grid', 'list'] as const, 'grid');
    expect(p.parse(['list'])).toBe('list');
    expect(p.parse(['nope'])).toBe('grid');
  });

  it('supports no default', () => {
    const p = enumParam(['a', 'b'] as const);
    expect(p.parse([])).toBeUndefined();
    expect(p.serialize(undefined)).toBeNull();
    expect(p.serialize('a')).toEqual(['a']);
  });
});

describe('arrayParam', () => {
  it('parses repeated values', () => {
    const p = arrayParam<string>();
    expect(p.parse(['a', 'b'])).toEqual(['a', 'b']);
    expect(p.parse([])).toEqual([]);
  });

  it('serializes, omitting empty arrays', () => {
    const p = arrayParam<string>();
    expect(p.serialize(['a', 'b'])).toEqual(['a', 'b']);
    expect(p.serialize([])).toBeNull();
  });

  it('supports a numeric item codec and drops unparsable items', () => {
    const p = arrayParam<number>([], { item: numberItem });
    expect(p.parse(['1', 'x', '3'])).toEqual([1, 3]);
    expect(p.serialize([1, 2])).toEqual(['1', '2']);
  });

  it('compares by content', () => {
    const p = arrayParam<string>();
    expect(p.equal(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(p.equal(['a'], ['b'])).toBe(false);
    expect(p.equal(['a'], ['a', 'b'])).toBe(false);
  });

  it('honours a custom default', () => {
    expect(arrayParam<string>(['x']).parse([])).toEqual(['x']);
  });
});

describe('pathParam', () => {
  it('marks a param as path-sourced without changing parsing', () => {
    const p = pathParam(numberParam());
    expect(p.source).toBe('path');
    expect(p.parse(['42'])).toBe(42);
  });
});

describe('key override', () => {
  it('records a custom URL key', () => {
    expect(numberParam(1, { key: 'p' }).key).toBe('p');
    expect(stringParam('a', { key: 't' }).key).toBe('t');
    expect(booleanParam(false, { key: 'b' }).key).toBe('b');
    expect(arrayParam<string>([], { key: 's' }).key).toBe('s');
    expect(enumParam(['a'] as const, 'a', { key: 'e' }).key).toBe('e');
  });
});
