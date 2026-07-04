# Xthing.Link v2 — 技术范围与部署形态

本文档确认站点技术选型与部署方式，作为工程与运维的单一事实来源。

## 前端框架

- **Astro（静态优先）**：`output: 'static'`，所有页面以静态 HTML 为主，不引入 SSR。
- **React Islands（按需交互）**：仪表盘、可视化等需要客户端交互的页面，以 Astro 中的 React 岛形式挂载。
- **新拟态设计系统**：`src/styles/global.css`（~1649 行），自定义属性体系，不引入 Tailwind 或其他 CSS 框架。

## 后端 / 内容中枢

- **PocketBase v0.39.5**：单 Go 二进制，内嵌 SQLite，自带 REST API + Admin UI。
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
