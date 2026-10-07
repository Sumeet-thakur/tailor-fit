import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI — defaults to a styled error card */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary — catches unhandled React rendering errors
 * and displays a recovery UI instead of a blank white screen.
 *
 * Wraps the entire <App /> tree in main.tsx.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#0a0a0a',
            color: '#fafafa',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#a1a1aa', marginBottom: '1.5rem', maxWidth: '24rem' }}>
            The app encountered an unexpected error. Please reload to try again.
          </p>
          {this.state.error && (
            <pre
              style={{
                fontSize: '0.75rem',
                color: '#ef4444',
                backgroundColor: '#1c1c1c',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                maxWidth: '90vw',
                overflow: 'auto',
                marginBottom: '1.5rem',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '0.625rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
