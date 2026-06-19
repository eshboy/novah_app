import { useEffect, useRef } from 'react';

const W = 1024, H = 600;

interface Star {
  x: number; y: number; r: number;
  vx: number; vy: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

function mkStar(minR: number, maxR: number, maxSpeed: number, minA: number, maxA: number): Star {
  return {
    x:            Math.random() * W,
    y:            Math.random() * H,
    r:            minR + Math.random() * (maxR - minR),
    vx:           (Math.random() - 0.5) * maxSpeed,
    vy:           (Math.random() - 0.5) * maxSpeed * 0.5,
    baseOpacity:  minA + Math.random() * (maxA - minA),
    twinkleSpeed: 0.4 + Math.random() * 1.2,
    twinklePhase: Math.random() * Math.PI * 2,
  };
}

export default function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 3 depth layers
    const bg  = Array.from({ length: 40 }, () => mkStar(0.4, 0.8, 0.09,  0.2, 0.4));
    const mid = Array.from({ length: 30 }, () => mkStar(0.8, 1.4, 0.18,  0.4, 0.7));
    const fg  = Array.from({ length: 10 }, () => mkStar(1.5, 2.5, 0.28,  0.7, 1.0));
    const all = [...bg, ...mid, ...fg];

    let raf: number;

    function draw() {
      const t = performance.now() / 1000;
      ctx!.clearRect(0, 0, W, H);

      // Nebula blob — cyan top-right
      const gnCyan = ctx!.createRadialGradient(820, 80, 0, 820, 80, 300);
      gnCyan.addColorStop(0,   'rgba(34,211,238,0.04)');
      gnCyan.addColorStop(0.5, 'rgba(34,211,238,0.018)');
      gnCyan.addColorStop(1,   'transparent');
      ctx!.fillStyle = gnCyan;
      ctx!.fillRect(520, 0, 504, 380);

      // Nebula blob — gold bottom-left
      const gnGold = ctx!.createRadialGradient(160, 520, 0, 160, 520, 320);
      gnGold.addColorStop(0,   'rgba(245,158,11,0.038)');
      gnGold.addColorStop(0.5, 'rgba(245,158,11,0.015)');
      gnGold.addColorStop(1,   'transparent');
      ctx!.fillStyle = gnGold;
      ctx!.fillRect(0, 280, 420, 320);

      // Draw stars
      for (const s of all) {
        const twinkle  = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        const opacity  = s.baseOpacity * (0.6 + 0.4 * twinkle);

        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(245,239,224,${opacity.toFixed(3)})`;
        ctx!.fill();

        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -2) s.x = W + 2;
        if (s.x > W + 2) s.x = -2;
        if (s.y < -2) s.y = H + 2;
        if (s.y > H + 2) s.y = -2;
      }

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
