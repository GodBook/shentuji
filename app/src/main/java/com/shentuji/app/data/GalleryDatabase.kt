package com.shentuji.app.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.shentuji.app.model.GalleryFilter
import com.shentuji.app.model.GalleryImage
import com.shentuji.app.model.ImageGroup
import com.shentuji.app.util.KeywordNormalizer
import java.util.Locale
import java.util.UUID

class GalleryDatabase(context: Context) : SQLiteOpenHelper(context, "gallery.db", null, 1) {
    override fun onConfigure(db: SQLiteDatabase) {
        db.setForeignKeyConstraintsEnabled(true)
        db.enableWriteAheadLogging()
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE groups_table (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                normalized_name TEXT NOT NULL UNIQUE,
                created_at INTEGER NOT NULL
            )
        """.trimIndent())
        db.execSQL("""
            CREATE TABLE images (
                id TEXT PRIMARY KEY,
                storage_name TEXT NOT NULL UNIQUE,
                original_name TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                byte_size INTEGER NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                group_id TEXT REFERENCES groups_table(id) ON DELETE SET NULL
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX images_created_idx ON images(created_at DESC, id DESC)")
        db.execSQL("CREATE INDEX images_group_idx ON images(group_id)")
        db.execSQL("""
            CREATE TABLE keywords (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                normalized_name TEXT NOT NULL UNIQUE
            )
        """.trimIndent())
        db.execSQL("""
            CREATE TABLE image_keywords (
                image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
                keyword_id TEXT NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
                PRIMARY KEY (image_id, keyword_id)
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX image_keywords_keyword_idx ON image_keywords(keyword_id)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    fun listGroups(): List<ImageGroup> {
        val result = mutableListOf<ImageGroup>()
        readableDatabase.rawQuery("""
            SELECT g.id, g.name, g.created_at, COUNT(i.id)
            FROM groups_table g LEFT JOIN images i ON i.group_id = g.id
            GROUP BY g.id ORDER BY g.name COLLATE NOCASE
        """.trimIndent(), null).use { cursor ->
            while (cursor.moveToNext()) {
                result += ImageGroup(cursor.getString(0), cursor.getString(1), cursor.getInt(3), cursor.getLong(2))
            }
        }
        return result
    }

    fun createGroup(name: String, createdAt: Long = System.currentTimeMillis()): String {
        val display = KeywordNormalizer.displayName(name)
        require(display.isNotBlank() && display.length <= 40) { "分组名称需要 1–40 个字符" }
        val existing = findGroupByName(display)
        if (existing != null) return existing
        val id = UUID.randomUUID().toString()
        writableDatabase.insertOrThrow("groups_table", null, ContentValues().apply {
            put("id", id)
            put("name", display)
            put("normalized_name", display.lowercase(Locale.US))
            put("created_at", createdAt)
        })
        return id
    }

    fun findGroupByName(name: String): String? {
        readableDatabase.query(
            "groups_table", arrayOf("id"), "normalized_name = ?",
            arrayOf(KeywordNormalizer.displayName(name).lowercase(Locale.US)), null, null, null,
        ).use { if (it.moveToFirst()) return it.getString(0) }
        return null
    }

    fun renameGroup(id: String, name: String) {
        val display = KeywordNormalizer.displayName(name)
        require(display.isNotBlank() && display.length <= 40) { "分组名称需要 1–40 个字符" }
        val changed = writableDatabase.update("groups_table", ContentValues().apply {
            put("name", display)
            put("normalized_name", display.lowercase(Locale.US))
        }, "id = ?", arrayOf(id))
        require(changed > 0) { "分组不存在" }
    }

    fun deleteGroup(id: String) {
        writableDatabase.beginTransaction()
        try {
            writableDatabase.execSQL("UPDATE images SET group_id = NULL WHERE group_id = ?", arrayOf(id))
            writableDatabase.delete("groups_table", "id = ?", arrayOf(id))
            writableDatabase.setTransactionSuccessful()
        } finally {
            writableDatabase.endTransaction()
        }
    }

    fun insertImage(image: GalleryImage) {
        writableDatabase.beginTransaction()
        try {
            writableDatabase.insertOrThrow("images", null, ContentValues().apply {
                put("id", image.id)
                put("storage_name", image.storageName)
                put("original_name", image.originalName)
                put("mime_type", image.mimeType)
                put("byte_size", image.byteSize)
                put("width", image.width)
                put("height", image.height)
                put("created_at", image.createdAt)
                put("group_id", image.groupId)
            })
            replaceKeywordsInternal(writableDatabase, image.id, image.keywords)
            writableDatabase.setTransactionSuccessful()
        } finally {
            writableDatabase.endTransaction()
        }
    }

    fun listImages(filter: GalleryFilter = GalleryFilter()): List<GalleryImage> {
        val clauses = mutableListOf<String>()
        val args = mutableListOf<String>()
        if (filter.onlyUngrouped) clauses += "i.group_id IS NULL"
        else filter.groupId?.let { clauses += "i.group_id = ?"; args += it }
        KeywordNormalizer.normalizeAll(filter.keywords).forEach { (_, normalized) ->
            clauses += """EXISTS (
                SELECT 1 FROM image_keywords ik2 JOIN keywords k2 ON k2.id = ik2.keyword_id
                WHERE ik2.image_id = i.id AND k2.normalized_name = ?
            )""".trimIndent()
            args += normalized
        }
        val where = if (clauses.isEmpty()) "" else "WHERE ${clauses.joinToString(" AND ")}"
        val result = mutableListOf<GalleryImage>()
        readableDatabase.rawQuery("""
            SELECT i.id, i.storage_name, i.original_name, i.mime_type, i.byte_size,
                i.width, i.height, i.created_at, i.group_id, g.name
            FROM images i LEFT JOIN groups_table g ON g.id = i.group_id
            $where ORDER BY i.created_at DESC, i.id DESC
        """.trimIndent(), args.toTypedArray()).use { cursor ->
            while (cursor.moveToNext()) {
                val id = cursor.getString(0)
                result += GalleryImage(
                    id = id,
                    storageName = cursor.getString(1),
                    originalName = cursor.getString(2),
                    mimeType = cursor.getString(3),
                    byteSize = cursor.getLong(4),
                    width = cursor.getInt(5),
                    height = cursor.getInt(6),
                    createdAt = cursor.getLong(7),
                    groupId = if (cursor.isNull(8)) null else cursor.getString(8),
                    groupName = if (cursor.isNull(9)) null else cursor.getString(9),
                    keywords = keywordsFor(id),
                )
            }
        }
        return result
    }

    fun imageById(id: String): GalleryImage? = listImages().firstOrNull { it.id == id }

    fun updateImage(id: String, keywords: List<String>, groupId: String?) {
        writableDatabase.beginTransaction()
        try {
            writableDatabase.update("images", ContentValues().apply { put("group_id", groupId) }, "id = ?", arrayOf(id))
            replaceKeywordsInternal(writableDatabase, id, keywords)
            writableDatabase.setTransactionSuccessful()
        } finally {
            writableDatabase.endTransaction()
        }
    }

    fun addKeywords(ids: Set<String>, values: List<String>) = editKeywords(ids, values, true)
    fun removeKeywords(ids: Set<String>, values: List<String>) = editKeywords(ids, values, false)

    private fun editKeywords(ids: Set<String>, values: List<String>, add: Boolean) {
        val normalized = KeywordNormalizer.normalizeAll(values)
        writableDatabase.beginTransaction()
        try {
            ids.forEach { imageId ->
                normalized.forEach { (name, key) ->
                    val keywordId = ensureKeyword(writableDatabase, name, key)
                    if (add) writableDatabase.execSQL(
                        "INSERT OR IGNORE INTO image_keywords(image_id, keyword_id) VALUES(?, ?)",
                        arrayOf(imageId, keywordId),
                    ) else writableDatabase.delete(
                        "image_keywords", "image_id = ? AND keyword_id = ?", arrayOf(imageId, keywordId),
                    )
                }
            }
            cleanupKeywords(writableDatabase)
            writableDatabase.setTransactionSuccessful()
        } finally {
            writableDatabase.endTransaction()
        }
    }

    fun moveImages(ids: Set<String>, groupId: String?) {
        writableDatabase.beginTransaction()
        try {
            ids.forEach { id ->
                writableDatabase.update("images", ContentValues().apply { put("group_id", groupId) }, "id = ?", arrayOf(id))
            }
            writableDatabase.setTransactionSuccessful()
        } finally {
            writableDatabase.endTransaction()
        }
    }

    fun deleteImage(id: String): String? {
        val storage = readableDatabase.query("images", arrayOf("storage_name"), "id = ?", arrayOf(id), null, null, null)
            .use { if (it.moveToFirst()) it.getString(0) else null }
        writableDatabase.delete("images", "id = ?", arrayOf(id))
        cleanupKeywords(writableDatabase)
        return storage
    }

    fun suggestions(query: String): List<Pair<String, Int>> {
        val escaped = KeywordNormalizer.normalized(query).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        val result = mutableListOf<Pair<String, Int>>()
        readableDatabase.rawQuery("""
            SELECT k.name, COUNT(ik.image_id) FROM keywords k
            LEFT JOIN image_keywords ik ON ik.keyword_id = k.id
            WHERE k.normalized_name LIKE ? ESCAPE '\\'
            GROUP BY k.id ORDER BY COUNT(ik.image_id) DESC, k.name COLLATE NOCASE LIMIT 12
        """.trimIndent(), arrayOf("%$escaped%")).use { cursor ->
            while (cursor.moveToNext()) result += cursor.getString(0) to cursor.getInt(1)
        }
        return result
    }

    private fun keywordsFor(imageId: String): List<String> {
        val result = mutableListOf<String>()
        readableDatabase.rawQuery("""
            SELECT k.name FROM keywords k JOIN image_keywords ik ON ik.keyword_id = k.id
            WHERE ik.image_id = ? ORDER BY k.name COLLATE NOCASE
        """.trimIndent(), arrayOf(imageId)).use { cursor ->
            while (cursor.moveToNext()) result += cursor.getString(0)
        }
        return result
    }

    private fun replaceKeywordsInternal(db: SQLiteDatabase, imageId: String, values: List<String>) {
        db.delete("image_keywords", "image_id = ?", arrayOf(imageId))
        KeywordNormalizer.normalizeAll(values).forEach { (name, key) ->
            val keywordId = ensureKeyword(db, name, key)
            db.execSQL("INSERT OR IGNORE INTO image_keywords(image_id, keyword_id) VALUES(?, ?)", arrayOf(imageId, keywordId))
        }
        cleanupKeywords(db)
    }

    private fun ensureKeyword(db: SQLiteDatabase, name: String, normalized: String): String {
        db.query("keywords", arrayOf("id"), "normalized_name = ?", arrayOf(normalized), null, null, null)
            .use { if (it.moveToFirst()) return it.getString(0) }
        val id = UUID.randomUUID().toString()
        db.insertOrThrow("keywords", null, ContentValues().apply {
            put("id", id); put("name", name); put("normalized_name", normalized)
        })
        return id
    }

    private fun cleanupKeywords(db: SQLiteDatabase) {
        db.execSQL("DELETE FROM keywords WHERE NOT EXISTS (SELECT 1 FROM image_keywords WHERE keyword_id = keywords.id)")
    }
}
