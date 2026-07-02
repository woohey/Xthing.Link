---
title: 当 AI 把「内心独白」打印出来——深扒 tool call 泄漏问题
description: 解决 AI 助手记性差的问题，三招让它拥有永久记忆能力。
pubDate: 2026-03-10
updatedDate: 2026-03-10
draft: false
tags:
  - AI
  - OpenClaw
series: OpenClaw
featured: false
summary: AI 助手记性差？不是它笨，是你没用对方法。三招让它变成永久记忆：用 RAG 建立外部知识库、设计合理的记忆结构、定期更新和维护。
source: obsidian
status: published
---

![AI内心独白泄漏问题](https://cdn.gooo.ai/gen-images/650cd0b9bae8727128848158ec381c936a0ea64bd46d1f23c517dcc2486c0b29.png)

_深扒 OpenClaw + Kimi Code 的 tool call 泄漏问题_

**一次真实踩坑 × 技术原理科普 × GitHub Issue 追踪**

---

## 那一天，AI 开始「自言自语」

跑通 OpenClaw + Kimi Code 配置没多久，一个奇怪的现象出现了。

我让 AI 帮我列出当前所有子 agent 的状态，结果它没有直接给我答案，而是在对话框里输出了这样一段文字：

```
<function_calls><invoke name="subagents">
    <arg name="action">list</arg></invoke></function_calls>
```

这是……工具调用的源代码？

AI 没有真正执行这个操作，而是把「应该悄悄做的事」直接打印了出来。就好像一个服务员在你面前大声念出：「我现在要去厨房通知厨师给 3 号桌上一份牛排」——但牛排始终没来。

**⚠️ 这就是 tool call 泄漏：模型把本该是内部行为的工具调用，当作普通文字输出给了用户。**

---

## 搞清楚：tool call 到底是什么

### AI 工具调用的正常流程

现代 AI 助手不只是聊天，它们还能调用工具——搜索网页、执行命令、读写文件、管理任务。这套机制叫做 **Function Calling** 或 **Tool Use**。

正常流程是这样的：

1. **用户发出指令**（比如：「帮我查一下今天的天气」）
    
2. **模型在内部生成一个工具调用请求**（这一步用户不可见）
    
3. **OpenClaw 捕获这个请求，执行对应工具**
    
4. **工具返回结果，模型用自然语言告诉你答案**
    

整个过程，用户只看到第 1 步和第 4 步。中间那些「机械运转」是隐藏的。

### 泄漏时发生了什么

当发生 tool call 泄漏时，步骤 2 的内容被当成普通文字输出了。模型没有用标准的工具调用格式「说话」，而是用自然语言描述了它「打算做什么」——或者更糟糕，直接把工具调用的 XML/JSON 原文喷出来。

**类比一下：**这就像一个程序员没有执行代码，而是把代码复制粘贴进了聊天框，然后说「你看，我是这样打算写的」。

![Tool Call 正常流程 vs 泄漏流程对比](https://cdn.gooo.ai/gen-images/a2cd7f68e87297b4713358c4163618779d7a531b03e911d08a78138cc8e5e316.png)

---

## 为什么 Kimi Code 特别容易出现这个问题

### 两种 API 协议的博弈

要理解这个问题，得先知道 AI 工具调用有两大主流协议：

- **OpenAI 协议**（openai-completions)：工具调用用 JSON 格式，结构清晰，是目前最通用的标准
    
- **Anthropic 协议**（anthropic-messages)：工具调用格式略有不同，更适合 Claude 系列模型
    

Kimi Code 的 API 走的是 Anthropic Messages 协议，这本来没问题。但 OpenClaw 在处理 kimi-coding 这个 provider 时，需要一个 compat 适配层来「翻译」格式——

```
"compat": {
  "requiresOpenAiAnthropicToolPayload": true
}
```

这个适配层告诉 OpenClaw:「kimi-coding 的工具调用格式需要特殊处理」。但问题在于，这套适配在当前版本还不够完善，导致某些工具调用没有被正确捕获，而是漏成了文本。

### 这不是 Kimi 独有的问题

查了一圈 GitHub Issues，发现这是整个 AI 工具圈的「通病」:

- **Gemini 模型**在 OpenClaw 里也会把工具调用输出为文本块，而不是实际执行（Issue #3344）
    
- **Kimi K2.5** 通过 Ollama 接入时，工具从来不被真正调用，模型只是文字描述自己「打算做什么」(Issue #14592)
    
- **NVIDIA NIM** 接入 Kimi K2.5 时，代码片段会「泄漏」进聊天记录而不是写入文件（Issue #23049）
    

这些问题的根源都一样：**模型的工具调用输出格式，和 OpenClaw 期望接收的格式对不上。**

### 更深层的原因：模型训练数据的差异

不同模型对「如何调用工具」有不同的理解，这来自它们各自的训练数据。Claude 系列天然就理解 Anthropic 的工具格式，GPT 系列理解 OpenAI 格式，而 Kimi 系列有自己的习惯。

当 OpenClaw 用一套统一的格式去「指挥」所有模型时，那些训练数据里没有见过这套格式的模型，就容易出现「误解」——它知道要调用工具，但不知道怎么用 OpenClaw 期望的方式表达。

---

## 这个 bug 现在的状态

### ⚠️ 重要发现：版本升级引发的问题

经过深入排查，发现这个 tool call 泄漏问题主要出现在 **OpenClaw 3.7 和 3.8 版本**。在此之前的版本（如 3.2）并没有大规模出现这类问题。

这意味着什么？

- **如果你还在用 3.2 版本且运行正常**，建议暂时不要急着升级到 3.7/3.8
    
- **如果你已经升级到 3.7/3.8 并遇到 tool call 泄漏**，可以考虑降级到 3.2 作为临时解决方案
    
- **降级方法**：在 OpenClaw 的 GitHub Releases 页面找到 3.2 版本，重新安装即可
    

💡 **版本选择建议：**

- 稳定优先 → 使用 3.2
    
- 尝鲜新特性 + 不依赖工具调用 → 可以用 3.7/3.8
    
- 工具密集型工作流 → 强烈建议停留在 3.2 或降级
    

### 官方的态度

目前 OpenClaw 官方已经知晓这类问题的存在，`requiresOpenAiAnthropicToolPayload` 这个 compat 标志正是他们为此加入的「临时补丁」。但从 GitHub 上的 issue 来看，这个补丁并没有完全解决问题。

相关 issue 还处于 Open 状态，没有明确的修复时间表。

### 社区的 workaround

目前社区里流传几种临时解法，效果参差不齐：

- **降级到 OpenClaw 3.2 版本**（最直接有效的方法，工具调用稳定）
    
- **切换到其他走 OpenAI 协议的模型**（比如 GPT-4、Claude 等，工具调用更稳定）
    
- 对于**只需要对话的任务**，kimi-coding 完全可用，只是调用外部工具时会有问题
    
- 部分用户反馈在 system prompt 里加入工具调用格式提示有一定效果，但不稳定
    

**💡 我的建议：**

- **首选方案**：如果你的工作流高度依赖工具调用（比如让 AI 自动管理文件、执行命令、调度任务），建议**降级到 OpenClaw 3.2 版本**，这是目前最稳妥的解决方案
    
- **备选方案**：如果必须使用新版本，可以考虑切换到其他支持 OpenAI 协议的模型
    

⚠️ **注意：**`moonshot/kimi-k2.5` 和 `kimi-coding` 是 Moonshot AI 的两个不同产品线，它们的 API Key 不通用。如果你只购买了 Kimi Code 订阅，无法直接切换到 `moonshot/kimi-k2.5`。

---

## 顺带一说：泄漏不只是 tool call

在研究这个问题的过程中，发现 OpenClaw 有一类更广泛的「内容泄漏」问题值得关注。

### 思维链泄漏（Thinking Block Leak）

部分模型（包括 Kimi K2.5）支持「思维链」——模型在回答前会先做一段内部推理。正常情况下这段推理是隐藏的，但某些配置下会直接暴露给用户（Issue #6442）:

```
{
  "type": "thinking",
  "thinking": "The user just sent 'ping'... I should keep it brief and friendly..."
}
```

如果你的 OpenClaw 接入了飞书、Discord 等团队工具，这种泄漏会让其他人看到 AI 的「内心活动」，多少有点尴尬。

### System Prompt 泄漏

更严重的是 system prompt 泄漏。你给 AI 设置的隐藏指令（比如人格设定、权限限制、敏感配置），在某些情况下可能被渲染为用户可见的文本。

如果你的 OpenClaw 对外开放给他人使用，这个问题要额外注意。

---

## 总结 & 期待

tool call 泄漏这件事，本质上是 AI 工具生态快速扩张带来的阵痛——模型越来越多，接入方式越来越杂，协议标准还没统一，兼容层的质量参差不齐。

对我们这些「半技术用户」来说，能做的事情是：

✅ **理解这个问题的存在**，选择更合适的模型做工具密集型任务  
✅ **关注 OpenClaw 的 GitHub 更新**，等待官方修复  
✅ **如果你也遇到了类似问题**，去 GitHub 对应 issue 点个 👍，帮助官方感知优先级

AI 工具还在快速进化，这些问题终究会被解决。但在那之前，多理解一点底层机制，能帮你少踩很多坑。

---

_如果你也遇到了类似问题，欢迎评论区交流 🦞_

**相关 GitHub Issues:** [#3344](https://github.com/openclaw/openclaw/issues/3344) · [#6442](https://github.com/openclaw/openclaw/issues/6442) · [#14592](https://github.com/openclaw/openclaw/issues/14592) · [#23049](https://github.com/openclaw/openclaw/issues/23049) · [#25227](https://github.com/openclaw/openclaw/issues/25227)