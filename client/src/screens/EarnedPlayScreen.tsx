import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, Balance, Reward } from '../lib/api';
import { sound } from '../lib/sound';
import HudCorners from '../components/HudCorners';

interface Props { balance: Balance; onBalanceUpdate: (b: Balance) => void }

const BASE_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

function buildTimeOptions(availableMinutes: number): number[] {
  const opts = BASE_OPTIONS.filter(m => m <= availableMinutes);
  if (opts.length === 0 && availableMinutes > 0) return [availableMinutes];
  if (!BASE_OPTIONS.includes(availableMinutes) && availableMinutes > 0) opts.push(availableMinutes);
  return opts;
}

export default function EarnedPlayScreen({ balance }: Props) {
  const { rewardId }              = useParams<{ rewardId: string }>();
  const navigate                  = useNavigate();
  const [reward, setReward]       = useState<Reward | null>(null);
  const [chosen, setChosen]       = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning]     = useState(false);
  const [done, setDone]           = useState(false);
  const [nearCap, setNearCap]     = useState(false);
  const endTimeRef                = useRef<number>(0);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.rewards().then(rs => setReward(rs.find(r => r.id === Number(rewardId)) ?? null)).catch(() => {});
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [rewardId]);

  async function startPlay(mins: number) {
    if (mins > balance.minutes) return;
    sound.tap();
    setChosen(mins);
    try {
      const res = await api.startSession(Number(rewardId), mins);
      setSessionId(res.sessionId);
      setNearCap(res.nearSoftCap || res.overSoftCap);
      endTimeRef.current = Date.now() + res.durationSeconds * 1000;
      setRemaining(res.durationSeconds);
      setRunning(true);
      intervalRef.current = setInterval(() => {
        const left = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        setRemaining(left);
        if (left <= 0) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setDone(true);
          sound.timerDone();
          api.endSession(res.sessionId).catch(() => {});
        }
      }, 1000);
    } catch { setChosen(null); }
  }

  async function stopEarly() {
    if (!sessionId) return;
    sound.tap();
    clearInterval(intervalRef.current!);
    await api.endSession(sessionId);
    setRunning(false);
    setDone(true);
  }

  const mins       = Math.floor(remaining / 60);
  const secs       = remaining % 60;
  const pct        = chosen ? remaining / (chosen * 60) : 0;
  const timeOptions = buildTimeOptions(balance.minutes);
  const isLow      = remaining <= 60 && running;
  const rewardColor = reward?.color ?? '#22D3EE';

  /* ── Time selection ────────────────────────────────────────── */
  if (!running && !done) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-full px-12 text-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <span
          className="text-7xl mb-4"
          style={{ filter: `drop-shadow(0 0 20px ${rewardColor}60)` }}
        >
          {reward?.emoji ?? '🎮'}
        </span>
        <h2 className="font-display text-cream text-2xl font-bold mb-1">
          Time for {reward?.name ?? 'play'}!
        </h2>
        <p className="font-body text-cream/60 mb-1">
          You have <span className="text-green font-bold">{balance.minutes} minutes</span> banked.
        </p>
        <p className="font-body text-cream/42 text-sm mb-8">How long do you want to play?</p>

        {timeOptions.length === 0 ? (
          <div className="text-center">
            <p className="font-body text-cream/50 mb-4">Need at least 1 minute. Earn some time first!</p>
            <button onClick={() => navigate('/')}
              className="font-display text-cyan border border-cyan/40 px-6 py-3 rounded-xl hover:bg-cyan/10 transition-colors text-sm tracking-widest">
              Back to Mission Control
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {timeOptions.map(m => {
              const isAll = !BASE_OPTIONS.includes(m);
              return (
                <motion.button
                  key={m}
                  onClick={() => startPlay(m)}
                  className="relative flex flex-col items-center justify-center glass-card rounded-2xl cursor-pointer"
                  style={{
                    width:       88,
                    height:      96,
                    borderColor: isAll ? 'rgba(245,158,11,0.5)' : 'rgba(34,211,238,0.25)',
                  }}
                  whileHover={{ scale: 1.08, transition: { duration: 0.11 } }}
                  whileTap={{ scale: 0.94 }}
                >
                  {isAll && <HudCorners color="#F59E0B" size={8} opacity={0.7} thickness={1.5} />}
                  <span
                    className="font-display font-bold leading-none"
                    style={{ fontSize: 28, color: isAll ? '#F59E0B' : '#22D3EE' }}
                  >
                    {m}
                  </span>
                  <span className="font-body text-cream/45 text-xs mt-1">
                    {isAll ? 'all min' : 'min'}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}

        <button onClick={() => navigate('/')}
          className="font-body text-cream/30 hover:text-cream/60 text-sm transition-colors">
          ← Go back
        </button>
      </motion.div>
    );
  }

  /* ── Done ─────────────────────────────────────────────────── */
  if (done) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-full text-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <div className="text-7xl mb-4 animate-float">{reward?.emoji ?? '🎮'}</div>
        <h2 className="font-display text-cream text-3xl font-bold mb-2 text-glow-gold">
          {remaining === 0 ? "Time's up!" : 'Done playing!'}
        </h2>
        <p className="font-body text-cream/60 text-lg mb-8">
          Great session, Novah! Hope you had fun. 🙌
        </p>
        <motion.button
          onClick={() => navigate('/')}
          className="px-10 py-4 rounded-2xl font-display text-navy font-bold text-xl tracking-widest"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #4ADE80)' }}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        >
          Back to Mission Control
        </motion.button>
      </motion.div>
    );
  }

  /* ── Active countdown ─────────────────────────────────────── */
  const R           = 90;
  const dashArr     = 2 * Math.PI * R;
  const dashOffset  = dashArr * (1 - pct);
  const strokeColor = isLow ? '#F59E0B' : '#22D3EE';
  const glowColor   = isLow ? 'rgba(245,158,11,0.6)' : 'rgba(34,211,238,0.45)';

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {nearCap && (
        <motion.div
          className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full border border-gold/40 bg-gold/10"
          animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 3 }}
        >
          <p className="font-body text-gold text-sm">🌟 You've had a great screen day!</p>
        </motion.div>
      )}

      <span
        className="text-5xl mb-7"
        style={{ filter: `drop-shadow(0 0 16px ${rewardColor}60)` }}
      >
        {reward?.emoji ?? '🎮'}
      </span>

      {/* Circular timer */}
      <div className="relative w-52 h-52 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100" cy="100" r={R}
            fill="none"
            stroke={`${strokeColor}18`}
            strokeWidth="10"
          />
          <motion.circle
            cx="100" cy="100" r={R}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={dashArr}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.9, ease: 'linear' }}
            style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display font-bold leading-none"
            style={{ fontSize: 42, color: isLow ? '#F59E0B' : '#F5EFE0' }}
          >
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <span className="font-display text-cream/32 text-[9px] uppercase tracking-[0.25em] mt-1.5">remaining</span>
        </div>
      </div>

      <p className="font-body text-cream/55 text-sm mb-8">
        Enjoy your <span className="text-cream/80">{reward?.name}</span> time!
      </p>

      <button
        onClick={stopEarly}
        className="font-body text-cream/28 hover:text-cream/60 text-sm border border-cream/10 hover:border-cream/30 px-6 py-2 rounded-xl transition-colors"
      >
        Stop early
      </button>
    </motion.div>
  );
}
