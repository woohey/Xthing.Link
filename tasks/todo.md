# Xthing.Link v2 — 任务追踪

## Phase 1 — 基础设施

- [ ] 服务器安装 PocketBase v0.39.5，systemd 守护配置
- [ ] 创建 PB collections：posts / projects / platforms
- [ ] 编写 `scripts/sync-from-pb.mjs`
- [ ] 编写一次性迁移脚本 → 17 篇博文 + 3 个项目导入 PB
- [ ] 更新 `.gitignore`（src/content/blog/*.md, src/content/projects/*.md）
- [ ] 更新 npm scripts（dev/build 前置 sync）
- [ ] nginx 配置：`/api/` → PB, `/_/` + basic auth
- [ ] 验证：`npm run build` 成功，页面与 v1 一致

## Phase 2 — 自动化管道

- [ ] 编写 `scripts/webhook-receiver.mjs`
- [ ] PB 后台配置 webhook
- [ ] 验证：PB 改内容 → webhook 触发 → 网站更新

## Phase 3 — Obsidian 集成

- [ ] 编写 Obsidian QuickAdd 发布宏（或 Node CLI 脚本）
- [ ] frontmatter ↔ PB 字段映射
- [ ] 验证：Obsidian 写作 → 推送 → PB → 网站可见

## Phase 4 — Works 板块

- [ ] Works 页面设计（合并 /projects + /demos）
- [ ] 按 deployType 区分渲染
- [ ] 独立项目部署目录标准化
- [ ] 验证：新增 demo 项目 → 独立部署 → Works 页展示

---

## 完成记录
<!-- 各 Phase 完成后在此记录日期和结果 -->
