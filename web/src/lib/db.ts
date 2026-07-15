import Database from "better-sqlite3";
import { getDataPaths } from "@/lib/paths";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    storage_name TEXT NOT NULL UNIQUE,
    thumbnail_name TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    extension TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    created_at TEXT NOT NULL,
    deleted_at TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
    rating INTEGER NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
    perceptual_hash TEXT,
    group_id TEXT REFERENCES groups(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS images_created_idx ON images(created_at DESC, id DESC);
  CREATE INDEX IF NOT EXISTS images_group_idx ON images(group_id);

  CREATE TABLE IF NOT EXISTS keywords (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS image_keywords (
    image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    keyword_id TEXT NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (image_id, keyword_id)
  );
  CREATE INDEX IF NOT EXISTS image_keywords_keyword_idx ON image_keywords(keyword_id);
`;

declare global {
  var __shentujiDb: Database.Database | undefined;
}

export function openDatabase(filename: string) {
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  migrateImages(db);
  return db;
}

function migrateImages(db: Database.Database) {
  const columns = new Set(
    (db.prepare("PRAGMA table_info(images)").all() as Array<{ name: string }>).map(
      (column) => column.name,
    ),
  );
  const statements: string[] = [];
  if (!columns.has("deleted_at")) statements.push("ALTER TABLE images ADD COLUMN deleted_at TEXT");
  if (!columns.has("is_favorite")) {
    statements.push(
      "ALTER TABLE images ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1))",
    );
  }
  if (!columns.has("rating")) {
    statements.push(
      "ALTER TABLE images ADD COLUMN rating INTEGER NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5)",
    );
  }
  if (!columns.has("perceptual_hash")) {
    statements.push("ALTER TABLE images ADD COLUMN perceptual_hash TEXT");
  }
  if (statements.length) db.transaction(() => statements.forEach((sql) => db.exec(sql)))();
  db.exec(`
    CREATE INDEX IF NOT EXISTS images_deleted_idx ON images(deleted_at, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS images_favorite_idx ON images(is_favorite, deleted_at, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS images_perceptual_hash_idx ON images(perceptual_hash);
  `);
}

export function getDb() {
  if (!global.__shentujiDb) {
    global.__shentujiDb = openDatabase(getDataPaths().database);
  }
  return global.__shentujiDb;
}

export function hasAdmin() {
  return Boolean(getDb().prepare("SELECT 1 FROM admins WHERE id = 1").get());
}
