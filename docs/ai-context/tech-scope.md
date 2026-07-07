# Xthing.Link v2 — 技术范围与部署形态

本文档确认站点技术选型与部署方式，作为工程与运维的单一事实来源。

## 前端框架

- **Astro（静态优先）**：`output: 'static'`，所有页面以静态 HTML 为主，不引入 SSR。
- **React Islands（按需交互）**：仪表盘、可视化等需要客户端交互的页面，以 Astro 中的 React 岛形式挂载。
- **新拟态设计系统**：`src/styles/global.css`（~1649 行），自定义属性体系，不引入 Tailwind 或其他 CSS 框架。

## 后端 / 内容中枢

- **PocketBase v0.27.0**：单 Go 二进制，内嵌 SQLite，自带 REST API + Admin UI。
- 部署方式：systemd 守护，监听 `127.0.0.1:8090`，通过 nginx `/api/` 反代对外暴露。
- Admin UI (`/_/`) 受 nginx basic auth 保护。

## 构建管道

```
内容变更 → PB webhook → webhook-receiver.mjs → npm run build
                                                    ├─ sync-from-pb.mjs (PB → .md)
                                                    └─ astro build (产出 dist/)
```

- `npm run build` = `npm run sync && astro build`
- `npm run dev` = `npm run sync && astro dev`
- sync 脚本从 PB 拉取内容，生成 `src/content/blog/*.md` 和 `src/content/projects/*.md`（临时产物，gitignored）
- Astro 的 content collection 管道完全不变，仍然从 .md 文件读取
- `sync-from-pb.mjs` 对多行 frontmatter 字符串使用 YAML block scalar，避免多行摘要导致 Astro 解析失败
- `sync-from-pb.mjs` 会剥离 PB editor 产生的空段落，并支持 `data-summary-only="true"` 的项目摘要专用段落

## 站点级 UI 层

- **Cinematic 背景层**：`src/layouts/BaseLayout.astro` 挂载 `src/components/CinematicHero.tsx`，首页、Writing、Series、Works、About 等页面共享同一视频背景。
- **视频透明度**：最大透明度为 90%，由 `VIDEO_MAX_OPACITY = 0.9` 控制。
- **搜索入口**：独立 `/search/` 页面已移除，导航栏放大镜以内联搜索承接站内检索。
- **Works 标签**：状态、技术、主题为文字型分类；详情、GitHub、在线体验等动作保留可点击链接。

## Works 媒体与历史档案

- 项目媒体资产放在 `public/media/<slug>/`，由 PB 正文通过 `/media/<slug>/...` 引用。
- `8bees` 和 `aquasmart` 是历史档案项目，使用 `deployType = planned` + `archive` 标签展示为「历史归档」。
- 详情页中 `.work-screenshot-card img` 自动支持 Lightbox 大图预览。
- `pet-necklace` 的项目起止时间由 git 历史推导；`8bees`、`aquasmart` 使用历史日期覆盖，避免空字段回落到 `1970-01-01`。

## 服务器部署

- **形态**：纯静态托管 + PocketBase API 层
- **Web 服务器**：Nginx 1.20.1，绑 80 端口
- **服务器**：阿里云 ECS `47.99.54.65`
- **项目路径**：`/home/wuzz/Xthing.Link/`
- **进程**：仅 PocketBase 常驻（systemd），无 Node 常驻进程

### nginx 分发规则

| 路径 | 目标 | 类型 |
|------|------|------|
| `/` | `/home/wuzz/Xthing.Link/dist/` | 静态 alias |
| `/api/` | `http://127.0.0.1:8090/api/` | 反向代理 |
| `/_/` | `http://127.0.0.1:8090/_/` | 反向代理 + basic auth |
| `/<app-slug>/` | `/home/wuzz/projects/<slug>/dist/` | 静态 alias（独立项目） |

## 缓存策略

- `/assets/*` → `Cache-Control: public, max-age=2592000, immutable`
- `index.html`（各层级） → `no-cache` / `must-revalidate`
- `/api/*` → `no-store`

## 非目标

- 不引入 SSR / Node 常驻进程
- 不引入 Docker / K8s 容器编排
- 不引入第三方 CMS（Strapi、Directus 等）
- 不在第一阶段完成跨平台自动分发（SyncFlow 未开发完成）
