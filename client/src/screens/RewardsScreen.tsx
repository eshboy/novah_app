import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api, Reward, Balance, AppMode } from '../lib/api';
import { sound } from '../lib/sound';
import HudCorners from '../components/HudCorners';

interface Props { balance: Balance; mode: AppMode }

export default function RewardsScreen({ balance }: Props) {
  const navigate              = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const hasBalance            = balance.minutes > 0;
  const nearCap               = balance.minutes >= balance.softCapMinutes * 0.9;
  const overCap               = balance.minutes >= balance.softCapMinutes;

  useEffect(() => { api.rewards().then(setRewards).catch(() => {}); }, []);

  function play(r: Reward) { sound.tap(); navigate(`/play/${r.id}`); }
  function earn(r: Reward) { sound.tap(); navigate(`/missions/${r.id}`); }

  return (
    <motion.div
      className="flex flex-col h-full px-10 py-5"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Top label row */}
      <div className="flex items-center justify-between mb-4">
        <p className="font-display text-cyan/45 text-[10px] uppercase tracking-[0.28em]">Commander Novah</p>
        {overCap && (
          <motion.span
            className="font-display text-gold text-[10px] uppercase tracking-widest"
            animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2 }}
          >
            ✨ Great screen day!
          </motion.span>
        )}
        {nearCap && !overCap && (
          <span className="font-display text-gold/65 text-[10px] uppercase tracking-widest">
            🌟 Almost at daily limit
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {hasBalance ? (
          /* ── PLAY MODE ───────────────────────────────────────────────────── */
          <motion.div
            key="play"
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            {/* Balance hero */}
            <div className="text-center mb-5">
              <motion.div
                key={balance.minutes}
                initial={{ scale: 1.22, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="inline-block"
              >
                <span className="font-display text-green font-bold text-glow-green leading-none" style={{ fontSize: 54 }}>
                  {balance.minutes}
                </span>
                <span className="font-display text-green/65 text-2xl ml-2 align-baseline">min</span>
              </motion.div>
              <p className="font-body text-cream/45 text-sm tracking-wide mt-1">What do you want to play?</p>
            </div>

            {/* Play cards */}
            <div className="flex gap-5 justify-center items-center flex-1">
              {rewards.map((r, i) => (
                <motion.button
                  key={r.id}
                  onClick={() => play(r)}
                  className="relative flex flex-col items-center justify-center glass-card rounded-3xl cursor-pointer select-none"
                  style={{
                    width: 218, height: 262,
                    background: `linear-gradient(155deg, ${r.color}28, rgba(10,22,40,0.88))`,
                    borderColor: `${r.color}48`,
                    boxShadow: `0 0 36px ${r.color}28, 0 8px 32px rgba(0,0,0,0.7)`,
                  }}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 220, damping: 22 }}
                  whileHover={{
                    scale: 1.06,
                    transition: { duration: 0.14 },
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <HudCorners color={r.color} size={12} opacity={0.75} />
                  <span
                    className="text-6xl mb-3 animate-float"
                    style={{ animationDelay: `${i * 0.3}s`, filter: `drop-shadow(0 0 16px ${r.color}80)` }}
                  >
                    {r.emoji}
                  </span>
                  <span className="font-display text-base font-bold text-cream tracking-wide">{r.name}</span>
                  <span className="font-display text-xs mt-2 font-bold tracking-[0.2em]" style={{ color: r.color }}>
                    ▶ PLAY NOW
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Earn more — secondary */}
            <div className="text-center mt-4 pb-1">
              <p className="font-body text-cream/30 text-xs mb-2">Want to bank even more first?</p>
              <div className="flex gap-3 justify-center">
                {rewards.map(r => (
                  <button key={r.id} onClick={() => earn(r)}
                    className="font-body text-xs text-cream/35 hover:text-cream/65 border border-cream/12 hover:border-cream/30 px-3 py-1.5 rounded-lg transition-colors">
                    Earn more for {r.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── EARN MODE ───────────────────────────────────────────────────── */
          <motion.div
            key="earn"
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            <div className="text-center mb-5">
              <h1 className="font-display text-cream text-2xl font-bold tracking-wide">Choose your reward</h1>
              <p className="font-body text-cream/45 text-sm mt-1">Pick what you're playing for, then earn the time!</p>
            </div>

            <div className="flex gap-6 justify-center items-center flex-1">
              {rewards.map((r, i) => (
                <motion.button
                  key={r.id}
                  onClick={() => earn(r)}
                  className="relative flex flex-col items-center justify-center glass-card rounded-3xl cursor-pointer select-none"
                  style={{
                    width: 238, height: 282,
                    background: `linear-gradient(155deg, ${r.color}1c, rgba(10,22,40,0.84))`,
                    borderColor: `${r.color}38`,
                    boxShadow: `0 0 28px ${r.color}1e, 0 8px 32px rgba(0,0,0,0.65)`,
                  }}
                  initial={{ opacity: 0, y: 36 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                  whileHover={{
                    scale: 1.05,
                    transition: { duration: 0.14 },
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  <HudCorners color={r.color} size={12} opacity={0.52} />
                  <span
                    className="text-7xl mb-4 animate-float"
                    style={{ animationDelay: `${i * 0.3}s`, filter: `drop-shadow(0 0 20px ${r.color}60)` }}
                  >
                    {r.emoji}
                  </span>
                  <span className="font-display text-xl font-bold text-cream tracking-wide">{r.name}</span>
                  <span className="font-display text-xs mt-2.5 font-bold tracking-[0.2em]" style={{ color: r.color }}>
                    EARN TIME →
                  </span>
                </motion.button>
              ))}
            </div>

            <p className="text-center font-body text-cream/20 text-xs mt-4 pb-1">
              Pick a reward to see your missions
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
