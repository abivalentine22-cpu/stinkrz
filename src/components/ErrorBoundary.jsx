import React from "react";

/**
 * App-level error boundary. Catches render errors anywhere in the routed tree
 * and shows a recoverable fallback instead of a blank screen, with a way back /
 * reload. Also logs the error so it can be diagnosed.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught a render error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  handleBack = () => {
    this.setState({ hasError: false });
    // Fall back to the app root if there's no history to go back to
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4 select-none">🤙</div>
            <h1 className="font-heading text-xl font-bold mb-2">Something went wrong</h1>
            <p className="font-body text-sm text-muted-foreground mb-6">
              We hit a snag loading this page. Go back or reload to keep sniffing around.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleBack}
                className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-body font-medium hover:bg-secondary/80 transition-colors"
              >
                Go back
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-body font-medium hover:bg-primary/90 transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}