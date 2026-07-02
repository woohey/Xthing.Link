---
title: 宠物项圈控制台
description: NB-IoT 宠物项圈演示：地图、轨迹回放、围栏与告警，经 HTTP API 对接（模拟或线上）。
status: wip
demoSlug: pet-necklace
order: 10
tags:
  - iot
  - visualization
  - dashboard
stack:
  - Astro
  - React
  - Charts
featured: true
repoUrl: https://github.com/woohey/Xthing.Link
startedAt: 2026-03-29
updatedAt: 2026-04-20
relatedPosts:
  - welcome
---

演示页 `/demos/pet-necklace/` 按约定 API 拉取数据；默认使用站内静态 Mock，接入 PetNecklace 服务后设置 `PUBLIC_PET_API_MODE=live` 与 `PUBLIC_PET_API_BASE`。对接说明见仓库 `docs/plans/pet-necklace-对接开发材料.md`。
