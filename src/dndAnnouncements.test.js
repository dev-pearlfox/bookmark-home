import { describe, expect, it } from 'vitest';
import { SCREEN_READER_INSTRUCTIONS, createAnnouncements } from './dndAnnouncements.js';

const titles = { b1: 'GitHub', b2: 'Figma' };
const names = { c1: 'Work', c2: 'Tools' };
const announce = createAnnouncements({
  bookmarkTitle: (id) => titles[id],
  categoryName: (id) => names[id],
});

// `id` mirrors the real sortable ids (bm-<id> / col-cat-<id>)
const bookmark = (bookmarkId) => ({
  id: `bm-${bookmarkId}`,
  data: { current: { type: 'bookmark', bookmarkId } },
});
const category = (categoryId) => ({
  id: `col-cat-${categoryId}`,
  data: { current: { type: 'category', categoryId } },
});

describe('createAnnouncements', () => {
  it('reads real titles and names, never raw ids', () => {
    const out = [
      announce.onDragStart({ active: bookmark('b1') }),
      announce.onDragOver({ active: bookmark('b1'), over: bookmark('b2') }),
      announce.onDragOver({ active: bookmark('b1'), over: category('c2') }),
      announce.onDragEnd({ active: category('c1'), over: category('c2') }),
    ].join(' ');
    expect(out).toContain('GitHub');
    expect(out).toContain('Figma');
    expect(out).toContain('Tools category');
    expect(out).toContain('Work category');
    expect(out).not.toMatch(/\bb1\b|\bc1\b|bm-|col-cat/);
  });

  it('announces pick-up, hover, drop and cancel', () => {
    expect(announce.onDragStart({ active: bookmark('b1') })).toBe('Picked up bookmark GitHub.');
    expect(announce.onDragOver({ active: bookmark('b1'), over: bookmark('b2') }))
      .toBe('bookmark GitHub is over bookmark Figma.');
    expect(announce.onDragEnd({ active: bookmark('b1'), over: category('c2') }))
      .toBe('Dropped bookmark GitHub on Tools category.');
    expect(announce.onDragCancel({ active: bookmark('b1') }))
      .toBe('Cancelled. bookmark GitHub was not moved.');
  });

  it('handles leaving every drop area, and dropping nowhere', () => {
    expect(announce.onDragOver({ active: bookmark('b1'), over: null }))
      .toBe('bookmark GitHub is no longer over a drop area.');
    expect(announce.onDragEnd({ active: bookmark('b1'), over: null }))
      .toBe('Dropped bookmark GitHub. It was not moved.');
  });

  it('stays silent when an item is "over" itself, so the pick-up message survives', () => {
    const self = bookmark('b1');
    expect(announce.onDragOver({ active: self, over: bookmark('b1') })).toBeUndefined();
    expect(announce.onDragEnd({ active: self, over: bookmark('b1') }))
      .toBe('Dropped bookmark GitHub. It was not moved.');
  });

  it('does not crash or print "undefined" for unknown items', () => {
    expect(announce.onDragStart({ active: bookmark('ghost') })).toBe('Picked up bookmark.');
    expect(announce.onDragStart({ active: category('ghost') })).toBe('Picked up category.');
    expect(announce.onDragStart({ active: {} })).toBe('Picked up item.');
    expect(announce.onDragStart({ active: undefined })).toBe('Picked up item.');
  });
});

describe('SCREEN_READER_INSTRUCTIONS', () => {
  it('explains how to start, move, drop and cancel', () => {
    const text = SCREEN_READER_INSTRUCTIONS.draggable.toLowerCase();
    for (const word of ['space', 'enter', 'arrow', 'escape']) expect(text).toContain(word);
  });
});
