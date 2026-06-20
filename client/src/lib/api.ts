export type AppMode = 'morning' | 'normal' | 'evening';

export interface Reward    { id: number; name: string; emoji: string; color: string; sort_order: number; active?: number }
export interface Mission   { id: number; title: string; description: string; category: string; icon: string; time_value: number; daily_limit: number; is_temporary: boolean; available: boolean; completions_today: number }
export interface Routine   { id: number; type: string; title: string; sort_order: number; active?: number }
export interface Balance   { date: string; minutes: number; softCapMinutes: number }

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  mode:       ()                                    => req<{ mode: AppMode }>('/api/mode'),
  rewards:    ()                                    => req<Reward[]>('/api/rewards'),
  missions:   ()                                    => req<Mission[]>('/api/missions'),
  balance:    ()                                    => req<Balance>('/api/balance'),
  routines:   (type: string)                        => req<{ routines: Routine[]; completedIds: number[] }>(`/api/routines/${type}`),

  startMission:    (id: number)                     => req<{ completionId: number; mission: Mission }>(`/api/missions/${id}/start`, { method: 'POST' }),
  doneMission:     (completionId: number)           => req<{ ok: boolean }>(`/api/missions/completions/${completionId}/done`, { method: 'POST' }),
  completeRoutine: (id: number)                     => req<{ ok: boolean; completedIds: number[]; allDone: boolean; earnedMinutes: number }>(`/api/routines/${id}/complete`, { method: 'POST' }),

  startSession:    (rewardId: number, minutes: number) =>
    req<{ sessionId: number; durationSeconds: number; nearSoftCap: boolean; overSoftCap: boolean }>('/api/sessions/start', {
      method: 'POST', body: JSON.stringify({ rewardId, minutes }),
    }),
  endSession:      (sessionId: number)              => req<{ ok: boolean }>(`/api/sessions/${sessionId}/end`, { method: 'POST' }),

  admin: {
    login:       (pin: string)                      => req<{ ok: boolean }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ pin }) }),
    logout:      ()                                 => req<{ ok: boolean }>('/api/admin/logout', { method: 'POST' }),
    me:          ()                                 => req<{ authed: boolean }>('/api/admin/me'),
    missions:    ()                                 => req<Mission[]>('/api/admin/missions'),
    createMission: (m: Partial<Mission>)            => req<Mission>('/api/admin/missions', { method: 'POST', body: JSON.stringify(m) }),
    updateMission: (id: number, m: Partial<Mission>) => req<{ ok: boolean }>(`/api/admin/missions/${id}`, { method: 'PUT', body: JSON.stringify(m) }),
    deleteMission: (id: number)                     => req<{ ok: boolean }>(`/api/admin/missions/${id}`, { method: 'DELETE' }),
    rewards:     ()                                 => req<Reward[]>('/api/admin/rewards'),
    createReward: (r: Partial<Reward>)              => req<Reward>('/api/admin/rewards', { method: 'POST', body: JSON.stringify(r) }),
    updateReward: (id: number, r: Partial<Reward>) => req<{ ok: boolean }>(`/api/admin/rewards/${id}`, { method: 'PUT', body: JSON.stringify(r) }),
    routines:    ()                                 => req<Routine[]>('/api/admin/routines'),
    createRoutine: (r: Partial<Routine>)            => req<Routine>('/api/admin/routines', { method: 'POST', body: JSON.stringify(r) }),
    updateRoutine: (id: number, r: Partial<Routine>) => req<{ ok: boolean }>(`/api/admin/routines/${id}`, { method: 'PUT', body: JSON.stringify(r) }),
    deleteRoutine: (id: number)                     => req<{ ok: boolean }>(`/api/admin/routines/${id}`, { method: 'DELETE' }),
    settings:    ()                                 => req<Record<string, string>>('/api/admin/settings'),
    saveSettings: (s: Record<string, string>)       => req<{ ok: boolean }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(s) }),
    saveTelegram: (bot_token: string, chat_id: string) => req<{ ok: boolean }>('/api/admin/settings/telegram', { method: 'PUT', body: JSON.stringify({ bot_token, chat_id }) }),
    history:     ()                                 => req<Record<string, unknown>[]>('/api/admin/history'),
  },
};
