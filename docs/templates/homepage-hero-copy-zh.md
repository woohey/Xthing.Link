# 首页 Hero 中文文案模板

下面这版文案适合直接替换 [src/pages/index.astro](/Users/junzhaowoo/1024MyCoding/Xthing.Link/src/pages/index.astro) 里的 Hero 区域。

## 左侧主文案

```astro
<p class="soft-pill">以写作为主的技术小站</p>
<p class="hero-panel__eyebrow">内容优先</p>
<h1 class="page-title hero-panel__title">
  把项目、笔记和 <span>长期实验</span> 慢慢整理清楚
</h1>
<p class="page-subtitle hero-panel__subtitle">
  这里先发布技术写作，再把专题、项目和 Demo 串成一个更稳定、更耐读的个人技术档案。
</p>
<div class="hero-panel__actions">
  <a class="primary-link primary-link--button" href={ROUTES.blog}>先看最新文章</a>
  <a class="secondary-link secondary-link--button" href={ROUTES.projects}>再看项目</a>
</div>
<div class="hero-trust">
  <span class="hero-trust__item">文章先行</span>
  <span class="hero-trust__item">专题慢慢累积</span>
  <span class="hero-trust__item">项目承接结果</span>
</div>
```

## 右侧预览区文案

```astro
<p class="preview-panel__eyebrow">当前写作台</p>

<div class="preview-panel__card">
  <p class="preview-panel__title">最近在关注</p>
  <p class="preview-panel__body">
    IoT 实验、可视化、写作工作流，以及那些值得整理成长期笔记的小工具和项目。
  </p>
</div>

<div class="preview-panel__card preview-panel__card--soft">
  <p class="preview-panel__title">内容节奏</p>
  <div class="preview-panel__chips">
    <span class="preview-chip">写作</span>
    <span class="preview-chip">专题</span>
    <span class="preview-chip">项目档案</span>
  </div>
</div>

<div class="preview-panel__footer">
  <div class="preview-panel__mini">
    <span class="preview-panel__mini-label">最近专题</span>
    <strong>Site Foundations</strong>
  </div>
  <div class="preview-panel__mini">
    <span class="preview-panel__mini-label">发布方式</span>
    <strong>Obsidian 到主站</strong>
  </div>
</div>
```

## 替换建议

- 如果你想更偏“极客实验室”，可以把主标题里的“长期实验”改成“折腾记录”
- 如果你想更偏“技术写作主站”，可以把副标题再收得更克制一些
- 如果你后面主要写中文内容，这套文案会比当前英文版更贴合你的表达
