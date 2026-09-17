import { Sparkles, Rows3, Columns3 } from 'lucide-react';
import BackupControl from './BackupControl.jsx';
import './Header.css';

/**
 * Segmented switch for the two view modes. Left = shelves, right = columns.
 * The whole thing is one <button>: clicking anywhere toggles. A sliding
 * thumb inside the middle track indicates the active side, and the active
 * label gets emphasized styling via the parent's data-layout attribute.
 */
function ViewSwitch({ layout, onToggleLayout }) {
  const isColumns = layout === 'horizontal';
  return (
    <button
      type="button"
      className="pf-view-switch"
      onClick={onToggleLayout}
      role="switch"
      aria-checked={isColumns}
      aria-label={isColumns ? 'Switch to shelves view' : 'Switch to columns view'}
      title={isColumns ? 'Switch to shelves view' : 'Switch to columns view'}
      data-layout={layout}
    >
      <span className="pf-view-switch__side pf-view-switch__side--left">
        <Rows3 size={14} strokeWidth={2.2} aria-hidden="true" />
        Shelf View
      </span>
      <span className="pf-view-switch__track" aria-hidden="true">
        <span className="pf-view-switch__thumb" />
      </span>
      <span className="pf-view-switch__side pf-view-switch__side--right">
        <Columns3 size={14} strokeWidth={2.2} aria-hidden="true" />
        Column View
      </span>
    </button>
  );
}

export default function Header({
  bookmarkCount,
  getStateSnapshot,
  onRestore,
  layout,
  onToggleLayout,
}) {
  return (
    <header className="pf-header glass-strong">
      <div className="pf-header__brand">
        <div className="pf-header__logo" aria-hidden="true">
          <Sparkles size={20} strokeWidth={2.2} />
        </div>
        <div className="pf-header__titles">
          <h1>Bookmark Home</h1>
          <p>Your calm, curated corner of the web · <span>{bookmarkCount}</span> saved</p>
        </div>
      </div>

      <div className="pf-header__actions">
        <ViewSwitch layout={layout} onToggleLayout={onToggleLayout} />
        <BackupControl
          getStateSnapshot={getStateSnapshot}
          onRestore={onRestore}
        />
      </div>
    </header>
  );
}
