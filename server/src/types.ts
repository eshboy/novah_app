export interface Reward {
  id: number;
  name: string;
  emoji: string;
  color: string;
  active: boolean;
  sort_order: number;
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  category: string;
  icon: string;
  time_value: number;
  daily_limit: number;
  active: boolean;
  is_temporary: boolean;
  created_at: number;
  expires_at: number | null;
  completions_today?: number;
}

export interface MissionCompletion {
  id: number;
  mission_id: number;
  started_at: number;
  completed_at: number | null;
  status: 'active' | 'pending' | 'approved' | 'denied';
  elapsed_seconds: number | null;
  date: string;
  telegram_message_id: string | null;
  denial_message_id: string | null;
  parent_action: string | null;
  parent_name: string | null;
  deny_reason: string | null;
}

export interface Routine {
  id: number;
  type: 'morning' | 'evening';
  title: string;
  sort_order: number;
  active: boolean;
}

export interface RoutineCompletion {
  id: number;
  routine_id: number;
  date: string;
  completed_at: number;
}

export type AppMode = 'morning' | 'normal' | 'evening';

// Socket.io event maps
export interface ServerToClientEvents {
  missionApproved: (data: { completionId: number; missionTitle: string; minutes: number; parentName: string }) => void;
  missionDenied:   (data: { completionId: number; missionTitle: string; reason?: string }) => void;
  missionAdded:    (mission: Mission) => void;
  balanceUpdate:   (data: { minutes: number; date: string }) => void;
  routineUpdate:   (data: { type: string; completedIds: number[] }) => void;
  modeChange:      (mode: AppMode) => void;
}

export interface ClientToServerEvents {
  subscribe: () => void;
}
