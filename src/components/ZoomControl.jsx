import { Minus, Plus } from 'lucide-react';
import {
  ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, canZoomIn, canZoomOut, clampZoom, stepZoom,
} from '../zoom.js';
import './ZoomControl.css';

/**
 * [ - ]  ----o------  [ + ]  125%
 * Page zoom for this site only. The % is a button: click it to go back to
 * 100%. The slider is a native range input, so arrow keys, Home and End
 * already work with no extra code.
 */
export default function ZoomControl({ zoom, onChange }) {
  return (
    <div className="pf-zoom" role="group" aria-label="Page zoom">
      <button
        type="button"
        className="pf-zoom__btn"
        onClick={() => onChange(stepZoom(zoom, -1))}
        disabled={!canZoomOut(zoom)}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <Minus size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <input
        type="range"
        className="pf-zoom__slider"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        value={zoom}
        onChange={(e) => onChange(clampZoom(e.target.value))}
        aria-label="Zoom"
        aria-valuetext={`${zoom}%`}
      />
      <button
        type="button"
        className="pf-zoom__btn"
        onClick={() => onChange(stepZoom(zoom, 1))}
        disabled={!canZoomIn(zoom)}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <Plus size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="pf-zoom__value"
        onClick={() => onChange(ZOOM_DEFAULT)}
        disabled={zoom === ZOOM_DEFAULT}
        aria-label={`Zoom ${zoom} percent. Reset to ${ZOOM_DEFAULT} percent`}
        title="Reset zoom to 100%"
      >
        {zoom}%
      </button>
    </div>
  );
}
