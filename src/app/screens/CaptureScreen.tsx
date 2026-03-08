import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useUserSnapshots } from '../UserSnapshotsContext';

// ── Design tokens — resolved per theme ───────────────────────────────────────
function getTokens(isDark: boolean) {
  return {
    BG:      isDark ? '#0E0F12'                  : '#F4F2EF',
    TEXT:    isDark ? '#E8E0D5'                  : '#2C2520',
    MUTED:   isDark ? '#8C7E70'                  : '#7A6E66',
    FAINT:   isDark ? '#5A5048'                  : '#A89E96',
    ACCENT:  isDark ? '#C17A3A'                  : '#A86828',
    SURFACE: isDark ? '#1A1B1F'                  : '#EDEAE6',
    BORDER:  isDark ? 'rgba(200,170,130,0.10)'   : 'rgba(120,100,80,0.13)',
  };
}

type Phase = 'idle' | 'sampling' | 'captured' | 'saving';

const TAG_POOL = [
  'petrichor', 'floral', 'cedar', 'salt', 'smoke', 'citrus',
  'moss', 'spice', 'earth', 'rain', 'wood', 'resin',
];

// ── CaptureMist ───────────────────────────────────────────────────────────────
// Self-contained canvas organic scent mass. CaptureScreen only.
// No concentric rings. No dark vortex center. No clipping arc.
// Built from 5 overlapping soft blobs composited into one irregular cloud form.
// A single 4-second cosine oscillator breathes the whole mass as one unit.
function CaptureMist({ amplify = 1.0, isDark = false }: { amplify?: number; isDark?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const ampRef    = useRef(amplify);
  const darkRef   = useRef(isDark);

  useEffect(() => { ampRef.current = amplify; }, [amplify]);
  useEffect(() => { darkRef.current = isDark; }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Helper: draw one soft elliptical blob centered at (bx,by),
    // with half-axes rx/ry, peak opacity op, warm color col.
    // Fades from center outward with a very gentle curve — no ring.
    const blob = (
      bx: number, by: number,
      rx: number, ry: number,
      col: string, op: number
    ) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0,    `${col},${op.toFixed(3)})`);
      g.addColorStop(0.38, `${col},${(op * 0.55).toFixed(3)})`);
      g.addColorStop(0.70, `${col},${(op * 0.18).toFixed(3)})`);
      g.addColorStop(0.90, `${col},${(op * 0.04).toFixed(3)})`);
      g.addColorStop(1,    `${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    };

    const draw = (t: number) => {
      const W  = canvas.offsetWidth;
      const H  = canvas.offsetHeight;
      const A  = ampRef.current;
      const dk = darkRef.current;
      const d  = Math.min(W, H);

      ctx.clearRect(0, 0, W, H);
      // Fill with theme-correct background
      ctx.fillStyle = dk ? '#0E0F12' : '#F4F2EF';
      ctx.fillRect(0, 0, W, H);

      // ── Single breathing oscillator ──────────────────────────────────────
      // Cosine gives a natural ease-in-out: lingers at rest, glides through mid.
      const breathe = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 4000);

      // Very slow shape drift — breaks perfect symmetry over time
      const d1 = Math.sin(t * Math.PI * 2 / 9200);
      const d2 = Math.cos(t * Math.PI * 2 / 11700);
      const d3 = Math.sin(t * Math.PI * 2 / 7400 + 1.1);

      // ── Global scale — whole mass breathes as one unit ───────────────
      const ampScale = Math.min(1 + (A - 1) * 0.24, 1.38);
      // Breathing amplitude ramps up during sampling — clearly visible pulse
      const breatheAmp   = Math.min(0.08 + (A - 1) * 0.055, 0.18);
      const breatheScale = (1 - breatheAmp * 0.5) + breathe * breatheAmp;
      const S = d * 0.22 * breatheScale * ampScale;

      // Visual centre — slightly above midpoint
      const cx = W * 0.50;
      const cy = H * 0.455;

      // Opacity multiplier: blobs appear slightly more luminous on dark bg
      const om = dk ? 1.35 : 1.0;

      // ── LAYER 1 — Outer diffusion ─────────────────────────────────────
      // During sampling, outer halo expands further on each breath cycle.
      const outerExpand = 1.0 + breathe * (A > 1 ? 0.10 : 0.02);
      const driftAmp    = 0.04 + Math.min((A - 1) * 0.012, 0.06);
      blob(
        cx + d1 * S * driftAmp,
        cy + d2 * S * driftAmp * 0.75,
        S * outerExpand,
        S * 0.90 * outerExpand,
        'rgba(148,110,62',
        (0.11 + breathe * (A > 1 ? 0.06 : 0.02)) * om
      );

      // ── LAYER 2 — Secondary cloud lobe (offset slightly right-up) ────
      blob(
        cx + S * 0.07 + d3 * S * 0.03,
        cy - S * 0.05 + d1 * S * 0.02,
        S * 0.78,
        S * 0.84,
        'rgba(136,96,50',
        (0.13 + breathe * 0.02) * om
      );

      // ── LAYER 3 — Mid density mass ────────────────────────────────────
      blob(
        cx - S * 0.04 + d2 * S * 0.02,
        cy + S * 0.04 + d3 * S * 0.02,
        S * 0.60,
        S * 0.62,
        'rgba(118,80,36',
        (0.20 + breathe * 0.04) * om
      );

      // ── LAYER 4 — Core warmth ─────────────────────────────────────────
      // During sampling: core darkens at breathe peak, softens at trough.
      const coreOp = (A > 1
        ? 0.18 + breathe * 0.22
        : 0.28 + breathe * 0.06) * om;
      blob(
        cx + S * 0.04 + d1 * S * 0.01,
        cy - S * 0.02 + d2 * S * 0.01,
        S * 0.34,
        S * 0.35,
        'rgba(98,62,22',
        coreOp
      );

      // ── LAYER 5 — Tertiary organic lobe (lower-left drift) ────────────
      blob(
        cx - S * 0.12 + d3 * S * 0.02,
        cy + S * 0.08 + d1 * S * 0.02,
        S * 0.50,
        S * 0.46,
        'rgba(130,90,44',
        (0.09 + breathe * 0.02) * om
      );

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// ── Intensity line ────────────────────────────────────────────────────────────
function IntensityLine({ progress, phase, isDark }: { progress: number; phase: Phase; isDark: boolean }) {
  const { ACCENT } = getTokens(isDark);
  const active   = phase === 'sampling' || phase === 'captured';
  const complete = phase === 'captured';

  const trackCol  = isDark ? 'rgba(200,170,130,0.12)' : 'rgba(120,100,80,0.14)';
  const tickCol   = complete
    ? (isDark ? 'rgba(193,122,58,0.55)' : 'rgba(168,104,40,0.5)')
    : (isDark ? 'rgba(200,170,130,0.18)' : 'rgba(120,100,80,0.20)');
  const labelCol  = complete
    ? (isDark ? 'rgba(193,122,58,0.60)' : 'rgba(168,104,40,0.55)')
    : (isDark ? 'rgba(200,170,130,0.28)' : 'rgba(120,100,80,0.35)');

  return (
    <div style={{ width: 168, position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
      {/* Track */}
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        height: 1, background: trackCol,
        transform: 'translateY(-50%)',
      }} />

      {/* End ticks */}
      {[{ side: 'left' as const }, { side: 'right' as const }].map(({ side }) => (
        <div key={side} style={{
          position: 'absolute', top: '50%', [side]: 0,
          width: 1, height: 7,
          background: tickCol,
          transform: 'translateY(-50%)',
          transition: 'background 0.4s',
        }} />
      ))}

      {/* Fill */}
      {active && (
        <div style={{
          position: 'absolute', top: '50%', left: 0,
          width: `${Math.min(progress, 100)}%`, height: 1,
          background: complete
            ? `linear-gradient(to right, ${isDark ? 'rgba(193,122,58,0.65)' : 'rgba(168,104,40,0.6)'}, ${ACCENT})`
            : `linear-gradient(to right, ${isDark ? 'rgba(193,122,58,0.40)' : 'rgba(168,104,40,0.35)'}, ${ACCENT})`,
          transform: 'translateY(-50%)',
          transition: 'width 0.08s linear, background 0.4s',
          boxShadow: complete ? `0 0 4px ${ACCENT}` : 'none',
        }} />
      )}

      {/* Labels */}
      <span style={{
        position: 'absolute', bottom: 0, left: 0,
        fontSize: '8px', letterSpacing: '0.08em',
        color: labelCol,
        textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'color 0.4s',
      }}>low</span>
      <span style={{
        position: 'absolute', bottom: 0, right: 0,
        fontSize: '8px', letterSpacing: '0.08em',
        color: labelCol,
        textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'color 0.4s',
      }}>high</span>

      {/* Glowing dot */}
      {phase === 'idle' ? (
        <motion.div
          animate={{ left: ['24%', '68%', '24%'] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '50%',
            width: 5, height: 5, borderRadius: '50%',
            background: ACCENT, opacity: 0.45,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 5px 2px ${isDark ? 'rgba(193,122,58,0.22)' : 'rgba(168,104,40,0.18)'}`,
          }}
        />
      ) : (
        <motion.div
          animate={complete ? {
            boxShadow: [
              `0 0 5px 2px ${isDark ? 'rgba(193,122,58,0.30)' : 'rgba(168,104,40,0.25)'}`,
              `0 0 10px 4px ${isDark ? 'rgba(193,122,58,0.55)' : 'rgba(168,104,40,0.50)'}`,
              `0 0 5px 2px ${isDark ? 'rgba(193,122,58,0.30)' : 'rgba(168,104,40,0.25)'}`,
            ]
          } : {}}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '50%',
            left: `${Math.min(progress, 100)}%`,
            width: complete ? 7 : 5,
            height: complete ? 7 : 5,
            borderRadius: '50%',
            background: ACCENT,
            opacity: complete ? 1 : 0.8,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 6px 2px ${isDark ? 'rgba(193,122,58,0.38)' : 'rgba(168,104,40,0.30)'}`,
            transition: 'left 0.08s linear, width 0.3s, height 0.3s',
          }}
        />
      )}
    </div>
  );
}

// ── Capture button ────────────────────────────────────────────────────────────
function CaptureButton({ onTap, isDark }: { onTap: () => void; isDark: boolean }) {
  const { ACCENT } = getTokens(isDark);
  const SIZE = 84;
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Idle pulse rings */}
      <motion.div
        animate={{ scale: [1, 1.55], opacity: [0.20, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: -10,
          borderRadius: '50%',
          border: `1px solid ${ACCENT}`,
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.30], opacity: [0.14, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeOut', delay: 1.2 }}
        style={{
          position: 'absolute', inset: -2,
          borderRadius: '50%',
          border: `1px solid ${ACCENT}`,
          pointerEvents: 'none',
        }}
      />

      {/* Button body — always warm charcoal regardless of mode */}
      <motion.button
        whileTap={{ scale: 0.91 }}
        onClick={onTap}
        style={{
          width: 72, height: 72,
          borderRadius: '50%', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
          background: isDark
            ? 'linear-gradient(148deg, #2A2420, #181410)'
            : 'linear-gradient(148deg, #3A302A, #2C2520)',
          boxShadow: isDark
            ? '0 5px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 5px 24px rgba(44,37,32,0.24), 0 1px 4px rgba(44,37,32,0.14), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        {/* Minimal diffusion glyph */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 1 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 2, height: i === 1 ? 7 : 4,
              borderRadius: 1,
              background: isDark ? 'rgba(232,224,213,0.38)' : 'rgba(244,242,239,0.42)',
              alignSelf: 'flex-end',
            }} />
          ))}
        </div>
        <span style={{
          fontSize: '9px', letterSpacing: '0.14em',
          color: isDark ? 'rgba(232,224,213,0.78)' : 'rgba(244,242,239,0.82)',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500, textTransform: 'uppercase',
        }}>
          Capture
        </span>
      </motion.button>
    </div>
  );
}

// ── Save form ─────────────────────────────────────────────────────────────────
function SavingForm({ onSave, onDiscard, isDark }: { onSave: (data: { title: string; tags: string[]; notes: string }) => void; onDiscard: () => void; isDark: boolean }) {
  const { BG, TEXT, MUTED, FAINT, ACCENT, SURFACE, BORDER } = getTokens(isDark);
  const [title, setTitle]         = useState('');
  const [notes, setNotes]         = useState('');
  const [tags, setTags]           = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [saving, setSaving]       = useState(false);

  const now     = new Date();
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const toggleTag = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const addCustom = () => {
    const t = customTag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setCustomTag('');
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      onSave({ title, tags, notes });
    }, 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: BG }}>
      {/* Mist header */}
      <div style={{ position: 'relative', height: 148, flexShrink: 0, overflow: 'hidden' }}>
        <CaptureMist amplify={1.1} isDark={isDark} />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${BG} 0%, transparent 55%)`,
        }} />
        <div style={{ position: 'absolute', bottom: 14, left: 28 }}>
          <p style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: FAINT, marginBottom: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
            New Scent Print
          </p>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 300, color: TEXT }}>
            Captured · {timeStr}
          </p>
        </div>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: BG,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7.5" stroke={ACCENT} strokeWidth="1" />
                <path d="M4 8 L7 11 L12 5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{
                fontSize: '13px', letterSpacing: '0.09em', color: ACCENT,
                fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500,
                textTransform: 'uppercase',
              }}>
                Saved
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 28px 36px', scrollbarWidth: 'none' }}>
        <div style={{ height: 1, background: BORDER, marginBottom: 24 }} />

        {/* Title */}
        <div style={{ marginBottom: 22 }}>
          <label style={{
            display: 'block', fontSize: '9px', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: FAINT, marginBottom: 10,
            fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 400,
          }}>Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Name this moment…"
            style={{
              width: '100%', padding: '11px 16px',
              background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 14, outline: 'none',
              color: TEXT, fontSize: '14px',
              fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 22 }}>
          <label style={{
            display: 'block', fontSize: '9px', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: FAINT, marginBottom: 10,
            fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 400,
          }}>Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
            {TAG_POOL.map(tag => {
              const active = tags.includes(tag);
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  padding: '6px 13px', borderRadius: 99,
                  fontSize: '11px', letterSpacing: '0.04em',
                  background: active ? (isDark ? '#E8E0D5' : TEXT) : SURFACE,
                  color: active ? (isDark ? '#0E0F12' : BG) : MUTED,
                  border: `1px solid ${active ? (isDark ? '#E8E0D5' : TEXT) : BORDER}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}>
                  {tag}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder="Custom tag…"
              style={{
                flex: 1, padding: '9px 13px',
                background: SURFACE, border: `1px solid ${BORDER}`,
                borderRadius: 11, outline: 'none',
                color: TEXT, fontSize: '13px',
                fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box',
              }}
            />
            <button onClick={addCustom} style={{
              padding: '9px 12px', background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}>
              <Plus size={14} style={{ color: ACCENT }} />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 22 }}>
          <label style={{
            display: 'block', fontSize: '9px', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: FAINT, marginBottom: 10,
            fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 400,
          }}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Describe the moment, context, memory…"
            rows={3}
            style={{
              width: '100%', padding: '11px 16px',
              background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 14, outline: 'none', resize: 'none',
              color: TEXT, fontSize: '14px', lineHeight: 1.6,
              fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Auto-metadata */}
        <div style={{
          background: SURFACE, border: `1px solid ${BORDER}`,
          borderRadius: 16, padding: '14px 18px', marginBottom: 26,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <p style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: FAINT, marginBottom: 2, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Auto-captured
          </p>
          {[
            { label: 'Time',      value: `${dateStr}, ${timeStr}` },
            { label: 'Location',  value: 'Portland, OR' },
            { label: 'Intensity', value: '74%', accent: true },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', color: MUTED, fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</span>
              <span style={{ fontSize: '11px', color: accent ? ACCENT : TEXT, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: accent ? 500 : 400 }}>{value}</span>
            </div>
          ))}
        </div>

        <button onClick={handleSave} style={{
          width: '100%', padding: '15px 0', borderRadius: 20,
          background: isDark
            ? 'linear-gradient(145deg, #2A2420, #181410)'
            : 'linear-gradient(145deg, #3A302A, #2C2520)',
          color: isDark ? '#E8E0D5' : '#F4F2EF',
          border: 'none', cursor: 'pointer',
          fontSize: '12px', letterSpacing: '0.1em',
          fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500,
          textTransform: 'uppercase',
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.45)'
            : '0 4px 20px rgba(44,37,32,0.18)',
          marginBottom: 12,
        }}>
          Save Snapshot
        </button>
        <button onClick={onDiscard} style={{
          width: '100%', padding: '10px 0',
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: '11px', color: FAINT,
          fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.04em',
        }}>
          Discard
        </button>
      </div>
    </div>
  );
}

// ── Sampling progress arc — SVG overlay, Capture screen only ──────────────────
// Mounted on top of CaptureMist only during the 'sampling' phase.
// Two layers: a clockwise fill arc (progress-driven) and a slow spinning
// ambient scanner arc. Both are extremely faint — premium, not distracting.
function SamplingProgressArc({ progress, isDark }: { progress: number; isDark: boolean }) {
  const R     = 78;
  const CX    = 100;
  const CY    = 100;
  const circ  = 2 * Math.PI * R;
  const filled = (progress / 100) * circ;
  const scanLen = (22 / 360) * circ;

  // Amber tones shift slightly warmer in dark mode
  const arcStroke  = isDark ? 'rgba(193,122,58,0.24)' : 'rgba(168,104,40,0.20)';
  const guideRing  = isDark ? 'rgba(193,122,58,0.08)' : 'rgba(168,104,40,0.06)';
  const headDot    = isDark ? 'rgba(193,122,58,0.60)' : 'rgba(168,104,40,0.52)';
  const scanStroke = isDark ? 'rgba(193,122,58,0.06)' : 'rgba(168,104,40,0.045)';

  const dotAngle = ((progress / 100) * 360 - 90) * (Math.PI / 180);
  const dotX = CX + R * Math.cos(dotAngle);
  const dotY = CY + R * Math.sin(dotAngle);

  return (
    <svg
      style={{
        position: 'absolute',
        top: '45.5%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '58%',
        aspectRatio: '1',
        maxWidth: 236,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      viewBox="0 0 200 200"
    >
      <style>{`@keyframes sp-scan-rot { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Barely-there guide ring */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={guideRing} strokeWidth="0.8" />

      {/* Clockwise fill arc — grows 0 → full circle as progress 0 → 100 */}
      {progress > 0.5 && (
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={arcStroke}
          strokeWidth="1.2"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: 'stroke-dasharray 0.12s linear' }}
        />
      )}

      {/* Glowing dot at arc terminus */}
      {progress > 3 && progress < 98 && (
        <circle cx={dotX} cy={dotY} r={2.4} fill={headDot} />
      )}

      {/* Slowly rotating ambient scanner arc */}
      <g style={{ animation: 'sp-scan-rot 7s linear infinite', transformOrigin: '100px 100px' }}>
        <circle
          cx={CX} cy={CY} r={R + 9}
          fill="none"
          stroke={scanStroke}
          strokeWidth="5"
          strokeDasharray={`${scanLen} ${circ + 60}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`}
        />
      </g>
    </svg>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function CaptureScreen() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { addSnapshot } = useUserSnapshots();
  const { BG, TEXT, MUTED, FAINT, ACCENT, SURFACE, BORDER } = getTokens(isDark);

  const [phase,   setPhase]   = useState<Phase>('idle');
  const [amplify, setAmplify] = useState(1.0);
  const [lineP,   setLineP]   = useState(0);

  const rafRef      = useRef<number>(0);
  const startRef    = useRef<number>(0);
  const SAMPLE_DURATION = 3000;

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase('idle');
    setAmplify(1.0);
    setLineP(0);
  }, []);

  const handleSaveSnapshot = useCallback((data: { title: string; tags: string[]; notes: string }) => {
    const now = new Date();
    
    addSnapshot({
      title: data.title || 'Untitled Scent Print',
      tags: data.tags.length > 0 ? data.tags : ['ambient'],
      notes: data.notes || 'A captured moment in time.',
      timestamp: now.toISOString(),
      location: 'Portland, OR',
      lat: 45.5152,
      lng: -122.6784,
      intensity: 74,
      radius: 65,
      duration: 10,
      colorSeed: Math.floor(Math.random() * 7),
    });
    
    reset();
    navigate('/archive');
  }, [addSnapshot, navigate, reset]);

  const handleCapture = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('sampling');
    startRef.current = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startRef.current) / SAMPLE_DURATION, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setAmplify(1.0 + eased * 1.35);
      setLineP(t * 100);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setPhase('captured');
        setAmplify(2.35);
        setLineP(100);
        setTimeout(() => setPhase('saving'), 1100);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [phase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const showMist   = phase !== 'saving';
  const showButton = phase === 'idle';
  const showStatus = phase === 'sampling' || phase === 'captured';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: BG, overflow: 'hidden' }}>
      <AnimatePresence mode="wait">

        {/* ── IDLE / SAMPLING / CAPTURED ───────────────────────────────── */}
        {showMist && (
          <motion.div
            key="capture-view"
            style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
          >
            {/* Full-bleed mist */}
            <div style={{ position: 'absolute', inset: 0 }}>
              <CaptureMist amplify={amplify} isDark={isDark} />
              {/* Progress arc overlay — sampling phase only */}
              {phase === 'sampling' && (
                <SamplingProgressArc progress={lineP} isDark={isDark} />
              )}
            </div>

            {/* Top gradient + header */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              padding: '26px 28px 64px',
              background: `linear-gradient(to bottom, ${BG} 36%, transparent)`,
              pointerEvents: 'none',
            }}>
              <p style={{
                fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
                color: FAINT, marginBottom: 6, fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                Scent Print
              </p>
              <h1 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '2rem', fontWeight: 300,
                color: TEXT, letterSpacing: '-0.01em', margin: 0,
              }}>
                Capture
              </h1>
            </div>

            {/* Sensor status pill (top right) */}
            <div style={{
              position: 'absolute', top: 28, right: 28,
              padding: '5px 12px', borderRadius: 99,
              background: SURFACE, border: `1px solid ${BORDER}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <motion.div
                animate={{
                  opacity: phase === 'sampling' ? [1, 0.2, 1] : [0.5, 1, 0.5],
                  scale:   phase === 'captured' ? [1, 1.5, 1] : 1,
                }}
                transition={{ duration: phase === 'sampling' ? 0.75 : 2.6, repeat: phase === 'captured' ? 3 : Infinity, ease: 'easeInOut' }}
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: phase === 'idle'
                    ? (isDark ? 'rgba(200,170,130,0.25)' : 'rgba(120,100,80,0.35)')
                    : ACCENT,
                  boxShadow: phase !== 'idle'
                    ? `0 0 5px 1px ${isDark ? 'rgba(193,122,58,0.55)' : 'rgba(168,104,40,0.45)'}`
                    : 'none',
                }}
              />
              <span style={{
                fontSize: '9px', letterSpacing: '0.08em',
                color: phase === 'idle' ? FAINT : ACCENT,
                fontFamily: 'Inter, system-ui, sans-serif',
                textTransform: 'uppercase',
                transition: 'color 0.3s',
              }}>
                {phase === 'idle' ? 'Ready' : phase === 'sampling' ? 'Active' : 'Done'}
              </span>
            </div>

            {/* Bottom controls */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '72px 32px 36px',
              background: `linear-gradient(to top, ${BG} 54%, transparent)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              {/* Status text (sampling / captured) */}
              <AnimatePresence mode="wait">
                {showStatus && (
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.38, ease: 'easeOut' }}
                    style={{ marginBottom: 22, textAlign: 'center' }}
                  >
                    {phase === 'sampling' ? (
                      <motion.p
                        animate={{ opacity: [0.55, 1, 0.55] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          fontSize: '12px', letterSpacing: '0.07em', color: MUTED,
                          fontFamily: 'Inter, system-ui, sans-serif',
                        }}
                      >
                        Sampling…
                      </motion.p>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <svg width={13} height={13} viewBox="0 0 13 13" fill="none">
                          <circle cx="6.5" cy="6.5" r="6" stroke={ACCENT} strokeWidth="0.9" />
                          <path d="M3.5 6.5 L5.5 8.5 L9.2 4.8" stroke={ACCENT} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{
                          fontSize: '12px', letterSpacing: '0.09em', color: ACCENT,
                          fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500,
                        }}>
                          Captured
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Intensity line */}
              <div style={{ marginBottom: 28 }}>
                <IntensityLine progress={lineP} phase={phase} isDark={isDark} />
              </div>

              {/* Capture button — only shown at idle */}
              <AnimatePresence>
                {showButton && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.22 } }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <CaptureButton onTap={handleCapture} isDark={isDark} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Spacer to hold layout when button is gone */}
              {!showButton && <div style={{ height: 72 }} />}
            </div>
          </motion.div>
        )}

        {/* ── SAVING ────────────────────────────────────────────────────── */}
        {phase === 'saving' && (
          <motion.div
            key="saving-view"
            style={{ position: 'absolute', inset: 0 }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <SavingForm
              onSave={handleSaveSnapshot}
              onDiscard={reset}
              isDark={isDark}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}