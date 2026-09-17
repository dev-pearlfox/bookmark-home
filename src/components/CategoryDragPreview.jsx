import { getIcon } from './iconMap.js';

/**
 * A lightweight "chip" preview shown in DragOverlay while a category
 * is being dragged. Keeps the source column in place (faded), so the
 * cursor follows this compact ghost instead of a giant column.
 */
export default function CategoryDragPreview({ category }) {
  if (!category) return null;
  const Icon = getIcon(category.icon);
  return (
    <div className={`pf-cat-ghost pf-cat--${category.color || 'lilac'} glass-strong`}>
      <span className="pf-cat-ghost__icon"><Icon size={16} strokeWidth={2.2} /></span>
      <span className="pf-cat-ghost__name">{category.name}</span>
    </div>
  );
}
