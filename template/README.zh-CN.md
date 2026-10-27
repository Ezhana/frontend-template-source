# 前端 Monorepo 模板

[English](./README.md) | 简体中文

一个基于 pnpm 的 monorepo 启动模板，包含两套应用模板，以及可选的共享包目录。

- `apps/react-vite` — React + TypeScript + Vite
- `apps/vue-vite` — Vue 3 + TypeScript + Vite
- `packages/` — **可选**，用于你自行开发的共享包
- 来自 npm 的共享工具配置：`@ezhana/eslint-config-*`、`@ezhana/prettier-config`
- 来自 npm 的主题能力：`@ezhana/design-tokens` + `@ezhana/theme`

两套应用可以同时保留，也可以只保留其中一个。它们共用根目录的工具链、Lint 和 CI 配置。

## 环境要求

- Node.js 24
- pnpm 12

## 快速开始

```bash
pnpm install
pnpm dev:react      # 或：pnpm dev:vue
```

构建、Lint 与格式化：

```bash
pnpm build          # 先构建 packages/*（如果有），再构建两个应用
pnpm build:apps     # 只构建应用
pnpm build:packages # 只构建 packages/*
pnpm lint
pnpm format
pnpm check          # format:check + lint + build
```

也可以直接运行单个应用：

```bash
pnpm --dir apps/react-vite dev
pnpm --dir apps/vue-vite dev
```

## 共享包（可选）

`packages/` 目录保留下来作为你自己共享包的工作区入口，里面只有一个占位 `README.md`，不包含
示例包。**如果不需要共享包，可以直接删除 `packages/` 目录，并从根 `package.json` 中移除
`build:packages` 脚本。**

新增包时，创建 `packages/<your-package>`，添加 `package.json`、`src/` 和构建脚本，然后在应用中
以 `"workspace:*"` 引用。具体约定见 [`packages/README.md`](packages/README.md)。

`@ezhana/*` 是普通 npm 依赖，不链接本仓库源码；这样模板更轻量，也便于独立升级工具链和主题。

## 主题

应用从 npm 安装已发布的设计令牌与主题运行时；生成的 CSS 自定义属性在各应用入口文件中引入，
本地不需要构建令牌。

- 颜色模式默认跟随操作系统（`prefers-color-scheme`）。
- `data-theme` 选择主题；只有显式选择颜色模式时才写 `data-color-mode`。
- 两个应用都内置了主题切换器。

令牌契约、主题扩展和运行时 API 见 npm 包文档：

- [`@ezhana/design-tokens`](https://www.npmjs.com/package/@ezhana/design-tokens) — 令牌分层、
  主题、CSS 变量与主题设计说明
- [`@ezhana/theme`](https://www.npmjs.com/package/@ezhana/theme) — 主题/颜色模式状态机

如需修改令牌值或新增主题，请 fork design-tokens 库；否则可以按包文档在应用 CSS 中覆盖语义令牌。

## CI

`.github/workflows/ci.yml` 会在每次 push 和 pull request 时执行
`pnpm install --frozen-lockfile`、`pnpm format:check`、`pnpm lint` 和 `pnpm build`。

## License

MIT
