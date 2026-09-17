import { Bookmark } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import CategoryColumn from './CategoryColumn.jsx';
import AddCategoryColumn from './AddCategoryColumn.jsx';
import './BookmarkColumns.css';

/**
 * The main Kanban-style landing view: one column per category.
 * All bookmark filtering/search happens upstream in App.jsx and is
 * passed in via `bookmarksByCategory`.
 */
export default function BookmarkColumns({
  layout = 'vertical',
  categories,
  bookmarksByCategory,
  onAddToCategory,
  onEditBookmark,
  onEditCategory,
  onAddCategory,
  query,
  totalMatches,
}) {
  const nothingAnywhere = query && totalMatches === 0;
  const outerStrategy = layout === 'horizontal'
    ? horizontalListSortingStrategy
    : verticalListSortingStrategy;

  return (
    <div className="pf-cols-wrap" data-layout={layout}>
      {nothingAnywhere && (
        <div className="pf-cols-empty glass">
          <div className="pf-cols-empty__icon"><Bookmark size={22} /></div>
          <p>No bookmarks match “{query}”.</p>
        </div>
      )}

      <SortableContext
        items={categories.map((c) => `col-cat-${c.id}`)}
        strategy={outerStrategy}
      >
        <div className="pf-cols" role="list" data-layout={layout}>
          {categories.map((cat) => (
            <div className="pf-cols__slot" role="listitem" key={cat.id} data-cat-slot={cat.id}>
              <CategoryColumn
                layout={layout}
                category={cat}
                bookmarks={bookmarksByCategory[cat.id] || []}
                onAddToCategory={onAddToCategory}
                onEditBookmark={onEditBookmark}
                onEditCategory={onEditCategory}
              />
            </div>
          ))}
          <div className="pf-cols__slot pf-cols__slot--add" role="listitem">
            <AddCategoryColumn layout={layout} onAddCategory={onAddCategory} />
          </div>
        </div>
      </SortableContext>
    </div>
  );
}
