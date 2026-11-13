# Template distribution: source repository → generated template repository

This repository is the **source/development monorepo**. It contains the `@ezhana/*` package sources
(core design tokens, official theme packages, the theme builder, the theme runtime and the shared
ESLint/Prettier config packages), the framework dispatcher (`tools/create-app`, published as
`create-ezhana-app`) and the template skeleton. Applications are generated on demand; no full sample
apps are committed.

The public **template repository** (the one users click "Use this template" on) is generated from
this repository. It keeps the monorepo layout (`apps/` + `packages/`) and **ships the nine shared
config packages under `packages/` as workspace source**; the published `@ezhana` token and theme
packages are installed from npm when an app asks for them.

## Direction

The template uses a generator-first workflow: it ships no default apps; after cloning, users run
`pnpm install` and then `pnpm create:app` and choose a framework. The generator is a **published npm
package**, pinned as an exact devDependency, not a copy in the template repository — see
[ADR 0002](adr/0002-distribute-create-app-via-npm.md). [ADR 0001](adr/0001-create-app-in-template-repo.md)
still governs the in-repo workflow and the repository-patch rules.

## Repository roles

| Repository                                    | Contains                                                                                                        | Dependency strategy                                                         | GitHub Template |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------- |
| this repo (`frontend-template-source`)        | `packages/*` + `tools/create-app` + `template/` + changesets                                                    | `workspace:*` for `@ezhana/*`                                               | No              |
| generated template repo (`frontend-template`) | empty `apps/` + pinned `create-ezhana-app` + `packages/` with the nine config packages (plus your own packages) | `workspace:*` for config packages; npm semver ranges for `@ezhana/*` themes | Yes             |

Both repositories are pnpm monorepos. The generated template starts without apps; the user chooses
Next.js, Vue, Astro, Nuxt or SvelteKit with `pnpm create:app`, and can create multiple apps in the
same workspace.

## What the generated template contains

```text
frontend-template/
├── apps/
│   └── README.md                # empty; pnpm create:app will add apps/<name>
├── packages/
│   ├── README.md                # how to edit the shared config packages, add your own
│   ├── eslint-config-base/      # shared ESLint rules, composed by the root config
│   ├── eslint-config-typescript/
│   ├── eslint-config-react/     # used by the Next.js config
│   ├── eslint-config-vue/
│   ├── eslint-config-astro/
│   ├── eslint-config-next/
│   ├── eslint-config-nuxt/
│   ├── eslint-config-svelte/
│   └── prettier-config/         # shared Prettier options
├── .github/workflows/ci.yml     # validate + create:app matrix
├── eslint.config.mjs            # composes @ezhana/eslint-config-base
├── prettier.config.mjs          # re-exports @ezhana/prettier-config
├── lint-staged.config.mjs
├── pnpm-workspace.yaml          # apps/*, packages/*, catalog
├── package.json                 # create:app (published generator) + workspace config packages
├── pnpm-lock.yaml               # includes the pinned create-ezhana-app version
├── README.md
└── README.zh-CN.md
```

The generator is **not** vendored: the root `package.json` pins the published `create-ezhana-app`
package in `devDependencies` and routes `create:app` to its bin. `pnpm install` therefore installs
the generator together with the root tooling, and `pnpm-lock.yaml` covers it.

The nine config packages are copied from this repository by the export, so they are the only
`@ezhana` source code in the generated template. They are workspace packages, not npm dependencies.

The generated root `package.json` has:

- devDependencies on the shared config packages (`@ezhana/eslint-config-base` and
  `@ezhana/prettier-config`, both `workspace:*`) plus `eslint`, `prettier` and `typescript` from the
  catalog, and the pinned `lint-staged` / `simple-git-hooks`;
- an exact `create-ezhana-app` devDependency (the version published for this template snapshot);
- `create:app`, `dev`, `build:packages`, `build:apps`, `build`, `lint` and `check` scripts;
- no changeset scripts or publishing configuration.

## Generator behavior

`pnpm create:app` dispatches to the official scaffolders. The framework registry lives in
`tools/create-app/lib/registry.mjs` and maps each framework to:

- the published CLI package and argument layout;
- `interactiveFlags` used when the official CLI should prompt;
- `defaultFlags` used by `--defaults`;
- the workspace ESLint config package used by `--eslint`;
- the Prettier plugins added by `--prettier`;
- a `package.json` detector used by `configure`.

The generator patches `name`/`private`, removes generated lockfiles, `node_modules`, `.git` and
`pnpm-workspace.yaml`, moves the app to `apps/<name>`, optionally injects a theme CSS `@import` into
a conventional global CSS file, installs dependencies, optionally writes root `eslint.config.mjs` /
`prettier.config.mjs`, and verifies lint/build.

There is no theme overlay, switcher, theme runtime or anti-flash script in generated apps. The
`--theme` flag is a minimal CSS integration: it finds a global CSS file from a fixed candidate list,
prepends `@import '<theme-package>/style.css'`, and adds the package; if no candidate exists it warns
and skips the theme.

Lint/format configuration is opt-in and always written at the app root. `--eslint` imports the
framework-mapped `@ezhana/eslint-config-*` package; `--prettier` re-exports
`@ezhana/prettier-config` and enables the registry's plugins (`prettier-plugin-astro`,
`prettier-plugin-svelte`). The actual rules live only in `packages/` and are copied into the
template.

## Export

```bash
pnpm export:template --install
```

The export copies the `template/` skeleton, copies the nine config package directories from
`packages/`, writes the root manifest with the pinned `create-ezhana-app` version and the `create:app`
script, and never copies `tools/`. It validates that:

- only the shared config packages use `workspace:` dependencies — checked in the root manifest and
  in each copied package;
- all nine config package directories are present under `packages/` with their manifest and
  `index.js`;
- `apps/` is empty, the `create:app` script points at the published package with an exact version,
  and `tools/` is absent;
- the root configs compose the shared packages instead of copying rules.

`--install` runs `pnpm install --lockfile-only` in the generated directory. Run it after the
`@ezhana` theme/token versions and the `create-ezhana-app` version exist on npm. The `workspace:*`
config packages link locally, so they do not need to be published.

## CI

The source repository CI runs `format:check`, `lint`, tests, the consumer verification and the
create-app matrix. The template repository CI runs install/check plus its own `create:app` smoke
tests. The source matrix lives in `.github/workflows/create-app.yml` and covers:

- `--defaults` for Next.js, Vue, Astro, Nuxt and SvelteKit;
- `--defaults --eslint --prettier` for all five;
- `--defaults --theme ocean` for Next.js and `--defaults --theme cerulean` for Vue.

Interactive mode is not exercised in CI because GitHub Actions has no TTY.

## Release order

1. `@ezhana/design-tokens`
2. official theme packages (`@ezhana/design-theme-*`)
3. `@ezhana/typography-editorial` and `@ezhana/theme`
4. `create-ezhana-app`
5. export/push the template

The template pins published versions; a generated app's theme dependency is resolved from
`tools/create-app/versions.json`, which is regenerated from non-private package manifests by
`pnpm sync:create-app`.

## Shared config packages

The lint/format config packages are shared workspace source: private, not published, and copied into
the generated template. The package set is:

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

The framework-to-package mapping lives in `tools/create-app/lib/registry.mjs`; do not duplicate it in
the template. Edit rules in `packages/eslint-config-*/index.js` or
`packages/prettier-config/index.js` and re-export the template.
