import { Plus } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import CategoryColumn from './CategoryColumn.jsx';
import AddCategoryColumn from './AddCategoryColumn.jsx';
// Stylesheet load order matters (later rules override earlier ones at equal
// specificity): base -> SecondaryContainer -> horizontal-mode overrides.
import './BookmarkColumns.css';
import SecondaryContainer from './SecondaryContainer.jsx';
import './BookmarkColumns.horizontal.css';

/**
 * Fills a category slot's mini-grid with primary column + secondary +
 * user-added extras, stacked top-to-bottom in a single sub-column.
 */
function renderSlotChildren({
  cat,
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
  for (let r = 0; r < rows; r += 1) {
    if (r === 0) {
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
    } else if (r === 1) {
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
          key={`extra:${cat.id}:${r}`}
          category={cat}
          onAddToCategory={onAddToCategory}
        />
      );
    }
  }
  return out;
}

/**
 * The main Kanban-style landing view: one column per category.
 * Bookmarks arrive pre-grouped via `bookmarksByCategory` (see App.jsx).
 */
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
            const totalRows = isColumnView ? 2 + (containerGrid[cat.id]?.rows || 0) : 1;
            const canGrowRow = isColumnView && totalRows < maxRowsPerSubcol;
            return (
              <div
                className="pf-cols__slot"
                role="listitem"
                key={cat.id}
              >
                <div
                  className="pf-cols__slot-grid"
                  style={isColumnView ? { '--sub-rows': totalRows } : undefined}
                >
                  {renderSlotChildren({
                    cat,
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
