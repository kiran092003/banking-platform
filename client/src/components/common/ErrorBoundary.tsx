import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last-resort guard for render-time crashes. Shows a neutral message rather
 * than React's blank screen, and never renders the error text — a stack trace
 * is not something to put in front of a banking customer.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Dev-only; a real deployment would forward this to its monitoring sink.
    if (import.meta.env.DEV) {
      console.error('Unhandled rendering error', error, info);
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0f172a]">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">
            The page could not be displayed. Reloading usually resolves it.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-[#1d4ed8] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2563eb]"
          >
            Reload the app
          </button>
        </div>
      </div>
    );
  }
}
