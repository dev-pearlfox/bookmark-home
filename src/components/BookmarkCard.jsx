import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil } from 'lucide-react';
import { getDomain, getFaviconUrl, bookmarkLabel } from '../metadata.js';
import './BookmarkCard.css';

/**
 * A single bookmark tile.
 *
 * Sortable so it can be dragged
 *   - up/down within its own column (reorder)
 *   - across into another column (change category + insert at position)
 *
 * Pointer/touch: the whole card is draggable — press-and-hold anywhere and
 * start dragging. A plain click still opens the link (activation only kicks
 * in after ~4px of pointer movement).
 *
 * Keyboard/screen reader: the card itself is NOT a control (it wraps a link
 * and a button, and nested interactive elements are an a11y bug). Instead a
 * dedicated drag-handle button carries the dnd-kit ARIA attributes and is
 * registered as the activator node, so Space/Enter on the link or the edit
 * button can never start a drag — only the handle can.
 *
 * Hover (or keyboard focus) reveals the drag handle and edit action on the
 * right. Bookmarks are intentionally
 * NOT deletable from here — once you save a link, it stays saved. If you
 * really want it gone, edit its URL/category or move it around.
 */
export default function BookmarkCard({ bookmark, onEdit, dragOverlay = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `bm-${bookmark.id}`,
    data: { type: 'bookmark', bookmarkId: bookmark.id, categoryId: bookmark.categoryId },
    attributes: { roleDescription: 'draggable bookmark' },
    transition: { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  });

  const style = dragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        willChange: 'transform',
      };

  const domain = getDomain(bookmark.url);
  const label = bookmarkLabel(bookmark);
  const favicon = bookmark.favicon || getFaviconUrl(bookmark.url);
  // Pointer listeners go on the card; ARIA attributes go on the handle only.
  const dragListeners = dragOverlay ? {} : listeners;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`pf-card ${dragOverlay ? 'pf-card--overlay' : ''}`}
      {...dragListeners}
    >
      <a
        className="pf-card__body"
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="pf-card__favicon">
          <img
            src={favicon}
            alt=""
            width={28}
            height={28}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
          />
        </div>
        <div className="pf-card__meta">
          <div className="pf-card__title" title={label}>{label}</div>
          <div className="pf-card__domain">
            <span>{domain}</span>
          </div>
        </div>
      </a>

      {!dragOverlay && (
        <div className="pf-card__actions">
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="pf-card__action pf-card__action--handle"
            aria-label={`Reorder ${bookmark.title}`}
            title="Drag to reorder • or press Space, then use the arrow keys"
            {...attributes}
          >
            <GripVertical size={13} />
          </button>
          {onEdit && (
            <button
              type="button"
              className="pf-card__action pf-card__action--edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(bookmark, e.currentTarget.getBoundingClientRect());
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Edit ${bookmark.title}`}
              title="Edit bookmark"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
