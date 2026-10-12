import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearState, loadMap, loadState, saveMap, saveState } from './storage.js';

const KEY = 'pf.bookmarkHome.v1';

/** Minimal in-memory localStorage (the Node test environment has none). */
function makeStorage() {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}

const goodState = () => ({
  categories: [{ id: 'c1', name: 'One' }],
  bookmarks: [{ id: 'b1', url: 'https://a.com', categoryId: 'c1' }],
});

let storage;
beforeEach(() => {
  storage = makeStorage();
  vi.stubGlobal('localStorage', storage);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loadState', () => {
  it('returns null when nothing is stored', () => {
    expect(loadState()).toBeNull();
  });

  it('round-trips with saveState', () => {
    saveState(goodState());
    expect(loadState()).toEqual(goodState());
  });

  it('returns null (not a crash) for corrupt JSON', () => {
    storage.setItem(KEY, '{not json');
    expect(loadState()).toBeNull();
  });

  it.each([
    ['an empty object', '{}'],
    ['a JSON string', '"hello"'],
    ['an array', '[]'],
    ['null', 'null'],
    ['state with no categories', JSON.stringify({ categories: [], bookmarks: [] })],
  ])('returns null for %s so the app falls back to seed data', (_label, raw) => {
    storage.setItem(KEY, raw);
    expect(loadState()).toBeNull();
  });

  it('strips unknown fields (e.g. the removed activeCategoryId)', () => {
    storage.setItem(KEY, JSON.stringify({ ...goodState(), activeCategoryId: 'all' }));
    expect(Object.keys(loadState()).sort()).toEqual(['bookmarks', 'categories']);
  });

  it('drops bookmarks with unsafe URLs but keeps the rest', () => {
    const state = goodState();
    state.bookmarks.push({ id: 'evil', url: 'javascript:alert(1)', categoryId: 'c1' });
    storage.setItem(KEY, JSON.stringify(state));
    expect(loadState().bookmarks.map((b) => b.id)).toEqual(['b1']);
  });

  it('returns null if reading storage throws', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
    expect(loadState()).toBeNull();
  });
});

describe('saveState / clearState', () => {
  it('clearState removes the stored state', () => {
    saveState(goodState());
    clearState();
    expect(loadState()).toBeNull();
  });

  it('never throws when storage is full or blocked', () => {
    const broken = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    vi.stubGlobal('localStorage', broken);
    expect(() => saveState(goodState())).not.toThrow();
    expect(() => clearState()).not.toThrow();
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('loadMap / saveMap', () => {
  it('round-trips a plain object', () => {
    saveMap('k', { c1: 400, c2: { rows: 2 } });
    expect(loadMap('k')).toEqual({ c1: 400, c2: { rows: 2 } });
  });

  it('returns {} when missing', () => {
    expect(loadMap('missing')).toEqual({});
  });

  it.each([
    ['corrupt JSON', '{oops'],
    ['an array', '[1,2]'],
    ['a number', '5'],
    ['null', 'null'],
    ['a string', '"x"'],
  ])('returns {} for %s', (_label, raw) => {
    storage.setItem('k', raw);
    expect(loadMap('k')).toEqual({});
  });

  it('returns {} if reading throws, and saveMap never throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('QuotaExceededError'); },
    });
    expect(loadMap('k')).toEqual({});
    expect(() => saveMap('k', { a: 1 })).not.toThrow();
  });
});
