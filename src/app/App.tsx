import { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';
import { ThemeContext } from './ThemeContext';
import { UserSnapshotsProvider } from './UserSnapshotsContext';
import { AppShell } from './components/PhoneFrame';
import { Root } from './Root';
import { CaptureScreen } from './screens/CaptureScreen';
import { ArchiveScreen } from './screens/ArchiveScreen';
import { SnapshotDetailScreen } from './screens/SnapshotDetailScreen';
import { MapScreen } from './screens/MapScreen';
import { ShareScreen } from './screens/ShareScreen';

// ── Top-level error boundary ──────────────────────────────────────────────────
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err?.message ?? 'Unknown error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 32,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: 'var(--sp-text-muted)',
            textAlign: 'center',
            gap: 12,
          }}
        >
          <p style={{ fontSize: '1.4rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: 300 }}>
            Something went wrong
          </p>
          <p style={{ fontSize: '12px', opacity: 0.6 }}>{this.state.error}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: '' })}
            style={{
              marginTop: 8,
              padding: '10px 24px',
              borderRadius: 24,
              background: 'var(--sp-accent)',
              color: '#fff',
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Router (hash-based for iframe-safe navigation) ────────────────────────────
const router = createHashRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: CaptureScreen },
      { path: 'archive', Component: ArchiveScreen },
      { path: 'archive/:id', Component: SnapshotDetailScreen },
      { path: 'map', Component: MapScreen },
      { path: 'share', Component: ShareScreen },
    ],
  },
]);

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const themeValue = useMemo(
    () => ({ isDark, toggleTheme: () => setIsDark(v => !v) }),
    [isDark]
  );

  return (
    <AppErrorBoundary>
      <ThemeContext.Provider value={themeValue}>
        <UserSnapshotsProvider>
          <AppShell isDark={isDark} onToggleTheme={() => setIsDark(v => !v)}>
            <RouterProvider router={router} />
          </AppShell>
        </UserSnapshotsProvider>
      </ThemeContext.Provider>
    </AppErrorBoundary>
  );
}