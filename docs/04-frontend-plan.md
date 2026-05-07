# AI 学术前沿雷达 — 前端架构方案

## 一、项目结构

```
paper-radar/
├── astro.config.mjs           # Astro 配置（i18n、集成）
├── tailwind.config.cjs        # Tailwind 主题扩展
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
├── src/
│   ├── data/
│   │   └── papers.json        # 静态论文数据（5条）
│   ├── layouts/
│   │   └── BaseLayout.astro   # 全局布局壳
│   ├── pages/
│   │   ├── index.astro        # 根路由 → 自动重定向
│   │   ├── zh/
│   │   │   ├── index.astro    # 中文首页
│   │   │   ├── search.astro   # 中文搜索页
│   │   │   └── paper/
│   │   │       └── [id].astro # 中文详情页
│   │   └── en/
│   │       ├── index.astro    # 英文首页
│   │       ├── search.astro   # 英文搜索页
│   │       └── paper/
│   │           └── [id].astro # 英文详情页
│   ├── components/
│   │   ├── react/             # 交互型 React 组件（岛屿）
│   │   │   ├── ParticleBackground.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── PaperCard.tsx
│   │   │   ├── CountUp.tsx
│   │   │   ├── GlitchText.tsx
│   │   │   └── LanguageSwitcher.tsx
│   │   ├── astro/             # 纯展示 Astro 组件
│   │   │   ├── HeroSection.astro
│   │   │   ├── StatsBar.astro
│   │   │   ├── TrendingPapers.astro
│   │   │   ├── LatestPapers.astro
│   │   │   ├── PaperDetail.astro
│   │   │   ├── TagBadge.astro
│   │   │   ├── NeonButton.astro
│   │   │   ├── Navbar.astro
│   │   │   ├── Footer.astro
│   │   │   ├── LoadingSkeleton.astro
│   │   │   └── SearchTrigger.astro
│   │   └── ui/                # 纯 CSS 样式组件
│   │       └── gradients.css
│   ├── lib/
│   │   ├── search.ts          # FlexSearch 索引构建 + 查询
│   │   └── i18n.ts            # 多语言工具函数
│   ├── types/
│   │   └── paper.ts           # TypeScript 类型定义
│   └── styles/
│       ├── global.css         # 全局样式、CSS 变量
│       └── particles.css      # 粒子 Canvas 样式
```

## 二、数据流架构

```
                    ┌──────────────────┐
                    │  papers.json     │ (构建时)
                    │  5 条双语数据    │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐          ┌─────────▼────────┐
     │ Astro 页面组件   │          │ FlexSearch 索引   │
     │ (构建时渲染)     │          │ (构建时生成)       │
     └────────┬────────┘          └─────────┬────────┘
              │                             │
     ┌────────▼────────┐          ┌─────────▼────────┐
     │ React 岛屿组件  │          │ 前端搜索运行时    │
     │ (客户端水合)    │          │ (实时过滤 + 高亮) │
     └─────────────────┘          └──────────────────┘
```

- **静态数据**：所有页面在构建时通过 `Astro.glob()` 或直接 import 载入 `papers.json`
- **详情页**：使用 Astro 动态路由 `[id].astro`，通过 `params` 匹配论文 ID
- **搜索**：构建时用 FlexSearch 创建索引，以 JSON 嵌入页面；客户端实时搜索
- **多语言**：通过 Astro 的 `prefixDefaultLocale` 路由策略，`/zh/` 和 `/en/` 两组独立页面

## 三、组件详细设计

### 1. BaseLayout.astro（全局壳）
```
<BaseLayout>
├── <ParticleBackground />    ← React 岛屿，fixed 定位 Canvas
├── <Navbar>
│   ├── Logo
│   ├── <LanguageSwitcher />  ← React 岛屿，切换 /zh ⇄ /en
│   └── <SearchTrigger />     ← 搜索入口按钮
├── <main>
│   └── <slot />              ← 页面内容
├── <Footer>
</BaseLayout>
```

`ParticleBackground` 是独立的 React 岛屿，**不会**因为页面切换而重新挂载（通过 `client:only` 或合理放置）。

### 2. 首页区块

```
首页
├── <HeroSection />
│   ├── 标题（渐变色霓虹文字）
│   ├── 副标题
│   └── 粒子背景强化区域
├── <StatsBar />              ← 论文总数、本周新增
│   └── <CountUp /> × 2      ← React 岛屿，数字跳动
├── <TrendingPapers />        ← 横向滚动卡片列表
│   └── <PaperCard /> × N    ← React 岛屿
├── <LatestPapers />          ← 纵向列表 + 分页
│   └── <PaperCard /> × N
```

### 3. PaperCard（核心复用组件）

```tsx
interface PaperCardProps {
  paper: Paper
  lang: 'zh' | 'en'
  index?: number        // 用于 stagger 动画
}
```

- Framer Motion `whileHover` + `whileTap`
- 渐入动画（stagger）
- 显示：标题、摘要预览、标签、日期、引用数
- 点击跳转到 `/zh/paper/[id]` 或 `/en/paper/[id]`

### 4. 搜索页

```
SearchPage（React 岛屿）
├── 搜索输入框（霓虹风格）
├── 搜索结果列表
│   └── <PaperCard /> × N
└── 空状态 → <GlitchText />
```

- `client:only` 模式加载
- FlexSearch 索引在页面加载时初始化
- 输入实时过滤，匹配词高亮

### 5. 详情页

```
PaperDetail.astro（纯 Astro，构建时渲染）
├── 标题（霓虹渐变）
├── 核心要点（有序列表）
├── 摘要
├── 元数据（日期、来源、引用数）
├── 标签列表
│   └── <TagBadge /> × N
└── 外部链接按钮
    └── <NeonButton />
```

## 四、样式系统

### Tailwind 主题扩展

```js
// tailwind.config.cjs
theme: {
  extend: {
    colors: {
      'neon-cyan': '#00f0ff',
      'neon-purple': '#b347ea',
      'accent-red': '#ff6b6b',
      'panel': 'rgba(20,27,45,0.8)',
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    boxShadow: {
      'neon': '0 0 15px rgba(0,240,255,0.15)',
    },
  }
}
```

### CSS 变量（global.css）

```css
:root {
  --bg-primary: #0b0f19;
  --panel-bg: rgba(20, 27, 45, 0.8);
  --neon-cyan: #00f0ff;
  --neon-purple: #b347ea;
  --accent-red: #ff6b6b;
  --text-primary: #e0e0e0;
  --text-secondary: #8892b0;
}
```

## 五、动画设计

| 元素 | 实现 | 参数 |
|------|------|------|
| 页面过渡 | Framer Motion `AnimatePresence` | opacity 0↔1, 0.2s |
| 卡片悬浮 | `whileHover` | y: -4, shadow: neon |
| 卡片点击 | `whileTap` | scale: 0.98 |
| 列表交错 | `staggerChildren` | delay: 0.05s |
| 数字跳动 | `useMotionValue` + `useSpring` | 1s |
| 粒子背景 | Canvas `requestAnimationFrame` | 60粒子, 连线<100px |

## 六、搜索实现

```typescript
// 构建时（lib/search.ts）
import FlexSearch from 'flexsearch'

export function buildIndex(papers: Paper[], lang: 'zh' | 'en') {
  const index = new FlexSearch.Document({
    tokenize: lang === 'zh' ? 'forward' : 'forward',
    document: {
      id: 'id',
      index: ['title', 'summary', 'tags'],
    },
  })
  papers.forEach(p => index.add(p))
  return index
}
```

- 按语言构建两个独立索引
- 索引导出为 JSON 在页面加载时恢复
- 搜索结果高亮通过正则替换匹配词

## 七、响应式断点

| 断点 | 布局调整 |
|------|----------|
| ≥1024px (desktop) | 三栏布局，横向滚动卡片 |
| 768-1023px (tablet) | 两栏布局 |
| <768px (mobile) | 单栏布局，折叠导航 |

## 八、性能策略

- **岛屿架构**：只有交互组件（搜索、粒子、动画卡片）用 React，其余用 Astro 静态渲染
- **粒子 Canvas**：离屏渲染、`requestAnimationFrame` + `throttle` resize
- **搜索索引**：构建时生成，以 JSON 内联，避免运行时计算
- **字体**：使用 `next/font` 或预加载关键字体，避免 FOIT
- **图片**：无外部图片，纯 CSS/Canvas 视觉效果，天然轻量
