import { useState, useEffect, useRef, useCallback, Component } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Locate, Play, ArrowUpRight, Share2, X } from 'lucide-react';
import { mockSnapshots, ScentSnapshot } from '../components/mockData';
import { ScentSphere } from '../components/MistVisualization';
import { useTheme } from '../ThemeContext';

// ── Fixed map markers — hardcoded geographic coordinates, never randomised ─────
// SF and Monterey receive a small visual nudge (~0.4°) so their halos don't
// overlap when the world map is at zoom 2.  The popup card still shows the
// correct location label from the source snapshot.
const MAP_MARKERS: ScentSnapshot[] = (() => {
  const byId = (id: string) => mockSnapshots.find((s) => s.id === id)!;
  return [
    { ...byId('1'), lat: 23.1,   lng: 113.3   },   // Guangdong, China
    { ...byId('2'), lat: 38.15,  lng: -123.05  },   // San Francisco — nudged NW
    { ...byId('3'), lat: 35.95,  lng: -121.35  },   // Monterey — nudged SE
    { ...byId('4'), lat: 48.85,  lng: 2.35     },   // Paris, France
  ];
})();

// ── SFSU scent snapshot — defined locally, not in shared mockData ─────────────
// Offset ~200 m NE from the blue "you are here" dot so the two are visually
// distinct at city zoom (15) yet both resolve to the SF region on the world map.
const SFSU_SCENT: ScentSnapshot = {
  id:        'sfsu',
  title:     'SFSU Campus Morning',
  tags:      ['eucalyptus', 'sea breeze', 'morning dew'],
  notes:     'Cool marine air drifting in from the Pacific. Eucalyptus and damp grass — the campus quiet before the day begins.',
  timestamp: '2026-03-07T08:45:00',
  location:  'San Francisco State University',
  lat:       37.7238,   // ~210 m north  of the blue dot (37.7219)
  lng:       -122.4755, // ~230 m east   of the blue dot (-122.4782)
  intensity: 74,
  radius:    58,
  duration:  10,
  colorSeed: 6,
};

// ── Prototype "you are here" target — SFSU (simulated, not real GPS) ──────────
const SFSU_LATLNG: [number, number] = [37.7219, -122.4782];
const SFSU_ZOOM = 15;

// ── Types ─────────────────────────────────────────────────────────────────────
interface MapController {
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (latlng: [number, number], zoom?: number) => void;
  showUserDot: (latlng: [number, number]) => void;
}

// ── Error Boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean }
class MapErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ── Format date ───────────────────────────────────────────────────────────────
function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ── Leaflet map component ─────────────────────────────────────────────────────
function LeafletMap({
  isDark,
  controllerRef,
  onSelect,
}: {
  isDark: boolean;
  controllerRef: React.MutableRefObject<MapController | null>;
  onSelect: (snap: ScentSnapshot) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);

  const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_matter/{z}/{x}/{y}{r}.png';

  useEffect(() => {
    if (!mapRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    import('leaflet').then((L) => {
      if (!mapRef.current || leafletMapRef.current) return;

      map = L.map(mapRef.current, {
        center: [30, -5],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
        minZoom: 1,
        maxZoom: 18,
      });

      leafletMapRef.current = map;

      L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
        subdomains: 'abcd',
        maxZoom: 18,
      }).addTo(map);

      MAP_MARKERS.forEach((snap) => {
        const html = `<div class="scent-halo-marker">
          <div class="scent-halo-ring-3"></div>
          <div class="scent-halo-ring-2"></div>
          <div class="scent-halo-ring-1"></div>
          <div class="scent-halo-core"></div>
        </div>`;
        const icon = L.divIcon({
          html,
          className: '',
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });
        L.marker([snap.lat, snap.lng], { icon })
          .addTo(map)
          .on('click', () => onSelect(snap));
      });

      // ── SFSU scent marker — rendered alongside global markers ────────────────
      // Placed at SFSU_SCENT coords (offset from blue dot) so both are visually
      // distinct at city zoom while still using identical halo styling.
      const sfsuHaloHtml = `<div class="scent-halo-marker">
        <div class="scent-halo-ring-3"></div>
        <div class="scent-halo-ring-2"></div>
        <div class="scent-halo-ring-1"></div>
        <div class="scent-halo-core"></div>
      </div>`;
      const sfsuHaloIcon = L.divIcon({
        html: sfsuHaloHtml,
        className: '',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });
      L.marker([SFSU_SCENT.lat, SFSU_SCENT.lng], { icon: sfsuHaloIcon })
        .addTo(map)
        .on('click', () => onSelect(SFSU_SCENT));

      controllerRef.current = {
        zoomIn: () => { try { map.zoomIn(1, { animate: true }); } catch (_) {} },
        zoomOut: () => { try { map.zoomOut(1, { animate: true }); } catch (_) {} },
        flyTo: (latlng, zoom) => {
          try {
            map.flyTo(latlng, zoom ?? map.getZoom(), {
              animate: true,
              duration: 0.6,          // ~600 ms — smooth but snappy
              easeLinearity: 0.25,    // ease-in-out feel
            });
          } catch (_) {}
        },
        showUserDot: (latlng) => {
          try {
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng(latlng);
            } else {
              // Accuracy halo + blue dot, centred on latlng
              const dotHtml = `
                <div style="
                  position:relative;
                  width:64px;height:64px;
                  display:flex;align-items:center;justify-content:center;
                ">
                  <!-- accuracy ring -->
                  <div style="
                    position:absolute;
                    width:64px;height:64px;border-radius:50%;
                    background:rgba(43,127,255,0.10);
                    border:1.5px solid rgba(43,127,255,0.22);
                  "></div>
                  <!-- blue dot -->
                  <div style="
                    position:relative;z-index:1;
                    width:10px;height:10px;border-radius:50%;
                    background:#2B7FFF;
                    border:2px solid #fff;
                    box-shadow:0 0 0 3px rgba(43,127,255,0.28),0 2px 8px rgba(43,127,255,0.50);
                  "></div>
                </div>`;
              const dotIcon = L.divIcon({
                html: dotHtml,
                className: '',
                iconSize: [64, 64],
                iconAnchor: [32, 32],
              });
              userMarkerRef.current = L.marker(latlng, { icon: dotIcon, zIndexOffset: 1000 }).addTo(map);
            }
          } catch (_) {}
        },
      };
    }).catch((err) => {
      console.warn('Leaflet failed to load:', err);
    });

    return () => {
      controllerRef.current = null;
      if (userMarkerRef.current) { try { userMarkerRef.current.remove(); } catch (_) {} userMarkerRef.current = null; }
      if (leafletMapRef.current) { try { leafletMapRef.current.remove(); } catch (_) {} leafletMapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Canvas fallback ───────────────────────────────────────────────────────────
function CanvasFallbackMap({
  isDark,
  onSelect,
}: {
  isDark: boolean;
  onSelect: (snap: ScentSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const project = (lat: number, lng: number, w: number, h: number) => ({
    x: ((lng + 180) / 360) * w,
    y: ((90 - lat) / 180) * h,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const bg   = isDark ? '#111214' : '#F0EEE9';
    const grid = isDark ? 'rgba(200,170,130,0.05)' : 'rgba(120,100,80,0.07)';
    const dot  = isDark ? '#C17A3A' : '#A86828';

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = grid; ctx.lineWidth = 0.5;
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = ((90 - lat) / 180) * h;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      for (let lng = -150; lng <= 150; lng += 60) {
        const x = ((lng + 180) / 360) * w;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      MAP_MARKERS.forEach((snap, i) => {
        const { x, y } = project(snap.lat, snap.lng, w, h);
        const pulse = 0.5 + 0.5 * Math.sin(((t % 3500) / 3500 + i * 0.18) * Math.PI * 2);
        const haloR = 18 + pulse * 8;
        const g = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        g.addColorStop(0, `rgba(193,122,58,${0.14 + pulse * 0.08})`);
        g.addColorStop(1, 'rgba(193,122,58,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = dot; ctx.globalAlpha = 0.9 + pulse * 0.1;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [isDark]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    let closest: ScentSnapshot | null = null;
    let closestDist = 30;
    MAP_MARKERS.forEach((snap) => {
      const { x, y } = { x: ((snap.lng + 180) / 360) * w, y: ((90 - snap.lat) / 180) * h };
      const d = Math.hypot(x - mx, y - my);
      if (d < closestDist) { closestDist = d; closest = snap; }
    });
    if (closest) onSelect(closest);
  }, [onSelect]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
      onClick={handleClick}
    />
  );
}

// ── Button style helper ───────────────────────────────────────────────────────
function floatBtn(isDark: boolean): React.CSSProperties {
  return {
    width: 44, height: 44, borderRadius: '50%',
    background: isDark ? '#1C1915' : '#FDFCFA',
    border: `1px solid ${isDark ? 'rgba(210,190,160,0.22)' : 'rgba(80,60,40,0.18)'}`,
    boxShadow: isDark
      ? '0 4px 16px rgba(0,0,0,0.60), 0 1px 4px rgba(0,0,0,0.40)'
      : '0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  };
}

// ── Main MapScreen ────────────────────────────────────────────────────────────
export function MapScreen() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ScentSnapshot | null>(null);
  const controllerRef = useRef<MapController | null>(null);

  const handleSelect = useCallback((snap: ScentSnapshot) => setSelected(snap), []);
  const handleClose = useCallback(() => setSelected(null), []);

  const handleLocate = useCallback(() => {
    // Prototype simulation: always fly to SFSU instead of requesting real GPS
    controllerRef.current?.flyTo(SFSU_LATLNG, SFSU_ZOOM);
    controllerRef.current?.showUserDot(SFSU_LATLNG);
  }, []);

  const mapFallback = <CanvasFallbackMap isDark={isDark} onSelect={handleSelect} />;

  return (
    <div className="flex flex-col h-full relative" style={{ isolation: 'isolate' }}>

      {/* Suppress Leaflet controls we don't need */}
      <style>{`
        .leaflet-control-attribution { display: none !important; }
        .leaflet-bottom, .leaflet-top, .leaflet-left, .leaflet-right { z-index: 1 !important; }
      `}</style>

      {/* Header gradient overlay */}
      <div
        className="absolute top-0 left-0 right-0 z-20 px-5 pt-4 pb-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, var(--sp-bg) 18%, transparent)' }}
      >
        <div className="pointer-events-auto">
          <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 2 }}>
            {MAP_MARKERS.length} locations
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', fontWeight: 300, color: 'var(--sp-text)', letterSpacing: '-0.01em' }}>
            Scent Map
          </h1>
        </div>
      </div>

      {/* Map layer */}
      <div className="flex-1 sp-map" style={{ position: 'relative', overflow: 'hidden', zIndex: 0 }}>
        <MapErrorBoundary fallback={mapFallback}>
          <LeafletMap isDark={isDark} controllerRef={controllerRef} onSelect={handleSelect} />
        </MapErrorBoundary>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--sp-bg) 0%, transparent)', zIndex: 10 }}
      />

      {/* Attribution */}
      <div style={{ position: 'absolute', left: 16, bottom: 8, zIndex: 50, pointerEvents: 'none', opacity: 0.25 }}>
        <span style={{ fontSize: '8px', fontWeight: 300, color: isDark ? '#9A9088' : '#7A706A', letterSpacing: '0.03em', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1 }}>
          © <a href="https://www.openstreetmap.org/copyright" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>OSM</a>
          {' '}© <a href="https://carto.com/" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>CARTO</a>
          {' '}© <a href="https://leafletjs.com" style={{ color: 'inherit', textDecoration: 'none', pointerEvents: 'auto' }}>Leaflet</a>
        </span>
      </div>

      {/* Floating controls */}
      <div
        style={{
          position: 'absolute', right: 16, bottom: 24, zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          pointerEvents: 'auto',
        }}
      >
        <button aria-label="Current location" onClick={handleLocate} style={floatBtn(isDark)}>
          <Locate size={17} strokeWidth={2} style={{ color: isDark ? '#EDE5D8' : '#1E1612' }} />
        </button>
        <button aria-label="Zoom in" onClick={() => controllerRef.current?.zoomIn()} style={floatBtn(isDark)}>
          <span style={{ fontSize: '22px', lineHeight: 1, color: isDark ? '#EDE5D8' : '#1E1612', fontWeight: 300, fontFamily: 'Inter, system-ui, sans-serif', userSelect: 'none', marginTop: '-1px', display: 'block' }}>+</span>
        </button>
        <button aria-label="Zoom out" onClick={() => controllerRef.current?.zoomOut()} style={floatBtn(isDark)}>
          <span style={{ fontSize: '24px', lineHeight: 1, color: isDark ? '#EDE5D8' : '#1E1612', fontWeight: 300, fontFamily: 'Inter, system-ui, sans-serif', userSelect: 'none', marginTop: '-3px', display: 'block' }}>−</span>
        </button>
      </div>

      {/* Bottom sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={handleClose}
              style={{
                position: 'absolute', inset: 0, zIndex: 40,
                background: isDark ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.18)',
                cursor: 'default',
              }}
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36, mass: 0.9 }}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                zIndex: 45,
                background: 'var(--sp-surface)',
                borderTop: `1px solid ${isDark ? 'rgba(210,190,160,0.12)' : 'rgba(80,60,40,0.10)'}`,
                borderRadius: '20px 20px 0 0',
                boxShadow: isDark ? '0 -8px 48px rgba(0,0,0,0.65)' : '0 -6px 32px rgba(0,0,0,0.12)',
                paddingBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 8 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: isDark ? 'rgba(210,190,160,0.22)' : 'rgba(80,60,40,0.18)' }} />
              </div>
              <div style={{ padding: '0 16px 8px' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                    <ScentSphere isDark={isDark} colorSeed={selected.colorSeed} className="absolute inset-0 w-full h-full" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', fontWeight: 400, color: 'var(--sp-text)', letterSpacing: '-0.01em', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selected.title}
                    </h2>
                    <p style={{ color: 'var(--sp-text-faint)', fontSize: '11px', marginBottom: 2 }}>{selected.location}</p>
                    <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px', opacity: 0.7, marginBottom: 8 }}>{formatDate(selected.timestamp)}</p>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {selected.tags.slice(0, 3).map(t => (
                        <span key={t} style={{ padding: '2px 7px', borderRadius: 20, background: 'var(--sp-accent-muted)', color: 'var(--sp-accent)', fontSize: '9px', letterSpacing: '0.04em' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={12} style={{ color: 'var(--sp-text-faint)' }} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
                  <button style={{ flex: 1, height: 38, borderRadius: 10, background: 'var(--sp-accent)', color: isDark ? '#0E0F12' : '#F4F2EF', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', border: 'none' }}>
                    <Play size={11} fill="currentColor" /> Replay
                  </button>
                  <button onClick={() => navigate(`/archive/${selected.id}`)} style={{ flex: 1, height: 38, borderRadius: 10, background: 'var(--sp-surface-2)', border: `1px solid ${isDark ? 'rgba(210,190,160,0.15)' : 'rgba(80,60,40,0.12)'}`, color: 'var(--sp-text-muted)', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
                    Open <ArrowUpRight size={11} />
                  </button>
                  <button aria-label="Share" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'var(--sp-surface-2)', border: `1px solid ${isDark ? 'rgba(210,190,160,0.15)' : 'rgba(80,60,40,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Share2 size={14} style={{ color: 'var(--sp-text-faint)' }} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}