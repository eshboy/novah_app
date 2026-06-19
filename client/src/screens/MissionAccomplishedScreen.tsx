import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Balance } from '../lib/api';

interface Props { balance: Balance }
interface LocationState { minutes: number; parentName: string }

const PARTICLE_COUNT = 28;
const COLORS = ['#22D3EE', '#4ADE80', '#F59E0B', '#F5EFE0', '#C084FC'];

export default function MissionAccomplishedScreen({ balance }: Props) {
  const { completionId, rewardId } = useParams<{ completionId: string; rewardId: string }>();
  const navigate                   = useNavigate();
  const location                   = useLocation();
  const state                      = (location.state ?? {}) as Partial<LocationState>;
  const canvasRef                  = useRef<HTMLCanvasElement>(null);
  const [mission]                  = useState(() => {
    const s = sessionStorage.getItem(`mission_${completionId}`);
    return s ? JSON.parse(s) as { title: string; icon: string; time_value: number } : null;
  });

  const minutes    = state.minutes ?? mission?.time_value ?? 0;
  const parentName = state.parentName ?? 'Your parent';

  // Particle burst
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    if (!ctx) return;

    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 2.5 + Math.random() * 5.5;
      return {
        x: 512, y: 280,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        color: COLORS[i % COLORS.length],
        r: 1.5 + Math.random() * 3.5,
      };
    });

    let raf: number;
    function draw() {
      ctx!.clearRect(0, 0, 1024, 564);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.1;
        p.life -= 0.011;
        if (p.life <= 0) continue;
        alive = true;
        ctx!.globalAlpha = p.life;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      if (alive) raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => navigate('/'), 8000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center h-full text-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* White flash */}
      <motion.div
        className="absolute inset-0 bg-white pointer-events-none"
        style={{ zIndex: 50 }}
        initial={{ opacity: 0.88 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      <canvas
        ref={canvasRef}
        width={1024}
        height={564}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Expanding ring */}
        <motion.div
          className="absolute rounded-full border-2 border-green/50 pointer-events-none"
          style={{ width: 200, height: 200 }}
          initial={{ scale: 0.4, opacity: 1 }}
          animate={{ scale: 3.4, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        <motion.p
          className="font-display text-green text-sm uppercase tracking-[0.28em] mb-4 text-glow-green"
          initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, type: 'spring', stiffness: 200, damping: 18 }}
        >
          ⚡ Mission Accomplished
        </motion.p>

        <motion.div
          className="text-8xl mb-4"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 320, damping: 14 }}
        >
          {mission?.icon ?? '🏆'}
        </motion.div>

        <motion.h1
          className="font-display text-cream text-4xl font-bold mb-2 text-glow-cyan"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
        >
          Amazing, Novah! 🎉
        </motion.h1>

        <motion.p
          className="font-body text-cream/60 text-lg mb-7"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.52 }}
        >
          {parentName} approved it!
        </motion.p>

        {/* Badge */}
        <motion.div
          className="flex items-center gap-4 px-8 py-4 rounded-2xl border border-green/40 bg-green/10 mb-8 card-glow-green"
          initial={{ scale: 0.75, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.62, type: 'spring', stiffness: 260, damping: 18 }}
        >
          <span className="text-3xl">⏱</span>
          <div className="text-left">
            <span className="font-display text-green text-3xl font-bold text-glow-green">+{minutes} min</span>
            <p className="font-body text-cream/50 text-sm">added to your balance</p>
          </div>
          <div className="ml-4 pl-4 border-l border-cream/18 text-left">
            <span className="font-display text-cyan text-2xl font-bold">{balance.minutes}</span>
            <p className="font-body text-cream/50 text-sm">total banked</p>
          </div>
        </motion.div>

        <motion.button
          onClick={() => navigate(`/missions/${rewardId}`)}
          className="px-10 py-3 rounded-xl font-display text-navy font-bold tracking-widest text-sm"
          style={{ background: 'linear-gradient(135deg, #22D3EE, #4ADE80)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.82 }}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        >
          Do Another Mission
        </motion.button>
      </div>
    </motion.div>
  );
}
