/**
 * Pure reorder logic for drag-and-drop. No React, no DOM — just
 * `(state, ...) => nextState`, so it can be unit-tested directly.
 *
 * Both functions return the SAME `state` reference when nothing changes,
 * which lets React skip a re-render (and tests assert on it).
 */

import { arrayMove } from '@dnd-kit/sortable';

/**
 * Move / reorder a bookmark based on where it was dropped.
 *  - Dropped on another bookmark (`overData.type === 'bookmark'`): insert at
 *    that bookmark's position. If categories differ, the moved bookmark also
 *    switches to the target's category.
 *  - Dropped on a category (`overData.type === 'category'`, i.e. the empty
 *    area of a column): move to the end of that category's group.
 */
export function dropBookmark(state, activeBookmarkId, overData) {
  if (!overData) return state;

  const bookmarks = [...state.bookmarks];
  const srcIdx = bookmarks.findIndex((b) => b.id === activeBookmarkId);
  if (srcIdx === -1) return state;

  if (overData.type === 'bookmark') {
    const dstIdx = bookmarks.findIndex((b) => b.id === overData.bookmarkId);
    if (dstIdx === -1 || dstIdx === srcIdx) return state;
    const targetCategoryId = bookmarks[dstIdx].categoryId;
    if (bookmarks[srcIdx].categoryId !== targetCategoryId) {
      bookmarks[srcIdx] = { ...bookmarks[srcIdx], categoryId: targetCategoryId };
    }
    return { ...state, bookmarks: arrayMove(bookmarks, srcIdx, dstIdx) };
  }

  if (overData.type === 'category') {
    const targetCategoryId = overData.categoryId;
    if (!targetCategoryId) return state;
    if (bookmarks[srcIdx].categoryId !== targetCategoryId) {
      bookmarks[srcIdx] = { ...bookmarks[srcIdx], categoryId: targetCategoryId };
    }
    let lastIdx = -1;
    for (let i = 0; i < bookmarks.length; i += 1) {
      if (bookmarks[i].categoryId === targetCategoryId) lastIdx = i;
    }
    if (lastIdx === -1 || lastIdx === srcIdx) return { ...state, bookmarks };
    return { ...state, bookmarks: arrayMove(bookmarks, srcIdx, lastIdx) };
  }

  return state;
}

/** Move category `activeId` to the position currently held by `overId`. */
export function reorderCategories(state, activeId, overId) {
  if (!activeId || !overId || activeId === overId) return state;
  const oldIndex = state.categories.findIndex((c) => c.id === activeId);
  const newIndex = state.categories.findIndex((c) => c.id === overId);
  if (oldIndex === -1 || newIndex === -1) return state;
  return { ...state, categories: arrayMove(state.categories, oldIndex, newIndex) };
}
