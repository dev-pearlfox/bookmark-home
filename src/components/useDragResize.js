import { useCallback, useRef, useState } from 'react';

/**
 * Shared vertical drag-to-resize hook. Wire the returned `handlers` onto
 * a small grip button; place `data-resize-target` on the element whose
 * height should change. The hook reads the target's current rendered
 * height at pointerdown, then feeds `onResize(nextHeight)` with a clamped
 * value on every pointermove.
 *
 *   const { isResizing, handlers } = useDragResize({ onResize, min: 120 });
 *
 *   <div className="my-panel" data-resize-target data-resizing={isResizing || undefined}>
 *     ...
 *     <button className="my-grip" {...handlers}
 *       onDoubleClick={() => onResize(null)}>↕</button>
 *   </div>
 *
 * `isResizing` is exposed so callers can flip a `data-resizing` attribute
 * and disable CSS `transition: height` while the user is actively
 * dragging (drag feels laggy if every micro-update animates).
 */
export function useDragResize({
  onResize,
  min = 100,
  max = 2000,
  selector = '[data-resize-target]',
} = {}) {
  const [isResizing, setIsResizing] = useState(false);
  const state = useRef(null);

  const onPointerDown = useCallback((e) => {
    if (!onResize) return;
    const target = e.currentTarget.closest(selector);
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    state.current = {
      startY: e.clientY,
      startHeight: target.getBoundingClientRect().height,
    };
    setIsResizing(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  }, [onResize, selector]);

  const onPointerMove = useCallback((e) => {
    if (!state.current) return;
    const delta = e.clientY - state.current.startY;
    const next = Math.max(min, Math.min(max, state.current.startHeight + delta));
    onResize(next);
  }, [onResize, min, max]);

  const endDrag = useCallback((e) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    state.current = null;
    setIsResizing(false);
  }, []);

  return {
    isResizing,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
