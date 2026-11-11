import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
          <p className="text-slate-700">Something went wrong.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm text-white hover:bg-blue-900"
          >
            Reload the page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
