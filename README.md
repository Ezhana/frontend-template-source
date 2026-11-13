# Frontend Template Source

Source/development monorepo for the `frontend-template` repository. It provides the shared ESLint
and Prettier config packages, the CSS-first design-token and theme packages, and the generator that
creates React and Vue apps on demand. The consumer-facing template repository is generated from this
repository; no full sample apps are committed here.

## Features

- pnpm workspace monorepo
- Centralized dependency versions with pnpm Catalog
- ESLint 10 Flat Config
- Shared ESLint config packages for the base, TypeScript, React and Vue rule sets (workspace source,
  not published)
- Shared Prettier config package (workspace source, not published)
- Opt-in app configs written by `create:app configure` that compose the shared packages
- CSS-first design tokens: DTCG sources compiled with Style Dictionary into one layered stylesheet,
  resolved JSON, a versioned theme contract and typed metadata
- Zero-JavaScript theming: `data-theme` selects a theme, optional `data-color-mode` forces a color
  mode, and an absent mode attribute follows the operating system through `prefers-color-scheme`
- Self-contained theme presets: one `@import` of a theme's `style.css` includes its fonts, the full
  core stylesheet and its semantic overrides — no core install, runtime or bundler workaround
- Multi-theme setups share one core stylesheet and add each theme's `theme.css` + `fonts.css`
- Optional, SSR-safe `@ezhana/theme` runtime for switcher state, persistence and cross-tab sync;
  styling never needs it
- Themes as independently versioned packages built with a validating theme builder (contract,
  references and WCAG AA contrast)
- Themes may support a subset of color modes (for example the dark-only Onyx, Quest and Obsidian
  presets), with per-theme mode metadata and clamped runtime mode resolution
- A consumer integration harness (`pnpm test:consumer`) that packs the packages, installs them into
  throwaway Astro projects and verifies install/dev/build, the CSS cascade, fonts and metadata
- On-demand React/Vue app generation from pinned `create-vite` / `create-vue` versions
- Theme overlay applied to generated apps by default (`--no-theme` keeps the plain scaffold)
- Opt-in ESLint/Prettier configuration via `create:app --eslint` / `--prettier` or `create:app configure`
- Generated `frontend-template` repository export, including the shared config packages under its
  `packages/`
- lint-staged with simple-git-hooks
- GitHub Actions CI
- Changesets for package versioning and releases

## Requirements

- Node.js 24 LTS
- pnpm 12

The repository pins the package manager in the root `package.json` and defines the supported Node.js
version through `engines`.

## Repository Structure

```text
frontend-template-source/
├── packages/                       # @ezhana package sources (published + shared config packages)
│   ├── design-tokens/              # core tokens, semantic contract, default theme, core stylesheet
│   ├── theme-builder/              # build tool for theme packages
│   ├── design-theme-cerulean/      # official theme package (light + dark)
│   ├── design-theme-ocean/         # official theme package (light + dark)
│   ├── design-theme-onyx/          # official Onyx black-gold theme (dark-only)
│   ├── design-theme-quest/         # official QuestUI fantasy theme (dark-only)
│   ├── design-theme-obsidian/      # official Obsidian & Gold theme (dark-only)
│   ├── theme/                      # optional theme/mode state runtime (no CSS)
│   ├── eslint-config-base/         # shared config package (not published)
│   ├── eslint-config-typescript/   # shared config package (not published)
│   ├── eslint-config-vue/          # shared config package (not published)
│   ├── eslint-config-react/        # shared config package (not published)
│   └── prettier-config/            # shared config package (not published)
│
├── tools/create-app/               # published create-ezhana-app generator + overlay pipeline
│   ├── recipes/
│   ├── overlays/                   # theme integration only
│   ├── templates/                  # thin app configs that compose the shared packages
│   └── bin/create-app.mjs
│
├── fixtures/astro-consumer/        # minimal Astro consumer used by pnpm test:consumer
├── template/                       # skeleton for the generated frontend-template (incl. root configs)
├── scripts/                        # export + consumer verification scripts
├── docs/
├── .changeset/
├── .github/workflows/
│
├── eslint.config.mjs
├── prettier.config.mjs
├── package.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

The five shared config packages are the single source of lint/format rules: this repository's root
configs, the exported template's root configs and the apps generated in it all compose them.

## Packages

### Shared lint/format config packages (not published)

`packages/eslint-config-base`, `packages/eslint-config-typescript`,
`packages/eslint-config-react`, `packages/eslint-config-vue` and `packages/prettier-config` are
private workspace packages and the **single source of the lint/format rules**. They are not
published to npm.

This repository's root configs compose them, `scripts/export-template.mjs` copies them into the
generated template under `packages/`, and the template's root configs compose them there. Generated
apps get thin `eslint.config.mjs` / `prettier.config.mjs` files that import the packages, so users
edit rules in `packages/eslint-config-*/index.js` (or `packages/prettier-config/index.js`) or add
app-level overrides:

```bash
pnpm create:app react my-app --eslint --prettier
# or, for an existing app:
pnpm create:app configure apps/my-app --eslint --prettier
```

The config features require the app to live inside a workspace that ships these packages (this
repository or the generated template); `configure` errors elsewhere. By default no lint/format
config is written: the official scaffold's own output is preserved.

### Design system packages

#### `@ezhana/design-tokens` (core, v2.0.0)

The CSS-first core: DTCG primitive and semantic sources compiled with
[Style Dictionary](https://styledictionary.com/) into a complete core stylesheet, resolved values, a
versioned theme contract and typed metadata. The default theme lives in the core semantic sources.

Exports:

| Export                                | Contents                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `@ezhana/design-tokens`               | metadata + types (`defaultTheme`, `defaultThemeDefinition`, `modes`, `modeLabels`, token-name arrays, types)        |
| `@ezhana/design-tokens/style.css`     | complete core stylesheet: primitives + default theme + light/dark/system color modes, inside `@layer design-tokens` |
| `@ezhana/design-tokens/tokens.json`   | resolved primitive values and resolved semantic values per color mode                                               |
| `@ezhana/design-tokens/contract.json` | the versioned theme contract consumed by `@ezhana/theme-builder`                                                    |

Use it alone for the default theme:

```bash
pnpm add @ezhana/design-tokens
```

```css
@import '@ezhana/design-tokens/style.css';
```

With no `data-theme` attribute the default theme applies. Product CSS consumes semantic variables
(`--color-*`, `--font-*`, `--radius-*`, `--shadow-*`, …), never raw values.

```bash
pnpm --filter @ezhana/design-tokens build
pnpm --filter @ezhana/design-tokens test
```

See [`packages/design-tokens/README.md`](packages/design-tokens/README.md).

#### `@ezhana/theme-builder`

Build tool for theme authors. It validates a theme against the core contract (required overrides,
references, modes and WCAG AA contrast) and emits a self-contained preset:

```js
// theme.config.mjs
import { defineTheme } from '@ezhana/theme-builder'

export default defineTheme({
  id: 'acme',
  label: 'ACME',
  tokens: ['tokens/palette.json'], // theme-private tokens, under `theme.*`
  overrides: 'tokens/theme.json', // semantic overrides: base + one section per color mode
  fonts: ['@fontsource-variable/inter'], // devDependency, inlined/copied by the build
})
```

```js
// scripts/build.mjs
import { buildTheme } from '@ezhana/theme-builder'

await buildTheme(new URL('../theme.config.mjs', import.meta.url))
```

The build writes `dist/style.css`, `dist/theme.css`, `dist/fonts.css`, `dist/fonts/`,
`dist/index.js`, `dist/index.d.ts` and `dist/theme.json`. See
[`packages/theme-builder/README.md`](packages/theme-builder/README.md).

#### Official theme packages

`@ezhana/design-theme-cerulean`, `@ezhana/design-theme-ocean`,
`@ezhana/design-theme-onyx`, `@ezhana/design-theme-quest` and
`@ezhana/design-theme-obsidian` are regular theme packages built with `@ezhana/theme-builder`.
Each owns its palette, its typeface and its semantic overrides, and depends on
`@ezhana/design-tokens`; font packages are devDependencies only, so consumers never install them.

- [`packages/design-theme-cerulean`](packages/design-theme-cerulean/README.md) — cerulean-blue
  accent, Public Sans, level-2 controls, light + dark, with a full
  [design narrative](packages/design-theme-cerulean/docs/DESIGN.md)
- [`packages/design-theme-ocean`](packages/design-theme-ocean/README.md) — indigo-blue accent,
  pill-shaped controls, light + dark
- [`packages/design-theme-onyx`](packages/design-theme-onyx/README.md) — Onyx black-gold business
  identity: champagne gold on soft warm graphite, Public Sans, dark-only, with a full
  [design narrative](packages/design-theme-onyx/docs/DESIGN.md)
- [`packages/design-theme-quest`](packages/design-theme-quest/README.md) — QuestUI fantasy RPG
  identity: gold, parchment and royal purple on deep brown, Cinzel + Spectral + Fira Code,
  dark-only, with a full [design narrative](packages/design-theme-quest/docs/DESIGN.md)
- [`packages/design-theme-obsidian`](packages/design-theme-obsidian/README.md) — Obsidian & Gold
  business identity: near-black obsidian with 24K gold accents, Inter body + Playfair Display
  headings, dark-only, with a full
  [design narrative](packages/design-theme-obsidian/docs/DESIGN.md)

Every theme package exports the same shape: `.` (metadata: `theme`, `themeId`, `themeLabel`,
`modes`), `./style.css` (the complete self-contained preset), `./theme.css` (overrides only),
`./fonts.css` (`@font-face` only), `./theme.json` (resolved values) and `./package.json`. Fonts are
copied into `dist/fonts/` by the build.

A single theme package is enough for a complete app:

```bash
pnpm add @ezhana/design-theme-cerulean
```

```css
@import '@ezhana/design-theme-cerulean/style.css';
```

```html
<html data-theme="cerulean"></html>
```

No core install, no JavaScript, no Vite `noExternal` and no Astro plugin are needed.

#### `@ezhana/theme` (optional runtime)

Framework-agnostic theme state for apps that need a switcher: validated theme/mode preferences,
`localStorage` persistence, `prefers-color-scheme` tracking and cross-tab synchronisation. It ships
no CSS and applies `data-theme` plus an optional `data-color-mode` to the root element.

```ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { createThemeManager } from '@ezhana/theme'

export const themeManager = createThemeManager({
  themes: [defaultThemeDefinition, cerulean, ocean],
})

themeManager.setTheme('ocean')
themeManager.setMode('system') // no data-color-mode attribute; CSS follows the OS
themeManager.subscribe((state) => console.log(state.theme, state.resolvedMode))
```

`createThemeManager` takes the theme definitions directly (there is no registry builder), derives
the ids/labels and the union of supported modes, and clamps `resolvedMode` to a mode the active
theme supports. Importing the module performs no DOM access; pass `root: null` for headless/SSR use.

See [`packages/theme/README.md`](packages/theme/README.md) for the API, SSR guidance and the
no-flash inline `<head>` script.

## Usage

### Create an app from the official scaffolders

Requires Node.js 24, pnpm 12 and network access (the pinned external scaffolders are downloaded with
`pnpm dlx`):

```bash
pnpm install
pnpm create:app react my-react-app
pnpm create:app vue my-vue-app

# write thin ESLint/Prettier configs that compose the shared packages
pnpm create:app react my-react-app --eslint --prettier

# keep the plain official scaffold instead of applying the theme overlay
pnpm create:app react my-react-app --no-theme

# or configure an existing app later
pnpm create:app configure apps/my-react-app --eslint --prettier
```

The generator then:

1. scaffolds with the pinned `create-vite` / `create-vue` version, keeping the scaffold's own
   dependencies, scripts and lint/format configuration;
2. applies the theme overlay (skipped with `--no-theme`): the app-owned theme definitions, the theme
   manager, the switcher, the entry-file CSS imports and the anti-flash script;
3. moves the app into `apps/<name>` and adds the `@ezhana` theme dependencies with `pnpm add`
   (skipped with `--no-theme`);
4. when `--eslint` / `--prettier` is passed, writes thin config files that compose the shared
   workspace config packages and adds their dependencies as `workspace:*` (the same code as
   `configure`);
5. verifies with ESLint (if configured) or the app's existing lint script, then builds.

The config features need the app to be inside a workspace that ships the shared config packages
(this repository or the generated template); `--target` outside the workspace cannot be combined
with `--eslint` / `--prettier`.

Run `pnpm create:app` without arguments for an interactive framework/name prompt. By default the app
is created under `apps/<name>`; use `--target <path>` for a different directory.

`configure` overwrites the config files it owns and adds the workspace config packages and their
dependencies, but it does not delete scaffold configs, rewrite scripts or migrate old setups. The
written app configs contain no rules; edit the shared rules in `packages/eslint-config-*/index.js` /
`packages/prettier-config/index.js`, or add app-level overrides. If you keep the Oxlint config
generated by create-vite, it stays in place; update `package.json` scripts yourself if you want
`pnpm lint` to use ESLint.

Generated app commands:

```bash
cd apps/my-react-app
pnpm dev
pnpm build
pnpm lint
```

Options: `--eslint`, `--prettier`, `--no-theme`, `--no-install`, `--no-verify`, `--keep-temp`,
`--target`, `--root`. See [`docs/create-app.md`](docs/create-app.md).

In the generated template repository the same `pnpm create:app` command runs the published
[`create-ezhana-app`](https://www.npmjs.com/package/create-ezhana-app) devDependency; the generator
is not copied into the template. See
[ADR 0002](docs/adr/0002-distribute-create-app-via-npm.md).

### Use the generated template repository

The generated `frontend-template` repository is a **workspace starter with no default apps**:

- `apps/` — empty; users choose a stack with one command;
- `packages/` — the five shared lint/format config packages, plus room for your own workspace
  packages;
- `README.md` (English) and `README.zh-CN.md` (中文);
- root lint/format configs that compose the packages, commit hooks and CI.

```bash
pnpm install        # installs root tooling and the pinned create-ezhana-app generator
pnpm create:app     # interactive: choose React or Vue, then enter an app name
pnpm dev            # run the generated app(s)
pnpm build
pnpm lint
pnpm check
```

The command uses the official `create-vite` / `create-vue` CLI and applies the theme integration
(pass `--no-theme` to keep the plain official scaffold). Lint/format configuration is opt-in with
`--eslint` / `--prettier` or `create:app configure`; by default the scaffold's own tooling is
preserved. The generated app appears under `apps/<name>`.

To add your own package, create `packages/<name>`, reference it with `"workspace:*"` from an app,
and run `pnpm build:packages` before `pnpm build`. Keep the shared config packages: the root and app
lint/format configs resolve them through the workspace. See the template's `packages/README.md`.

### Consume the design system in any app

The three supported setups are a theme-only install, core-only, and a multi-theme install. All are
CSS-first and work in Astro, Vite, Next.js or plain HTML without JavaScript.

**A — a theme package only (recommended for one theme).** The theme's `style.css` is a complete
preset: fonts, the full core stylesheet and the theme overrides.

```bash
pnpm add @ezhana/design-theme-cerulean
```

```css
/* src/styles/global.css */
@import '@ezhana/design-theme-cerulean/style.css';
```

```html
<html data-theme="cerulean">
  <!-- content; the color mode follows the OS -->
</html>

<!-- optional explicit mode; wins over the OS preference -->
<html data-theme="cerulean" data-color-mode="dark"></html>
```

`@ezhana/design-tokens` is a normal dependency of the theme package, so it is installed
automatically. No runtime package is installed.

**B — the core package only (default theme, or build your own theme).**

```bash
pnpm add @ezhana/design-tokens
```

```css
@import '@ezhana/design-tokens/style.css';
```

With no `data-theme` attribute the core default theme applies. This is also the base for a
hand-written or generated custom theme.

**C — multiple themes.** Install the core package and each theme, import the core stylesheet once,
then each theme's font and override entries, and select with `data-theme`:

```bash
pnpm add @ezhana/design-tokens @ezhana/design-theme-cerulean @ezhana/design-theme-ocean
```

```css
@import '@ezhana/design-tokens/style.css';
@import '@ezhana/design-theme-cerulean/fonts.css';
@import '@ezhana/design-theme-cerulean/theme.css';
@import '@ezhana/design-theme-ocean/fonts.css';
@import '@ezhana/design-theme-ocean/theme.css';
```

```html
<html data-theme="cerulean"></html>
<html data-theme="ocean" data-color-mode="light"></html>
```

Importing several complete `style.css` files also works, but repeats the core block in the bundle;
the core + `theme.css` + `fonts.css` path is the recommended multi-theme setup.

See [`docs/usage.md`](docs/usage.md) for the full consumer guide, including theme switching, custom
themes, Astro integration and Tailwind.

### Maintain this source repository

```bash
pnpm install
pnpm check                    # format:check + lint + tests + typecheck
pnpm build                    # regenerate the core token dist/ and every theme package

pnpm create:app react check-react --target /tmp/check-react   # inspect the generated app
pnpm create:app vue check-vue --target /tmp/check-vue

pnpm export:template --install           # generate dist-template/frontend-template
pnpm test:consumer                       # pack + install into throwaway Astro projects
```

Publish `@ezhana/*` package changes and `create-ezhana-app` before exporting; then run
**Actions → Export template repo** (or push the generated directory manually). See
[`docs/template-distribution.md`](docs/template-distribution.md) for GitHub configuration.

## Theming

Themes and color modes are two orthogonal axes driven by attributes on the document root:

| axis  | attribute         | values                       | owner           |
| ----- | ----------------- | ---------------------------- | --------------- |
| theme | `data-theme`      | any installed theme id       | visual identity |
| mode  | `data-color-mode` | `light` or `dark` (optional) | color scheme    |

`data-color-mode` is optional: without it the stylesheet follows the operating system through
`@media (prefers-color-scheme: dark)`. "System" is a runtime preference only; it is never written to
the DOM. Explicit `light` or `dark` always wins over the OS preference. No JavaScript is needed for
any of it.

```html
<!-- follow the OS color mode -->
<html data-theme="cerulean"></html>

<!-- force a mode; this wins over the OS preference -->
<html data-theme="cerulean" data-color-mode="dark"></html>
```

The default theme is selected when `data-theme` is absent (or is `"default"`).

### Token model

```text
primitive    raw palette / scales            --primitive-color-violet-600     (core package)
   │
semantic     intent tokens for product CSS   --color-bg, --color-fg, ...      (core package, default theme)
   │
theme        semantic-token overrides        :root[data-theme="<id>"]         (theme package)
(component)  optional, separate package      --button-bg → var(--color-accent)
```

- `tokens/primitive/*.json` holds raw, context-free values.
- `tokens/semantic/base.json` plus `tokens/semantic/modes/*.json` holds the semantic contract and
  the default theme.
- A theme package owns its own palette under the build-time `theme.*` namespace. Those tokens are
  resolved into override values and never emitted as CSS custom properties, so a brand palette
  cannot leak into product code.
- A theme package only overrides semantic tokens; it does not add token names.

Semantic tokens are the public API. Primitive tokens are raw material: spacing is available directly
as `--primitive-space-*`, but colors, typography, radii and elevation should go through the semantic
layer so a theme can change them. The full grouped reference lives in
[`packages/design-tokens/README.md`](packages/design-tokens/README.md#token-reference).

### Cascade layer

All token declarations are emitted into `@layer design-tokens`, in the core package and in every
theme package. Unlayered application CSS therefore wins without specificity battles or
`!important`:

```css
.checkout {
  --radius-control: 0; /* overrides the layered token */
}
```

### Theme switching runtime

Apps that need a switcher use `@ezhana/theme`, which:

- takes the theme definitions array (`defaultThemeDefinition` plus each installed theme's `theme`
  export) and derives ids, labels and the mode union;
- reads and validates the persisted preference (`localStorage` key `ezhana-theme`);
- resolves `system` mode through `prefers-color-scheme` and listens for OS changes;
- applies `data-theme` immediately and `data-color-mode` only for explicit modes, so `system` mode
  stays CSS-driven;
- clamps `resolvedMode` to a mode the active theme supports (when another configured theme
  supports `light`, a `light` preference is accepted and persisted but resolves to `dark` while a
  dark-only theme is active);
- synchronises across tabs through `storage` events and degrades gracefully when storage is
  unavailable.

An inline classic script in each `index.html` resolves the stored preference before first paint, so
the correct theme is applied without a flash of the wrong theme. The manager also works headless
(`root: null`) for SSR.

### Adding a theme

A theme is a package built with `@ezhana/theme-builder`; see
[ADR 0005](docs/adr/0005-css-first-theme-presets.md) for the current architecture and
[`packages/theme-builder/README.md`](packages/theme-builder/README.md) for the config reference.

1. `pnpm add -D @ezhana/theme-builder` and `pnpm add @ezhana/design-tokens` in your theme package.
2. Declare `theme.config.mjs` (`id`, `label`, `tokens`, `overrides`, optional `fonts`, optional
   `modes` — omit it to support every contract color mode, or list a subset such as `['dark']` for a
   fixed-mode theme).
3. Put the palette in `tokens/palette.json` (all tokens under `theme.*`) and the semantic overrides
   in `tokens/theme.json` (`base` + one section per color mode).
4. Add font packages as devDependencies only; the build copies their files into `dist/fonts/` and
   inlines the `@font-face` rules, so consumers never install the font packages.
5. Run `buildTheme()`; it fails with an actionable message when a required override is missing, a
   reference is unknown or WCAG AA contrast is not met.
6. Ship the generated `dist/` and export `.` (metadata), `./style.css`, `./theme.css`,
   `./fonts.css` and `./theme.json`.

The official themes are the worked examples:
[`design-theme-cerulean`](packages/design-theme-cerulean/README.md) (custom palette, Public Sans),
[`design-theme-ocean`](packages/design-theme-ocean/README.md) (pill-shaped controls, no custom font),
[`design-theme-onyx`](packages/design-theme-onyx/README.md),
[`design-theme-quest`](packages/design-theme-quest/README.md) and
[`design-theme-obsidian`](packages/design-theme-obsidian/README.md) (dark-only fixed-mode themes).

Adding a color mode means adding `tokens/semantic/modes/<mode>.json` to the core package plus the
mode block in each theme that supports it; the builds list exactly what is missing per file.

The component layer is intentionally absent: component tokens belong to a component API and are
better versioned as a separate package. See the
[component-layer guidance](packages/design-tokens/README.md#component-layer-optional).

## Template Distribution

This repository is the source/development monorepo. The public template repository is generated from
it: the `template/` skeleton supplies the workspace files and root configs, and the generator is
published as [`create-ezhana-app`](https://www.npmjs.com/package/create-ezhana-app) and pinned as an
exact devDependency (`create:app` → `create-ezhana-app`); no generator code is copied into the
template. `scripts/export-template.mjs` copies the five private lint/format config packages into the
template's `packages/`, where the root and app configs compose them as `workspace:*` dependencies;
the published `@ezhana` token and theme packages are installed from npm. The template keeps the
`apps/` + `packages/` monorepo layout.

```bash
pnpm export:template --install          # generate dist-template/frontend-template
```

The generated repository is force-pushed by `.github/workflows/export-template.yml` after packages
are published. See [`docs/template-distribution.md`](docs/template-distribution.md) for the full
model, required GitHub variables/secrets, and the user-package workflow.

## Development Workflow

The repository has two layers of lint/format configuration:

1. **Shared config packages** in `packages/eslint-config-*` and `packages/prettier-config` hold the
   rules. This repository's root configs compose them; the packages are private and are not
   published.
2. **Thin app configs** are written by `create-ezhana-app` into generated apps. They import the
   shared packages and contain no rules of their own, only an extension point for app-level
   overrides.

`pnpm create:app` does not write lint/format config by default. Use `--eslint` / `--prettier`, or
the `configure` subcommand, when you want the shared rules. The config features require the app to be
inside a workspace that ships the packages (this repository or the generated template):

```bash
pnpm create:app react my-app --eslint --prettier
pnpm create:app configure apps/my-app --eslint --prettier
```

## Git Hooks

The repository uses:

- `simple-git-hooks`
- `lint-staged`

Before a commit, only staged files are processed.

The workflow is:

```text
git commit
    ↓
pre-commit
    ↓
lint-staged
    ├── Prettier
    └── ESLint
```

This keeps the local commit check fast while CI performs the complete repository validation.

## Verification

`pnpm test:consumer` is the end-to-end integration test for the published artifacts. It:

1. packs `@ezhana/design-tokens`, `@ezhana/design-theme-cerulean` and
   `@ezhana/design-theme-ocean` with `pnpm pack`;
2. installs the tarballs into throwaway Astro projects (never workspace symlinks);
3. verifies install, dev and build with no Astro/Vite CSS workaround — the
   [`fixtures/astro-consumer`](fixtures/astro-consumer) fixture installs only the Cerulean theme and
   imports only `@ezhana/design-theme-cerulean/style.css`;
4. simulates the CSS cascade for explicit light/dark and system light/dark, including an explicit
   mode overriding the opposite OS preference;
5. checks that `theme.json`, the generated CSS and the runtime metadata agree, that the theme tarball
   ships its fonts and that the optional runtime is not installed;
6. builds a multi-theme project that imports the core stylesheet once plus each theme's
   `fonts.css`/`theme.css`, and confirms the core tokens are emitted once and each theme applies.

## CI

GitHub Actions validates:

```text
format:check
lint
test
consumer verification (test:consumer)
React/Vue generation matrix (create-app.yml)
```

The local equivalent of the source checks is:

```bash
pnpm check
```

## Versioning and Releases

Published design/theme packages and the generator are versioned and released with Changesets. The
lint/format config packages under `packages/` are private workspace packages, so Changesets neither
versions nor publishes them; the template export copies them into the generated template.

The repository uses Changesets for package versioning:

```bash
pnpm changeset
```

Review pending releases:

```bash
pnpm changeset:status
```

Apply version changes:

```bash
pnpm changeset:version
```

Publish packages:

```bash
pnpm changeset:publish
```

The generated template apps and the root workspace are private and are not published as npm
packages.

## Package Version Management

Core development tooling is managed through pnpm Catalog:

```yaml
catalog:
  '@eslint/js': ...
  eslint: ...
  eslint-config-prettier: ...
  globals: ...
  prettier: ...
  typescript: ...
```

This keeps shared tooling versions consistent across the workspace.

Framework and build-tool versions such as Vue, React, Vite and `vue-tsc` are maintained by their
respective templates; the ESLint framework plugins are dependencies of the shared config packages.

## Design Principles

### CSS-first, zero-JS theming

A theme is a set of semantic-token overrides selected by `data-theme`; a color mode is an optional
`data-color-mode` attribute, with the OS followed through CSS when it is absent. Switching is DOM
state, so it works in React, Vue, Astro, static HTML and SSR, before JavaScript runs, and without a
component re-render.

### Complete presets, one import

A theme's `style.css` contains its fonts, the core stylesheet and its overrides. "Install one theme
package and import one CSS file" is the primary use case; the split `theme.css`/`fonts.css` entries
exist for multi-theme apps that share the core stylesheet once.

### Semantic tokens are the public API

Product code consumes intent-based semantic tokens (`--color-fg`, `--radius-control`) rather than
primitives (`--primitive-color-violet-600`), so palette and theme changes stay local to the token
package. Primitive layout scales are the exception: spacing is consumed directly.

### Tokens flow in one direction

Semantic tokens reference primitive tokens, never the other way around. Themes only override
semantic tokens. Adding a theme or a color mode cannot break existing component CSS.

### Themes are data, runtime is optional

Themes are static CSS packages; no CSS is loaded or generated at runtime. `@ezhana/theme` is
optional state management for switchers, not a prerequisite for theming.

### Explicit dependencies

Each workspace package declares the dependencies it directly uses instead of relying on transitive
dependencies. Theme packages depend on the core token package; `@ezhana/theme` depends on no theme
package because it accepts theme definitions structurally.

### Config is shared once, apps extend it

The ESLint/Prettier rules live in the shared workspace packages. Generated apps get thin configs
that compose them and can add app-level overrides, so a rule change is made once instead of copied
per app.

### Tooling source ships as workspace packages, not npm packages

The lint/format config packages remain private and unpublished. The generated template carries them
as workspace source under `packages/`, so its root and app configs compose them without an npm
release.

### Explicit, opt-in configuration

Generating an app does not overwrite the scaffold's tooling. Lint/format configuration is written
only when the user asks for it, and the command does not try to clean up or migrate existing files.

### Local checks and CI have different responsibilities

Local Git hooks prioritize fast feedback on changed files. CI validates the complete workspace,
including the packed-package consumer verification.

## License

MIT
