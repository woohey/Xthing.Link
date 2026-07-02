# 内容编辑指南

这份文档用于说明如何在本项目里：

- 新增文章
- 新增项目
- 修改首页 Hero 文案
- 使用 IDE 编辑 `.astro` / `.ts` / `.md`

## 1. 可以用 IDE 打开吗？

可以，完全建议你这样做。

适合直接用 IDE 打开的文件类型：

- `.astro`
- `.ts`
- `.md`
- `.css`

推荐的常见用法：

- 用 IDE 编辑 [src/pages/index.astro](/Users/junzhaowoo/1024MyCoding/Xthing.Link/src/pages/index.astro) 调整首页文案
- 用 IDE 编辑 [src/content/blog](/Users/junzhaowoo/1024MyCoding/Xthing.Link/src/content/blog) 里的 Markdown 写文章
- 用 IDE 编辑 [src/content/projects](/Users/junzhaowoo/1024MyCoding/Xthing.Link/src/content/projects) 维护项目页
- 用 IDE 查看 [src/content.config.ts](/Users/junzhaowoo/1024MyCoding/Xthing.Link/src/content.config.ts) 了解 frontmatter 允许哪些字段

## 2. 文章写在哪里？

文章统一写在：

- [src/content/blog](/Users/junzhaowoo/1024MyCoding/Xthing.Link/src/content/blog)

你可以直接复制 [blog-post-template.md](/Users/junzhaowoo/1024MyCoding/Xthing.Link/docs/templates/blog-post-template.md) 的内容，新建一个 Markdown 文件，例如：

- `src/content/blog/obsidian-workflow.md`
- `src/content/blog/iot-visualization-notes.md`

## 3. 项目内容写在哪里？

项目内容统一写在：

- [src/content/projects](/Users/junzhaowoo/1024MyCoding/Xthing.Link/src/content/projects)

当前参考文件是：

- [pet-necklace.md](/Users/junzhaowoo/1024MyCoding/Xthing.Link/src/content/projects/pet-necklace.md)

## 4. 首页文案改哪里？

首页结构在：

- [src/pages/index.astro](/Users/junzhaowoo/1024MyCoding/Xthing.Link/src/pages/index.astro)

你最常修改的是这几块：

- Hero 左侧文案
- Hero 右侧预览卡片文案
- 各 section 标题

中文 Hero 参考文案放在：

- [homepage-hero-copy-zh.md](/Users/junzhaowoo/1024MyCoding/Xthing.Link/docs/templates/homepage-hero-copy-zh.md)

你可以先把文案在这个模板里改顺，再复制到 `index.astro`。

## 5. 修改完成后怎么本地看效果？

在项目根目录运行：

```bash
npm run dev
```

然后浏览器打开：

```text
http://127.0.0.1:4321/
```

## 6. 修改完成后怎么发到服务器？

推荐顺序：

1. 本地写文章、改首页
2. 本地预览确认
3. 提交到 Git
4. 推到 GitHub
5. 服务器执行 `git pull -> npm test -> npm run build -> rsync`

当前你还不需要改服务器，只要先把本地内容整理好就行。
