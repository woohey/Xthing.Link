# Xthing.Link v2 架构升级方案

## 1. 升级目标

将站点从「纯静态 Astro + 手动文件管理文章」升级为「PocketBase 内容中枢 + 自动化构建管道」，实现：

- **Obsidian 一键发布**：写完文章按快捷键，网站自动更新，无需碰文件系统或服务器
- **动态内容管理**：博文和项目元数据存储在 PocketBase 数据库中，不再依赖 git 管理内容
- **Works 板块统一**：合并现有的 Projects 和 Demos 为统一的 Works 板块
- **独立项目部署**：各小应用独立 build/deploy，主站通过 nginx 分发

## 2. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    nginx (47.99.54.65:80)                   │
├──────────┬──────────────┬──────────────┬────────────────────┤
│  /       │  /api/       │  /_/         │  /<app-slug>/      │
│  dist/   │  → PB :8090  │  → PB Admin  │  各项目独立静态部署  │
│  静态文件 │  REST API    │  basic auth  │  alias/proxy_pass  │
└──────────┴──────┬───────┴──────────────┴────────────────────┘
                  │
          ┌───────┴───────┐
          │  PocketBase   │  ← 唯一常驻进程 (systemd)
          │  :8090        │
          │  SQLite + API │
          └───────┬───────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
 Obsidian     Webhook       SyncFlow
 QuickAdd    → Build       （以后接入）
```

### 核心原则

1. **代码与内容分离**：GitHub 管源码（页面、样式、脚本），PocketBase 管内容（文章、项目元数据）
2. **静态优先**：最终产物始终是纯静态 HTML/CSS/JS，不引入 SSR
3. **唯一常驻进程**：仅 PocketBase（systemd 守护），不需要 Node 进程 7x24 运行
4. **自动化管道**：内容变更 → webhook → build → 静态文件更新

## 3. PocketBase 数据模型

### 3.1 posts collection

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| title | plain text | ✓ | 文章标题 |
| slug | plain text (unique) | ✓ | URL 标识符，从文件名自动生成 |
| content | editor (rich text) | ✓ | Markdown 正文 |
| description | plain text | | 摘要/SEO description |
| pubDate | date | ✓ | 发布日期 |
| updatedDate | date | | 最后更新日期 |
| tags | json (string[]) | | 标签数组 |
| series | plain text | | 所属系列名称 |
| featured | bool | | 是否精选（首页展示） |
| status | select: draft / published | ✓ | 发布状态。draft 不会被 sync 脚本拉取 |
| cover | file (single) | | 封面图，支持上传 |
| source | select: obsidian / site | | 创作来源 |

### 3.2 projects collection（即 Works 板块）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| name | plain text | ✓ | 项目名称 |
| slug | plain text (unique) | ✓ | URL 标识符 |
| description | editor (rich text) | ✓ | 项目详细说明 (Markdown) |
| status | select: idea / wip / shipped | ✓ | 开发状态 |
| deployType | select: static-deployed / embedded / github-only / planned | ✓ | 部署形态 |
| repoUrl | url | | GitHub 仓库链接 |
| demoUrl | url | | 在线体验链接 |
| stack | json (string[]) | | 技术栈标签 |
| screenshots | file (multi) | | 项目截图 |
| order | number | | 排序权重 |

**deployType 说明：**
- `static-deployed`：独立 build 并部署在 nginx 子路径下的项目（如 Aquaworld）
- `embedded`：作为 React 端岛嵌入主站 Astro 页面的小应用
- `github-only`：仅有 GitHub 仓库，无在线部署（如 RelGraph）
- `planned`：规划中的项目，仅展示构想

### 3.3 platforms collection（跨平台分发记录）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| post | relation → posts | ✓ | 关联文章 |
| platform | select: wechat-channel / toutiao / zhihu / xiaohongshu | ✓ | 平台 |
| url | url | | 分发链接 |
| publishedAt | date | | 分发时间 |

> 注：SyncFlow 目前未开发完成，platforms 表暂用于手动记录分发链接。日后 SyncFlow 开发完毕后回写至此表。

## 4. 构建管道

### 4.1 工作流

```
PocketBase (内容变更)
    │
    │ webhook (posts collection: create / update / delete)
    ▼
scripts/webhook-receiver.mjs
    │ 接收 POST，验证来源
    │ 执行 npm run build
    ▼
npm run build
    │
    ├─ 1. node scripts/sync-from-pb.mjs
    │     ├─ GET  /api/collections/posts/records?filter=(status='published')
    │     │     → 写入 src/content/blog/<slug>.md
    │     └─ GET  /api/collections/projects/records
    │           → 写入 src/content/projects/<slug>.md
    │
    └─ 2. astro build
          └─ Astro 读取 content collections → 产出 dist/
```

### 4.2 scripts/sync-from-pb.mjs 规范

```
职责：从 PB API 拉取内容，生成 Astro content collection 可读的 .md 文件

输入：
  - POCKETBASE_URL 环境变量（默认 http://127.0.0.1:8090）
  - 可选 POCKETBASE_TOKEN（管理端操作需要）

输出：
  - src/content/blog/<slug>.md（每篇文章一个文件，含 YAML frontmatter + Markdown 正文）
  - src/content/projects/<slug>.md（每个项目一个文件）

行为：
  - 每次运行全量覆盖目标目录（先清空再写入）
  - 仅拉取 status=published 的文章
  - 不发布的文章 (draft) 不出现在生成文件中
  - 退出码 0=成功，非0=失败（阻止后续 astro build）
```

### 4.3 scripts/webhook-receiver.mjs 规范

```
职责：接收 PB webhook 通知，触发 build

监听端口：WEBHOOK_PORT 环境变量（默认 4322）
端点：POST /

行为：
  - 接收 PB webhook 的 JSON body
  - 校验 collection 类型（仅响应 posts 变更）
  - 执行 npm run build（使用 child_process.spawn）
  - 返回 200 { status: 'ok' } 或 500 { status: 'error', message }
  - build 过程中拒绝重复请求（加锁）

安全：
  - 仅监听 127.0.0.1（不对外暴露）
  - 可选 shared secret 校验（PB webhook header）
```

## 5. nginx 配置（待实施）

```nginx
# 主站静态文件
location / {
    alias /home/wuzz/Xthing.Link/dist/;
    try_files $uri $uri/ /index.html;
}

# index.html 不缓存
location = /index.html {
    alias /home/wuzz/Xthing.Link/dist/index.html;
    add_header Cache-Control "no-cache, must-revalidate";
}

# 静态资源长缓存
location /assets/ {
    alias /home/wuzz/Xthing.Link/dist/assets/;
    add_header Cache-Control "public, max-age=2592000, immutable";
}

# PocketBase REST API
location /api/ {
    proxy_pass http://127.0.0.1:8090/api/;
    add_header Cache-Control "no-store";
}

# PocketBase Admin UI (basic auth 保护)
location /_/ {
    proxy_pass http://127.0.0.1:8090/_/;
    auth_basic "PocketBase Admin";
    auth_basic_user_file /etc/nginx/.htpasswd;
}

# Aquaworld（现有）
location ^~ /Aquaworld/ {
    alias /home/wuzz/Aquaworld/dist/;
    try_files $uri $uri/ /Aquaworld/index.html;
}

# 通用项目部署模板（按需新增）
# location ^~ /<project-slug>/ {
#     alias /home/wuzz/projects/<project-slug>/dist/;
#     try_files $uri $uri/ /<project-slug>/index.html;
# }
```

## 6. Obsidian 集成（Phase 3）

### 方式：QuickAdd 宏（或独立 Node 脚本）

```
用户在 Obsidian 中写完文章
    │
    │ 确保 frontmatter 含 publish: true / status: published
    │
    ▼
触发 QuickAdd 宏 / CLI 命令
    │
    │ 读当前文件的 frontmatter + 正文
    │ 调 PocketBase API: POST 或 PATCH /api/collections/posts/records
    │
    ▼
文章内容发到 PB
    │
    │ PB webhook 自动触发服务器 build
    ▼
网站更新（30s 内生效）
```

### frontmatter 约定

Obsidian 文章 frontmatter 与 PB 字段的映射：

| Obsidian frontmatter | PB 字段 |
|---------------------|---------|
| `title` | title |
| `slug` (或从文件名自动生成) | slug |
| `description` | description |
| `date` / `pubDate` | pubDate |
| `updated` / `updatedDate` | updatedDate |
| `tags` | tags |
| `series` | series |
| `featured` | featured |
| `status` (draft / published) | status |
| `cover` | cover (文件上传) |

## 7. 迁移策略

### 从 v1 静态到 v2 动态

**现状：**
- `src/content/blog/` 下有 17 篇 .md 文章
- `src/content/projects/` 下有 3 个 .md 项目定义
- 内容通过 git 管理
- 发布流程：改 .md → git push → 服务器 pull → build

**迁移步骤：**
1. PocketBase 建好 collections
2. 编写一次性迁移脚本：遍历现有 .md 文件 → POST 到 PB API
3. 验证 PB 中内容完整
4. 将 `src/content/blog/` 和 `src/content/projects/` 加入 `.gitignore`（保留目录 + .gitkeep）
5. 创建 `npm run sync` 脚本（调用 sync-from-pb.mjs）
6. 修改 `npm run dev` 和 `npm run build` 前置 sync
7. 现有 .md 文件仍保留在 git 历史中，但不再作为内容源

**回滚方案：**
- 将 gitignore 的 .md 文件恢复即可回到 v1 模式
- PB 只是增量，不破坏现有架构

## 8. 开发工作流

### 日常开发（改代码）

```
VS Code 改 .astro / .ts / .css
    → npm run dev（自动 sync + dev server）
    → git push
    → 服务器 git pull && npm run build
```

### 发布文章（改内容）

```
Obsidian 写文章
    → 快捷键推到 PB
    → PB webhook 触发服务器 build
    → 网站自动更新
```

### 管理项目信息

```
PB Admin UI (/_/)
    → projects collection 中增改项目
    → 手动触发 build 或等下次 webhook
```

### 本地开发需要 PB

开发时 sync 脚本需要连接 PocketBase：
- **选项 1**：本地启动 PB（`./pocketbase serve`），数据独立于生产
- **选项 2**：连接服务器 PB（`POCKETBASE_URL=http://47.99.54.65/api`），用生产数据

## 9. npm scripts 变更

```json
{
  "scripts": {
    "sync": "node scripts/sync-from-pb.mjs",
    "dev": "npm run sync && astro dev",
    "build": "npm run sync && astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "node --test",
    "webhook": "node scripts/webhook-receiver.mjs"
  }
}
```

## 10. 分阶段实施计划

### Phase 1 — 基础设施

**目标：PB 跑起来，sync 脚本打通，nginx 改造完成**

- [ ] 服务器安装 PocketBase v0.39.5，systemd 守护
- [ ] 创建 posts / projects / platforms collections
- [ ] 编写 `scripts/sync-from-pb.mjs`
- [ ] 编写一次性迁移脚本，将 17 篇博文 + 3 个项目导入 PB
- [ ] 更新 `.gitignore`：`src/content/blog/*.md`、`src/content/projects/*.md`（保留目录结构）
- [ ] 更新 npm scripts：`dev` / `build` 前置 `sync`
- [ ] nginx 配置：`/api/` → PB `:8090`，`/_/` 加 basic auth
- [ ] 验证：`npm run build` 成功，页面内容与 v1 一致

### Phase 2 — 自动化管道

**目标：内容变更自动触发 build**

- [ ] 编写 `scripts/webhook-receiver.mjs`
- [ ] PB 后台配置 webhook 指向 receiver
- [ ] 验证：PB 中修改一篇文章 → webhook 触发 → 网站更新

### Phase 3 — Obsidian 集成

**目标：从 Obsidian 一键发布**

- [ ] 编写 Obsidian QuickAdd 宏（或 Node CLI 脚本）
- [ ] 映射 Obsidian frontmatter ↔ PB 字段
- [ ] 验证：Obsidian 写文章 → 快捷键推送 → PB 存储 → 网站可见

### Phase 4 — Works 板块

**目标：统一项目/Demos 入口**

- [ ] 设计 Works 页面（替代现有 `/projects` + `/demos`）
- [ ] Works 页面根据 deployType 区分渲染
- [ ] 独立项目部署目录标准化
- [ ] 验证：新增一个 demo 项目 → 独立部署 → 主站 Works 页展示

## 11. 与环境相关的文件

| 文件 | 用途 | 管理方式 |
|------|------|---------|
| `.env` | `POCKETBASE_URL` 等本地配置 | `.gitignore`（不入库） |
| `.env.example` | 环境变量模板 | git 追踪 |
| `scripts/sync-from-pb.mjs` | PB → .md 同步 | git 追踪 |
| `scripts/webhook-receiver.mjs` | webhook 监听器 | git 追踪 |
| `scripts/migrate-to-pb.mjs` | 一次性迁移脚本 | git 追踪 |
| `src/content/blog/*.md` | 临时内容文件 | `.gitignore` |
| `src/content/projects/*.md` | 临时项目文件 | `.gitignore` |
| `pocketbase/` | PB 二进制 + 数据 | 仅服务器，不入库 |

## 12. 参考资料

- 架构原理图：`Vault4AI/Excalidraw/xthing-link-architecture-升级方案.md`
- 现有 v1 内容工作流：`docs/ai-context/content-workflow.md`
- 现有 v1 技术范围：`docs/ai-context/tech-scope.md`
- PocketBase 文档：https://pocketbase.io/docs/
