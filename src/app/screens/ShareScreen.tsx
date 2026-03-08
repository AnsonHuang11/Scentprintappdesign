import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Check, Globe, Lock, Send, Play } from 'lucide-react';
import { mockSnapshots, mockContacts } from '../components/mockData';
import { ScentSphere } from '../components/MistVisualization';
import { useTheme } from '../ThemeContext';

export function ShareScreen() {
  const { isDark } = useTheme();
  const [selectedSnap, setSelectedSnap] = useState(mockSnapshots[0].id);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [sent, setSent] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const snap = mockSnapshots.find(s => s.id === selectedSnap)!;

  const toggleContact = (id: string) =>
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const handleSend = () => {
    if (!selectedContacts.length) return;
    setSent(true);
    setTimeout(() => setSent(false), 2500);
    setSelectedContacts([]);
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="px-6 pt-5 pb-3 shrink-0">
        <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 3 }}>Send a print</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 300, color: 'var(--sp-text)', letterSpacing: '-0.01em' }}>Share</h1>
      </div>

      <div className="flex flex-col gap-5 px-6 pb-8">
        {/* Snapshot Selector */}
        <div>
          <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10 }}>Scent Print</p>
          <button onClick={() => setShowPicker(v => !v)}
            className="w-full flex items-stretch rounded-2xl overflow-hidden"
            style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)' }}>
            <div className="relative shrink-0" style={{ width: 68, height: 68 }}>
              <ScentSphere isDark={isDark} colorSeed={snap.colorSeed} className="absolute inset-0 w-full h-full" />
            </div>
            <div className="flex-1 px-4 py-3 text-left">
              <p style={{ color: 'var(--sp-text)', fontSize: '13px', fontFamily: 'Cormorant Garamond, serif' }}>{snap.title}</p>
              <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px', marginTop: 3 }}>{snap.location}</p>
            </div>
            <div className="flex items-center pr-4">
              <ChevronRight size={15} style={{ color: 'var(--sp-text-faint)' }} />
            </div>
          </button>

          <AnimatePresence>
            {showPicker && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-1.5 rounded-2xl"
                style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)' }}>
                {mockSnapshots.map(s => (
                  <button key={s.id} onClick={() => { setSelectedSnap(s.id); setShowPicker(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5"
                    style={{ borderBottom: '1px solid var(--sp-border)', background: s.id === selectedSnap ? 'var(--sp-accent-muted)' : 'transparent' }}>
                    <div className="relative shrink-0 rounded-lg overflow-hidden" style={{ width: 32, height: 32 }}>
                      <ScentSphere isDark={isDark} colorSeed={s.colorSeed} className="absolute inset-0 w-full h-full" />
                    </div>
                    <div className="text-left flex-1">
                      <p style={{ color: 'var(--sp-text)', fontSize: '12px' }}>{s.title}</p>
                      <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px' }}>{s.location}</p>
                    </div>
                    {s.id === selectedSnap && <Check size={13} style={{ color: 'var(--sp-accent)' }} />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Contacts */}
        <div>
          <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10 }}>To</p>
          <div className="flex flex-wrap gap-2">
            {mockContacts.map(c => {
              const sel = selectedContacts.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleContact(c.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-150"
                  style={{ background: sel ? 'var(--sp-accent)' : 'var(--sp-surface)', border: `1px solid ${sel ? 'var(--sp-accent)' : 'var(--sp-border)'}` }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: sel ? 'rgba(255,255,255,0.18)' : 'var(--sp-accent-muted)', fontSize: '8px', color: sel ? (isDark ? '#0E0F12' : '#F4F2EF') : 'var(--sp-accent)', fontWeight: 700, letterSpacing: '0.01em' }}>
                    {c.initials}
                  </div>
                  <span style={{ fontSize: '11px', color: sel ? (isDark ? '#0E0F12' : '#F4F2EF') : 'var(--sp-text)', fontWeight: sel ? 500 : 400 }}>
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message */}
        <div>
          <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10 }}>Message</p>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a note about this moment…" rows={3}
            className="w-full px-4 py-3 rounded-xl outline-none resize-none"
            style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)', color: 'var(--sp-text)', fontSize: '14px', lineHeight: 1.6 }} />
        </div>

        {/* Privacy toggle */}
        <div className="flex items-center justify-between px-4 py-3.5 rounded-xl"
          style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)' }}>
          <div className="flex items-center gap-3">
            {isPublic
              ? <Globe size={15} style={{ color: 'var(--sp-accent)' }} />
              : <Lock size={15} style={{ color: 'var(--sp-text-muted)' }} />}
            <div>
              <p style={{ color: 'var(--sp-text)', fontSize: '12px', fontWeight: 500 }}>{isPublic ? 'Public Link' : 'Private Link'}</p>
              <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px' }}>{isPublic ? 'Anyone with link can view' : 'Only selected recipients'}</p>
            </div>
          </div>
          <button onClick={() => setIsPublic(v => !v)}
            className="relative w-10 h-5 rounded-full transition-colors duration-300"
            style={{ background: isPublic ? 'var(--sp-accent)' : 'var(--sp-border)' }}>
            <motion.div className="absolute top-0.5 w-4 h-4 rounded-full"
              animate={{ left: isPublic ? '22px' : '2px' }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              style={{ background: isDark ? '#0E0F12' : '#F4F2EF' }} />
          </button>
        </div>

        {/* Send CTA */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSend} disabled={!selectedContacts.length}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200"
          style={{
            background: selectedContacts.length ? 'var(--sp-accent)' : 'var(--sp-surface)',
            color: selectedContacts.length ? (isDark ? '#0E0F12' : '#F4F2EF') : 'var(--sp-text-faint)',
            border: selectedContacts.length ? 'none' : '1px solid var(--sp-border)',
            fontSize: '13px', letterSpacing: '0.09em', fontWeight: 500,
            boxShadow: selectedContacts.length ? (isDark ? '0 4px 22px rgba(193,122,58,0.32)' : '0 4px 18px rgba(168,104,40,0.22)') : 'none',
          }}>
          <Send size={13} /> Send Scent Print
        </motion.button>

        <AnimatePresence>
          {sent && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl"
              style={{ background: 'var(--sp-accent-muted)', border: '1px solid var(--sp-accent)' }}>
              <Check size={13} style={{ color: 'var(--sp-accent)' }} />
              <p style={{ color: 'var(--sp-accent)', fontSize: '12px', fontWeight: 500 }}>Scent Print sent</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incoming receive section */}
        <div className="mt-2">
          <p style={{ color: 'var(--sp-text-faint)', fontSize: '10px', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 12 }}>Incoming</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--sp-surface)', border: '1px solid var(--sp-border)' }}>
            <div className="relative" style={{ height: 90 }}>
              <ScentSphere isDark={isDark} colorSeed={mockSnapshots[3].colorSeed} className="absolute inset-0 w-full h-full" />
              <div className="absolute inset-0 flex items-end px-4 pb-3"
                style={{ background: 'linear-gradient(to top, var(--sp-surface) 0%, transparent 65%)' }}>
                <div>
                  <p style={{ color: 'var(--sp-text)', fontSize: '12px', fontFamily: 'Cormorant Garamond, serif' }}>{mockSnapshots[3].title}</p>
                  <p style={{ color: 'var(--sp-text-faint)', fontSize: '9px' }}>from Marcus Webb</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg"
                style={{ background: 'var(--sp-accent)', color: isDark ? '#0E0F12' : '#F4F2EF', fontSize: '10px', fontWeight: 500, letterSpacing: '0.05em' }}>
                <Play size={9} /> Replay Now
              </button>
              <button className="flex-1 py-2 rounded-lg text-center"
                style={{ background: 'var(--sp-surface-2)', border: '1px solid var(--sp-border)', color: 'var(--sp-text-muted)', fontSize: '10px', letterSpacing: '0.04em' }}>
                Save to Archive
              </button>
              <button className="flex-1 py-2 rounded-lg text-center"
                style={{ background: 'var(--sp-surface-2)', border: '1px solid var(--sp-border)', color: 'var(--sp-text-muted)', fontSize: '10px', letterSpacing: '0.04em' }}>
                View on Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
