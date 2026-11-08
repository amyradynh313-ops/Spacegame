'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const cfg = require('./config');

fs.mkdirSync(path.dirname(cfg.dbFile), { recursive: true });
fs.mkdirSync(cfg.uploadsDir, { recursive: true });

const db = new DatabaseSync(cfg.dbFile);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');
db.exec(fs.readFileSync(path.join(cfg.root, 'database', 'schema.sql'), 'utf8'));

const toGame = (r) => r && ({
  id: Number(r.id),
  name: r.name,
  platform: r.platform,
  description: r.description,
  image: r.image || null,
  prices: { 1: r.price_cap1, 2: r.price_cap2, 3: r.price_cap3 },
  available: !!r.available,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const S = {
  gamesPublic: db.prepare('SELECT * FROM games ORDER BY available DESC, id DESC'),
  gamesAdmin: db.prepare('SELECT * FROM games ORDER BY id DESC'),
  gameById: db.prepare('SELECT * FROM games WHERE id = ?'),
  gameInsert: db.prepare(
    'INSERT INTO games (name, platform, description, image, price_cap1, price_cap2, price_cap3, available) VALUES (?,?,?,?,?,?,?,?)'),
  gameUpdate: db.prepare(
    "UPDATE games SET name=?, platform=?, description=?, image=?, price_cap1=?, price_cap2=?, price_cap3=?, available=?, updated_at=datetime('now') WHERE id=?"),
  gameDelete: db.prepare('DELETE FROM games WHERE id = ?'),
  gameCount: db.prepare('SELECT COUNT(*) AS n FROM games'),

  userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userInsert: db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)'),
  userList: db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id DESC'),
  userSetPass: db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
  adminExists: db.prepare("SELECT 1 AS x FROM users WHERE role = 'admin' LIMIT 1"),

  sessInsert: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)'),
  sessFind: db.prepare(
    'SELECT u.id, u.username, u.role, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?'),
  sessDelete: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  sessDeleteUserExcept: db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?'),
  sessDeleteUser: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
  sessPurge: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),

  metaGet: db.prepare('SELECT value FROM meta WHERE key = ?'),
  metaSet: db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
};

const orNull = (v) => (v == null ? null : v);

const games = {
  listPublic: () => S.gamesPublic.all().map(toGame),
  listAdmin: () => S.gamesAdmin.all().map(toGame),
  get: (id) => toGame(S.gameById.get(id)),
  count: () => Number(S.gameCount.get().n),
  create: (g) => Number(S.gameInsert.run(
    g.name, g.platform, g.description, orNull(g.image),
    orNull(g.prices[1]), orNull(g.prices[2]), orNull(g.prices[3]), g.available ? 1 : 0).lastInsertRowid),
  update: (id, g) => S.gameUpdate.run(
    g.name, g.platform, g.description, orNull(g.image),
    orNull(g.prices[1]), orNull(g.prices[2]), orNull(g.prices[3]), g.available ? 1 : 0, id).changes > 0,
  remove: (id) => S.gameDelete.run(id).changes > 0,
};

const users = {
  byName: (n) => S.userByName.get(n),
  byId: (id) => S.userById.get(id),
  create: (username, hash, role = 'user') => Number(S.userInsert.run(username, hash, role).lastInsertRowid),
  list: () => S.userList.all(),
  setPassword: (id, hash) => S.userSetPass.run(hash, id),
  adminExists: () => !!S.adminExists.get(),
};

const sessions = {
  create: (hash, userId, expiresAt) => S.sessInsert.run(hash, userId, expiresAt),
  find: (hash) => {
    const r = S.sessFind.get(hash);
    if (!r) return null;
    if (r.expires_at < Date.now()) { S.sessDelete.run(hash); return null; }
    return { id: Number(r.id), username: r.username, role: r.role };
  },
  remove: (hash) => S.sessDelete.run(hash),
  removeOthers: (userId, keepHash) => S.sessDeleteUserExcept.run(userId, keepHash),
  removeAll: (userId) => S.sessDeleteUser.run(userId),
  purge: () => S.sessPurge.run(Date.now()),
};

const meta = {
  get: (k) => { const r = S.metaGet.get(k); return r ? r.value : null; },
  set: (k, v) => S.metaSet.run(k, String(v)),
};

// بازی‌های نمونه (فقط یک‌بار، برای دیدن ظاهر سایت). از پنل ادمین حذفشان کن
function seedDemo() {
  if (meta.get('demo_seeded')) return;
  if (games.count() === 0) {
    const demo = [
      ['God of War Ragnarök', 'PS5', 'این یک آیتم نمونه است؛ از پنل مدیریت ویرایش یا حذفش کن.\nماجراجویی سینمایی کریتوس و آترئوس.', { 1: 1900000, 2: 1500000, 3: 1200000 }],
      ['Spider-Man 2', 'PS5', 'این یک آیتم نمونه است؛ از پنل مدیریت ویرایش یا حذفش کن.\nدو مرد عنکبوتی در نیویورک.', { 1: 2100000, 2: 1700000, 3: 1400000 }],
      ['EA FC 25', 'PS4 و PS5', 'این یک آیتم نمونه است؛ از پنل مدیریت ویرایش یا حذفش کن.\nفوتبال با تیم‌ها و لیگ‌های جدید.', { 1: null, 2: 1300000, 3: 1000000 }],
    ];
    for (const [name, platform, description, prices] of demo) {
      games.create({ name, platform, description, image: null, prices, available: true });
    }
  }
  meta.set('demo_seeded', '1');
}

module.exports = { db, games, users, sessions, meta, seedDemo };
