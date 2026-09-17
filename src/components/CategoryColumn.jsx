import { useSortable, SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Pencil, GripVertical, GripHorizontal } from 'lucide-react';
import BookmarkCard from './BookmarkCard.jsx';
import { getIcon } from './iconMap.js';

/**
 * A single category rendered as a Kanban-style column.
 * - Sortable: drag the grip on the header to reorder columns
 * - Droppable (via useSortable) for bookmarks being dragged in
 * - Header title (icon + name) is directly clickable to edit
 */
export default function CategoryColumn({
  layout = 'vertical',
  category,
  bookmarks,
  onAddToCategory,
  onEditBookmark,
  onEditCategory,
}) {
  const isVertical = layout === 'vertical';
  // Bookmarks strategy is the *opposite* orientation from the outer
  // categories strategy — bands stack vertically, cards flow horizontally
  // (and vice versa for column layout).
  const innerStrategy = isVertical ? horizontalListSortingStrategy : verticalListSortingStrategy;
  const GripIcon = isVertical ? GripVertical : GripHorizontal;
  const Icon = getIcon(category.icon);
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: `col-cat-${category.id}`,
    data: { type: 'category', categoryId: category.id, scope: 'columns' },
    transition: {
      duration: 320,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 5 : undefined,
    willChange: 'transform',
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      data-layout={layout}
      className={[
        'pf-col',
        `pf-col--${category.color || 'lilac'}`,
        isOver ? 'is-over' : '',
        isDragging ? 'is-dragging' : '',
      ].join(' ')}
    >
      <button
        className="pf-col__grip"
        aria-label={`Drag ${category.name}`}
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripIcon size={14} />
      </button>

      <header className="pf-col__head">
        <button
          className="pf-col__title"
          onClick={(e) => onEditCategory?.(category.id, e.currentTarget.getBoundingClientRect())}
          aria-label={`Edit ${category.name}`}
          title="Click to rename or change icon"
        >
          <span className="pf-col__icon"><Icon size={13} strokeWidth={2.2} /></span>
          <span className="pf-col__name">{category.name}</span>
          <span className="pf-col__edit-hint"><Pencil size={11} /></span>
        </button>
        <span className="pf-col__count">{bookmarks.length}</span>
      </header>

      <div className="pf-col__body">
        <SortableContext
          items={bookmarks.map((b) => `bm-${b.id}`)}
          strategy={innerStrategy}
        >
          {bookmarks.map((bm) => (
            <BookmarkCard
              key={bm.id}
              bookmark={bm}
              onEdit={onEditBookmark}
            />
          ))}
        </SortableContext>

        <button
          className="pf-col__slot"
          onClick={() => onAddToCategory(category.id)}
          aria-label={`Add a bookmark to ${category.name}`}
          title={`Add a bookmark to ${category.name}`}
        >
          <span className="pf-col__slot-icon"><Plus size={18} strokeWidth={2.4} /></span>
          <span className="pf-col__slot-label">
            {bookmarks.length === 0 ? 'Add your first bookmark here' : 'Add a bookmark'}
          </span>
        </button>
      </div>
    </section>
  );
}
