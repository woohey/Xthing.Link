---
title: 678KB 的 AI 助手：NullClaw 来了
description: 解决 AI 助手记性差的问题，三招让它拥有永久记忆能力。
pubDate: 2026-02-19
updatedDate: 2026-02-19
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


![](https://cdn.gooo.ai/gen-images/a7b081ade6a2d2dcee5dce71eb7b46cc153c8db6a85d2cf039ba5af38234a1ca.jpeg)

> **当所有人都在追求「功能更多」时，有人在追求「体积更小」。**
> 
> **从 OpenClaw 到 NullClaw，Claw 家族用一年时间，把 AI 助手从 28MB 压缩到 678KB。这不是技术炫技，而是在回答一个问题：AI 助手的边界在哪里？**

---

春节假期结束，回来看到 Claw 家族又添新成员——NullClaw。

第一眼看到这个项目，我愣了一下：678KB 的二进制，1MB 内存占用，2 毫秒启动。这是 AI 助手？还是个计算器？

点开 GitHub，看完 README，我意识到：这可能是今年最值得关注的边缘 AI 项目之一。

---

 ## 01 NullClaw 是什么

简单说，它是 **OpenClaw 家族里最轻量的那个**。

如果你听说过 OpenClaw（那个用 TypeScript 写的全功能 AI 助手），NullClaw 就是它的「极简版兄弟」——用 Zig 语言重写，专门为边缘设备和嵌入式场景设计。

先看一组数据对比：

|   |   |   |   |   |   |
|---|---|---|---|---|---|
|项目|语言|内存|启动时间|二进制大小|硬件成本|
|OpenClaw|TypeScript|>1 GB|>500s|~28 MB|¥4,300|
|PicoClaw|Go|<10 MB|<1s|~8 MB|¥72|
|ZeroClaw|Rust|<5 MB|<10ms|3.4 MB|¥72|
|**NullClaw**|**Zig**|**~1 MB**|**<2ms**|**678 KB**|**¥36**|

看到最后一行的 ¥36 了吗？

这意味着，你可以在一块 **树莓派 Zero** 上跑一个完整的 AI 助手。

---

 ## 02 为什么要做这么小

这是我最开始的疑问。

OpenClaw 已经很好用了，为什么还要折腾出一个「极简版」？

答案在 README 的第一句话里：**Null overhead. Null compromise.**

翻译过来就是：零开销，不妥协。

### 场景一：边缘设备

想象一下，你有一个智能家居控制器，或者一个工业传感器，或者一个车载设备。

这些设备的算力有限，内存有限，但你希望它们能「理解指令」「自主决策」「联网协作」。

传统方案是把数据传到云端处理，但这意味着：

- 网络延迟
    
- 隐私风险
    
- 依赖云服务
    

NullClaw 的方案是：**把 AI 助手直接跑在设备上**。

678KB 的体积，意味着它可以塞进几乎任何设备。

### 场景二：安全敏感环境

有些场景，你不能依赖云服务。

比如军事、医疗、金融——这些领域对数据安全的要求极高。

NullClaw 是静态二进制，零运行时依赖（只需要 libc），这意味着：

- 没有供应链风险
    
- 可以完全离线运行
    
- 资源使用可预测
    

### 场景三：成本敏感场景

如果你要部署 1000 个 AI 代理，OpenClaw 需要 1000 台 Mac Mini（每台 ¥4,300）。

NullClaw 只需要 1000 块树莓派 Zero（每块 ¥36）。

成本差距：**120 倍**。

---

 ## 03 它能做什么

别被「678KB」骗了，NullClaw 的功能一点不弱。

它支持：

**AI 模型**：22+ 提供商（OpenAI、Anthropic、Ollama、DeepSeek……）  
**消息通道**：13 个（Telegram、Discord、Slack、iMessage、飞书、钉钉……）  
**记忆系统**：SQLite + 向量搜索  
**工具集**：18 个（shell、文件读写、浏览器、HTTP 请求……）  
**沙箱**：Landlock、Firejail、Docker

换句话说，它是一个 **完整的 AI 助手基础设施**，只是被压缩到了极致。

顺便提一句：别小看这 678KB，项目有 **~110 个源文件、~45,000 行代码、2,738 个测试**——该有的都有。

---

 ## 04 技术上怎么做到的

这是我最好奇的部分。

从 28MB 到 678KB，怎么做到的？

### 关键一：选对语言

NullClaw 用的是 **Zig**——一门追求极致控制力的系统编程语言。

Zig 的特点是：

- 编译时优化极致
    
- 零运行时开销
    
- 可预测的内存使用
    

相比 TypeScript（需要 Node.js 运行时）、Python（需要解释器），Zig 编译出来的就是纯粹的机器码。

### 关键二：模块化架构

NullClaw 的所有子系统都是 **vtable 接口**，不是「内置功能」。

你可以只编译你需要的模块，其他的全部剔除。

比如，如果你只需要 Telegram 通道 + OpenAI 模型，编译出来的二进制可能只有 **300KB**。

### 关键三：静态链接

没有动态库，没有运行时依赖，所有东西都打包在一个二进制里。

这也是为什么它能在嵌入式设备上跑——你不需要安装任何环境。

---

 ## 05 Claw 家族的进化逻辑

NullClaw 不是孤立的项目，它是 **Claw 家族**的一部分。

这个家族现在有 5 个成员：

1. **OpenClaw**（TypeScript）：功能最全，适合桌面和服务器
    
2. **NanoBot**（Python）：中等轻量，适合快速原型
    
3. **PicoClaw**（Go）：轻量级，适合单板计算机（一周 12K stars）
    
4. **ZeroClaw**（Rust）：极轻量，适合资源受限环境
    
5. **NullClaw**（Zig）：极致轻量，适合嵌入式和边缘设备
    

这个演化路径很有意思：

**从「功能优先」到「资源优先」**。

OpenClaw 是「我要做一个功能完整的 AI 助手」。  
NullClaw 是「我要做一个能跑在 5 美元开发板上的 AI 助手」。

两个方向，两种哲学，但都在探索 AI 助手的边界。

---

 ## 06 值得关注吗

我的答案是：**值得**。

不是因为它现在有多成熟（它还很年轻），而是因为它代表了一个方向：

**AI 不应该只存在于云端和高端设备，它应该无处不在。**

当 AI 助手可以跑在 36 元的开发板上，意味着：

- 智能家居可以真正「智能」
    
- 工业设备可以自主决策
    
- 个人隐私可以完全本地化
    

这是 AI 平民化的另一种路径。

---

 ## 07 怎么开始

如果你想试试 NullClaw，步骤很简单：

```
git clone https://github.com/nullclaw/nullclaw.git
cd nullclaw
zig build -Doptimize=ReleaseSmall

# 配置 API Key
nullclaw onboard --api-key sk-... --provider openrouter

# 开始对话
nullclaw agent -m "Hello, nullclaw!"
```

如果你没有 Zig 环境，也可以直接下载编译好的二进制（只有 678KB，下载秒完）。

---

 ## 写在最后

从 OpenClaw 到 NullClaw，我看到的不只是技术演进，更是一种思考方式的转变。

我们习惯了「更多功能、更强性能、更大模型」，但有时候，**「更小、更快、更简单」** 才是真正的创新。

NullClaw 还很年轻，生态还不完善，但它已经证明了一件事：

**AI 助手不需要 1GB 内存，678KB 也能跑。**

---

**如果你也在关注边缘 AI、嵌入式硬件，或者对 Claw 家族感兴趣**，欢迎在评论区交流。

**相关链接**：

- NullClaw GitHub: [https://github.com/nullclaw/nullclaw](https://github.com/nullclaw/nullclaw)
    
- OpenClaw 家族： [https://github.com/openclaw](https://github.com/openclaw)