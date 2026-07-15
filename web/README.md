# 神图集

“神图集”是一个单用户、私有部署的图片收藏库。它使用关键字和单层分组整理图片，支持瀑布流浏览、多词 AND 搜索、批量操作以及完整 ZIP 备份恢复。

## 整理功能

- 删除图片时先移入回收站，可单张或批量恢复；只有回收站内的图片才能永久删除
- 图片可加入收藏并设置 0–5 星评分，图库支持收藏视图和最低评分筛选
- 相似图片检测使用服务器本地生成的 64 位感知哈希，不会把图片发送给第三方
- 老数据库会在启动时自动增加所需字段；首次检测相似图片时会为旧图片补算特征

## 本机运行

要求 Node.js 24+ 与 pnpm 10+。

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

访问 `http://localhost:3000`，首次打开会要求设置唯一的管理员密码（至少 10 个字符）。

默认数据保存在项目同级的 `shentuji-data` 目录：

- `library.sqlite`：SQLite 元数据与会话
- `originals/`：未经转码的原图
- `thumbnails/`：用于瀑布流的 WebP 缩略图
- `tmp/`：上传和删除过程中的临时文件

通过 `.env.local` 的 `DATA_DIR` 可以改到 NAS 或其他持久化磁盘。反向代理启用 HTTPS 后，将 `COOKIE_SECURE` 设置为 `1`。

## 常用命令

```bash
pnpm dev        # 开发服务器
pnpm build      # 生产构建
pnpm start      # 运行生产构建
pnpm lint       # ESLint
pnpm test       # 单元与集成测试
pnpm test:e2e   # Chrome 端到端测试
```

## 备份格式

“导出整库”或批量导出会生成 ZIP，其中 `manifest.json` 使用 `schemaVersion: 1`，`images/` 保存原始文件。恢复时会重新生成记录 ID，保留图片添加时间、关键字、分组、收藏和评分；相同图片允许重复导入。回收站中的图片不会进入常规备份。

## 安全说明

- 密码使用 Argon2id 保存，登录凭据使用可撤销的数据库会话与 HttpOnly Cookie。
- 原图目录不属于 Next.js 静态目录，所有图片请求都需要有效会话。
- 上传按文件魔数而不是扩展名识别格式，并限制大小和像素数。
- ZIP 导入校验版本、CRC、路径、真实 MIME 和清单大小，阻止目录穿越。

本应用当前面向单用户单机部署，不包含注册、公开分享、远程 URL 抓图或多用户隔离。
