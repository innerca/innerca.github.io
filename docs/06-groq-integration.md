# Groq AI 集成方案

## 1. 概述

Groq 提供免费的 LLM API 服务，用于为论文生成中文翻译、核心要点和标签。每日处理量在免费额度内完全够用。

## 2. 模型选择

| 模型 | 特点 | 适用场景 |
|------|------|----------|
| `llama-3.3-70b-versatile` | 综合能力强，支持 JSON 模式 | **默认选择**，批量论文总结 |
| `llama-3.1-8b-instant` | 速度更快 | 低延迟需求时可切换 |

使用 JSON 模式 (`response_format={"type": "json_object"}`) 确保模型输出结构化数据。

## 3. 速率限制与成本

| 指标 | 数值 |
|------|------|
| 速率限制 (RPM) | 30 次/分钟 |
| 每日限额 (RPD) | 1,000 次/天 |
| 成本 | **免费**，无需绑定信用卡 |

单次运行（~30 篇论文）：~60 秒，完全在免费额度内。

## 4. 核心脚本

**文件**: `scripts/summarize.py`

### 工作流程

```
papers.json → 筛选未处理的论文 → Groq API（逐篇） → 更新 papers.json
                          ↓
                    检查 core_points 为空
                    或 status !== 'analyzed'
```

### 关键特性

- **增量处理**：只处理 `status` 不是 `analyzed` 且 `core_points` 为空的论文，已处理过的跳过
- **智能重试**：遇到 429 限流错误时指数退避重试（最长 5 次）
- **容错**：单篇失败不影响其他论文，处理后写回全部数据
- **幂等性**：多次运行安全，不会重复处理

### Prompt 设计

System prompt 要求模型输出严格 JSON，包含：
- `title.en/zh` — 保留原文 + 中文翻译
- `summary.en/zh` — 保留原文 + 中文翻译
- `core_points.en/zh` — 中英文核心要点（贡献、方法、结果）
- `tags` — 从预定义集合中选择 1-3 个标签

### 本地测试

```bash
pip install groq
export GROQ_API_KEY="gsk_你的key"

# 实际运行
python scripts/summarize.py

# 预览（不写入）
python scripts/summarize.py --dry-run
```

## 5. 数据模型更新

AI 处理后的论文字段变化：

```json
{
  "title": {
    "en": "Original English Title",
    "zh": "中文翻译标题"
  },
  "summary": {
    "en": "Original English abstract...",
    "zh": "中文翻译摘要..."
  },
  "core_points": {
    "en": "This paper proposes...",
    "zh": "本文提出了一种新方法..."
  },
  "tags": ["大型语言模型", "自然语言处理"],
  "status": "analyzed",
  "curation": [
    {
      "field": "all",
      "generatedBy": "llm",
      "model": "llama-3.3-70b-versatile",
      "timestamp": "2026-05-07T12:00:00Z"
    }
  ]
}
```

## 6. 后续优化方向

- **批量处理**：Groq 支持 batch API 可进一步加快处理速度
- **实体提取**：当前 prompt 未要求提取 entities，后续可扩展
- **模型微调**：针对学术摘要场景收集反馈数据，优化输出质量
