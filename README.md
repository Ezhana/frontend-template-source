# Frontend Template

A pnpm-based frontend monorepo providing reusable ESLint and Prettier configurations, plus Vue and React + Vite project templates.

## Features

- pnpm workspace monorepo
- Centralized dependency versions with pnpm Catalog
- ESLint 10 Flat Config
- TypeScript ESLint configuration
- Vue 3 ESLint configuration
- React ESLint configuration
- Shared Prettier configuration
- Layered design tokens (primitive → semantic, optional component layer) compiled with Style Dictionary
- Multi-theme switching (`data-theme` + optional `data-color-mode`) through semantic-token overrides
- Framework-agnostic theme runtime with persistence and system color-scheme support
- Token contract and WCAG AA contrast tests
- Vue + Vite + TypeScript template
- React + Vite + TypeScript template
- lint-staged with simple-git-hooks
- GitHub Actions CI
- Changesets for package versioning and releases

## Requirements

- Node.js 24 LTS
- pnpm 12

The repository pins the package manager in the root `package.json` and defines the supported Node.js version through `engines`.

## Repository Structure

```text
frontend-template/
├── apps/
│   ├── vue-vite/
│   └── react-vite/
│
├── packages/
│   ├── design-tokens/
│   ├── theme/
│   ├── eslint-config-base/
│   ├── eslint-config-typescript/
│   ├── eslint-config-vue/
│   ├── eslint-config-react/
│   └── prettier-config/
│
├── docs/
├── external/
├── scripts/
│
├── .changeset/
├── .github/
│   └── workflows/
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
into a single stylesheet of CSS custom properties, plus resolved theme JSON and typed ESM metadata.

Includes:

- primitive layer (`--primitive-*`: palette ramps, spacing, typography scales) — raw, never themed
- semantic layer (`--color-*`, `--font-*`, `--radius-*`, ...) — the public API for product code
- themes as semantic-token overrides: `default`, `cerulean` and `ocean` × `light` and `dark`
- theme-owned typography: `cerulean` ships Public Sans as a self-hosted variable font
- no component layer by design — optional separate package when a component system needs one
- theme design narratives under [`docs/themes/`](docs/themes/cerulean/DESIGN.md)
- build-time contract validation and WCAG AA contrast tests

Usage:

```ts
import '@ezhana/design-tokens/css/tokens.css'
import { themes, modes, themeLabels, modeLabels } from '@ezhana/design-tokens'
```

Build, test and full documentation:

```bash
pnpm --filter @ezhana/design-tokens build
pnpm --filter @ezhana/design-tokens test
```

See [`packages/design-tokens/README.md`](packages/design-tokens/README.md).

### Theme runtime

#### `@ezhana/theme`

Framework-agnostic theme state machine: theme selection, `light` / `dark` / `system` preference,
localStorage persistence, `prefers-color-scheme` tracking and cross-tab synchronisation. It applies
`data-theme` and (only for explicit modes) `data-color-mode` to the root element; the token
stylesheet does the rest.

Usage:

```ts
import { createThemeManager } from '@ezhana/theme'
import { themes, modes, defaultTheme } from '@ezhana/design-tokens'

export const themeManager = createThemeManager({
  themes: [...themes],
  modes: [...modes],
  defaultTheme,
})

themeManager.setMode('system') // follows the OS via CSS; no data-color-mode attribute
themeManager.subscribe((state) => console.log(state.resolvedMode))
```

See [`packages/theme/README.md`](packages/theme/README.md) for the API, SSR guidance and the
no-flash inline `<head>` script.

## Templates

### Vue + Vite

```text
apps/vue-vite
```

Stack:

- Vue 3
- Vite
- TypeScript
- ESLint
- Prettier
- `@ezhana/design-tokens` + `@ezhana/theme` (theme and color-mode switcher)

Run locally:

```bash
pnpm --filter @ezhana/template-vue-vite dev
```

Build:

```bash
pnpm --filter @ezhana/template-vue-vite build
```

### React + Vite

```text
apps/react-vite
```

Stack:

- React
- Vite
- TypeScript
- ESLint
- Prettier
- `@ezhana/design-tokens` + `@ezhana/theme` (theme and color-mode switcher)

Run locally:

```bash
pnpm --filter @ezhana/template-react-vite dev
```

Build:

```bash
pnpm --filter @ezhana/template-react-vite build
```

## Getting Started

Clone the repository and install dependencies:

```bash
pnpm install
```

The design token CSS is generated, not committed. Rebuild it explicitly with:

```bash
pnpm build:tokens
```

Both template apps also run that build automatically from their `predev` / `prebuild` hooks.

Run the complete validation:

```bash
pnpm check
```

This performs:

```text
format:check
lint
test
build:templates
```

Run linting:

```bash
pnpm lint
```

Automatically fix lint issues:

```bash
pnpm lint:fix
```

Check formatting:

```bash
pnpm format:check
```

Format the repository:

```bash
pnpm format
```

## Theming

Themes are modeled as two orthogonal axes instead of pre-composed theme names:

| axis  | attribute         | values                         | owner           |
| ----- | ----------------- | ------------------------------ | --------------- |
| theme | `data-theme`      | `default`, `cerulean`, `ocean` | visual identity |
| mode  | `data-color-mode` | `light`, `dark` (optional)     | color scheme    |

`data-color-mode` is optional: without it the stylesheet follows the operating system through
`prefers-color-scheme`, so "system" mode is the default and needs no resolved-value attribute.

The token package uses the standard layer model with a one-direction dependency chain
(`semantic → primitive`). A theme is **not** a layer: it is a set of semantic-token overrides.

```text
primitive   raw palette / scales          --primitive-color-violet-600
   │
semantic    intent tokens for product CSS --color-bg, --color-fg, --radius-control
   │
themes      semantic-token overrides      [data-theme] + optional [data-color-mode]
(component) optional, separate package    --button-bg → var(--color-accent)
```

Components only consume semantic tokens, so switching a theme just remaps CSS custom properties on
the root element — there is no component work, no re-render and no extra stylesheet:

```html
<html data-theme="ocean" data-color-mode="dark"></html>
<!-- or, following the OS color mode: -->
<html data-theme="ocean"></html>
```

Adding a theme means adding one override file (`packages/design-tokens/tokens/themes/<theme>.json`)
and running `pnpm build:tokens`; adding a color mode means adding one semantic token file plus the
mode block in each theme. In both cases the build fails with an actionable message when the theme
contract is incomplete, and `pnpm test` checks the contract plus WCAG AA contrast for every theme.

Each theme has its own design narrative; the Cerulean theme — derived from a
monochrome-blue/Public Sans design brief — is documented in
[`docs/themes/cerulean/DESIGN.md`](docs/themes/cerulean/DESIGN.md) and demonstrates the full
extension workflow (palette ramp, theme typeface, level-2 rounding, measured contrast table).

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
build:templates
```

The local equivalent is:

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

The `apps/` templates and the root workspace are private and are not published as npm packages.

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
