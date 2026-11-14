# Template distribution: source repository → generated template repository

This repository is the **source/development monorepo**. It contains the `@ezhana/*` package sources
(core design tokens, official theme packages, the theme builder, the theme runtime and the shared
ESLint/Prettier config packages), the framework dispatcher (`tools/create-app`, published as
`create-ezhana-app`) and the template skeleton. Applications are generated on demand; no full sample
apps are committed.

The public **template repository** (the one users click "Use this template" on) is generated from
this repository. It keeps the monorepo layout (`apps/` + `packages/`), but it ships neither the
config packages nor the generator: both are consumed from npm. Its `packages/` directory is reserved
for the user's own workspace packages.

## Direction

The template uses a generator-first workflow: it ships no default apps; after cloning, users run
`pnpm install` and then `pnpm create:app` and choose a framework. The generator is a **published npm
package**, pinned as an exact devDependency, not a copy in the template repository — see
[ADR 0002](adr/0002-distribute-create-app-via-npm.md). The shared lint/format rules are **published
npm packages** as well — see [ADR 0007](adr/0007-publish-shared-configs.md).

## Repository roles

| Repository                                    | Contains                                                                                                   | Dependency strategy                                                     | GitHub Template |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------- |
| this repo (`frontend-template-source`)        | `packages/*` + `tools/create-app` + `template/` + changesets                                               | `workspace:*` / `workspace:^` for `@ezhana/*`; local packages preferred | No              |
| generated template repo (`frontend-template`) | empty `apps/` + pinned `create-ezhana-app` + npm devDependencies on the shared configs + spare `packages/` | npm semver ranges for every `@ezhana/*` package                         | Yes             |

Both repositories are pnpm monorepos. The generated template starts without apps; the user chooses
Next.js, Vue, Astro, Nuxt or SvelteKit with `pnpm create:app`, and can create multiple apps in the
same workspace.

## What the generated template contains

```text
frontend-template/
├── apps/
│   └── README.md                # empty; pnpm create:app will add apps/<name>
├── packages/
│   └── README.md                # spare space for your own workspace packages
├── .github/workflows/ci.yml     # validate + create:app matrix
├── eslint.config.mjs            # composes @ezhana/eslint-config-base from npm
├── prettier.config.mjs          # re-exports @ezhana/prettier-config from npm
├── lint-staged.config.mjs
├── pnpm-workspace.yaml          # apps/*, packages/*, catalog
├── package.json                 # create:app (published generator) + config npm devDependencies
├── pnpm-lock.yaml               # includes the pinned generator and config package versions
├── README.md
└── README.zh-CN.md
```

The generator is **not** vendored: the root `package.json` pins the published `create-ezhana-app`
package in `devDependencies` and routes `create:app` to its bin. `pnpm install` therefore installs
the generator together with the root tooling, and `pnpm-lock.yaml` covers it.

The exported root `package.json` has:

- devDependencies on the published config packages (`@ezhana/eslint-config-base` and
  `@ezhana/prettier-config`, both `^<version>`) plus `eslint`, `prettier` and `typescript` from the
  catalog, and the pinned `lint-staged` / `simple-git-hooks`;
- an exact `create-ezhana-app` devDependency (the version published for this template snapshot);
- `create:app`, `dev`, `build:packages`, `build:apps`, `build`, `lint` and `check` scripts;
- no changeset scripts or publishing configuration.

`packages/` contains only `README.md`; no config package sources are copied. Rule updates reach
users by bumping the `@ezhana/*` dependencies (or by adding overrides in the root/app config).

## Generator behavior

`pnpm create:app` dispatches to the official scaffolders. The framework registry lives in
`tools/create-app/lib/registry.mjs` and maps each framework to:

- the published CLI package and argument layout;
- `interactiveFlags` used when the official CLI should prompt;
- `defaultFlags` used by `--defaults`;
- the published ESLint config package used by `--eslint`;
- the Prettier plugins added by `--prettier`.

The generator patches `name`/`private`, removes generated lockfiles, `node_modules`, `.git` and
`pnpm-workspace.yaml`, moves the app to `apps/<name>`, optionally injects a theme CSS `@import` into
a conventional global CSS file, installs dependencies, optionally writes app-level
`eslint.config.mjs` / `prettier.config.mjs`, and verifies lint/build.

There is no theme overlay, switcher, theme runtime or anti-flash script in generated apps. The
`--theme` flag is a minimal CSS integration: it finds a global CSS file from a fixed candidate list,
prepends `@import '<theme-package>/style.css'`, and adds the package; if no candidate exists it warns
and skips the theme.

Lint/format configuration is opt-in and always written at the app root. `--eslint` imports the
framework-mapped `@ezhana/eslint-config-*` package; `--prettier` re-exports
`@ezhana/prettier-config` and enables the registry's plugins (`prettier-plugin-astro`,
`prettier-plugin-svelte`). Both are added with `pnpm add -D` at `^<version>` from `versions.json`,
not as workspace dependencies. The generated configs use ESLint's `defineConfig` helper and a normal
ESM import; the rules live only in `packages/` in this source repository.

## Export

```bash
pnpm export:template --install
```

The export copies the `template/` skeleton, writes the root manifest with the pinned
`create-ezhana-app` version and semver devDependencies on `@ezhana/eslint-config-base` /
`@ezhana/prettier-config`, and never copies `tools/` or the config package directories. It validates
that:

- the root manifest has no `workspace:` dependencies and pins both root config packages at
  `^<source version>`;
- `create:app` points at the published package with an exact version;
- `apps/` is empty, `packages/` contains no package directories, and `tools/` is absent;
- the root configs import the published packages instead of copying rules;
- the generated `pnpm-workspace.yaml` omits the source-only tools glob.

`--install` runs `pnpm install --lockfile-only` in the generated directory. Run it after the
`@ezhana` config/theme/token versions and the `create-ezhana-app` version exist on npm.

## CI

The source repository CI runs `format:check`, `lint`, tests, the consumer verification and the
create-app matrix. The template repository CI runs install/check plus its own `create:app` smoke
tests. The source matrix lives in `.github/workflows/create-app.yml` and covers:

- `--defaults` for Next.js, Vue, Astro, Nuxt and SvelteKit;
- `--defaults --eslint --prettier` for all five;
- `--defaults --theme ocean` for Next.js and `--defaults --theme cerulean` for Vue.

In the source repository, the generator passes pnpm's prefer/link-workspace-packages flags for the
config install, so an app's `^<version>` config dependency links the local workspace package and the
matrix tests the current rules before a release. Those flags are scoped to the config install; theme
packages and scaffold dependencies still come from the registry. In the template repository, the
configured matrix installs the published packages and runs the generator's ESLint and build
verification. The export workflow verifies that every config version referenced by the template
exists on npm before exporting.

Interactive mode is not exercised in CI because GitHub Actions has no TTY.

## Release order

1. `@ezhana/design-tokens`
2. official theme packages (`@ezhana/design-theme-*`)
3. `@ezhana/typography-editorial` and `@ezhana/theme`
4. the nine shared lint/format config packages (`@ezhana/eslint-config-*`,
   `@ezhana/prettier-config`)
5. `create-ezhana-app`
6. export/push the template

The template pins published versions; a generated app's theme dependency is resolved from
`tools/create-app/versions.json`, which is regenerated from non-private package manifests by
`pnpm sync:create-app`. The config packages are included in `versions.json` now that they are
public.

## Shared config packages

The lint/format config packages are public shared packages, versioned with Changesets:

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

The framework-to-package mapping lives in `tools/create-app/lib/registry.mjs`; do not duplicate it in
the template. Edit rules in `packages/eslint-config-*/index.js` or `packages/prettier-config/index.js`,
add a Changeset, publish, then re-export the template with the new dependency versions.
