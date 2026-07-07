# Xthing.Link

Xthing.Link 是一个以内容为主的网站项目，定位为“技术写作主站 + 极客项目展示 + 少量交互 Demo”。

站点当前采用：
- Astro 静态优先架构
- 必要时使用 React islands 承载交互
- 输出静态 `dist/` 目录
- 部署到阿里云轻量应用服务器，由 Nginx 或 Caddy 提供服务
- PocketBase 作为内容唯一真相源，`npm run sync` 在构建前生成 Astro content collection 临时文件

## 目录结构

```text
.
├── docs/
│   ├── ai-context/
│   └── plans/
├── public/
├── src/
│   ├── components/
│   ├── content/
│   │   ├── blog/
│   │   └── projects/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   └── styles/
├── tests/
├── astro.config.mjs
└── package.json
```

## 内容模型

### Writing

所有文章以 PocketBase `posts` collection 为准。构建时 `scripts/sync-from-pb.mjs` 会把已发布文章生成到 `src/content/blog/`，这些 `.md` 是临时产物，禁止手动编辑。
`Writing` 是总站文章集合，`Series` 是其中一部分文章的专题组织方式。

### Works / Projects Collection

项目内容以 PocketBase `projects` collection 为准。构建时生成到 `src/content/projects/`，这些 `.md` 同样是临时产物。
项目页负责承接文章、Demo、在线体验和历史项目档案，不替代文章本身。

项目图片、Logo、截图等静态资产放在 `public/media/<slug>/`，在 PB 富文本里使用根路径引用，例如 `/media/8bees/logo.png`。

### Homepage Hero

首页 Hero 的副标题读取 slug 为 `welcome` 的文章摘要/description。多行文本会按换行显示；修改后需要执行 `npm run build` 才会更新 `dist/` 和 `astro preview`。

## 内容工作流

推荐工作流：

1. 在 Obsidian 中编写 Markdown 主稿
2. 将主稿整理为站点文章内容
3. 网站发布完整版本
4. 头条 / 知乎 / 小红书 等平台发布派生版本

也就是说：
- Obsidian 是唯一主稿源
- 网站是最完整版本
- 外部平台是分发渠道，而不是主内容仓库

补充说明见 [docs/ai-context/content-workflow.md](/Users/woohey/1024-Coding/Xthing.Link/docs/ai-context/content-workflow.md)。

## 常用命令

```bash
npm install
npm run dev
npm test
npm run build
```

## 当前验证方式

- `npm test`
  运行基于 `node:test` 的纯逻辑测试
- `npm run build`
  验证 Astro 内容 schema、页面路由和静态构建

`astro check` 目前还未启用，因为项目尚未安装 `@astrojs/check`。
