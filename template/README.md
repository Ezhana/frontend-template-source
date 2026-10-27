# Frontend Monorepo Template

English | [简体中文](./README.zh-CN.md)

A pnpm monorepo starter with two application templates and an optional place for your own shared
packages.

- `apps/react-vite` — React + TypeScript + Vite
- `apps/vue-vite` — Vue 3 + TypeScript + Vite
- `packages/` — **optional** workspace directory for packages you develop yourself
- Shared tooling from npm: `@ezhana/eslint-config-*`, `@ezhana/prettier-config`
- Theming from npm: `@ezhana/design-tokens` + `@ezhana/theme`

You can keep both applications or delete the one you do not use. Both share the same root tooling,
linting and CI configuration.

## Requirements

- Node.js 24
- pnpm 12

## Getting started

```bash
pnpm install
pnpm dev:react      # or: pnpm dev:vue
```

Build, lint and format:

```bash
pnpm build          # builds packages/* (if any), then both apps
pnpm build:apps     # only the apps
pnpm build:packages # only packages/*
pnpm lint
pnpm format
pnpm check          # format:check + lint + build
```

Each app can also be run directly:

```bash
pnpm --dir apps/react-vite dev
pnpm --dir apps/vue-vite dev
```

## Packages (optional)

The `packages/` directory is intentionally kept as a workspace location for your own shared
packages. It only contains a `README.md` placeholder — no example package. **If you do not need
shared packages, you can delete the `packages/` directory and remove the `build:packages` script
from the root `package.json`.**

To add a package, create `packages/<your-package>` with a `package.json`, `src/` and a build script,
then add it to an app with `"workspace:*"`. See [`packages/README.md`](packages/README.md) for the
recommended setup and conventions.

The `@ezhana/*` packages are regular npm dependencies, not linked workspace sources. This keeps the
template small and lets you upgrade tooling and theming independently.

## Theming

The apps consume published design tokens and the theme runtime from npm. The generated CSS custom
properties are imported in each app entry file; no local token build step is required.

- The color mode follows the operating system by default (`prefers-color-scheme`).
- `data-theme` selects the theme; `data-color-mode` is written only for an explicit color mode.
- A theme switcher is included in both apps.

See the npm package documentation for the token contract, theme extension and the runtime API:

- [`@ezhana/design-tokens`](https://www.npmjs.com/package/@ezhana/design-tokens) — token layers,
  themes, CSS variables and design narratives
- [`@ezhana/theme`](https://www.npmjs.com/package/@ezhana/theme) — theme/color-mode state machine

If you need to change token values or add a new theme, fork the design-tokens library; otherwise you
can override semantic CSS variables from application CSS as documented in the package README.

## CI

`.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`
and `pnpm build` on every push and pull request.

## License

MIT
