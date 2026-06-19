import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, Routine } from '../lib/api';
import { socket } from '../lib/socket';
import { sound } from '../lib/sound';

export default function MorningRoutineScreen() {
  const navigate                        = useNavigate();
  const [routines, setRoutines]         = useState<Routine[]>([]);
  const [completedIds, setCompletedIds]  = useState<number[]>([]);
  const [allDone, setAllDone]           = useState(false);

  useEffect(() => {
    api.routines('morning').then(({ routines, completedIds }) => {
      setRoutines(routines);
      setCompletedIds(completedIds);
      if (routines.length > 0 && routines.every(r => completedIds.includes(r.id))) setAllDone(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    socket.on('routineUpdate', (data: { type: string; completedIds: number[] }) => {
      if (data.type !== 'morning') return;
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
        sound.approve();
        setTimeout(() => setAllDone(true), 600);
        setTimeout(() => navigate('/'), 2400);
      }
    } catch {}
  }

  const hour  = new Date().getHours();
  const greet = hour < 9 ? 'Good morning' : 'Hey there';

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center h-full px-12 text-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Warm amber overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 28%, rgba(251,146,60,0.14) 0%, rgba(245,158,11,0.06) 45%, transparent 70%)',
          zIndex:     0,
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full">
        <motion.div
          className="text-5xl mb-3"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, repeatDelay: 3 }}
        >
          ☀️
        </motion.div>

        <h1 className="font-display text-cream text-3xl font-bold mt-1 mb-1 text-glow-gold">
          {greet}, Novah!
        </h1>
        <p className="font-body text-cream/55 text-base mb-7">
          Check these off and Mission Control unlocks!
        </p>

        <div className="flex flex-col gap-3.5 w-full max-w-sm mb-8">
          {routines.map((r, i) => {
            const done = completedIds.includes(r.id);
            return (
              <motion.button
                key={r.id}
                onClick={() => toggle(r.id)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl border text-left transition-all ${
                  done
                    ? 'cursor-default'
                    : 'cursor-pointer'
                }`}
                style={{
                  borderColor: done
                    ? 'rgba(245,158,11,0.42)'
                    : 'rgba(245,158,11,0.18)',
                  background: done
                    ? 'rgba(245,158,11,0.1)'
                    : 'rgba(245,158,11,0.05)',
                }}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.09 }}
                whileTap={done ? {} : { scale: 0.97 }}
              >
                <motion.div
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: done ? '#F59E0B' : 'rgba(245,158,11,0.35)',
                    background:  done ? '#F59E0B' : 'transparent',
                    color:       done ? '#0A1628' : 'transparent',
                  }}
                  animate={done ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {done && <span className="text-sm font-bold">✓</span>}
                </motion.div>
                <span
                  className="font-body text-lg font-semibold"
                  style={{
                    color: done ? 'rgba(245,158,11,0.7)' : '#F5EFE0',
                    textDecoration: done ? 'line-through' : 'none',
                    textDecorationColor: 'rgba(245,158,11,0.4)',
                  }}
                >
                  {r.title}
                </span>
              </motion.button>
            );
          })}
        </div>

        {allDone && (
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 250, damping: 18 }}
          >
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-display text-gold text-xl font-bold text-glow-gold">All done!</p>
            <p className="font-body text-cream/52 text-sm mt-1">Mission Control unlocking…</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
