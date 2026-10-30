# Creating an app from external scaffolders

`tools/create-app` is a thin wrapper around the official framework scaffolders. It generates an app
with `create-vite` / `create-vue`, then applies the `@ezhana/*` configuration and theme overlay. The
same code is published as [`create-ezhana-app`](https://www.npmjs.com/package/create-ezhana-app) and
pinned by the generated template; this repository runs it from `tools/create-app` directly.

```bash
pnpm create:app
# select React or Vue, then enter the app name

pnpm create:app react my-react-app
pnpm create:app vue my-vue-app
```

Apps are created under `apps/<name>` by default. Use `--target <path>` to generate elsewhere.
The command requires network access (the external scaffolders are downloaded with `pnpm dlx`) and
Node.js 24 + pnpm 12. In the generated template, run `pnpm install` once first: it installs the
pinned `create-ezhana-app` devDependency.

## Lifecycle

```text
preflight → scaffold (external CLI, pinned version) → normalize → overlay → move → install → verify
```

1. **preflight**: resolve the template (interactive prompt or arguments) and the target
   (`apps/<name>` by default); the target directory must be empty.
2. **scaffold**: run the pinned external scaffolder in a staging directory next to the target.
   `create-vite@9.3.3` (`react-ts`) and `create-vue@3.24.0` (`--ts`) are pinned in
   [`recipes/`](../tools/create-app/recipes/index.mjs).
3. **normalize**:
   - remove generated lint/format configs and lockfiles, `node_modules`, `.git`;
   - remove generated ESLint/Prettier/Oxlint dependencies and scripts from `package.json`;
   - write the `@ezhana/*` dependencies from `versions.json` (`@ezhana/design-tokens`,
     `@ezhana/theme`, `@ezhana/design-theme-cerulean`, `@ezhana/design-theme-ocean`), the
     ESLint/Prettier dependencies and the scripts.
4. **overlay**: copy `overlays/<framework>` into the app:
   - `eslint.config.mjs`, `prettier.config.mjs`, `.prettierignore`;
   - `src/theme/*` runtime integration (`registry.ts`, `manager.ts`, `useTheme.ts`);
   - `ThemeSwitcher` + `ThemeRoot` wrapper;
   - entry file importing the core tokens CSS and each theme package's `./style` entry;
   - theme init script in `index.html` (no flash of wrong theme).
5. **move**: rename the staging app to the target. This happens _before_ install on purpose: inside
   the template workspace the app has to exist at `apps/<name>` when pnpm resolves the workspace.
6. **install**: one `pnpm install` after all package/config changes.
7. **verify**: `prettier --write`, `lint`, `build`.

If install or verification fails, the moved app is removed again so the command can be retried
against an empty target (`--keep-temp` skips both the cleanup and the staging cleanup).

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

## Theme packages

Themes are consumed as standalone packages, per
[ADR 0003](adr/0003-themes-as-packages.md). The generator injects `@ezhana/design-tokens`,
`@ezhana/theme`, `@ezhana/design-theme-cerulean` and `@ezhana/design-theme-ocean`; versions come from
`versions.json`, so theme packages release independently of the core token package.

The app owns its theme set: `src/theme/registry.ts` calls
`defineThemeRegistry([defaultThemeDefinition, ...themeDefinitions])` and derives
`AppTheme = (typeof themeRegistry.themes)[number]`; `manager.ts` and the switcher read from that
registry, so they can never drift from the installed theme packages. Theme packages own their
palette, fonts and CSS overrides — the app neither imports `@fontsource-*` directly nor contains any
theme-specific token — and each package's `./style` entry pulls in the core stylesheet, the theme's
fonts if any and its overrides.

To change the default theme set, update both overlays (registry array + entry-file `./style` imports)
and the injected dependency list in [`lib/create.mjs`](../tools/create-app/lib/create.mjs). Adding a
theme in a generated app only needs `pnpm --filter ./apps/<name> add <theme-package>`, its stylesheet
import and one entry in `src/theme/registry.ts`.

## CI

`.github/workflows/create-app.yml` runs the generator matrix (React and Vue), installs the generated
app, then lints and builds it. It also packs the tarball and checks the published file set, so the
package layout cannot break silently. External scaffolders are pinned, so a version bump is an
explicit recipe change and is covered by the same matrix.

## Distribution

The tool is published as the [`create-ezhana-app`](https://www.npmjs.com/package/create-ezhana-app)
npm package; see [ADR 0002](adr/0002-distribute-create-app-via-npm.md). The generated
`frontend-template` repository depends on it as an exact devDependency and exposes it as
`pnpm create:app`:

```json
{
  "devDependencies": {
    "create-ezhana-app": "<version>"
  },
  "scripts": {
    "create:app": "create-ezhana-app"
  }
}
```

`scripts/export-template.mjs` reads the version from `tools/create-app/package.json`, injects the
devDependency and script, and never copies the tool into the template. Users run `pnpm install` once
before the command, which puts the pinned generator (and its integrity) in the template's
`pnpm-lock.yaml`. The package, not the template snapshot, is versioned and audited.

`versions.json` is regenerated from the source package manifests under `packages/` (core tokens,
official theme packages, ESLint/Prettier configs) plus the workspace catalog, by the package's
`prepack` hook (and manually with `pnpm sync:create-app`):

```bash
pnpm sync:create-app
```

It contains the `packages` map (name → published version) and the `catalog` versions; the generator
throws on a missing catalog entry or a missing version for an injected dependency. Run it after
bumping any `@ezhana/*` version, including the theme packages. Publishing requires the pinned
`create-ezhana-app` version to exist on npm before the template is exported; the export workflow
verifies that first, and the generated template's CI smoke-tests `pnpm create:app` against the
installed package.
