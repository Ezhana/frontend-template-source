# Frontend Template Source

Source/development monorepo for the `frontend-template` repository. It provides reusable ESLint and
Prettier configurations, the design-token and theme packages, and the generator that creates React
and Vue apps on demand. The consumer-facing template repository is generated from this repository;
no full sample apps are committed here.

## Features

- pnpm workspace monorepo
- Centralized dependency versions with pnpm Catalog
- ESLint 10 Flat Config
- TypeScript ESLint configuration
- Vue 3 ESLint configuration
- React ESLint configuration
- Shared Prettier configuration
- Layered design tokens (primitive → semantic, optional component layer) compiled with Style Dictionary
- Themes as standalone, independently versioned packages built with a validating theme builder
- Multi-theme switching (`data-theme` + optional `data-color-mode`) through semantic-token overrides
- Framework-agnostic theme runtime with a typed theme registry, persistence and system color-scheme support
- Token contract, reference, and WCAG AA contrast validation for every theme package
- On-demand React/Vue app generation from pinned `create-vite` / `create-vue` versions
- Theme and tooling overlay applied to generated apps
- Generated `frontend-template` repository export
- lint-staged with simple-git-hooks
- GitHub Actions CI
- Changesets for package versioning and releases

## Requirements

- Node.js 24 LTS
- pnpm 12

The repository pins the package manager in the root `package.json` and defines the supported Node.js version through `engines`.

## Repository Structure

```text
frontend-template-source/
├── packages/                 # published @ezhana/* sources
│   ├── design-tokens/        # core tokens, semantic contract, default theme
│   ├── theme-builder/        # build tool for theme packages
│   ├── design-theme-cerulean/  # official theme package
│   ├── design-theme-ocean/     # official theme package
│   ├── theme/                # theme/mode state machine + theme registry
│   ├── eslint-config-base/
│   ├── eslint-config-typescript/
│   ├── eslint-config-vue/
│   ├── eslint-config-react/
│   └── prettier-config/
│
├── tools/create-app/         # published create-ezhana-app generator + overlay pipeline
│   ├── recipes/
│   ├── overlays/
│   └── bin/create-app.mjs
│
├── template/                 # skeleton for the generated frontend-template
├── scripts/                  # export + token build scripts
├── docs/
├── .changeset/
├── .github/workflows/
│
├── eslint.config.mjs
├── prettier.config.mjs
├── package.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## Packages

### ESLint

#### `@ezhana/eslint-config-base`

Base ESLint Flat Config for frontend JavaScript projects.

Includes:

- ESLint recommended rules
- Browser globals
- Basic JavaScript rules
- Prettier compatibility

Usage:

```js
import config from '@ezhana/eslint-config-base'

export default config
```

#### `@ezhana/eslint-config-typescript`

TypeScript ESLint configuration built on top of the base configuration.

Usage:

```js
import config from '@ezhana/eslint-config-typescript'

export default config
```

#### `@ezhana/eslint-config-vue`

Vue 3 + TypeScript ESLint configuration.

Usage:

```js
import config from '@ezhana/eslint-config-vue'

export default config
```

#### `@ezhana/eslint-config-react`

React + TypeScript ESLint configuration.

Usage:

```js
import config from '@ezhana/eslint-config-react'

export default config
```

### Prettier

#### `@ezhana/prettier-config`

Shared Prettier configuration for frontend projects.

Usage:

```js
export { default } from '@ezhana/prettier-config'
```

### Design tokens

#### `@ezhana/design-tokens`

Layered design tokens (DTCG format) compiled by [Style Dictionary](https://styledictionary.com/)
into a single stylesheet of CSS custom properties, plus the machine-readable theme contract,
resolved values and typed ESM metadata.

Includes:

- primitive layer (`--primitive-*`: neutral/status palette ramps, spacing, typography scales) — raw,
  never themed
- semantic layer (`--color-*`, `--font-*`, `--radius-*`, ...) — the public API for product code, and
  the default theme
- the theme contract (`dist/json/contract.json`): required overrides, semantic token sets, color
  modes and the theme-private `theme.*` namespace
- no theme identities — a theme is a separate package (see [Theming](#theming))
- no component layer by design — optional separate package when a component system needs one
- build-time contract validation and WCAG AA contrast tests

Usage:

```ts
import '@ezhana/design-tokens/css/tokens.css'
import { defaultTheme, defaultThemeDefinition, modeLabels, modes } from '@ezhana/design-tokens'
```

Build, test and full documentation:

```bash
pnpm --filter @ezhana/design-tokens build
pnpm --filter @ezhana/design-tokens test
```

See [`packages/design-tokens/README.md`](packages/design-tokens/README.md).

#### `@ezhana/theme-builder`

Build tool for theme packages. It validates a theme against the core contract (required overrides,
references, contrast) and emits the theme stylesheet, standalone stylesheet, style entry, metadata
and JSON snapshot.

```js
// theme.config.mjs
import { defineTheme } from '@ezhana/theme-builder'

export default defineTheme({
  id: 'acme',
  label: 'ACME',
  tokens: ['tokens/palette.json'], // theme-private tokens, under `theme.*`
  overrides: 'tokens/theme.json', // semantic overrides: base + one section per color mode
  fonts: ['@fontsource-variable/inter'],
})
```

```js
// scripts/build.mjs
import { buildTheme } from '@ezhana/theme-builder'

await buildTheme(new URL('../theme.config.mjs', import.meta.url))
```

See [`packages/theme-builder/README.md`](packages/theme-builder/README.md).

#### Official theme packages

`@ezhana/design-theme-cerulean` and `@ezhana/design-theme-ocean` are regular theme packages built
with `@ezhana/theme-builder`: each owns its palette, its typeface and its overrides, and depends on
`@ezhana/design-tokens` but not on `@ezhana/theme`.

```ts
import '@ezhana/design-theme-ocean/style' // core CSS + theme overrides
```

- [`packages/design-theme-cerulean`](packages/design-theme-cerulean/README.md) — cerulean-blue accent,
  Public Sans, level-2 controls, with a full [design narrative](packages/design-theme-cerulean/docs/DESIGN.md)
- [`packages/design-theme-ocean`](packages/design-theme-ocean/README.md) — indigo-blue accent,
  pill-shaped controls

### Theme runtime

#### `@ezhana/theme`

Framework-agnostic theme state machine: theme selection, `light` / `dark` / `system` preference,
localStorage persistence, `prefers-color-scheme` tracking and cross-tab synchronisation. It applies
`data-theme` and (only for explicit modes) `data-color-mode` to the root element; the token
stylesheets do the rest. `defineThemeRegistry` assembles the metadata of the installed themes.

Usage:

```ts
import { defaultThemeDefinition, type Mode } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { createThemeManager, defineThemeRegistry } from '@ezhana/theme'

export const themeRegistry = defineThemeRegistry([defaultThemeDefinition, ocean, cerulean])
export type AppTheme = (typeof themeRegistry.themes)[number]

export const themeManager = createThemeManager<AppTheme, Mode>({
  themes: [...themeRegistry.themes],
  modes: [...themeRegistry.modes],
  defaultTheme: themeRegistry.defaultTheme,
})

themeManager.setMode('system') // follows the OS via CSS; no data-color-mode attribute
themeManager.subscribe((state) => console.log(state.resolvedMode))
```

See [`packages/theme/README.md`](packages/theme/README.md) for the API, SSR guidance and the
no-flash inline `<head>` script.

## Usage

### Create an app from the official scaffolders

Requires Node.js 24, pnpm 12 and network access (the pinned external scaffolders are downloaded
with `pnpm dlx`):

```bash
pnpm install
pnpm create:app react my-react-app
pnpm create:app vue my-vue-app
```

The generator then:

1. scaffolds with the pinned `create-vite` / `create-vue` version;
2. removes the generated ESLint/Prettier/Oxlint configuration and dependency additions;
3. applies the `@ezhana/*` ESLint/Prettier config, theme runtime, theme switcher and anti-flash script;
4. installs dependencies once, formats, lints and builds;
5. moves the app into `apps/<name>` before install (the workspace needs it there), then installs and
   verifies it, removing the app again if either step fails.

Run `pnpm create:app` without arguments for an interactive framework/name prompt. By default the app
is created under `apps/<name>`; use `--target <path>` for a different directory.

Generated app commands:

```bash
cd apps/my-react-app
pnpm dev
pnpm build
pnpm lint
pnpm format:check
```

Options: `--no-install`, `--no-verify`, `--keep-temp`, `--target`, `--root`. See
[`docs/create-app.md`](docs/create-app.md).

In the generated template repository the same `pnpm create:app` command runs the published
[`create-ezhana-app`](https://www.npmjs.com/package/create-ezhana-app) devDependency; the generator
is not copied into the template. See
[ADR 0002](docs/adr/0002-distribute-create-app-via-npm.md).

### Use the generated template repository

The generated `frontend-template` repository is a **workspace starter with no default apps**:

- `apps/` — empty; users choose a stack with one command;
- `packages/` — optional placeholder for your own workspace packages (delete it if unused);
- `README.md` (English) and `README.zh-CN.md` (中文);
- shared linting, formatting, commit hooks and CI from npm.

```bash
pnpm install        # installs root tooling and the pinned create-ezhana-app generator
pnpm create:app     # interactive: choose React or Vue, then enter an app name
pnpm dev            # run the generated app(s)
pnpm build
pnpm lint
pnpm check
```

The command is routed to the official `create-vite` / `create-vue` CLI and then patched with the
Ezhana configuration and theme integration. The generated app appears under `apps/<name>`.

To add your own package, create `packages/<name>`, reference it with `"workspace:*"` from an app,
and run `pnpm build:packages` before `pnpm build`. See the template's `packages/README.md`.

### Maintain this source repository

```bash
pnpm install
pnpm check                    # format:check + lint + tests + typecheck
pnpm build                    # regenerate the core token dist/ and every theme package

pnpm create:app react check-react --target /tmp/check-react   # inspect the generated app
pnpm create:app vue check-vue --target /tmp/check-vue

pnpm export:template --install           # generate dist-template/frontend-template
```

Publish `@ezhana/*` package changes and `create-ezhana-app` before exporting; then run
**Actions → Export template repo** (or push the generated directory manually). See
[`docs/template-distribution.md`](docs/template-distribution.md) for GitHub configuration.

### Design tokens and theme runtime

```ts
import '@ezhana/design-tokens/css/tokens.css'
import '@ezhana/design-theme-ocean/style'
import { defaultThemeDefinition, type Mode } from '@ezhana/design-tokens'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { createThemeManager, defineThemeRegistry } from '@ezhana/theme'

export const themeRegistry = defineThemeRegistry([defaultThemeDefinition, ocean])
export type AppTheme = (typeof themeRegistry.themes)[number]

export const themeManager = createThemeManager<AppTheme, Mode>({
  themes: [...themeRegistry.themes],
  modes: [...themeRegistry.modes],
  defaultTheme: themeRegistry.defaultTheme,
})
```

See [`docs/usage.md`](docs/usage.md) for the end-to-end theme flow and
[`packages/theme/README.md`](packages/theme/README.md) for the runtime API.

## Theming

Themes are modeled as two orthogonal axes instead of pre-composed theme names:

| axis  | attribute         | values                     | owner           |
| ----- | ----------------- | -------------------------- | --------------- |
| theme | `data-theme`      | any installed theme id     | visual identity |
| mode  | `data-color-mode` | `light`, `dark` (optional) | color scheme    |

`data-color-mode` is optional: without it the stylesheet follows the operating system through
`prefers-color-scheme`, so "system" mode is the default and needs no resolved-value attribute.

The token package uses the standard layer model with a one-direction dependency chain
(`semantic → primitive`). A theme is **not** a layer and **not** a token namespace: it is a package
that overrides semantic tokens.

```text
primitive    raw palette / scales          --primitive-color-violet-600     (core package)
   │
semantic     intent tokens for product CSS --color-bg, --color-fg, ...      (core package, default theme)
   │
theme        semantic-token overrides      :root[data-theme="<id>"]         (theme package)
(component)  optional, separate package    --button-bg → var(--color-accent)
```

A theme package owns its own palette under the build-time `theme.*` namespace — those tokens are
resolved into the override values and never emitted as CSS custom properties, so a brand palette
cannot leak into product CSS or into the core `PrimitiveTokenName` union. The core package keeps
only the shared primitive scale (neutrals, status colors and the default violet accent).

Components only consume semantic tokens, so switching a theme just remaps CSS custom properties on
the root element — there is no component work and no re-render:

```html
<html data-theme="ocean" data-color-mode="dark"></html>
<!-- or, following the OS color mode: -->
<html data-theme="ocean"></html>
```

### Adding a theme

A theme is a package built with `@ezhana/theme-builder`; see
[ADR 0003](docs/adr/0003-themes-as-packages.md) for the architecture and
[`packages/theme-builder/README.md`](packages/theme-builder/README.md) for the config reference.

1. `pnpm add -D @ezhana/theme-builder` and `pnpm add @ezhana/design-tokens` in your theme package.
2. Declare `theme.config.mjs` (`id`, `label`, `tokens`, `overrides`, optional `fonts`).
3. Put the palette in `tokens/palette.json` (all tokens under `theme.*`) and the semantic overrides
   in `tokens/theme.json` (`base` + one section per color mode).
4. Run `buildTheme()`; the build fails with an actionable message when a required override is
   missing, a reference is unknown or WCAG AA contrast is not met.
5. Ship the generated `dist/`: `.` metadata, `./style`, `./theme.css`, `./standalone.css`, `./json`.

The two official themes are the worked examples:
[`design-theme-cerulean`](packages/design-theme-cerulean/README.md) (custom palette, Public Sans,
design narrative with measured contrast) and
[`design-theme-ocean`](packages/design-theme-ocean/README.md) (pill-shaped controls).

Adding a color mode means adding `tokens/semantic/<mode>.json` to the core package plus the mode
block in each theme; the build then lists exactly what is missing per file.

The component layer is intentionally absent: component tokens belong to a component API and are
better versioned as a separate package. The semantic layer is sufficient for business code that
combines headless components with token-based styles; see the
[component-layer guidance](packages/design-tokens/README.md#component-layer-optional).

See [`packages/design-tokens/README.md`](packages/design-tokens/README.md) for the full architecture,
naming rules and extension recipes, and [`docs/usage.md`](docs/usage.md) for the end-to-end usage
flow (build → app wiring → runtime lifecycle → extension).

### Theme switching runtime

The template apps use `@ezhana/theme`, which:

- reads and validates the persisted preference (`localStorage` key `ezhana-theme`);
- resolves `system` mode through `prefers-color-scheme` and listens for OS changes;
- applies `data-theme` immediately and `data-color-mode` only for explicit modes, so `system`
  mode is handled by CSS;
- synchronises across tabs through `storage` events;
- forgets nothing on reload, and degrades gracefully when storage is unavailable.

An inline classic script in each `index.html` resolves the stored preference before first paint, so
the correct theme is applied without a flash of the wrong theme.

## Template Distribution

This repository is the source/development monorepo. The public template repository is generated from
it: the `template/` skeleton supplies the workspace files, and the generator is published as
[`create-ezhana-app`](https://www.npmjs.com/package/create-ezhana-app) and pinned as an exact
devDependency (`create:app` → `create-ezhana-app`); no generator code is copied into the template.
Every `@ezhana/*` dependency is installed from npm instead of being linked from `packages/`. The
template keeps the `apps/` + optional `packages/` monorepo layout.

```bash
pnpm export:template --install          # generate dist-template/frontend-template
```

The generated repository is force-pushed by `.github/workflows/export-template.yml` after packages
are published. See [`docs/template-distribution.md`](docs/template-distribution.md) for the full
model, required GitHub variables/secrets, and the user-package workflow.

## Development Workflow

The repository uses a layered ESLint configuration model:

```text
@ezhana/eslint-config-base
            │
            ▼
@ezhana/eslint-config-typescript
            │
      ┌─────┴─────┐
      ▼           ▼
    Vue         React
```

This allows projects to opt into only the configuration they need.

For example:

```text
JavaScript
  → @ezhana/eslint-config-base

TypeScript
  → @ezhana/eslint-config-typescript

Vue
  → @ezhana/eslint-config-vue

React
  → @ezhana/eslint-config-react
```

Prettier is managed independently through:

```text
@ezhana/prettier-config
```

## Git Hooks

The repository uses:

- `simple-git-hooks`
- `lint-staged`

Before a commit, only staged files are processed.

The workflow is:

```text
git commit
    ↓
pre-commit
    ↓
lint-staged
    ├── Prettier
    └── ESLint
```

This keeps the local commit check fast while CI performs the complete repository validation.

## CI

GitHub Actions validates:

```text
format:check
lint
test
React/Vue generation matrix (create-app.yml)
```

The local equivalent of the source checks is:

```bash
pnpm check
```

## Versioning and Releases

Publishable packages are located under `packages/`.

The repository uses Changesets for package versioning:

```bash
pnpm changeset
```

Review pending releases:

```bash
pnpm changeset:status
```

Apply version changes:

```bash
pnpm changeset:version
```

Publish packages:

```bash
pnpm changeset:publish
```

The generated template apps and the root workspace are private and are not published as npm packages.

## Package Version Management

Core development tooling is managed through pnpm Catalog:

```yaml
catalog:
  eslint: ...
  prettier: ...
  typescript: ...
```

This keeps shared tooling versions consistent across the workspace.

Framework and build-tool versions such as Vue, React, Vite, `vue-tsc`, and framework-specific plugins are maintained by their respective templates.

## Design Principles

### Tokens flow in one direction

Semantic tokens reference primitive tokens, never the other way around. Themes only override semantic
tokens. Adding a theme or a color mode cannot break existing component CSS.

### Semantic tokens are the public API

Product code consumes intent-based semantic tokens (`--color-fg`, `--radius-control`) rather than
primitives (`--primitive-color-violet-600`), so palette and theme changes stay local to the token
package. Component tokens, when needed, live in a separate package built on semantic tokens only.

### Themes are data, switching is DOM state

A theme is a set of semantic-token overrides; switching is setting two attributes on the root
element. This works the same in React, Vue, static HTML and SSR, and it cannot create specificity
fights with component styles.

### Explicit dependencies

Each workspace package declares the dependencies it directly uses instead of relying on transitive dependencies.

### Layered configuration

Shared ESLint configurations are composed from small, focused layers rather than one large configuration package.

### Framework-specific ownership

Vue and React specific linting dependencies belong to their corresponding ESLint configuration packages.

### Templates remain lightweight

Application templates consume shared tooling instead of duplicating the implementation dependencies of those tools.

### Local checks and CI have different responsibilities

Local Git hooks prioritize fast feedback on changed files.

CI validates the complete workspace.

## License

MIT
