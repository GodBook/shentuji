# 神图集 Android

“神图集”是一个完全离线、单用户的 Android 图片收藏 App。图片、关键字、分组和密码均保存在手机应用私有目录，不需要 Web 服务器。

## 功能

- 首次设置密码，之后每次启动解锁图库
- 通过系统照片选择器一次添加多张 JPEG、PNG、WebP 或 GIF
- 从浏览器、相册或聊天应用通过 Android“分享”直接发送到神图集
- 深色瀑布流、关键字联想、多个关键字 AND 搜索
- 单层分组，删除分组后图片自动回到“未分组”
- 图片详情、关键字与分组编辑、上一张/下一张浏览
- 批量添加/移除关键字、移动分组、删除和导出
- 完整 ZIP 备份导入/导出；`schemaVersion: 1` 与 Web 版兼容

## 构建

需要 Android SDK 35、Build Tools 35、JDK 17+。

```powershell
.\gradlew.bat testDebugUnitTest
.\gradlew.bat assembleDebug
```

调试 APK 输出到：

```text
C:\tmp\shentuji-android-build\app\outputs\apk\debug\app-debug.apk
```

由于 Windows Gradle 会错误编码中文工程路径，项目将临时构建产物放在上述纯英文目录；源码和最终 APK 仍保留在“神图集”项目中。

## 安装

可以从 [GitHub Releases 下载 APK](https://github.com/GodBook/shentuji/releases/latest/download/shentuji-debug.apk)。本地构建的 APK 位于 `artifacts\神图集-debug.apk`，该二进制文件通过 Release 发布，不写入 Git 历史。

把 APK 发送到 Android 手机并打开即可安装。若手机通过 USB 连接且已启用“USB 调试”，也可以运行：

```powershell
adb install -r .\artifacts\神图集-debug.apk
```

这是开发阶段的调试签名版本；Android 可能提示“未知来源应用”，需要按系统提示允许本次安装。

## 数据与隐私

- 数据库：应用私有目录中的 `gallery.db`
- 原图：应用私有目录 `files/originals/`
- 密码：PBKDF2-HMAC-SHA256（210,000 次迭代、随机盐）
- App 不申请通用存储权限，不联网，也不会公开图片目录
- 卸载 App 会清除本地数据；卸载前请先导出完整 ZIP 备份
