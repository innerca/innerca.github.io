# 代码实现避坑清单

## 1. Astro 组件 vs React 组件的职责不分
- **坑**：在 `.astro` 文件中写 `useState`、`useEffect` 或事件处理函数，导致构建报错。
- **避**：`.astro` 只做数据获取和布局，所有交互逻辑必须写在 `.tsx` 组件里，并用 `client:load` 等指令加载。

## 2. `client:only` 指令缺失导致水合错误
- **坑**：粒子背景、动画卡片依赖浏览器 API（如 `window`、`canvas`），服务端渲染时会报错。
- **避**：这类纯客户端组件必须加 `client:only="react"`，并在组件内部做 `typeof window !== 'undefined'` 守卫。

## 3. Framer Motion 在 Astro 中动画未启动或闪烁
- **坑**：`AnimatePresence` 包裹路由切换时，页面进出动画不触发；或首次渲染时动画初始状态闪现。
- **避**：
  - 将 `<AnimatePresence mode="wait">` 置于 `<Layout>` 内部但**不包裹** `Navbar`，只包 `main > slot`。
  - 给动画组件设置 `initial={{ opacity: 1 }}` 避免从 `0` 跳变，或在 `.astro` 中预填初始样式。

## 4. 岛屿间状态无法共享
- **坑**：两个 React 组件（如搜索框和结果列表）不在同一 React 树，无法用 Context 通信。
- **避**：
  - 使用 **Nano Stores**（框架无关），`npm i @nanostores/react`。
  - 或更简单：将它们放在同一个父组件内，不要拆分岛屿。

## 5. 粒子 Canvas 导致滚动卡顿
- **坑**：粒子数过多、主线程绘制未节流，导致 60fps 保不住。
- **避**：
  - 粒子数限制 60~80，移动端减半。
  - `requestAnimationFrame` 内计算帧间隔，超过 16.6ms 时跳过连线绘制。
  - Canvas 尺寸只用 CSS 拉伸，实际像素设为视口的 0.5 倍，用 `canvas.width = window.innerWidth * 0.5`。

## 6. FlexSearch 中文搜索不准确
- **坑**：默认 `tokenize: "strict"` 或 `"forward"` 会将"扩散模型"切成"扩""散""模""型"，搜"模型"找到不相关结果。
- **避**：
  - 构建索引时，中文文本按标点简单分词（`split(/[\s,，。]+/)`），然后用 `encode: "icase"`。
  - 或用 `tokenize: "forward"` 并接受初期不完美结果，后期换语义搜索。

## 7. 动态路由的多语言路径处理
- **坑**：`/zh/paper/[id]` 和 `/en/paper/[id]` 需要各自定义 `getStaticPaths`，容易遗漏或返回不同 id 集。
- **避**：抽出一个公共函数 `getAllPaperIds()`，在两个路由文件中复用，确保语言版本同步。

## 8. JSON 数据直接导入被打包进所有页面
- **坑**：`import papers from '../data/papers.json'` 会把整个 JSON 内联进 JS，首页加载数百 KB 数据。
- **避**：使用 Astro 的 `Astro.glob()` 或 `fetch` 在构建时读取，然后只传必需字段给组件，或按页面拆分数据。

## 9. 中文字体加载导致 CLS
- **坑**：网络字体加载中，文本高度变化引起布局偏移（Cumulative Layout Shift）。
- **避**：
  - 用 `font-display: swap` 并预加载字体 CSS。
  - 给文本容器设置固定 `min-height` 或使用 `size-adjust` 让回退字体与加载字体尺寸一致。
  - 更彻底：直接用系统字体栈。

## 10. PWA 缓存使更新不可见
- **坑**：部署新版本后，Service Worker 仍返回旧的 `papers.json` 和页面。
- **避**：
  - 注册 SW 时使用 Workbox `StaleWhileRevalidate`。
  - 在页面中检测 SW 更新，显示"新内容可用"提示条。
  - 构建时给 `papers.json` 请求附加版本时间戳。

## 11. Framer Motion 布局动画导致边缘错位
- **坑**：使用 `layout` 属性做卡片重排动画时，可能因回退尺寸丢失导致突然跳动。
- **避**：尽量避免在列表重排中依赖 `layout`，改用 `AnimatePresence` 做淡入淡出，或给卡片固定宽高。

## 12. 服务端生成随机值导致水合不一致
- **坑**：在 `.astro` 或 React 服务端部分使用 `Math.random()` 生成 key 或 id，客户端水合时值不同报错。
- **避**：任何随机 id 应在客户端 `useEffect` 内生成，或用确定性的数据驱动 id（如论文 arxiv id）。
