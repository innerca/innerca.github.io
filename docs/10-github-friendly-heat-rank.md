# GitHub 友好型近半年论文热度榜 · 完整方案 v1

## 1. 方案定位

目标：专门为 GitHub 仓库和 GitHub Actions 设计的论文热度榜方案。

核心约束：
- 只维护最近 180 天论文
- 只依赖少量外部信号源
- 只在仓库中保留最小必要状态
- 通过 GitHub Actions 自动抓取、计算、发布
- 最终输出静态 JSON，供前端直接消费

适合：个人项目、静态站点、内容型知识库
不适合：完整历史快照、全文 PDF、长期影响力分析

## 2. 核心原则

### 2.1 GitHub 只存当前状态，不存完整历史

仓库中只保留：
- 近 180 天论文精简元数据
- 当前信号状态
- 7 天前对比状态
- 当前统计结果
- 当前热度榜结果

不保留：
- 每日全量历史快照
- 原始 API 响应
- PDF
- 全量版本存档

### 2.2 榜单目标是"近期发现"，不是"历史权威"

只表达：
- 最近半年哪些论文值得看
- 哪些方向正在升温
- 哪些论文在最近 7-14 天突然爆发

不表达：
- 哪些论文是长期经典
- 哪些论文有最高终身影响

### 2.3 自动维护优先于复杂建模

算法要足够稳，但更重要的是：
- 每天能稳定跑
- 数据文件不会无限长大
- Actions 不会因为任务太重而经常失败

## 3. 数据源

| 数据源 | 用途 | 状态 |
|--------|------|------|
| arXiv | 论文主元数据（标题、作者、分类、时间） | ✅ 已接入 |
| Semantic Scholar | 引用数 | ✅ 已接入 |
| Hugging Face Daily Papers | 社区热度 | ✅ 已接入 |
| Papers with Code / GitHub | 代码状态 | ❌ 待接入 |

## 4. 榜单范围

- **时间窗口**：仅收录最近 180 天的论文，每次更新动态滚动
- **领域范围**：arXiv 主分类（cs.CV, cs.CL, cs.LG, cs.AI 等）

## 5. 评分模型

```
heat_score = base_score + burst_bonus

base_score = 100 × (
  0.40 × S_cite +
  0.20 × S_code +
  0.15 × S_buzz +
  0.15 × S_venue +
  0.10 × S_fresh
)

burst_bonus = min(15, 9 × B_cite + 4 × B_buzz + 2 × B_code)
```

各子项详见 `docs/09-heat-rank-v1.md`。

## 6. 文件结构

| 文件 | 用途 | 更新方式 |
|------|------|----------|
| `src/data/papers.json` | 近 180 天精简论文元数据 | 每日覆盖 |
| `src/data/paper_heat_scores.json` | 前端消费的热度榜 | 每日覆盖 |
| `src/data/field_heat_topn.json` | 领域 Top N | 每日覆盖 |
| `src/data/heat_score_meta.json` | 热度榜元信息 | 每日覆盖 |
| `src/data/venue_tiers.json` | 会议分级配置 | 静态 |
| `src/data/signals/citations/` | 引用日级快照 | 每日追加 |
| `src/data/signals/hf/` | HF 日级快照 | 每日追加 |

## 7. 论文生命周期

| 状态 | 条件 | 处理 |
|------|------|------|
| active | ≤ 180 天 | 保留在 papers.json，参与热度计算 |
| archived | > 180 天 | 从 papers.json 移除，元数据保留在 archive |

简化策略：不做复杂状态机，超过 180 天直接移出榜单。

## 8. GitHub Actions 架构

| 工作流 | 触发 | 职责 |
|--------|------|------|
| `deploy.yml` | 每日定时 + push | 爬取 → HF → 热度 → 构建 → 部署 |
| `tag-maintenance.yml` | 每月第一个周一 | AI 标签评审合并 |

## 9. 仓库控体积策略

- ~~不提交 PDF~~
- ~~不提交原始 API 返回~~
- ~~不提交完整 daily history~~
- ~~不每天新增日期版结果文件~~
- 标题保留，摘要默认不入主文件
- 作者只保留必要字段
- JSON 用紧凑格式输出
- 每次更新覆盖写回，不新增版本

## 10. 容错与兜底

- 引用拉取失败 → 使用上次成功值，标记 `cached`
- HF 拉取失败 → 沿用上次状态
- 样本不足 → `field+age_bucket → field → global` 三级回退

## 11. 最小实施清单

- [x] 建立 `src/data/papers.json`（近 180 天）
- [x] 建立 `src/data/venue_tiers.json`
- [x] 建立 `src/data/paper_heat_scores.json`
- [ ] 实现 `pull_code_signals.py`（PwC/GitHub）
- [ ] 每日自动清理 >180 天论文
- [ ] 摘要精简存储
