import { Plus, FolderPlus } from 'lucide-react';

/**
 * A placeholder "empty" category column that sits after all the real ones.
 * Clicking it opens the create-category popover anchored to itself.
 */
export default function AddCategoryColumn({ layout = 'vertical', onAddCategory }) {
  return (
    <section className="pf-col pf-col--add" data-layout={layout} aria-label="Add a new category">
      <button
        className="pf-col__add-cta"
        onClick={(e) => onAddCategory(e.currentTarget.getBoundingClientRect())}
        title="Create a new category"
      >
        <span className="pf-col__add-icon">
          <FolderPlus size={26} strokeWidth={2} />
        </span>
        <span className="pf-col__add-title">New category</span>
        <span className="pf-col__add-sub">Group your bookmarks your way</span>
        <span className="pf-col__add-plus"><Plus size={18} strokeWidth={2.4} /></span>
      </button>
    </section>
  );
}
