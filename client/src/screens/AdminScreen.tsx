import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { sound } from '../lib/sound';

// ── PIN numpad ────────────────────────────────────────────────────────────────

function PinPad({ onSuccess }: { onSuccess: () => void }) {
  const [digits, setDigits] = useState('');
  const [error,  setError]  = useState(false);
  const [shake,  setShake]  = useState(false);

  async function submit(pin: string) {
    try {
      await api.admin.login(pin);
      sound.approve();
      onSuccess();
    } catch {
      sound.deny();
      setError(true);
      setShake(true);
      setDigits('');
      setTimeout(() => { setError(false); setShake(false); }, 1200);
    }
  }

  function press(d: string) {
    if (digits.length >= 6) return;
    sound.tap();
    const next = digits + d;
    setDigits(next);
    if (next.length >= 4) submit(next);
  }

  function del() {
    sound.tap();
    setDigits(d => d.slice(0, -1));
  }

  const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <p className="font-display text-cyan/60 text-xs uppercase tracking-widest mb-2">Admin Access</p>
      <h2 className="font-display text-cream text-2xl font-bold mb-8">Enter PIN</h2>

      {/* Dots */}
      <motion.div
        className="flex gap-4 mb-8"
        animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
        transition={{ duration: 0.3 }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${
            i < digits.length
              ? error ? 'border-red-400 bg-red-400' : 'border-cyan bg-cyan'
              : 'border-cream/30'
          }`} />
        ))}
      </motion.div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {PAD.map((key, i) => (
          key === '' ? <div key={i} /> :
          <motion.button
            key={i}
            onClick={() => key === '⌫' ? del() : press(key)}
            className={`w-20 h-16 rounded-2xl font-display text-2xl font-bold transition-colors ${
              key === '⌫'
                ? 'border border-cream/20 text-cream/50 hover:border-cream/50 hover:text-cream/80'
                : 'border border-cyan/30 text-cream bg-navy-800/80 hover:border-cyan/70 hover:bg-navy-700'
            }`}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.9 }}
          >
            {key}
          </motion.button>
        ))}
      </div>

      {error && (
        <motion.p
          className="font-body text-red-400 text-sm mt-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          Wrong PIN — try again
        </motion.p>
      )}

      <button
        onClick={() => window.history.back()}
        className="mt-10 font-body text-cream/30 hover:text-cream/50 text-sm transition-colors"
      >
        ← Back
      </button>
    </motion.div>
  );
}

// ── Admin tabs ────────────────────────────────────────────────────────────────

type Tab = 'missions' | 'rewards' | 'routines' | 'settings' | 'history';

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('missions');

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'missions',  label: 'Missions',  emoji: '🚀' },
    { id: 'rewards',   label: 'Rewards',   emoji: '🏆' },
    { id: 'routines',  label: 'Routines',  emoji: '📋' },
    { id: 'settings',  label: 'Settings',  emoji: '⚙️' },
    { id: 'history',   label: 'History',   emoji: '📊' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-cyan/20 bg-navy-800/90 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-cyan text-sm tracking-widest uppercase">Mission Control Admin</span>
        </div>
        <button
          onClick={onLogout}
          className="font-body text-cream/40 hover:text-cream/70 text-xs border border-cream/15 hover:border-cream/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          Lock
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 py-2 border-b border-cyan/15 bg-navy-800/60 flex-shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-body text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-cyan/20 text-cyan border border-cyan/30'
                : 'text-cream/50 hover:text-cream/80 hover:bg-cream/5'
            }`}
          >
            <span>{t.emoji}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          {tab === 'missions'  && <MissionsTab  key="missions"  />}
          {tab === 'rewards'   && <RewardsTab   key="rewards"   />}
          {tab === 'routines'  && <RoutinesTab  key="routines"  />}
          {tab === 'settings'  && <SettingsTab  key="settings"  />}
          {tab === 'history'   && <HistoryTab   key="history"   />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Missions tab ──────────────────────────────────────────────────────────────

function MissionsTab() {
  const [missions, setMissions] = useState<any[]>([]);
  const [editing,  setEditing]  = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => api.admin.missions().then(setMissions).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function del(id: number) {
    await api.admin.deleteMission(id);
    load();
  }

  async function save(data: any) {
    if (data.id) {
      await api.admin.updateMission(data.id, data);
    } else {
      await api.admin.createMission(data);
    }
    setEditing(null);
    setCreating(false);
    load();
  }

  if (editing || creating) {
    return <MissionForm initial={editing} onSave={save} onCancel={() => { setEditing(null); setCreating(false); }} />;
  }

  return (
    <TabFade>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-cream text-base">Missions</h3>
        <button onClick={() => setCreating(true)}
          className="font-body text-sm text-navy bg-cyan px-4 py-1.5 rounded-xl font-bold hover:bg-cyan/80 transition-colors">
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {missions.map(m => (
          <div key={m.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${m.active ? 'border-cyan/20 bg-navy-800/60' : 'border-cream/10 bg-navy-800/30 opacity-50'}`}>
            <span className="text-xl">{m.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-body text-cream text-sm font-semibold truncate">{m.title}</p>
              <p className="font-body text-cream/40 text-xs">{m.category} · +{m.time_value}min · {m.daily_limit}×/day{m.is_temporary ? ' · temp' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(m)} className="font-body text-xs text-cyan/70 hover:text-cyan px-2 py-1 rounded-lg hover:bg-cyan/10 transition-colors">Edit</button>
              <button onClick={() => del(m.id)} className="font-body text-xs text-red-400/70 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-400/10 transition-colors">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </TabFade>
  );
}

function MissionForm({ initial, onSave, onCancel }: { initial: any; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    id: initial?.id, title: initial?.title ?? '', description: initial?.description ?? '',
    category: initial?.category ?? 'tidy', icon: initial?.icon ?? '⭐',
    time_value: initial?.time_value ?? 10, daily_limit: initial?.daily_limit ?? 1,
    active: initial?.active ?? true,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <TabFade>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-cream text-base">{initial ? 'Edit Mission' : 'New Mission'}</h3>
        <button onClick={onCancel} className="font-body text-cream/40 hover:text-cream/70 text-sm">Cancel</button>
      </div>
      <div className="space-y-3 max-w-lg">
        <Field label="Title">
          <input value={form.title} onChange={e => set('title', e.target.value)}
            className="admin-input" placeholder="Mission title" />
        </Field>
        <Field label="Description (kid-friendly)">
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            className="admin-input h-20 resize-none" placeholder="What to do, in simple words" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Icon (emoji)">
            <input value={form.icon} onChange={e => set('icon', e.target.value)}
              className="admin-input text-center text-2xl" maxLength={4} />
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={e => set('category', e.target.value)} className="admin-input">
              {['tidy','move','learn','create','special'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Active">
            <select value={form.active ? '1' : '0'} onChange={e => set('active', e.target.value === '1')} className="admin-input">
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Time value (min)">
            <input type="number" min={1} max={120} value={form.time_value} onChange={e => set('time_value', Number(e.target.value))} className="admin-input" />
          </Field>
          <Field label="Daily limit (×)">
            <input type="number" min={1} max={10} value={form.daily_limit} onChange={e => set('daily_limit', Number(e.target.value))} className="admin-input" />
          </Field>
        </div>
        <button onClick={() => onSave(form)}
          className="w-full mt-2 py-3 rounded-xl font-display text-navy font-bold bg-cyan hover:bg-cyan/80 transition-colors">
          Save Mission
        </button>
      </div>
    </TabFade>
  );
}

// ── Rewards tab ───────────────────────────────────────────────────────────────

function RewardsTab() {
  const [rewards, setRewards] = useState<any[]>([]);
  const load = useCallback(() => api.admin.rewards().then(setRewards).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function toggle(r: any) {
    await api.admin.updateReward(r.id, { active: r.active ? 0 : 1 });
    load();
  }

  return (
    <TabFade>
      <h3 className="font-display text-cream text-base mb-4">Reward Catalog</h3>
      <div className="space-y-2 max-w-sm">
        {rewards.map(r => (
          <div key={r.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${r.active ? 'border-cyan/20 bg-navy-800/60' : 'border-cream/10 bg-navy-800/30 opacity-50'}`}>
            <span className="text-2xl">{r.emoji}</span>
            <span className="font-body text-cream font-semibold flex-1">{r.name}</span>
            <button onClick={() => toggle(r)}
              className={`font-body text-xs px-3 py-1 rounded-lg border transition-colors ${
                r.active
                  ? 'border-red-400/40 text-red-400/70 hover:bg-red-400/10 hover:text-red-400'
                  : 'border-green/40 text-green/70 hover:bg-green/10 hover:text-green'
              }`}>
              {r.active ? 'Disable' : 'Enable'}
            </button>
          </div>
        ))}
      </div>
      <p className="font-body text-cream/30 text-xs mt-4">Disable a reward to hide it from Novah without deleting it.</p>
    </TabFade>
  );
}

// ── Routines tab ──────────────────────────────────────────────────────────────

function RoutinesTab() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [adding, setAdding]     = useState<'morning'|'evening'|null>(null);
  const [newTitle, setNewTitle] = useState('');
  const load = useCallback(() => api.admin.routines().then(setRoutines).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function addItem() {
    if (!newTitle.trim() || !adding) return;
    await api.admin.createRoutine({ type: adding, title: newTitle.trim() });
    setNewTitle(''); setAdding(null); load();
  }

  async function toggleItem(r: any) {
    await api.admin.updateRoutine(r.id, { active: r.active ? 0 : 1 });
    load();
  }

  const morning = routines.filter(r => r.type === 'morning');
  const evening = routines.filter(r => r.type === 'evening');

  function Section({ title, emoji, items, type }: { title: string; emoji: string; items: any[]; type: 'morning'|'evening' }) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display text-cream/80 text-sm">{emoji} {title}</h4>
          <button onClick={() => setAdding(type)}
            className="font-body text-xs text-cyan/70 hover:text-cyan px-2 py-1 rounded-lg border border-cyan/20 hover:border-cyan/50 transition-colors">
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {items.map(r => (
            <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${r.active ? 'border-cyan/20 bg-navy-800/50' : 'border-cream/10 opacity-50'}`}>
              <span className="font-body text-cream flex-1 text-sm">{r.title}</span>
              <button onClick={() => toggleItem(r)}
                className="font-body text-xs text-cream/30 hover:text-cream/60 transition-colors">
                {r.active ? 'Remove' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
        {adding === type && (
          <div className="flex gap-2 mt-2">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="admin-input flex-1" placeholder="New checklist item" autoFocus
              onKeyDown={e => e.key === 'Enter' && addItem()} />
            <button onClick={addItem} className="px-4 py-2 rounded-xl bg-cyan text-navy font-bold text-sm">Add</button>
            <button onClick={() => { setAdding(null); setNewTitle(''); }} className="px-3 py-2 rounded-xl text-cream/40 text-sm">Cancel</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <TabFade>
      <h3 className="font-display text-cream text-base mb-4">Daily Routines</h3>
      <Section title="Morning Routine" emoji="☀️" items={morning} type="morning" />
      <Section title="Evening Routine" emoji="🌙" items={evening} type="evening" />
    </TabFade>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved,    setSaved]     = useState(false);
  const [newPin,   setNewPin]    = useState('');
  const [tgToken,  setTgToken]   = useState('');
  const [tgChatId, setTgChatId]  = useState('');

  useEffect(() => {
    api.admin.settings().then(s => { setSettings(s); setTgChatId(s.telegram_chat_id ?? ''); }).catch(() => {});
  }, []);

  async function saveSettings() {
    const payload: Record<string, string> = { ...settings };
    if (newPin) payload.admin_pin = newPin;
    await api.admin.saveSettings(payload);
    if (tgToken || tgChatId) await api.admin.saveTelegram(tgToken, tgChatId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const set = (k: string, v: string) => setSettings(s => ({ ...s, [k]: v }));

  return (
    <TabFade>
      <h3 className="font-display text-cream text-base mb-5">Settings</h3>
      <div className="space-y-4 max-w-md">
        <Field label="Display name (Novah's name)">
          <input value={settings.display_name ?? ''} onChange={e => set('display_name', e.target.value)} className="admin-input" />
        </Field>
        <Field label="Daily soft cap (minutes)">
          <input type="number" min={30} max={480} value={settings.soft_cap_minutes ?? '120'} onChange={e => set('soft_cap_minutes', e.target.value)} className="admin-input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Morning routine starts">
            <input type="time" value={settings.morning_routine_start ?? '05:00'} onChange={e => set('morning_routine_start', e.target.value)} className="admin-input" />
          </Field>
          <Field label="Evening routine starts">
            <input type="time" value={settings.evening_routine_start ?? '18:30'} onChange={e => set('evening_routine_start', e.target.value)} className="admin-input" />
          </Field>
        </div>
        <Field label="Approval reminder (minutes)">
          <input type="number" min={5} max={60} value={settings.approval_reminder_minutes ?? '15'} onChange={e => set('approval_reminder_minutes', e.target.value)} className="admin-input" />
        </Field>

        <div className="border-t border-cyan/15 pt-4">
          <p className="font-display text-cream/50 text-xs uppercase tracking-widest mb-3">Telegram</p>
          <Field label="Bot token (from BotFather)">
            <input value={tgToken} onChange={e => setTgToken(e.target.value)}
              className="admin-input font-mono text-xs" placeholder="Leave blank to keep existing" />
          </Field>
          <Field label="Group chat ID">
            <input value={tgChatId} onChange={e => setTgChatId(e.target.value)}
              className="admin-input font-mono text-xs" placeholder="-100xxxxxxxxxx" />
          </Field>
        </div>

        <div className="border-t border-cyan/15 pt-4">
          <p className="font-display text-cream/50 text-xs uppercase tracking-widest mb-3">Security</p>
          <Field label="New admin PIN (leave blank to keep current)">
            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)}
              className="admin-input" placeholder="4+ digits" maxLength={8} />
          </Field>
        </div>

        <button onClick={saveSettings}
          className="w-full py-3 rounded-xl font-display text-navy font-bold bg-cyan hover:bg-cyan/80 transition-colors">
          {saved ? '✅ Saved!' : 'Save Settings'}
        </button>

        <ClearBalanceButton />
      </div>
    </TabFade>
  );
}

function ClearBalanceButton() {
  const [done, setDone] = useState(false);
  async function clear() {
    if (!confirm('Reset today\'s balance to 0?')) return;
    await fetch('/api/admin/balance/clear', { method: 'POST' });
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }
  return (
    <button onClick={clear}
      className="w-full py-3 rounded-xl font-display font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors mt-2">
      {done ? '✅ Balance cleared' : '🗑 Clear Today\'s Balance'}
    </button>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.admin.history().then(setRows).catch(() => {}); }, []);

  return (
    <TabFade>
      <h3 className="font-display text-cream text-base mb-4">Recent History</h3>
      <div className="space-y-2">
        {rows.length === 0 && <p className="font-body text-cream/40 text-sm">No history yet.</p>}
        {rows.map((r: any) => {
          const dt = r.completed_at ? new Date(r.completed_at * 1000) : null;
          return (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-cyan/15 bg-navy-800/50">
              <div className="flex-1 min-w-0">
                <p className="font-body text-cream text-sm font-semibold truncate">{r.title}</p>
                <p className="font-body text-cream/40 text-xs">
                  {dt ? dt.toLocaleString() : '—'} · {r.elapsed_seconds ? `${Math.floor(r.elapsed_seconds/60)}m ${r.elapsed_seconds%60}s` : '?'}
                </p>
              </div>
              <span className={`font-body text-xs px-2 py-1 rounded-lg border ${
                r.status === 'approved' ? 'border-green/40 text-green bg-green/10' :
                r.status === 'denied'   ? 'border-red-400/40 text-red-400 bg-red-400/10' :
                r.status === 'pending'  ? 'border-gold/40 text-gold bg-gold/10' :
                'border-cream/20 text-cream/50'
              }`}>
                {r.status}
              </span>
              {r.parent_name && <span className="font-body text-cream/40 text-xs">{r.parent_name}</span>}
            </div>
          );
        })}
      </div>
    </TabFade>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function TabFade({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="font-body text-cream/50 text-xs uppercase tracking-wider block mb-1">{label}</label>
      {children}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    api.admin.me().then(r => setAuthed(r.authed)).catch(() => setAuthed(false));
  }, []);

  async function logout() {
    await api.admin.logout();
    setAuthed(false);
  }

  if (authed === null) return null;

  return (
    <motion.div
      className="w-full h-full bg-navy/95 backdrop-blur"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait">
        {authed
          ? <AdminPanel key="panel" onLogout={logout} />
          : <PinPad     key="pin"   onSuccess={() => setAuthed(true)} />
        }
      </AnimatePresence>
    </motion.div>
  );
}
