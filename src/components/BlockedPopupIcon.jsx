/**
 * A look-alike of the browser's "pop-up blocked" icon: a window with a small
 * box inside and a diagonal slash across it. It is drawn here, not copied from
 * any browser (the real one differs between Chrome versions, Safari and Firefox).
 * Decorative: the banner text says everything, so it is hidden from screen readers.
 */
export default function BlockedPopupIcon({ size = 16, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="12" y="11" width="6" height="4" rx="1" />
      <path d="M3 3 L21 21" />
    </svg>
  );
}
