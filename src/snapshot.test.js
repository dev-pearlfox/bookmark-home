import { describe, expect, it } from 'vitest';
import { buildSnapshot, isValidState, serializeSnapshot, splitSnapshot } from './snapshot.js';

const good = () => ({
  categories: [{ id: 'c1', name: 'One' }],
  bookmarks: [{ id: 'b1', url: 'https://a.com', categoryId: 'c1' }],
});

describe('isValidState', () => {
  it('accepts a well-formed state, including zero bookmarks', () => {
    expect(isValidState(good())).toBe(true);
    expect(isValidState({ ...good(), bookmarks: [] })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['an array', []],
    ['an empty object', {}],
    ['no categories', { categories: [], bookmarks: [] }],
    ['missing bookmarks', { categories: [{ id: 'c' }] }],
    ['categories not an array', { categories: 'no', bookmarks: [] }],
    ['category without id', { categories: [{ name: 'x' }], bookmarks: [] }],
    ['null bookmark', { categories: [{ id: 'c' }], bookmarks: [null] }],
    ['bookmark without url', { categories: [{ id: 'c' }], bookmarks: [{ id: 'b' }] }],
    ['bookmark without id', { categories: [{ id: 'c' }], bookmarks: [{ url: 'https://a.com' }] }],
  ])('rejects %s', (_label, value) => {
    expect(isValidState(value)).toBe(false);
  });
});

describe('splitSnapshot', () => {
  it('returns null for unusable input', () => {
    expect(splitSnapshot(null)).toBeNull();
    expect(splitSnapshot({ categories: [], bookmarks: [] })).toBeNull();
  });

  it('keeps only categories + bookmarks in state (drops stray fields)', () => {
    const { state } = splitSnapshot({ ...good(), activeCategoryId: 'all', junk: 1 });
    expect(Object.keys(state).sort()).toEqual(['bookmarks', 'categories']);
  });

  it('gives an empty layout for backups that predate layout data', () => {
    expect(splitSnapshot(good()).layout).toEqual({});
  });

  it('ignores a layout that is not a plain object', () => {
    expect(splitSnapshot({ ...good(), layout: [1, 2] }).layout).toEqual({});
    expect(splitSnapshot({ ...good(), layout: 'x' }).layout).toEqual({});
  });

  it('drops only bookmarks with unsafe URLs and reports the count', () => {
    const raw = {
      categories: [{ id: 'c' }],
      bookmarks: [
        { id: '1', url: 'https://ok.com' },
        { id: '2', url: 'javascript:alert(1)' },
        { id: '3', url: 'data:text/html,<script>' },
        { id: '4', url: 'http://also-ok.com' },
      ],
    };
    const result = splitSnapshot(raw);
    expect(result.dropped).toBe(2);
    expect(result.state.bookmarks.map((b) => b.id)).toEqual(['1', '4']);
  });

  it('reports dropped: 0 for clean data', () => {
    expect(splitSnapshot(good()).dropped).toBe(0);
  });
});

describe('buildSnapshot / serializeSnapshot round trip', () => {
  it('survives JSON serialization with layout intact', () => {
    const layout = {
      colHeights: { c1: 400 },
      secondaryHeights: { c1: 250 },
      containerGrid: { c1: { rows: 2 } },
    };
    const json = serializeSnapshot(buildSnapshot(good(), layout));
    const result = splitSnapshot(JSON.parse(json));
    expect(result.state).toEqual(good());
    expect(result.layout).toEqual(layout);
  });

  it('pretty-prints with 2-space indentation', () => {
    expect(serializeSnapshot({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});
