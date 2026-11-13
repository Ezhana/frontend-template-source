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

# write root-level ESLint/Prettier configs that compose the shared packages
pnpm create:app next my-app --defaults --eslint --prettier

# inject a theme package's style.css into the app's global CSS
pnpm create:app next my-app --defaults --theme ocean

# or configure an existing app later
pnpm create:app configure apps/my-app --eslint --prettier
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

The lint/format rules live in the shared workspace packages under `packages/`:

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

The root `eslint.config.mjs` imports `@ezhana/eslint-config-base` and the root
`prettier.config.mjs` re-exports `@ezhana/prettier-config`, so a rule change in `packages/` applies
to the workspace root.

By default `create:app` leaves the scaffold's tooling untouched. To write the shared config into an
app, either pass `--eslint` / `--prettier` when creating it or run:

```bash
pnpm create:app configure apps/my-app --eslint --prettier
```

The tool writes `eslint.config.mjs` and `prettier.config.mjs` at the app root, imports the
framework-mapped config package, and adds the packages as `workspace:*` dependencies. Astro and
SvelteKit also get their Prettier plugins. It does not delete scaffold configuration or rewrite
`package.json` scripts; update those yourself if you want `pnpm lint` to use ESLint.

Change rules for every app in the matching `packages/eslint-config-*/index.js` (or
`packages/prettier-config/index.js`), or add overrides in the individual app config.

## Packages

`packages/` contains the shared lint/format config packages (the nine config packages described
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
