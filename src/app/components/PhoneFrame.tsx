import { ReactNode } from 'react';

interface PhoneFrameProps {
  children: ReactNode;
  isDark: boolean;
}

export function PhoneFrame({ children, isDark }: PhoneFrameProps) {
  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{
        background: 'var(--sp-bg)',
        color: 'var(--sp-text)',
        // On mobile: fill screen; on desktop: fixed phone dimensions
        width: '100%',
        height: '100%',
        maxWidth: 390,
        maxHeight: 844,
        borderRadius: 'clamp(0px, 4vw, 44px)',
        boxShadow: isDark
          ? '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)'
          : '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
      }}
    >
      {/* Dynamic island */}
      <div className="shrink-0 flex justify-center pt-3 pb-1">
        <div
          className="rounded-full"
          style={{
            width: 120,
            height: 34,
            background: '#000',
            position: 'relative',
          }}
        >
          {/* Camera dot */}
          <div
            style={{
              position: 'absolute',
              right: 18,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#1a1a2e',
              border: '1px solid #333',
            }}
          />
        </div>
      </div>

      {/* Screen content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}

// Desktop wrapper that centers the phone frame
export function AppShell({ children, isDark, onToggleTheme }: { children: ReactNode; isDark: boolean; onToggleTheme: () => void }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        background: isDark
          ? 'radial-gradient(ellipse at 30% 20%, #1a1510 0%, #050508 60%)'
          : 'radial-gradient(ellipse at 30% 20%, #ece8e0 0%, #ddd8d0 60%)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Background texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? `radial-gradient(circle at 70% 80%, rgba(193,122,58,0.06) 0%, transparent 50%),
               radial-gradient(circle at 20% 50%, rgba(193,122,58,0.04) 0%, transparent 40%)`
            : `radial-gradient(circle at 70% 80%, rgba(168,104,40,0.08) 0%, transparent 50%),
               radial-gradient(circle at 20% 50%, rgba(168,104,40,0.05) 0%, transparent 40%)`,
        }}
      />

      {/* Logo + theme toggle — top left */}
      <div className="absolute top-6 left-8 flex items-center gap-4 z-50">
        <div>
          <p
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '1.1rem',
              fontWeight: 300,
              color: isDark ? 'rgba(232,224,213,0.7)' : 'rgba(44,37,32,0.6)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Scent Print
          </p>
          <p style={{ fontSize: '10px', color: isDark ? 'rgba(232,224,213,0.3)' : 'rgba(44,37,32,0.35)', letterSpacing: '0.1em' }}>
            Sensory Interface
          </p>
        </div>
      </div>

      {/* Theme toggle — top right */}
      <button
        onClick={onToggleTheme}
        className="absolute top-6 right-8 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: isDark ? 'rgba(26,27,31,0.8)' : 'rgba(237,234,230,0.8)',
          border: `1px solid ${isDark ? 'rgba(200,170,130,0.15)' : 'rgba(120,100,80,0.15)'}`,
          backdropFilter: 'blur(12px)',
          color: isDark ? 'rgba(232,224,213,0.7)' : 'rgba(44,37,32,0.6)',
          fontSize: '11px',
          letterSpacing: '0.06em',
        }}
      >
        <span>{isDark ? '◐' : '○'}</span>
        <span>{isDark ? 'Dark' : 'Light'}</span>
      </button>

      {/* Phone frame */}
      <div
        className="relative"
        style={{
          /* On desktop: fixed size; on mobile fill viewport */
          width: 'min(390px, 100vw)',
          height: 'min(844px, 100vh)',
        }}
      >
        {children}
      </div>

      {/* Version */}
      <p
        className="absolute bottom-5 left-0 right-0 text-center"
        style={{
          fontSize: '10px',
          color: isDark ? 'rgba(232,224,213,0.2)' : 'rgba(44,37,32,0.25)',
          letterSpacing: '0.1em',
        }}
      >
        v0.9 — spatial sensory OS
      </p>
    </div>
  );
}