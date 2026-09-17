import { useEffect, useState } from 'react';
import { HardDriveDownload, ShieldCheck, ShieldAlert, FolderOpen } from 'lucide-react';
import {
  isBackupSupported,
  getBackupFileName,
  chooseBackupFile,
  pickAndReadBackupFile,
  clearBackupFile,
} from '../backup.js';
import './BackupControl.css';

/**
 * Header widget that manages the auto-backup file.
 *
 *  - No file yet: shows "Set up auto-backup" — click to pick a save location.
 *  - File active: shows the file name + a shield icon. Menu offers Restore /
 *    Change file / Disconnect.
 *  - API unsupported: renders nothing (Firefox/Safari fall back to
 *    localStorage-only silently).
 */
export default function BackupControl({ getStateSnapshot, onRestore }) {
  const [fileName, setFileName] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isBackupSupported()) return;
    getBackupFileName().then(setFileName);
  }, []);

  if (!isBackupSupported()) return null;

  const setup = async () => {
    setBusy(true);
    try {
      const snap = getStateSnapshot();
      const res = await chooseBackupFile(JSON.stringify(snap, null, 2));
      if (res) setFileName(res.name);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setMenuOpen(false);
    setBusy(true);
    try {
      const res = await pickAndReadBackupFile();
      if (res?.state) {
        onRestore(res.state);
        setFileName(res.name);
      }
    } finally {
      setBusy(false);
    }
  };

  const changeFile = async () => {
    setMenuOpen(false);
    setBusy(true);
    try {
      const snap = getStateSnapshot();
      const res = await chooseBackupFile(JSON.stringify(snap, null, 2));
      if (res) setFileName(res.name);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setMenuOpen(false);
    if (!window.confirm('Stop auto-backing up to this file? Your file on disk stays where it is; we just forget about it.')) return;
    await clearBackupFile();
    setFileName(null);
  };

  if (!fileName) {
    return (
      <button
        className="pf-backup pf-backup--setup"
        onClick={setup}
        disabled={busy}
        title="Auto-back up your bookmarks to a file on your disk"
      >
        <HardDriveDownload size={15} />
        <span>{busy ? 'Setting up…' : 'Set up auto-backup'}</span>
      </button>
    );
  }

  return (
    <div className="pf-backup" data-open={menuOpen ? 'true' : 'false'}>
      <button
        className="pf-backup__badge"
        onClick={() => setMenuOpen((v) => !v)}
        disabled={busy}
        title={`Auto-backing up to ${fileName}`}
      >
        <ShieldCheck size={15} />
        <span className="pf-backup__name">{fileName}</span>
      </button>
      {menuOpen && (
        <div className="pf-backup__menu glass-strong">
          <button className="pf-backup__item" onClick={restore}>
            <FolderOpen size={14} />
            <div>
              <strong>Restore from a backup file</strong>
              <em>Use if you've cleared cache or reinstalled</em>
            </div>
          </button>
          <button className="pf-backup__item" onClick={changeFile}>
            <HardDriveDownload size={14} />
            <div>
              <strong>Change backup file</strong>
              <em>Pick a new save location</em>
            </div>
          </button>
          <button className="pf-backup__item pf-backup__item--danger" onClick={disconnect}>
            <ShieldAlert size={14} />
            <div>
              <strong>Disconnect</strong>
              <em>Stop auto-backup (file stays intact)</em>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
