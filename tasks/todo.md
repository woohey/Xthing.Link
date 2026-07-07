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

## Phase 5 — Cinematic UI 收口

- [x] 将动态视频背景提升为站点级视觉层
- [x] 首页与主要内容页共享同一背景动画
- [x] 导航搜索改为放大镜内联搜索
- [x] Works 页面标签降噪为文字型分类
- [x] `pet-necklace` 项目时间改为 git 历史
- [x] Aquaworld 在线体验链接指向站内部署

## Phase 6 — 历史项目档案与内容呈现

- [x] 在 PB projects 中新增 `8bees` 与 `aquasmart` 两个历史 Works 条目
- [x] 建立 `public/media/<slug>/` 项目媒体目录约定
- [x] Works 详情页支持项目 Logo、截图网格和点击大图预览
- [x] 历史档案项目右侧显示「项目档案」，不强行展示无效快捷链接
- [x] 支持 `data-summary-only="true"` 摘要专用段落，避免详情正文重复
- [x] 首页 Hero 副标题读取 `welcome` 文章摘要并保留多行显示
- [x] `sync-from-pb.mjs` 支持多行 YAML、安全剥离 PB editor 空段落

---

## 完成记录

### 2026-07-04 — Phase 1-4 编码 + 服务器部署
- PB v0.27.0 在阿里云 47.99.54.65 以 systemd 运行
- nginx 配置了 `/api/`、`/_/`（basic auth）、静态站
- webhook-receiver 以 systemd 运行，127.0.0.1:4322
- 18 篇博文 + 3 个项目成功迁移到 PB
- Build: 39 pages / 9.29s
- **踩坑**: PB `fields` 参数（非 `schema`）、`max: 0` 仍限 5000 字需设大值、PATCH fields 会覆盖 schema 导致字段丢失

### 2026-07-07 — Cinematic UI + Search 收口
- 全站启用同一套动态视频背景，视觉层从单页方案升级为站点级默认表现
- 独立 `/search/` 路由退场，导航里的放大镜直接承接站内搜索
- Works 页面把状态/技术/主题改成文字型分类，动作链接保留为可点 chip
- `pet-necklace` 的开始/更新时间改为从 git 历史提取，避免回落到 `1970-01-01`
- Aquaworld 的在线体验链接已指向站内 `/Aquaworld/`

### 2026-07-07 — 历史项目档案 + 首页 welcome 收口
- 新增 `8bees` 与 `aquasmart` 两个历史项目档案，分别使用 `public/media/8bees/` 与 `public/media/aquasmart/` 管理项目图片
- Works 详情页支持 Logo 与摘要并排、截图网格、Lightbox 大图预览，以及归档项目的「项目档案」侧栏
- PB 项目正文支持 `data-summary-only="true"` 摘要段落，sync 时写入 frontmatter 并从正文剥离
- 首页 Hero 副标题改为读取 `welcome` 文章摘要/description，多行站点宣言按换行渲染
- Build 验证通过；旧测试仍有历史断言需要后续更新
