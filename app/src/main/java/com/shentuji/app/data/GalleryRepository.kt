package com.shentuji.app.data

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import androidx.exifinterface.media.ExifInterface
import com.shentuji.app.model.GalleryFilter
import com.shentuji.app.model.GalleryImage
import com.shentuji.app.model.ImageGroup
import com.shentuji.app.model.ImportResult
import com.shentuji.app.util.BackupPathValidator
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.time.Instant
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

class GalleryRepository(private val context: Context) {
    private val database = GalleryDatabase(context)
    private val originals = File(context.filesDir, "originals").apply { mkdirs() }

    fun listImages(filter: GalleryFilter = GalleryFilter()) = database.listImages(filter)
    fun listGroups() = database.listGroups()
    fun suggestions(query: String) = database.suggestions(query)
    fun originalFile(image: GalleryImage) = File(originals, image.storageName)

    fun createGroup(name: String) = database.createGroup(name)
    fun renameGroup(id: String, name: String) = database.renameGroup(id, name)
    fun deleteGroup(id: String) = database.deleteGroup(id)

    fun updateImage(id: String, keywords: List<String>, groupId: String?) =
        database.updateImage(id, keywords, groupId)

    fun addKeywords(ids: Set<String>, keywords: List<String>) = database.addKeywords(ids, keywords)
    fun removeKeywords(ids: Set<String>, keywords: List<String>) = database.removeKeywords(ids, keywords)
    fun moveImages(ids: Set<String>, groupId: String?) = database.moveImages(ids, groupId)

    fun deleteImages(ids: Set<String>): Int {
        var deleted = 0
        ids.forEach { id ->
            val storage = database.deleteImage(id)
            if (storage != null) {
                File(originals, storage).delete()
                deleted += 1
            }
        }
        return deleted
    }

    fun importUris(uris: List<Uri>, keywords: List<String>, groupId: String?): Pair<Int, List<String>> {
        var imported = 0
        val errors = mutableListOf<String>()
        uris.forEach { uri ->
            val displayName = displayName(uri)
            try {
                storeImage(
                    open = { context.contentResolver.openInputStream(uri) ?: error("无法读取文件") },
                    originalName = displayName,
                    keywords = keywords,
                    groupId = groupId,
                    createdAt = System.currentTimeMillis(),
                )
                imported += 1
            } catch (error: Exception) {
                errors += "$displayName：${error.message ?: "导入失败"}"
            }
        }
        return imported to errors
    }

    fun exportBackup(uri: Uri, selectedIds: Set<String>? = null) {
        val allImages = database.listImages()
        val images = if (selectedIds == null) allImages else allImages.filter { it.id in selectedIds }
        val groups = if (selectedIds == null) database.listGroups() else {
            val names = images.mapNotNull { it.groupName }.toSet()
            database.listGroups().filter { it.name in names }
        }
        val manifest = JSONObject().apply {
            put("schemaVersion", 1)
            put("exportedAt", Instant.now().toString())
            put("groups", JSONArray().apply {
                groups.forEach { put(JSONObject().put("name", it.name)) }
            })
            put("images", JSONArray().apply {
                images.forEach { image ->
                    val extension = extensionForMime(image.mimeType)
                    put(JSONObject().apply {
                        put("file", "images/${image.id}.$extension")
                        put("originalName", image.originalName)
                        put("mimeType", image.mimeType)
                        put("byteSize", image.byteSize)
                        put("width", image.width)
                        put("height", image.height)
                        put("createdAt", Instant.ofEpochMilli(image.createdAt).toString())
                        put("keywords", JSONArray(image.keywords))
                        put("groupName", image.groupName ?: JSONObject.NULL)
                    })
                }
            })
        }

        context.contentResolver.openOutputStream(uri, "w")?.use { output ->
            ZipOutputStream(output.buffered()).use { zip ->
                zip.putNextEntry(ZipEntry("manifest.json"))
                zip.write(manifest.toString(2).toByteArray(Charsets.UTF_8))
                zip.closeEntry()
                images.forEach { image ->
                    val extension = extensionForMime(image.mimeType)
                    zip.putNextEntry(ZipEntry("images/${image.id}.$extension"))
                    originalFile(image).inputStream().buffered().use { it.copyTo(zip) }
                    zip.closeEntry()
                }
            }
        } ?: error("无法创建备份文件")
    }

    fun importBackup(uri: Uri): ImportResult {
        val tempRoot = File(context.cacheDir, "backup-${UUID.randomUUID()}").apply { mkdirs() }
        val extracted = mutableMapOf<String, File>()
        try {
            context.contentResolver.openInputStream(uri)?.use { raw ->
                ZipInputStream(BufferedInputStream(raw)).use { zip ->
                    var entry = zip.nextEntry
                    var archiveBytes = 0L
                    while (entry != null) {
                        if (!entry.isDirectory) {
                            require(BackupPathValidator.isSafeEntry(entry.name)) { "备份包含不安全路径" }
                            val limit = if (entry.name == "manifest.json") MaxManifestBytes else MaxImageBytes
                            val output = File(tempRoot, entry.name.replace('/', '_'))
                            output.outputStream().buffered().use { sink ->
                                archiveBytes += copyLimited(zip, sink, limit)
                            }
                            require(archiveBytes <= MaxArchiveBytes) { "备份文件过大" }
                            extracted[entry.name] = output
                        }
                        zip.closeEntry()
                        entry = zip.nextEntry
                    }
                }
            } ?: error("无法读取备份文件")

            val manifestFile = extracted["manifest.json"] ?: error("备份缺少 manifest.json")
            val manifest = JSONObject(manifestFile.readText())
            require(manifest.optInt("schemaVersion") == 1) { "不支持该备份版本" }
            val beforeGroups = database.listGroups().map { it.id }.toSet()
            val groupIds = mutableMapOf<String, String>()
            manifest.getJSONArray("groups").forEachObject { group ->
                val name = group.getString("name")
                groupIds[name] = database.createGroup(name)
            }

            var imported = 0
            var skipped = 0
            val errors = mutableListOf<String>()
            manifest.getJSONArray("images").forEachObject { item ->
                val archivePath = item.getString("file")
                try {
                    require(BackupPathValidator.isSafeImagePath(archivePath)) { "图片路径不安全" }
                    val file = extracted[archivePath] ?: error("备份中缺少图片")
                    val groupName = item.optString("groupName").takeUnless { it.isBlank() || it == "null" }
                    val groupId = groupName?.let { groupIds[it] ?: database.createGroup(it).also { id -> groupIds[groupName] = id } }
                    val expected = ExpectedImage(
                        mimeType = item.getString("mimeType"),
                        byteSize = item.getLong("byteSize"),
                        width = item.getInt("width"),
                        height = item.getInt("height"),
                    )
                    storeImage(
                        open = { FileInputStream(file) },
                        originalName = item.getString("originalName"),
                        keywords = item.getJSONArray("keywords").strings(),
                        groupId = groupId,
                        createdAt = Instant.parse(item.getString("createdAt")).toEpochMilli(),
                        expected = expected,
                    )
                    imported += 1
                } catch (error: Exception) {
                    skipped += 1
                    errors += "$archivePath：${error.message ?: "导入失败"}"
                }
            }
            val createdGroups = database.listGroups().count { it.id !in beforeGroups }
            return ImportResult(imported, skipped, createdGroups, errors)
        } finally {
            tempRoot.deleteRecursively()
        }
    }

    private fun storeImage(
        open: () -> InputStream,
        originalName: String,
        keywords: List<String>,
        groupId: String?,
        createdAt: Long,
        expected: ExpectedImage? = null,
    ): GalleryImage {
        val id = UUID.randomUUID().toString()
        val temp = File(originals, "$id.importing")
        try {
            open().use { input ->
                temp.outputStream().buffered().use { output -> copyLimited(input, output, MaxImageBytes) }
            }
            val detected = detectImage(temp)
            val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(temp.absolutePath, options)
            require(options.outWidth > 0 && options.outHeight > 0) { "无法读取图片尺寸" }
            var width = options.outWidth
            var height = options.outHeight
            if (detected.mimeType == "image/jpeg") {
                runCatching {
                    val orientation = ExifInterface(temp).getAttributeInt(
                        ExifInterface.TAG_ORIENTATION,
                        ExifInterface.ORIENTATION_NORMAL,
                    )
                    if (orientation in listOf(
                            ExifInterface.ORIENTATION_TRANSPOSE,
                            ExifInterface.ORIENTATION_ROTATE_90,
                            ExifInterface.ORIENTATION_TRANSVERSE,
                            ExifInterface.ORIENTATION_ROTATE_270,
                        )
                    ) width = height.also { height = width }
                }
            }
            require(width.toLong() * height <= MaxPixels) { "图片像素尺寸过大" }
            expected?.let {
                require(it.mimeType == detected.mimeType) { "图片格式与清单不一致" }
                require(it.byteSize == temp.length()) { "图片大小与清单不一致" }
                require(it.width == width && it.height == height) { "图片尺寸与清单不一致" }
            }
            val storageName = "$id.${detected.extension}"
            val final = File(originals, storageName)
            require(temp.renameTo(final)) { "无法保存图片" }
            val safeName = originalName.substringAfterLast('/').substringAfterLast('\\').take(255)
                .ifBlank { "image.${detected.extension}" }
            val image = GalleryImage(
                id, storageName, safeName, detected.mimeType, final.length(), width, height,
                createdAt, groupId, database.listGroups().firstOrNull { it.id == groupId }?.name, keywords,
            )
            try {
                database.insertImage(image)
            } catch (error: Exception) {
                final.delete()
                throw error
            }
            return image
        } finally {
            temp.delete()
        }
    }

    private fun displayName(uri: Uri): String {
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
            if (it.moveToFirst()) return it.getString(0)
        }
        return uri.lastPathSegment ?: "image"
    }

    private fun detectImage(file: File): DetectedImage {
        val header = ByteArray(12)
        file.inputStream().use { it.read(header) }
        return when {
            header.size >= 3 && header[0] == 0xFF.toByte() && header[1] == 0xD8.toByte() && header[2] == 0xFF.toByte() -> DetectedImage("image/jpeg", "jpg")
            header.copyOfRange(0, 8).contentEquals(byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) -> DetectedImage("image/png", "png")
            String(header.copyOfRange(0, 6), Charsets.US_ASCII) in setOf("GIF87a", "GIF89a") -> DetectedImage("image/gif", "gif")
            String(header.copyOfRange(0, 4), Charsets.US_ASCII) == "RIFF" && String(header.copyOfRange(8, 12), Charsets.US_ASCII) == "WEBP" -> DetectedImage("image/webp", "webp")
            else -> error("仅支持 JPEG、PNG、WebP 和 GIF")
        }
    }

    private fun extensionForMime(mime: String) = when (mime) {
        "image/jpeg" -> "jpg"
        "image/png" -> "png"
        "image/webp" -> "webp"
        "image/gif" -> "gif"
        else -> error("不支持的图片格式")
    }

    private fun copyLimited(input: InputStream, output: java.io.OutputStream, limit: Long): Long {
        val buffer = ByteArray(8 * 1024)
        var total = 0L
        while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            total += count
            require(total <= limit) { "文件超过大小限制" }
            output.write(buffer, 0, count)
        }
        return total
    }

    private data class DetectedImage(val mimeType: String, val extension: String)
    private data class ExpectedImage(val mimeType: String, val byteSize: Long, val width: Int, val height: Int)

    private companion object {
        const val MaxImageBytes = 50L * 1024 * 1024
        const val MaxArchiveBytes = 512L * 1024 * 1024
        const val MaxManifestBytes = 5L * 1024 * 1024
        const val MaxPixels = 120_000_000L
    }
}

private inline fun JSONArray.forEachObject(block: (JSONObject) -> Unit) {
    for (index in 0 until length()) block(getJSONObject(index))
}

private fun JSONArray.strings(): List<String> = buildList {
    for (index in 0 until length()) add(getString(index))
}
