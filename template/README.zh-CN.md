# 前端 Monorepo 模板

[English](./README.md) | 简体中文

由 `frontend-template-source` 生成的 pnpm workspace 启动模板。仓库默认**不包含应用**；通过
**Use this template** 或直接 clone 后，用一行命令选择 React 或 Vue：

```bash
pnpm create:app
```

命令会询问框架和应用名，调用官方 `create-vite` / `create-vue` 生成项目，套用 `@ezhana/*` 的
ESLint、Prettier 和主题集成，最后把应用安装到 `apps/<name>`。生成器本身是已发布的
`create-ezhana-app` 包，以普通 devDependency 精确锁定，随 workspace 一起版本化和审计。非交互用法：

```bash
pnpm create:app react my-app
pnpm create:app vue my-app
```

生成的应用共用根目录的工具链、Lint、提交钩子和 CI 配置。

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

## 共享包（可选）

`packages/` 是可选的自定义共享包目录，里面只有占位 `README.md`。**如果不需要共享包，可以删除
`packages/` 目录，并从根 `package.json` 中移除 `build:packages` 脚本。** 具体约定见
[`packages/README.md`](packages/README.md)。

`@ezhana/*` 是普通 npm 依赖，不链接模板源码。

## 主题

生成的应用从 npm 安装已发布的设计令牌、主题包与主题运行时；样式在入口文件中引入，本地不需要
构建令牌。

- `@ezhana/design-tokens` 提供核心令牌、语义契约和默认主题。
- `@ezhana/design-theme-ocean`、`@ezhana/design-theme-cerulean` 和 `@ezhana/design-theme-quest`
  是各自独立发布的主题包。QuestUI 仅提供暗色模式，因此注册表和运行时支持主题声明颜色模式的子集。
- `@ezhana/theme` 管理主题与颜色模式状态。
- 颜色模式默认跟随操作系统（`prefers-color-scheme`）。
- `data-theme` 选择主题；只有显式选择颜色模式时才写 `data-color-mode`。
- React 和 Vue 应用都会生成主题切换器。

每个应用在 `src/theme/registry.ts` 注册主题，并从注册表推导 `AppTheme`，因此切换器和主题管理器
始终与已安装的主题包一致：

```ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { defineThemeRegistry } from '@ezhana/theme'

export const themeRegistry = defineThemeRegistry([defaultThemeDefinition, ocean, cerulean])
export type AppTheme = (typeof themeRegistry.themes)[number]
```

添加主题：在应用中安装对应主题包、在入口文件中引入其样式，并把它的 `theme` 导出加入
`defineThemeRegistry([...])`。如果主题支持的颜色模式少于应用（例如仅暗色的主题），还需向
`createThemeManager` 传入 `themeModes: themeRegistry.themeModes`，以便把解析后的模式收敛到主题支持的模式。
主题包提供 `./style`（核心样式 + 主题字体（如有）+ 覆盖，一次引入即可）、
`./theme.css`（仅覆盖）和 `./standalone.css`（核心 + 覆盖，适合无 bundler 场景）。

令牌契约、主题模型与运行时 API 见 npm 包文档：

- [`@ezhana/design-tokens`](https://www.npmjs.com/package/@ezhana/design-tokens)
- [`@ezhana/theme`](https://www.npmjs.com/package/@ezhana/theme)
- [`@ezhana/design-theme-cerulean`](https://www.npmjs.com/package/@ezhana/design-theme-cerulean)
- [`@ezhana/design-theme-ocean`](https://www.npmjs.com/package/@ezhana/design-theme-ocean)
- [`@ezhana/design-theme-quest`](https://www.npmjs.com/package/@ezhana/design-theme-quest)

## CI

`.github/workflows/ci.yml` 会在每次 push 和 pull request 时执行
`pnpm install --frozen-lockfile`、`pnpm format:check`、`pnpm lint` 和 `pnpm build`。尚无应用时，
应用相关步骤为空操作。

## License

MIT
