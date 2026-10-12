import { describe, expect, it } from 'vitest';
import {
  MAX_CONTAINERS_PER_COLUMN,
  addContainer,
  categoryLabel,
  childrenOf,
  deleteColumn,
  deleteContainer,
  ensureContainers,
  topLevel,
} from './containers.js';

const col = (id, extra = {}) => ({ id, name: id.toUpperCase(), icon: 'Briefcase', color: 'sky', ...extra });
const bm = (id, categoryId) => ({ id, url: `https://${id}.com`, title: id, categoryId });
const base = () => ({
  categories: [col('a'), col('b')],
  bookmarks: [bm('b1', 'a'), bm('b2', 'b')],
});

describe('ensureContainers', () => {
  it('seeds one blank container under every column that has none', () => {
    const next = ensureContainers(base());
    expect(topLevel(next.categories).map((c) => c.id)).toEqual(['a', 'b']);
    expect(childrenOf(next.categories, 'a')).toEqual([
      { id: 'grp-a', name: 'New group', icon: 'Bookmark', color: 'sky', parentId: 'a' },
    ]);
    expect(childrenOf(next.categories, 'b')).toHaveLength(1);
  });

  it('is idempotent: a second run returns the very same object', () => {
    const once = ensureContainers(base());
    expect(ensureContainers(once)).toBe(once);
  });

  it('does not touch bookmarks', () => {
    const state = base();
    expect(ensureContainers(state).bookmarks).toBe(state.bookmarks);
  });

  it('never gives a container the Heart icon (owner-protected)', () => {
    const state = { categories: [col('cat-personal', { icon: 'Heart' })], bookmarks: [] };
    expect(childrenOf(ensureContainers(state).categories, 'cat-personal')[0].icon).toBe('Bookmark');
  });

  it('does not recreate containers the user deleted (noContainers flag)', () => {
    const state = { categories: [col('a', { noContainers: true })], bookmarks: [] };
    expect(ensureContainers(state)).toBe(state);
  });

  it('leaves a column alone when it already has a container', () => {
    const state = { categories: [col('a'), col('x', { parentId: 'a' }), col('b', { noContainers: true })], bookmarks: [] };
    expect(ensureContainers(state)).toBe(state);
  });

  it('promotes containers with a missing, self or nested parent to columns', () => {
    const state = {
      categories: [
        col('a', { noContainers: true }),
        col('orphan', { parentId: 'ghost' }),
        col('self', { parentId: 'self' }),
        col('c1', { parentId: 'a' }),
        col('c2', { parentId: 'c1' }),
      ],
      bookmarks: [],
    };
    const next = ensureContainers(state);
    expect(next.categories.find((c) => c.id === 'orphan').parentId).toBeUndefined();
    expect(next.categories.find((c) => c.id === 'self').parentId).toBeUndefined();
    expect(next.categories.find((c) => c.id === 'c2').parentId).toBeUndefined();
    expect(next.categories.find((c) => c.id === 'c1').parentId).toBe('a');
  });
});

describe('addContainer', () => {
  it('adds an empty blank container under the column, in the column colour', () => {
    const next = addContainer(ensureContainers(base()), 'a', 'grp-new');
    expect(childrenOf(next.categories, 'a').map((c) => c.id)).toEqual(['grp-a', 'grp-new']);
    expect(next.categories.find((c) => c.id === 'grp-new')).toMatchObject({ name: 'New group', color: 'sky', parentId: 'a' });
  });

  it('clears the noContainers flag so the column is normal again', () => {
    const state = { categories: [col('a', { noContainers: true })], bookmarks: [] };
    const next = addContainer(state, 'a', 'grp-1');
    expect(next.categories.find((c) => c.id === 'a').noContainers).toBeUndefined();
    expect(ensureContainers(next)).toBe(next);
  });

  it('stops at the per-column cap', () => {
    let state = { categories: [col('a', { noContainers: true })], bookmarks: [] };
    for (let i = 0; i < MAX_CONTAINERS_PER_COLUMN; i += 1) state = addContainer(state, 'a', `g${i}`);
    expect(childrenOf(state.categories, 'a')).toHaveLength(MAX_CONTAINERS_PER_COLUMN);
    expect(addContainer(state, 'a', 'one-too-many')).toBe(state);
  });

  it('refuses unknown parents, container parents and a missing id', () => {
    const state = ensureContainers(base());
    expect(addContainer(state, 'nope', 'x')).toBe(state);
    expect(addContainer(state, 'grp-a', 'x')).toBe(state);
    expect(addContainer(state, 'a', '')).toBe(state);
  });
});

describe('deleteContainer', () => {
  const withBookmarks = () => {
    const s = addContainer(ensureContainers(base()), 'a', 'g2');
    return { ...s, bookmarks: [...s.bookmarks, bm('x1', 'grp-a'), bm('x2', 'grp-a'), bm('y1', 'g2')] };
  };

  it('deletes the container AND its bookmarks, nothing else', () => {
    const next = deleteContainer(withBookmarks(), 'grp-a');
    expect(next.categories.some((c) => c.id === 'grp-a')).toBe(false);
    expect(next.bookmarks.map((b) => b.id)).toEqual(['b1', 'b2', 'y1']);
  });

  it('flags the column when its last container goes, so it stays gone after reload', () => {
    let s = deleteContainer(withBookmarks(), 'grp-a');
    s = deleteContainer(s, 'g2');
    expect(s.categories.find((c) => c.id === 'a').noContainers).toBe(true);
    expect(ensureContainers(s)).toBe(s);
  });

  it('does not flag the column while it still has another container', () => {
    const next = deleteContainer(withBookmarks(), 'grp-a');
    expect(next.categories.find((c) => c.id === 'a').noContainers).toBeUndefined();
  });

  it('refuses to delete columns or unknown ids through this path', () => {
    const s = withBookmarks();
    expect(deleteContainer(s, 'a')).toBe(s);
    expect(deleteContainer(s, 'nope')).toBe(s);
  });
});

describe('deleteColumn', () => {
  const state = () => {
    const s = ensureContainers(base());
    return { ...s, bookmarks: [...s.bookmarks, bm('x1', 'grp-a')] };
  };

  it('moves its own bookmarks to the first remaining column', () => {
    const next = deleteColumn(state(), 'a');
    expect(next.bookmarks.find((b) => b.id === 'b1').categoryId).toBe('b');
  });

  it('promotes its containers to columns and keeps their bookmarks', () => {
    const next = deleteColumn(state(), 'a');
    const promoted = next.categories.find((c) => c.id === 'grp-a');
    expect(promoted.parentId).toBeUndefined();
    expect(next.bookmarks.find((b) => b.id === 'x1').categoryId).toBe('grp-a');
  });

  it('refuses to delete the last column, and ignores containers', () => {
    const only = ensureContainers({ categories: [col('a')], bookmarks: [] });
    expect(deleteColumn(only, 'a')).toBe(only);
    const s = state();
    expect(deleteColumn(s, 'grp-a')).toBe(s);
  });
});

describe('categoryLabel', () => {
  it('prefixes a container with its column name', () => {
    const { categories } = ensureContainers(base());
    expect(categoryLabel(categories, categories.find((c) => c.id === 'grp-a'))).toBe('A / New group');
    expect(categoryLabel(categories, categories[0])).toBe('A');
  });
});
