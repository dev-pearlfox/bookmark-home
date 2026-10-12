import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';
import { loadZoom } from './storage.js';
import { applyZoom, clampZoom } from './zoom.js';

// Before the first render, so the page opens at the saved (or default) zoom
// instead of painting at 100% and jumping.
applyZoom(clampZoom(loadZoom()));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
