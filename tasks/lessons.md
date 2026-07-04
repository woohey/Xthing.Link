# Lessons Learned

## 2026-07-04: SSR over-engineering
**What happened:** 初始方案用 Astro Hybrid SSR + Node 常驻进程来实现「动态发布」。
**Why it was wrong:** solo 博客 build 只要 30 秒，SSR 带来的 Node 进程管理、SSR 缓存、页面重写等复杂度远大于收益。用户的「动态」需求本质是自动化发布工作流，不是运行时渲染。
**Rule:** 先问「真的需要服务端渲染吗？」。个人博客场景下，静态 build + webhook 触发几乎总是更优解。

## 2026-07-04: SyncFlow 假设
**What happened:** 方案设计时假设 SyncFlow 已开发完成，将跨平台分发纳入 Phase 3。
**Why it was wrong:** SyncFlow 实际未完成，不应作为方案的依赖项。
**Rule:** 验证所有外部依赖的实际状态。不确定的依赖先标记为「以后接入」，不要纳入当前计划。
