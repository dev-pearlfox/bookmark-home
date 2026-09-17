import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from './Modal.jsx';
import { AVAILABLE_ICONS, AVAILABLE_COLORS } from '../defaultData.js';
import { getIcon } from './iconMap.js';

const emptyForm = { name: '', icon: 'Bookmark', color: 'lilac' };

export default function AddCategoryModal({ open, onClose, onSubmit, onDelete, initial, anchorRect }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) setForm(initial ? { name: initial.name, icon: initial.icon, color: initial.color } : emptyForm);
  }, [open, initial]);

  const canSubmit = form.name.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ ...form, name: form.name.trim() });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      anchorRect={anchorRect}
      title={initial ? 'Edit category' : 'New category'}
      subtitle="Give it a name, pick a color and an icon."
      footer={
        <>
          {initial && onDelete && (
            <button
              className="pf-btn pf-btn--danger"
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${initial.name}"? Its bookmarks will move to another category.`)) {
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
          <button className="pf-btn pf-btn--primary" type="submit" form="pf-add-cat" disabled={!canSubmit}>
            {initial ? 'Save changes' : 'Create category'}
          </button>
        </>
      }
    >
      <form id="pf-add-cat" onSubmit={handleSubmit}>
        <div className="pf-field">
          <label className="pf-field__label" htmlFor="pf-cat-name">Name</label>
          <input
            id="pf-cat-name"
            className="pf-input"
            type="text"
            autoFocus
            placeholder="Reading list"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={40}
          />
        </div>

        <div className="pf-field">
          <label className="pf-field__label">Color</label>
          <div className="pf-swatch-row">
            {AVAILABLE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                className={`pf-swatch pf-swatch--${c} ${form.color === c ? 'is-selected' : ''}`}
                onClick={() => setForm({ ...form, color: c })}
              />
            ))}
          </div>
        </div>

        <div className="pf-field">
          <label className="pf-field__label">Icon</label>
          <div className="pf-picker">
            {AVAILABLE_ICONS.map((iconName) => {
              const Icon = getIcon(iconName);
              return (
                <button
                  key={iconName}
                  type="button"
                  aria-label={iconName}
                  className={`pf-picker__tile ${form.icon === iconName ? 'is-selected' : ''}`}
                  onClick={() => setForm({ ...form, icon: iconName })}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
