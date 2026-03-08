import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Share2, MapPin } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { mockSnapshots } from '../components/mockData';
import { MistVisualization } from '../components/MistVisualization';
import { useTheme } from '../ThemeContext';
import { useUserSnapshots } from '../UserSnapshotsContext';

export function SnapshotDetailScreen() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const { userSnapshots } = useUserSnapshots();
  
  // Look in both user snapshots and mock snapshots
  const snap = [...userSnapshots, ...mockSnapshots].find(s => s.id === id);

  const [intensity, setIntensity] = useState(snap?.intensity ?? 70);
  const [radius, setRadius] = useState(snap?.radius ?? 60);
  const [duration, setDuration] = useState(snap?.duration ?? 8);
  const [replaying, setReplaying] = useState(false);

  if (!snap) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: 'var(--sp-text-muted)' }}>Snapshot not found</p>
      </div>
    );
  }

  const handleReplay = () => {
    setReplaying(true);
    setTimeout(() => setReplaying(false), 3500);
  };

  const date = new Date(snap.timestamp);
  const dateStr = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mist visualization */}
      <div className="relative shrink-0" style={{ height: '40%' }}>
        <MistVisualization
          isDark={isDark}
          intensity={replaying ? 96 : intensity}
          size="full"
          colorSeed={snap.colorSeed}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, var(--sp-bg) 0%, transparent 18%, transparent 72%, var(--sp-bg) 100%)',
        }} />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-4">
          <button onClick={() => navigate('/archive')}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--sp-overlay)', backdropFilter: 'blur(12px)', border: '1px solid var(--sp-border)' }}>
            <ArrowLeft size={15} style={{ color: 'var(--sp-text)' }} />
          </button>
          <button onClick={() => navigate('/share')}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--sp-overlay)', backdropFilter: 'blur(12px)', border: '1px solid var(--sp-border)' }}>
            <Share2 size={14} style={{ color: 'var(--sp-text)' }} />
          </button>
        </div>

        {/* Replay overlay */}
        {replaying && (
          <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
              style={{ color: 'var(--sp-text)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Replaying
            </motion.p>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ scrollbarWidth: 'none' }}>
        {/* Title */}
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.65rem', fontWeight: 300, color: 'var(--sp-text)', lineHeight: 1.2, marginBottom: 8 }}>
          {snap.title}
        </h2>
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={11} style={{ color: 'var(--sp-text-faint)' }} />
          <p style={{ color: 'var(--sp-text-faint)', fontSize: '11px' }}>{snap.location}</p>
          <span style={{ color: 'var(--sp-border)' }}>·</span>
          <p style={{ color: 'var(--sp-text-faint)', fontSize: '11px' }}>{dateStr}</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {snap.tags.map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-full"
              style={{ background: 'var(--sp-accent-muted)', color: 'var(--sp-accent)', fontSize: '10px', letterSpacing: '0.04em' }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Notes */}
        {snap.notes && (
          <p className="mb-5"
            style={{ color: 'var(--sp-text-muted)', lineHeight: 1.7, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem' }}>
            {snap.id === '1' 
              ? '"Steam rising from the wok. Garlic and soy in the air.\nThe scent of home — warm, familiar, alive."'
              : snap.id === '3'
              ? '"The air grew heavy with petrichor. Damp, earthy, renewed. A scent crisp enough to belong to the sky itself."'
              : `"${snap.notes}"`
            }
          </p>
        )}

        {/* Controls */}
        <div className="rounded-2xl p-4 mb-5 flex flex-col gap-5"
          style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)' }}>
          <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px', letterSpacing: '0.09em', textTransform: 'uppercase' }}>Replay Controls</p>
          {[
            { label: 'Intensity', value: intensity, set: setIntensity, min: 0, max: 100, unit: '%' },
            { label: 'Radius', value: radius, set: setRadius, min: 10, max: 100, unit: 'm' },
            { label: 'Duration', value: duration, set: setDuration, min: 1, max: 30, unit: 's' },
          ].map(({ label, value, set, min, max, unit }) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-2.5">
                <span style={{ color: 'var(--sp-text-muted)', fontSize: '12px' }}>{label}</span>
                <span style={{ color: 'var(--sp-accent)', fontSize: '12px', fontWeight: 500 }}>{value}{unit}</span>
              </div>
              <Slider.Root min={min} max={max} value={[value]} onValueChange={([v]) => set(v)}
                className="relative flex items-center w-full" style={{ height: 18 }}>
                <Slider.Track className="relative flex-1 rounded-full" style={{ height: 1.5, background: 'var(--sp-border)' }}>
                  <Slider.Range className="absolute h-full rounded-full" style={{ background: 'var(--sp-accent)' }} />
                </Slider.Track>
                <Slider.Thumb className="block w-4 h-4 rounded-full outline-none cursor-pointer"
                  style={{ background: 'var(--sp-accent)', boxShadow: isDark ? '0 0 8px rgba(193,122,58,0.45)' : '0 1px 4px rgba(0,0,0,0.18)' }} />
              </Slider.Root>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleReplay}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl"
            style={{
              background: 'var(--sp-accent)', color: isDark ? '#0E0F12' : '#F4F2EF',
              fontSize: '12px', letterSpacing: '0.07em', fontWeight: 500,
              boxShadow: isDark ? '0 4px 18px rgba(193,122,58,0.32)' : '0 4px 14px rgba(168,104,40,0.2)',
            }}>
            <Play size={13} /> Replay
          </button>
          <button onClick={() => navigate('/share')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl"
            style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)', color: 'var(--sp-text)', fontSize: '12px', letterSpacing: '0.06em' }}>
            <Share2 size={13} style={{ color: 'var(--sp-text-muted)' }} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}