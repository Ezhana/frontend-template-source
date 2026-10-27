# Using design tokens and theming in a project

This guide explains how the pieces fit together end to end: what the two packages do, how an app is
wired, what happens at runtime when a user switches a theme or color mode, and how to extend the
system.

## Packages at a glance

| Package                                                        | Kind                    | Responsibility                                                                                                                                                            | Not responsible for                         |
| -------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [`@ezhana/design-tokens`](../packages/design-tokens/README.md) | Build-time data package | Token sources, Style Dictionary build, generated CSS variables + theme metadata + types, contract and contrast tests                                                      | Runtime state, storage, DOM, UI             |
| [`@ezhana/theme`](../packages/theme/README.md)                 | Runtime package         | Theme state machine: `data-theme` (and optional `data-color-mode`) on the root, user preference, `localStorage`, `prefers-color-scheme`, cross-tab sync, frozen snapshots | CSS, token values, components, framework UI |
| `@fontsource-variable/public-sans`                             | Static font assets      | Self-hosted variable font used by the Cerulean theme                                                                                                                      | Theme logic                                 |

The split is deliberate: the token package is **data + build**, the theme package is **state +
DOM attributes**. Neither knows about React or Vue; the apps add tiny adapters.

## The attribute model

Three pieces of state map onto two root attributes:

| attribute         | values                         | written when              | effect                             |
| ----------------- | ------------------------------ | ------------------------- | ---------------------------------- |
| `data-theme`      | `default`, `cerulean`, `ocean` | always                    | theme overrides of semantic tokens |
| `data-color-mode` | `light`, `dark`                | only for an explicit mode | semantic tokens for that mode      |

`data-color-mode` is **optional**. Without it the stylesheet follows the OS via
`@media (prefers-color-scheme: dark)`. So the default behavior is "follow the system", works before
JavaScript runs, and does not require writing a resolved mode value into the DOM. `system` is a
preference only; it is never written to `data-color-mode`.

## The complete flow

```text
              BUILD TIME                                                    RUNTIME
┌──────────────────────────────────┐          ┌──────────────────────────────────────────────┐
│ tokens/                          │          │ <head> inline script                         │
│   primitive/  raw values         │          │   restore stored data-theme                  │
│   semantic/   default theme      │          │   restore explicit data-color-mode (if any)  │
│   themes/     semantic overrides │          │            │                                 │
│            │                     │          │            ▼                                 │
│            ▼                     │          │ <html data-theme="cerulean"                  │
│ Style Dictionary build           │          │       [data-color-mode="dark"]>              │
│   contract validation            │──ship──▶ │            │                                 │
│   → dist/css/tokens.css          │          │            ▼                                 │
│   → dist/json/themes.json        │          │ tokens.css remaps semantic CSS variables     │
│   → dist/js index.js / .d.ts     │          │ (mode: attr or prefers-color-scheme)         │
└──────────────────────────────────┘          │            │                                 │
                                              │ app entry imports tokens.css                 │
                                              │            │                                 │
                                              │            ▼                                 │
                                              │ @ezhana/theme manager (module init)          │
                                              │   validate prefs, apply attributes, listen   │
                                              │            │                                 │
                                              │            ▼                                 │
                                              │ switcher UI ──setTheme/setMode──▶ manager    │
                                              │            │                                 │
                                              │   persist + apply attrs + notify ◀───────────┘
                                              │            │
                                              │            ▼
                                              │ component CSS uses --color-*,                │
                                              │ --font-*, --radius-*, ... automatically      │
                                              └──────────────────────────────────────────────┘
```

Key point: **the app never computes theme values**. It writes at most two attributes; CSS variable
resolution does the rest. Re-renders are limited to the switcher UI, not the whole app.

## Quick start in this repository

```bash
pnpm install                 # workspace dependencies
pnpm build:tokens            # generate dist/ locally for inspection
pnpm test                    # token contract/contrast tests + theme runtime tests
pnpm check                   # format:check + lint + tests

pnpm create:app react check-react --target /tmp/check-react   # generate to /tmp
pnpm create:app vue check-vue --target /tmp/check-vue
pnpm export:template --install            # assemble the generated frontend-template repository
```

The generated template apps import the published token CSS from npm, so they do not need a local
token build hook.

## Wiring an app (what the generator overlay does)

Both generated templates follow the same five steps. The overlay lives in
[`tools/create-app/overlays`](../tools/create-app/overlays); a new app generated by `pnpm create:app`
gets the same integration.

### 1. Add the workspace dependencies

```json
{
  "dependencies": {
    "@ezhana/design-tokens": "workspace:*",
    "@ezhana/theme": "workspace:*",
    "@fontsource-variable/public-sans": "^5.3.0"
  }
}
```

The font package is only needed if you use a theme with a custom typeface (Cerulean). The other
themes use system stacks.

### 2. Import the generated CSS in the entry file

Order matters: font faces → token stylesheet → application CSS.

```ts
// main.tsx / main.ts
import '@fontsource-variable/public-sans'
import '@ezhana/design-tokens/css/tokens.css'
import './index.css' // application styles last
```

### 3. Prevent the wrong-theme flash with an inline `<head>` script

This runs before the stylesheet is parsed, so the first paint already has the right attributes. It
only restores the stored preference; the runtime manager re-validates afterwards. The color mode is
optional — leaving it out is what makes the CSS follow the OS.

```html
<script>
  ;(function () {
    var root = document.documentElement
    var stored = null
    try {
      stored = JSON.parse(localStorage.getItem('ezhana-theme') || 'null')
    } catch (error) {
      stored = null
    }
    root.setAttribute(
      'data-theme',
      (stored && typeof stored.theme === 'string' && stored.theme) || 'default',
    )
    if (stored && (stored.mode === 'light' || stored.mode === 'dark')) {
      root.setAttribute('data-color-mode', stored.mode)
    } else {
      root.removeAttribute('data-color-mode')
    }
  })()
</script>
```

### 4. Create one theme manager per app

The manager is a browser-wide singleton. Feed it the generated metadata so the switcher UI and the
validation automatically track the token package.

```ts
// src/theme/manager.ts
import { defaultTheme, modes, themes, type Mode, type Theme } from '@ezhana/design-tokens'
import { createThemeManager } from '@ezhana/theme'

export const themeManager = createThemeManager<Theme, Mode>({
  themes: [...themes],
  modes: [...modes],
  defaultTheme,
})
```

`createThemeManager` reads the stored preference, resolves `system` against
`prefers-color-scheme`, applies `data-theme` (and `data-color-mode` only for an explicit mode) and
subscribes to OS and cross-tab changes. Nothing else is needed for theming to work.

### 5. Add a framework adapter and a switcher UI

React (`tools/create-app/overlays/react/src/theme/useTheme.ts`):

```ts
import { useSyncExternalStore } from 'react'
import { themeManager } from './manager'

export function useTheme() {
  const state = useSyncExternalStore(
    themeManager.subscribe,
    themeManager.getState,
    themeManager.getState,
  )
  return {
    ...state,
    setTheme: (theme) => themeManager.setTheme(theme),
    setMode: (mode) => themeManager.setMode(mode),
  }
}
```

Vue (`tools/create-app/overlays/vue/src/theme/useTheme.ts`):

```ts
import { onScopeDispose, shallowRef } from 'vue'
import { themeManager } from './manager'

export function useTheme() {
  const state = shallowRef(themeManager.getState())
  const unsubscribe = themeManager.subscribe((next) => {
    state.value = next
  })
  onScopeDispose(unsubscribe)
  return {
    state,
    setTheme: (theme) => themeManager.setTheme(theme),
    setMode: (mode) => themeManager.setMode(mode),
  }
}
```

The switcher components ([React](../tools/create-app/overlays/react/src/components/ThemeSwitcher.tsx),
[Vue](../tools/create-app/overlays/vue/src/components/ThemeSwitcher.vue)) render:

- a theme `<select>` whose options come from `themes` + `themeLabels`;
- Light / Dark / System toggle buttons driven by `mode` + `setMode` (`aria-pressed` for state);
- a focus ring and semantic-token styling, so the switcher itself follows the active theme.

## Runtime lifecycle

1. **First paint** — the inline script sets `data-theme` and, for explicit preferences,
   `data-color-mode`. The generated CSS has a `:root` fallback for the default theme + light mode and
   a `prefers-color-scheme` dark media query, so the page is styled even with JavaScript disabled.
2. **Module init** — importing the manager module creates the singleton: it validates the stored
   `{ theme, mode }` against the generated metadata, computes the system preference, applies the
   attributes and attaches listeners.
3. **User interaction** — `setTheme('ocean')` / `setMode('dark')`:
   - validate the value (invalid values throw; persisted values fall back silently),
   - update the frozen state snapshot,
   - persist `{ theme, mode }` to `localStorage` (best effort),
   - write the attributes (`setMode('system')` **removes** `data-color-mode`),
   - notify subscribers → only the switcher re-renders.
4. **OS preference change** — while the preference is `system`, the manager updates `systemMode` /
   `resolvedMode` and notifies subscribers. The stylesheet already follows the media query; no
   attribute changes are needed. Explicit modes are unaffected.
5. **Another tab** — the `storage` event updates the state and attributes without writing storage
   again.
6. **Reload** — the inline script renders the right attributes immediately; the manager then
   re-validates and continues from the persisted preference.

## Using tokens in component CSS

Components consume **semantic tokens only**:

```css
.card {
  color: var(--color-fg);
  background: var(--color-bg-subtle);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-surface);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-body);
}
```

- `--primitive-*` is for layout spacing and debugging; do not use palette primitives for themed
  properties.
- No raw hex values and no hard-coded font names. If a component needs a value that does not exist,
  add a semantic token and rebuild.
- The generated CSS lives in `@layer design-tokens`, so plain application CSS can override a token
  locally without specificity battles:

  ```css
  .checkout {
    --radius-control: 0;
  }
  ```

- If a component system needs its own vocabulary (`--button-bg`, `--card-padding`), create the
  optional component-token package described in the
  [token README](../packages/design-tokens/README.md#component-layer-optional). It references
  semantic tokens only, so themes and color modes keep working automatically.

## What `@ezhana/theme` is for

It exists because theme switching is **state**, not styling:

- a stored user preference (`light` / `dark` / `system`) plus a theme identity (`data-theme`);
- resolution of `system` through `prefers-color-scheme`;
- validation against the generated `themes` / `modes` lists;
- persistence and cross-tab synchronisation;
- a stable, frozen, framework-agnostic state snapshot.

It deliberately does **not** ship:

- CSS or token values (that is `@ezhana/design-tokens`),
- React/Vue providers or components (the apps own tiny adapters and their switcher UI),
- a stylesheet loader (all themes ship in one CSS file),
- any framework dependency (zero runtime dependencies, SSR-safe import, fully unit-tested with fake
  DOM/storage/media-query objects).

That separation makes it usable in React, Vue, static HTML, SSR, tests, and future frameworks
without changing the token architecture.

## Extending the system

| Change                | What to do                                                                                                                                                                       | Build/test                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Add a theme           | add `packages/design-tokens/tokens/themes/<theme>.json` with `base` + each mode, satisfying the theme contract; see [README](../packages/design-tokens/README.md#adding-a-theme) | `pnpm build:tokens && pnpm test`; switcher picks it up automatically |
| Add a color mode      | add `tokens/semantic/<mode>.json` (same semantic set as `light`) + add the mode block to every theme                                                                             | build errors list what each theme is missing                         |
| Add a semantic token  | add it to `semantic/base.json` or the light/dark mode files, reference primitives only; consume it in CSS                                                                        | contract/contrast tests must pass                                    |
| Add a theme typeface  | override `font.family.sans` / `font.family.heading` in a theme file and load the font in the app entry                                                                           | only Cerulean currently does this (Public Sans)                      |
| Add a component layer | create a separate `@ezhana/component-tokens` package that consumes semantic tokens only                                                                                          | own tests/contract; no changes to `design-tokens`                    |

Theme design narratives live with the token package, e.g. [`@ezhana/design-tokens/docs/themes/cerulean/DESIGN.md`](../packages/design-tokens/docs/themes/cerulean/DESIGN.md); Cerulean is a
complete worked example (custom palette, Public Sans, level-2 shape/spacing, measured contrast).

## Build, CI and release flow

1. `pnpm build:tokens` → validates contracts and emits `dist/` (not committed).
2. `pnpm test` → resolved-theme JSON is checked for contract completeness and WCAG AA contrast; the
   theme runtime tests use fake DOM/storage/media queries.
3. `pnpm create:app react|vue <name>` → scaffolds into `apps/<name>` with the pinned external
   generator, applies the config/theme overlay, then installs, lints and builds the generated app.
4. `pnpm export:template --install` → assembles the empty-apps `frontend-template`, pins the
   published `create-ezhana-app` devDependency and creates its root lockfile.
5. CI (`.github/workflows/ci.yml`) runs `format:check`, `lint`, `test`; the
   `.github/workflows/create-app.yml` matrix runs the generated React/Vue apps through lint/build and
   packs the generator tarball; the generated template's own CI smoke-tests `pnpm create:app`.
6. Publishing: Changesets bumps `@ezhana/design-tokens` / `@ezhana/theme` / `create-ezhana-app`; the
   token package's `prepack` rebuilds `dist/` and the generator's `prepack` refreshes
   `versions.json`, so the published tarballs contain the generated artifacts.

## Debugging checklist

| Symptom                     | Check                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Wrong theme on load         | `document.documentElement.dataset` — is `theme` set? `localStorage.getItem('ezhana-theme')`                                 |
| Mode does not follow the OS | is `data-color-mode` absent? (if present, an explicit mode is active)                                                       |
| Theme does not change       | Is the manager module imported? Is `data-theme` updating? Is token CSS loaded before app CSS?                               |
| Token is undefined          | `getComputedStyle(document.documentElement).getPropertyValue('--color-accent')`; run `pnpm build:tokens`                    |
| Custom font missing         | `document.fonts.check('16px "Public Sans Variable"')`; is the font package imported in the entry file and the theme active? |
| Broken token reference      | the build fails with the missing token path — fix it in the source rather than in generated files                           |
| Flash of wrong theme        | inline `<head>` script present and before the module script?                                                                |

## File map

| File                                                         | Purpose                                          |
| ------------------------------------------------------------ | ------------------------------------------------ |
| `packages/design-tokens/tokens/**`                           | token sources (primitive / semantic / themes)    |
| `packages/design-tokens/scripts/build.mjs`                   | Style Dictionary build + validation              |
| `packages/design-tokens/dist/**`                             | generated CSS / JSON / JS + d.ts (not committed) |
| `packages/theme/index.js`                                    | framework-agnostic theme runtime                 |
| `tools/create-app/overlays/*/src/theme/manager.ts`           | app singleton wired to generated metadata        |
| `tools/create-app/overlays/*/src/theme/useTheme.ts`          | React / Vue adapter                              |
| `tools/create-app/overlays/*/src/components/ThemeSwitcher.*` | switcher UI                                      |
| `tools/create-app/overlays/*/src/main.*`                     | CSS/font import order                            |
| `tools/create-app/snippets/theme-init.html`                  | pre-paint inline script                          |
| `packages/design-tokens/docs/themes/cerulean/DESIGN.md`      | worked example of a theme's design narrative     |
