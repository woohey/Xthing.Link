# 阿里云 Nginx 发布链路设计方案

本文档定义 Xthing.Link 在阿里云轻量应用服务器上的第一阶段发布方案。

## 目标

- 保持当前站点的静态优先架构：`Astro build -> dist/`
- 使用 GitHub 作为唯一代码源
- 使用阿里云轻量应用服务器作为静态站托管环境
- 使用 Nginx 对外提供站点访问
- 让后续文章更新、样式调整和页面迭代都能用同一条发布路径完成

## 采用方案

采用“**服务器本机构建 + 发布目录分离**”方案：

- 仓库目录：`/srv/xthing-link/repo`
- 发布目录：`/srv/xthing-link/www`
- Nginx 根目录：`/srv/xthing-link/www`

发布时在服务器仓库目录中执行：

1. `git pull`
2. `npm install` 或 `npm ci`
3. `npm run build`
4. 同步 `dist/` 到 `/srv/xthing-link/www`
5. `nginx -t`
6. `systemctl reload nginx`

## 为什么不用直接指向仓库里的 dist

仓库目录与发布目录分离有几个明显好处：

- 避免把 `.git`、源码、`node_modules` 与 Web 根目录混在一起
- 便于回滚和排查问题
- 后续如果要做预发布目录、备份目录或自动化脚本，扩展更自然

## 服务器职责

第一阶段服务器承担这几件事：

- 拉取 GitHub 仓库
- 执行 Node/Astro 构建
- 托管静态产物
- 通过 Nginx 对外提供 HTTP/HTTPS 访问

第一阶段不引入这些内容：

- GitHub Actions 自动部署
- 容器化编排
- 常驻 Node 进程
- 数据库或服务端 API

## 目录结构

建议在服务器上使用以下目录：

```text
/srv/xthing-link/
├── repo/        # Git 仓库与构建环境
├── www/         # Nginx 对外提供的静态目录
└── logs/        # 可选，部署脚本日志
```

## Nginx 职责

Nginx 只负责静态文件服务，不承担构建任务。

推荐配置特征：

- `server_name` 指向正式域名
- `root /srv/xthing-link/www;`
- `index index.html;`
- `location / { try_files $uri $uri/ =404; }`

由于当前 Astro 站点是静态路由预生成，不需要为了 SPA 做统一回退到 `/index.html`。

## 发布命令建议

第一阶段先采用手动可控的发布命令，而不是一上来就做自动化：

```bash
cd /srv/xthing-link/repo
git pull origin main
npm ci
npm run build
rsync -av --delete dist/ /srv/xthing-link/www/
sudo nginx -t
sudo systemctl reload nginx
```

说明：

- `npm ci` 更适合服务器环境，前提是锁文件可靠
- `rsync --delete` 可以确保线上静态目录与本次构建结果一致
- 每次发布前先 `nginx -t`，避免错误配置导致服务中断

## 环境前提

服务器需要具备：

- Git
- Node.js 22.12+（与项目 `package.json` 的 engines 保持一致）
- npm
- Nginx
- rsync

同时需要具备：

- 拉取 GitHub 私有仓库的能力
- 域名已经解析到阿里云轻量应用服务器
- 服务器防火墙和阿里云安全组已放行 `80/443`

## GitHub 接入方式

推荐使用服务器 SSH key 连接 GitHub，而不是在服务器上手工输账号密码。

流程：

1. 在服务器生成 SSH key
2. 将公钥加入 GitHub 账号或仓库 deploy key
3. 使用 SSH 地址 clone 仓库

例如：

```bash
git clone git@github.com:woohey/Xthing.Link.git /srv/xthing-link/repo
```

## 验证标准

发布链路完成后，应满足：

- 服务器上能成功 `git pull`
- 服务器上能成功 `npm ci && npm run build`
- `/srv/xthing-link/www` 被正确更新
- `nginx -t` 通过
- 浏览器可访问首页、`/blog/`、`/projects/`、`/series/`

## 第二阶段可选升级

等第一阶段稳定后，可升级为：

- GitHub Actions 自动构建并 SSH 发布
- 部署脚本一键化
- HTTPS 自动化（Certbot）
- 发布前自动备份上一个 `www/` 版本

## 结论

第一阶段采用“**GitHub -> 阿里云服务器拉取 -> 服务器构建 -> rsync 到 Nginx 静态目录**”是当前最稳、最容易维护的路线。它足够简单，也为后续自动化发布预留了自然的升级路径。
