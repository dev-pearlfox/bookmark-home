import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from './Modal.jsx';
import { getIcon } from './iconMap.js';
import { normalizeUrl, fetchTitle, getFaviconUrl } from '../metadata.js';

const emptyForm = { url: '', title: '', categoryId: '' };

/**
 * Add or edit a bookmark.
 *  - Create mode: `initial` is null. Auto-fetches title from URL.
 *  - Edit mode:   `initial` is the existing bookmark. Fields are pre-filled;
 *                 no auto-fetch (user is here to change something specific).
 * When `anchorRect` is provided, renders as a popover next to the trigger.
 */
export default function AddBookmarkModal({
  open,
  onClose,
  onSubmit,
  onDelete,
  categories,
  defaultCategoryId,
  initial,
  anchorRect,
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({
        url: initial.url || '',
        title: initial.title || '',
        categoryId: initial.categoryId || categories[0]?.id || '',
      });
    } else {
      setForm({ ...emptyForm, categoryId: defaultCategoryId || categories[0]?.id || '' });
    }
  }, [open, isEdit, initial, defaultCategoryId, categories]);

  // Debounced auto-fetch — only in CREATE mode. In edit mode we don't want
  // to overwrite the user's carefully curated title on every keystroke.
  useEffect(() => {
    if (isEdit) { setPreviewUrl(''); return; }
    const raw = form.url.trim();
    if (!raw || raw.length < 4) { setPreviewUrl(''); return; }
    const url = normalizeUrl(raw);
    setPreviewUrl(url);

    const handle = setTimeout(async () => {
      if (form.title.trim()) return;
      setLoading(true);
      const title = await fetchTitle(url);
      setLoading(false);
      setForm((f) => (f.title.trim() ? f : { ...f, title }));
    }, 500);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url, isEdit]);

  const canSubmit = form.url.trim() && form.categoryId;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const url = normalizeUrl(form.url);
    onSubmit({
      url,
      title: form.title.trim() || url,
      favicon: getFaviconUrl(url),
      categoryId: form.categoryId,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      anchorRect={anchorRect}
      title={isEdit ? 'Edit bookmark' : 'Save a bookmark'}
      subtitle={
        isEdit
          ? 'Change the URL, title, or category.'
          : "Paste any link — we'll grab the icon and title for you."
      }
      footer={
        <>
          {isEdit && onDelete && (
            <button
              className="pf-btn pf-btn--danger"
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${initial.title}"? This cannot be undone.`)) {
                  onDelete(initial.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="pf-btn pf-btn--ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="pf-btn pf-btn--primary" type="submit" form="pf-bookmark-form" disabled={!canSubmit}>
            {isEdit ? 'Save changes' : 'Save bookmark'}
          </button>
        </>
      }
    >
      <form id="pf-bookmark-form" onSubmit={handleSubmit}>
        <div className="pf-field">
          <label className="pf-field__label" htmlFor="pf-url">URL</label>
          <input
            id="pf-url"
            className="pf-input"
            type="text"
            autoFocus
            placeholder="pearlfox.io"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
        </div>

        <div className="pf-field">
          <label className="pf-field__label" htmlFor="pf-title">
            Title {loading && <span style={{ color: 'var(--ink-300)', textTransform: 'none' }}>· fetching…</span>}
          </label>
          <input
            id="pf-title"
            className="pf-input"
            type="text"
            placeholder={loading ? 'Looking it up…' : 'What is this bookmark?'}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="pf-field">
          <label className="pf-field__label">Category</label>
          <div className="pf-cat-picker">
            {categories.map((cat) => {
              const Icon = getIcon(cat.icon);
              const active = form.categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`pf-cat-chip pf-cat--${cat.color} ${active ? 'is-active' : ''}`}
                  onClick={() => setForm({ ...form, categoryId: cat.id })}
                >
                  <Icon size={14} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {previewUrl && !isEdit && (
          <div className="pf-preview">
            <img src={getFaviconUrl(previewUrl)} alt="" width={20} height={20} />
            <span>{previewUrl}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
