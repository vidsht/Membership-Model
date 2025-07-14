import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }  componentDidCatch(error, errorInfo) {
    // Filter out ResizeObserver errors and browser extension connection errors as they're not critical
    if (error.message && (
      error.message.includes('ResizeObserver') ||
      error.message.includes('loop completed with undelivered notifications') ||
      (error.message.includes('Could not establish connection') && 
       error.message.includes('Receiving end does not exist'))
    )) {
      console.warn('Non-critical error caught and suppressed:', error.message);
      this.setState({ hasError: false, error: null });
      return;
    }
    
    // Log other errors to console for debugging
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body text-center">
                    <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <h3>Something went wrong</h3>
                    <p className="text-muted">
                      We're sorry, but something unexpected happened. Please try refreshing the page.
                    </p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
