---
title: 我把 OpenClaw + Kimi Code 踩了个遍
description: 记录从 401 错误到跑通 OpenClaw+Kimi Code 配置的完整踩坑过程。
pubDate: 2026-03-10
updatedDate: 2026-03-10
draft: false
tags:
  - AI
  - OpenClaw
series: OpenClaw
featured: false
summary: 买了 Kimi Code 订阅，配好 API Key，满怀期待打开 OpenClaw，结果迎面就是一行红字：HTTP 401。从发现问题到彻底跑通的全过程记录。
source: obsidian
status: published
---

![OpenClaw + Kimi Code 踩坑指南](https://cdn.gooo.ai/gen-images/c2e64234b0e01077c808f927de54996bde3081d0d91c29ee915f486bfa958375.png)

_记录一次从 401 到跑通的完整踩坑过程_

**适合人群**：买了 Kimi Code 订阅、想接入 AI 编程工具、但总是配不好的同学

---

## 前言：一个 401 引发的血案

之前从 kimi 切换 minimax 踩了不少坑，这次计划花钱切回 kimi。

特意买了 Kimi Code 订阅，配好 API Key，满怀期待打开 OpenClaw，结果迎面就是一行红字：

**run error: HTTP 401: Invalid Authentication**

相信很多人都踩过这个坑。这篇文章把我从发现问题到彻底跑通的全过程都记录下来，希望能帮你少走弯路。

---

## 坑一：apiKey 写在了错误的地方

### 问题现象

OpenClaw 的认证体系分两层：

- `auth-profiles.json` —— 统一管理所有 provider 的 API Key
    
- `models.json` —— 定义每个模型的配置参数
    

但我的 models.json 里，kimi-coding 部分长这样：

```
"kimi-coding": {
  "baseUrl": "https://api.kimi.com/coding/",
  "api": "anthropic-messages",
  ...
  "apiKey": "sk-kimi-p9KN...旧Key"  ← 这里!
}
```

models.json 里的 apiKey 字段会直接覆盖 auth-profiles.json 里的正确 Key。这个旧 Key 早就失效了（之前配置的双模型遗留下来的），但它优先级更高，导致每次都用旧 Key 去请求，自然 401。

### 解决方法

把 models.json 里 kimi-coding 的 apiKey 字段整行删掉，让它从 auth-profiles.json 统一读取。

**✅ 原则：apiKey 只在 auth-profiles.json 里管，models.json 里不要出现 apiKey 字段。**

---

## 坑二：baseUrl 少了 /v1

### 问题现象

解决了 apiKey 问题之后，还是 401。继续排查，发现 baseUrl 写的是：

```
"baseUrl": "https://api.kimi.com/coding/"  ← 少了 /v1
```

用 curl 手动测试验证：

```
# 成功的请求
curl https://api.kimi.com/coding/v1/models \
  -H "Authorization: Bearer sk-kimi-你的Key"

# 返回:{"data":[{"id":"kimi-for-coding"...}]}
```

### 解决方法

把 baseUrl 改为 `https://api.kimi.com/coding/v1`（注意末尾不要加斜杠）。

---

## 坑三：model id 搞混了

上面的 curl 测试里，API 返回的 model id 是 `kimi-for-coding`，但 OpenClaw 官方文档里写的是 `k2p5`。

这里要搞清楚两个 id 的关系：

- `kimi-for-coding` —— Kimi API 接口真实返回的 model id
    
- **k2p5** —— OpenClaw 内部约定的别名，用于 models.json 和配置引用
    

在 models.json 里，model 的 id 字段填 `k2p5`(OpenClaw 约定）, OpenClaw 会在内部映射到真实的 model id。

primary model 引用写 `kimi-coding/k2p5`。

**✅ 原则：models.json 里的 id 字段遵循 OpenClaw 文档，不要照抄 API 返回的 model id。**

---

## 坑四：改了配置但不生效——session 缓存的锅

### 问题现象

明明配置文件已经改对了，重启 OpenClaw 之后底部状态栏还显示：

```
agent main | session main | moonshot/kimi-k2.5  ← 根本没读新配置
```

原因是 OpenClaw 有 session 缓存机制，旧的 session 会锁定之前的模型配置，即使你改了 openclaw.json 也不会立刻生效。

### 解决方法

删掉 session 缓存文件，强制 OpenClaw 重新读取配置：

```
rm ~/.openclaw/agents/main/sessions/sessions.json
```

然后重新运行 openclaw，就会读取最新配置了。

---

## 最终跑通的配置长什么样

### models.json 中 kimi-coding 部分

```
"kimi-coding": {
  "baseUrl": "https://api.kimi.com/coding/v1",
  "api": "anthropic-messages",
  "models": [
    {
      "id": "k2p5",
      "name": "Kimi for Coding",
      "reasoning": true,
      "input": ["text", "image"],
      "contextWindow": 262144,
      "maxTokens": 32768,
      "compat": {
        "requiresOpenAiAnthropicToolPayload": true
      }
    }
  ]
  // 注意:没有 apiKey 字段!
}
```

### openclaw.json 中 agents.defaults 部分

```
"model": {
  "primary": "kimi-coding/k2p5",
  "fallbacks": []
},
"models": {
  "kimi-coding/k2p5": {
    "alias": "Kimi K2.5"
  }
}
```

---

## 顺带一提：tool call 泄漏问题

跑通之后还发现一个有趣的现象：kimi-coding 模型在回复里有时会把 `<function_calls>` 标签当文本直接输出，而不是真正执行工具调用。

这个问题和 OpenClaw 3.7/3.8 版本的兼容适配有关，目前还没有完美的解决方案。

💡 **这个问题比较复杂，我专门写了一篇文章来详细讲解原理、影响范围和解决方案：**  
👉 [当 AI 把「内心独白」打印出来——深扒 tool call 泄漏问题](https://youmind.com/crafts/019cd7a1-bba1-7907-9978-b94406b7eb8c)

---

## 快速总结：四个坑的核心原因和解法

按踩坑顺序排列，每个坑的核心原因和解法：

1. **models.json 里硬编码了旧 apiKey** → 删掉 apiKey 字段，统一用 auth-profiles.json 管理
    
2. **baseUrl 少了 /v1** → 改为 `https://api.kimi.com/coding/v1`
    
3. **model id 搞混** → OpenClaw 用 `k2p5`，不是 API 返回的 `kimi-for-coding`
    
4. **改了配置不生效** → 删 `sessions.json` 清缓存
    

---

_希望这篇踩坑记录能帮你少走弯路。如果还有其他问题，欢迎评论区留言交流 🦞_