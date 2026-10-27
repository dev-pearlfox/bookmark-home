import { useRef, useState } from 'react';
import { useSortable, SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Pencil, GripVertical, GripHorizontal, ChevronsUpDown, X, SquareX } from 'lucide-react';
import BookmarkCard from './BookmarkCard.jsx';
import { getIcon } from './iconMap.js';
import { useDragResize } from './useDragResize.js';
import { useLinkDrop } from './useLinkDrop.js';
import { openAll, describeOpenResult } from '../openAll.js';

/**
 * A single category rendered as a Kanban-style column.
 * - Sortable: drag the grip on the header to reorder columns
 * - `isContainer`: a box stacked under a column (see containers.js). It is a
 *   bookmark drop target and has everything else, but no grip: it cannot be
 *   dragged and a dragged column ignores it.
 * - Droppable (via useSortable) for bookmarks being dragged in
 * - Header title (icon + name) is directly clickable to edit
 */
export default function CategoryColumn({
  layout = 'vertical',
  isContainer = false,
  category,
  bookmarks,
  height,
  onAddToCategory,
  onEditBookmark,
  onEditCategory,
  onResizeHeight,
  onDropLink,
}) {
  const isVertical = layout === 'vertical';
  // Bookmarks strategy is the *opposite* orientation from the outer
  // categories strategy — bands stack vertically, cards flow horizontally
  // (and vice versa for column layout).
  const innerStrategy = isVertical ? horizontalListSortingStrategy : verticalListSortingStrategy;
  const GripIcon = isVertical ? GripVertical : GripHorizontal;

  /* Resize (horizontal/column view only). See useDragResize for the
     shared drag-to-resize plumbing. */
  const { isResizing, handlers: resizeHandlers } = useDragResize({
    onResize: onResizeHeight,
    min: isContainer ? 140 : 280,
  });

  /* Open every bookmark in this category in a new tab (see openAll.js for
     why this can't be done by clicking the cards' links: browsers allow
     one new tab per click unless pop-ups are allowed, and we need to know
     when that happened so we can tell the user). */
  const [openNotice, setOpenNotice] = useState('');
  const openAllRef = useRef(null);

  const handleOpenAll = () => {
    const result = openAll(bookmarks.map((b) => b.url));
    setOpenNotice(describeOpenResult(result) || '');
  };

  const dismissOpenNotice = () => {
    setOpenNotice('');
    openAllRef.current?.focus(); // the dismiss button is about to disappear
  };

  // A link dragged in from the browser (address bar etc.) adds a bookmark here.
  const { isLinkOver, handlers: linkDropHandlers } = useLinkDrop((link) => onDropLink?.(category.id, link));

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
    data: { type: 'category', categoryId: category.id, scope: 'columns', container: isContainer },
    disabled: isContainer ? { draggable: true } : undefined,
    attributes: { roleDescription: 'draggable category' },
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
    // Individual height override (horizontal/column view only), set by the
    // drag-resize handle. It is a MINIMUM height: the box may be dragged
    // shorter than the default (this overrides the CSS floor), but it still
    // grows past it when its bookmarks need the room, so the "Add a bookmark"
    // slot never ends up hidden.
    ...(!isVertical && typeof height === 'number' && height > 0
      ? { minHeight: `${height}px`, alignSelf: 'flex-start' }
      : {}),
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      data-layout={layout}
      data-resize-target=""
      data-resizing={isResizing || undefined}
      {...linkDropHandlers}
      className={[
        'pf-col',
        isContainer ? 'pf-col--container' : '',
        `pf-col--${category.color || 'lilac'}`,
        isOver || isLinkOver ? 'is-over' : '',
        isDragging ? 'is-dragging' : '',
      ].join(' ')}
    >
      {!isContainer && (
        <button
          className="pf-col__grip"
          aria-label={`Drag ${category.name}`}
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripIcon size={14} />
        </button>
      )}

      {!isVertical && onResizeHeight && (
        <button
          className="pf-col__resize"
          aria-label={`Resize ${category.name} height`}
          title="Drag to resize this column • double-click to reset"
          {...resizeHandlers}
          onDoubleClick={() => onResizeHeight(null)}
        >
          <ChevronsUpDown size={13} strokeWidth={2.4} />
        </button>
      )}

      <header className="pf-col__head">
        <button
          className="pf-col__title"
          onClick={(e) => onEditCategory?.(category.id, e.currentTarget.getBoundingClientRect())}
          aria-label={`Edit ${category.name}`}
          title={`${category.name} • click to rename or change icon`}
        >
          <span className="pf-col__icon"><Icon size={13} strokeWidth={2.2} /></span>
          <span className="pf-col__name">{category.name}</span>
          <span className="pf-col__edit-hint"><Pencil size={11} /></span>
        </button>
        {bookmarks.length > 0 && (
          <button
            type="button"
            ref={openAllRef}
            className="pf-col__open-all"
            onClick={handleOpenAll}
            aria-label={`Open all ${bookmarks.length} bookmarks in ${category.name}`}
            title="Open every bookmark in a new tab"
          >
            <span className="pf-col__open-all-label">Open all</span>
            <span className="pf-col__open-all-count">{bookmarks.length}</span>
          </button>
        )}
      </header>

      {/* Always mounted so screen readers announce changes to it; visually
          hidden because the banner below is the visible copy. */}
      <span className="pf-sr-only" role="status">{openNotice}</span>
      {openNotice && (
        <div className="pf-col__notice">
          {/* A look-alike of the browser's "pop-up blocked" icon (not the real one; it differs per browser). The text says it all, so it is hidden from screen readers. */}
          <SquareX className="pf-col__notice-icon" size={16} strokeWidth={2.2} aria-hidden="true" />
          <p>{openNotice}</p>
          <button
            type="button"
            className="pf-col__notice-close"
            onClick={dismissOpenNotice}
            aria-label="Dismiss message"
          >
            <X size={12} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      )}

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
