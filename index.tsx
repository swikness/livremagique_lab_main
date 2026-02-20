import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <h1 style={{ color: '#fbbf24', marginBottom: '1rem' }}>Something went wrong</h1>
          <pre style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', overflow: 'auto', maxWidth: '100%', fontSize: '0.875rem' }}>
            {this.state.error.message}
          </pre>
          <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.9rem' }}>
            Check the browser console for details. If you opened a link from the sheet, the session may have expired or the backend may be unreachable.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
