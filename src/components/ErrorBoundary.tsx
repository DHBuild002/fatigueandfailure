import { Component, type ReactNode } from 'react';

// Shows a recoverable message instead of a blank screen if rendering throws.
// Logged data is in localStorage, so it is unaffected by a render error.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="max-w-md mx-auto px-5 py-10 space-y-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-zinc-600">Your logged sets are saved on this device. Reload to carry on.</p>
        <pre className="text-xs text-zinc-500 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
        <button
          type="button"
          onClick={() => location.reload()}
          className="h-12 w-full rounded-xl bg-emerald-700 text-white font-semibold text-lg"
        >
          Reload
        </button>
      </div>
    );
  }
}
