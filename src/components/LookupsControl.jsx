import { Globe } from 'lucide-react';
import './LookupsControl.css';

const ON_TEXT = 'Online lookups are on: the addresses you add are sent to Microlink (page title) and the site domain to Google (icon). Click to turn off.';
const OFF_TEXT = 'Online lookups are off: nothing is sent to Microlink or Google. Titles come from the domain and icons are letter tiles. Click to turn on.';

/**
 * Header switch for the online lookups (page titles from Microlink, icons from
 * Google). A native button with role="switch", so Space and Enter work with no
 * extra code. The visible word stays "Online lookups"; the full explanation is
 * in the tooltip and the accessible label.
 */
export default function LookupsControl({ on, onChange }) {
  return (
    <button
      type="button"
      className="pf-lookups"
      role="switch"
      aria-checked={on}
      aria-label={on ? ON_TEXT : OFF_TEXT}
      title={on ? ON_TEXT : OFF_TEXT}
      onClick={() => onChange(!on)}
      data-on={on}
    >
      <Globe size={14} strokeWidth={2.2} aria-hidden="true" />
      <span className="pf-lookups__label">Online lookups</span>
      <span className="pf-lookups__track" aria-hidden="true">
        <span className="pf-lookups__thumb" />
      </span>
    </button>
  );
}
