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

## 四、Ollama 模型用完释放内存

- 每次使用完 Ollama 上的模型（如 qwen3-vl）后，立即调用 `mcp__ollama__unload_model` 将其从内存中踢出，避免长期占用 VRAM（约 22GB）。
- 不要等到会话结束再清理。

## 五、Git 操作规范

- **不主动 `git push`**：除非用户明确要求，不得执行推送操作。所有修改仅停留在本地工作区。
- **每次功能修改后自动 commit**：每完成一个原子性的功能修改后，主动执行 `git add` + `git commit`，无需等待用户提示。commit message 使用 conventional commits 风格（`feat:`、`fix:`、`chore:`、`refactor:`、`docs:`），附 `Co-Authored-By`。
- **push 前合并相关 commit**：在 push 之前，将同一需求/功能的多笔相关 commit 合并（squash）为一个，保持提交历史清晰。
