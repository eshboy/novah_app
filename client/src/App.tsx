import { useEffect, useRef, useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { socket } from './lib/socket';
import { api, AppMode, Balance } from './lib/api';
import StarField from './components/StarField';
import TimeSky from './components/TimeSky';
import BottomHUD from './components/BottomHUD';
import RewardsScreen from './screens/RewardsScreen';
import MissionsScreen from './screens/MissionsScreen';
import MissionDetailScreen from './screens/MissionDetailScreen';
import ActiveMissionScreen from './screens/ActiveMissionScreen';
import PendingApprovalScreen from './screens/PendingApprovalScreen';
import MissionAccomplishedScreen from './screens/MissionAccomplishedScreen';
import EarnedPlayScreen from './screens/EarnedPlayScreen';
import MorningRoutineScreen from './screens/MorningRoutineScreen';
import EveningRoutineScreen from './screens/EveningRoutineScreen';
import AdminScreen from './screens/AdminScreen';

const CORNER_TAP_TARGET = 80;
const CORNER_TAP_COUNT  = 3;
const CORNER_TAP_WINDOW = 1500;

export default function App() {
  const navigate              = useNavigate();
  const location              = useLocation();
  const [mode, setMode]       = useState<AppMode>('normal');
  const [balance, setBalance] = useState<Balance>({ date: '', minutes: 0, softCapMinutes: 120 });
  const cornerTaps            = useRef<number[]>([]);

  useEffect(() => {
    api.mode().then(r => setMode(r.mode)).catch(() => {});
    api.balance().then(setBalance).catch(() => {});
  }, []);

  useEffect(() => {
    socket.on('modeChange', (m) => {
      setMode(m);
      const idle = ['/', '/morning', '/evening'].includes(location.pathname) ||
                   location.pathname.startsWith('/missions') ||
                   location.pathname.startsWith('/mission/') ||
                   location.pathname.startsWith('/accomplished');
      if (!idle) return;
      if (m === 'morning') navigate('/morning');
      if (m === 'evening' && !location.pathname.startsWith('/admin')) navigate('/evening');
    });
    socket.on('balanceUpdate', (data) => {
      setBalance(prev => ({ ...prev, minutes: data.minutes, date: data.date }));
    });
    return () => { socket.off('modeChange'); socket.off('balanceUpdate'); };
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (location.pathname !== '/') return;
    if (mode === 'morning') navigate('/morning');
    else if (mode === 'evening') navigate('/evening');
  }, [mode, navigate, location.pathname]);

  const handleCornerClick = useCallback((e: React.MouseEvent) => {
    if (e.clientX < window.innerWidth - CORNER_TAP_TARGET) return;
    if (e.clientY > CORNER_TAP_TARGET) return;
    const now = Date.now();
    cornerTaps.current = [...cornerTaps.current, now].filter(t => now - t < CORNER_TAP_WINDOW);
    if (cornerTaps.current.length >= CORNER_TAP_COUNT) {
      cornerTaps.current = [];
      navigate('/admin');
    }
  }, [navigate]);

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-navy flex flex-col"
      onClick={handleCornerClick}
    >
      {/* Background layers — absolutely positioned, don't affect flex */}
      <StarField />
      <TimeSky />
      <div className="nebula-1 absolute pointer-events-none" style={{ zIndex: 1 }} />
      <div className="nebula-2 absolute pointer-events-none" style={{ zIndex: 1 }} />
      <div className="scanlines absolute inset-0 pointer-events-none" style={{ zIndex: 2 }} />

      {/* Content area — fills all space above the HUD bar */}
      <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"          element={<RewardsScreen balance={balance} mode={mode} />} />
            <Route path="/missions/:rewardId" element={<MissionsScreen balance={balance} />} />
            <Route path="/mission/:missionId/:rewardId" element={<MissionDetailScreen />} />
            <Route path="/active/:completionId/:rewardId" element={<ActiveMissionScreen />} />
            <Route path="/pending/:completionId/:rewardId" element={<PendingApprovalScreen />} />
            <Route path="/accomplished/:completionId/:rewardId" element={<MissionAccomplishedScreen balance={balance} />} />
            <Route path="/play/:rewardId" element={<EarnedPlayScreen balance={balance} onBalanceUpdate={setBalance} />} />
            <Route path="/morning" element={<MorningRoutineScreen />} />
            <Route path="/evening" element={<EveningRoutineScreen />} />
            <Route path="/admin/*" element={<AdminScreen />} />
          </Routes>
        </AnimatePresence>
      </div>

      {/* Persistent 36px bottom HUD */}
      <BottomHUD balance={balance} mode={mode} />
    </div>
  );
}
