import { Search, Sparkles, Rows3, Columns3 } from 'lucide-react';
import BackupControl from './BackupControl.jsx';
import './Header.css';

export default function Header({
  query,
  onQueryChange,
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
        <label className="pf-header__search">
          <Search size={18} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search your bookmarks…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search bookmarks"
          />
        </label>
        <button
          className="pf-layout-toggle"
          onClick={onToggleLayout}
          aria-label={layout === 'vertical' ? 'Switch to horizontal (columns) layout' : 'Switch to vertical (shelves) layout'}
          title={layout === 'vertical' ? 'Switch to columns' : 'Switch to shelves'}
        >
          {layout === 'vertical' ? <Columns3 size={16} /> : <Rows3 size={16} />}
        </button>
        <BackupControl
          getStateSnapshot={getStateSnapshot}
          onRestore={onRestore}
        />
      </div>
    </header>
  );
}
