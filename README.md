# AI Paper Radar / AI 学术前沿雷达

每日自动追踪 AI/ML 前沿论文，AI 驱动中英双语翻译，赛博朋克风格知识库。纯静态站点，无需后端。

## 特性

- **每日自动采集** — 定时从 arXiv 拉取最新论文（cs.AI, cs.LG, cs.CL, cs.CV, cs.NE, cs.MA, cs.IR）
- **引用补全** — Semantic Scholar API 自动获取引用数据
- **AI 加工** — Groq (Llama 3.3 70B) 生成中文摘要、核心要点和标签
- **热度排序** — 基于引用 + 时间的 burst score，识别前沿趋势
- **中英双语** — 全站 UI 和论文内容按 `/zh` `/en` 路由切换
- **全文搜索** — 纯客户端 FlexSearch，7 字段中英文混合检索
- **赛博 UI** — 暗色粒子背景、霓虹发光卡片、毛玻璃面板、微交互动画
- **纯静态** — Astro 构建产物，部署到 GitHub Pages，零后端

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Astro 4 + React 18（岛屿架构） |
| 样式 | Tailwind CSS 3 + CSS 自定义属性 |
| 动画 | Framer Motion + Canvas（粒子背景） |
| 搜索 | FlexSearch（纯客户端全文检索） |
| 采集 | Node.js（arXiv API + Semantic Scholar API） |
| AI 摘要 | Groq (Llama 3.3 70B) |
| 部署 | GitHub Pages（Actions 自动构建） |
| 数据 | `src/data/papers.json`（结构化 JSON，单数据源） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建站点
npm run build

# 预览构建产物
npm run preview
```

## 数据流水线

```
arXiv API ──→ fetch-arxiv.js ──→ Semantic Scholar 补全引用
                                      │
                                      ▼
                              去重合并 (dedup.js)
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
                   分层存储 (tiers.js)       AI 加工 (summarize.py)
                    hot ≤90d  → papers.json    Groq → 翻译/摘要/标签
                    warm ≤1y  → papers.warm.json
                    cold >1y  → papers-archive/
```

```bash
# 手动触发数据采集
npm run fetch

# AI 加工（需要 GROQ_API_KEY）
export GROQ_API_KEY="gsk_..."
python scripts/summarize.py
```

## 项目结构

```
src/
├── config/         # 集中配置（来源注册表、功能开关、性能参数）
├── types/          # 类型定义
├── lib/            # 工具函数（搜索、i18n、日期、来源）
├── data/           # 论文 JSON 数据（脚本自动维护）
├── layouts/        # 全局布局壳
├── components/
│   ├── react/      # 交互组件（搜索、卡片、粒子背景）
│   └── astro/      # 静态展示组件
├── pages/          # 路由页面（zh/en 双语言）
└── styles/         # 全局样式

scripts/            # 数据采集流水线
├── fetch.js                   # 调度器入口
├── fetch-arxiv.js             # arXiv 爬取模块
├── lib/dedup.js               # 跨源去重引擎
├── lib/tiers.js               # 分层存储管理
├── scraper-config.json        # 爬取配置
├── summarize.py               # AI 摘要生成
└── compute_heat_scores.py     # 热度分数计算
```

## 路线图

- [x] 多语言前端、搜索、赛博 UI
- [x] arXiv 采集流水线、去重、分层存储
- [x] 热度排序引擎
- [ ] GitHub Actions 每日自动构建部署
- [ ] AI 摘要（Groq 接入）
- [ ] RSS / JSON 端点
- [ ] 更多数据源（OpenReview、Hugging Face）
- [ ] 知识图谱可视化

## 许可

MIT
