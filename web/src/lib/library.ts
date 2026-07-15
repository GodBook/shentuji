import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { getDb } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { normalizeKeyword, normalizeKeywords } from "@/lib/keywords";
import type { GroupItem, ImageFilters, ImageItem, ImageListResult } from "@/lib/types";

type SqlValue = string | number | null;

type ImageRow = {
  id: string;
  originalName: string;
  mimeType: ImageItem["mimeType"];
  byteSize: number;
  width: number;
  height: number;
  createdAt: string;
  groupId: string | null;
  groupName: string | null;
  storageName: string;
  thumbnailName: string;
  extension: string;
};

export type StoredImageRow = ImageRow;

function displayGroupName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeGroupName(value: string) {
  return displayGroupName(value).toLocaleLowerCase("en-US");
}

export function listGroups(): GroupItem[] {
  return getDb()
    .prepare(
      `SELECT g.id, g.name, g.created_at AS createdAt, COUNT(i.id) AS count
       FROM groups g
       LEFT JOIN images i ON i.group_id = g.id
       GROUP BY g.id
       ORDER BY g.name COLLATE NOCASE ASC`,
    )
    .all() as GroupItem[];
}

export function getLibraryStats() {
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN group_id IS NULL THEN 1 ELSE 0 END), 0) AS ungrouped
       FROM images`,
    )
    .get() as { total: number; ungrouped: number };
}

export function createGroup(name: string) {
  const db = getDb();
  const displayName = displayGroupName(name);
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO groups (id, name, normalized_name, created_at) VALUES (?, ?, ?, ?)",
  ).run(id, displayName, normalizeGroupName(displayName), new Date().toISOString());
  return listGroups().find((group) => group.id === id)!;
}

export function getOrCreateGroup(name: string) {
  const normalized = normalizeGroupName(name);
  const existing = getDb()
    .prepare("SELECT id FROM groups WHERE normalized_name = ?")
    .get(normalized) as { id: string } | undefined;
  return existing?.id ?? createGroup(name).id;
}

export function renameGroup(id: string, name: string) {
  const displayName = displayGroupName(name);
  const result = getDb()
    .prepare("UPDATE groups SET name = ?, normalized_name = ? WHERE id = ?")
    .run(displayName, normalizeGroupName(displayName), id);
  if (!result.changes) throw new HttpError(404, "分组不存在");
  return listGroups().find((group) => group.id === id)!;
}

export function deleteGroup(id: string) {
  const db = getDb();
  const remove = db.transaction(() => {
    db.prepare("UPDATE images SET group_id = NULL WHERE group_id = ?").run(id);
    const result = db.prepare("DELETE FROM groups WHERE id = ?").run(id);
    if (!result.changes) throw new HttpError(404, "分组不存在");
  });
  remove();
}

export function assertGroupExists(groupId: string | null | undefined) {
  if (!groupId) return;
  const exists = getDb().prepare("SELECT 1 FROM groups WHERE id = ?").get(groupId);
  if (!exists) throw new HttpError(400, "所选分组不存在");
}

function encodeCursor(row: ImageRow) {
  return Buffer.from(JSON.stringify([row.createdAt, row.id])).toString("base64url");
}

function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === "string" &&
      typeof value[1] === "string"
    ) {
      return value as [string, string];
    }
  } catch {
    // Invalid cursors are treated as the first page.
  }
  return null;
}

function buildFilter(filters: ImageFilters, includeCursor: boolean) {
  const clauses: string[] = [];
  const values: SqlValue[] = [];

  if (filters.groupId === null) {
    clauses.push("i.group_id IS NULL");
  } else if (filters.groupId) {
    clauses.push("i.group_id = ?");
    values.push(filters.groupId);
  }

  for (const keyword of normalizeKeywords(filters.keywords ?? [])) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM image_keywords fik
        JOIN keywords fk ON fk.id = fik.keyword_id
        WHERE fik.image_id = i.id AND fk.normalized_name = ?
      )`,
    );
    values.push(keyword.normalized);
  }

  if (includeCursor) {
    const cursor = decodeCursor(filters.cursor);
    if (cursor) {
      clauses.push("(i.created_at < ? OR (i.created_at = ? AND i.id < ?))");
      values.push(cursor[0], cursor[0], cursor[1]);
    }
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

function hydrateImages(rows: ImageRow[], db: Database.Database = getDb()): ImageItem[] {
  if (!rows.length) return [];
  const placeholders = rows.map(() => "?").join(",");
  const keywordRows = db
    .prepare(
      `SELECT ik.image_id AS imageId, k.name
       FROM image_keywords ik
       JOIN keywords k ON k.id = ik.keyword_id
       WHERE ik.image_id IN (${placeholders})
       ORDER BY k.name COLLATE NOCASE ASC`,
    )
    .all(...rows.map((row) => row.id)) as Array<{ imageId: string; name: string }>;
  const keywordMap = new Map<string, string[]>();
  for (const keyword of keywordRows) {
    keywordMap.set(keyword.imageId, [
      ...(keywordMap.get(keyword.imageId) ?? []),
      keyword.name,
    ]);
  }

  return rows.map((row) => ({
    id: row.id,
    originalName: row.originalName,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt,
    group:
      row.groupId && row.groupName ? { id: row.groupId, name: row.groupName } : null,
    keywords: keywordMap.get(row.id) ?? [],
    thumbnailUrl: `/api/media/${row.id}?variant=thumbnail`,
    originalUrl: `/api/media/${row.id}?variant=original`,
  }));
}

const IMAGE_SELECT = `
  SELECT i.id, i.original_name AS originalName, i.mime_type AS mimeType,
    i.byte_size AS byteSize, i.width, i.height, i.created_at AS createdAt,
    i.group_id AS groupId, g.name AS groupName, i.storage_name AS storageName,
    i.thumbnail_name AS thumbnailName, i.extension
  FROM images i
  LEFT JOIN groups g ON g.id = i.group_id
`;

export function listImages(filters: ImageFilters = {}): ImageListResult {
  const db = getDb();
  const limit = Math.min(100, Math.max(1, filters.limit ?? 40));
  const baseFilter = buildFilter(filters, false);
  const pageFilter = buildFilter(filters, true);
  const total = (
    db
      .prepare(`SELECT COUNT(*) AS count FROM images i ${baseFilter.where}`)
      .get(...baseFilter.values) as { count: number }
  ).count;
  const rows = db
    .prepare(
      `${IMAGE_SELECT} ${pageFilter.where}
       ORDER BY i.created_at DESC, i.id DESC LIMIT ?`,
    )
    .all(...pageFilter.values, limit + 1) as ImageRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: hydrateImages(pageRows, db),
    total,
    nextCursor: hasMore ? encodeCursor(pageRows[pageRows.length - 1]) : null,
  };
}

export function listImageIds(filters: ImageFilters = {}) {
  const query = buildFilter(filters, false);
  const rows = getDb()
    .prepare(
      `SELECT i.id FROM images i ${query.where}
       ORDER BY i.created_at DESC, i.id DESC LIMIT 10000`,
    )
    .all(...query.values) as Array<{ id: string }>;
  return rows.map((row) => row.id);
}

export function getImagesByIds(ids?: string[]) {
  const db = getDb();
  let rows: ImageRow[];
  if (ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(",");
    rows = db
      .prepare(`${IMAGE_SELECT} WHERE i.id IN (${placeholders}) ORDER BY i.created_at DESC`)
      .all(...ids) as ImageRow[];
  } else {
    rows = db.prepare(`${IMAGE_SELECT} ORDER BY i.created_at DESC, i.id DESC`).all() as ImageRow[];
  }
  return hydrateImages(rows, db);
}

export function getStoredImage(id: string) {
  return getDb()
    .prepare(`${IMAGE_SELECT} WHERE i.id = ?`)
    .get(id) as StoredImageRow | undefined;
}

function ensureKeyword(
  db: Database.Database,
  keyword: { name: string; normalized: string },
) {
  db.prepare(
    "INSERT INTO keywords (id, name, normalized_name) VALUES (?, ?, ?) ON CONFLICT(normalized_name) DO NOTHING",
  ).run(crypto.randomUUID(), keyword.name, keyword.normalized);
  return (
    db.prepare("SELECT id FROM keywords WHERE normalized_name = ?").get(keyword.normalized) as {
      id: string;
    }
  ).id;
}

export function replaceImageKeywords(
  db: Database.Database,
  imageId: string,
  values: readonly string[],
) {
  db.prepare("DELETE FROM image_keywords WHERE image_id = ?").run(imageId);
  for (const keyword of normalizeKeywords(values)) {
    const keywordId = ensureKeyword(db, keyword);
    db.prepare("INSERT OR IGNORE INTO image_keywords (image_id, keyword_id) VALUES (?, ?)").run(
      imageId,
      keywordId,
    );
  }
  db.prepare(
    "DELETE FROM keywords WHERE NOT EXISTS (SELECT 1 FROM image_keywords WHERE keyword_id = keywords.id)",
  ).run();
}

export type InsertImageInput = {
  id: string;
  storageName: string;
  thumbnailName: string;
  originalName: string;
  mimeType: ImageItem["mimeType"];
  extension: string;
  byteSize: number;
  width: number;
  height: number;
  createdAt: string;
  groupId: string | null;
  keywords: string[];
};

export function insertImage(input: InsertImageInput) {
  const db = getDb();
  assertGroupExists(input.groupId);
  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO images (
        id, storage_name, thumbnail_name, original_name, mime_type, extension,
        byte_size, width, height, created_at, group_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.id,
      input.storageName,
      input.thumbnailName,
      input.originalName,
      input.mimeType,
      input.extension,
      input.byteSize,
      input.width,
      input.height,
      input.createdAt,
      input.groupId,
    );
    replaceImageKeywords(db, input.id, input.keywords);
  });
  insert();
  return getImagesByIds([input.id])[0];
}

export function updateImage(
  id: string,
  update: { keywords?: string[]; groupId?: string | null },
) {
  const db = getDb();
  const exists = db.prepare("SELECT 1 FROM images WHERE id = ?").get(id);
  if (!exists) throw new HttpError(404, "图片不存在");
  assertGroupExists(update.groupId);
  const apply = db.transaction(() => {
    if (update.groupId !== undefined) {
      db.prepare("UPDATE images SET group_id = ? WHERE id = ?").run(update.groupId, id);
    }
    if (update.keywords !== undefined) replaceImageKeywords(db, id, update.keywords);
  });
  apply();
  return getImagesByIds([id])[0];
}

export function removeImageDatabaseRecord(id: string) {
  const db = getDb();
  const result = db.prepare("DELETE FROM images WHERE id = ?").run(id);
  if (!result.changes) throw new HttpError(404, "图片不存在");
  db.prepare(
    "DELETE FROM keywords WHERE NOT EXISTS (SELECT 1 FROM image_keywords WHERE keyword_id = keywords.id)",
  ).run();
}

export function addKeywordsToImages(ids: string[], values: string[]) {
  const db = getDb();
  const keywords = normalizeKeywords(values);
  const apply = db.transaction(() => {
    for (const id of ids) {
      for (const keyword of keywords) {
        const keywordId = ensureKeyword(db, keyword);
        db.prepare(
          "INSERT OR IGNORE INTO image_keywords (image_id, keyword_id) VALUES (?, ?)",
        ).run(id, keywordId);
      }
    }
  });
  apply();
}

export function removeKeywordsFromImages(ids: string[], values: string[]) {
  const normalized = normalizeKeywords(values).map((item) => item.normalized);
  if (!normalized.length) return;
  const db = getDb();
  const idSlots = ids.map(() => "?").join(",");
  const keywordSlots = normalized.map(() => "?").join(",");
  db.prepare(
    `DELETE FROM image_keywords
     WHERE image_id IN (${idSlots})
       AND keyword_id IN (SELECT id FROM keywords WHERE normalized_name IN (${keywordSlots}))`,
  ).run(...ids, ...normalized);
  db.prepare(
    "DELETE FROM keywords WHERE NOT EXISTS (SELECT 1 FROM image_keywords WHERE keyword_id = keywords.id)",
  ).run();
}

export function moveImages(ids: string[], groupId: string | null) {
  assertGroupExists(groupId);
  if (!ids.length) return;
  const placeholders = ids.map(() => "?").join(",");
  getDb().prepare(`UPDATE images SET group_id = ? WHERE id IN (${placeholders})`).run(
    groupId,
    ...ids,
  );
}

export function listKeywordSuggestions(query: string) {
  const normalized = normalizeKeyword(query);
  const escaped = normalized.replace(/[\\%_]/g, "\\$&");
  return getDb()
    .prepare(
      `SELECT k.name, COUNT(ik.image_id) AS count
       FROM keywords k
       LEFT JOIN image_keywords ik ON ik.keyword_id = k.id
       WHERE k.normalized_name LIKE ? ESCAPE '\\'
       GROUP BY k.id
       ORDER BY count DESC, k.name COLLATE NOCASE ASC
       LIMIT 12`,
    )
    .all(`%${escaped}%`) as Array<{ name: string; count: number }>;
}
