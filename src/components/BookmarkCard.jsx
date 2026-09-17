import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, Pencil } from 'lucide-react';
import { getDomain, getFaviconUrl } from '../metadata.js';
import './BookmarkCard.css';

/**
 * A single bookmark tile.
 *
 * Sortable so it can be dragged
 *   - up/down within its own column (reorder)
 *   - across into another column (change category + insert at position)
 *
 * The drag activator is the whole card — press-and-hold anywhere and start
 * dragging. A plain click still opens the link (activation only kicks in
 * after ~4px of pointer movement).
 *
 * Hover reveals an edit action on the right. Bookmarks are intentionally
 * NOT deletable from here — once you save a link, it stays saved. If you
 * really want it gone, edit its URL/category or move it around.
 */
export default function BookmarkCard({ bookmark, onEdit, dragOverlay = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `bm-${bookmark.id}`,
    data: { type: 'bookmark', bookmarkId: bookmark.id, categoryId: bookmark.categoryId },
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
  const favicon = bookmark.favicon || getFaviconUrl(bookmark.url);
  const dragProps = dragOverlay ? {} : { ...attributes, ...listeners };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`pf-card ${dragOverlay ? 'pf-card--overlay' : ''}`}
      {...dragProps}
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
          <div className="pf-card__title" title={bookmark.title}>{bookmark.title}</div>
          <div className="pf-card__domain">
            <span>{domain}</span>
            <ExternalLink size={12} strokeWidth={2} />
          </div>
        </div>
      </a>

      {!dragOverlay && onEdit && (
        <div className="pf-card__actions">
          <button
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
        </div>
      )}
    </article>
  );
}
