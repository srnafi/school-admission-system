import { Component, type ErrorInfo, type ReactNode } from 'react';
import { labels } from '../strings';

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
        <div className="page">
          <p className="error">{labels.crashed}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {labels.reload}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
