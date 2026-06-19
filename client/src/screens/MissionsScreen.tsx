import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, Mission, Balance, Reward } from '../lib/api';
import { socket } from '../lib/socket';
import { sound } from '../lib/sound';
import HudCorners from '../components/HudCorners';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  tidy:    { label: '🧹  TIDY UP',  color: '#22D3EE' },
  move:    { label: '⚡  MOVE',     color: '#4ADE80' },
  learn:   { label: '📚  LEARN',   color: '#F59E0B' },
  create:  { label: '🎨  CREATE',  color: '#C084FC' },
  special: { label: '⭐  SPECIAL', color: '#F59E0B' },
};

interface Props { balance: Balance }

export default function MissionsScreen({ balance }: Props) {
  const { rewardId }           = useParams<{ rewardId: string }>();
  const navigate               = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [reward, setReward]    = useState<Reward | null>(null);

  useEffect(() => {
    api.missions().then(setMissions).catch(() => {});
    api.rewards().then(rs => setReward(rs.find(r => r.id === Number(rewardId)) ?? null)).catch(() => {});
  }, [rewardId]);

  useEffect(() => {
    socket.on('missionAdded', (m) => {
      setMissions(prev => [{ ...(m as unknown as Mission), available: true, completions_today: 0 }, ...prev]);
    });
    return () => { socket.off('missionAdded'); };
  }, []);

  const available  = missions.filter(m => m.available);
  const done       = missions.filter(m => !m.available);
  const categories = [...new Set(available.map(m => m.category))];

  function pick(m: Mission) {
    if (!m.available) return;
    sound.tap();
    navigate(`/mission/${m.id}/${rewardId}`);
  }

  return (
    <motion.div
      className="flex flex-col h-full px-8 py-5"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <motion.button
          onClick={() => { sound.tap(); navigate('/'); }}
          className="glass-card px-4 py-2 rounded-xl font-display text-cyan/65 hover:text-cyan text-[10px] uppercase tracking-[0.22em] transition-colors"
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        >
          ← Back
        </motion.button>

        {reward && (
          <div className="flex items-center gap-2.5">
            <span className="text-xl" style={{ filter: `drop-shadow(0 0 8px ${reward.color}80)` }}>
              {reward.emoji}
            </span>
            <span className="font-display text-cream text-sm tracking-wide">
              Earning for <strong>{reward.name}</strong>
            </span>
          </div>
        )}

        <div className="ml-auto">
          <span className="font-display text-green font-bold text-sm text-glow-green">{balance.minutes}</span>
          <span className="font-display text-cream/35 text-[10px] ml-1 tracking-widest">MIN BANKED</span>
        </div>
      </div>

      {/* Mission list */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {categories.map(cat => {
          const meta = CATEGORY_META[cat] ?? { label: cat.toUpperCase(), color: '#22D3EE' };
          return (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-2.5 px-1">
                <p className="font-display text-[10px] uppercase tracking-[0.25em]"
                  style={{ color: `${meta.color}99` }}>
                  {meta.label}
                </p>
                <div className="flex-1 h-px"
                  style={{ background: `linear-gradient(to right, ${meta.color}28, transparent)` }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {available.filter(m => m.category === cat).map((m, i) => (
                  <MissionCard key={m.id} mission={m} index={i} catColor={meta.color} onPick={pick} />
                ))}
              </div>
            </div>
          );
        })}

        {done.length > 0 && (
          <div className="mt-1">
            <div className="flex items-center gap-3 mb-2.5 px-1">
              <p className="font-display text-[10px] uppercase tracking-[0.25em] text-cream/22">✓  Done Today</p>
              <div className="flex-1 h-px bg-cream/8" />
            </div>
            <div className="grid grid-cols-2 gap-3 opacity-30">
              {done.map((m, i) => (
                <MissionCard key={m.id} mission={m} index={i} catColor="#22D3EE" onPick={() => {}} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MissionCard({
  mission: m, index, catColor, onPick,
}: { mission: Mission; index: number; catColor: string; onPick: (m: Mission) => void }) {
  return (
    <motion.button
      onClick={() => onPick(m)}
      className="relative text-left rounded-2xl overflow-hidden glass-card transition-all"
      style={{
        borderColor:  m.available ? `${catColor}30` : 'rgba(245,239,224,0.07)',
        padding:      '12px 14px',
      }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      whileHover={m.available ? { scale: 1.025, transition: { duration: 0.11 } } : {}}
      whileTap={m.available ? { scale: 0.97 } : {}}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: m.available ? catColor : 'rgba(245,239,224,0.08)' }}
      />

      <div className="flex items-center gap-2.5 mb-1.5 ml-2">
        <span className="text-[22px]">{m.icon}</span>
        <span className="font-body text-cream font-bold text-sm leading-snug">{m.title}</span>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <span className="font-display text-green text-xs font-bold">+{m.time_value} min</span>
        {m.is_temporary && (
          <span className="font-display text-gold text-[9px] px-1.5 py-0.5 rounded-full border border-gold/40 bg-gold/10 tracking-widest">
            SPECIAL
          </span>
        )}
        {!m.available && (
          <span className="font-display text-cream/35 text-[9px] tracking-[0.2em]">✓ DONE</span>
        )}
      </div>
    </motion.button>
  );
}
