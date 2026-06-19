import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sound } from '../lib/sound';

interface CriticalMission { title: string; time_value: number; addedBy?: string }

interface Props { mission: CriticalMission | null; onDismiss: () => void }

export default function CriticalMissionAlert({ mission, onDismiss }: Props) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!mission) return;
    sound.alert();
    setPulse(true);
    const t1 = setTimeout(() => { sound.alert(); }, 600);
    const t2 = setTimeout(() => onDismiss(), 7000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [mission]);

  return (
    <AnimatePresence>
      {mission && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center z-50 text-center px-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          style={{ background: 'rgba(10,8,20,0.92)' }}
        >
          {/* Red flash overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: [0.7, 0, 0.5, 0, 0.3, 0] }}
            transition={{ duration: 1.2, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
            style={{ background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.6) 0%, transparent 70%)' }}
          />

          {/* Pulsing border */}
          <motion.div
            className="absolute inset-4 rounded-3xl border-2 pointer-events-none"
            animate={{ opacity: [1, 0.3, 1], borderColor: ['#ef4444', '#f97316', '#ef4444'] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />

          <motion.p
            className="font-display text-red-400 text-xs uppercase tracking-[0.4em] mb-4"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
          >
            🚨 Mission Critical
          </motion.p>

          <motion.div
            className="text-7xl mb-5"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
          >
            ⭐
          </motion.div>

          <motion.h2
            className="font-display text-cream text-3xl font-bold mb-3 leading-snug"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {mission.title}
          </motion.h2>

          <motion.div
            className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-gold/40 bg-gold/10 mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, type: 'spring' }}
          >
            <span className="text-2xl">⏱</span>
            <span className="font-display text-gold text-2xl font-bold">+{mission.time_value} min</span>
          </motion.div>

          {mission.addedBy && (
            <motion.p
              className="font-body text-cream/50 text-sm mb-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            >
              Added by {mission.addedBy}
            </motion.p>
          )}

          <motion.p
            className="font-body text-cream/30 text-xs"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          >
            Tap anywhere to dismiss
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
