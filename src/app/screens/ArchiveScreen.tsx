import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { mockSnapshots, ScentSnapshot } from '../components/mockData';
import { ScentSphere } from '../components/MistVisualization';
import { useTheme } from '../ThemeContext';
import { useUserSnapshots } from '../UserSnapshotsContext';

const FILTERS = ['All', 'Recent', 'Nearby', 'Shared'];

// Fixed content-area height so every card is identical regardless of text length
const CONTENT_H = 108;

function SnapshotCard({ snap, onClick }: { snap: ScentSnapshot; onClick: () => void }) {
  const { isDark } = useTheme();
  const date = new Date(snap.timestamp);
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)' }}
    >
      {/* ── Thumbnail: square container filled by ScentSphere ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <ScentSphere
          isDark={isDark}
          colorSeed={snap.colorSeed}
          className="absolute inset-0 w-full h-full"
        />

        {/* Intensity badge */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            borderRadius: 99,
            padding: '2px 7px',
            background: 'var(--sp-overlay)',
            backdropFilter: 'blur(8px)',
            fontSize: '9px',
            color: 'var(--sp-accent)',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          {snap.intensity}%
        </div>
      </div>

      {/* ── Content: fixed height, overflow hidden — cards never grow ── */}
      <div
        style={{
          height: CONTENT_H,
          padding: '10px 12px 10px 12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* Title — hard 2-line clamp */}
        <h3
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.93rem',
            color: 'var(--sp-text)',
            fontWeight: 400,
            lineHeight: 1.22,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {snap.title}
        </h3>

        {/* Location */}
        <p
          style={{
            color: 'var(--sp-text-faint)',
            fontSize: '10px',
            letterSpacing: '0.02em',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            flexShrink: 0,
          }}
        >
          {snap.location}
        </p>

        {/* Tags — max 2, truncated */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', flexShrink: 0 }}>
          {snap.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              style={{
                background: 'var(--sp-accent-muted)',
                color: 'var(--sp-accent)',
                fontSize: '8px',
                letterSpacing: '0.04em',
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: 99,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 72,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Date */}
        <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px', flexShrink: 0 }}>
          {dateStr}
        </p>
      </div>
    </motion.button>
  );
}

export function ArchiveScreen() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { userSnapshots } = useUserSnapshots();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Combine user snapshots (newest first) with mock snapshots
  const allSnapshots = [...userSnapshots, ...mockSnapshots];

  const filtered = allSnapshots.filter(s => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* ── Header (fixed, never scrolls) ── */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p
              style={{
                color: 'var(--sp-text-faint)',
                fontSize: '10px',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                marginBottom: 3,
              }}
            >
              {filtered.length} prints
            </p>
            <h1
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '2rem',
                fontWeight: 300,
                color: 'var(--sp-text)',
                letterSpacing: '-0.01em',
              }}
            >
              Archive
            </h1>
          </div>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)' }}
          >
            <SlidersHorizontal size={14} style={{ color: 'var(--sp-text-muted)' }} />
          </button>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)' }}
        >
          <Search size={13} style={{ color: 'var(--sp-text-faint)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search prints, tags, places…"
            className="flex-1 bg-transparent outline-none"
            style={{ color: 'var(--sp-text)', fontSize: '13px' }}
          />
        </div>

        {/* Filters */}
        <div
          className="flex gap-2 mt-3 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-4 py-1.5 rounded-full shrink-0 transition-all duration-150"
              style={{
                background: activeFilter === f ? 'var(--sp-accent)' : 'var(--sp-surface)',
                color:
                  activeFilter === f
                    ? isDark ? '#0E0F12' : '#F4F2EF'
                    : 'var(--sp-text-muted)',
                border: `1px solid ${activeFilter === f ? 'var(--sp-accent)' : 'var(--sp-border)'}`,
                fontSize: '11px',
                letterSpacing: '0.04em',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable grid ── */}
      <div
        className="flex-1 overflow-y-auto px-5 pb-5"
        style={{ scrollbarWidth: 'none' }}
      >
        {filtered.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            {filtered.map((snap, i) => (
              <motion.div
                key={snap.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.32 }}
              >
                <SnapshotCard
                  snap={snap}
                  onClick={() => navigate(`/archive/${snap.id}`)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <p
              style={{
                color: 'var(--sp-text-faint)',
                fontSize: '12px',
                letterSpacing: '0.05em',
              }}
            >
              No prints found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}