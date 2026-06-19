import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, Mission } from '../lib/api';
import { sound } from '../lib/sound';
import HudCorners from '../components/HudCorners';

export default function MissionDetailScreen() {
  const { missionId, rewardId } = useParams<{ missionId: string; rewardId: string }>();
  const navigate                = useNavigate();
  const [mission, setMission]   = useState<Mission | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    api.missions()
      .then(ms => setMission(ms.find(m => m.id === Number(missionId)) ?? null))
      .catch(() => {});
  }, [missionId]);

  async function start() {
    if (!mission || loading) return;
    setLoading(true);
    sound.tap();
    try {
      const { completionId } = await api.startMission(mission.id);
      sessionStorage.setItem(
        `mission_${completionId}`,
        JSON.stringify({ title: mission.title, icon: mission.icon, time_value: mission.time_value }),
      );
      navigate(`/active/${completionId}/${rewardId}`);
    } catch { setLoading(false); }
  }

  if (!mission) return null;

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full px-16 text-center"
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="relative w-full max-w-lg glass-card rounded-3xl p-10 card-glow"
        initial={{ y: 28 }} animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
      >
        <HudCorners size={18} opacity={0.65} />

        <p className="font-display text-cyan/50 text-[10px] uppercase tracking-[0.32em] mb-5">
          Mission Briefing
        </p>

        <motion.div
          className="text-7xl mb-5"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 0 24px rgba(34,211,238,0.45))' }}
        >
          {mission.icon}
        </motion.div>

        <h2 className="font-display text-cream text-2xl font-bold mb-3 text-glow-cyan leading-snug">
          {mission.title}
        </h2>

        <div className="h-px w-16 mx-auto mb-5"
          style={{ background: 'linear-gradient(to right, transparent, rgba(34,211,238,0.3), transparent)' }} />

        <p className="font-body text-cream/75 text-lg leading-relaxed mb-7">
          {mission.description}
        </p>

        <div className="flex items-center justify-center gap-3 px-5 py-3 rounded-2xl border border-green/30 bg-green/10 mb-8">
          <span className="text-2xl">🏆</span>
          <span className="font-display text-green text-2xl font-bold text-glow-green">+{mission.time_value} min</span>
          <span className="font-body text-cream/45 text-sm">of play time</span>
        </div>

        <motion.button
          onClick={start}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-display text-navy font-bold text-xl tracking-[0.15em] disabled:opacity-50"
          style={{
            background:  'linear-gradient(135deg, #22D3EE 0%, #4ADE80 100%)',
            boxShadow:   '0 4px 24px rgba(34,211,238,0.35)',
          }}
          whileHover={{ scale: 1.03, boxShadow: '0 6px 32px rgba(34,211,238,0.5)' }}
          whileTap={{ scale: 0.97 }}
        >
          {loading ? 'Starting…' : '🚀  LAUNCH MISSION'}
        </motion.button>
      </motion.div>

      <button
        onClick={() => { sound.tap(); navigate(`/missions/${rewardId}`); }}
        className="mt-5 font-body text-cream/35 hover:text-cream/65 text-sm transition-colors"
      >
        ← Pick a different mission
      </button>
    </motion.div>
  );
}
