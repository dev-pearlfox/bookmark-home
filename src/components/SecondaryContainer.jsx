import { Plus, ChevronsUpDown } from 'lucide-react';
import { useDragResize } from './useDragResize.js';
import { getIcon } from './iconMap.js';
import './SecondaryContainer.css';

/**
 * Secondary container stacked beneath each category column in horizontal
 * (column) view. Currently a placeholder drop-zone whose header opens
 * the add-bookmark flow for its parent category. Kept intentionally
 * data-model-free until we know what it should hold.
 *
 * Uses the shared useDragResize hook so it can be stretched vertically
 * just like the primary column.
 *
 * NOTE: its stylesheet must load AFTER BookmarkColumns.css (it overrides
 * `.pf-col__icon` sizing at equal specificity) — BookmarkColumns.jsx
 * controls that import order.
 */
export default function SecondaryContainer({ category, height, onAddToCategory, onResizeHeight }) {
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
