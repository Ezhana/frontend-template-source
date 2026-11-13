# ADR 0005: CSS-first theme presets

- **Status:** Accepted
- **Date:** 2026-11-13
- **Scope:** `@ezhana/design-tokens`, `@ezhana/theme-builder`, `@ezhana/theme`, all
  `@ezhana/design-theme-*` packages, the generated app template, consumer documentation
- **Supersedes:** the exports, artifacts and runtime API of
  [ADR 0003](0003-themes-as-packages.md). ADR 0003's core decision — themes ship as standalone,
  independently versioned packages that override semantic tokens — still stands.

## Context

ADR 0003 separated themes from the core package, but its delivery mechanism was a split between a
JavaScript entry and several CSS artifacts:

- a theme's `./style` was a JavaScript module that imported the core stylesheet, the font package
  CSS and the theme CSS;
- `./theme.css`, `./standalone.css`, `dist/css/*`, `dist/js/*` and `dist/json/*` were separate
  consumer paths;
- a theme-only consumer still had to know whether it needed the core package, the font packages or a
  bundler workaround;
- the optional runtime required `defineThemeRegistry(...)` plus repeated `modes`/`themeModes`
  arguments.

That model created practical problems:

1. **JS/CSS entry split.** Importing CSS through a theme's JavaScript entry made CSS resolution
   depend on the bundler. In SSR frameworks this surfaced as Vite dependency externalization: the
   package's CSS import had to be forced through `ssr.noExternal` (or an Astro plugin), or the build
   failed to resolve it. A design system should not require framework-specific configuration to
   load a stylesheet.
2. **No single self-contained artifact.** There was a "core + theme" path and a "standalone" path,
   with different behavior and different font story. A consumer who wanted one theme had to know
   where the core CSS lived and whether fonts were transitive.
3. **Font ownership leaked to consumers.** A theme's font packages were imported by the JS entry, so
   consumers could end up installing `@fontsource` packages or resolving a dependency's internal font
   URLs, depending on the bundler.
4. **The zero-JS contract was underused.** The CSS already supported `data-theme` and the optional
   `data-color-mode`, but the artifacts encouraged importing JavaScript and a runtime just to get
   styling. The attribute model was not the spine of the consumer workflow.
5. **Registry boilerplate.** `defineThemeRegistry` merged definitions into another object only to
   feed `createThemeManager`, duplicating ids, labels and modes and giving apps two shapes of the
   same metadata.
6. **Artifact paths were stale or ambiguous.** `dist/css/*`, `dist/js/*`, `dist/json/*`,
   `./standalone.css` and `./json` forced documentation and tests to track an internal directory
   layout rather than a small public contract.

The goal is a consumer surface that works the same in Astro, Vite, Next.js, plain HTML and SSR: one
CSS import for one theme, no JavaScript required, no font installs, and an optional runtime that is
genuinely optional.

## Decision

### 1. Every theme ships a complete, self-contained `style.css`

`@ezhana/design-theme-<id>/style.css` contains, in this order:

1. the theme's `@font-face` rules (font files are copied into `dist/fonts/` and referenced
   relatively);
2. the full `@ezhana/design-tokens` core stylesheet (primitives, default theme, light/dark/system
   modes);
3. the theme's semantic overrides under `:root[data-theme="<id>"]`.

The file has no unresolved `@import` and no package-internal URLs. A single CSS import — or a
`<link>` to the file — is a complete theme. A theme-only install needs no `@ezhana/design-tokens`
install in the app manifest, no `@fontsource` install, no JavaScript and no Vite/Astro workaround.
(`@ezhana/design-tokens` remains a normal dependency of the theme package, so it is installed
transitively.)

### 2. Split entries remain for multi-theme apps

The theme package also exports:

- `./theme.css` — theme overrides only; combined with the core stylesheet;
- `./fonts.css` — the rewritten `@font-face` rules only;
- `./theme.json` — resolved override and semantic values per declared mode;
- `.` — pure ESM metadata (`theme`, `themeId`, `themeLabel`, `modes`), importing no CSS;
- `./package.json`.

A multi-theme app imports `@ezhana/design-tokens/style.css` once, then each theme's `fonts.css` and
`theme.css`. Importing several complete `style.css` files is also valid, but it duplicates the core
block; the split path is recommended when more than one theme is installed.

### 3. CSS is the contract, not a JavaScript entry

- `<html data-theme="cerulean">` selects a theme. With no `data-theme`, the default theme applies.
- `data-color-mode="light" | "dark"` forces a mode; the attribute is optional.
- When `data-color-mode` is absent, CSS follows the OS through
  `@media (prefers-color-scheme: dark)`.
- An explicit mode always wins over the OS preference.
- All token declarations live in `@layer design-tokens`, so unlayered application CSS wins without
  specificity battles.
- A fixed-mode theme (`modes: ['dark']`) emits one rule that matches every `data-color-mode` state
  and pins `color-scheme`, so a stray mode attribute cannot flash a palette the theme does not have.

No JavaScript is required for theme selection, explicit modes or system mode. The theme packages do
not export a JavaScript CSS entry.

### 4. Fonts are build-time inputs

Font packages are `devDependencies` of a theme package. `@ezhana/theme-builder` resolves their CSS
entries, copies the font files into `dist/fonts/`, rewrites `url()` references to the local copies
and copies license files into `dist/fonts/licenses/`. Consumers never install a font package or
resolve a transitive font URL.

### 5. The optional runtime takes definitions, not a registry

`@ezhana/theme` remains an optional, SSR-safe state layer with no CSS. `createThemeManager` accepts
the theme definitions array directly:

```ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { createThemeManager } from '@ezhana/theme'

export const themeManager = createThemeManager({
  themes: [defaultThemeDefinition, ocean, cerulean],
})
```

- `themes` is a non-empty array of `{ id, label, modes }` definitions; the manager derives ids,
  labels and the union of supported modes.
- The first definition is the default unless `defaultTheme` is passed.
- `resolvedMode` is clamped to a mode the active theme supports; a fixed-mode theme never receives an
  unsupported `data-color-mode`.
- `defineThemeRegistry` and the `themeRegistry.themes` / `themeLabels` / `modes` / `themeModes`
  object no longer exist.
- Importing the runtime performs no DOM access; `root: null` runs it headless for SSR and tests.

### 6. Public export contracts

`@ezhana/design-tokens`:

```json
{
  ".": "./dist/index.js",
  "./style.css": "./dist/style.css",
  "./tokens.json": "./dist/tokens.json",
  "./contract.json": "./dist/contract.json",
  "./package.json": "./package.json"
}
```

Theme packages:

```json
{
  ".": "./dist/index.js",
  "./style.css": "./dist/style.css",
  "./theme.css": "./dist/theme.css",
  "./fonts.css": "./dist/fonts.css",
  "./theme.json": "./dist/theme.json",
  "./package.json": "./package.json"
}
```

`@ezhana/theme` and `@ezhana/theme-builder` keep a single `.` entry plus `./package.json`.

### 7. Verification is a packed-package integration test

`fixtures/astro-consumer` is a minimal Astro project that installs only
`@ezhana/design-theme-cerulean`, imports only its `style.css`, and uses `data-theme` /
`data-color-mode` with no Astro config workaround. `pnpm test:consumer` packs `pnpm pack` tarballs,
installs them into throwaway Astro projects and verifies install/dev/build, the cascade for explicit
light/dark and system light/dark, metadata/CSS/`theme.json` agreement, font files, the absence of the
optional runtime, and a multi-theme project that imports the core once. This test is the guard
against reintroducing JS/CSS entry coupling or a missing self-contained artifact.

## Consequences

### Positive

- **One import, one theme.** The primary consumer workflow is
  `pnpm add @ezhana/design-theme-<id>` + `@import "…/style.css"` + `data-theme`.
- **Framework-agnostic.** No Vite `noExternal`, Astro plugin or bundler-specific CSS handling.
- **Works without JavaScript.** Themes, explicit modes and system mode are pure CSS; the runtime is
  only switcher state.
- **No font package installs.** Fonts are copied into the published preset and resolved relatively.
- **Smaller runtime surface.** The definitions array removes the registry object and duplicated mode
  metadata; `resolvedMode` clamping lives in one place.
- **Small, stable export map.** Consumers and tests depend on six CSS/metadata entries, not an
  internal `dist/css|js|json` layout.
- **Better multi-theme behavior.** The core stylesheet is loaded once; each theme contributes only
  its overrides and fonts.
- **Self-contained pinning.** A theme package is built against the exact core version it declares,
  so its complete preset cannot drift from the contract.

### Negative / trade-offs

- **Theme packages are larger.** Each published preset embeds the full core stylesheet and its font
  files. A multi-theme app that imports several complete presets pays for several core copies; the
  split `theme.css`/`fonts.css` entries are the documented alternative.
- **Build tool required.** Theme authors must run `@ezhana/theme-builder` to produce the preset;
  hand-written CSS is possible but unvalidated.
- **Releases are still ordered.** Core → theme packages → generator → template export, because a
  theme's preset embeds the core stylesheet of the version it declares.
- **Import discipline is still a consumer concern.** CSS `@import` must precede other rules, and the
  core must be imported before the theme's `theme.css`; theme specificity makes order tolerant but
  the documented order remains the safe one.
- **The runtime API changed.** Apps using `defineThemeRegistry` must pass their definitions array to
  `createThemeManager` instead. The version bump and changelog call this out.

### Neutral

- The token contract (`contract.json` version 1), the DTCG theme source format, the builder
  validation rules and the `data-theme` / `data-color-mode` attribute model are unchanged.
- ADR 0003's layer ownership and theme-as-package model remain valid. This ADR changes how the
  package is delivered to consumers, not what a theme is.
- Fixed-mode themes still declare `modes`; the builder emits a single unconditional rule.

## Migration from ADR 0003

| Superseded surface                                  | Current surface                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `import '@ezhana/design-theme-<id>/style'` (JS)     | `@import '@ezhana/design-theme-<id>/style.css'` (CSS)              |
| `@ezhana/design-theme-<id>/standalone.css`          | `@ezhana/design-theme-<id>/style.css`                              |
| `@ezhana/design-tokens/css/tokens.css`              | `@ezhana/design-tokens/style.css`                                  |
| `@ezhana/design-theme-<id>/json`                    | `@ezhana/design-theme-<id>/theme.json`                             |
| `dist/css/theme.css`, `dist/css/standalone.css`     | `dist/theme.css`, `dist/style.css`                                 |
| `dist/js/index.js`, `dist/js/index.d.ts`            | `dist/index.js`, `dist/index.d.ts`                                 |
| `dist/json/theme.json`                              | `dist/theme.json`                                                  |
| Consumer font package installs                      | none; fonts ship in `dist/fonts/` and are imported via `fonts.css` |
| `defineThemeRegistry([...])` + `themeModes` options | `createThemeManager({ themes: themeDefinitions })`                 |
| Vite `ssr.noExternal` / Astro plugin workarounds    | none                                                               |
