# 前端 Monorepo 模板

[English](./README.md) | 简体中文

由 `frontend-template-source` 生成的 pnpm workspace 启动模板。仓库默认**不包含应用**；通过
**Use this template** 或直接 clone 后，用一行命令选择 React 或 Vue：

```bash
pnpm create:app
```

命令会询问框架和应用名，调用官方 `create-vite` / `create-vue` 生成项目，套用主题集成（传
`--no-theme` 可保留官方脚手架原样），最后把应用安装到 `apps/<name>`。生成器本身是已发布的
`create-ezhana-app` 包，以普通 devDependency 精确锁定，随 workspace 一起版本化和审计。非交互用法：

```bash
pnpm create:app react my-app
pnpm create:app vue my-app

# 创建时写入组合共享包的轻量 ESLint/Prettier 配置
pnpm create:app react my-app --eslint --prettier

# 保留官方脚手架原样，不套用主题覆盖
pnpm create:app react my-app --no-theme

# 或稍后配置已有应用
pnpm create:app configure apps/my-app --eslint --prettier
```

生成的应用默认保留官方脚手架自己的 lint/format 工具链，除非显式选择共享配置。应用共用根目录的
提交钩子和 CI 配置。

## 环境要求

- Node.js 24
- pnpm 12
- 首次使用前执行一次 `pnpm install`，它会安装根目录工具和固定版本的生成器
- 首次执行 `pnpm create:app` 需要网络（会下载官方脚手架和 npm 包）

## 使用方式

```bash
pnpm install          # 安装根目录工具和固定版本的 create-ezhana-app 生成器
pnpm create:app       # 选择 React 或 Vue，并输入应用名
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

lint/format 规则位于 `packages/` 下的共享 workspace 包中：`eslint-config-base`、
`eslint-config-typescript`、`eslint-config-react`、`eslint-config-vue` 和 `prettier-config`。根目录的
`eslint.config.mjs` 引入 `@ezhana/eslint-config-base`，根目录的 `prettier.config.mjs` 重新导出
`@ezhana/prettier-config`，因此在 `packages/` 中修改规则会作用于 workspace 根目录。

默认情况下 `create:app` 不改动脚手架的 lint/format 设置：React 应用保留 Vite 生成的 Oxlint 配置，
Vue 应用默认没有 lint/format 设置。如需把共享配置写入应用，可在创建时传 `--eslint` /
`--prettier`，或稍后执行：

```bash
pnpm create:app configure apps/my-app --eslint --prettier
```

`configure` 写入的是轻量配置：应用的 `eslint.config.mjs` 引入
`@ezhana/eslint-config-<framework>`（并提供应用级覆盖的扩展点），应用的 `prettier.config.mjs` 重新
导出 `@ezhana/prettier-config`。它会通过 `pnpm add -D` 以 `workspace:*` 把配置包加入应用的依赖。
它不会删除 Oxlint，也不会修改 `package.json` 脚本；如果需要 `pnpm lint` 使用 ESLint，请自行调整
脚本。

如需为所有应用修改规则，请修改对应的 `packages/eslint-config-*/index.js`（或
`packages/prettier-config/index.js`），或在单个应用的配置中添加覆盖。

## 共享包

`packages/` 包含共享的 lint/format 配置包（即上文的五个配置包）。它们是 workspace 包而不是已发布的
npm 依赖：根目录和应用的配置通过 workspace 解析它们，因此请保留该目录及这些包。

可以在它们旁边添加自己的共享包：

- 创建 `packages/<name>`，包含 `package.json`、`src/` 和构建脚本；
- 在应用中通过 `"workspace:*"` 引用；
- 在 `pnpm build` 之前执行 `pnpm build:packages`（配置包没有构建步骤，会被跳过）。

详见 [`packages/README.md`](packages/README.md)。

已发布的 `@ezhana/*` 主题和令牌包是普通 npm 依赖，不链接 workspace 源码。

## 主题

生成的应用从 npm 安装已发布的设计令牌、CSS-first 主题预设和可选的主题运行时；样式在入口文件中引入，
本地不需要构建令牌。

- `@ezhana/design-tokens` 提供核心令牌、语义契约、默认主题和完整核心样式表。
- `@ezhana/design-theme-ocean`、`@ezhana/design-theme-cerulean`、`@ezhana/design-theme-onyx`、
  `@ezhana/design-theme-quest` 和 `@ezhana/design-theme-obsidian` 是各自独立发布的主题包，每个主题一个包。
  Cerulean 与 Ocean 支持明暗两种模式；Quest、Onyx、Obsidian 仅提供暗色模式，声明为
  `modes: ['dark']`。
- `@ezhana/theme` 是可选的主题切换运行时；仅做样式时不需要它。
- 颜色模式默认跟随操作系统（`prefers-color-scheme`）。
- `data-theme` 选择主题；只有显式选择颜色模式时才写 `data-color-mode`。
- React 和 Vue 应用都会生成主题切换器。
- 创建应用时传 `--no-theme` 可跳过主题覆盖：不会加入主题运行时、切换器或 `@ezhana` 主题依赖。

### 主题包的导出

每个主题包提供相同的入口：

| 入口           | 内容                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| `./style.css`  | 完整自包含预设：主题字体 + 完整核心样式表 + 主题覆盖                        |
| `./theme.css`  | 仅主题覆盖；与核心样式表搭配使用                                            |
| `./fonts.css`  | 仅主题的 `@font-face` 规则                                                  |
| `./theme.json` | 各支持模式的解析值与覆盖值，供工具和测试使用                                |
| `.`            | 元数据：`theme`（`{ id, label, modes }`）、`themeId`、`themeLabel`、`modes` |

只使用一个主题的应用可以只引入 `@ezhana/design-theme-<id>/style.css`。生成的应用默认安装两个主题，因此只引入
一次核心样式表，再分别引入每个主题的 `fonts.css` 与 `theme.css`：

```ts
// src/main.tsx / src/main.ts
import '@ezhana/design-tokens/style.css'
import '@ezhana/design-theme-ocean/fonts.css'
import '@ezhana/design-theme-ocean/theme.css'
import '@ezhana/design-theme-cerulean/fonts.css'
import '@ezhana/design-theme-cerulean/theme.css'
```

字体包是主题包的 devDependencies，字体文件会被复制进已发布的预设中，因此应用不需要安装 `@fontsource-*`。

### 应用内的主题定义

每个应用在 `src/theme/registry.ts` 中维护自己的主题集合，并把定义数组直接交给运行时：

```ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import type { ThemeDefinition } from '@ezhana/theme'

export const themeDefinitions = [
  defaultThemeDefinition,
  ocean,
  cerulean,
] as const satisfies readonly ThemeDefinition[]

export type AppTheme = (typeof themeDefinitions)[number]['id']
export const themeIds = themeDefinitions.map((definition) => definition.id) as AppTheme[]
export const themeLabels = Object.fromEntries(
  themeDefinitions.map((definition) => [definition.id, definition.label]),
) as Record<AppTheme, string>
```

```ts
// src/theme/manager.ts
import { createThemeManager } from '@ezhana/theme'
import { themeDefinitions } from './registry'

export const themeManager = createThemeManager({ themes: themeDefinitions })
```

切换器读取 `themeIds` / `themeLabels`；`themeManager` 从定义数组推导支持的颜色模式并集，并对仅暗色主题收敛
`resolvedMode`（用户切回明暗双模式主题后，之前保存的 `light` 偏好会重新生效）。定义数组就是唯一数据源，不需要
额外的注册表对象。

### 添加主题

1. 在应用中安装主题包：`pnpm --filter ./apps/<name> add @ezhana/design-theme-<id>`。
2. 在入口文件中引入它的 `fonts.css` 与 `theme.css`（如果它是唯一主题，也可以直接引入完整 `style.css`）。
3. 在 `src/theme/registry.ts` 中引入它的 `theme` 导出，并加入 `themeDefinitions`。

不需要修改生成器。生成的应用使用 `data-theme` 和可选的 `data-color-mode`，因此主题切换完全由 CSS 完成；
运行时只负责切换器的校验、持久化与状态订阅。

令牌契约、主题模型与运行时 API 见 npm 包文档：

- [`@ezhana/design-tokens`](https://www.npmjs.com/package/@ezhana/design-tokens)
- [`@ezhana/theme`](https://www.npmjs.com/package/@ezhana/theme)
- [`@ezhana/design-theme-cerulean`](https://www.npmjs.com/package/@ezhana/design-theme-cerulean)
- [`@ezhana/design-theme-obsidian`](https://www.npmjs.com/package/@ezhana/design-theme-obsidian)
- [`@ezhana/design-theme-ocean`](https://www.npmjs.com/package/@ezhana/design-theme-ocean)
- [`@ezhana/design-theme-onyx`](https://www.npmjs.com/package/@ezhana/design-theme-onyx)
- [`@ezhana/design-theme-quest`](https://www.npmjs.com/package/@ezhana/design-theme-quest)

## CI

`.github/workflows/ci.yml` 会在每次 push 和 pull request 时执行
`pnpm install --frozen-lockfile`、`pnpm format:check`、`pnpm lint` 和 `pnpm build`。尚无应用时，
应用相关步骤为空操作。

## License

MIT
