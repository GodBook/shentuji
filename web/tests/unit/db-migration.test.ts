import path from "node:path";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";

describe("database migration", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it("adds recycle bin, favorite, rating and perceptual hash columns to an existing database", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "shentuji-migration-"));
    roots.push(root);
    const filename = path.join(root, "library.sqlite");
    const legacy = new Database(filename);
    legacy.exec(`
      CREATE TABLE images (
        id TEXT PRIMARY KEY, storage_name TEXT NOT NULL UNIQUE, thumbnail_name TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL, mime_type TEXT NOT NULL, extension TEXT NOT NULL,
        byte_size INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
        created_at TEXT NOT NULL, group_id TEXT
      );
      INSERT INTO images VALUES ('legacy', 'legacy.png', 'legacy.webp', 'legacy.png', 'image/png', 'png', 1, 1, 1, '2026-01-01T00:00:00.000Z', NULL);
    `);
    legacy.close();

    const migrated = openDatabase(filename);
    const columns = (migrated.prepare("PRAGMA table_info(images)").all() as Array<{ name: string }>).map((column) => column.name);
    expect(columns).toEqual(expect.arrayContaining(["deleted_at", "is_favorite", "rating", "perceptual_hash"]));
    expect(migrated.prepare("SELECT deleted_at, is_favorite, rating, perceptual_hash FROM images WHERE id = 'legacy'").get()).toEqual({
      deleted_at: null,
      is_favorite: 0,
      rating: 0,
      perceptual_hash: null,
    });
    migrated.close();
  });
});
