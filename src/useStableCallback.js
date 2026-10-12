import { useCallback, useEffect, useRef } from 'react';

/**
 * A function whose identity never changes but which always runs the latest
 * version passed in. Lets a big, memoised child list (the bookmark cards)
 * receive a handler without re-rendering every time the parent re-renders.
 * Only call the returned function from events (clicks etc.), never during
 * render: the latest version is stored after each commit.
 */
export function useStableCallback(fn) {
  const latest = useRef(fn);
  useEffect(() => { latest.current = fn; });
  return useCallback((...args) => latest.current(...args), []);
}
