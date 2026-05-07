
---

# 🌐 AI 学术前沿雷达 · 全局概览规格书 (v1.0)

## 1. 项目愿景  
打造一个**全自动、多语言、赛博朋克风格**的学术论文知识库网站。所有内容由 AI 每日自动采集、总结、翻译和维护，无需后端服务器，完全托管于静态平台，成为全球研究者与 AI 系统可共同使用的开放知识中枢。

---

## 2. 核心原则  
- **纯静态、零后端**：所有运算均在构建时完成，产物为纯 HTML/CSS/JS。  
- **AI 驱动**：内容生成、多语言翻译、代码维护均接入大型语言模型。  
- **主数据源 + 派生索引**：`papers.json` 仍是核心内容源，但热度、signals、stats 等由派生 JSON 共同支撑前端体验。  
- **先最小可行，再逐步生长**：初期用最简单架构跑通闭环，后续模块可按需插拔升级。  
- **对机器友好**：提供 RSS、结构化 JSON、JSON‑LD，允许 AI 爬虫无障碍抓取。

---

## 3. 系统架构（三层）  

```
┌─────────────────────────────────────────────┐
│              应用网站层                      │
│  Astro + React + 赛博 UI                    │
│  多语言路由 / 搜索 / 动画 / 暗色主题        │
└─────────────────────────────────────────────┘
           ▲ 构建时注入数据
┌─────────────────────────────────────────────┐
│              知识核心层 (构建时生成)         │
│  统计信息 / RSS / 站点地图 / JSON 端点       │
│  (后续可扩展 向量库 / 图数据库 导出文件)     │
└─────────────────────────────────────────────┘
           ▲ 读取
┌─────────────────────────────────────────────┐
│              数据流水线层                    │
│  采集脚本 → AI 总结/翻译/打标签 →            │
│  结构化 JSON 追加至 papers.json              │
└─────────────────────────────────────────────┘
           ▲ 定时触发
┌─────────────────────────────────────────────┐
│            GitHub Actions 调度               │
│  定时任务 / 手动触发 / Issue 指令            │
└─────────────────────────────────────────────┘
```

---

## 4. 核心功能一览  

| 模块 | 功能说明 | 阶段 |
|------|----------|------|
| 📥 多源采集 | 定时抓取 arXiv + Semantic Scholar 等论文元数据及引用量 | MVP |
| 🤖 AI 加工 | 生成中英双语摘要、核心要点、实体标签，输出结构化 JSON | MVP |
| 🌍 多语言展示 | 网站 UI 和论文内容均按 `/zh` `/en` 路由提供 | MVP |
| 🎮 游戏化 UI | 暗色粒子背景、霓虹发光卡片、动态数字、交错动画 | MVP |
| 🔍 全文搜索 | 纯前端 FlexSearch，支持中英文 | MVP |
| 📡 RSS/API | 构建时生成多语言 Feed、机器可读 JSON 端点 | MVP |
| 🛡️ 高性能 | 首屏 < 2s，动画 60fps，PWA 离线访问 | MVP |
| 👩‍💻 AI 运维 | 通过 Issue 让 AI 修改主题、添加组件，自动 PR | 第二阶段 |
| 🧠 知识图谱 | 实体关系可视化 (react-force-graph) | 第二阶段 |
| 💬 AI 问答 | Worker 代理 LLM，结合论文库即时回答 | 第三阶段 |
| 📝 自动周报 | AI 定期生成研究趋势综述，推送为博客 | 第三阶段 |

---

## 5. 技术栈速览  

| 层级 | 技术 | 说明 |
|------|------|------|
| 静态站点 | Astro | 岛屿架构，按需水合 |
| 前端交互 | React 18 + Framer Motion | 动画与动态组件 |
| 样式体系 | Tailwind CSS + CSS 变量 | 暗色主题，易于维护 |
| 粒子背景 | 自研 Canvas 组件 | 轻量，无依赖 |
| 数据源 | `papers.json` + `paper_heat_scores.json` + `signals/*` | 主内容源 + 热度/信号派生层 |
| AI 模型 | Groq (Llama 3.1) 或 GPT‑4o‑mini | 成本极低，支持 JSON 模式 |
| 前端搜索 | FlexSearch | 纯客户端全文检索 |
| 部署平台 | GitHub Pages | 静态产物托管，配合 Actions 自动部署 |
| 调度 | GitHub Actions | 定时采集、总结、构建 |
| 监控/限流 | Cloudflare WAF + Rate Limiting | 免费层级即够用 |

---

## 6. 数据流水线过程  

1. **采集**：`scripts/fetch.js` 调度 `fetch-arxiv.js`，并与现有 hot/warm 数据做去重合并。  
2. **摘要与标签**：`scripts/summarize.py` 生成双语摘要、核心要点与标签。  
3. **信号快照**：`pull_citation_signals.py` 写入 citation 日快照，`pull_hf_signals.py` 写入 HF Daily Papers 日快照。  
4. **热度计算**：`compute_heat_scores.py` 基于近 180 天窗口、字段归一化引用、HF buzz、venue、freshness 和 burst bonus 计算热度。  
5. **前端导出**：`export_heat_json.py` 生成 `paper_heat_scores.json`、`field_heat_topn.json`、`heat_score_meta.json`。  
6. **持久化与部署**：GitHub Actions 将 `src/data/**` 回写仓库，再执行 `npm run build` 并部署到 GitHub Pages。  

此流水线每天自动运行一次。`push to main` 只做构建发布，定时任务和手动触发才会跑完整数据链路。

### 冷启动说明

- `cold`：没有 citation snapshot，只能依赖基础热度信号。
- `warmup`：已有 `1-6` 天 snapshot，citation burst 尚未正式启用。
- `ready`：达到 `7+` 天 snapshot，citation delta 纳入 burst bonus。
- `heat_score_meta.json` 与 `paper_heat_scores.json` 会保留 `warmup_mode / warmup_days / missing_signals`，用于运营和前端解释当前热度成熟度。

---

## 7. 前端关键设计  

- **视觉**：赛博朋克 / 全息投影感，深蓝黑背景，青紫霓虹光效，毛玻璃面板。  
- **布局**：固定半透明导航栏，首页含 Hero 区、统计面板、趋势卡片、最新论文列表。  
- **动画**：Framer Motion 页面过渡、卡片悬浮发光、数字滚动、粒子背景。  
- **多语言**：所有界面文字外置，根据路由自动切换；论文内容使用 `.zh` / `.en` 字段。  
- **响应式**：桌面端多列网格，平板端两列，手机端单列，搜索栏适配移动端。  

---

## 8. 部署与运维  

| 事项 | 方案 |
|------|------|
| 代码托管 | GitHub 公开仓库 |
| 自动部署 | GitHub Actions 构建 `dist` → GitHub Pages 发布 |
| 域名 | 自定义域名 `mijiu.top` (可选) |
| 成本 | GitHub Pages + GitHub Actions + LLM 配额，整体接近零成本 |
| AI 维护 | 通过 Issue 触发 Actions 脚本，AI 读指令、改代码、提 PR |

---

## 9. 里程碑（分阶段）  

### 🥇 MVP（1-2 周）  
- 假数据 `papers.json` (5 篇) 驱动的前端站点  
- 全部页面与路由、多语言、搜索、动画  
- 部署到 Cloudflare Pages  

### 🥈 自动化闭环（3-4 周）  
- 接入真实采集流水线与 AI 总结  
- GitHub Actions 每日自动更新数据并构建  
- RSS/JSON 端点上线  

### 🥉 增强与自治（后续）  
- 知识图谱可视化、AI 问答  
- AI 自动生成周报、通过 Issue 参与代码维护  

---
