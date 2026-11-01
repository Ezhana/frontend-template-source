# Using design tokens and theming in a project

This guide explains how the pieces fit together end to end: what each package does, how an app is
wired, what happens at runtime when a user switches a theme or color mode, and how to extend the
system — including a third-party theme package.

The architecture decision behind this split is [ADR 0003](adr/0003-themes-as-packages.md).

## Packages at a glance

| Package                                                                        | Kind            | Responsibility                                                                                                                       | Not responsible for            |
| ------------------------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| [`@ezhana/design-tokens`](../packages/design-tokens/README.md)                 | build-time data | primitive scale, semantic contract, default theme, core CSS, contract JSON, types                                                    | themes, runtime state, DOM, UI |
| [`@ezhana/theme-builder`](../packages/theme-builder/README.md)                 | build-time tool | validate a theme package against the contract; generate its CSS, metadata, types and JSON                                            | runtime state, app wiring      |
| [`@ezhana/design-theme-cerulean`](../packages/design-theme-cerulean/README.md) | theme package   | Cerulean palette, Public Sans, semantic overrides, design narrative                                                                  | other themes, app code         |
| [`@ezhana/design-theme-ocean`](../packages/design-theme-ocean/README.md)       | theme package   | Ocean palette, pill-shaped controls, semantic overrides                                                                              | other themes, app code         |
| [`@ezhana/design-theme-onyx`](../packages/design-theme-onyx/README.md)         | theme package   | Onyx black-gold business palette, Public Sans, moderate radii, warm near-black elevation, dark-only fixed mode                       | other themes, app code         |
| [`@ezhana/design-theme-quest`](../packages/design-theme-quest/README.md)       | theme package   | QuestUI fantasy palette, Cinzel/Spectral/Fira Code, gold-glow elevation, dark-only fixed mode                                        | other themes, app code         |
| [`@ezhana/theme`](../packages/theme/README.md)                                 | runtime         | theme/mode state machine: `data-theme` (+ optional `data-color-mode`), persistence, `prefers-color-scheme`, cross-tab sync, registry | CSS, token values, components  |
| self-hosted fonts (`@fontsource*`)                                             | static assets   | fonts imported by a theme's `./style` entry (Public Sans, Cinzel, Spectral, Fira Code)                                               | theme logic                    |

The split is deliberate: tokens are **data + build**, themes are **data + build**, and the runtime is
**state + DOM attributes**. No package knows about React or Vue; the apps add tiny adapters.

## The attribute model

Two attributes on the document root select the visual result:

| attribute         | values                 | written when                         | effect                                               |
| ----------------- | ---------------------- | ------------------------------------ | ---------------------------------------------------- |
| `data-theme`      | any installed theme id | always                               | theme-package overrides (`:root[data-theme="<id>"]`) |
| `data-color-mode` | `light`, `dark`        | only for an explicit mode preference | semantic tokens for that mode (`[data-color-mode]`)  |

`data-color-mode` is **optional**. Without it the stylesheet follows the OS via
`@media (prefers-color-scheme: dark)`. So the default behavior is "follow the system", works before
JavaScript runs, and does not require writing a resolved mode value into the DOM. `system` is a
preference only; it is never written to `data-color-mode`.

Theme CSS is `:root`-prefixed, so it wins over the core stylesheet regardless of import order.

A theme may support only a subset of the app's color modes. A fixed-mode theme (one declared mode,
such as QuestUI's or Onyx's `['dark']`) emits a single unconditional `:root[data-theme]` rule with
`color-scheme` pinned; the runtime still writes `data-theme`, but clamps `resolvedMode` (and any
`data-color-mode`) to a mode the active theme actually supports.

## The complete flow

```text
              BUILD TIME                                                    RUNTIME
┌─────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
│ @ezhana/design-tokens               │        │ <head> inline script                         │
│   primitive/  raw values            │        │   restore stored data-theme                  │
│   semantic/   default theme         │        │   restore explicit data-color-mode (if any)  │
│            │                        │        │            │                                 │
│            ▼                        │        │            ▼                                 │
│ Style Dictionary                    │        │ <html data-theme="cerulean"                  │
│   contract validation               │        │       [data-color-mode="dark"]>              │
│   → dist/css/tokens.css             │        │            │                                 │
│   → dist/json/contract.json         │──ship─▶│            ▼                                 │
│   → dist/js index.js / .d.ts        │        │ core tokens.css remaps semantic variables    │
└─────────────────────────────────────┘        │ (mode: attr or prefers-color-scheme)         │
┌─────────────────────────────────────┐        │            │                                 │
│ theme package (design-theme-*)      │        │            ▼                                 │
│   tokens/palette.json  (theme.*)    │        │ theme theme.css remaps accents/fonts/radii   │
│   tokens/theme.json    overrides    │        │            │                                 │
│            │                        │        │            ▼                                 │
│            ▼                        │        │ @ezhana/theme manager (module init)          │
│ @ezhana/theme-builder               │        │   validate prefs, apply attributes, listen   │
│   validate + contrast               │──ship─▶│            │                                 │
│   → dist/css/theme.css              │        │            ▼                                 │
│   → dist/css/standalone.css         │        │ switcher UI ──setTheme/setMode──▶ manager    │
│   → dist/style.js, js/, json/       │        │            │                                 │
└─────────────────────────────────────┘        │   persist + apply attrs + notify ◀───────────┘
                                               │            │
                                               │            ▼
                                               │ components consume semantic tokens only
                                               └──────────────────────────────────────────────┘
```

## App wiring

### 1. Stylesheets

```ts
// main.ts / main.tsx
import '@ezhana/design-tokens/css/tokens.css'
import '@ezhana/design-theme-ocean/style'
import '@ezhana/design-theme-cerulean/style'
import '@ezhana/design-theme-onyx/style'
import '@ezhana/design-theme-quest/style'
import './index.css'
```

`./style` is self-sufficient (core CSS + the theme's fonts + overrides), so an app that installs a
single theme can import just that one entry. The core stylesheet is imported by module id, so the
extra import above costs nothing at runtime; it documents the dependency.

### 2. Theme registry

```ts
// src/theme/registry.ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { theme as onyx } from '@ezhana/design-theme-onyx'
import { theme as quest } from '@ezhana/design-theme-quest'
import { defineThemeRegistry } from '@ezhana/theme'

export const themeRegistry = defineThemeRegistry([
  defaultThemeDefinition,
  ocean,
  cerulean,
  quest, // fixed-mode: modes: ['dark']
  onyx, // fixed-mode: modes: ['dark']
])
export type AppTheme = (typeof themeRegistry.themes)[number]
```

### 3. Manager

```ts
// src/theme/manager.ts
import { type Mode } from '@ezhana/design-tokens'
import { createThemeManager } from '@ezhana/theme'

import { themeRegistry, type AppTheme } from './registry'

export const themeManager = createThemeManager<AppTheme, Mode>({
  themes: [...themeRegistry.themes],
  modes: [...themeRegistry.modes], // union of all themes' modes
  themeModes: themeRegistry.themeModes, // per-theme subsets; clamps resolvedMode
  defaultTheme: themeRegistry.defaultTheme,
})
```

### 4. Switcher UI

The switcher renders `themeRegistry.themes` / `themeRegistry.themeLabels` and
`themeRegistry.modes`, and calls `setTheme` / `setMode`. It can read `themeRegistry.themeModes` to
disable mode options the selected theme does not support (for example `light` while QuestUI is
active). Adding a theme package to the registry is enough for it to appear in the UI.

## Installing a third-party theme

A theme package is a normal dependency; nothing in the app knows how it is built:

```bash
pnpm add @acme/design-theme
```

```ts
import '@acme/design-theme/style'

import { defaultThemeDefinition, type Mode } from '@ezhana/design-tokens'
import { theme as acme } from '@acme/design-theme'
import { createThemeManager, defineThemeRegistry } from '@ezhana/theme'

export const registry = defineThemeRegistry([defaultThemeDefinition, acme])
export type AppTheme = (typeof registry.themes)[number]

export const manager = createThemeManager<AppTheme, Mode>({
  themes: [...registry.themes],
  modes: [...registry.modes],
  defaultTheme: registry.defaultTheme,
})
```

`defineThemeRegistry` validates ids, labels and each definition's mode list; themes may declare
different (even single-mode) subsets. Pass `themeModes: registry.themeModes` to the manager so
`resolvedMode` is clamped to a mode the active theme supports. If a theme ships only `./theme.css`
(no `./style`), import the core stylesheet yourself and load the theme's fonts.

## Authoring a theme package

```text
my-theme/
├── package.json           # deps: @ezhana/design-tokens; devDeps: @ezhana/theme-builder
├── theme.config.mjs       # id, label, tokens, overrides, fonts, optional modes
├── tokens/
│   ├── palette.json       # theme-private palette, rooted at `theme.`
│   └── theme.json         # overrides: base + one section per declared color mode
├── scripts/build.mjs      # await buildTheme(new URL('../theme.config.mjs', import.meta.url))
└── dist/                  # generated: css/, js/, json/, style.js
```

The contract is enforced at build time:

- required overrides must exist in every color mode the theme declares (`modes` may be a subset;
  one declared mode produces a fixed-mode stylesheet);
- overrides must target existing semantic tokens;
- references may only use core primitives (`{primitive.*}`) or the theme's own tokens (`{theme.*}`);
- WCAG AA contrast is checked for the tokens the theme can change.

See [`packages/theme-builder/README.md`](../packages/theme-builder/README.md) for the full reference
and [`packages/design-theme-cerulean/tokens`](../packages/design-theme-cerulean/tokens) for a worked
example.

## Extending the core package

| Change                | What to do                                                                                                                            | Build/test                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Add a semantic token  | add it to `tokens/semantic/base.json` or the mode files, referencing primitives only; consume it in CSS                               | `pnpm build && pnpm test`; contract/contrast tests must pass |
| Add a color mode      | add `tokens/semantic/<mode>.json` with the same semantic set as `light.json`, add the mode block to every theme package               | builds list exactly what each file/theme is missing          |
| Add a primitive       | add it to `tokens/primitive/*.json`; only add what more than one theme needs — brand ramps belong to the theme package that uses them | `pnpm build`                                                 |
| Add a theme           | create a theme package with `@ezhana/theme-builder` (see above) and register it in the app; declare `modes` for a fixed-mode theme    | theme build + `pnpm test`                                    |
| Add a theme typeface  | set `fonts` in `theme.config.mjs` and override `font.family.*` in the theme; the generated `./style` entry loads the font             | theme build; check the font import in `dist/style.js`        |
| Add a component layer | create a separate `@ezhana/component-tokens` package that consumes semantic tokens only                                               | own tests/contract; no changes to `design-tokens`            |

Theme design narratives live with the theme package, e.g.
[`packages/design-theme-cerulean/docs/DESIGN.md`](../packages/design-theme-cerulean/docs/DESIGN.md)
(a measured palette/contrast narrative),
[`packages/design-theme-onyx/docs/DESIGN.md`](../packages/design-theme-onyx/docs/DESIGN.md)
(a black-gold business identity: palette, shape, type and elevation decisions) and
[`packages/design-theme-quest/docs/DESIGN.md`](../packages/design-theme-quest/docs/DESIGN.md)
(tokenized component recipes and composited-contrast checks).

## Build, CI and release flow

1. `pnpm build` → builds the core package, then every `packages/design-theme-*` package. The core
   must be built first: theme packages resolve its contract and stylesheet.
2. `pnpm test` → builds, then runs the core contract/contrast suite, the theme-builder suite, the
   theme runtime suite and every theme package's generated-artifact suite.
3. `pnpm create:app react|vue <name>` → scaffolds into `apps/<name>` with the pinned external
   generator, applies the theme overlay, adds theme dependencies and builds the generated app. Pass
   `--no-theme` to skip the overlay and theme packages and keep the plain official scaffold. Lint
   and format files are written only with `--eslint` / `--prettier`; the scaffold's own tooling is
   preserved by default. `pnpm create:app configure apps/<name> --eslint --prettier` writes thin app
   configs and adds the workspace config packages (`workspace:*`) plus `eslint`/`typescript` (or
   `prettier`) from the catalog. Both commands require a pnpm workspace that ships the config
   packages under `packages/`; outside it they stop with an error.
4. `pnpm export:template --install` → assembles the empty-apps `frontend-template`, copies the five
   lint/format config packages into its `packages/`, pins the published `create-ezhana-app`
   devDependency and creates its root lockfile.
5. CI (`.github/workflows/ci.yml`) runs `format:check`, `lint`, `test`; the
   `.github/workflows/create-app.yml` matrix generates React/Vue apps inside the workspace (default
   themed app, opt-in lint/format configs, and `--no-theme` incl. one combined no-theme+configs
   case) through lint/build, asserts the configured app config imports the workspace config package,
   asserts the no-theme apps carry no theme artifacts or theme packages, and packs the generator
   tarball; the generated template's own CI smoke-tests `pnpm create:app`, `pnpm create:app
configure` and `--no-theme`.
6. Publishing: Changesets bumps `@ezhana/design-tokens`, `@ezhana/theme-builder`,
   `@ezhana/design-theme-*`, `@ezhana/theme` and `create-ezhana-app`. The shared ESLint/Prettier
   config packages are private and are not published; the export copies them into the template.
   Publish the packages before the template export: the generated apps and `versions.json` reference
   published versions. The token and theme packages rebuild `dist/` in their `prepack` hooks, and the
   generator's `prepack` refreshes `versions.json`.

Release order matters: core → theme packages → generator → template export.

## Debugging checklist

| Symptom                                | Check                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Wrong theme on load                    | `document.documentElement.dataset` — is `theme` set? `localStorage.getItem('ezhana-theme')`                      |
| Mode does not follow the OS            | is `data-color-mode` absent? (if present, an explicit mode is active)                                            |
| Theme does not change                  | is the theme package's CSS imported? is the id registered in `defineThemeRegistry`? is `data-theme` updating?    |
| Theme package rejected                 | run its build: it lists the missing required override, unknown reference or failing contrast pair                |
| Token is undefined                     | `getComputedStyle(document.documentElement).getPropertyValue('--color-accent')`; run `pnpm build`                |
| Custom font missing                    | is the theme's `./style` entry (not `./theme.css`) imported, or the font package imported manually?              |
| Broken token reference                 | the build fails with the missing token path — fix the source, never the generated file                           |
| Flash of wrong theme                   | inline `<head>` script present and before the module script?                                                     |
| Generated app has no lint config       | pass `--eslint` (and `--prettier`) to `create:app`, or run `create:app configure`                                |
| `configure` errors about the workspace | run it inside the `frontend-template` / source workspace: the app configs compose packages that only exist there |
| `pnpm lint` still runs Oxlint          | `configure` does not change scripts; update `package.json` manually or remove the Oxlint config                  |

## File map

| File                                                         | Purpose                                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `packages/design-tokens/tokens/**`                           | core token sources (primitive / semantic)                                         |
| `packages/design-tokens/scripts/build.mjs`                   | Style Dictionary build + contract validation                                      |
| `packages/design-tokens/dist/**`                             | generated core CSS / JSON / contract / JS + d.ts (not committed)                  |
| `packages/theme-builder/lib/**`                              | validation, resolution and artifact generation for themes                         |
| `packages/design-theme-*/tokens/**`                          | theme-private palette + semantic overrides                                        |
| `packages/design-theme-*/theme.config.mjs`                   | theme identity, sources, fonts, contrast options                                  |
| `packages/theme/index.js`                                    | framework-agnostic theme runtime + `defineThemeRegistry`                          |
| `tools/create-app/overlays/*/src/theme/registry.ts`          | app theme registry                                                                |
| `tools/create-app/overlays/*/src/theme/manager.ts`           | app singleton wired to the registry                                               |
| `tools/create-app/overlays/*/src/theme/useTheme.ts`          | React / Vue adapter                                                               |
| `tools/create-app/overlays/*/src/components/ThemeSwitcher.*` | switcher UI                                                                       |
| `tools/create-app/overlays/*/src/main.*`                     | CSS import order                                                                  |
| `tools/create-app/templates/eslint-*.config.mjs`             | thin app ESLint configs written by `configure` (compose the workspace packages)   |
| `tools/create-app/templates/prettier.config.mjs`             | thin app Prettier config written by `configure` (re-exports the workspace config) |
| `packages/eslint-config-*`, `packages/prettier-config`       | shared lint/format config packages (not published; copied into the template)      |
| `tools/create-app/snippets/theme-init.html`                  | pre-paint inline script                                                           |
| `packages/design-theme-cerulean/docs/DESIGN.md`              | worked example of a theme's design narrative                                      |
| `packages/design-theme-onyx/docs/DESIGN.md`                  | black-gold business theme narrative: palette, shape, type and elevation           |
| `packages/design-theme-quest/docs/DESIGN.md`                 | dark-only theme narrative + tokenized component recipes                           |
| `docs/adr/0003-themes-as-packages.md`                        | the architecture decision for theme packages                                      |
