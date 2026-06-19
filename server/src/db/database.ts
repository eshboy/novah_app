import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../../data');
const DB_PATH  = path.join(DATA_DIR, 'novah.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  _db.exec(schema);
  seedAdminPin(_db);
  process.on('exit', () => _db?.close());
  return _db;
}

function seedAdminPin(db: Database.Database) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_pin_hash') as { value: string } | undefined;
  if (!row?.value) {
    const hash = bcrypt.hashSync('1234', 10);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('admin_pin_hash', hash);
  }
}

export function getSetting(key: string): string {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? '';
}

export function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
