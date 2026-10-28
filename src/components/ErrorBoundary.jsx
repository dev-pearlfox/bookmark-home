import { Component } from 'react';
import { clearState } from '../storage.js';
import './ErrorBoundary.css';

/**
 * Last line of defence: if anything in the tree throws while rendering,
 * show a recovery screen instead of a blank white page.
 *
 * (Error boundaries must be class components — React has no hook for this.)
 *
 * `componentDidCatch` is the single hook point where an error-reporting
 * service (Sentry etc.) would plug in later.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReset = () => {
    const ok = window.confirm(
      'Reset saved data? This clears the bookmarks stored in this browser. '
      + 'A linked backup file on your disk is NOT touched, so you can restore from it afterwards.'
    );
    if (!ok) return;
    clearState();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="pf-error" role="alert">
        <div className="pf-error__card glass-strong">
          <h1>Something went wrong</h1>
          <p>
            LinkX hit an unexpected error. Your bookmarks are still saved —
            reloading usually fixes it.
          </p>
          <div className="pf-error__actions">
            <button className="pf-btn pf-btn--primary" type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button className="pf-btn pf-btn--ghost" type="button" onClick={this.handleReset}>
              Reset saved data…
            </button>
          </div>
        </div>
      </main>
    );
  }
}
