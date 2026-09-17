import { Plus, ChevronsUpDown } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import CategoryColumn from './CategoryColumn.jsx';
import AddCategoryColumn from './AddCategoryColumn.jsx';
import { useDragResize } from './useDragResize.js';
import { getIcon } from './iconMap.js';
import './BookmarkColumns.css';

/**
 * Secondary container stacked beneath each category column in horizontal
 * (column) view. Currently a placeholder drop-zone whose header opens
 * the add-bookmark flow for its parent category. Kept intentionally
 * data-model-free until we know what it should hold.
 *
 * Uses the shared useDragResize hook so it can be stretched vertically
 * just like the primary column.
 */
function SecondaryContainer({ category, height, onAddToCategory, onResizeHeight }) {
  const { isResizing, handlers: resizeHandlers } = useDragResize({
    onResize: onResizeHeight,
    min: 120,
  });
  // Override CSS min-height inline too, otherwise shrinking below the
  // default (200px) would be clamped back up by the base rule.
  const style = typeof height === 'number' && height > 0
    ? { height: `${height}px`, minHeight: `${height}px` }
    : undefined;

  // Mirror the primary column's identity so every secondary is visually
  // tied to its parent category — same icon in a same-coloured bubble,
  // same name. The `pf-col--{color}` modifier is the shared hook that
  // both primary (.pf-col__icon) and secondary rely on.
  const Icon = getIcon(category.icon);
  const colorClass = `pf-col--${category.color || 'lilac'}`;

  return (
    <div
      className={`pf-col-secondary ${colorClass}`}
      style={style}
      data-resize-target=""
      data-resizing={isResizing || undefined}
    >
      <button
        type="button"
        className="pf-col-secondary__cta"
        onClick={() => onAddToCategory?.(category.id)}
        aria-label={`Add a bookmark to ${category.name}`}
        title={`Add a bookmark to ${category.name}`}
      >
        <span className="pf-col__icon pf-col-secondary__icon" aria-hidden="true">
          <Icon size={13} strokeWidth={2.2} />
        </span>
        <span className="pf-col-secondary__title">{category.name}</span>
        <span className="pf-col-secondary__add" aria-hidden="true">
          <Plus size={12} strokeWidth={2.4} />
        </span>
      </button>

      {onResizeHeight && (
        <button
          type="button"
          className="pf-col__resize"
          aria-label={`Resize the extra container under ${category.name}`}
          title="Drag to resize • double-click to reset"
          {...resizeHandlers}
          onDoubleClick={() => onResizeHeight(null)}
        >
          <ChevronsUpDown size={13} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
}

/**
 * The main Kanban-style landing view: one column per category.
 * All bookmark filtering/search happens upstream in App.jsx and is
 * passed in via `bookmarksByCategory`.
 */
/**
 * Fills a category slot's mini-grid with primary column + secondary +
 * user-added extras. `grid-auto-flow: column` on the outer grid means we
 * emit children in column-major order and the browser lays them out
 * top-to-bottom, then left-to-right. Cleaner than positioning each child
 * with explicit gridRow / gridColumn styles.
 */
function renderSlotChildren({
  cat,
  cols,
  rows,
  layout,
  bookmarksByCategory,
  categoryHeights,
  secondaryHeights,
  onAddToCategory,
  onEditBookmark,
  onEditCategory,
  onResizeCategoryHeight,
  onResizeSecondaryHeight,
}) {
  const out = [];
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      if (c === 0 && r === 0) {
        out.push(
          <CategoryColumn
            key={`col:${cat.id}`}
            layout={layout}
            category={cat}
            bookmarks={bookmarksByCategory[cat.id] || []}
            height={layout === 'horizontal' ? categoryHeights[cat.id] : undefined}
            onAddToCategory={onAddToCategory}
            onEditBookmark={onEditBookmark}
            onEditCategory={onEditCategory}
            onResizeHeight={
              layout === 'horizontal' && onResizeCategoryHeight
                ? (h) => onResizeCategoryHeight(cat.id, h)
                : undefined
            }
          />
        );
      } else if (c === 0 && r === 1) {
        // The one-and-only "primary" secondary — its height is stored
        // under the category id so it survives grid growth.
        out.push(
          <SecondaryContainer
            key={`sec:${cat.id}`}
            category={cat}
            height={secondaryHeights[cat.id]}
            onAddToCategory={onAddToCategory}
            onResizeHeight={
              onResizeSecondaryHeight
                ? (h) => onResizeSecondaryHeight(cat.id, h)
                : undefined
            }
          />
        );
      } else {
        // Extra placeholders — same behavior, no per-cell height store
        // for MVP (all use the CSS default 200px).
        out.push(
          <SecondaryContainer
            key={`extra:${cat.id}:${c}:${r}`}
            category={cat}
            onAddToCategory={onAddToCategory}
          />
        );
      }
    }
  }
  return out;
}

export default function BookmarkColumns({
  layout = 'vertical',
  categoryHeights = {},
  onResizeCategoryHeight,
  secondaryHeights = {},
  onResizeSecondaryHeight,
  containerGrid = {},
  onGrowContainerGrid,
  maxRowsPerSubcol = 20,
  categories,
  bookmarksByCategory,
  onAddToCategory,
  onEditBookmark,
  onEditCategory,
  onAddCategory,
}) {
  const outerStrategy = layout === 'horizontal'
    ? horizontalListSortingStrategy
    : verticalListSortingStrategy;
  const isColumnView = layout === 'horizontal';

  return (
    <div className="pf-cols-wrap" data-layout={layout}>
      <SortableContext
        items={categories.map((c) => `col-cat-${c.id}`)}
        strategy={outerStrategy}
      >
        <div className="pf-cols" role="list" data-layout={layout}>
          {categories.map((cat) => {
            const extras = containerGrid[cat.id] || { cols: 0, rows: 0 };
            const totalRows = isColumnView ? 2 + (extras.rows || 0) : 1;
            const canGrowRow = isColumnView && totalRows < maxRowsPerSubcol;
            return (
              <div
                className="pf-cols__slot"
                role="listitem"
                key={cat.id}
                data-cat-slot={cat.id}
              >
                <div
                  className="pf-cols__slot-grid"
                  style={isColumnView ? { '--sub-cols': 1, '--sub-rows': totalRows } : undefined}
                >
                  {renderSlotChildren({
                    cat,
                    cols: 1,
                    rows: totalRows,
                    layout,
                    bookmarksByCategory,
                    categoryHeights,
                    secondaryHeights,
                    onAddToCategory,
                    onEditBookmark,
                    onEditCategory,
                    onResizeCategoryHeight,
                    onResizeSecondaryHeight,
                  })}
                </div>
                {isColumnView && onGrowContainerGrid && (
                  <button
                    type="button"
                    className="pf-cols__slot-add pf-cols__slot-add--row"
                    onClick={() => onGrowContainerGrid(cat.id)}
                    disabled={!canGrowRow}
                    aria-label={`Add a container below ${cat.name}`}
                    title={canGrowRow ? 'Add a container below' : `Max ${maxRowsPerSubcol} rows per column`}
                  >
                    <Plus size={14} strokeWidth={2.4} />
                    <span>Add below</span>
                  </button>
                )}
              </div>
            );
          })}
          <div className="pf-cols__slot pf-cols__slot--add" role="listitem">
            <AddCategoryColumn layout={layout} onAddCategory={onAddCategory} />
          </div>
        </div>
      </SortableContext>
    </div>
  );
}
