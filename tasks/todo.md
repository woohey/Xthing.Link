# Xthing.Link v2 — 任务追踪

## Phase 1 — 基础设施

- [x] 服务器安装 PocketBase v0.27.0，systemd 守护配置
- [x] 创建 PB collections：posts / projects / platforms
- [x] 编写 `scripts/sync-from-pb.mjs`
- [x] 编写一次性迁移脚本 → 18 篇博文 + 3 个项目导入 PB
- [x] 更新 `.gitignore`（src/content/blog/*.md, src/content/projects/*.md）
- [x] 更新 npm scripts（dev/build 前置 sync）
- [x] nginx 配置：`/api/` → PB, `/_/` + basic auth
- [x] 验证：`npm run build` 成功（39 pages in 9.29s）

## Phase 2 — 自动化管道

- [x] 编写 `scripts/webhook-receiver.mjs`
- [x] webhook-receiver systemd 部署
- [x] 验证：webhook 触发 → 自动 build 成功

## Phase 3 — Obsidian 集成

- [x] 编写 `scripts/publish-from-obsidian.mjs`（CLI 发布脚本）
- [ ] Obsidian QuickAdd 宏配置（用户端部署）
- [ ] 验证：Obsidian 写作 → 推送 → PB → 网站可见

## Phase 4 — Works 板块

- [x] Works 页面设计（合并 /projects + /demos）
- [x] 按 deployType 区分渲染（badge + 侧边栏链接）
- [x] 旧路由 301 重定向（/projects → /works, /demos → /works）
- [ ] 第一个新增小应用的完整部署验证
- [ ] 独立项目部署目录标准化 `/home/wuzz/<slug>/`

---

## 完成记录

### 2026-07-04 — Phase 1-4 编码 + 服务器部署
- PB v0.27.0 在阿里云 47.99.54.65 以 systemd 运行
- nginx 配置了 `/api/`、`/_/`（basic auth）、静态站
- webhook-receiver 以 systemd 运行，127.0.0.1:4322
- 18 篇博文 + 3 个项目成功迁移到 PB
- Build: 39 pages / 9.29s
- **踩坑**: PB `fields` 参数（非 `schema`）、`max: 0` 仍限 5000 字需设大值、PATCH fields 会覆盖 schema 导致字段丢失
