/**
 * Auto-backup via the File System Access API.
 *
 * How it works
 *  - User picks a file once (any location — Dropbox, iCloud Drive, USB, wherever).
 *  - The FileSystemFileHandle is persisted in IndexedDB (localStorage can't
 *    hold handles because they're structured-clone objects).
 *  - Every state change writes the JSON to that file (debounced by the caller).
 *  - On next load, we grab the handle from IDB, re-request read/write
 *    permission (browser prompts on first user gesture) and can restore
 *    state from the file — surviving cache clears, browser reinstalls, and
 *    OS reinstalls (as long as the file itself still lives on disk).
 *
 * If the API is missing (Firefox / Safari), everything gracefully no-ops
 * and callers just fall back to plain localStorage.
 */

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
        { description: 'Bookmark Home backup', accept: { 'application/json': ['.json'] } },
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
 * Returns { name, state } if a valid JSON was loaded, else null.
 */
export async function pickAndReadBackupFile() {
  if (!isBackupSupported()) return null;
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [
        { description: 'Bookmark Home backup', accept: { 'application/json': ['.json'] } },
      ],
      multiple: false,
    });
    if (!(await ensurePermission(handle, 'readwrite'))) return null;
    const file = await handle.getFile();
    const text = await file.text();
    const state = safeParse(text);
    if (!state) return null;
    // Keep this file as the ongoing backup destination
    await idbSet(IDB_KEY, handle);
    return { name: handle.name, state };
  } catch (err) {
    if (err?.name !== 'AbortError') console.warn('[backup] pickAndReadBackupFile failed', err);
    return null;
  }
}

/** Try to load the stored backup file's contents on app startup. */
export async function tryLoadBackupOnStartup() {
  const handle = await getBackupHandle();
  if (!handle) return null;
  // Don't prompt for permission on load — we only READ silently if already granted.
  try {
    if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') return null;
    const file = await handle.getFile();
    const text = await file.text();
    const state = safeParse(text);
    return state ? { name: handle.name, state } : null;
  } catch (err) {
    console.warn('[backup] tryLoadBackupOnStartup failed', err);
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

function safeParse(text) {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object') return obj;
  } catch {}
  return null;
}
