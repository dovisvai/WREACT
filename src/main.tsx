import React, { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/**
 * Last line of defence.
 *
 * React unmounts the whole tree on an uncaught render error. With no boundary
 * that leaves an empty WebView — no message, no reload button, and no browser
 * chrome to recover with. Worse, when the cause is persisted state, the blank
 * screen returns on every launch and the only way out is clearing app data from
 * Android settings.
 *
 * The reset button clears the stored profile before reloading, because that is
 * the state most likely to be responsible for a repeatable crash.
 */
interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

class AppErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[WREACT] Unrecoverable render error:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: '#0a0f13',
          color: '#f3f6f8',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</div>
        <p style={{ margin: 0, fontSize: 14, color: '#8b9aa7', maxWidth: 320 }}>
          The app hit an error it could not recover from. Reloading usually fixes it.
          Your times are stored on the server and are not lost.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 4,
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: '#00e87a',
            color: '#0a0f13',
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem('world_reaction_user');
            } catch {
              /* storage may be unavailable; reloading is still worth trying */
            }
            window.location.reload();
          }}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: '1px solid #1d2932',
            background: 'transparent',
            color: '#8b9aa7',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Reset local profile and reload
        </button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
