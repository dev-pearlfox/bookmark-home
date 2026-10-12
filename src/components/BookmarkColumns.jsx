import { Plus } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import CategoryColumn from './CategoryColumn.jsx';
import AddCategoryColumn from './AddCategoryColumn.jsx';
import { childrenOf, topLevel } from '../containers.js';
// Stylesheet load order matters (later rules override earlier ones at equal
// specificity): base -> horizontal-mode overrides.
import './BookmarkColumns.css';
import './BookmarkColumns.horizontal.css';

/**
 * The main Kanban-style landing view: one column per top-level category, each
 * with its containers (child categories) stacked beneath it.
 * Bookmarks arrive pre-grouped via `bookmarksByCategory` (see App.jsx).
 */
export default function BookmarkColumns({
  layout = 'vertical',
  categoryHeights = {},
  onResizeCategoryHeight,
  onAddContainer,
  maxContainers = 19,
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
  const columns = topLevel(categories);

  // Everything a column and a container share; only `category` and
  // `isContainer` differ between them.
  const renderColumn = (cat, isContainer) => (
    <CategoryColumn
      key={`col:${cat.id}`}
      layout={layout}
      isContainer={isContainer}
      category={cat}
      bookmarks={bookmarksByCategory[cat.id] || []}
      height={isColumnView ? categoryHeights[cat.id] : undefined}
      onAddToCategory={onAddToCategory}
      onEditBookmark={onEditBookmark}
      onEditCategory={onEditCategory}
      onResizeHeight={
        isColumnView && onResizeCategoryHeight
          ? (h) => onResizeCategoryHeight(cat.id, h)
          : undefined
      }
    />
  );

  return (
    <div className="pf-cols-wrap" data-layout={layout}>
      <SortableContext
        items={columns.map((c) => `col-cat-${c.id}`)}
        strategy={outerStrategy}
      >
        <div className="pf-cols" role="list" data-layout={layout}>
          {columns.map((cat) => {
            const containers = childrenOf(categories, cat.id);
            const canAdd = isColumnView && containers.length < maxContainers;
            return (
              <div className="pf-cols__slot" role="listitem" key={cat.id}>
                <div
                  className="pf-cols__slot-grid"
                  style={isColumnView ? { '--sub-rows': 1 + containers.length } : undefined}
                >
                  {renderColumn(cat, false)}
                  {/* Containers are never dragged, but they must sit in a
                      SortableContext of their own: dnd-kit expects every
                      sortable id to be listed in the nearest one. */}
                  <SortableContext
                    items={containers.map((c) => `col-cat-${c.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {containers.map((c) => renderColumn(c, true))}
                  </SortableContext>
                </div>
                {isColumnView && onAddContainer && (
                  <button
                    type="button"
                    className="pf-cols__slot-add pf-cols__slot-add--row"
                    onClick={() => onAddContainer(cat.id)}
                    disabled={!canAdd}
                    aria-label={`Add a container below ${cat.name}`}
                    title={canAdd ? 'Add a container below' : `Max ${maxContainers} containers per column`}
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
