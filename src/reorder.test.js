import { describe, expect, it } from 'vitest';
import { dropBookmark, reorderCategories } from './reorder.js';

const bm = (id, categoryId) => ({ id, url: `https://${id}.com`, categoryId });
const ids = (state) => state.bookmarks.map((b) => b.id);
const catOf = (state, id) => state.bookmarks.find((b) => b.id === id).categoryId;

// Display order is array order: c1 group = a, b ; c2 group = x, y ; c3 is empty
const makeState = () => ({
  categories: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
  bookmarks: [bm('a', 'c1'), bm('b', 'c1'), bm('x', 'c2'), bm('y', 'c2')],
});
const onBookmark = (bookmarkId) => ({ type: 'bookmark', bookmarkId });
const onCategory = (categoryId) => ({ type: 'category', categoryId });

describe('dropBookmark: no-ops return the same state reference', () => {
  it('without drop target data', () => {
    const s = makeState();
    expect(dropBookmark(s, 'a', null)).toBe(s);
    expect(dropBookmark(s, 'a', undefined)).toBe(s);
  });

  it('for an unknown dragged bookmark', () => {
    const s = makeState();
    expect(dropBookmark(s, 'nope', onBookmark('b'))).toBe(s);
  });

  it('when dropped onto itself', () => {
    const s = makeState();
    expect(dropBookmark(s, 'a', onBookmark('a'))).toBe(s);
  });

  it('when the target bookmark does not exist', () => {
    const s = makeState();
    expect(dropBookmark(s, 'a', onBookmark('ghost'))).toBe(s);
  });

  it('for an unknown drop type or a category drop without an id', () => {
    const s = makeState();
    expect(dropBookmark(s, 'a', { type: 'weird' })).toBe(s);
    expect(dropBookmark(s, 'a', onCategory(undefined))).toBe(s);
  });
});

describe('dropBookmark: onto another bookmark', () => {
  it('reorders forward inside the same category', () => {
    const next = dropBookmark(makeState(), 'a', onBookmark('b'));
    expect(ids(next)).toEqual(['b', 'a', 'x', 'y']);
    expect(catOf(next, 'a')).toBe('c1');
  });

  it('reorders backward inside the same category', () => {
    const next = dropBookmark(makeState(), 'b', onBookmark('a'));
    expect(ids(next)).toEqual(['b', 'a', 'x', 'y']);
  });

  it('moves across categories: takes the target category and its position', () => {
    const next = dropBookmark(makeState(), 'a', onBookmark('y'));
    expect(ids(next)).toEqual(['b', 'x', 'y', 'a']);
    expect(catOf(next, 'a')).toBe('c2');
  });

  it('moves a later bookmark in front of an earlier category', () => {
    const next = dropBookmark(makeState(), 'y', onBookmark('a'));
    expect(ids(next)).toEqual(['y', 'a', 'b', 'x']);
    expect(catOf(next, 'y')).toBe('c1');
  });

  it('does not mutate the input state', () => {
    const s = makeState();
    const snapshot = JSON.stringify(s);
    dropBookmark(s, 'a', onBookmark('y'));
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('dropBookmark: onto a category (empty column area)', () => {
  it('appends to the end of another category and switches its category', () => {
    const next = dropBookmark(makeState(), 'a', onCategory('c2'));
    expect(ids(next)).toEqual(['b', 'x', 'y', 'a']);
    expect(catOf(next, 'a')).toBe('c2');
  });

  it('moves a bookmark to the end of its own category', () => {
    const next = dropBookmark(makeState(), 'a', onCategory('c1'));
    expect(ids(next)).toEqual(['b', 'a', 'x', 'y']);
    expect(catOf(next, 'a')).toBe('c1');
  });

  it('can drop into an empty category (only the category changes)', () => {
    const next = dropBookmark(makeState(), 'a', onCategory('c3'));
    expect(catOf(next, 'a')).toBe('c3');
    expect(ids(next)).toEqual(['a', 'b', 'x', 'y']);
  });

  it('keeps position when the bookmark is already last in the target group', () => {
    const next = dropBookmark(makeState(), 'x', onCategory('c1'));
    expect(catOf(next, 'x')).toBe('c1');
    // x was already after every c1 bookmark, so order is unchanged
    expect(ids(next)).toEqual(['a', 'b', 'x', 'y']);
  });
});

describe('reorderCategories', () => {
  const order = (state) => state.categories.map((c) => c.id);

  it('moves a category forward and backward', () => {
    expect(order(reorderCategories(makeState(), 'c1', 'c3'))).toEqual(['c2', 'c3', 'c1']);
    expect(order(reorderCategories(makeState(), 'c3', 'c1'))).toEqual(['c3', 'c1', 'c2']);
  });

  it('is a no-op (same reference) for missing, equal or unknown ids', () => {
    const s = makeState();
    expect(reorderCategories(s, null, 'c1')).toBe(s);
    expect(reorderCategories(s, 'c1', undefined)).toBe(s);
    expect(reorderCategories(s, 'c1', 'c1')).toBe(s);
    expect(reorderCategories(s, 'ghost', 'c1')).toBe(s);
    expect(reorderCategories(s, 'c1', 'ghost')).toBe(s);
  });

  it('leaves bookmarks untouched', () => {
    const s = makeState();
    expect(reorderCategories(s, 'c1', 'c2').bookmarks).toBe(s.bookmarks);
  });
});
