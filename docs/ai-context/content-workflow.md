# Xthing.Link v2 — 内容工作流

## 核心变化

v2 将内容从 git 中剥离，PocketBase 成为唯一内容真相源。

| 操作 | v1（现在） | v2（升级后） |
|------|-----------|-------------|
| 写文章 | Obsidian | Obsidian |
| 发布到网站 | 手动复制 .md → git push → 服务器 build | Obsidian 快捷键 → PB → 自动 build |
| 改文章 | 改 .md → git → build | Obsidian 快捷键 → PB → 自动 build |
| 管理项目 | 改 .md → git → build | PB Admin UI → build |
| 跨平台分发 | SyncFlow（未完成） | SyncFlow（以后接入） |

## 日常操作

### 发布新文章
1. 在 Obsidian 中写 Markdown
2. frontmatter 加 `publish: true` / `status: published`
3. 触发 QuickAdd 宏（快捷键）
4. 宏将内容 POST 到 PocketBase API
5. PB webhook 触发服务器 build
6. 约 30 秒后网站在线

### 修改已有文章
同上。宏会自动识别是新增还是更新（POST vs PATCH）。

### 管理项目/Works
在 PB Admin UI (`http://47.99.54.65/_/`) 的 projects collection 中操作。修改后需手动触发 build 或等下次 webhook。

### 本地开发
```
npm run dev
# = npm run sync && astro dev
```
sync 脚本从 PB 拉取最新内容 → 写入临时 .md 文件 → Astro dev server 启动。

### 部署到服务器
改代码（非内容）的场景：
```
git push → 服务器 git pull → npm run build
```
改内容不需要 git，PB webhook 自动触发 build。

## 原则

- PocketBase 是唯一内容真相源
- `src/content/**/*.md` 是临时产物，gitignored，不要手动编辑
- Obsidian 是主要写作入口
- PB Admin UI 是内容审核和管理面板
- 不在一阶段追求跨平台自动分发（SyncFlow 未完成）
