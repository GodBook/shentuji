package com.shentuji.app.util

object BackupPathValidator {
    private val imagePath = Regex("^images/[A-Za-z0-9_-]+\\.(jpg|jpeg|png|webp|gif)$")

    fun isSafeImagePath(path: String): Boolean =
        imagePath.matches(path) && ".." !in path && '\\' !in path

    fun isSafeEntry(path: String): Boolean = path == "manifest.json" || isSafeImagePath(path)
}
