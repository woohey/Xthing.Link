# Xthing.Link v2 — Claude 开发规范

## Architecture | 架构约束 (v2)

### 静态优先，禁止 SSR
- **产物必须是纯静态 HTML/CSS/JS**，不引入 `@astrojs/node` 或任何 SSR adapter
- `output` 保持默认 `'static'`，不设 `output: 'hybrid'` 或 `output: 'server'`
- nginx 直接 serve `dist/`，无 Node 常驻进程
- 需要动态数据的地方：客户端 fetch PocketBase API（`/api/`），编译时数据通过 sync 脚本拉取

### 代码与内容分离
- **GitHub 管源码**：`.astro` / `.ts` / `.css` / `scripts/` / 配置文件
- **PocketBase 管内容**：文章正文、项目描述、分发记录
- `src/content/blog/*.md` 和 `src/content/projects/*.md` 已加入 `.gitignore`——它们是 sync 脚本的临时产物，**禁止手动编辑**
- 如果一篇内容以 .md 文件存在于 git 中，它是老的 v1 残留物，应迁移到 PB

### PocketBase 是内容唯一真相源
- 所有博文和项目元数据以 PB 中的数据为准
- 修改内容：通过 PB Admin UI (`/_/`) 或 Obsidian QuickAdd 宏，不要改 .md 文件
- PB 地址：生产 `http://127.0.0.1:8090`，本地可设 `POCKETBASE_URL` 环境变量

### 构建管道
```
内容变更 → PB webhook → webhook-receiver.mjs → npm run build (sync + astro build) → dist/
```
- `npm run build` = `npm run sync && astro build`
- `npm run dev` = `npm run sync && astro dev`
- sync 脚本 (`scripts/sync-from-pb.mjs`) 必须零错误退出，否则阻断 build
- **不要在 build 流程中直接调 PB API 渲染页面**——始终走 sync 脚本 → .md → Astro content collection 这条管道

## Content Management | 内容管理规则

### 博文（posts）
- 新增/修改文章：在 Obsidian 中操作，通过 QuickAdd 宏推送到 PB，或直接在 PB Admin UI 编辑
- 文章状态：`draft` = 不显示，`published` = 显示在网站
- **禁止直接在 `src/content/blog/` 下创建 .md 文件来发布文章**

### 项目/Works（projects）
- 新增/修改项目：在 PB Admin UI 的 projects collection 操作
- deployType 决定了展示方式：
  - `static-deployed`：nginx alias 静态文件，主站显示「在线体验」链接
  - `embedded`：React 端岛嵌入主站详情页
  - `github-only`：卡片上显示 GitHub 链接，无在线体验
  - `planned`：仅展示构想，标记为「规划中」
- 独立部署的新项目产物放在 `/home/wuzz/projects/<slug>/dist/`

### 跨平台分发（platforms）
- SyncFlow 尚未开发完成，platforms 表目前用于手动记录分发链接
- 以后 SyncFlow 开发完毕后，它读 PB posts → 分发 → 回写 platforms 表
- 不要在此阶段花时间试图自动化分发流程

## Project Structure | 关键文件清单

```
Xthing.Link/
├── astro.config.mjs              # output: 'static', site: 'https://xthing.link'
├── package.json                  # dev/build 前置 sync 脚本
├── .gitignore                    # 含 src/content/blog/*.md, src/content/projects/*.md
├── scripts/
│   ├── sync-from-pb.mjs          # PB → .md 同步脚本（build 前执行）
│   ├── webhook-receiver.mjs      # 接收 PB webhook 触发 build
│   └── migrate-to-pb.mjs         # 一次性：v1 .md → PB 迁移（Phase 1 完成后可删除）
├── src/
│   ├── content.config.ts         # content collection schema（与 PB 字段对齐）
│   ├── content/
│   │   ├── blog/                 # ⚠️ 临时产物，gitignored
│   │   └── projects/             # ⚠️ 临时产物，gitignored
│   ├── pages/
│   │   ├── blog/[id].astro       # 动态路由，从 content collection 读取
│   │   ├── projects/[id].astro   # 同上
│   │   └── works/                # Phase 4: 合并后的 Works 板块
│   ├── components/
│   └── styles/global.css         # 新拟态设计系统，整体保留
├── pocketbase/                   # 仅服务器，不入库
│   ├── pocketbase                # PB 二进制
│   └── pb_data/                  # SQLite 数据文件
├── docs/
│   ├── plans/v2-architecture-upgrade.md  # 本次升级详细方案
│   └── ai-context/               # AI 代理上下文文档
└── tasks/
    ├── todo.md                   # 当前任务
    └── lessons.md                # 教训记录
```

## Development | 开发规则

### 新增依赖
- 保持依赖最小化。sync 脚本和 webhook receiver 使用 Node 内置模块（`fs`, `http`, `child_process`）
- 不引入 axios / node-fetch 等外部 HTTP 库 —— Node 22+ 原生 `fetch` 已可用
- PB 交互只用 REST API，不引入 PocketBase SDK（以减少依赖）

### 文件命名
- 脚本：kebab-case（`sync-from-pb.mjs`, `webhook-receiver.mjs`）
- 组件：PascalCase（`Nav.astro`, `PetNecklaceDashboard.tsx`）
- 页面路由：遵循 Astro 约定（`blog/[id].astro`）

### 错误处理
- sync 脚本失败时退出码非 0，阻止 build 继续
- webhook receiver 的 build 失败时返回 500 + 错误信息
- 不要在 sync 脚本里吞错误——让 CI/Webhook 感知失败

### 测试
- `npm test` = `node --test`（Node 原生 test runner）
- 新增脚本必须有对应的测试用例
- sync 脚本的测试用 mock PB API 响应

## UI Constraints | 界面约束

### 保留新拟态设计系统
- `src/styles/global.css`（~1649 行）**整体保留**，不迁移到 Tailwind 或其他框架
- CSS 自定义属性（颜色 `#00BCD4`、阴影 `-8px -8px 20px`、圆角 `12px-24px`、字体 `Quicksand`/`Nunito`）不变
- 现有 `.neu-card`、`.feature-card`、`.badge`、`.btn-primary` 等 class 体系继续使用
- 新增页面复用现有 class，不另起设计语言

### 页面组件
- `Nav.astro` 和 `BaseLayout.astro` 逻辑不变
- 页面内容可以调整（如 Works 页面合并 Projects + Demos），但视觉风格保持一致

### 不支持的功能
- 暗色模式（当前无）
- 多语言切换（中文为主，英文为辅）
- 评论系统

## Deployment | 部署规则

### 服务器信息
- IP: `47.99.54.65`
- 项目路径: `/home/wuzz/Xthing.Link/`
- Web 服务器: nginx 1.20.1, 绑 80 端口
- 进程管理: systemd（仅 PocketBase）
- **无 HTTPS / 域名**：xthing.link 域名尚未解析

### 构建与发布
- 本地开发无需连接生产 PB——可本地启动 PB（`./pocketbase serve`）
- 服务器 build 流程：`npm run build`（sync 从本地 PB 拉数据 + astro build）
- build 完成后 nginx 无需 reload（静态文件直接生效）
- 如果改了 `vite.config.ts` 的 `base` 或 nginx 路由规则，才需要 reload nginx

### 缓存策略（必须严格执行）
- `/assets/*` → `Cache-Control: public, max-age=2592000, immutable`
- `/index.html` 和各子路径的 `index.html` → `no-cache` 或 `must-revalidate`
- `/api/*` → `no-store`
- 各独立项目 `/app-slug/index.html` → `no-cache`，资源文件长缓存

## Rules from v1 | v1 继承的规则

以下规则从 v1 保留，继续适用：

### 1. Plan Mode Default | 默认进入计划模式
- 任何非琐碎任务（3 步以上或涉及架构决策）必须先计划再动手
- 验证步骤也走计划模式，不只是写代码

### 2. Subagent Strategy | 子 agent 策略
- 调研、探索、并行分析甩给子 agent
- 一个子 agent 一个任务，保持聚焦

### 3. Self-Improvement Loop | 自我改进循环
- 被用户纠正后，记录到 `tasks/lessons.md`
- 给自己写规则防止同类错误

### 4. Verification Before Done | 完成前验证
- 没验证通过不许标记完成
- 跑测试、查日志、拿出证据

### 5. Demand Elegance (Balanced) | 追求优雅（有节制）
- 改动大时问「还有更优雅的做法吗」
- 小修小补不 over-engineer

### 6. Minimal Impact | 最小影响
- 改哪儿动哪儿，不顺手改无关代码
- 每次改动越简单越好
