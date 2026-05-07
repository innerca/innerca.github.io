# AI 学术前沿雷达 · 项目公约

## 一、配置化原则（不许硬编码）

所有可变业务数据必须集中配置，禁止在组件或逻辑文件中写死。

| 类型 | 配置位置 | 说明 |
|------|----------|------|
| UI 文案 | `src/lib/i18n.ts` | 所有面向用户的文本（标题、按钮、提示） |
| 视觉常量 | `tailwind.config.cjs` + `:root` CSS 变量 | 颜色、阴影、圆角、字体 |
| 导航/路由 | `src/config/site.ts` | 页面标题、Logo 文字、导航链接、社交链接 |
| 功能开关 | `src/config/features.ts` | 是否启用搜索、粒子动画等 |
| 性能参数 | `src/config/performance.ts` | 粒子数量、动画开关、Canvas 缩放系数 |

组件中不应出现类似 `lang === 'zh' ? '首页' : 'Home'` 的三元表达式——这些必须走 `t(key, lang)` 配置函数。

## 二、需求完成后及时清理无效代码

每次需求/功能完成后，必须执行清理检查：

1. **删除未使用的组件**：不再引用的 `.astro` / `.tsx` 文件
2. **删除未使用的 import**：各文件中的未引用导入
3. **删除调试代码**：`console.log`、`debugger`、临时注释块
4. **删除冗余注释**：自解释代码上的注释、已过时的 TODO
5. **检查 dead route**：`pages/` 下是否有已废弃但未删除的路由
6. **检查 CSS 冗余**：未使用的 Tailwind 自定义类、重复的样式声明

## 三、项目可扩展 · 模块边界清晰

### 模块分层
```
src/
├── config/         ← 配置层（唯一可变点）
├── types/          ← 类型定义（公共契约）
├── lib/            ← 工具函数（无副作用纯函数）
├── data/           ← 数据源（JSON，被 config 和 lib 消费）
├── layouts/        ← 全局布局壳
├── components/
│   ├── react/      ← 交互组件（客户端水合，含状态和副作用）
│   └── astro/      ← 静态组件（纯展示，构建时渲染）
├── pages/          ← 路由页面（只做数据组装 + 组合组件）
└── styles/         ← 全局样式
```

### 模块通信规则
- **上层可依赖下层**：pages → components → lib → config
- **下层不可依赖上层**：lib 不可 import components
- **React 岛屿之间不共享 state**：必须放在同一父组件或用 Nano Stores
- **Astro 组件不写交互逻辑**：`useState` / `useEffect` 只允许在 `.tsx` 中

### 添加新功能的流程
1. 在 `config/` 添加配置项
2. 在 `types/` 补类型定义
3. 在 `lib/` 写纯逻辑
4. 在 `components/` 写 UI（astro 静态 / react 交互）
5. 在 `pages/` 注册路由并组装

---

## 💻 代码实现避坑清单

### 1. Astro 组件 vs React 组件的职责不分
- **坑**：在 `.astro` 文件中写 `useState`、`useEffect` 或事件处理函数，导致构建报错。
- **避**：`.astro` 只做数据获取和布局，所有交互逻辑必须写在 `.tsx` 组件里，并用 `client:load` 等指令加载。

### 2. `client:only` 指令缺失导致水合错误
- **坑**：粒子背景、动画卡片依赖浏览器 API（如 `window`、`canvas`），服务端渲染时会报错。
- **避**：这类纯客户端组件必须加 `client:only="react"`，并在组件内部做 `typeof window !== 'undefined'` 守卫。

### 3. Framer Motion 在 Astro 中动画未启动或闪烁
- **坑**：`AnimatePresence` 包裹路由切换时，页面进出动画不触发；或首次渲染时动画初始状态闪现。
- **避**：
  - 将 `<AnimatePresence mode="wait">` 置于 `<Layout>` 内部但**不包裹** `Navbar`，只包 `main > slot`。
  - 给动画组件设置 `initial={{ opacity: 1 }}` 避免从 `0` 跳变，或在 `.astro` 中预填初始样式。

### 4. 岛屿间状态无法共享
- **坑**：两个 React 组件（如搜索框和结果列表）不在同一 React 树，无法用 Context 通信。
- **避**：
  - 使用 **Nano Stores**（框架无关），`npm i @nanostores/react`。
  - 或更简单：将它们放在同一个父组件内，不要拆分岛屿。

### 5. 粒子 Canvas 导致滚动卡顿
- **坑**：粒子数过多、主线程绘制未节流，导致 60fps 保不住。
- **避**：
  - 粒子数限制 60~80，移动端减半。
  - `requestAnimationFrame` 内计算帧间隔，超过 16.6ms 时跳过连线绘制。
  - Canvas 尺寸只用 CSS 拉伸，实际像素设为视口的 0.5 倍，用 `canvas.width = window.innerWidth * 0.5`。

### 6. FlexSearch 中文搜索不准确
- **坑**：默认 `tokenize: "strict"` 或 `"forward"` 会将"扩散模型"切成"扩""散""模""型"，搜"模型"找到不相关结果。
- **避**：
  - 构建索引时，中文文本按标点简单分词（`split(/[\s,，。]+/)`），然后用 `encode: "icase"`。
  - 或用 `tokenize: "forward"` 并接受初期不完美结果，后期换语义搜索。

### 7. 动态路由的多语言路径处理
- **坑**：`/zh/paper/[id]` 和 `/en/paper/[id]` 需要各自定义 `getStaticPaths`，容易遗漏或返回不同 id 集。
- **避**：抽出一个公共函数 `getAllPaperIds()`，在两个路由文件中复用，确保语言版本同步。

### 8. JSON 数据直接导入被打包进所有页面
- **坑**：`import papers from '../data/papers.json'` 会把整个 JSON 内联进 JS，首页加载数百 KB 数据。
- **避**：使用 Astro 的 `Astro.glob()` 或 `fetch` 在构建时读取，然后只传必需字段给组件，或按页面拆分数据。

### 9. 中文字体加载导致 CLS
- **坑**：网络字体加载中，文本高度变化引起布局偏移（Cumulative Layout Shift）。
- **避**：
  - 用 `font-display: swap` 并预加载字体 CSS。
  - 给文本容器设置固定 `min-height` 或使用 `size-adjust` 让回退字体与加载字体尺寸一致。
  - 更彻底：直接用系统字体栈。

### 10. PWA 缓存使更新不可见
- **坑**：部署新版本后，Service Worker 仍返回旧的 `papers.json` 和页面。
- **避**：
  - 注册 SW 时使用 Workbox `StaleWhileRevalidate`。
  - 在页面中检测 SW 更新，显示"新内容可用"提示条。
  - 构建时给 `papers.json` 请求附加版本时间戳。

### 11. Framer Motion 布局动画导致边缘错位
- **坑**：使用 `layout` 属性做卡片重排动画时，可能因回退尺寸丢失导致突然跳动。
- **避**：尽量避免在列表重排中依赖 `layout`，改用 `AnimatePresence` 做淡入淡出，或给卡片固定宽高。

### 12. 服务端生成随机值导致水合不一致
- **坑**：在 `.astro` 或 React 服务端部分使用 `Math.random()` 生成 key 或 id，客户端水合时值不同报错。
- **避**：任何随机 id 应在客户端 `useEffect` 内生成，或用确定性的数据驱动 id（如论文 arxiv id）。
