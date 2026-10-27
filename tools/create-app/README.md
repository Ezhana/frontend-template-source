# create-ezhana-app

Scaffolds a React or Vue app inside an Ezhana `frontend-template` workspace. It wraps the official
`create-vite` / `create-vue` scaffolders, applies the `@ezhana/*` ESLint, Prettier and theme overlay,
then installs and verifies the generated app.

The generated template repository depends on this package and exposes it as `pnpm create:app`:

```bash
pnpm install
pnpm create:app            # choose React or Vue, then enter an app name
pnpm create:app react my-app
pnpm create:app vue my-app
```

Apps are created under `apps/<name>` and become part of the pnpm workspace. Run the command from the
workspace root; `--target <path>` generates somewhere else.

## Options

| Option         | Effect                                                             |
| -------------- | ------------------------------------------------------------------ |
| `--no-install` | scaffold + normalize + overlay only (useful for inspecting output) |
| `--no-verify`  | install dependencies but skip format/lint/build                    |
| `--keep-temp`  | keep the staging directory when generation fails                   |
| `--target`     | explicit output path instead of `apps/<name>`                      |
| `--root`       | workspace root used for the default `apps/<name>` path             |
| `--name`       | app directory name (alternative to the second positional argument) |
| `--template`   | template name (alternative to the first positional argument)       |
| `--list`       | list available templates                                           |

Templates are pinned in [`recipes/index.mjs`](./recipes/index.mjs) (`create-vite@9.3.3`,
`create-vue@3.24.0`). The `@ezhana/*` versions written into generated apps live in
[`versions.json`](./versions.json), which is regenerated from this repository's package manifests by
`pnpm sync:create-app` (also run automatically before publishing).

Requires Node.js 24 and pnpm 12, and network access for the first run (the official scaffolders and
the app dependencies are downloaded).

See [`docs/create-app.md`](../../docs/create-app.md) for the lifecycle and overlay maintenance rules.
