import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const isVisible = (el) => el.getClientRects().length > 0;

/**
 * Accessible dialog focus handling (WCAG 2.4.3 Focus Order):
 *  1. On open, if nothing inside the dialog took focus (e.g. no autoFocus
 *     field), focus the dialog container itself (needs tabIndex={-1}).
 *  2. Tab / Shift+Tab wrap around inside the dialog instead of escaping to
 *     the page behind it.
 *  3. On close, focus returns to whatever was focused before it opened.
 *
 * For (3) we track the last element focused OUTSIDE any dialog via a global
 * `focusin` listener. (Capturing `document.activeElement` when `open` flips
 * wouldn't work: React's `autoFocus` has already moved focus by then.)
 * Known limit: Safari/Firefox on macOS don't focus a <button> on mouse
 * click, so after a click-opened dialog focus can't be restored there.
 */
export function useFocusTrap(open, containerRef) {
  const lastFocusedOutside = useRef(null);

  useEffect(() => {
    const onFocusIn = (e) => {
      if (!e.target.closest?.('[role="dialog"]')) lastFocusedOutside.current = e.target;
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    if (!container.contains(document.activeElement)) container.focus();

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const items = [...container.querySelectorAll(FOCUSABLE)].filter(isVisible);
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !container.contains(active);

      if (e.shiftKey && (outside || active === first || active === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (outside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const target = lastFocusedOutside.current;
      if (target?.isConnected) target.focus();
    };
  }, [open, containerRef]);
}
