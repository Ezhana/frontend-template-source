# Frontend Monorepo Template

English | [简体中文](./README.zh-CN.md)

A pnpm workspace starter generated from `frontend-template-source`. This repository intentionally
ships **no application by default**: after cloning or using **Use this template**, choose React or
Vue with one command.

```bash
pnpm create:app
```

The command prompts for the framework and app name, scaffolds with the official
`create-vite` / `create-vue` version, applies the `@ezhana/*` ESLint, Prettier and theme integration,
then installs the app under `apps/<name>`. The generator itself is the published
`create-ezhana-app` package, pinned as a regular devDependency, so it is versioned and audited
together with the rest of the workspace tooling. Non-interactive usage:

```bash
pnpm create:app react my-app
pnpm create:app vue my-app
```

Generated apps share the root tooling, linting, commit hooks and CI configuration.

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

## Packages (optional)

`packages/` is an optional placeholder for your own shared packages. It contains only a `README.md`.
**If you do not need shared packages, delete the `packages/` directory and remove the
`build:packages` script from the root `package.json`.** See [`packages/README.md`](packages/README.md).

The `@ezhana/*` packages are regular npm dependencies, not linked workspace sources.

## Theming

Generated apps consume published design tokens and the theme runtime from npm. The generated CSS
custom properties are imported in each app entry file; no local token build step is required.

- The color mode follows the operating system by default (`prefers-color-scheme`).
- `data-theme` selects the theme; `data-color-mode` is written only for an explicit color mode.
- A theme switcher is generated into both React and Vue apps.

See the npm package documentation for the token contract and runtime API:

- [`@ezhana/design-tokens`](https://www.npmjs.com/package/@ezhana/design-tokens)
- [`@ezhana/theme`](https://www.npmjs.com/package/@ezhana/theme)

## CI

`.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`
and `pnpm build` on every push and pull request. With no apps yet, the app steps are no-ops.

## License

MIT
