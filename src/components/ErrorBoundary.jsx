import React from 'react';
import { logger } from '../lib/logger';

/**
 * Top-level error boundary. Catches render/runtime errors thrown by any child
 * so a single broken component shows a branded fallback instead of a white
 * screen. Styling mirrors the App loading screen (bg-dark-gradient + violet).
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Always log — even in production — so crashes are diagnosable.
    logger.error('[ErrorBoundary] Uncaught error:', error, info?.componentStack);
  }

  handleReload = () => {
    // Reset state then hard-reload to recover from a corrupted render tree.
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center p-6 text-slate-100">
        <div className="glass-panel max-w-md w-full rounded-2xl p-8 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-3xl">
            ⚠️
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-slate-400">
              The app hit an unexpected error. Your data is safe — reloading
              usually fixes it.
            </p>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs text-rose-300/80 bg-black/30 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}

          <button
            onClick={this.handleReload}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2.5 text-sm font-semibold text-white"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
