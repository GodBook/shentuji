# 神图集

“神图集”是一个单用户图片收藏库，支持图片关键字、单层分组、瀑布流浏览、批量整理以及 ZIP 备份恢复。本仓库同时提供原生 Android App 和 Next.js 网页版。

## 项目结构

```text
shentuji/
├─ android/   Kotlin + Jetpack Compose 原生 App
└─ web/       Next.js + TypeScript + SQLite 网页版
```

- [Android 工程与安装说明](android/README.md)
- [网页版运行与部署说明](web/README.md)
- [下载 Android 调试版 APK](android/artifacts/神图集-debug.apk)

两个版本使用兼容的 `schemaVersion: 1` ZIP 备份格式，可保留图片、关键字、分组和添加时间。

## 快速验证

Android：

```powershell
cd android
.\gradlew.bat testDebugUnitTest
.\gradlew.bat assembleDebug
```

网页版：

```powershell
cd web
pnpm install
pnpm lint
pnpm test
pnpm build
```
