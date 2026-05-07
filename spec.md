
---

# 赛博学术雷达 · 前端 MVP 规格说明书

## 1. 项目概述
- **名称**：AI 学术前沿雷达 (AI Paper Radar)
- **类型**：纯静态学术论文知识库网站
- **风格**：赛博朋克 / 全息投影游戏 UI
- **核心交互**：浏览论文卡片、查看详情、全文搜索、中英双语切换

## 2. 技术栈
| 类别 | 方案 |
|------|------|
| 框架 | Astro (v4+) + React 18 |
| 样式 | Tailwind CSS 3 + CSS 自定义属性 (暗色主题) |
| 动画 | Framer Motion |
| 字体 | Inter (正文), JetBrains Mono (代码/科技数字) |
| 搜索 | FlexSearch (轻量全文检索) |
| 粒子背景 | 自写 Canvas 组件 (无依赖) |
| 多语言 | Astro i18n 路由 (`/zh`, `/en`) |
| 数据 | `src/data/papers.json` (静态 JSON) |

## 3. 视觉风格
### 3.1 颜色
- 背景: `#0b0f19`
- 面板/卡片: `rgba(20,27,45,0.8)` + `backdrop-filter: blur(12px)`
- 主霓虹青: `#00f0ff`
- 霓虹紫: `#b347ea`
- 强调红: `#ff6b6b`
- 文字: `#e0e0e0`
- 次要文字: `#8892b0`

### 3.2 效果
- 卡片悬浮：`transform: translateY(-4px)` + 边框亮度增加 + 外发光 `0 0 15px rgba(0,240,255,0.15)`
- 按钮/链接：下划线渐变动画
- 全局背景：缓慢移动的粒子网格
- 数字：等宽字体，颜色渐变或霓虹

### 3.3 排版
- 标题：`text-2xl` 或 `text-3xl`, 加粗, 渐变色
- 正文：`text-base`, `leading-relaxed`
- 标签：小号等宽字体, 圆角背景, 霓虹边框

## 4. 页面与路由
| 路由 | 语言 | 内容 |
|------|------|------|
| `/` | 自动检测浏览器语言重定向 | - |
| `/zh` | 中文 | 中文首页 |
| `/en` | 英文 | 英文首页 |
| `/zh/paper/[id]` | 中文 | 论文详情页 (中文内容) |
| `/en/paper/[id]` | 英文 | 论文详情页 (英文内容) |
| `/zh/search` | 中文 | 中文搜索页 |
| `/en/search` | 英文 | 英文搜索页 |

## 5. 组件树
```
<BaseLayout>
  <ParticleBackground />         {/* 全局 canvas，fixed */}
  <Navbar />
      <LanguageSwitcher />       {/* 切换 /zh /en */}
      <SearchTrigger />          {/* 移动端 / 桌面端搜索入口 */}
  <main>
    <AnimatePresence>
      <slot />                   {/* 页面内容 */}
  <Footer />
</BaseLayout>
```

### 页面组件
**首页** (`pages/zh/index.astro` & `pages/en/index.astro`)：
- `<HeroSection />` - 标题、副标题、粒子特效强化区
- `<StatsBar />` - 论文总数、本周新增 (数字跳动动画)
- `<TrendingPapers />` - 横向滚动卡片，标记 `isTrending`
- `<LatestPapers />` - 纵向卡片列表，分页或“加载更多”

**详情页** (`pages/zh/paper/[id].astro`)：
- `<PaperDetail />` - 标题、核心要点、摘要、元数据、标签

**搜索页** (`pages/zh/search.astro`)：
- `<SearchPage />` - 搜索框 + 结果列表，复用卡片组件

### 通用 UI 组件
- `PaperCard` (React)：复用性最高的卡片，接收 `paper` 对象和语言设置
- `TagBadge`：小标签
- `NeonButton`：霓虹边框按钮
- `CountUp`：数字滚动动画
- `GlitchText`：故障效果文本 (用于错误/空状态)
- `LoadingSkeleton`：卡片闪烁占位

## 6. 数据格式 (`papers.json`)
示例结构（所有文本字段均为双语对象）：
```json
[
  {
    "id": "2301.12345",
    "title": { "zh": "扩散模型在分子生成中的应用", "en": "Diffusion Models for Molecule Generation" },
    "summary": { "zh": "该论文提出...", "en": "This paper proposes..." },
    "core_points": { "zh": "1. 新架构...", "en": "1. New architecture..." },
    "tags": ["扩散模型", "药物发现"],
    "entities": [ {"name": "Diffusion", "type": "method"}, {"name": "QM9", "type": "dataset"} ],
    "date": "2025-01-15",
    "citeCount": 42,
    "isTrending": false,
    "source": "arXiv",
    "url": "https://arxiv.org/abs/2301.12345"
  }
]
```

## 7. 动画要求
- **页面过渡**：使用 Framer Motion `AnimatePresence`，淡入淡出 (opacity 0↔1, duration 0.2s)
- **卡片悬浮**：`whileHover={{ y: -4, boxShadow: "0 0 15px rgba(0,240,255,0.3)" }}`
- **卡片点击**：`whileTap={{ scale: 0.98 }}`
- **数字跳动**：`CountUp` 组件，使用 `useMotionValue` 和 `useSpring`，时长 1s
- **列表交错出现**：staggerChildren 延迟 0.05s
- **粒子背景**：canvas 动画，约 60 个粒子，连线距离 < 100px，速度极慢

## 8. 搜索功能 (FlexSearch)
- 构建时预生成搜索索引（中文按字分词，英文按词分词）
- 前端实时过滤，搜索结果高亮匹配词
- 支持中英文混合搜索

## 9. 性能指标 (Lighthouse)
- Performance > 90
- First Contentful Paint < 1.5s
- Speed Index < 2s
- 动画保持 60fps，无布局抖动

## 10. 交付物
1. 完整的 Astro 项目，含所有页面、组件、样式
2. 示例 `papers.json` 包含 5 篇模拟数据
3. 粒子背景独立组件
4. 多语言路由完美运行
5. 所有动画流畅
6. 响应式设计 (桌面/平板/手机)

---

