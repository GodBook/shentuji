@file:OptIn(
    androidx.compose.foundation.ExperimentalFoundationApi::class,
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.foundation.ExperimentalFoundationApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class,
)

package com.shentuji.app.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Archive
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Folder
import androidx.compose.material.icons.rounded.FolderOpen
import androidx.compose.material.icons.rounded.GridView
import androidx.compose.material.icons.rounded.Image
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Menu
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.Save
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.SelectAll
import androidx.compose.material.icons.rounded.Tag
import androidx.compose.material.icons.rounded.Upload
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.InputChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil3.compose.AsyncImage
import com.shentuji.app.model.GalleryImage
import com.shentuji.app.model.ImageGroup
import com.shentuji.app.ui.theme.Acid
import com.shentuji.app.ui.theme.Canvas
import com.shentuji.app.ui.theme.Coral
import com.shentuji.app.ui.theme.Muted
import com.shentuji.app.ui.theme.Panel
import com.shentuji.app.util.KeywordNormalizer
import kotlinx.coroutines.launch
import java.time.Instant

@Composable
fun GalleryRoot(viewModel: GalleryViewModel) {
    val state by viewModel.state.collectAsState()
    when {
        !state.passwordConfigured -> LockScreen(setup = true, busy = state.busy, error = state.error, onSubmit = viewModel::configurePassword)
        !state.unlocked -> LockScreen(setup = false, busy = state.busy, error = state.error, onSubmit = { password, _ -> viewModel.unlock(password) })
        else -> GalleryScreen(state, viewModel)
    }
}

@Composable
private fun LockScreen(
    setup: Boolean,
    busy: Boolean,
    error: String?,
    onSubmit: (String, String) -> Unit,
) {
    var password by remember { mutableStateOf("") }
    var confirmation by remember { mutableStateOf("") }
    Box(
        Modifier.fillMaxSize().background(Canvas).padding(24.dp).imePadding(),
        contentAlignment = Alignment.Center,
    ) {
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(Modifier.size(62.dp).clip(RoundedCornerShape(22.dp)).background(Acid), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.Image, null, tint = Color.Black, modifier = Modifier.size(32.dp))
                }
                Column {
                    Text("神图集", fontSize = 28.sp, fontWeight = FontWeight.Black)
                    Text("D I V I N E  G A L L E R Y", color = Muted, fontSize = 10.sp)
                }
            }
            Spacer(Modifier.height(20.dp))
            Icon(if (setup) Icons.Rounded.Key else Icons.Rounded.Lock, null, tint = Acid, modifier = Modifier.size(30.dp))
            Text(if (setup) "先给图库上把锁" else "欢迎回来", fontSize = 36.sp, fontWeight = FontWeight.Black)
            Text(
                if (setup) "设置唯一的管理员密码。图片和关键字只保存在这台手机上。" else "输入管理员密码，继续翻看收藏的神图。",
                color = Muted,
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("管理员密码") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
            )
            if (setup) OutlinedTextField(
                value = confirmation,
                onValueChange = { confirmation = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("确认密码") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
            )
            if (error != null) Text(error, color = Coral)
            Button(
                onClick = { onSubmit(password, confirmation) },
                modifier = Modifier.fillMaxWidth().height(54.dp),
                enabled = !busy && password.isNotBlank(),
            ) {
                if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                else Text(if (setup) "创建我的神图集" else "进入神图集", fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun GalleryScreen(state: GalleryUiState, viewModel: GalleryViewModel) {
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var groupManagerOpen by remember { mutableStateOf(false) }
    var batchKeywordMode by remember { mutableStateOf<Boolean?>(null) }
    var moveMenuOpen by remember { mutableStateOf(false) }
    var deleteSelectionConfirm by remember { mutableStateOf(false) }
    var exportSelected by remember { mutableStateOf(false) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(100)) {
        viewModel.receiveUris(it)
    }
    val importBackup = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let(viewModel::importBackup)
    }
    val exportBackup = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/zip")) { uri ->
        uri?.let { viewModel.exportBackup(it, exportSelected) }
    }

    LaunchedEffect(state.notice, state.error) {
        val message = state.error ?: state.notice
        if (message != null) {
            snackbar.showSnackbar(message)
            viewModel.consumeMessages()
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(Modifier.fillMaxWidth(0.82f), drawerContainerColor = Panel) {
                DrawerContent(
                    state = state,
                    onGroup = { id, ungrouped -> viewModel.selectGroup(id, ungrouped); scope.launch { drawerState.close() } },
                    onManage = { groupManagerOpen = true; scope.launch { drawerState.close() } },
                    onImport = { importBackup.launch(arrayOf("application/zip", "application/octet-stream")); scope.launch { drawerState.close() } },
                    onExport = { exportSelected = false; exportBackup.launch("shentuji-${Instant.now().toString().take(10)}.zip"); scope.launch { drawerState.close() } },
                    onLock = viewModel::lock,
                )
            }
        },
    ) {
        Scaffold(
            containerColor = Canvas,
            snackbarHost = { SnackbarHost(snackbar) },
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text(currentTitle(state), fontWeight = FontWeight.Black)
                            Text("${state.images.size} 张值得反复看的图", fontSize = 11.sp, color = Muted)
                        }
                    },
                    navigationIcon = { IconButton(onClick = { scope.launch { drawerState.open() } }) { Icon(Icons.Rounded.Menu, "打开分组") } },
                    actions = {
                        if (state.images.isNotEmpty()) IconButton(onClick = viewModel::selectAll) { Icon(Icons.Rounded.SelectAll, "全选当前结果") }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas.copy(alpha = 0.96f)),
                    modifier = Modifier.statusBarsPadding(),
                )
            },
            floatingActionButton = {
                if (state.selectedIds.isEmpty()) ExtendedFloatingActionButton(
                    onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    icon = { Icon(Icons.Rounded.Add, null) },
                    text = { Text("收神图", fontWeight = FontWeight.Black) },
                )
            },
            bottomBar = {
                if (state.selectedIds.isNotEmpty()) BatchBar(
                    count = state.selectedIds.size,
                    busy = state.busy,
                    onClear = viewModel::clearSelection,
                    onAddKeywords = { batchKeywordMode = true },
                    onRemoveKeywords = { batchKeywordMode = false },
                    onMove = { moveMenuOpen = true },
                    onExport = { exportSelected = true; exportBackup.launch("shentuji-selected-${Instant.now().toString().take(10)}.zip") },
                    onDelete = { deleteSelectionConfirm = true },
                )
            },
        ) { padding ->
            Column(Modifier.padding(padding).fillMaxSize()) {
                SearchBar(state, viewModel)
                if (state.images.isEmpty() && !state.busy) EmptyGallery(onAdd = {
                    picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                }) else GalleryGrid(state, viewModel)
            }
            if (state.busy) Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
    }

    if (state.pendingUris.isNotEmpty()) AddImagesDialog(state, viewModel)
    if (groupManagerOpen) GroupManagerDialog(state.groups, onDismiss = { groupManagerOpen = false }, viewModel = viewModel)
    state.activeImage?.let { image -> ImageDetailDialog(image, state, viewModel) }
    batchKeywordMode?.let { add -> KeywordBatchDialog(add, onDismiss = { batchKeywordMode = null }) { values ->
        if (add) viewModel.bulkAddKeywords(values) else viewModel.bulkRemoveKeywords(values)
        batchKeywordMode = null
    } }
    if (moveMenuOpen) SelectGroupDialog(state.groups, "移动到分组", onDismiss = { moveMenuOpen = false }) {
        viewModel.bulkMove(it); moveMenuOpen = false
    }
    if (deleteSelectionConfirm) ConfirmDeleteDialog("永久删除选中的 ${state.selectedIds.size} 张图片？", { deleteSelectionConfirm = false }) {
        viewModel.bulkDelete(); deleteSelectionConfirm = false
    }
}

@Composable
private fun DrawerContent(
    state: GalleryUiState,
    onGroup: (String?, Boolean) -> Unit,
    onManage: () -> Unit,
    onImport: () -> Unit,
    onExport: () -> Unit,
    onLock: () -> Unit,
) {
    Column(Modifier.fillMaxHeight().statusBarsPadding().navigationBarsPadding().padding(12.dp)) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(46.dp).clip(RoundedCornerShape(16.dp)).background(Acid), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Image, null, tint = Color.Black)
            }
            Column { Text("神图集", fontWeight = FontWeight.Black, fontSize = 20.sp); Text("DIVINE GALLERY", color = Muted, fontSize = 9.sp) }
        }
        Spacer(Modifier.height(16.dp))
        NavigationDrawerItem(
            label = { Text("全部神图") }, icon = { Icon(Icons.Rounded.GridView, null) },
            selected = state.filter.groupId == null && !state.filter.onlyUngrouped,
            onClick = { onGroup(null, false) }, modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
        )
        NavigationDrawerItem(
            label = { Text("未分组") }, icon = { Icon(Icons.Rounded.FolderOpen, null) },
            selected = state.filter.onlyUngrouped, onClick = { onGroup(null, true) },
            modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
        )
        state.groups.forEach { group ->
            NavigationDrawerItem(
                label = { Text(group.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                badge = { Text(group.count.toString()) }, icon = { Icon(Icons.Rounded.Folder, null) },
                selected = state.filter.groupId == group.id, onClick = { onGroup(group.id, false) },
                modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
            )
        }
        Spacer(Modifier.weight(1f))
        HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
        DrawerAction(Icons.Rounded.Folder, "管理分组", onManage)
        DrawerAction(Icons.Rounded.Upload, "导入备份", onImport)
        DrawerAction(Icons.Rounded.Download, "导出整库", onExport)
        DrawerAction(Icons.AutoMirrored.Rounded.Logout, "锁定图库", onLock)
    }
}

@Composable
private fun DrawerAction(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String, onClick: () -> Unit) {
    TextButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Icon(icon, null); Spacer(Modifier.width(12.dp)); Text(text, modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurface)
    }
}

@Composable
private fun SearchBar(state: GalleryUiState, viewModel: GalleryViewModel) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            state.filter.keywords.forEach { keyword ->
                InputChip(selected = true, onClick = { viewModel.removeSearchKeyword(keyword) }, label = { Text("#$keyword") }, trailingIcon = { Icon(Icons.Rounded.Close, null, Modifier.size(14.dp)) })
            }
        }
        Box {
            OutlinedTextField(
                value = state.searchInput,
                onValueChange = viewModel::updateSearchInput,
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Rounded.Search, null) },
                trailingIcon = { if (state.filter.keywords.isNotEmpty()) IconButton(onClick = viewModel::clearSearch) { Icon(Icons.Rounded.Close, "清除筛选") } },
                placeholder = { Text("输入关键字，选择联想结果…") },
                singleLine = true,
                shape = RoundedCornerShape(18.dp),
            )
            DropdownMenu(expanded = state.searchInput.isNotBlank() && state.suggestions.isNotEmpty(), onDismissRequest = { viewModel.updateSearchInput("") }, modifier = Modifier.fillMaxWidth(0.9f)) {
                state.suggestions.forEach { (name, count) ->
                    DropdownMenuItem(text = { Row { Text("#$name", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold); Text(count.toString(), color = Muted) } }, onClick = { viewModel.addSearchKeyword(name) })
                }
            }
        }
    }
}

@Composable
private fun GalleryGrid(state: GalleryUiState, viewModel: GalleryViewModel) {
    LazyVerticalStaggeredGrid(
        columns = StaggeredGridCells.Adaptive(150.dp),
        contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 4.dp, bottom = 100.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalItemSpacing = 10.dp,
    ) {
        items(state.images, key = GalleryImage::id) { image ->
            ImageCard(image, selected = image.id in state.selectedIds, selectionMode = state.selectedIds.isNotEmpty(), file = viewModel.fileFor(image), onOpen = { viewModel.showImage(image.id) }, onToggle = { viewModel.toggleSelection(image.id) })
        }
    }
}

@Composable
private fun ImageCard(
    image: GalleryImage,
    selected: Boolean,
    selectionMode: Boolean,
    file: java.io.File,
    onOpen: () -> Unit,
    onToggle: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().combinedClickable(onLongClick = onToggle, onClick = { if (selectionMode) onToggle() else onOpen() }),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Panel),
        border = if (selected) androidx.compose.foundation.BorderStroke(2.dp, Acid) else null,
    ) {
        Box {
            AsyncImage(
                model = file,
                contentDescription = listOf(image.originalName).plus(image.keywords).joinToString("，"),
                modifier = Modifier.fillMaxWidth().aspectRatio((image.width.toFloat() / image.height.coerceAtLeast(1)).coerceIn(0.45f, 2.2f)),
                contentScale = ContentScale.Crop,
            )
            FilledIconButton(onClick = onToggle, modifier = Modifier.align(Alignment.TopStart).padding(7.dp).size(34.dp)) {
                Icon(if (selected) Icons.Rounded.CheckCircle else Icons.Rounded.MoreVert, if (selected) "取消选择" else "选择", Modifier.size(18.dp))
            }
            if (image.keywords.isNotEmpty() || image.groupName != null) {
                Column(Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Color.Black.copy(alpha = 0.62f)).padding(9.dp)) {
                    image.groupName?.let { Text(it, fontSize = 10.sp, color = Acid, fontWeight = FontWeight.Bold) }
                    Text(image.keywords.take(4).joinToString("  ") { "#$it" }, fontSize = 10.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}

@Composable
private fun EmptyGallery(onAdd: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(Icons.Rounded.Image, null, tint = Muted, modifier = Modifier.size(58.dp))
            Text("这里还空空如也", fontSize = 22.sp, fontWeight = FontWeight.Black)
            Text("从今天看到的第一张神图开始", color = Muted)
            Button(onClick = onAdd) { Icon(Icons.Rounded.Add, null); Spacer(Modifier.width(8.dp)); Text("添加图片") }
        }
    }
}

@Composable
private fun BatchBar(
    count: Int,
    busy: Boolean,
    onClear: () -> Unit,
    onAddKeywords: () -> Unit,
    onRemoveKeywords: () -> Unit,
    onMove: () -> Unit,
    onExport: () -> Unit,
    onDelete: () -> Unit,
) {
    Surface(color = Panel, tonalElevation = 12.dp, modifier = Modifier.fillMaxWidth().navigationBarsPadding()) {
        Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceEvenly) {
            TextButton(onClick = onClear) { Text("$count 张", fontWeight = FontWeight.Black); Icon(Icons.Rounded.Close, null, Modifier.size(15.dp)) }
            IconButton(onClick = onAddKeywords, enabled = !busy) { Icon(Icons.Rounded.Tag, "添加关键字") }
            IconButton(onClick = onRemoveKeywords, enabled = !busy) { Text("−#", fontWeight = FontWeight.Black) }
            IconButton(onClick = onMove, enabled = !busy) { Icon(Icons.Rounded.Folder, "移动分组") }
            IconButton(onClick = onExport, enabled = !busy) { Icon(Icons.Rounded.Archive, "导出所选") }
            IconButton(onClick = onDelete, enabled = !busy) { Icon(Icons.Rounded.Delete, "删除所选", tint = Coral) }
        }
    }
}

@Composable
private fun AddImagesDialog(state: GalleryUiState, viewModel: GalleryViewModel) {
    var keywordInput by remember { mutableStateOf("") }
    var groupId by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = viewModel::clearPending,
        icon = { Icon(Icons.Rounded.Image, null, tint = Acid) },
        title = { Text("整理 ${state.pendingUris.size} 张神图", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("每张图片会成为独立记录，并共享本次设置。", color = Muted)
                OutlinedTextField(keywordInput, { keywordInput = it }, label = { Text("关键字，用逗号分隔") }, modifier = Modifier.fillMaxWidth())
                GroupSelector(state.groups, groupId, onSelected = { groupId = it })
            }
        },
        confirmButton = { Button(onClick = { viewModel.importPending(KeywordNormalizer.parse(keywordInput), groupId) }) { Text("收藏图片") } },
        dismissButton = { TextButton(onClick = viewModel::clearPending) { Text("取消") } },
    )
}

@Composable
private fun GroupSelector(groups: List<ImageGroup>, selectedId: String?, onSelected: (String?) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Rounded.Folder, null); Spacer(Modifier.width(8.dp)); Text(groups.firstOrNull { it.id == selectedId }?.name ?: "未分组", modifier = Modifier.weight(1f))
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(text = { Text("未分组") }, onClick = { onSelected(null); expanded = false })
            groups.forEach { group -> DropdownMenuItem(text = { Text(group.name) }, onClick = { onSelected(group.id); expanded = false }) }
        }
    }
}

@Composable
private fun GroupManagerDialog(groups: List<ImageGroup>, onDismiss: () -> Unit, viewModel: GalleryViewModel) {
    var newName by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<ImageGroup?>(null) }
    var deleting by remember { mutableStateOf<ImageGroup?>(null) }
    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(24.dp), color = Panel, modifier = Modifier.fillMaxWidth().fillMaxHeight(0.78f)) {
            Column(Modifier.padding(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) { Text("管理分组", fontSize = 22.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f)); IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, "关闭") } }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(newName, { newName = it }, label = { Text("新分组") }, modifier = Modifier.weight(1f), singleLine = true)
                    IconButton(onClick = { if (newName.isNotBlank()) { viewModel.createGroup(newName); newName = "" } }) { Icon(Icons.Rounded.Add, "创建") }
                }
                LazyColumn(Modifier.weight(1f)) {
                    items(groups, key = ImageGroup::id) { group ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Folder, null, tint = Acid); Spacer(Modifier.width(10.dp)); Text(group.name, modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold); Text("${group.count}", color = Muted)
                            IconButton(onClick = { editing = group }) { Icon(Icons.Rounded.Edit, "重命名") }
                            IconButton(onClick = { deleting = group }) { Icon(Icons.Rounded.Delete, "删除", tint = Coral) }
                        }
                    }
                }
            }
        }
    }
    editing?.let { group -> NameDialog("重命名分组", group.name, { editing = null }) { viewModel.renameGroup(group.id, it); editing = null } }
    deleting?.let { group -> ConfirmDeleteDialog("删除“${group.name}”？图片会回到未分组。", { deleting = null }) { viewModel.deleteGroup(group.id); deleting = null } }
}

@Composable
private fun NameDialog(title: String, initial: String, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var value by remember(initial) { mutableStateOf(initial) }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(title) }, text = { OutlinedTextField(value, { value = it }, modifier = Modifier.fillMaxWidth(), singleLine = true) }, confirmButton = { Button(onClick = { onConfirm(value) }, enabled = value.isNotBlank()) { Text("保存") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } })
}

@Composable
private fun ImageDetailDialog(image: GalleryImage, state: GalleryUiState, viewModel: GalleryViewModel) {
    var keywords by remember(image.id) { mutableStateOf(image.keywords.joinToString("，")) }
    var groupId by remember(image.id) { mutableStateOf(image.groupId) }
    var deleteConfirm by remember { mutableStateOf(false) }
    val index = state.images.indexOfFirst { it.id == image.id }
    Dialog(onDismissRequest = { viewModel.showImage(null) }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize(), color = Canvas) {
            Column(Modifier.statusBarsPadding().navigationBarsPadding()) {
                Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { viewModel.showImage(null) }) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "关闭") }
                    Text(image.originalName, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Bold)
                    IconButton(onClick = { deleteConfirm = true }) { Icon(Icons.Rounded.Delete, "删除", tint = Coral) }
                }
                Box(Modifier.fillMaxWidth().weight(1f).background(Color.Black), contentAlignment = Alignment.Center) {
                    AsyncImage(viewModel.fileFor(image), listOf(image.originalName).plus(image.keywords).joinToString("，"), Modifier.fillMaxSize(), contentScale = ContentScale.Fit)
                    if (index > 0) FloatingActionButton(onClick = { viewModel.showImage(state.images[index - 1].id) }, modifier = Modifier.align(Alignment.CenterStart).padding(8.dp).size(44.dp)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "上一张") }
                    if (index in 0 until state.images.lastIndex) FloatingActionButton(onClick = { viewModel.showImage(state.images[index + 1].id) }, modifier = Modifier.align(Alignment.CenterEnd).padding(8.dp).size(44.dp)) { Icon(Icons.AutoMirrored.Rounded.ArrowForward, "下一张") }
                }
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("${image.width} × ${image.height} · ${"%.2f".format(image.byteSize / 1024.0 / 1024.0)} MB", color = Muted, fontSize = 12.sp)
                    OutlinedTextField(keywords, { keywords = it }, label = { Text("关键字") }, modifier = Modifier.fillMaxWidth(), maxLines = 2)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.weight(1f)) { GroupSelector(state.groups, groupId) { groupId = it } }
                        Spacer(Modifier.width(8.dp))
                        Button(onClick = { viewModel.updateImage(image.id, KeywordNormalizer.parse(keywords), groupId) }) { Icon(Icons.Rounded.Save, null); Spacer(Modifier.width(5.dp)); Text("保存") }
                    }
                }
            }
        }
    }
    if (deleteConfirm) ConfirmDeleteDialog("永久删除这张图片？", { deleteConfirm = false }) { viewModel.deleteActiveImage(); deleteConfirm = false }
}

@Composable
private fun KeywordBatchDialog(add: Boolean, onDismiss: () -> Unit, onConfirm: (List<String>) -> Unit) {
    var value by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(if (add) "批量添加关键字" else "批量移除关键字") }, text = { OutlinedTextField(value, { value = it }, label = { Text("用逗号或换行分隔") }, modifier = Modifier.fillMaxWidth()) }, confirmButton = { Button(onClick = { onConfirm(KeywordNormalizer.parse(value)) }, enabled = KeywordNormalizer.parse(value).isNotEmpty()) { Text("应用") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } })
}

@Composable
private fun SelectGroupDialog(groups: List<ImageGroup>, title: String, onDismiss: () -> Unit, onConfirm: (String?) -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, title = { Text(title) }, text = {
        LazyColumn { item { TextButton(onClick = { onConfirm(null) }, modifier = Modifier.fillMaxWidth()) { Text("未分组") } }; items(groups) { group -> TextButton(onClick = { onConfirm(group.id) }, modifier = Modifier.fillMaxWidth()) { Text(group.name) } } }
    }, confirmButton = {}, dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } })
}

@Composable
private fun ConfirmDeleteDialog(message: String, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(onDismissRequest = onDismiss, icon = { Icon(Icons.Rounded.Delete, null, tint = Coral) }, title = { Text("请确认") }, text = { Text(message) }, confirmButton = { Button(onClick = onConfirm) { Text("确认删除") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } })
}

private fun currentTitle(state: GalleryUiState): String = when {
    state.filter.onlyUngrouped -> "未分组"
    state.filter.groupId != null -> state.groups.firstOrNull { it.id == state.filter.groupId }?.name ?: "神图集"
    else -> "全部神图"
}
