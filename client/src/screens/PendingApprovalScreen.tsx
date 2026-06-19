import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { socket } from '../lib/socket';
import { sound } from '../lib/sound';
import HudCorners from '../components/HudCorners';

export default function PendingApprovalScreen() {
  const { completionId, rewardId } = useParams<{ completionId: string; rewardId: string }>();
  const navigate                   = useNavigate();
  const [denied, setDenied]        = useState(false);
  const [denyReason, setDenyReason] = useState<string | undefined>();
  const [mission, setMission]      = useState<{ title: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`mission_${completionId}`);
    if (stored) setMission(JSON.parse(stored));
  }, [completionId]);

  useEffect(() => {
    function onApproved(data: { completionId: number; missionTitle: string; minutes: number; parentName: string }) {
      if (data.completionId !== Number(completionId)) return;
      sound.celebrate();
      navigate(`/accomplished/${completionId}/${rewardId}`, {
        state: { minutes: data.minutes, parentName: data.parentName },
      });
    }
    function onDenied(data: { completionId: number; reason?: string }) {
      if (data.completionId !== Number(completionId)) return;
      sound.deny();
      setDenyReason(data.reason);
      setDenied(true);
    }
    socket.on('missionApproved', onApproved);
    socket.on('missionDenied', onDenied);
    return () => { socket.off('missionApproved', onApproved); socket.off('missionDenied', onDenied); };
  }, [completionId, rewardId, navigate]);

  /* ── Denied state ─────────────────────────────────────────────── */
  if (denied) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-full text-center px-16"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      >
        <div className="relative glass-card rounded-3xl p-10 max-w-md w-full card-glow">
          <HudCorners color="#F59E0B" size={14} opacity={0.52} />

          <div className="text-6xl mb-5">😊</div>
          <h2 className="font-display text-cream text-2xl font-bold mb-3">Not quite yet!</h2>
          <p className="font-body text-cream/65 text-lg mb-2">Give it another go, or pick a new one!</p>

          {denyReason && (
            <div className="mt-4 mb-6 px-5 py-3 rounded-2xl border border-gold/30 bg-gold/10">
              <p className="font-body text-gold text-base italic">"{denyReason}"</p>
            </div>
          )}

          <div className="flex gap-4 mt-7 justify-center">
            <motion.button
              onClick={() => navigate(`/missions/${rewardId}`)}
              className="px-8 py-3 rounded-xl font-display text-navy font-bold tracking-wide text-sm"
              style={{ background: 'linear-gradient(135deg, #22D3EE, #4ADE80)' }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            >
              Pick a Mission
            </motion.button>
            <motion.button
              onClick={() => navigate('/')}
              className="px-8 py-3 rounded-xl font-body text-cream/60 border border-cream/20 hover:border-cream/40 hover:text-cream/80 transition-colors text-sm"
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            >
              Home
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── Pending state ────────────────────────────────────────────── */
  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full text-center px-16"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Radar rings */}
      <div className="relative w-44 h-44 mb-8 flex items-center justify-center">
        <div className="radar-ring-1 absolute rounded-full border border-cyan/55" style={{ width: 80, height: 80 }} />
        <div className="radar-ring-2 absolute rounded-full border border-cyan/45" style={{ width: 80, height: 80 }} />
        <div className="radar-ring-3 absolute rounded-full border border-cyan/35" style={{ width: 80, height: 80 }} />
        <span className="text-6xl relative z-10">📡</span>
      </div>

      <p className="font-display text-cyan text-xs uppercase tracking-[0.3em] mb-2 text-glow-cyan">
        Transmission Sent
      </p>
      <h2 className="font-display text-cream text-2xl font-bold mb-4">Waiting for approval…</h2>

      {mission && (
        <div className="mb-4 px-5 py-2.5 rounded-xl border border-cyan/18 bg-cyan/5">
          <p className="font-body text-cream/75 text-base">
            <strong className="text-cream">{mission.title}</strong> is on its way to the parents!
          </p>
        </div>
      )}

      <p className="font-body text-cream/32 text-sm">Hang tight — this usually only takes a minute.</p>

      {/* Pulse dot */}
      <motion.div
        className="mt-8 flex items-center gap-2"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div
          className="w-2 h-2 rounded-full bg-cyan"
          style={{ boxShadow: '0 0 8px rgba(34,211,238,0.8)' }}
        />
        <span className="font-display text-cyan/45 text-[9px] uppercase tracking-[0.22em]">Approval pending</span>
      </motion.div>
    </motion.div>
  );
}
