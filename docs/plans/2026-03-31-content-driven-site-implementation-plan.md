# 内容驱动网站实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Xthing.Link 从“栏目索引站”升级为“内容驱动的技术写作主站”，补齐更丰富的内容元数据、专题结构，以及文章、项目、Demo 之间的互链关系，同时支持以 Obsidian 为源头的写作与多平台分发工作流。

**Architecture:** 继续采用 Astro 静态优先架构。通过扩展 Astro Content Collections、增加专题路由、调整现有页面模板，让首页、Writing、Series、Works 和导航内联 Search 都围绕内容主轴组织。Series 在信息架构上保留一级入口，但保持低于 Writing 的内容优先级。React islands 仅在后续确实需要交互时引入。部署目标保持为阿里云轻量应用服务器上的静态站点，由 Nginx 或 Caddy 对外提供 `dist/` 目录内容。

**Tech Stack:** Astro 6、Astro Content Collections、TypeScript、Markdown、CSS、可选 React islands

> **Progress Note (2026-07-07):** 这份计划里的 Search 已经收口成导航内联放大镜，不再保留独立 `/search/` 路由；首页与主要内容页也已经共享站点级 cinematic 背景层。`pet-necklace` 的项目时间戳开始改从 git 历史提取，避免回落成 `1970-01-01`。Works 已补入 `8bees`、`aquasmart` 两个历史项目档案，并形成 `public/media/<slug>/` 媒体约定。

---

### Task 1: 改动前基线确认

**Files:**
- Check: `package.json`
- Check: `astro.config.mjs`
- Check: `src/content.config.ts`

**Step 1: 确认当前脚本和架构入口**

阅读：
- `package.json`
- `astro.config.mjs`
- `src/content.config.ts`

Expected: 确认当前是 Astro 静态优先方案，已集成 React，且已有 `blog` / `projects` 内容集合。

**Step 2: 跑一次当前基线构建**

Run: `npm run build`
Expected: 构建成功，并输出当前站点到 `dist/`。

**Step 3: 提交基线文档检查点**

```bash
git add docs/plans/2026-03-31-content-driven-site-design.md docs/plans/2026-03-31-content-driven-site-implementation-plan.md
git commit -m "docs: add content-driven site design and implementation plan"
```

### Task 2: 扩展内容 schema

**Files:**
- Modify: `src/content.config.ts`
- Test: `src/content/blog/welcome.md`
- Test: `src/content/projects/pet-necklace.md`

**Step 1: 先写 schema 变更**

更新 `src/content.config.ts`，新增：
- Blog: `tags`, `series`, `featured`, `hero`, `canonical`, `readingTime`, `summary`, `cover`, `platforms`, `source`, `status`
- Projects: `tags`, `stack`, `repoUrl`, `demoUrl`, `startedAt`, `updatedAt`, `featured`, `relatedPosts`

初始阶段尽量设为可选字段，避免一次性迁移压力过大。

**Step 2: 跑构建，暴露 schema 和内容不匹配问题**

Run: `npm run build`
Expected: 要么直接通过，要么明确报出 frontmatter 校验错误。

**Step 3: 更新示例内容**

修改：
- `src/content/blog/welcome.md`
- `src/content/projects/pet-necklace.md`

补充符合新 schema 的真实元数据。

**Step 4: 再次构建**

Run: `npm run build`
Expected: 构建通过，内容拥有更丰富的元数据。

**Step 5: Commit**

```bash
git add src/content.config.ts src/content/blog/welcome.md src/content/projects/pet-necklace.md
git commit -m "feat: extend content metadata schemas"
```

### Task 3: 将 Blog 的对外呈现升级为 Writing

**Files:**
- Modify: `src/lib/routes.ts`
- Modify: `src/components/Nav.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/blog/index.astro`
- Modify: `src/pages/blog/[id].astro`
- Modify: `src/lib/search-index.ts`

**Step 1: 更新对外文案**

保留底层 URL 为 `/blog`，避免过早引入 URL 迁移成本；但界面文案统一改为 `Writing`。

**Step 2: 同步首页与搜索文案**

让首页入口和搜索索引描述都使用 `Writing` 概念，而不是 `Blog`。

**Step 3: 构建验证**

Run: `npm run build`
Expected: `/blog` 仍正常生成，但对用户呈现的是 `Writing`。

**Step 4: Commit**

```bash
git add src/lib/routes.ts src/components/Nav.astro src/pages/index.astro src/pages/blog/index.astro src/pages/blog/[id].astro src/lib/search-index.ts
git commit -m "feat: present blog section as writing"
```

### Task 4: 将首页重构为内容驱动首页

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/lib/search-index.ts`
- Optional Modify: `src/styles/global.css`

**Step 1: 编写首页数据查询逻辑**

加载：
- 最近文章
- 专题摘要或从内容中推导出的系列信息
- 一个精选项目

优先使用 Astro 构建期查询，不增加不必要的客户端逻辑。

**Step 2: 替换当前栏目卡片结构**

首页改为：
- hero
- latest writing
- ongoing series
- featured project
- 可选 notes 占位

要求：`Latest Writing` 明显强于 `Ongoing Series`，保证首页仍然是“写作为主”。

**Step 3: 仅补充必要样式**

尽量复用现有卡片和网格基础样式，不在这一阶段做大规模视觉重构。

**Step 4: 构建并人工检查**

Run: `npm run build`
Expected: 首页新结构正常生成，且没有内容缺失导致的报错。

**Step 5: Commit**

```bash
git add src/pages/index.astro src/styles/global.css src/lib/search-index.ts
git commit -m "feat: turn homepage into content-driven front page"
```

### Task 5: 建立 Series 体系与专题页

**Files:**
- Create: `src/lib/series.ts`
- Create: `src/pages/series/index.astro`
- Create: `src/pages/series/[series].astro`
- Modify: `src/components/Nav.astro`
- Modify: `src/lib/search-index.ts`

**Step 1: 实现专题分组工具**

创建 `src/lib/series.ts`，负责：
- 按 `series` 对文章分组
- 安全生成 slug
- 提供专题摘要和文章排序

**Step 2: 新增专题列表页**

`src/pages/series/index.astro` 展示所有专题及其基础统计和简介。
要求：即使只有 2 到 3 个专题，页面也应保持成立，不要为了数量少而引入空占位。

**Step 3: 新增专题详情页**

`src/pages/series/[series].astro` 展示：
- 专题标题
- 简介
- 有序文章列表
- 相关项目

**Step 4: 加入导航与搜索**

导航中加入 `Series`，并将专题加入搜索索引。

**Step 5: 构建验证**

Run: `npm run build`
Expected: `/series/` 及所有生成的 `/series/<slug>/` 页面均构建成功。

**Step 6: Commit**

```bash
git add src/lib/series.ts src/pages/series/index.astro src/pages/series/[series].astro src/components/Nav.astro src/lib/search-index.ts
git commit -m "feat: add series navigation and pages"
```

### Task 6: 为 Writing 增加标签体系

**Files:**
- Create: `src/lib/tags.ts`
- Create: `src/pages/tags/[tag].astro`
- Modify: `src/pages/blog/index.astro`
- Modify: `src/pages/blog/[id].astro`
- Modify: `src/lib/search-index.ts`

**Step 1: 实现标签工具**

创建 `src/lib/tags.ts`，负责标签标准化、排序、计数。

**Step 2: 在文章页展示标签**

在：
- 文章列表卡片
- 单篇文章头部或尾部

展示标签信息。

**Step 3: 生成标签落地页**

新增 `/tags/<tag>/` 页面，用于聚合同标签内容。

**Step 4: 增强搜索**

将 tags 纳入搜索索引。

**Step 5: 构建验证**

Run: `npm run build`
Expected: 标签页生成正确，文章页元数据显示自然。

**Step 6: Commit**

```bash
git add src/lib/tags.ts src/pages/tags/[tag].astro src/pages/blog/index.astro src/pages/blog/[id].astro src/lib/search-index.ts
git commit -m "feat: add tag metadata and tag pages"
```

### Task 7: 支持 Obsidian 主稿与多平台分发元数据

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/pages/blog/index.astro`
- Modify: `src/pages/blog/[id].astro`
- Optional Create: `docs/ai-context/content-workflow.md`

**Step 1: 确认内容字段已覆盖工作流**

确保 Blog schema 支持：
- `canonical`
- `platforms`
- `source`
- `status`
- `summary`
- `cover`

**Step 2: 在文章模板中合理展示分发信息**

文章详情页可按条件展示：
- 原文主站标识
- 已同步平台链接
- 更新时间或发布状态

避免把页面做成运营后台，只保留对读者有价值的信息。

**Step 3: 补一份内容工作流文档**

新增或补充文档，说明：
- Obsidian 是唯一主稿源
- 网站发布完整版本
- 外部平台发布派生版本
- 图片、frontmatter、平台链接如何维护

**Step 4: 构建验证**

Run: `npm run build`
Expected: 新增字段不会破坏现有文章渲染，页面在有无平台链接时都能优雅展示。

**Step 5: Commit**

```bash
git add src/content.config.ts src/pages/blog/index.astro src/pages/blog/[id].astro docs/ai-context/content-workflow.md
git commit -m "feat: support obsidian-first publishing workflow"
```

### Task 8: 强化项目页为“实践证据页”

**Files:**
- Modify: `src/pages/projects/index.astro`
- Modify: `src/pages/projects/[id].astro`
- Modify: `src/content/projects/pet-necklace.md`
- Optional Modify: `src/styles/global.css`

**Step 1: 丰富项目列表卡片**

优先展示：
- 状态
- 技术栈
- 是否精选
- 是否有 Demo

**Step 2: 重构项目详情模板**

项目页按以下结构组织：
- 背景
- 目标
- 难点
- 当前状态
- 技术栈
- 相关文章
- Demo
- Repo

缺失字段应优雅降级，不要强制报空。

**Step 3: 扩展示例项目内容**

扩充 `src/content/projects/pet-necklace.md` 的正文和关联文章信息。

**Step 4: 构建并检查**

Run: `npm run build`
Expected: 项目页结构更清晰，且不破坏旧内容。

**Step 5: Commit**

```bash
git add src/pages/projects/index.astro src/pages/projects/[id].astro src/content/projects/pet-necklace.md src/styles/global.css
git commit -m "feat: strengthen project pages with technical context"
```

### Task 9: 建立文章与项目的双向互链

**Files:**
- Modify: `src/pages/blog/[id].astro`
- Modify: `src/pages/projects/[id].astro`
- Modify: `src/lib/search-index.ts`

**Step 1: 从 metadata 中解析关联关系**

利用 `relatedPosts` 及文章中的关联信息生成互链关系。

**Step 2: 在页面中渲染关联区块**

添加：
- 文章页中的“Related project”
- 项目页中的“Related writing”

**Step 3: 构建验证**

Run: `npm run build`
Expected: 只有在存在关联信息时才显示相关区块，且链接有效。

**Step 4: Commit**

```bash
git add src/pages/blog/[id].astro src/pages/projects/[id].astro src/lib/search-index.ts
git commit -m "feat: link writing and projects bidirectionally"
```

### Task 10: 让 About 与 README 对齐真实站点定位

**Files:**
- Modify: `src/pages/about.astro`
- Modify: `README.md`

**Step 1: 重写 About**

弱化框架说明，强化：
- 长期关注的问题
- 实验与写作风格
- 读者能在这里看到什么

**Step 2: 替换 Astro 默认 README**

README 应说明：
- 站点定位
- 目录结构
- Content Collections
- 常用命令
- 阿里云轻量应用服务器上的静态部署方式
- Obsidian 到网站再到多平台派生分发的基本流程

**Step 3: 构建验证**

Run: `npm run build`
Expected: 站点仍可构建，说明文档与实际一致。

**Step 4: Commit**

```bash
git add src/pages/about.astro README.md
git commit -m "docs: align about page and readme with site direction"
```

### Task 11: 让 Search 收口为导航内联搜索

**Files:**
- Modify: `src/lib/search-index.ts`
- Modify: `src/components/Nav.astro`
- Delete: `src/pages/search.astro`

**Step 1: 复用现有静态索引**

纳入：
- tags
- series
- stack
- 关联项提示

**Step 2: 将结果入口放进导航**

用放大镜触发内联搜索面板，保留静态索引和即时过滤，但不再维护独立 Search 页面。

**Step 3: 构建验证**

Run: `npm run build`
Expected: 放大镜搜索可用，`/search/` 路由不再生成。

**Step 4: Commit**

```bash
git add src/lib/search-index.ts src/components/Nav.astro src/pages/search.astro
git commit -m "feat: inline site search in navigation"
```

### Task 12: 为 Demo 页补齐上下文

**Files:**
- Modify: `src/pages/demos/index.astro`
- Modify: `src/pages/demos/pet-necklace/index.astro`

**Step 1: 优化 Demo 列表页**

让每个 Demo 更明确地指向对应项目和相关文章。

**Step 2: 改善占位 Demo 页**

即使暂时还是占位，也应包含：
- 这个 Demo 计划展示什么
- 项目页链接
- 相关文章链接
- 后续会接入更完整交互的说明

**Step 3: 构建验证**

Run: `npm run build`
Expected: Demo 页仍然保持静态安全，同时和整个内容体系连接更紧密。

**Step 4: Commit**

```bash
git add src/pages/demos/index.astro src/pages/demos/pet-necklace/index.astro
git commit -m "feat: connect demos back to projects and writing"
```

### Task 13: 进入视觉设计前的 UI 检查点

**Files:**
- Check: `src/pages/index.astro`
- Check: `src/styles/global.css`
- Check: relevant layout and listing pages

**Step 1: 在视觉打磨前暂停确认**

在准备做明显视觉升级时，先和用户确认：这是引入 `ui-ux-pro-max` 技能做风格参考的时机。

**Step 2: 复查当前视觉系统**

识别哪些部分应保持稳定，哪些部分可按新的编辑型技术站风格重塑。

**Step 3: 生成聚焦的 UI 设计任务**

视觉打磨范围建议只覆盖：
- 首页
- Writing 列表与详情
- Projects 详情页
- Series 页面

Expected: 避免在内容结构未稳定前做过多表面视觉工作。

### Task 14: 最终验证

**Files:**
- Verify: all touched site files

**Step 1: 跑完整构建**

Run: `npm run build`
Expected: PASS

**Step 2: 跑 Astro 检查**

Run: `npm run astro -- check`
Expected: PASS 或只有可接受警告

**Step 3: 人工抽查关键路由**

检查：
- `/`
- `/blog/`
- `/series/`
- `/works/`
- `/works/pet-necklace/`
- 导航栏放大镜内联搜索

Expected: 关键页面都能正常渲染，且内容关系清晰。

**Step 4: 提交最终检查点**

```bash
git add .
git commit -m "feat: implement content-driven technical site structure"
```
