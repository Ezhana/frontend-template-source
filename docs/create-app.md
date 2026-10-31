# Creating an app from external scaffolders

`tools/create-app` is a thin wrapper around the official framework scaffolders. It generates an app
with `create-vite` / `create-vue`, applies the `@ezhana` theme overlay, and can optionally write
ESLint/Prettier configuration that composes the shared config packages in the workspace. The same
code is published as [`create-ezhana-app`](https://www.npmjs.com/package/create-ezhana-app) and
pinned by the generated template; this repository runs it from `tools/create-app` directly.

```bash
pnpm create:app
# select React or Vue, then enter the app name

pnpm create:app react my-react-app
pnpm create:app vue my-vue-app

pnpm create:app react my-react-app --eslint --prettier
pnpm create:app configure apps/my-react-app --eslint --prettier
```

Apps are created under `apps/<name>` by default. Use `--target <path>` to generate elsewhere.
The command requires network access (the external scaffolders are downloaded with `pnpm dlx`) and
Node.js 24 + pnpm 12. In the generated template, run `pnpm install` once first: it installs the
pinned `create-ezhana-app` devDependency.

The lint/format features depend on the workspace packages in `packages/`; see
[Workspace requirement](#workspace-requirement).

## Lifecycle

```text
preflight → scaffold (external CLI, pinned version) → prepare metadata → theme overlay
          → move → add theme dependencies → optional configure → verify
```

1. **preflight**: resolve the template (interactive prompt or arguments) and the target
   (`apps/<name>` by default); the target directory must be empty.
2. **scaffold**: run the pinned external scaffolder in a staging directory next to the target.
   `create-vite@9.3.3` (`react-ts`) and `create-vue@3.24.0` (`--ts`) are pinned in
   [`recipes/`](../tools/create-app/recipes/index.mjs).
3. **prepare metadata**: remove generated lockfiles, `node_modules` and `.git`; set the app
   `name` and `private` fields. The scaffold's dependencies, scripts and lint/format configuration
   are left untouched.
4. **theme overlay**: copy `overlays/<framework>` into the app:
   - `src/theme/*` runtime integration (`registry.ts`, `manager.ts`, `useTheme.ts`);
   - `ThemeSwitcher` + `ThemeRoot` wrapper;
   - entry file importing the core tokens CSS and each theme package's `./style` entry;
   - theme init script in `index.html` (no flash of wrong theme).
5. **move**: rename the staging app to the target. This happens _before_ dependency installation on
   purpose: inside the template workspace the app has to exist at `apps/<name>` when pnpm resolves
   the workspace.
6. **add theme dependencies**: `pnpm add @ezhana/design-tokens @ezhana/theme
@ezhana/design-theme-ocean @ezhana/design-theme-cerulean` with versions from `versions.json`.
7. **optional configure**: when `--eslint` / `--prettier` is passed, write the thin app configs and
   run `pnpm add -D` for their dependencies (same implementation as the `configure` subcommand).
8. **verify**: if ESLint was configured, run `pnpm exec eslint .`; otherwise run `pnpm lint` when
   the app has a `lint` script; then build.

Dependencies are added with pnpm, not by patching `package.json` by hand. The tool does not remove
scaffold configuration, dependencies or scripts, and contains no migration or compatibility logic.

`--no-install` skips dependency installation and verification. Config files selected with
`--eslint` / `--prettier` are still written; the dependency add commands are printed for you to run
later.

If installation or verification fails, the moved app is removed again so the command can be retried
against an empty target (`--keep-temp` skips both the cleanup and the staging cleanup).

## Configure an existing app

```bash
pnpm create:app configure apps/my-app --eslint --prettier
```

`configure` writes:

- `eslint.config.mjs`: a thin ESLint flat config that imports the workspace's
  `@ezhana/eslint-config-<framework>` and spreads it into `defineConfig([...])`, leaving the array as
  the extension point for app-level overrides;
- `prettier.config.mjs` (re-exports `@ezhana/prettier-config`) and `.prettierignore` when
  `--prettier` is selected.

The written files contain no rules of their own; they provide an extension point for app-level
overrides. The shared rules live in the workspace packages `packages/eslint-config-*/index.js` and
`packages/prettier-config/index.js`.

`configure` then adds the matching devDependencies with `pnpm add -D`:

- `@ezhana/eslint-config-<framework>` as `workspace:*`, plus `eslint` and `typescript` at the
  catalog versions from `versions.json` (pnpm may keep the scaffold's range operator for
  `typescript`, e.g. `~6.0.2`);
- `@ezhana/prettier-config` as `workspace:*`, plus `prettier` at its catalog version.

`--no-install` writes only the files and prints the command. The framework is inferred from
`package.json`; use `--template react|vue` when that is not possible. The ESLint dependency set also
pins `typescript` to the catalog version, because `typescript-eslint` needs a supported compiler
major and the official scaffold may ship a newer one.

`configure` intentionally:

- overwrites the config files it owns;
- does not delete Oxlint or any other scaffold configuration;
- does not modify `package.json` scripts, so `pnpm lint` may still run Oxlint;
- does not look for old versions, migrate old configs, or reconcile dependencies.

Those choices keep the command small and predictable. Cleanup, script changes and lint/format
migrations are user decisions.

### Workspace requirement

The written app configs import workspace packages, so `configure` only works when the target app is
inside a pnpm workspace that contains them: the generated `frontend-template` repository or this
source repository. It walks up from the target to find `pnpm-workspace.yaml` and verifies that the
needed `@ezhana` config packages are members of that workspace. Outside such a workspace it stops
with an error before writing files or touching `package.json`.

In practice `--target` outside the workspace can be used for a plain scaffold, but not combined with
`--eslint` / `--prettier`. Configure inside the template workspace instead (the default
`apps/<name>` location).

## Options

### Create

| Option         | Effect                                                             |
| -------------- | ------------------------------------------------------------------ |
| `--eslint`     | write `eslint.config.mjs` and add the shared ESLint config package |
| `--prettier`   | write `prettier.config.mjs` / `.prettierignore` and add Prettier   |
| `--no-install` | scaffold + theme overlay + config files only                       |
| `--no-verify`  | add dependencies but skip lint/build                               |
| `--keep-temp`  | keep the staging directory when generation fails                   |
| `--target`     | explicit output path instead of `apps/<name>`                      |
| `--root`       | workspace root used for the default `apps/<name>` path             |
| `--name`       | app directory name (alternative to the second positional argument) |
| `--template`   | template name (alternative to the first positional argument)       |
| `--list`       | list available templates                                           |

`--target` outside the workspace cannot be combined with `--eslint` / `--prettier`.

### Configure

| Option              | Effect                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| `--target <path>`   | app directory (default: current directory)                                |
| `--template <name>` | framework override; otherwise inferred from `package.json`                |
| `--eslint`          | write `eslint.config.mjs` and add the shared ESLint config package        |
| `--prettier`        | write `prettier.config.mjs` / `.prettierignore` and add the shared config |
| `--no-install`      | write files only; print the `pnpm add` command                            |

At least one of `--eslint` / `--prettier` is required.

## Default scaffold output

The generator does not own the scaffold's lint/format state by default:

- `create-vite@9.3.3` React generates `.oxlintrc.json`, an `oxlint` devDependency and
  `"lint": "oxlint"`; these are preserved.
- `create-vue@3.24.0` with `--ts --force` generates no ESLint/Prettier configuration; nothing is
  added.

## Configuration files

`configure` writes thin wrapper files from [`tools/create-app/templates/`](../tools/create-app/templates/):

- `eslint-react.config.mjs` / `eslint-vue.config.mjs` → app `eslint.config.mjs`: imports
  `@ezhana/eslint-config-<framework>` and spreads it into `defineConfig([...config])`, with the
  array as the extension point for app-level overrides;
- `prettier.config.mjs` → app `prettier.config.mjs`: re-exports `@ezhana/prettier-config`;
- `prettierignore` → `.prettierignore`.

The rule sets themselves live only in `packages/eslint-config-*/index.js` and
`packages/prettier-config/index.js`. Edit them there to change rules for every app, or add
app-specific overrides in the app config file. There are no hand-maintained copies and no sync or
patch step.

The config packages are added to the app as `workspace:*` dependencies; `eslint`, `prettier` and
`typescript` are added at the catalog versions from `versions.json` (pnpm may keep the scaffold's
range operator, so `typescript` can end up as e.g. `~6.0.2`).

## Theme packages

Themes are consumed as standalone packages, per
[ADR 0003](adr/0003-themes-as-packages.md). The generator installs `@ezhana/design-tokens`,
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
and the theme package list in [`lib/create.mjs`](../tools/create-app/lib/create.mjs). Adding a theme
in a generated app only needs `pnpm --filter ./apps/<name> add <theme-package>`, its stylesheet
import and one entry in `src/theme/registry.ts`.

## CI

`.github/workflows/create-app.yml` runs the generator matrix: React and Vue, each with and without
`--eslint --prettier`. The configured cases generate the app inside the workspace, because the
written configs import the workspace config packages and pnpm has to resolve their `workspace:*`
dependencies; the workflow also asserts that the app config imports the framework config package and
that the app manifest carries the `workspace:*` devDependencies. It also packs the tarball and checks
the published file set, including `templates/`, so the package layout cannot break silently.

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
devDependency and script, and never copies the tool into the template. It also copies the five shared
config packages into the template's `packages/`. Users run `pnpm install` once before the command,
which puts the pinned generator (and its integrity) in the template's `pnpm-lock.yaml`. The package,
not the template snapshot, is versioned and audited.

`versions.json` is regenerated from the **non-private** package manifests under `packages/` (core
tokens, official theme packages, theme runtime and theme builder) plus the workspace catalog by the
package's `prepack` hook (and manually with `pnpm sync:create-app`):

```bash
pnpm sync:create-app
```

It contains the `packages` map (name → published version) and the `catalog` versions; the generator
throws on a missing catalog entry or a missing version for an injected dependency. The shared
ESLint/Prettier config packages are private, so `versions.json` excludes them; they are added to
apps as `workspace:*` dependencies and copied into the generated template by the export.

Publishing requires the pinned `create-ezhana-app` version to exist on npm before the template is
exported; the export workflow verifies that first, and the generated template's CI smoke-tests
`pnpm create:app` and `pnpm create:app configure` against the installed package.

## Shared config packages

`packages/eslint-config-*` and `packages/prettier-config` are **workspace packages**: private, not
published to npm, and the single source of the lint/format rules. The root configs of this
repository and of the exported template compose them, generated apps import them through thin
configs, and `scripts/export-template.mjs` copies them into the generated template under
`packages/`. See [ADR 0004](adr/0004-app-owned-lint-format-configs.md).

Change rules in `packages/eslint-config-*/index.js` or `packages/prettier-config/index.js`; do not
copy them into the generator or the template root.
