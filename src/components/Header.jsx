import { Sparkles, Rows3, Columns3 } from 'lucide-react';
import BackupControl from './BackupControl.jsx';
import ZoomControl from './ZoomControl.jsx';
import LookupsControl from './LookupsControl.jsx';
import './Header.css';

/**
 * The view switch is LOCKED to Column View (owner decision): it is shown, but
 * disabled, so nobody can flip to Shelf View. It is kept visible (rather than
 * removed) so the header layout does not change and the lock is obvious.
 * Unlocking later means passing `layout` and `onToggleLayout` back in and
 * dropping `disabled`; the Shelf View code in the columns is still there.
 */
const LOCKED_NOTE = 'Column View is fixed';

function ViewSwitch() {
  return (
    <button
      type="button"
      className="pf-view-switch"
      disabled
      role="switch"
      aria-checked="true"
      aria-label={`Column View. ${LOCKED_NOTE}`}
      title={LOCKED_NOTE}
      data-layout="horizontal"
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
  zoom,
  onZoomChange,
  lookups,
  onLookupsChange,
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
        <ZoomControl zoom={zoom} onChange={onZoomChange} />
        <LookupsControl on={lookups} onChange={onLookupsChange} />
        <ViewSwitch />
        <BackupControl
          getStateSnapshot={getStateSnapshot}
          onRestore={onRestore}
        />
      </div>
    </header>
  );
}
