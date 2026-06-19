PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rewards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  emoji      TEXT    NOT NULL DEFAULT '🎮',
  color      TEXT    NOT NULL DEFAULT '#22D3EE',
  active     INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS missions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  icon        TEXT    NOT NULL,
  time_value  INTEGER NOT NULL,
  daily_limit INTEGER NOT NULL DEFAULT 1,
  active      INTEGER NOT NULL DEFAULT 1,
  is_temporary INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at  INTEGER
);

CREATE TABLE IF NOT EXISTS mission_completions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id          INTEGER NOT NULL REFERENCES missions(id),
  started_at          INTEGER NOT NULL,
  completed_at        INTEGER,
  status              TEXT    NOT NULL DEFAULT 'active',
  elapsed_seconds     INTEGER,
  date                TEXT    NOT NULL,
  telegram_message_id TEXT,
  denial_message_id   TEXT,
  parent_action       TEXT,
  parent_name         TEXT,
  deny_reason         TEXT
);

CREATE TABLE IF NOT EXISTS earned_time (
  date    TEXT PRIMARY KEY,
  minutes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reward_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reward_id        INTEGER NOT NULL REFERENCES rewards(id),
  started_at       INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  ended_at         INTEGER,
  date             TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS routines (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT    NOT NULL,
  title      TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS routine_completions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id   INTEGER NOT NULL REFERENCES routines(id),
  date         TEXT    NOT NULL,
  completed_at INTEGER NOT NULL,
  UNIQUE(routine_id, date)
);

-- ── Seed settings ──────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO settings VALUES ('soft_cap_minutes',         '120');
INSERT OR IGNORE INTO settings VALUES ('morning_routine_start',    '05:00');
INSERT OR IGNORE INTO settings VALUES ('evening_routine_start',    '18:30');
INSERT OR IGNORE INTO settings VALUES ('admin_pin_hash',           '');
INSERT OR IGNORE INTO settings VALUES ('telegram_bot_token',       '');
INSERT OR IGNORE INTO settings VALUES ('telegram_chat_id',         '');
INSERT OR IGNORE INTO settings VALUES ('display_name',             'Novah');
INSERT OR IGNORE INTO settings VALUES ('approval_reminder_minutes','15');

-- ── Seed rewards ───────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO rewards (id, name, emoji, color, sort_order) VALUES
  (1, 'TV',     '📺', '#F59E0B', 0),
  (2, 'Switch', '🎮', '#4ADE80', 1),
  (3, 'iPad',   '📱', '#22D3EE', 2);

-- ── Seed missions ──────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO missions (id, title, description, category, icon, time_value, daily_limit) VALUES
  (1,  'Tidy Your Room',              'Make your bed, pick up your clothes, and put things back where they belong.',      'tidy',   '🛏️', 15, 1),
  (2,  'Organize Toys or Legos',      'Sort your toys or Lego pieces and put them away neatly.',                          'tidy',   '🧩', 10, 1),
  (3,  'Wipe Down a Table or Counter','Grab a cloth and wipe a table or counter until it''s clean.',                      'tidy',   '🧹',  5, 2),
  (4,  'Do 20 Jumping Jacks',         'Find a clear spot and do 20 jumping jacks. You got this!',                         'move',   '⚡',  5, 2),
  (5,  'Run 5 Laps in the Yard',      'Head outside and run 5 full laps around the yard.',                                'move',   '🏃',  5, 2),
  (6,  'Quick Stretch Routine',       'Take 10 minutes to stretch out — arms, legs, neck, all of it!',                   'move',   '🤸', 10, 1),
  (7,  'Dance to One Song',           'Pick any song you love and dance to the whole thing. Full energy!',                'move',   '🎵',  5, 2),
  (8,  'Read a Book for 15 Minutes',  'Grab a book you like and read quietly for 15 minutes.',                            'learn',  '📚', 15, 2),
  (9,  'Practice Handwriting',        'Write out the alphabet or copy a few sentences — neat and careful.',               'learn',  '✏️', 10, 1),
  (10, 'Learning App for 20 Minutes', 'Spend 20 minutes on a learning app.',                                              'learn',  '💡', 25, 1),
  (11, 'Draw a Picture',              'Draw anything you want — be as creative as you like!',                             'create', '🎨', 10, 2),
  (12, 'Build Something with Legos',  'Build something awesome with your Legos. No instructions needed!',                 'create', '🏗️', 20, 1),
  (13, 'Write a Short Story',         'Write a story with at least a few sentences. What happens in it?',                 'create', '📝', 20, 1);

-- ── Seed routines ──────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO routines (id, type, title, sort_order) VALUES
  (1, 'morning', 'Get dressed',        0),
  (2, 'morning', 'Fix your hair',      1),
  (3, 'morning', 'Glasses on',         2),
  (4, 'evening', 'Take a bath',        0),
  (5, 'evening', 'Get your pajamas on',1);
