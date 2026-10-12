/**
 * Screen-reader text for drag-and-drop (dnd-kit `accessibility` prop).
 *
 * dnd-kit's defaults announce raw ids ("Draggable item bm-lq3k9x was moved
 * over droppable area col-cat-cat-work"), which is gibberish out loud. These
 * read the real bookmark title / category name instead.
 *
 * Pure: takes lookup functions, returns strings — unit-testable without a DOM.
 */

export const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    'To pick up an item, press space or enter. While dragging, use the arrow keys '
    + 'to move it, press space or enter to drop it, or press escape to cancel.',
};

/**
 * @param {{ bookmarkTitle: (id: string) => string|undefined,
 *           categoryName: (id: string) => string|undefined }} lookups
 */
export function createAnnouncements({ bookmarkTitle, categoryName }) {
  const label = (item) => {
    const data = item?.data?.current;
    if (data?.type === 'bookmark') return `bookmark ${bookmarkTitle(data.bookmarkId) || ''}`.trim();
    if (data?.type === 'category') return `${categoryName(data.categoryId) || ''} category`.trim();
    return 'item';
  };

  // Keyboard pick-up fires onDragOver straight away with the item over itself,
  // which would overwrite "Picked up X" before it is spoken. It carries no
  // information, so it is skipped (returning undefined = no announcement).
  const isOverSelf = (active, over) => active?.id !== undefined && active.id === over?.id;

  return {
    onDragStart: ({ active }) => `Picked up ${label(active)}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return `${label(active)} is no longer over a drop area.`;
      if (isOverSelf(active, over)) return undefined;
      return `${label(active)} is over ${label(over)}.`;
    },
    onDragEnd: ({ active, over }) => (over && !isOverSelf(active, over)
      ? `Dropped ${label(active)} on ${label(over)}.`
      : `Dropped ${label(active)}. It was not moved.`),
    onDragCancel: ({ active }) => `Cancelled. ${label(active)} was not moved.`,
  };
}
