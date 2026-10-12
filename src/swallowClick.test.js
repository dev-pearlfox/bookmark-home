import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { swallowClickAfterTouchDrag, swallowNextClick } from './swallowClick.js';

// A click is cancelable and bubbles, like the real one.
const click = (target) => {
  const event = new Event('click', { cancelable: true, bubbles: true });
  target.dispatchEvent(event);
  return event;
};

describe('swallowNextClick', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('cancels the first click, so the link is not followed', () => {
    const target = new EventTarget();
    swallowNextClick(target, 400);
    expect(click(target).defaultPrevented).toBe(true);
  });
  it('stops the click from travelling on to the page', () => {
    const target = new EventTarget();
    swallowNextClick(target, 400);
    expect(click(target).cancelBubble).toBe(true);
  });
  it('lets the second click through', () => {
    const target = new EventTarget();
    swallowNextClick(target, 400);
    click(target);
    expect(click(target).defaultPrevented).toBe(false);
  });
  it('gives up after the time limit, so a later real tap is not eaten', () => {
    const target = new EventTarget();
    swallowNextClick(target, 400);
    vi.advanceTimersByTime(401);
    expect(click(target).defaultPrevented).toBe(false);
  });
  it('still swallows a click that arrives just inside the time limit', () => {
    const target = new EventTarget();
    swallowNextClick(target, 400);
    vi.advanceTimersByTime(399);
    expect(click(target).defaultPrevented).toBe(true);
  });
  it('the returned function cancels it early', () => {
    const target = new EventTarget();
    const stop = swallowNextClick(target, 400);
    stop();
    expect(click(target).defaultPrevented).toBe(false);
  });
  it('does nothing without a usable target', () => {
    expect(() => swallowNextClick(undefined, 400)()).not.toThrow();
  });
});

describe('swallowClickAfterTouchDrag', () => {
  it('swallows after a touch drag', () => {
    const swallow = vi.fn();
    swallowClickAfterTouchDrag({ type: 'touchstart' }, swallow);
    expect(swallow).toHaveBeenCalledTimes(1);
  });
  it('leaves mouse, keyboard and missing events alone', () => {
    const swallow = vi.fn();
    for (const e of [{ type: 'mousedown' }, { type: 'keydown' }, { type: 'pointerdown' }, undefined, null]) {
      swallowClickAfterTouchDrag(e, swallow);
    }
    expect(swallow).not.toHaveBeenCalled();
  });
});
