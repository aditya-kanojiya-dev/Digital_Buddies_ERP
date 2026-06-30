import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * ErrorBoundary — catches render-time errors anywhere in the tree below it
 * and shows a recoverable screen instead of a blank white page. Wraps the
 * whole app in main.jsx so one broken module (a bad date, a null employee
 * lookup, etc.) doesn't take down every other department's view.
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
    // In production this is where you'd forward to an error-tracking
    // service (Sentry, etc.) instead of just logging.
    console.error('[ErrorBoundary] Uncaught error:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-gradient flex items-center justify-center p-6 text-slate-100">
          <div className="glass-panel max-w-md w-full p-8 rounded-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Something went wrong</h2>
              <p className="text-sm text-slate-400 mt-1.5">
                This part of the app hit an unexpected error. Your data is safe —
                try reloading this section.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-neon-gradient hover:opacity-95 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
