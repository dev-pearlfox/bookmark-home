import { useState } from 'react';
import { extractLink, hasLinkPayload, isInternalDrag } from '../linkDrop.js';

/**
 * Makes an element accept a web link dragged in from outside the page (the
 * browser's address bar, bookmarks bar, another tab). Returns `isLinkOver`
 * (for highlighting) and handlers to spread onto the element.
 * `onDropLink` gets `{ url, title? }` for a usable link, or `null` when
 * something droppable-looking was dropped that is not a web link.
 */
export function useLinkDrop(onDropLink) {
  const [isLinkOver, setLinkOver] = useState(false);

  const accepts = (e) => hasLinkPayload(e.dataTransfer) && !isInternalDrag();

  const handlers = {
    onDragEnter: (e) => { if (accepts(e)) setLinkOver(true); },
    onDragOver: (e) => {
      if (!accepts(e)) return;
      e.preventDefault(); // required, or the browser refuses the drop
      e.dataTransfer.dropEffect = 'copy';
      setLinkOver(true);
    },
    onDragLeave: (e) => {
      // Moving onto a child element also fires dragleave on the parent.
      if (!e.currentTarget.contains(e.relatedTarget)) setLinkOver(false);
    },
    onDrop: (e) => {
      setLinkOver(false);
      if (!accepts(e)) return;
      e.preventDefault(); // otherwise the browser navigates this tab to the link
      onDropLink?.(extractLink(e.dataTransfer));
    },
  };
  return { isLinkOver, handlers };
}
