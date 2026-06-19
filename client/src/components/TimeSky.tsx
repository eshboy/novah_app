import { useEffect, useState } from 'react';

function skyGradient(hour: number): string {
  if (hour < 5)  return 'from-[#020818] to-[#0A1628]';              // night
  if (hour < 7)  return 'from-[#1a0a2e] via-[#c2410c44] to-[#0A1628]'; // pre-dawn
  if (hour < 9)  return 'from-[#b45309] via-[#0f2942] to-[#0A1628]'; // sunrise
  if (hour < 17) return 'from-[#0A1628] to-[#0e2a52]';              // day
  if (hour < 19) return 'from-[#7c2d12] via-[#1e1b4b] to-[#0A1628]'; // dusk
  if (hour < 21) return 'from-[#1e1b4b] to-[#0A1628]';              // evening
  return 'from-[#020818] to-[#0A1628]';                              // night
}

export default function TimeSky() {
  const [grad, setGrad] = useState(skyGradient(new Date().getHours()));

  useEffect(() => {
    const id = setInterval(() => setGrad(skyGradient(new Date().getHours())), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`absolute inset-0 bg-gradient-to-b ${grad} pointer-events-none transition-all duration-[60000ms]`}
      style={{ zIndex: 0, opacity: 0.7 }}
    />
  );
}
