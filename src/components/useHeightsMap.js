import { useCallback, useEffect, useState } from 'react';

/**
 * Small stateful map of per-key values persisted to localStorage.
 *
 * Returns [map, setEntry] where `setEntry(key, next)`:
 *   - stores `next` under `key` when `next` is defined and not `null`
 *   - deletes the entry when `next == null` (i.e. "reset to default")
 *
 * Missing entries mean "use the default" downstream — the map only
 * carries explicit overrides, so it stays small. Originally written for
 * numeric heights; also works fine for small JSON-serialisable objects
 * (e.g. `{cols, rows}` for the container-grid feature).
 */
export function useHeightsMap(storageKey) {
  const [heights, setHeights] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(heights));
  }, [storageKey, heights]);

  const setHeight = useCallback((key, next) => {
    if (!key) return;
    setHeights((prev) => {
      const copy = { ...prev };
      if (next == null) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  }, []);

  return [heights, setHeight];
}
