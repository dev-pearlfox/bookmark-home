import { Sparkles } from 'lucide-react';
import BackupControl from './BackupControl.jsx';
import ZoomControl from './ZoomControl.jsx';
import LookupsControl from './LookupsControl.jsx';
import './Header.css';

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
          <h1>LinkX</h1>
          <p>Your calm, curated corner of the web · <span>{bookmarkCount}</span> saved</p>
        </div>
      </div>

      <div className="pf-header__actions">
        <ZoomControl zoom={zoom} onChange={onZoomChange} />
        <LookupsControl on={lookups} onChange={onLookupsChange} />
        <BackupControl
          getStateSnapshot={getStateSnapshot}
          onRestore={onRestore}
        />
      </div>
    </header>
  );
}
