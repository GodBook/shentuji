package com.shentuji.app.model

data class GalleryImage(
    val id: String,
    val storageName: String,
    val originalName: String,
    val mimeType: String,
    val byteSize: Long,
    val width: Int,
    val height: Int,
    val createdAt: Long,
    val groupId: String?,
    val groupName: String?,
    val keywords: List<String>,
)

data class ImageGroup(
    val id: String,
    val name: String,
    val count: Int,
    val createdAt: Long,
)

data class GalleryFilter(
    val groupId: String? = null,
    val onlyUngrouped: Boolean = false,
    val keywords: List<String> = emptyList(),
)

data class ImportResult(
    val imported: Int,
    val skipped: Int,
    val groupsCreated: Int,
    val errors: List<String>,
)

data class PendingImage(
    val uri: String,
    val displayName: String,
)
