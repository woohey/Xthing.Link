# Lessons Learned

## 2026-07-07: 站点级视觉层要只保留一份真相
**What happened:** 动态视频背景从单页方案扩展到全站默认层后，又把 Search 收口成导航内联搜索。
**Why it mattered:** 这类视觉和入口组件一旦分散到多个页面，就会很快出现样式、可见性和文案分叉。
**Rule:** 公共视觉层和公共入口尽量放在 `BaseLayout` / `Nav` 这一层统一管理，页面只负责内容本身。

## 2026-07-07: 项目时间戳别信空字段
**What happened:** `pet-necklace` 的 `startedAt` / `updatedAt` 原来落到空值，渲染成了 `1970-01-01`。
**Why it mattered:** 对代码项目来说，PB 的 `created` / `updated` 不一定能代表真实开始和活跃时间。
**Rule:** 对于主要由 git 驱动的项目，时间戳优先从仓库历史提取；PB 只保留内容真相，不承担版本历史语义。

## 2026-07-04: SSR over-engineering
**What happened:** 初始方案用 Astro Hybrid SSR + Node 常驻进程来实现「动态发布」。
**Why it was wrong:** solo 博客 build 只要 30 秒，SSR 带来的 Node 进程管理、SSR 缓存、页面重写等复杂度远大于收益。用户的「动态」需求本质是自动化发布工作流，不是运行时渲染。
**Rule:** 先问「真的需要服务端渲染吗？」。个人博客场景下，静态 build + webhook 触发几乎总是更优解。

## 2026-07-04: SyncFlow 假设
**What happened:** 方案设计时假设 SyncFlow 已开发完成，将跨平台分发纳入 Phase 3。
**Why it was wrong:** SyncFlow 实际未完成，不应作为方案的依赖项。
**Rule:** 验证所有外部依赖的实际状态。不确定的依赖先标记为「以后接入」，不要纳入当前计划。

## 2026-07-04: PocketBase v0.27 schema API 三大坑

### 坑 1: fields vs schema
**What happened:** PB 创建 collection 的 API，字段列表放在 `"fields"` 键下，不是 `"schema"`。
**Why it was wrong:** 使用 `"schema"` 时 PB 不报错，但只创建了 `id` 字段，其他字段全部丢弃。18 条数据导入后发现记录只有 4 个 key。
**Rule:** PocketBase v0.23+ API 字段数组统一用 `"fields"`，不要用 `"schema"`。

### 坑 2: text 字段 max: 0 不是「无限制」
**What happened:** `max: 0` 在 API response 中返回，但实际 PB 使用内部默认值 5000。3 篇超过 5000 字的文章导入失败。
**How fixed:** 必须在创建或更新字段时显式设置一个非零大值（如 `max: 200000`）。
**Rule:** 不要依赖 `max: 0`，长文本字段始终显式设 `max: 200000` 或更大。

### 坑 3: PATCH collection 的 fields 会覆盖整个 schema
**What happened:** 用 `PATCH /api/collections/posts` 更新 content 字段的 max 值时，`{"fields": [content_field_obj]}` 把整个 schema 替换成了只有 content 一个字段。
**How fixed:** 创建 collection 时就设好所有字段参数（包括 max），之后不再 PATCH。
**Rule:** 不要用 PATCH 修改 fields——要么在 Admin UI 手工操作，要么删掉重建。

## 2026-07-04: `gh auth setup-git` 绕过 VPN SSL 拦截
**What happened:** git push 反复失败 (`Empty reply from server`)，原因是 VPN/代理将 `github.com` DNS 解析到了 `198.18.0.22`（SSL 中间人拦截 IP）。
**How fixed:** `gh auth setup-git` 配置 gh CLI token 后 push 成功。
**Rule:** HTTPS git push 报 `Empty reply from server` 时，先用 `curl -v https://github.com` 看 DNS 解析是否正确。被代理拦截就用 `gh auth setup-git`。
