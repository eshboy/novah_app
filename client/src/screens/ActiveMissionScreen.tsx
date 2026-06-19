import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { sound } from '../lib/sound';

export default function ActiveMissionScreen() {
  const { completionId, rewardId } = useParams<{ completionId: string; rewardId: string }>();
  const navigate                   = useNavigate();
  const [elapsed, setElapsed]      = useState(0);
  const [mission, setMission]      = useState<{ title: string; icon: string; time_value: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startRef                   = useRef(Date.now());

  useEffect(() => {
    const stored = sessionStorage.getItem(`mission_${completionId}`);
    if (stored) setMission(JSON.parse(stored));
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [completionId]);

  async function done() {
    if (submitting) return;
    setSubmitting(true);
    sound.tap();
    try {
      await api.doneMission(Number(completionId));
      navigate(`/pending/${completionId}/${rewardId}`);
    } catch { setSubmitting(false); }
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center h-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Pulsing edge border */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ border: '2px solid rgba(74,222,128,0.22)' }}
        animate={{ opacity: [0.3, 0.85, 0.3] }}
        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-3 pointer-events-none"
        style={{ border: '1px solid rgba(74,222,128,0.1)' }}
        animate={{ opacity: [0.1, 0.45, 0.1] }}
        transition={{ repeat: Infinity, duration: 2.8, delay: 0.5, ease: 'easeInOut' }}
      />

      {/* Traveling scan line */}
      <div
        className="scanline-travel absolute left-0 right-0 h-px pointer-events-none"
        style={{
          top:        0,
          background: 'linear-gradient(to right, transparent 0%, rgba(74,222,128,0.45) 50%, transparent 100%)',
          zIndex:     5,
        }}
      />

      {/* Status header */}
      <motion.p
        className="font-display text-green text-xs uppercase tracking-[0.3em] mb-8 text-glow-green"
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        ⚡ Active Mission
      </motion.p>

      {/* Icon with halo */}
      <div className="relative mb-6 flex items-center justify-center">
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width:      160,
            height:     160,
            background: 'radial-gradient(ellipse, rgba(74,222,128,0.18) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.22, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
        />
        <motion.div
          className="text-8xl relative"
          style={{ zIndex: 10 }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        >
          {mission?.icon ?? '🚀'}
        </motion.div>
      </div>

      <h1 className="font-display text-cream text-3xl font-bold text-center px-8 mb-3 leading-snug">
        {mission?.title ?? 'On a mission…'}
      </h1>

      {/* Elapsed readout */}
      <div className="flex items-center gap-2 mb-10">
        <span className="font-display text-cream/22 text-[9px] uppercase tracking-[0.25em]">Elapsed</span>
        <span className="font-display text-cream/28 text-2xl tracking-widest">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>

      <motion.button
        onClick={done}
        disabled={submitting}
        className="px-16 py-5 rounded-2xl font-display text-navy font-bold text-xl tracking-[0.12em] disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #4ADE80 0%, #22D3EE 100%)',
          boxShadow:  '0 4px 28px rgba(74,222,128,0.4)',
        }}
        whileHover={{ scale: 1.05, boxShadow: '0 6px 36px rgba(74,222,128,0.55)' }}
        whileTap={{ scale: 0.95 }}
      >
        {submitting ? 'Sending…' : '✅  Mission Complete!'}
      </motion.button>

      <p className="font-body text-cream/25 text-sm mt-5">
        Go do the mission, then come back and tap done.
      </p>
    </motion.div>
  );
}
