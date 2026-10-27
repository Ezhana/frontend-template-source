# Creating an app from external scaffolders

`tools/create-app` is a thin wrapper around the official framework scaffolders. It generates an app
with `create-vite` / `create-vue`, then applies the `@ezhana/*` configuration and theme overlay.

```bash
pnpm create:app
# select React or Vue, then enter the app name

pnpm create:app react my-react-app
pnpm create:app vue my-vue-app
```

Apps are created under `apps/<name>` by default. Use `--target <path>` to generate elsewhere.
The command requires network access (the external scaffolders are downloaded with `pnpm dlx`) and
Node.js 24 + pnpm 12.

## Lifecycle

```text
preflight → scaffold (external CLI, pinned version) → normalize → overlay → install → verify → move
```

1. **preflight**: resolve the template (interactive prompt or arguments) and the target
   (`apps/<name>` by default); the target directory must be empty.
2. **scaffold**: run the pinned external scaffolder in a staging directory next to the target.
   `create-vite@9.3.3` (`react-ts`) and `create-vue@3.24.0` (`--ts`) are pinned in
   [`recipes/`](../tools/create-app/recipes/index.mjs).
3. **normalize**:
   - remove generated lint/format configs and lockfiles, `node_modules`, `.git`;
   - remove generated ESLint/Prettier/Oxlint dependencies and scripts from `package.json`;
   - write the `@ezhana/*` dependencies, ESLint/Prettier dependencies and scripts.
4. **overlay**: copy `overlays/<framework>` into the app:
   - `eslint.config.mjs`, `prettier.config.mjs`, `.prettierignore`;
   - `src/theme/*` runtime integration;
   - `ThemeSwitcher` + `ThemeRoot` wrapper;
   - entry file with token/font imports;
   - theme init script in `index.html` (no flash of wrong theme).
5. **install**: one `pnpm install` after all package/config changes.
6. **verify**: `prettier --write`, `lint`, `build`.
7. Move the staging app to the target directory (only after a successful verification).

Options:

| Option         | Effect                                                             |
| -------------- | ------------------------------------------------------------------ |
| `--no-install` | scaffold + normalize + overlay only (useful for inspecting output) |
| `--no-verify`  | install dependencies but skip format/lint/build                    |
| `--keep-temp`  | keep the staging directory when generation fails                   |
| `--target`     | explicit output path instead of `apps/<name>`                      |
| `--root`       | workspace root used for the default `apps/<name>` path             |
| `--name`       | app directory name (alternative to the second positional argument) |
| `--list`       | list available templates                                           |

## Config detection and timing

External scaffolders do not expose reliable hooks, so this wrapper owns the lifecycle. The rules are:

- **Own the final configuration**: never merge generated ESLint/Prettier configs. Remove known
  generated config files and `package.json` fields/scripts, then write the overlay.
- **Known-file list, not heuristics**: see `GENERATED_CONFIG_FILES` in
  [`lib/create.mjs`](../tools/create-app/lib/create.mjs). If an external generator changes its output,
  the expected-entry check fails with the missing path.
- **Do package changes before installing** so there is exactly one install and the lockfile matches
  the final dependencies.
- **Pin the external scaffolders** and update recipes intentionally; see the CI matrix.

## Overlay maintenance

The overlays are small and shared by generated apps:

- `overlays/react` / `overlays/vue`: entry file, `ThemeRoot`, theme runtime files, theme switcher,
  ESLint/Prettier configs.

When `@ezhana/*` APIs change, update the overlay files and regenerate an app in CI. The source
repository no longer keeps sample apps; apps exist only after a user runs `pnpm create:app` (in the
generated template repository or locally).

## CI

`.github/workflows/create-app.yml` runs the generator matrix (React and Vue), installs the generated
app, then lints and builds it. External scaffolders are pinned, so a version bump is an explicit
recipe change and is covered by the same matrix.

## Relationship to `frontend-template`

`scripts/export-template.mjs` copies this tool (including `versions.json`) into the generated
`frontend-template` repository, exports an empty `apps/` placeholder, adds a root `create:app`
script and generates the root lockfile. The generated template therefore carries its own generator
and lets users choose a stack after cloning; no default apps are exported.

`versions.json` is generated from the source package versions by:

```bash
pnpm sync:create-app
```

Run it after bumping `@ezhana/*` versions. The export regenerates the manifest in the copied tool
from the same source data.
