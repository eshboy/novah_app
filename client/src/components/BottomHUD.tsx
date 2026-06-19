import { useEffect, useState } from 'react';
import { AppMode, Balance } from '../lib/api';

interface Props { balance: Balance; mode: AppMode }

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function BottomHUD({ balance, mode }: Props) {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const hasBalance = balance.minutes > 0;

  return (
    <div
      className="flex-shrink-0 relative z-20 flex items-center px-5 h-9"
      style={{
        background:   'rgba(10,22,40,0.82)',
        backdropFilter: 'blur(20px)',
        borderTop:    '1px solid rgba(34,211,238,0.18)',
        animation:    'hud-glow 4s ease-in-out infinite',
      }}
    >
      {/* Left — system label */}
      <div className="flex items-center gap-1.5 flex-1">
        <span className="font-display text-cyan tracking-widest uppercase"
          style={{ fontSize: 8, letterSpacing: '0.18em' }}>
          {mode === 'morning' ? '☀️  MORNING MODE' : mode === 'evening' ? '🌙  EVENING MODE' : '⚡  MISSION CONTROL'}
        </span>
      </div>

      {/* Center — clock */}
      <div className="font-display text-cream tracking-widest" style={{ fontSize: 13 }}>
        {time}
      </div>

      {/* Right — balance badge */}
      <div className="flex-1 flex justify-end">
        {hasBalance ? (
          <div
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(74,222,128,0.12)',
              border:     '1px solid rgba(74,222,128,0.35)',
            }}
          >
            <span className="font-display text-green font-bold" style={{ fontSize: 10 }}>
              {balance.minutes}
            </span>
            <span className="font-body text-green/70" style={{ fontSize: 9 }}>MIN BANKED</span>
          </div>
        ) : (
          <span className="font-display text-cream/25" style={{ fontSize: 10 }}>0 MIN</span>
        )}
      </div>
    </div>
  );
}
