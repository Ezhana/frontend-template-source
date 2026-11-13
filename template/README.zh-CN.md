# 前端 Monorepo 模板

[English](./README.md) | 简体中文

由 `frontend-template-source` 生成的 pnpm workspace 启动模板。仓库默认**不包含应用**；通过
**Use this template** 或直接 clone 后，用一行命令选择框架：

```bash
pnpm create:app
```

命令会调度 Next.js、Vue、Astro、Nuxt 或 SvelteKit 的官方脚手架。默认交互式；CI 中传 `--defaults`
使用注册表默认参数。生成的应用位于 `apps/<name>`，自动加入 pnpm workspace。生成器本身是已发布的
`create-ezhana-app` 包，以普通 devDependency 精确锁定。

非交互用法：

```bash
pnpm create:app next my-app --defaults
pnpm create:app vue my-app --defaults
pnpm create:app astro my-app --defaults
pnpm create:app nuxt my-app --defaults
pnpm create:app sveltekit my-app --defaults

# 写入应用根目录的共享 ESLint/Prettier 配置
pnpm create:app next my-app --defaults --eslint --prettier

# 把主题包的 style.css 注入应用全局 CSS
pnpm create:app next my-app --defaults --theme ocean
```

生成的应用默认保留官方脚手架自己的工具链，除非显式选择共享配置。应用共用根目录的提交钩子和 CI 配置。

## 环境要求

- Node.js 24
- pnpm 12
- 首次使用前执行一次 `pnpm install`，它会安装根目录工具和固定版本的生成器
- 首次执行 `pnpm create:app` 需要网络（会下载官方脚手架和 npm 包）

## 使用方式

```bash
pnpm install
pnpm create:app       # 选择框架，然后回答官方 CLI 的提示
pnpm dev              # 运行已生成的应用
pnpm build            # 构建已生成的应用
pnpm lint
pnpm check            # format:check + lint + build
```

也可以直接使用 workspace filter：

```bash
pnpm --filter ./apps/my-app dev
pnpm --filter ./apps/my-app build
```

## Lint 与格式化

lint/format 规则位于 `packages/` 下的共享 workspace 包中：

```text
eslint-config-base
eslint-config-typescript
eslint-config-react
eslint-config-vue
eslint-config-astro
eslint-config-next
eslint-config-nuxt
eslint-config-svelte
prettier-config
```

根目录的 `eslint.config.mjs` 引入 `@ezhana/eslint-config-base`，根目录的 `prettier.config.mjs` 重新导出
`@ezhana/prettier-config`，因此在 `packages/` 中修改规则会作用于 workspace 根目录。

默认情况下 `create:app` 不改动脚手架的 lint/format 设置。如需把共享配置写入应用，请在创建时传
`--eslint` / `--prettier`；工具不提供针对已有应用的单独配置命令。

工具会在应用根目录写入 `eslint.config.mjs` 和 `prettier.config.mjs`，引入按框架映射的配置包，并以
`workspace:*` 加入依赖。Astro 和 SvelteKit 还会加入对应的 Prettier 插件。它不会删除脚手架配置，也不会
修改 `package.json` 脚本；如果需要 `pnpm lint` 使用 ESLint，请自行调整脚本。

如需为所有应用修改规则，请修改对应的 `packages/eslint-config-*/index.js`（或
`packages/prettier-config/index.js`），或在单个应用的配置中添加覆盖。

## 共享包

`packages/` 包含共享的 lint/format 配置包（即上文的九个配置包）。它们是 workspace 包而不是已发布的
npm 依赖：根目录和应用的配置通过 workspace 解析它们，因此请保留该目录及这些包。

可以在它们旁边添加自己的共享包：

- 创建 `packages/<name>`，包含 `package.json`、`src/` 和构建脚本；
- 在应用中通过 `"workspace:*"` 引用；
- 在 `pnpm build` 之前执行 `pnpm build:packages`（配置包没有构建步骤，会被跳过）。

详见 [`packages/README.md`](packages/README.md)。

已发布的 `@ezhana/*` 主题和令牌包是普通 npm 依赖，不链接 workspace 源码。

## 主题

`create:app --theme <name>` 是纯 CSS 集成：按固定候选列表查找全局 CSS（优先 `src/styles/global.css`），
在顶部加入 `@import '<theme-package>/style.css'`，并把主题包加入依赖。找不到全局 CSS 时会警告并跳过。

生成的应用中没有主题切换器、运行时、防闪烁脚本或框架专属 overlay。设计系统包仍可手动使用：

- `@ezhana/design-tokens` — 核心令牌、语义契约、默认主题和完整样式表；
- `@ezhana/design-theme-*` — 自包含的 CSS 主题预设；
- `@ezhana/theme` — 需要自己实现切换器时的可选运行时；
- `@ezhana/typography-editorial` — 可选的纯 CSS 长文排版预设。

完整消费指南见源仓库的
[`docs/usage.md`](https://github.com/Ezhana/frontend-template-source/blob/main/docs/usage.md)。

## 提交钩子与 CI

根目录的 `lint-staged.config.mjs` 和 `simple-git-hooks` 会对暂存文件执行 Prettier/ESLint。CI 校验格式、
lint 和构建，create-app matrix 会运行已发布的生成器。
