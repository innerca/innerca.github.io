# 近半年论文热度榜 v1 · 工程化设计

## 1. 目标与范围

### 1.1 产品目标
- 面向最近 180 天内发布的论文，输出一个用于发现新方向的热度榜。
- 榜单重点反映"近期关注度"和"短期爆发"，不承担经典论文总榜职责。
- 支持按领域排序、首页混排、趋势标签展示。

### 1.2 非目标
- 不在 v1 内实现基石论文识别
- 不在 v1 内实现 3 年以上全生命周期热度模型
- 不在 v1 内实现复杂复活机制
- 不在 v1 内引入全文 PDF 解析

### 1.3 收录范围
- 仅收录 `published_at >= today - 180d` 的论文
- 主要数据源为 arXiv；引用、代码、社区信号由外部源补全
- 旧论文的二次传播进入后续"复燃观察"模块，不并入半年榜

---

## 2. 总体设计

### 2.1 输出结果
- 领域热度榜：按 `primary_field` 聚合排序
- 首页综合热榜：按 `global_score` 混排
- 趋势标签：`Hot`、`Rising`、`With Code`、`Top Venue`

### 2.2 核心原则
- 时间因素只做一层轻惩罚，避免旧论文被系统性打没
- 引用得分按"领域 + 年龄桶"归一化
- 爆发能力单独建模
- 缺失数据做降权或兜底，不视为负面

### 2.3 核心公式

```
heat_score = base_score + burst_bonus

base_score = 100 * (
  0.40 * S_cite +
  0.20 * S_code +
  0.15 * S_buzz +
  0.15 * S_venue +
  0.10 * S_fresh
)

burst_bonus = min(15, 9 * B_cite + 4 * B_buzz + 2 * B_code)
```

- `base_score` 范围 0~100
- `burst_bonus` 范围 0~15
- `heat_score` 理论范围 0~115

---

## 3. 评分规则

### 3.1 年龄桶定义

```
0_30d
31_90d
91_180d
```

### 3.2 引用得分 `S_cite`（权重 40%）

```
S_cite = clamp(log1p(citation_count) / log1p(p95_citation_in_bucket), 0, 1)
```

- 统计基线按 `primary_field + age_bucket` 计算
- 桶内论文数 < 100：回退到领域级统计
- 领域级仍不足：回退到全局同年龄桶

### 3.3 代码得分 `S_code`（权重 20%）

```
official code    -> 1.0
community code   -> 0.6
<=30d + top venue -> 0.3
otherwise        -> 0.0
```

### 3.4 社区热度 `S_buzz`（权重 15%）

```
HF featured in last 7d   -> 1.0
HF featured in last 30d  -> 0.6
other signal only         -> 0.3
none                      -> 0.0
```

### 3.5 来源权威性 `S_venue`（权重 15%）

```
top venue      -> 1.0
strong venue   -> 0.8
normal venue   -> 0.4
unknown/arXiv  -> 0.2
```

依赖一份人工维护的 `venue_tiers.json`。

### 3.6 新鲜度 `S_fresh`（权重 10%）

```
0_30d    -> 1.00
31_90d   -> 0.85
91_180d  -> 0.70
```

轻量时间惩罚，不再额外乘艾宾浩斯衰减。

### 3.7 爆发分 `burst_bonus`

| 子项 | 权重 | 计算方式 | 历史要求 |
|------|------|----------|----------|
| B_cite | 9 | `clamp(delta_7d / field_p95_delta_7d, 0, 1)` | 需 7 天前快照 |
| B_buzz | 4 | `HF first featured in 7d → 1, else 0` | 无 |
| B_code | 2 | `official code first seen in 14d → 1, else 0` | 无 |

burst_bonus 只反映最近 7-14 天的变化，不长期累计。

---

## 4. 排名与标签

### 4.1 领域榜
- `primary_field` 内按 `heat_score DESC, burst_bonus DESC, citation_count DESC` 排序

### 4.2 首页综合榜
```
global_score = 0.8 * field_percentile + 0.2 * normalized_field_size
```

### 4.3 标签规则

| 标签 | 条件 |
|------|------|
| Hot | `field_percentile >= 0.90` |
| Rising | `burst_bonus >= 8` |
| With Code | `code_status == official` |
| Top Venue | `venue_tier >= 0.8` |

---

## 5. 数据模型

### 5.1 主论文表 `papers`

当前 `src/data/papers.json` 对应此层，需扩展字段：

```json
{
  "paper_id": "arxiv:2505.12345",
  "primary_field": "cs.CV",
  "all_fields": ["cs.CV", "cs.LG"],
  "venue_raw": "CVPR 2026",
  "venue_tier": 1.0,
  "is_retracted": false,
  "last_seen_at": "2026-05-07"
}
```

### 5.2 日级信号快照 `paper_signals_daily`

新增数据层，每篇论文每天一条：

```json
{
  "paper_id": "arxiv:2505.12345",
  "snapshot_date": "2026-05-07",
  "citation_count": 42,
  "citation_source": "semantic_scholar",
  "hf_featured": true,
  "code_status": "official",
  "code_repo_url": "https://github.com/org/repo",
  "community_signal_score": 1.0,
  "is_retracted": false
}
```

### 5.3 领域统计表 `field_stats`

```json
{
  "stats_date": "2026-05-07",
  "field": "cs.CV",
  "age_bucket": "31_90d",
  "paper_count": 6210,
  "p50_citation": 2,
  "p80_citation": 8,
  "p95_citation": 23,
  "p95_cite_delta_7d": 5
}
```

### 5.4 榜单结果 `paper_heat_scores`

前端消费层，构建时生成：

```json
{
  "paper_id": "arxiv:2505.12345",
  "heat_score": 75.8,
  "base_score": 64.8,
  "burst_bonus": 11.0,
  "field_rank": 3,
  "global_score": 0.92,
  "badges": ["Rising", "With Code"]
}
```

### 5.5 前端构建产物

- `src/data/paper_heat_scores.json` — 全量榜单
- `src/data/field_heat_topn.json` — 领域 Top N
- `src/data/heat_score_meta.json` — 元信息

---

## 6. 脚本设计

| 脚本 | 频率 | 职责 |
|------|------|------|
| `pull_arxiv_metadata.py` | 每日 | 拉取增量 arXiv 元数据，upsert 主表 |
| `pull_citation_signals.py` | 每日 | 从 S2/OpenAlex 拉引用快照 |
| `pull_hf_signals.py` | 每日×2 | 抓取 HF Daily Papers 上榜状态 |
| `pull_code_signals.py` | 每日 | 更新代码状态 |
| `compute_field_stats.py` | 每日 | 按 field+age_bucket 计算统计基线 |
| `compute_heat_scores.py` | 每日 | 计算每篇论文评分+排名+标签 |
| `export_heat_json.py` | 每日 | 导出前端可用 JSON |

---

## 7. 与当前项目的集成分析

### 7.1 现有基础设施

| 当前已有 | 对应热度方案 |
|----------|-------------|
| `scripts/fetch.js` + `scripts/fetch-arxiv.js` | `pull_arxiv_metadata.py`（但当前是 JS） |
| `src/data/papers.json` | `papers` 主表 |
| 30 篇论文（arXiv 单源） | 全部在半年窗口内 |
| `npm run fetch` 每日执行 | 每日调度已就绪 |

### 7.2 需要新增

| 新增项 | 工作量 | 说明 |
|--------|--------|------|
| `scripts/pull_citation_signals.py` | 中 | S2 batch API 已有，需快照逻辑 |
| `scripts/pull_hf_signals.py` | 中 | 新接入，需 HF API |
| `scripts/pull_code_signals.py` | 中 | 新接入，需 Papers with Code API |
| `scripts/compute_field_stats.py` | 小 | 纯计算，无外部依赖 |
| `scripts/compute_heat_scores.py` | 中 | 核心评分逻辑 |
| `scripts/export_heat_json.py` | 小 | JSON 导出 |
| `src/data/venue_tiers.json` | 小 | 人工维护的顶会映射 |
| 日级快照存储 | 中 | `paper_signals_daily` 存储方案 |

### 7.3 关键依赖

- **S_cite（权重 40%）**: ✅ S2 已接入，无阻塞
- **S_code（权重 20%）**: ❌ 需接入 Papers with Code
- **S_buzz（权重 15%）**: ❌ 需接入 HF Daily Papers
- **S_venue（权重 15%）**: ❌ 需 `venue_tiers.json`
- **S_fresh（权重 10%）**: ✅ 数据已有
- **B_cite**: ❌ 需 7 天引用历史快照
- **日级快照存储**: ❌ 当前无增量数据层

### 7.4 建议的实施顺序

```
Phase 1（基础设施）:
  venue_tiers.json → compute_field_stats.py → compute_heat_scores.py → export_heat_json.py

Phase 2（信号接入）:
  pull_citation_signals.py → 日级快照存储 → B_cite 启用

Phase 3（外部源）:
  pull_hf_signals.py → S_buzz 启用
  pull_code_signals.py → S_code 启用

Phase 4（前端）:
  PaperCard 热度色条 → 领域 Tab → Hot/Rising 标签
```

---

## 8. 冷启动方案

### 8.1 两步走策略

| 阶段 | 时间 | 内容 | 引擎模式 |
|------|------|------|----------|
| Beta | Day 1 | 回填半年论文，只算 `base_score`，burst=0 | `cold` |
| Warmup | Day 2-7 | 积累日级引用快照，弱爆发预留 | `warmup` |
| 正式版 | Day 8+ | 7 天引用增量就绪，完整 burst | `ready` |

### 8.2 引擎自动检测

输出 JSON 带 `warmup_mode` 和 `warmup_days`，前端可据此显示 "Beta" 标签。

### 8.3 关键原则

- 不补伪历史引用（不拿当前值反推 7 天前）
- 不第一天就上强爆发
- 不等全部就绪才上线（静态面一天可回填）

---

## 9. 容错与兜底

- 引用抓取失败：使用最近一次成功快照，标记 `citation_source = cached`
- HF 抓取失败：沿用最近一天结果
- 统计不足：`field+age_bucket → field → global` 三级回退
- 负引用增量视为 0
- 撤稿论文直接 `base_score=0, burst_bonus=0`

---

## 9. 实施清单

- [ ] 建立 `venue_tiers.json`
- [ ] 实现 `compute_field_stats.py`
- [ ] 实现 `compute_heat_scores.py`
- [ ] 实现 `export_heat_json.py`
- [ ] 实现 `pull_citation_signals.py` + 日级快照
- [ ] 实现 `pull_hf_signals.py`
- [ ] 实现 `pull_code_signals.py`
- [ ] 实现 `pull_arxiv_metadata.py`
- [ ] GitHub Actions 编排
- [ ] 前端适配热度榜
