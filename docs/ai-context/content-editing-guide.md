# 内容编辑指南

这份文档说明如何在 Xthing.Link v2 中修改内容、首页文案和 Works 项目。当前版本已经进入 PocketBase 驱动模式：内容进 PB，代码和样式进 Git。

## 1. 哪些文件可以手动改？

可以直接用 IDE 修改：

- `.astro`、`.ts`、`.tsx`、`.css`
- `scripts/` 下的同步和发布脚本
- `public/` 下的静态资源
- `docs/`、`tasks/` 下的项目文档

不要手动修改：

- `src/content/blog/*.md`
- `src/content/projects/*.md`

这两个目录由 `scripts/sync-from-pb.mjs` 从 PocketBase 全量生成。手动改动会在下一次 `npm run sync`、`npm run dev` 或 `npm run build` 时被覆盖。

## 2. 文章写在哪里？

文章以 PocketBase `posts` collection 为准。

推荐流程：

1. 在 Obsidian 中写主稿。
2. 通过 QuickAdd/发布脚本推送到 PB。
3. 确认 `status = published`。
4. 执行 `npm run build`，让 `sync-from-pb.mjs` 生成静态页面。

草稿文章保持 `status = draft`，sync 会过滤掉。

## 3. Works 项目写在哪里？

项目以 PocketBase `projects` collection 为准，在 PB Admin UI 中编辑。

常用字段：

- `name` / `slug`：标题和 URL 标识，slug 建议使用小写。
- `description`：项目正文，支持 PB editor 生成的 HTML。
- `status`：`idea` / `wip` / `shipped`。
- `deployType`：`static-deployed` / `embedded` / `github-only` / `planned`。
- `tags`：主题和归档标签，例如 `archive`、`iot`、`mobile-app`。
- `stack`：技术栈，例如 `Astro`、`React`、`TypeScript`。
- `repoUrl` / `demoUrl`：代码仓库和在线体验。

历史项目档案可以使用 `deployType = planned` 并加 `archive` 标签。没有实际项目链接时，详情页右侧会显示「项目档案」而不是无意义的快捷链接。

## 4. 项目图片怎么加？

静态项目资产放在：

```text
public/media/<slug>/
```

例如：

```text
public/media/8bees/logo.png
public/media/8bees/app1.jpg
public/media/aquasmart/AquaU-1.jpeg
```

在 PB `description` 中引用时使用站点根路径：

```html
<img src="/media/8bees/logo.png" alt="8Bees Logo">
```

不要在 PB 中写本机绝对路径，例如 `/Users/woohey/...`。这些路径只能在本机存在，构建到服务器后会失效。

项目详情页里带有 `.work-screenshot-card img` 的图片会自动拥有点击查看大图的 Lightbox 行为，支持鼠标点击、Enter/Space 打开、Esc 关闭。

## 5. 项目摘要怎么控制？

`sync-from-pb.mjs` 会用项目正文第一段生成卡片摘要，并剥离 HTML 标签。

如果正文开头需要展示 Logo 或复杂布局，但卡片摘要想单独控制，可以在 PB HTML 中写：

```html
<p data-summary-only="true">这里是卡片和 Hero 使用的摘要。</p>
```

这一段只会进入 frontmatter 的 `description`，不会出现在项目详情正文里。

## 6. 首页 Hero 文案改哪里？

首页 Hero 副标题读取 slug 为 `welcome` 的文章摘要/description。

当前支持多行显示，例如：

```text
xThing.Link ， 探索未知  ，Things worth linking
「X × IoT × AI，探索一切连接」
X 是未知，物是万物。连接，是我们选择的方式。一个属于探索者的安静角落。关于技术、连接，以及那些认真做出来的小东西。
```

修改方式：

1. 在 PB 或 Obsidian 中更新 `welcome` 文章的 description/摘要。
2. 运行 `npm run build`。
3. 如果正在看 `astro preview`，刷新页面查看 `dist/` 中的新结果。

只运行 `npm run sync` 会更新临时 `.md`，但不会更新 `astro preview` 正在读取的 `dist/`。

## 7. 本地怎么看效果？

开发模式：

```bash
npm run dev
```

静态预览模式：

```bash
npm run build
npm run preview
```

如果你修改的是 PB 内容，并且当前浏览器在 `astro preview`，请运行 `npm run build`。`astro preview` 不会自动读取刚同步出来的源码文件，它只服务 `dist/`。

## 8. 当前视觉和搜索约定

- 全站通过 `BaseLayout` 挂载同一套 cinematic 视频背景。
- 背景视频最大透明度为 90%，在 `src/components/CinematicHero.tsx` 中控制。
- `/search/` 独立页面已经退场，导航右侧放大镜提供内联搜索。
- Works 列表里的「技术 / 状态 / 主题」使用文字型分类，底部功能链接继续保留可点击 chip。
