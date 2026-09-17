import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

const POPOVER_WIDTH = 380;
const POPOVER_GAP = 10;

/**
 * Compute a viewport-safe position for a popover anchored to `rect`.
 * Prefers below-and-aligned-left; falls back to above if there's no room.
 */
function computePopoverPosition(rect, popoverHeight) {
  if (!rect) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;
  const h = popoverHeight || 300; // rough estimate before measurement

  let top = rect.bottom + POPOVER_GAP;
  let placement = 'below';
  if (top + h > vh - margin) {
    const above = rect.top - POPOVER_GAP - h;
    if (above >= margin) {
      top = above;
      placement = 'above';
    } else {
      // Neither above nor below fits — clamp to viewport with scroll
      top = Math.max(margin, vh - h - margin);
    }
  }

  let left = rect.left;
  left = Math.min(Math.max(margin, left), vw - POPOVER_WIDTH - margin);

  return { top, left, placement };
}

/**
 * Base modal / popover shell.
 * - If `anchorRect` is provided, renders as a positioned popover anchored to that rect.
 * - Otherwise renders as a centered modal.
 * Handles backdrop click, escape key, and layout uniformly (DRY).
 */
export default function Modal({ open, onClose, title, subtitle, children, footer, anchorRect }) {
  const contentRef = useRef(null);
  const [pos, setPos] = useState(() => computePopoverPosition(anchorRect));

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Recompute position after content is measured so tall popovers flip correctly.
  useLayoutEffect(() => {
    if (!open || !anchorRect) { setPos(null); return; }
    const h = contentRef.current?.offsetHeight;
    setPos(computePopoverPosition(anchorRect, h));
  }, [open, anchorRect]);

  useEffect(() => {
    if (!open || !anchorRect) return;
    const onResize = () => {
      const h = contentRef.current?.offsetHeight;
      setPos(computePopoverPosition(anchorRect, h));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, anchorRect]);

  if (!open) return null;

  const isPopover = !!anchorRect && !!pos;

  return (
    <div
      className={isPopover ? 'pf-popover-backdrop' : 'pf-modal-backdrop'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={contentRef}
        className={`${isPopover ? 'pf-popover' : 'pf-modal'} glass-strong`}
        style={isPopover ? { top: pos.top, left: pos.left, width: POPOVER_WIDTH } : undefined}
        data-placement={isPopover ? pos.placement : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="pf-modal__header">
          <div>
            <h3 className="pf-modal__title">{title}</h3>
            {subtitle && <p className="pf-modal__subtitle">{subtitle}</p>}
          </div>
          <button className="pf-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="pf-modal__body">{children}</div>
        {footer && <div className="pf-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
