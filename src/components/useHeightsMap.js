import { useCallback, useEffect, useState } from 'react';
import { loadMap, saveMap } from '../storage.js';

/**
 * Small stateful map of per-key values persisted to localStorage.
 *
 * Returns [map, setEntry, replaceAll] where `setEntry(key, next)`:
 *   - stores `next` under `key` when `next` is defined and not `null`
 *   - deletes the entry when `next == null` (i.e. "reset to default")
 * and `replaceAll(nextMap)` swaps the whole map (used by backup restore).
 * It ignores anything that isn't a plain object, so a backup without
 * layout data leaves the current sizes alone.
 *
 * Missing entries mean "use the default" downstream — the map only
 * carries explicit overrides, so it stays small. Originally written for
 * numeric heights; also works fine for small JSON-serialisable objects
 * (e.g. `{rows}` for the container-grid feature).
 */
export function useHeightsMap(storageKey) {
  const [heights, setHeights] = useState(() => loadMap(storageKey));

  useEffect(() => { saveMap(storageKey, heights); }, [storageKey, heights]);

  const setHeight = useCallback((key, next) => {
    if (!key) return;
    setHeights((prev) => {
      const copy = { ...prev };
      if (next == null) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  }, []);

  const replaceAll = useCallback((next) => {
    if (next && typeof next === 'object' && !Array.isArray(next)) setHeights(next);
  }, []);

  return [heights, setHeight, replaceAll];
}
