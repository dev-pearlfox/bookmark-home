import { useState } from 'react';
import { faviconCandidates, GOOGLE_PLACEHOLDER_WIDTH } from '../metadata.js';

/**
 * A bookmark's site icon. Walks faviconCandidates() until one is a real icon:
 * an image that errors, or that is Google's 16px grey-globe placeholder, moves
 * on to the next candidate. If none is real it shows a crisp letter tile
 * instead of a blurry stretched globe. Mount it with a `key` that changes with
 * the bookmark's url/favicon so the walk restarts for a different bookmark.
 */
export default function Favicon({ bookmark, label, size = 38 }) {
  const candidates = faviconCandidates(bookmark);
  const [index, setIndex] = useState(0);
  const current = candidates[index];

  if (!current) {
    const letter = (label || '').trim().charAt(0).toUpperCase() || '?';
    return <span className="pf-favicon-tile" style={{ width: size, height: size }} aria-hidden="true">{letter}</span>;
  }
  const next = () => setIndex((i) => i + 1);
  return (
    <img
      src={current.src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={next}
      onLoad={(e) => {
        if (current.generated && e.currentTarget.naturalWidth <= GOOGLE_PLACEHOLDER_WIDTH) next();
      }}
    />
  );
}
