# 阿里云 Nginx 发布链路 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Xthing.Link 建立一条可重复执行的阿里云轻量应用服务器发布链路，使用 GitHub 作为代码源、服务器本机构建 Astro 静态站、Nginx 提供静态文件服务。

**Architecture:** 服务器维护一个 Git 仓库工作目录和一个独立的静态发布目录。每次发布从 GitHub 拉取最新代码，在服务器执行 `npm ci` 与 `npm run build`，再将 `dist/` 同步到 Nginx 指向的 `www/` 目录，最后校验并重载 Nginx。

**Tech Stack:** GitHub, Astro, Node.js 22, npm, rsync, Nginx, Ubuntu/Aliyun Linux

---

### Task 1: 确认服务器运行环境

**Files:**
- Modify: 无
- Test: 无

**Step 1: 登录服务器**

Run:

```bash
ssh <your-user>@<your-server-ip>
```

Expected: 成功进入阿里云轻量应用服务器 shell。

**Step 2: 检查基础工具**

Run:

```bash
git --version
node --version
npm --version
nginx -v
rsync --version
```

Expected: 所有命令可用；Node 版本不低于 `v22.12.0`。

**Step 3: 如果 Node 版本不满足，先安装或升级**

推荐使用 NodeSource 或 nvm 安装 Node 22。

Expected: `node --version` 输出满足项目要求。

**Step 4: 记录服务器系统信息**

Run:

```bash
uname -a
cat /etc/os-release
```

Expected: 明确服务器系统版本，便于后续排障。

### Task 2: 初始化服务器目录

**Files:**
- Create: `/srv/xthing-link/`

**Step 1: 创建目录结构**

Run:

```bash
sudo mkdir -p /srv/xthing-link/repo /srv/xthing-link/www /srv/xthing-link/logs
```

Expected: 三个目录均存在。

**Step 2: 调整目录属主**

Run:

```bash
sudo chown -R $USER:$USER /srv/xthing-link
```

Expected: 当前登录用户可直接写入这些目录。

**Step 3: 验证目录状态**

Run:

```bash
ls -la /srv/xthing-link
```

Expected: 可以看到 `repo`、`www`、`logs` 三个目录。

### Task 3: 配置 GitHub 拉取能力

**Files:**
- Create: `~/.ssh/id_ed25519`（如果不存在）

**Step 1: 检查是否已有可用 SSH key**

Run:

```bash
ls -la ~/.ssh
```

Expected: 确认是否已有现成 key 可复用。

**Step 2: 如无 key，则生成一套部署用 SSH key**

Run:

```bash
ssh-keygen -t ed25519 -C "xthing-link-deploy" -f ~/.ssh/id_ed25519
```

Expected: 生成公私钥文件。

**Step 3: 输出公钥并添加到 GitHub**

Run:

```bash
cat ~/.ssh/id_ed25519.pub
```

Expected: 复制公钥内容，添加到 GitHub 账号 SSH keys 或仓库 deploy key。

**Step 4: 验证 GitHub SSH 连接**

Run:

```bash
ssh -T git@github.com
```

Expected: GitHub 返回认证成功提示。

### Task 4: 在服务器拉取仓库

**Files:**
- Create: `/srv/xthing-link/repo`

**Step 1: clone 仓库**

Run:

```bash
git clone git@github.com:woohey/Xthing.Link.git /srv/xthing-link/repo
```

Expected: 仓库成功克隆。

**Step 2: 进入仓库并确认分支**

Run:

```bash
cd /srv/xthing-link/repo
git branch --show-current
git remote -v
```

Expected: 当前分支为 `main`，远端指向 GitHub 仓库。

### Task 5: 在服务器验证项目可构建

**Files:**
- Modify: 无

**Step 1: 安装依赖**

Run:

```bash
cd /srv/xthing-link/repo
npm ci
```

Expected: 安装完成，无致命错误。

**Step 2: 运行测试**

Run:

```bash
npm test
```

Expected: 全部测试通过。

**Step 3: 运行生产构建**

Run:

```bash
npm run build
```

Expected: `dist/` 成功生成。

**Step 4: 验证构建结果**

Run:

```bash
ls -la /srv/xthing-link/repo/dist
```

Expected: 能看到 `index.html` 及各栏目目录。

### Task 6: 配置 Nginx 站点

**Files:**
- Create: `/etc/nginx/sites-available/xthing-link`
- Create: `/etc/nginx/sites-enabled/xthing-link`（软链接）

**Step 1: 编写 Nginx 配置**

示例配置：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /srv/xthing-link/www;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

**Step 2: 启用配置**

Run:

```bash
sudo ln -s /etc/nginx/sites-available/xthing-link /etc/nginx/sites-enabled/xthing-link
```

Expected: 软链接创建成功。

**Step 3: 校验 Nginx 配置**

Run:

```bash
sudo nginx -t
```

Expected: `syntax is ok` 且 `test is successful`。

**Step 4: 重载 Nginx**

Run:

```bash
sudo systemctl reload nginx
```

Expected: Nginx 平滑重载成功。

### Task 7: 首次发布静态文件

**Files:**
- Modify: `/srv/xthing-link/www`

**Step 1: 同步构建结果**

Run:

```bash
rsync -av --delete /srv/xthing-link/repo/dist/ /srv/xthing-link/www/
```

Expected: 发布目录内容与 `dist/` 一致。

**Step 2: 检查发布目录**

Run:

```bash
find /srv/xthing-link/www -maxdepth 2 -type f | sort | head -50
```

Expected: 首页和栏目页面都已存在。

**Step 3: 浏览器访问站点**

Expected: 首页、`/blog/`、`/projects/`、`/series/` 可正常打开。

### Task 8: 写入部署脚本

**Files:**
- Create: `/srv/xthing-link/repo/scripts/deploy.sh`

**Step 1: 写脚本**

脚本内容至少包括：

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /srv/xthing-link/repo
git pull origin main
npm ci
npm test
npm run build
rsync -av --delete dist/ /srv/xthing-link/www/
sudo nginx -t
sudo systemctl reload nginx
```

**Step 2: 赋予执行权限**

Run:

```bash
chmod +x /srv/xthing-link/repo/scripts/deploy.sh
```

Expected: 脚本可执行。

**Step 3: 手动运行一次脚本**

Run:

```bash
/srv/xthing-link/repo/scripts/deploy.sh
```

Expected: 整条发布链路一次走通。

### Task 9: 补充本地仓库文档

**Files:**
- Modify: `/Users/junzhaowoo/1024MyCoding/Xthing.Link/README.md`
- Create: `/Users/junzhaowoo/1024MyCoding/Xthing.Link/docs/ai-context/deployment.md`

**Step 1: 在 README 中加入部署摘要**

说明：

- 服务器目录结构
- 基本发布命令
- Nginx 托管方式

**Step 2: 新增详细部署文档**

内容包括：

- 环境依赖
- 首次上线步骤
- 日常更新步骤
- 常见排障命令

**Step 3: 校验文档**

Expected: 按文档可独立完成服务器部署。

### Task 10: 提交发布链路相关变更

**Files:**
- Modify: 本次涉及的文档与脚本

**Step 1: 检查改动**

Run:

```bash
git status --short
```

Expected: 只包含本次发布链路相关文件。

**Step 2: 提交**

Run:

```bash
git add README.md docs/ai-context/deployment.md docs/plans/2026-03-31-aliyun-nginx-deployment-design.md docs/plans/2026-03-31-aliyun-nginx-deployment-implementation-plan.md
git commit -m "docs: add aliyun nginx deployment plan"
```

Expected: 提交成功。

**Step 3: 推送 GitHub**

Run:

```bash
git push origin main
```

Expected: 远端仓库已同步部署文档。
