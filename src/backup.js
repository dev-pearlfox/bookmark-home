/**
 * Auto-backup via the File System Access API.
 *
 * How it works
 *  - User picks a file once (any location — Dropbox, iCloud Drive, USB, wherever).
 *  - The FileSystemFileHandle is persisted in IndexedDB (localStorage can't
 *    hold handles because they're structured-clone objects).
 *  - Every state change writes the JSON to that file (debounced by the caller).
 *  - Restoring is MANUAL: after a wipe, the user picks the file again via
 *    `pickAndReadBackupFile`. There is intentionally no silent auto-restore
 *    on startup — the stored handle lives in IndexedDB, which "clear site
 *    data" wipes together with localStorage, so the handle is exactly what
 *    you'd have lost. The file itself survives on disk, and that's what
 *    makes manual restore work (cache clears, reinstalls, new machines).
 *
 * If the API is missing (Firefox / Safari), everything gracefully no-ops
 * and callers just fall back to plain localStorage.
 */

import { isValidState } from './snapshot.js';

const IDB_NAME = 'pf-bookmark-home';
const IDB_STORE = 'handles';
const IDB_KEY = 'backupFile';

/* --- Feature detect -------------------------------------------------- */

export function isBackupSupported() {
  return typeof window !== 'undefined'
    && typeof window.showSaveFilePicker === 'function'
    && typeof window.showOpenFilePicker === 'function'
    && typeof window.indexedDB !== 'undefined';
}

/* --- Tiny IndexedDB wrapper (no deps) -------------------------------- */

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDel(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* --- Permission helpers --------------------------------------------- */

async function ensurePermission(handle, mode = 'readwrite') {
  if (!handle) return false;
  try {
    const opts = { mode };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  } catch {
    return false;
  }
}

/* --- Public API ------------------------------------------------------ */

export async function getBackupHandle() {
  if (!isBackupSupported()) return null;
  try { return (await idbGet(IDB_KEY)) || null; } catch { return null; }
}

export async function getBackupFileName() {
  const handle = await getBackupHandle();
  return handle?.name || null;
}

/**
 * Pop up the save-picker so the user chooses where to keep their backup.
 * Returns { name } on success, or null if the user cancels.
 */
export async function chooseBackupFile(initialContentJson) {
  if (!isBackupSupported()) return null;
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'bookmark-home-backup.json',
      types: [
        { description: 'LinkX backup', accept: { 'application/json': ['.json'] } },
      ],
    });
    if (!(await ensurePermission(handle, 'readwrite'))) return null;
    // Write current state immediately so the file is populated.
    if (typeof initialContentJson === 'string') {
      await writeToHandle(handle, initialContentJson);
    }
    await idbSet(IDB_KEY, handle);
    return { name: handle.name };
  } catch (err) {
    if (err?.name !== 'AbortError') console.warn('[backup] chooseBackupFile failed', err);
    return null;
  }
}

/**
 * Ask the user to point at an existing backup file (for restore-after-wipe).
 * Returns:
 *   { name, state }  valid backup — also adopted as the ongoing backup file
 *   { invalid: true } file isn't a LinkX backup — NOT adopted, so we
 *                     never start overwriting some unrelated JSON file
 *   null              cancelled / unsupported / permission denied
 */
export async function pickAndReadBackupFile() {
  if (!isBackupSupported()) return null;
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [
        { description: 'LinkX backup', accept: { 'application/json': ['.json'] } },
      ],
      multiple: false,
    });
    if (!(await ensurePermission(handle, 'readwrite'))) return null;
    const file = await handle.getFile();
    const text = await file.text();
    const state = safeParse(text);
    if (!state) return { invalid: true };
    // Keep this file as the ongoing backup destination
    await idbSet(IDB_KEY, handle);
    return { name: handle.name, state };
  } catch (err) {
    if (err?.name !== 'AbortError') console.warn('[backup] pickAndReadBackupFile failed', err);
    return null;
  }
}

/** Write JSON to the currently-linked backup file. Silent if no handle. */
export async function writeBackup(jsonString) {
  const handle = await getBackupHandle();
  if (!handle) return false;
  if (!(await ensurePermission(handle, 'readwrite'))) return false;
  return writeToHandle(handle, jsonString);
}

async function writeToHandle(handle, jsonString) {
  try {
    const writable = await handle.createWritable();
    await writable.write(jsonString);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('[backup] write failed', err);
    return false;
  }
}

export async function clearBackupFile() {
  try { await idbDel(IDB_KEY); } catch (err) { console.warn('[backup] clear failed', err); }
}

/* --- Utilities ------------------------------------------------------- */

/** Parse JSON and return it only if it's a structurally valid snapshot. */
function safeParse(text) {
  try {
    const obj = JSON.parse(text);
    if (isValidState(obj)) return obj;
  } catch { /* not JSON */ }
  return null;
}
