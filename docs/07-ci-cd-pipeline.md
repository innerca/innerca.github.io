# CI/CD 自动化流水线

## 1. 架构概览

```
GitHub Actions (每日 06:00 UTC)
  │
  ├── npm run fetch          ← 多源爬取 + 去重
  ├── python summarize.py    ← Groq AI 摘要 (需要 GROQ_API_KEY)
  ├── npm run build          ← Astro 构建
  └── deploy-pages           ← 部署到 GitHub Pages
```

## 2. 工作流文件

**位置**: `.github/workflows/deploy.yml`

### 触发器

- **定时任务**: 每天 UTC 06:00（北京时间 14:00）
- **代码推送**: 推送到 `main` 分支时自动构建
- **手动触发**: 在 Actions 页面点击 "Run workflow"

### Job 结构

| Job | 功能 | 运行条件 |
|-----|------|----------|
| `build` | 爬取 → 摘要 → 构建 | 总是运行 |
| `deploy` | 部署到 GitHub Pages | build 成功后 |

### 数据流

```
GitHub 仓库
  │
  ├── src/data/papers.json     ← 爬取 + Groq 处理后更新
  │
  ├── npm run fetch
  │   ├── scripts/fetch.js         ← 调度器
  │   ├── scripts/fetch-arxiv.js   ← arXiv 爬取
  │   └── scripts/lib/dedup.js     ← 跨源去重
  │
  ├── python scripts/summarize.py  ← Groq AI 摘要
  │   └── 更新 papers.json（title.zh, core_points, tags, status）
  │
  ├── npm run build
  │   └── dist/                    ← 静态产物
  │
  └── GitHub Pages                 ← 部署
```

## 3. Secrets 配置

在 GitHub 仓库 `Settings → Secrets and variables → Actions` 中添加：

| Secret | 说明 | 获取方式 |
|--------|------|----------|
| `GROQ_API_KEY` | Groq API 密钥 | [console.groq.com](https://console.groq.com) → API Keys |

**不设置 GROQ_API_KEY 时工作流依然可以运行**，只是会跳过 AI 摘要步骤。爬取和构建照常进行。

## 4. 本地调试

```bash
# 1. 爬取最新论文
npm run fetch

# 2. AI 摘要（需要 GROQ_API_KEY）
export GROQ_API_KEY="gsk_..."
python scripts/summarize.py

# 3. 构建站点
npm run build

# 4. 本地预览
npm run preview
```

## 5. 日常运维

- **每日自动运行**：无人值守，爬取 → 摘要 → 构建 → 部署
- **失败处理**：
  - arXiv API 失败 → 使用已有数据构建，站点不中断
  - Groq API 失败 → 跳过摘要步骤，下次运行自动重试（增量处理）
  - 构建失败 → 部署步骤不执行，线上站点保持上一个版本
- **手动更新**：随时可以到 Actions 页面手动触发全流程

## 6. 扩展：添加新数据源

当添加 OpenReview / DBLP 等新爬取源时：

1. 新增 `scripts/fetch-xxx.js`
2. 在 `scripts/fetch.js` 的 `runScrapers()` 中添加 `case`
3. 在 `scripts/scraper-config.json` 中添加配置条目
4. 在 `deploy.yml` 中无需改动——`fetch.js` 自动调度所有启用的源
