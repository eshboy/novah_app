import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, Routine } from '../lib/api';
import { socket } from '../lib/socket';
import { sound } from '../lib/sound';

export default function EveningRoutineScreen() {
  const navigate                        = useNavigate();
  const [routines, setRoutines]         = useState<Routine[]>([]);
  const [completedIds, setCompletedIds]  = useState<number[]>([]);
  const [allDone, setAllDone]           = useState(false);
  const [earnedMin, setEarnedMin]       = useState(0);

  useEffect(() => {
    api.routines('evening').then(({ routines, completedIds }) => {
      setRoutines(routines);
      setCompletedIds(completedIds);
      if (routines.length > 0 && routines.every(r => completedIds.includes(r.id))) setAllDone(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    socket.on('routineUpdate', (data: { type: string; completedIds: number[] }) => {
      if (data.type !== 'evening') return;
      setCompletedIds(data.completedIds);
    });
    return () => { socket.off('routineUpdate'); };
  }, []);

  async function toggle(id: number) {
    if (completedIds.includes(id)) return;
    sound.tap();
    try {
      const res = await api.completeRoutine(id);
      setCompletedIds(res.completedIds);
      if (res.allDone) {
        sound.celebrate();
        setEarnedMin(res.earnedMinutes ?? 20);
        setTimeout(() => setAllDone(true), 500);
      }
    } catch {}
  }

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center h-full px-12 text-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Dusk purple overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 38%, rgba(139,92,246,0.13) 0%, rgba(99,102,241,0.06) 48%, transparent 72%)',
          zIndex:     0,
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full">
        <motion.div
          className="text-5xl mb-3"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 4 }}
        >
          🌙
        </motion.div>

        <h1
          className="font-display text-cream text-3xl font-bold mb-1"
          style={{ textShadow: '0 0 24px rgba(167,139,250,0.55)' }}
        >
          Wind-Down Time
        </h1>
        <p className="font-body text-cream/55 text-base mb-7">
          Let's wrap up the day. Check these off when you're done!
        </p>

        <div className="flex flex-col gap-3.5 w-full max-w-sm mb-6">
          {routines.map((r, i) => {
            const done = completedIds.includes(r.id);
            return (
              <motion.button
                key={r.id}
                onClick={() => toggle(r.id)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl border text-left transition-all ${
                  done ? 'cursor-default' : 'cursor-pointer'
                }`}
                style={{
                  borderColor: done
                    ? 'rgba(167,139,250,0.42)'
                    : 'rgba(139,92,246,0.2)',
                  background: done
                    ? 'rgba(139,92,246,0.12)'
                    : 'rgba(139,92,246,0.05)',
                }}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.09 }}
                whileTap={done ? {} : { scale: 0.97 }}
              >
                <div
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: done ? '#A78BFA' : 'rgba(167,139,250,0.35)',
                    background:  done ? '#A78BFA' : 'transparent',
                    color:       '#0A1628',
                  }}
                >
                  {done && <span className="text-sm font-bold">✓</span>}
                </div>
                <span
                  className="font-body text-lg font-semibold"
                  style={{
                    color: done ? 'rgba(167,139,250,0.7)' : '#F5EFE0',
                    textDecoration: done ? 'line-through' : 'none',
                    textDecorationColor: 'rgba(167,139,250,0.4)',
                  }}
                >
                  {r.title}
                </span>
              </motion.button>
            );
          })}
        </div>

        {allDone ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-3xl mb-2">🌟</p>
            <p
              className="font-display text-xl font-bold"
              style={{ color: '#C084FC', textShadow: '0 0 20px rgba(192,132,252,0.65)' }}
            >
              Nice work today!
            </p>
            {earnedMin > 0 && (
              <motion.div
                className="flex items-center justify-center gap-2 mt-3 px-5 py-2 rounded-xl border border-purple-400/40 bg-purple-400/10"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.25 }}
              >
                <span className="text-lg">⏱</span>
                <span className="font-display font-bold" style={{ color: '#C084FC' }}>+{earnedMin} min earned!</span>
              </motion.div>
            )}
            <p className="font-body text-cream/45 text-sm mt-3">Sleep well, Commander Novah.</p>
          </motion.div>
        ) : (
          <p className="font-body text-cream/28 text-sm">Check them off when you're ready!</p>
        )}

        <button
          onClick={() => navigate('/')}
          className="mt-6 font-body text-cream/28 hover:text-cream/55 text-sm transition-colors"
        >
          ← Back to Mission Control
        </button>
      </div>
    </motion.div>
  );
}
