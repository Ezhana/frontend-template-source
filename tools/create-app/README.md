# create-ezhana-app

Scaffolds a React or Vue app inside an Ezhana `frontend-template` workspace. It wraps the official
`create-vite` / `create-vue` scaffolders and applies the `@ezhana` theme overlay.

The generated app keeps the official scaffold's own tooling. Lint and format configuration is
**opt-in**: use the `configure` subcommand on an existing app, or pass `--eslint` / `--prettier` when
creating one. The written configs are thin wrappers that compose the shared workspace config
packages (`@ezhana/eslint-config-<framework>` and `@ezhana/prettier-config`); the rules live in
those packages.

```bash
pnpm install
pnpm create:app                              # choose React or Vue, then enter an app name
pnpm create:app react my-app                 # no lint/format files are written
pnpm create:app react my-app --eslint --prettier
pnpm create:app configure apps/my-app --eslint --prettier
```

Apps are created under `apps/<name>` and become part of the pnpm workspace. Run create from the
workspace root; `--target <path>` generates somewhere else.

## Workspace requirement

The lint/format features compose workspace packages, so they only work when the app is inside a pnpm
workspace that ships them: the generated `frontend-template` repository or this source repository.
The command walks up from the target to find `pnpm-workspace.yaml` and verifies that the needed
config packages are members of that workspace. Outside such a workspace it stops with an error
before writing files.

`--target` outside the workspace therefore cannot be combined with `--eslint` / `--prettier`.

## Create options

| Option         | Effect                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| `--eslint`     | Write `eslint.config.mjs` and add the shared ESLint config package      |
| `--prettier`   | Write `prettier.config.mjs` / `.prettierignore` and the Prettier config |
| `--no-install` | scaffold + theme overlay + config files only (no dependency add)        |
| `--no-verify`  | add dependencies but skip lint/build verification                       |
| `--keep-temp`  | keep the staging directory when generation fails                        |
| `--target`     | explicit output path instead of `apps/<name>`                           |
| `--root`       | workspace root used for the default `apps/<name>` path                  |
| `--name`       | app directory name (alternative to the second positional argument)      |
| `--template`   | template name (alternative to the first positional argument)            |
| `--list`       | list available templates                                                |

## Configure an existing app

```bash
pnpm create:app configure apps/my-app --eslint --prettier
```

| Option              | Effect                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| `--target <path>`   | app directory (default: current directory)                              |
| `--template <name>` | framework override (`react`, `vue`); inferred from package.json         |
| `--eslint`          | write `eslint.config.mjs` and add the shared ESLint config package      |
| `--prettier`        | write `prettier.config.mjs` / `.prettierignore` and the Prettier config |
| `--no-install`      | write config files only; print the `pnpm add` command                   |

The written files contain no rules: `eslint.config.mjs` imports
`@ezhana/eslint-config-<framework>` (with an extension point for app overrides) and
`prettier.config.mjs` re-exports `@ezhana/prettier-config`. Dependencies are added with
`pnpm add -D`: the config packages as `workspace:*`, plus `eslint`/`typescript` (or `prettier`) at
the catalog versions from `versions.json` (pnpm may keep the scaffold's range operator for
`typescript`, e.g. `~6.0.2`).

`configure` overwrites the files it owns and adds dependencies. It deliberately does **not** inspect,
remove, or rewrite existing configuration, dependencies or scripts; no forward/backward compatibility
or migration logic is included. In particular:

- Oxlint files created by `create-vite` are left in place;
- `package.json` scripts are not changed, so `pnpm lint` may still run Oxlint. Update the scripts
  yourself if you want `pnpm lint` to use ESLint.

To change rules, edit the shared workspace packages
(`packages/eslint-config-*/index.js`, `packages/prettier-config/index.js`) or add app-level overrides
in the app config.

Templates are pinned in [`recipes/index.mjs`](./recipes/index.mjs) (`create-vite@9.3.3`,
`create-vue@3.24.0`). The ESLint framework plugins and `typescript-eslint` are dependencies of the
shared config packages, so they are not added to the app individually; `eslint`, `prettier` and
`typescript` are added at the catalog versions in `versions.json` (pnpm may keep the scaffold's range
operator for `typescript`, e.g. `~6.0.2`).

The published `@ezhana/*` versions used for the theme stack live in [`versions.json`](./versions.json),
which is regenerated from this repository's package manifests by `pnpm sync:create-app` (also run
automatically before publishing). The shared config packages are private, so they are not listed
there; the template export copies them into the template's `packages/`.

Requires Node.js 24 and pnpm 12, and network access for the first run (the official scaffolders and
the app dependencies are downloaded).

See [`docs/create-app.md`](../../docs/create-app.md) for the lifecycle, configure behavior and
maintenance rules.
