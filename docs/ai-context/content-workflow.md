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

项目静态资产放在 `public/media/<slug>/`，在 PB 正文中用 `/media/<slug>/filename.ext` 引用。历史档案类项目建议使用小写 slug，`deployType = planned`，并加 `archive` 标签；没有 repo/demo 链接时，详情页会显示「项目档案」侧栏。

如果项目正文开头需要复杂布局但列表摘要需要单独控制，可使用：

```html
<p data-summary-only="true">摘要文本</p>
```

sync 会把这段作为 frontmatter `description`，并从详情正文中剥离。

当前已补入两个历史 Works 档案：

- `8bees`：合众蜂巢 / 8Bees，媒体位于 `public/media/8bees/`
- `aquasmart`：鱼水圈 APP / 智能鱼缸生态，媒体位于 `public/media/aquasmart/`

### 本地开发
```
npm run dev
# = npm run sync && astro dev
```
sync 脚本从 PB 拉取最新内容 → 写入临时 .md 文件 → Astro dev server 启动。

如果当前使用的是 `npm run preview` 或 `astro preview`，页面读取的是 `dist/`，内容变更后需要执行 `npm run build`，不能只运行 `npm run sync`。

### 首页 Hero

首页 Hero 副标题读取 slug 为 `welcome` 的文章摘要/description。多行摘要会按换行渲染，适合维护站点宣言：

```text
xThing.Link ， 探索未知  ，Things worth linking
「X × IoT × AI，探索一切连接」
X 是未知，物是万物。连接，是我们选择的方式。一个属于探索者的安静角落。关于技术、连接，以及那些认真做出来的小东西。
```

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
- PB collection schema 已锁定，不通过 API PATCH 改字段结构；必须改 schema 时在 PB Admin UI 操作
