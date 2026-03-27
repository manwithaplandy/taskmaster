"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-20 space-y-4">
          <p className="text-xl font-bold text-text">Something went wrong</p>
          <p className="text-text-muted">An unexpected error occurred.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-6 py-2 bg-primary hover:bg-primary-light text-white font-semibold rounded-xl transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
