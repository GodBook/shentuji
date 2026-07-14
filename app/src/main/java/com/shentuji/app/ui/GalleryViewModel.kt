package com.shentuji.app.ui

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.shentuji.app.data.GalleryRepository
import com.shentuji.app.data.PasswordStore
import com.shentuji.app.model.GalleryFilter
import com.shentuji.app.model.GalleryImage
import com.shentuji.app.model.ImageGroup
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

data class GalleryUiState(
    val passwordConfigured: Boolean = false,
    val unlocked: Boolean = false,
    val images: List<GalleryImage> = emptyList(),
    val groups: List<ImageGroup> = emptyList(),
    val filter: GalleryFilter = GalleryFilter(),
    val searchInput: String = "",
    val suggestions: List<Pair<String, Int>> = emptyList(),
    val selectedIds: Set<String> = emptySet(),
    val pendingUris: List<Uri> = emptyList(),
    val activeImageId: String? = null,
    val busy: Boolean = false,
    val notice: String? = null,
    val error: String? = null,
) {
    val activeImage: GalleryImage? get() = images.firstOrNull { it.id == activeImageId }
}

class GalleryViewModel(application: Application) : AndroidViewModel(application) {
    private val passwordStore = PasswordStore(application)
    private val repository = GalleryRepository(application)
    private val _state = MutableStateFlow(GalleryUiState(passwordConfigured = passwordStore.isConfigured))
    val state: StateFlow<GalleryUiState> = _state.asStateFlow()

    fun configurePassword(password: String, confirmation: String) {
        if (password != confirmation) return fail("两次输入的密码不一致")
        if (password.length < 10) return fail("密码至少需要 10 个字符")
        runCatching { passwordStore.configure(password.toCharArray()) }
            .onSuccess {
                _state.update { it.copy(passwordConfigured = true, unlocked = true, error = null) }
                refresh()
            }
            .onFailure { fail(it.message ?: "设置密码失败") }
    }

    fun unlock(password: String) {
        if (passwordStore.verify(password.toCharArray())) {
            _state.update { it.copy(unlocked = true, error = null) }
            refresh()
        } else fail("密码不正确")
    }

    fun lock() {
        _state.update { GalleryUiState(passwordConfigured = true) }
    }

    fun refresh(message: String? = null) {
        val filter = _state.value.filter
        viewModelScope.launch {
            runBusy {
                val images = repository.listImages(filter)
                val groups = repository.listGroups()
                _state.update { it.copy(images = images, groups = groups, selectedIds = emptySet(), notice = message) }
            }
        }
    }

    fun selectGroup(groupId: String?, onlyUngrouped: Boolean = false) {
        _state.update { it.copy(filter = it.filter.copy(groupId = groupId, onlyUngrouped = onlyUngrouped)) }
        refresh()
    }

    fun updateSearchInput(value: String) {
        _state.update { it.copy(searchInput = value) }
        viewModelScope.launch {
            val suggestions = withContext(Dispatchers.IO) { repository.suggestions(value) }
            _state.update { it.copy(suggestions = suggestions) }
        }
    }

    fun addSearchKeyword(value: String) {
        val name = value.trim()
        if (name.isBlank()) return
        _state.update {
            val keywords = if (it.filter.keywords.any { current -> current.equals(name, true) }) {
                it.filter.keywords
            } else it.filter.keywords + name
            it.copy(filter = it.filter.copy(keywords = keywords), searchInput = "", suggestions = emptyList())
        }
        refresh()
    }

    fun removeSearchKeyword(value: String) {
        _state.update { it.copy(filter = it.filter.copy(keywords = it.filter.keywords - value)) }
        refresh()
    }

    fun clearSearch() {
        _state.update { it.copy(filter = it.filter.copy(keywords = emptyList()), searchInput = "", suggestions = emptyList()) }
        refresh()
    }

    fun toggleSelection(id: String) {
        _state.update {
            val next = it.selectedIds.toMutableSet().apply { if (!add(id)) remove(id) }
            it.copy(selectedIds = next)
        }
    }

    fun selectAll() = _state.update { it.copy(selectedIds = it.images.map(GalleryImage::id).toSet()) }
    fun clearSelection() = _state.update { it.copy(selectedIds = emptySet()) }
    fun showImage(id: String?) = _state.update { it.copy(activeImageId = id) }

    fun receiveUris(uris: List<Uri>) {
        if (uris.isEmpty()) return
        _state.update { it.copy(pendingUris = (it.pendingUris + uris).distinct()) }
    }

    fun clearPending() = _state.update { it.copy(pendingUris = emptyList()) }

    fun importPending(keywords: List<String>, groupId: String?) {
        val uris = _state.value.pendingUris
        if (uris.isEmpty()) return
        viewModelScope.launch {
            runBusy {
                val (count, errors) = repository.importUris(uris, keywords, groupId)
                _state.update { it.copy(pendingUris = emptyList()) }
                reload(if (errors.isEmpty()) "已收藏 $count 张图片" else "已收藏 $count 张，${errors.size} 张失败")
                if (errors.isNotEmpty()) _state.update { it.copy(error = errors.take(3).joinToString("\n")) }
            }
        }
    }

    fun createGroup(name: String) = mutate("分组已创建") { repository.createGroup(name) }
    fun renameGroup(id: String, name: String) = mutate("分组已重命名") { repository.renameGroup(id, name) }
    fun deleteGroup(id: String) = mutate("分组已删除，图片已移到未分组") { repository.deleteGroup(id) }

    fun updateImage(id: String, keywords: List<String>, groupId: String?) = mutate("图片信息已保存") {
        repository.updateImage(id, keywords, groupId)
    }

    fun deleteActiveImage() {
        val id = _state.value.activeImageId ?: return
        _state.update { it.copy(activeImageId = null) }
        mutate("图片已删除") { repository.deleteImages(setOf(id)) }
    }

    fun bulkAddKeywords(values: List<String>) = bulk("关键字已添加") { repository.addKeywords(it, values) }
    fun bulkRemoveKeywords(values: List<String>) = bulk("关键字已移除") { repository.removeKeywords(it, values) }
    fun bulkMove(groupId: String?) = bulk("图片已移动") { repository.moveImages(it, groupId) }
    fun bulkDelete() = bulk("所选图片已删除") { repository.deleteImages(it) }

    fun exportBackup(uri: Uri, selectedOnly: Boolean) {
        val selected = _state.value.selectedIds
        viewModelScope.launch {
            runBusy {
                repository.exportBackup(uri, if (selectedOnly) selected else null)
                _state.update { it.copy(notice = "备份已导出") }
            }
        }
    }

    fun importBackup(uri: Uri) {
        viewModelScope.launch {
            runBusy {
                val report = repository.importBackup(uri)
                reload("已导入 ${report.imported} 张${if (report.skipped > 0) "，跳过 ${report.skipped} 张" else ""}")
                if (report.errors.isNotEmpty()) _state.update { it.copy(error = report.errors.take(3).joinToString("\n")) }
            }
        }
    }

    fun fileFor(image: GalleryImage): File = repository.originalFile(image)
    fun consumeMessages() = _state.update { it.copy(notice = null, error = null) }

    private fun bulk(message: String, action: (Set<String>) -> Unit) {
        val ids = _state.value.selectedIds
        if (ids.isEmpty()) return
        mutate(message) { action(ids) }
    }

    private fun mutate(message: String, action: () -> Unit) {
        viewModelScope.launch { runBusy { action(); reload(message) } }
    }

    private suspend fun reload(message: String) {
        val images = repository.listImages(_state.value.filter)
        val groups = repository.listGroups()
        _state.update { it.copy(images = images, groups = groups, selectedIds = emptySet(), notice = message) }
    }

    private suspend fun runBusy(action: suspend () -> Unit) {
        _state.update { it.copy(busy = true, error = null) }
        try {
            withContext(Dispatchers.IO) { action() }
        } catch (error: Exception) {
            fail(error.message ?: "操作失败")
        } finally {
            _state.update { it.copy(busy = false) }
        }
    }

    private fun fail(message: String) = _state.update { it.copy(error = message) }
}
