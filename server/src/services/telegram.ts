import TelegramBot from 'node-telegram-bot-api';
import { Server } from 'socket.io';
import { getDb, getSetting, setSetting, localDate } from '../db/database';
import { Mission, MissionCompletion, ServerToClientEvents, ClientToServerEvents } from '../types';

let bot: TelegramBot | null = null;
let ioRef: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

// In-memory state for pending mission-add conversations
const pendingMissionText = new Map<number, string>(); // userId → task text awaiting minutes

export function getBot(): TelegramBot | null { return bot; }

export function setupTelegram(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  ioRef = io;
  const token = getSetting('telegram_bot_token');
  if (!token) {
    console.warn('[Telegram] No bot token configured — skipping setup. Set via admin panel.');
    return;
  }
  initBot(token);
}

let pollOffset = 0;
let pollActive = false;

export function initBot(token: string) {
  if (bot) { try { bot.stopPolling(); } catch {} bot = null; }
  pollActive = false;

  bot = new TelegramBot(token, { polling: false });

  console.log('[Telegram] Bot started (manual polling).');
  pollActive = true;
  manualPoll(token);
}

async function manualPoll(token: string) {
  while (pollActive) {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${pollOffset}&timeout=10&allowed_updates=${encodeURIComponent('["message","callback_query"]')}`;
      const res  = await (fetch as typeof fetch)(url);
      const data = await res.json() as { ok: boolean; result: any[] };
      if (data.ok) {
        for (const update of data.result) {
          pollOffset = update.update_id + 1;
          if (update.callback_query) {
            handleCallback(update.callback_query as TelegramBot.CallbackQuery).catch(e =>
              console.error('[Telegram] handleCallback error:', e)
            );
          } else if (update.message) {
            const msg = update.message as TelegramBot.Message;
            if (msg.chat.type === 'private' && msg.text?.startsWith('/start')) {
              console.log(`[Telegram] /start from ${msg.from?.first_name} — chat_id: ${msg.chat.id}`);
              bot!.sendMessage(msg.chat.id, `👋 Hi ${msg.from?.first_name ?? 'there'}! You're connected to Novah's Mission Control. You'll receive mission approval requests here.`);
            }
            handleGroupMessage(msg);
          }
        }
      }
    } catch (e: any) {
      console.error('[Telegram] Poll error:', e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getChatIds(): string[] {
  const raw = getSetting('telegram_chat_id') ?? '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

// ── Outbound: send approval request ──────────────────────────────────────────

export async function sendApprovalRequest(
  completionId: number,
  mission: Mission,
  elapsedSeconds: number
): Promise<number | null> {
  const chatIds = getChatIds();
  if (!bot || chatIds.length === 0) return null;
  const chatId = chatIds[0];

  const mins    = Math.floor(elapsedSeconds / 60);
  const secs    = elapsedSeconds % 60;
  const elapsed = elapsedSeconds < 30 ? `⚠️ ${elapsedSeconds}s (very quick!)` : `${mins}m ${secs}s`;
  const isFast  = elapsedSeconds < 30;

  const text = [
    `🚀 *Mission Complete!*`,
    ``,
    `*${escMd(mission.title)}*`,
    `⏱ Time taken: ${elapsed}`,
    `🏆 Earns: *${mission.time_value} min* of play time`,
    isFast ? `\n⚠️ _Completed very quickly — check in before approving!_` : '',
  ].filter(Boolean).join('\n');

  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Approve', callback_data: `approve:${completionId}` },
      { text: '❌ Deny',    callback_data: `deny:${completionId}` },
    ]],
  };

  // Send to primary chat and get message_id; send silently to others
  const msg = await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
  for (const id of chatIds.slice(1)) {
    bot.sendMessage(id, text, { parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
  }

  return msg.message_id;
}

export async function notifyRoutineComplete(type: 'morning' | 'evening') {
  const chatIds = getChatIds();
  if (!bot || chatIds.length === 0) return;
  const label = type === 'morning' ? '☀️ Morning' : '🌙 Evening';
  const text = `${label} routine complete! Novah checked everything off. 🎉`;
  for (const id of chatIds) bot.sendMessage(id, text).catch(() => {});
}

export async function sendApprovalReminder(completionId: number) {
  const chatIds = getChatIds();
  if (!bot || chatIds.length === 0) return;
  const chatId = chatIds[0];
  const db         = getDb();
  const completion = db.prepare('SELECT * FROM mission_completions WHERE id = ?').get(completionId) as MissionCompletion | undefined;
  if (!completion || completion.status !== 'pending') return;
  const mission    = db.prepare('SELECT title FROM missions WHERE id = ?').get(completion.mission_id) as { title: string };
  await bot.sendMessage(chatId, `⏰ *Reminder:* "${escMd(mission.title)}" is still waiting for your approval!`, { parse_mode: 'Markdown' });
}

// ── Inbound: group messages ───────────────────────────────────────────────────

async function handleGroupMessage(msg: TelegramBot.Message) {
  if (!msg.text || msg.chat.type === 'private') return;
  const chatId = getSetting('telegram_chat_id');
  if (!chatId || String(msg.chat.id) !== chatId) return;

  const text      = msg.text.trim();
  const userId    = msg.from?.id ?? 0;
  const firstName = msg.from?.first_name ?? 'Parent';

  // Ignore bot commands
  if (text.startsWith('/')) return;

  // Check if this is a reply to a denial message (adding a reason)
  if (msg.reply_to_message) {
    await handleDenialReply(msg, chatId, firstName);
    return;
  }

  // Pattern: "task name 20" or "task name 20min" or "task name 20 min"
  const withMinutes = text.match(/^(.+?)\s+(\d+)\s*(?:min(?:utes?)?)?$/i);
  if (withMinutes) {
    const taskText = withMinutes[1].trim();
    const minutes  = Number(withMinutes[2]);
    if (minutes >= 1 && minutes <= 120) {
      await createTextMission(taskText, minutes, chatId, firstName);
      return;
    }
  }

  // No number — ask for it
  const hasPending = pendingMissionText.has(userId);
  if (!hasPending) {
    // Check if it looks like a task (not just a chat message)
    // Only respond to messages that could plausibly be tasks (not short conversational texts)
    if (text.length > 3 && !text.includes('?')) {
      pendingMissionText.set(userId, text);
      await bot!.sendMessage(
        chatId,
        `Got it! How many minutes should "*${escMd(text)}*" earn? Reply with the number (e.g. \`15\`)`,
        { parse_mode: 'Markdown', reply_to_message_id: msg.message_id }
      );
    }
    return;
  }

  // Previous message was a pending task text — see if this is just a number
  const justNumber = text.match(/^(\d+)$/);
  if (justNumber && hasPending) {
    const minutes  = Number(justNumber[1]);
    const taskText = pendingMissionText.get(userId)!;
    pendingMissionText.delete(userId);
    if (minutes >= 1 && minutes <= 120) {
      await createTextMission(taskText, minutes, chatId, firstName);
    } else {
      await bot!.sendMessage(chatId, 'Please use a number between 1 and 120 minutes.');
    }
  }
}

async function createTextMission(title: string, minutes: number, chatId: string, addedBy: string) {
  const db = getDb();
  const capitalised = title.charAt(0).toUpperCase() + title.slice(1);

  const result = db.prepare(`
    INSERT INTO missions (title, description, category, icon, time_value, daily_limit, is_temporary)
    VALUES (?, ?, 'special', '⭐', ?, 1, 1)
  `).run(capitalised, `${addedBy} added this mission just for you!`, minutes);

  const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(result.lastInsertRowid) as Mission;
  ioRef?.to('display').emit('missionAdded', { ...mission, active: true, is_temporary: true });

  await bot!.sendMessage(
    chatId,
    `✅ *Mission added!*\n*${escMd(capitalised)}* — earns ${minutes} min\nIt's live for Novah now!`,
    { parse_mode: 'Markdown' }
  );
}

async function handleDenialReply(msg: TelegramBot.Message, chatId: string, firstName: string) {
  if (!msg.reply_to_message?.text) return;

  // Find denial message ID in DB
  const replyToId  = msg.reply_to_message.message_id;
  const completion = getDb().prepare(
    "SELECT * FROM mission_completions WHERE denial_message_id = ? AND status = 'denied'"
  ).get(String(replyToId)) as MissionCompletion | undefined;

  if (!completion) return;

  const reason = msg.text?.trim();
  if (!reason) return;

  getDb().prepare('UPDATE mission_completions SET deny_reason = ? WHERE id = ?').run(reason, completion.id);
  ioRef?.to('display').emit('missionDenied', {
    completionId: completion.id,
    missionTitle: '',
    reason,
  });

  await bot!.sendMessage(chatId, `📝 Note added for Novah: "${reason}"`, { reply_to_message_id: replyToId });
}

// ── Callback handler ──────────────────────────────────────────────────────────

async function handleCallback(query: TelegramBot.CallbackQuery) {
  console.log('[Telegram] callback_query received:', query.data, 'from', query.from.first_name);
  if (!query.data || !ioRef) return;
  try { await bot!.answerCallbackQuery(query.id); } catch(e) { console.error('[Telegram] answerCallbackQuery failed:', e); }

  const [action, idStr] = query.data.split(':');
  const completionId    = Number(idStr);
  const parentName      = query.from.first_name ?? 'A parent';
  const chatIds         = getChatIds();
  const chatId          = chatIds[0] ?? null;
  const msgId           = query.message?.message_id;

  const db         = getDb();
  const completion = db.prepare('SELECT * FROM mission_completions WHERE id = ?').get(completionId) as MissionCompletion | undefined;

  if (!completion || completion.status !== 'pending') {
    if (msgId && chatId) {
      await bot!.editMessageText('_(Already acted on)_', {
        chat_id: chatId, message_id: msgId, parse_mode: 'Markdown',
      }).catch(() => {});
    }
    return;
  }

  const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(completion.mission_id) as Mission;
  const date    = completion.date;

  if (action === 'approve') {
    db.prepare("UPDATE mission_completions SET status='approved', parent_action='approved', parent_name=? WHERE id=?")
      .run(parentName, completionId);
    db.prepare(`
      INSERT INTO earned_time (date, minutes) VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET minutes = minutes + excluded.minutes
    `).run(date, mission.time_value);

    const { minutes } = db.prepare('SELECT minutes FROM earned_time WHERE date = ?').get(date) as { minutes: number };

    ioRef.to('display').emit('missionApproved', {
      completionId, missionTitle: mission.title, minutes: mission.time_value, parentName,
    });
    ioRef.to('display').emit('balanceUpdate', { minutes, date });

    if (msgId && chatId) {
      await bot!.editMessageText(
        `✅ *Approved by ${escMd(parentName)}*\n*${escMd(mission.title)}* (+${mission.time_value} min)`,
        { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown' }
      ).catch(() => {});
    }

  } else if (action === 'deny') {
    db.prepare("UPDATE mission_completions SET status='denied', parent_action='denied', parent_name=? WHERE id=?")
      .run(parentName, completionId);

    ioRef.to('display').emit('missionDenied', { completionId, missionTitle: mission.title });

    if (msgId && chatId) {
      const denialText = `❌ *Denied by ${escMd(parentName)}*\n*${escMd(mission.title)}*\n\n_Reply to this message to add a note for Novah._`;
      const editedMsg  = await bot!.editMessageText(denialText, {
        chat_id: chatId, message_id: msgId, parse_mode: 'Markdown',
      }).catch(() => null);

      if (editedMsg && typeof editedMsg !== 'boolean') {
        db.prepare('UPDATE mission_completions SET denial_message_id = ? WHERE id = ?')
          .run(String(editedMsg.message_id), completionId);
      }
    }
  }
}

function escMd(s: string): string {
  return s.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
