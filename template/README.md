# Frontend Monorepo Template

English | [简体中文](./README.zh-CN.md)

A pnpm workspace starter generated from `frontend-template-source`. This repository intentionally
ships **no application by default**: after cloning or using **Use this template**, choose a framework
with one command.

```bash
pnpm create:app
```

The command dispatches to the official scaffolder for Next.js, Vue, Astro, Nuxt or SvelteKit. It is
interactive by default; pass `--defaults` for the registry defaults in CI. The generated app is
placed under `apps/<name>` and becomes part of the pnpm workspace. The generator itself is the
published `create-ezhana-app` package, pinned as a regular devDependency.

Non-interactive usage:

```bash
pnpm create:app next my-app --defaults
pnpm create:app vue my-app --defaults
pnpm create:app astro my-app --defaults
pnpm create:app nuxt my-app --defaults
pnpm create:app sveltekit my-app --defaults

# write ESLint/Prettier configs that compose the published shared packages
pnpm create:app next my-app --defaults --eslint --prettier

# inject a theme package's style.css into the app's global CSS
pnpm create:app next my-app --defaults --theme ocean
```

Generated apps keep the official scaffold's own tooling unless you ask for the shared lint/format
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
pnpm install
pnpm create:app       # choose a framework, then answer the official CLI prompts
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

The lint/format rules live in published npm packages:

```text
@ezhana/eslint-config-base
@ezhana/eslint-config-typescript
@ezhana/eslint-config-react
@ezhana/eslint-config-vue
@ezhana/eslint-config-astro
@ezhana/eslint-config-next
@ezhana/eslint-config-nuxt
@ezhana/eslint-config-svelte
@ezhana/prettier-config
```

The root `eslint.config.mjs` composes `@ezhana/eslint-config-base` and the root
`prettier.config.mjs` re-exports `@ezhana/prettier-config`; both are regular devDependencies. Update
those dependencies to get rule changes, or add workspace-wide overrides in the root config files.

By default `create:app` leaves the scaffold's tooling untouched. Pass `--eslint` / `--prettier` when
creating an app to write the shared config. There is no separate command for existing apps.

The flags write `eslint.config.mjs` and `prettier.config.mjs` at the app root, import the
framework-mapped config package, and add it (plus `@ezhana/prettier-config`) as a normal `^<version>`
devDependency. Astro and SvelteKit also get their Prettier plugins. The plugins are imported as
modules in the app's `prettier.config.mjs`, so Prettier loads them from the app regardless of the
working directory — including the root `format` script and the pre-commit hook, which run from the
workspace root. It does not delete scaffold configuration or rewrite `package.json` scripts; update
those yourself if you want `pnpm lint` to use ESLint.

Add app-specific overrides in the app config, or workspace-wide overrides in the root config. The
shared rules themselves live in the published packages, not in this repository.

## Packages

`packages/` is for your own workspace packages; the template ships none. The shared lint/format
configs are npm devDependencies, not workspace packages, so there is nothing to copy or keep in
sync.

Add your own shared packages:

- create `packages/<name>` with a `package.json`, `src/` and a build script;
- reference it from an app with `"workspace:*"`;
- run `pnpm build:packages` before `pnpm build`.

See [`packages/README.md`](packages/README.md).

The published `@ezhana/*` config, theme and token packages are regular npm dependencies, not linked
workspace sources.

## Themes

`create:app --theme <name>` is a CSS-only integration. It searches a fixed list of global CSS files
(preferring `src/styles/global.css`), prepends `@import '<theme-package>/style.css'`, and adds the
theme package. If no global CSS file is found, it warns and skips the theme.

There is no theme switcher, runtime, anti-flash script or framework-specific overlay in generated
apps. The design-system packages remain available for manual use:

- `@ezhana/design-tokens` — core tokens, semantic contract, default theme and complete stylesheet;
- `@ezhana/design-theme-*` — self-contained CSS presets;
- `@ezhana/theme` — optional runtime for apps that implement their own switcher;
- `@ezhana/typography-editorial` — optional CSS-only long-form typography preset.

See the source repository's [`docs/usage.md`](https://github.com/Ezhana/frontend-template-source/blob/main/docs/usage.md)
for the consumer guide.

## Commit hooks and CI

The root `lint-staged.config.mjs` and `simple-git-hooks` configuration run Prettier/ESLint on staged
files. CI validates formatting, linting and the build, and the create-app matrix exercises the
published generator.
