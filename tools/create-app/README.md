# create-ezhana-app

Scaffolds a React or Vue app inside an Ezhana `frontend-template` workspace. It wraps the official
`create-vite` / `create-vue` scaffolders and applies the `@ezhana` theme overlay.

The generated app keeps the official scaffold's own tooling. Lint and format configuration is
**opt-in**: use the `configure` subcommand on an existing app, or pass `--eslint` / `--prettier` when
creating one. The generated configs are self-contained and do not import any `@ezhana` config package.

```bash
pnpm install
pnpm create:app                              # choose React or Vue, then enter an app name
pnpm create:app react my-app                 # no lint/format files are written
pnpm create:app react my-app --eslint --prettier
pnpm create:app configure apps/my-app --eslint --prettier
```

Apps are created under `apps/<name>` and become part of the pnpm workspace. Run create from the
workspace root; `--target <path>` generates somewhere else.

## Create options

| Option         | Effect                                                             |
| -------------- | ------------------------------------------------------------------ |
| `--eslint`     | Write the self-contained ESLint base and add its dependencies      |
| `--prettier`   | Write the self-contained Prettier base and add Prettier            |
| `--no-install` | scaffold + theme overlay + config files only (no dependency add)   |
| `--no-verify`  | add dependencies but skip lint/build verification                  |
| `--keep-temp`  | keep the staging directory when generation fails                   |
| `--target`     | explicit output path instead of `apps/<name>`                      |
| `--root`       | workspace root used for the default `apps/<name>` path             |
| `--name`       | app directory name (alternative to the second positional argument) |
| `--template`   | template name (alternative to the first positional argument)       |
| `--list`       | list available templates                                           |

## Configure an existing app

```bash
pnpm create:app configure apps/my-app --eslint --prettier
```

| Option              | Effect                                                           |
| ------------------- | ---------------------------------------------------------------- |
| `--target <path>`   | app directory (default: current directory)                       |
| `--template <name>` | framework override (`react`, `vue`); inferred from package.json  |
| `--eslint`          | write `eslint.config.mjs` and add the ESLint dependencies        |
| `--prettier`        | write `prettier.config.mjs` / `.prettierignore` and add Prettier |
| `--no-install`      | write config files only; print the `pnpm add` command            |

`configure` overwrites the files it owns and adds dependencies with `pnpm add -D`. It deliberately
does **not** inspect, remove, or rewrite existing configuration, dependencies or scripts; no
forward/backward compatibility or migration logic is included. In particular:

- Oxlint files created by `create-vite` are left in place;
- `package.json` scripts are not changed, so `pnpm lint` may still run Oxlint. Update the scripts
  yourself if you want `pnpm lint` to use ESLint.

Templates are pinned in [`recipes/index.mjs`](./recipes/index.mjs) (`create-vite@9.3.3`,
`create-vue@3.24.0`). App config versions — `eslint`, `prettier`, `typescript`, the shared base
dependencies and the framework plugins — are pinned in the workspace catalog and in
[`recipes/index.mjs`](./recipes/index.mjs).

The `@ezhana/*` versions used for the theme stack live in [`versions.json`](./versions.json), which is
regenerated from this repository's package manifests by `pnpm sync:create-app` (also run
automatically before publishing). Internal config packages are private and therefore excluded from
`versions.json`.

Requires Node.js 24 and pnpm 12, and network access for the first run (the official scaffolders and
the app dependencies are downloaded).

See [`docs/create-app.md`](../../docs/create-app.md) for the lifecycle, configure behavior and
maintenance rules.
