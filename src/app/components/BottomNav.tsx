import { NavLink, useLocation } from 'react-router';
import { Wind, Archive, MapPin, Share2 } from 'lucide-react';

const TABS = [
  { path: '/', label: 'Capture', icon: Wind, exact: true },
  { path: '/archive', label: 'Archive', icon: Archive, exact: false },
  { path: '/map', label: 'Map', icon: MapPin, exact: false },
  { path: '/share', label: 'Share', icon: Share2, exact: false },
];

export function BottomNav() {
  const location = useLocation();

  const isActive = (path: string, exact: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="relative z-50 shrink-0"
      style={{
        background: 'var(--sp-surface)',
        borderTop: '1px solid var(--sp-border)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {TABS.map(({ path, label, icon: Icon, exact }) => {
          const active = isActive(path, exact);
          return (
            <NavLink
              key={path}
              to={path}
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200"
              style={{
                color: active ? 'var(--sp-accent)' : 'var(--sp-text-faint)',
              }}
            >
              <div
                className="relative flex items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                }}
              >
                {active && (
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'var(--sp-accent-muted)',
                    }}
                  />
                )}
                <Icon
                  size={16}
                  strokeWidth={active ? 2 : 1.5}
                  className="relative z-10"
                />
              </div>
              <span
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.04em',
                  fontWeight: active ? 500 : 400,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
      {/* iOS home indicator */}
      <div className="flex justify-center pb-1">
        <div
          className="rounded-full"
          style={{
            width: 120,
            height: 4,
            background: 'var(--sp-text-faint)',
            opacity: 0.3,
          }}
        />
      </div>
    </nav>
  );
}
