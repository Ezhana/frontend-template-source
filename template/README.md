# Frontend Monorepo Template

English | [简体中文](./README.zh-CN.md)

A pnpm workspace starter generated from `frontend-template-source`. This repository intentionally
ships **no application by default**: after cloning or using **Use this template**, choose React or
Vue with one command.

```bash
pnpm create:app
```

The command prompts for the framework and app name, scaffolds with the official
`create-vite` / `create-vue` version, applies the theme integration (pass `--no-theme` to keep the
plain official scaffold), then installs the app under `apps/<name>`. The generator itself is the
published `create-ezhana-app` package, pinned as a regular devDependency, so it is versioned and
audited together with the rest of the workspace tooling.
Non-interactive usage:

```bash
pnpm create:app react my-app
pnpm create:app vue my-app

# write thin ESLint/Prettier configs that compose the shared packages
pnpm create:app react my-app --eslint --prettier

# keep the plain official scaffold instead of applying the theme overlay
pnpm create:app react my-app --no-theme

# or configure an existing app later
pnpm create:app configure apps/my-app --eslint --prettier
```

Generated apps keep the official scaffold's own lint/format tooling unless you ask for the shared
config. They share the root commit hooks and CI configuration.

## Requirements

- Node.js 24
- pnpm 12
- Run `pnpm install` once before `pnpm create:app`; it installs the pinned generator together with
  the root tooling
- Network access for the first `pnpm create:app` (the official scaffolders and npm packages are
  downloaded)

## Usage

```bash
pnpm install          # installs root tooling and the pinned create-ezhana-app generator
pnpm create:app       # choose React or Vue, then enter an app name
pnpm dev              # run generated apps
pnpm build            # build generated apps
pnpm lint
pnpm check            # format:check + lint + build
```

You can also use the workspace filters directly:

```bash
pnpm --filter ./apps/my-app dev
pnpm --filter ./apps/my-app build
```

## Lint and format

The lint/format rules live in the shared workspace packages under `packages/`:
`eslint-config-base`, `eslint-config-typescript`, `eslint-config-react`, `eslint-config-vue` and
`prettier-config`. The root `eslint.config.mjs` imports `@ezhana/eslint-config-base` and the root
`prettier.config.mjs` re-exports `@ezhana/prettier-config`, so a rule change in `packages/` applies
to the workspace root.

By default `create:app` leaves the scaffold's tooling untouched: a React app keeps the Oxlint config
created by Vite, and a Vue app has no lint/format setup. To write the shared config into an app,
either pass `--eslint` / `--prettier` when creating it or run:

```bash
pnpm create:app configure apps/my-app --eslint --prettier
```

`configure` writes thin configs: the app `eslint.config.mjs` imports
`@ezhana/eslint-config-<framework>` (with an extension point for app-specific overrides) and the app
`prettier.config.mjs` re-exports `@ezhana/prettier-config`. It adds the config packages to the app as
`workspace:*` dependencies with `pnpm add -D`. It does not delete Oxlint or rewrite `package.json`
scripts, so update those yourself if you want `pnpm lint` to run ESLint.

Change rules for every app in the matching `packages/eslint-config-*/index.js` (or
`packages/prettier-config/index.js`), or add overrides in the individual app config.

## Packages

`packages/` contains the shared lint/format config packages (the five config packages described
above). They are workspace packages, not published npm dependencies: the root and app configs
resolve them through the workspace, so keep the directory and the packages.

Add your own shared packages alongside them:

- create `packages/<name>` with a `package.json`, `src/` and a build script;
- reference it from an app with `"workspace:*"`;
- run `pnpm build:packages` before `pnpm build` (the config packages have no build step and are
  skipped).

See [`packages/README.md`](packages/README.md).

The published `@ezhana/*` theme and token packages are regular npm dependencies, not linked
workspace sources.

## Theming

Generated apps consume published design tokens, CSS-first theme presets and the optional runtime
from npm. The stylesheets are imported in each app entry file; no local token build step is
required.

- `@ezhana/design-tokens` ships the core token scale, the semantic contract, the default theme and
  the complete core stylesheet.
- `@ezhana/design-theme-ocean`, `@ezhana/design-theme-cerulean`, `@ezhana/design-theme-onyx`,
  `@ezhana/design-theme-quest` and `@ezhana/design-theme-obsidian` are independent theme packages,
  one package per theme. Cerulean and Ocean support light + dark; Quest, Onyx and Obsidian are
  dark-only and declare `modes: ['dark']`.
- `@ezhana/theme` is the optional runtime for switcher state. Styling does not need it.
- `@ezhana/typography-editorial` is an optional CSS-only preset for rendered long-form content. The
  generator does not install it; add it to an app that needs article typography and scope the content
  with `.ez-editorial`.
- The color mode follows the operating system by default (`prefers-color-scheme`).
- `data-theme` selects the theme; `data-color-mode` is written only for an explicit color mode.
- A theme switcher is generated into both React and Vue apps.
- Pass `--no-theme` when creating an app to skip the overlay: no theme runtime, switcher or
  `@ezhana` theme dependencies are added.

### Theme package exports

Every theme package exposes the same entries:

| Entry          | Contents                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------ |
| `./style.css`  | complete self-contained preset: the theme's fonts + full core stylesheet + theme overrides |
| `./theme.css`  | theme overrides only; use with the core stylesheet                                         |
| `./fonts.css`  | the theme's `@font-face` rules only                                                        |
| `./theme.json` | resolved override and semantic values per supported mode                                   |
| `.`            | metadata: `theme` (`{ id, label, modes }`), `themeId`, `themeLabel`, `modes`               |

A one-theme app can import only `@ezhana/design-theme-<id>/style.css`. The generated apps install two
themes, so they import the core stylesheet once and each theme's `fonts.css` + `theme.css`:

```ts
// src/main.tsx / src/main.ts
import '@ezhana/design-tokens/style.css'
import '@ezhana/design-theme-ocean/fonts.css'
import '@ezhana/design-theme-ocean/theme.css'
import '@ezhana/design-theme-cerulean/fonts.css'
import '@ezhana/design-theme-cerulean/theme.css'
```

Font packages are devDependencies of the theme packages; their files are copied into the published
preset, so the app never installs `@fontsource-*`.

### App theme definitions

Each app owns its theme set in `src/theme/registry.ts` and passes the definitions straight to the
runtime:

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

The switcher reads `themeIds` / `themeLabels`; `themeManager` derives the supported-mode union and
clamps `resolvedMode` for dark-only themes (a `light` preference applies again when the user switches
to a light+dark theme). There is no registry builder: the definitions array is the single source of truth.

### Adding a theme

1. Install the theme package in the app:
   `pnpm --filter ./apps/<name> add @ezhana/design-theme-<id>`.
2. Import its `fonts.css` and `theme.css` in the entry file (or its complete `style.css` if it is the
   only theme).
3. Import its `theme` export in `src/theme/registry.ts` and add it to `themeDefinitions`.

No generator change is needed. The generated apps use `data-theme` + the optional
`data-color-mode`, so switching themes is CSS-only; the runtime exists for the switcher's validated,
persisted state.

See the package documentation for the token contract, theme model and runtime API:

- [`@ezhana/design-tokens`](https://www.npmjs.com/package/@ezhana/design-tokens)
- [`@ezhana/theme`](https://www.npmjs.com/package/@ezhana/theme)
- [`@ezhana/design-theme-cerulean`](https://www.npmjs.com/package/@ezhana/design-theme-cerulean)
- [`@ezhana/design-theme-obsidian`](https://www.npmjs.com/package/@ezhana/design-theme-obsidian)
- [`@ezhana/design-theme-ocean`](https://www.npmjs.com/package/@ezhana/design-theme-ocean)
- [`@ezhana/design-theme-onyx`](https://www.npmjs.com/package/@ezhana/design-theme-onyx)
- [`@ezhana/design-theme-quest`](https://www.npmjs.com/package/@ezhana/design-theme-quest)
- [`@ezhana/typography-editorial`](https://www.npmjs.com/package/@ezhana/typography-editorial)

## CI

`.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`
and `pnpm build` on every push and pull request. With no apps yet, the app steps are no-ops.

## License

MIT
