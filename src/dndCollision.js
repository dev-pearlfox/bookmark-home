/**
 * Drop-target rules shared by pointer and keyboard dragging.
 *
 * Bookmarks and category columns are all droppables in ONE DndContext, and a
 * column physically contains its bookmark cards. With dnd-kit's stock
 * `closestCenter` / `sortableKeyboardCoordinates`, dragging a *category*
 * frequently resolves to a bookmark card inside another column, and
 * App.handleDragEnd (which needs category-over-category) then silently does
 * nothing. So while a category is being dragged, only categories are valid
 * targets. Bookmarks keep seeing everything (cards AND columns), which is how
 * they can be dropped into an empty column.
 *
 * Keyboard moves are different from pointer moves: there is no pointer, and
 * each arrow press snaps the dragged card's top-left onto the target's
 * top-left. `closestCenter` then compares centres, and a tall EMPTY column's
 * centre sits far below that corner, so a neighbouring card can win by a hair
 * and the empty column becomes unreachable. Overlap area is the right measure
 * there: the snapped card sits entirely inside the column it was moved to.
 */

import { closestCenter, rectIntersection } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const typeOf = (droppableOrActive) => droppableOrActive?.data?.current?.type;
const isCategory = (item) => typeOf(item) === 'category';

/** Collision detection for pointer AND keyboard drags. */
export function collisionDetection(args) {
  if (isCategory(args.active)) {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(isCategory),
    });
  }
  // No pointer coordinates => keyboard drag (see header comment).
  if (!args.pointerCoordinates) return rectIntersection(args);
  return closestCenter(args);
}

/**
 * Keyboard (arrow key) coordinate getter. Which droppables an arrow press may
 * land on:
 *  - dragging a category: other categories only;
 *  - dragging a bookmark: every card and every column EXCEPT the bookmark's
 *    own column. A column's left/top edge always lies "before" the cards
 *    inside it, so without this, the first ArrowLeft/ArrowUp press would stop
 *    on the card's own column ("over Personal category") and nothing visible
 *    would move.
 */
export function keyboardCoordinates(event, args) {
  const { context } = args;
  const activeData = context.active?.data?.current;
  const isValidStop = isCategory(context.active)
    ? isCategory
    : (item) => !(isCategory(item) && item.data.current.categoryId === activeData?.categoryId);

  const all = context.droppableContainers;
  // sortableKeyboardCoordinates only calls getEnabled() and get(id).
  const visibleStops = {
    getEnabled: () => all.getEnabled().filter(isValidStop),
    get: (id) => all.get(id),
  };
  return sortableKeyboardCoordinates(event, {
    ...args,
    context: { ...context, droppableContainers: visibleStops },
  });
}
