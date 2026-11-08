-- Space Game | ساختار دیتابیس (SQLite)
-- با اولین اجرای سرور خودکار ساخته می‌شود؛ می‌توانی مستقیم هم اجرایش کنی:
--   sqlite3 data/space-game.db < database/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- قیمت‌ها به تومان. هر ظرفیت اگر خالی (NULL) باشد یعنی برای این بازی موجود نیست
CREATE TABLE IF NOT EXISTS games (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  platform    TEXT    NOT NULL DEFAULT 'PS5',
  description TEXT    NOT NULL DEFAULT '',
  image       TEXT,
  price_cap1  INTEGER CHECK (price_cap1 IS NULL OR price_cap1 > 0),
  price_cap2  INTEGER CHECK (price_cap2 IS NULL OR price_cap2 > 0),
  price_cap3  INTEGER CHECK (price_cap3 IS NULL OR price_cap3 > 0),
  available   INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0,1)),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (price_cap1 IS NOT NULL OR price_cap2 IS NOT NULL OR price_cap3 IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_games_available ON games(available, id);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
