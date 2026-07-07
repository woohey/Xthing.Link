# Xthing.Link v2 — Claude 开发规范

## Architecture | 架构约束 (v2)

### 静态优先，禁止 SSR
- **产物必须是纯静态 HTML/CSS/JS**，不引入 `@astrojs/node` 或任何 SSR adapter
- `output` 保持默认 `'static'`，不设 `output: 'hybrid'` 或 `output: 'server'`
- nginx 直接 serve `dist/`，无 Node SSR 常驻进程
- 动态数据两个路径：编译时 `sync-from-pb.mjs` 拉 PB → .md → Astro content collection；运行时客户端 `fetch /api/`

### 代码与内容分离
- **GitHub 管源码**：`.astro` / `.ts` / `.css` / `scripts/` / 配置文件
- **PocketBase 管内容**：文章正文、项目描述、分发记录
- `src/content/blog/*.md` 和 `src/content/projects/*.md` 已加入 `.gitignore`——sync 脚本的临时产物，**禁止手动编辑**
- .md 文件如已存于 git 中则为 v1 残留，应迁移到 PB 后删除

### PocketBase 是内容唯一真相源
- 所有博文和项目元数据以 PB 中的数据为准
- 修改内容：通过 PB Admin UI (`/_/`) 或 Obsidian QuickAdd 宏
- PB v0.27.0，生产地址 `127.0.0.1:8090`，本地通过 `POCKETBASE_URL`（脚本用）或 `PB_URL`（npm scripts 用）环境变量指向
- **PB collections 的 schema 已锁定**：不要通过 PATCH 修改字段 max 或其他属性——PATCH 会覆盖 schema 导致字段丢失。必须改字段时，在 PB Admin UI 操作

### 构建管道
```
内容变更 → Obsidian 推送到 PB → (webhook → webhook-receiver.mjs) → npm run build → dist/
```
- `npm run build` = `npm run sync && astro build`
- `npm run dev`   = `npm run sync && astro dev`
- `npm run sync`  = `node scripts/sync-from-pb.mjs`
- sync 脚本错误时退出码非 0，阻断 build
- webhook-receiver 侦听 `127.0.0.1:4322`，systemd 守护

### 服务器进程
| 进程 | 类型 | 端口 | 说明 |
|------|------|------|------|
| PocketBase | systemd | 127.0.0.1:8090 | 内容数据库 |
| nginx | 手动守护 | 80 | Web + 反代 |
| webhook-receiver | systemd | 127.0.0.1:4322 | 构建触发 |

## Content Management | 内容管理规则

### 博文（posts collection）
- 新增/修改：Obsidian 写完 → 快捷键推送 PB → webhook 自动 build
- 状态字段：`draft` = 不显示（sync 过滤），`published` = 显示
- **禁止直接在 `src/content/blog/` 下创建 .md 文件**
- 首页 Hero 副标题读取 slug 为 `welcome` 的文章 `summary/description`；多行文本会按换行显示。预览 `dist/` 时必须 `npm run build`，只 `npm run sync` 不会更新 `astro preview`

### 项目/Works（projects collection）
- 新增/修改：在 PB Admin UI `projects` collection 操作
- slug 使用小写，避免大小写变化造成 Astro content id/cache 重复
- deployType 展示逻辑：
  - `static-deployed`：nginx alias 静态文件 → 卡片显示「在线体验」
  - `embedded`：嵌入式演示页（如 `/demos/pet-necklace/`）
  - `github-only`：卡片显 GitHub 链接
  - `planned`：标记「规划中」
- 历史档案项目：`deployType = planned` + `archive` 标签 → 显示「历史归档」；没有 repo/demo 链接时详情页右侧显示「项目档案」
- 项目正文可用 `<p data-summary-only="true">...</p>` 提供卡片摘要，sync 会写入 frontmatter 并从详情正文剥离
- 项目静态媒体放在 `public/media/<slug>/`，PB 正文中以 `/media/<slug>/filename.ext` 引用，不写本机绝对路径
- `.work-screenshot-card img` 会启用项目详情页 Lightbox 大图预览
- 独立部署的新项目产物放在 `/home/wuzz/<slug>/dist/`，nginx 单独配

### 跨平台分发（platforms collection）
- SyncFlow 尚未开发完成，platforms 表目前手动记录分发链接
- 以后 SyncFlow 完成后：读 PB posts → 分发 → 回写 platforms 表
- **不在此阶段尝试自动化分发**

## Project Structure | 关键文件

```
Xthing.Link/
├── astro.config.mjs              # output: 'static'
├── package.json                  # dev/build 前置 sync
├── .gitignore                    # 含 src/content/blog/*.md, src/content/projects/*.md
├── scripts/
│   ├── sync-from-pb.mjs          # PB → .md （build/dev 前自动运行）
│   ├── webhook-receiver.mjs      # 127.0.0.1:4322，systemd 守护
│   ├── migrate-to-pb.mjs         # v1 → v2 一次性迁移（已执行，可删除）
│   └── publish-from-obsidian.mjs # Obsidian → PB 发布（待部署到 Obsidian 端）
├── src/
│   ├── content.config.ts         # content collection schema
│   ├── content/
│   │   ├── blog/                 # ⚠️ gitignored 临时产物
│   │   └── projects/             # ⚠️ gitignored 临时产物
│   ├── pages/
│   │   ├── blog/                 # 博客路由
│   │   ├── works/                # Works 板块（合并 projects+demos）
│   │   ├── projects/             # → redirect to /works
│   │   └── demos/                # 保留嵌入式演示页
│   └── styles/global.css         # 新拟态 + cinematic 背景与 Works 媒体样式
├── pocketbase/                   # 仅服务器，不入 git
├── docs/
│   ├── plans/v2-architecture-upgrade.md
│   └── ai-context/               # AI 代理上下文
└── tasks/
    ├── todo.md
    └── lessons.md
```

## UI Constraints | 界面约束

- `src/styles/global.css` 新拟态系统**整体保留**，不迁移框架
- 颜色 `#00BCD4` / 阴影 `-8px -8px 20px` / 圆角 / 字体 `Quicksand`+`Nunito` 不变
- 新增页面复用现有 `.neu-card` `.feature-card` `.badge` `.btn-primary` 体系
- Nav 统一为 Works（合并 Projects + Demos）
- 全站通过 `BaseLayout` 挂载 `CinematicHero` 视频背景，`VIDEO_MAX_OPACITY = 0.9`
- 独立 `/search/` 页面已退场，Nav 放大镜负责内联搜索
- Works 的技术/状态/主题分类保持文字型，功能链接保留可点击 chip
- 不支持：暗色模式、多语言、评论

## Deployment | 部署规则

### 服务器
- IP: `47.99.54.65`，域名 `xthing.link` 尚未解析
- 项目路径: `/home/wuzz/Xthing.Link/`
- nginx 1.20.1 + PB v0.27.0 + Node 22
- nginx 路由：
  - `/` → `/home/wuzz/Xthing.Link/dist/`（静态）
  - `/api/` → `127.0.0.1:8090/api/`（PB API）
  - `/_/` → `127.0.0.1:8090/_/`（PB Admin，basic auth 保护）
  - `/Aquaworld/` → `/home/wuzz/Aquaworld/dist/`（SPA）

### PB Admin 访问
- URL: `http://47.99.54.65/_/`
- Basic Auth: `admin:Xthing20!`
- PB 登录: `admin@xthing.link` / `TempPass123!`

### 缓存策略
- `/assets/*` → `Cache-Control: public, max-age=2592000, immutable`
- `/index.html` → `no-cache, no-store, must-revalidate`
- `/Aquaworld/index.html` → `no-cache`（SPA entry）
- `/api/*` → 不缓存（nginx proxy）

### 构建
- 本地开发无需生产 PB，本地 `./pocketbase serve` 即可
- 服务器 build: `cd /home/wuzz/Xthing.Link && npm run build`
- webhook 触发: `POST 127.0.0.1:4322` + header `X-Webhook-Secret: xthing-webhook-secret-2026`
- 改 nginx 路由或 vite 构建配置才需 reload nginx，静态文件改完即生效

## Development | 开发规则

- 依赖最小化：sync/webhook 脚本用 Node 内置模块（`fs`, `http`, `child_process`），Node 22 原生 `fetch`
- PB 交互走 REST API，不引 SDK
- 文件命名：脚本 kebab-case，组件 PascalCase，页面路由 Astro 约定
- 错误处理：sync 失败退出非 0；webhook build 失败写 journal；不吞错误
- `npm test` = `node --test`

## Legacy Rules (v1 继承)

1. **Plan Mode**: 非琐碎任务（3+ 步或架构影响）先计划再动手
2. **Subagent Strategy**: 调研/探索/并行分析甩给子 agent
3. **Self-Improvement**: 被纠正后记录到 `tasks/lessons.md`
4. **Verification First**: 没验证通过不标记完成
5. **Minimal Impact**: 改哪儿动哪儿，不顺手改无关代码
6. **Demand Elegance (Balanced)**: 大改动追求优雅，小修不 over-engineer
