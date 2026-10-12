/**
 * After a touch drag, the browser still sends a "click" when the finger lifts
 * (press-and-hold on a card, drag, let go in place). On a bookmark that click
 * would open the link right after the user dropped it. This swallows that
 * one click, and gives up after a moment so a real tap later is never eaten.
 *
 * It listens on the window in the capture phase, so it runs before the
 * browser's default action (following the link) and before dnd-kit's own
 * click handling. `target` and `ms` are injectable for tests.
 */
export function swallowNextClick(target = globalThis.window, ms = 400) {
  if (!target?.addEventListener) return () => {};
  let timer;
  // Same options object for add and remove: some runtimes (Node) do not match a
  // bare `true` on removal, which would leave the listener behind.
  const options = { capture: true };
  const stop = () => {
    target.removeEventListener('click', onClick, options);
    clearTimeout(timer);
  };
  function onClick(event) {
    event.preventDefault();
    event.stopPropagation();
    stop();
  }
  target.addEventListener('click', onClick, options);
  timer = setTimeout(stop, ms);
  return stop;
}

/**
 * Call when a drag finishes or is cancelled. `activatorEvent` is the event
 * that started the drag: only a touch drag (touchstart) leaves a stray click,
 * so a mouse or keyboard drag is left alone.
 */
export function swallowClickAfterTouchDrag(activatorEvent, swallow = swallowNextClick) {
  if (activatorEvent?.type === 'touchstart') swallow();
}
