# @ezhana/theme

Optional, framework-agnostic theme-state runtime for the Ezhana design system. It owns the switcher
state behind the CSS-first token packages: the user preference, `prefers-color-scheme` resolution,
`localStorage` persistence, frozen state snapshots and cross-tab synchronisation.

**Styling does not need this package.** The CSS contract is `data-theme` plus the optional
`data-color-mode` attribute on the document root; the token and theme stylesheets do all visual work
without JavaScript. Use this package only when an app needs a theme switcher with validated,
persisted state.

- **No CSS.** This package never imports or emits styles.
- **Zero runtime dependencies**, plain ESM, no build step.
- **Framework-agnostic** — React, Vue and Astro apps add a tiny adapter.
- **SSR-safe** — importing the package never touches `window` or `document`.
- **No theme dependency** — it accepts `{ id, label, modes }` definitions structurally, so it never
  imports a concrete theme package.
- **Per-theme mode support** — a theme may declare a subset of the app's color modes (for example
  dark-only); the runtime clamps `resolvedMode` to what the active theme supports.
- Written in plain JavaScript with JSDoc types; public types ship as a hand-written
  [`index.d.ts`](./index.d.ts).

## Installation

```sh
pnpm add @ezhana/theme
```

Inside this workspace, add `"@ezhana/theme": "workspace:*"` to the app's dependencies and run
`pnpm install`.

## The attribute contract

The theme runtime writes two attributes on `document.documentElement` (or a supplied root):

| Attribute         | Values                               | Written when                         | Selects                                                            |
| ----------------- | ------------------------------------ | ------------------------------------ | ------------------------------------------------------------------ |
| `data-theme`      | a theme id from the definitions      | always                               | theme-package overrides of semantic tokens (`:root[data-theme=…]`) |
| `data-color-mode` | a mode supported by the active theme | only for an explicit mode preference | semantic tokens for that mode (`[data-color-mode]`)                |

The mode attribute is **optional**. If it is absent, the stylesheet follows the operating system
through `@media (prefers-color-scheme: dark)`. That makes "follow system" the default and lets CSS
handle it correctly even before JavaScript runs. The runtime never writes `"system"` into
`data-color-mode`; it removes the attribute instead. The effective mode is still available in state
as `resolvedMode`.

```html
<!-- follow the OS color mode (default) -->
<html data-theme="cerulean"></html>

<!-- explicit color mode; wins over the OS preference -->
<html data-theme="cerulean" data-color-mode="dark"></html>
```

## Usage

Theme identities come from the theme packages. Every theme package exports a frozen `theme` object
(`{ id, label, modes }`), and `@ezhana/design-tokens` exports `defaultThemeDefinition` for the core
default theme. Pass the definitions you want to offer directly as `themes`:

```js
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { createThemeManager } from '@ezhana/theme'

export const themeManager = createThemeManager({
  themes: [defaultThemeDefinition, ocean, cerulean], // first one is the default
})

themeManager.setTheme('ocean')
themeManager.setMode('dark') // a mode, or 'system'
```

After `createThemeManager` returns, `data-theme` is applied and `data-color-mode` is either applied
for an explicit preference (using the resolved, theme-supported mode) or absent (`system`). There is
no registry builder: the manager derives the ids, labels and mode union from the definitions array.

The array can be typed with `as const` to derive the app's theme id union:

```ts
import type { Mode } from '@ezhana/design-tokens'

const themeDefinitions = [defaultThemeDefinition, cerulean, ocean] as const
type AppTheme = (typeof themeDefinitions)[number]['id']

export const themeManager = createThemeManager<AppTheme, Mode>({
  themes: themeDefinitions,
})
```

## State shape

`getState()` returns one frozen object:

| Field          | Type     | Meaning                                                                                                |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `theme`        | `string` | Validated theme identity (always one of `themes`).                                                     |
| `mode`         | `string` | Saved preference: a configured mode or `'system'`.                                                     |
| `resolvedMode` | `string` | Effective color mode for the active theme (preference or OS mode, clamped to what the theme supports). |
| `systemMode`   | `string` | What the OS currently prefers, mapped into the configured modes.                                       |

The snapshot is **referentially stable**: `getState()` returns the same object until a value actually
changes, and every change produces a new frozen object. That makes it directly usable with React's
`useSyncExternalStore`.

## API

### Constants

| Export                    | Value               |
| ------------------------- | ------------------- |
| `SYSTEM_MODE`             | `'system'`          |
| `DEFAULT_STORAGE_KEY`     | `'ezhana-theme'`    |
| `DEFAULT_THEME_ATTRIBUTE` | `'data-theme'`      |
| `DEFAULT_MODE_ATTRIBUTE`  | `'data-color-mode'` |

### `createThemeManager(options)`

| Option           | Default                    | Description                                                                                                                                                       |
| ---------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `themes`         | — (required)               | Non-empty array of theme definitions (`{ id, label, modes }`). Ids must be unique; `themes[0]` is the default theme unless `defaultTheme` is set.                 |
| `defaultTheme`   | `themes[0].id`             | Theme used when nothing valid is stored.                                                                                                                          |
| `defaultMode`    | `'system'`                 | Initial mode preference: a mode supported by at least one theme, or `'system'`.                                                                                   |
| `storageKey`     | `DEFAULT_STORAGE_KEY`      | localStorage key.                                                                                                                                                 |
| `themeAttribute` | `DEFAULT_THEME_ATTRIBUTE`  | Attribute receiving the theme identity.                                                                                                                           |
| `modeAttribute`  | `DEFAULT_MODE_ATTRIBUTE`   | Attribute receiving an explicit color mode.                                                                                                                       |
| `root`           | `document.documentElement` | Element receiving the attributes. Pass `null` for headless/SSR use; a minimal root needs `setAttribute` and performs no work when `null`.                         |
| `storage`        | `window.localStorage`      | `{ getItem, setItem }`-compatible object; pass `null` to disable persistence.                                                                                     |
| `matchMedia`     | `window.matchMedia`        | `window.matchMedia`-compatible function; `null` disables system tracking (the OS mode falls back to `light` when available, otherwise the first configured mode). |
| `eventTarget`    | `window`                   | Target for `storage` events; `null` disables cross-tab sync.                                                                                                      |

Invalid options throw `TypeError`. Invalid `setTheme` / `setMode` values throw `RangeError` whose
message lists the accepted values.

The manager derives the configured mode union from the definitions. A theme's `modes` array must be
non-empty; `'system'` is reserved and rejected as a declared mode.

### Manager

| Method                | Description                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getState()`          | Frozen, referentially stable `ThemeState`.                                                                                                                     |
| `setTheme(theme)`     | Validate, set, recompute `resolvedMode` for the new theme, persist, apply `data-theme`, notify. No-op (and no notification) when unchanged.                    |
| `setMode(mode)`       | Same, but accepts a configured mode or `'system'`. `system` removes `data-color-mode`; explicit preferences write the resolved mode the active theme supports. |
| `subscribe(listener)` | Observe changes; returns an idempotent unsubscribe. The listener is **not** called immediately.                                                                |
| `destroy()`           | Remove media-query and storage listeners, clear subscribers. Idempotent; later setters are no-ops.                                                             |

## Themes with different color modes

Theme packages declare the modes they actually implement, and the lists may differ. A theme can be
fixed to a single mode — for example a dark-only business theme next to the `light`/`dark` default:

```js
const themeDefinitions = [
  { id: 'default', label: 'Default', modes: ['light', 'dark'] },
  { id: 'quest', label: 'Quest', modes: ['dark'] },
]

const themeManager = createThemeManager({ themes: themeDefinitions })
// configured modes -> ['light', 'dark'] (union, first-seen order)
```

The manager clamps the **resolved** mode to the active theme:

- `resolvedMode` is always a mode the active theme declares. If the preference (or the OS mode, in
  `system` mode) is not supported, it falls back to the first mode in that theme's own list.
- An explicit preference is still accepted and persisted, but `data-color-mode` receives the clamped
  `resolvedMode`. When another configured theme supports `light`, `setMode('light')` on a dark-only
  theme writes `data-color-mode="dark"` while the stored preference stays `light`; it applies again
  after switching to a theme that supports it. (If no configured theme supports `light`, `light` is
  not a configured mode and `setMode('light')` throws `RangeError`.)
- In `system` mode the attribute stays absent, and `resolvedMode` is clamped to the active theme's
  supported modes.
- Switching themes, changing the mode preference, OS color-scheme changes and cross-tab storage syncs
  all recompute `resolvedMode`.

Because a preference can be unsupported by the active theme, a switcher should disable (or hide) mode
options the active theme does not support. Each definition is available from the array the app
already owns:

```js
const active = themeDefinitions.find((definition) => definition.id === state.theme)
const canUseLight = active?.modes.includes('light') ?? false // false for a dark-only theme
```

## Persistence

The preference is stored as JSON under `storageKey` (`ezhana-theme` by default):

```json
{ "theme": "cerulean", "mode": "system" }
```

At start-up the value is read defensively: storage read errors, malformed JSON and non-object
payloads are ignored, and each field is validated independently. An unknown theme falls back to
`defaultTheme`, an unknown mode falls back to `defaultMode`. Write errors (quota, privacy mode,
sandboxed iframes) are ignored.

Only the **preference** (`theme` + `mode`) is stored, never the clamped `resolvedMode`. Resolution
happens on load and after every theme/mode change, so a `light` preference resolves to `light` on a
full-mode theme and to `dark` on a dark-only theme without rewriting storage.

Cross-tab updates are received through the `storage` event: a valid payload from another tab updates
state and attributes without writing storage again.

## Following the OS preference

- `mode: 'system'` (the default) removes `data-color-mode`. The token stylesheet then applies
  `@media (prefers-color-scheme: dark)` and `color-scheme: light dark`.
- On OS changes the manager updates `systemMode` / `resolvedMode` and notifies subscribers. No
  attribute change is needed — CSS already follows the media query. The UI can still show the
  effective mode from `resolvedMode`.
- Explicit `light` / `dark` sets `data-color-mode`, which wins over the media query.

## SSR and headless use

- Importing the module is safe in Node/SSR; it never reads `window`/`document` at module scope.
- `createThemeManager` needs a `root` when no DOM is available. Pass `root: null` to run headless and
  inject the root on the client; pass `storage: null`, `matchMedia: null` and `eventTarget: null` to
  make the instance deterministic in tests and on the server.

```ts
const headless = createThemeManager({
  themes: themeDefinitions,
  root: null,
  storage: null,
  matchMedia: null,
  eventTarget: null,
})

headless.getState() // { theme: 'default', mode: 'system', resolvedMode: 'light', systemMode: 'light' }
```

- A minimal fake root needs `setAttribute` (and optionally `removeAttribute`); in tests pass fake
  storage / `matchMedia` / `eventTarget` to exercise all behaviour without a browser.
- For SSR, render the initial `data-theme` / `data-color-mode` on `<html>` from the same preference
  data, or let the inline script set them before hydration.

## Avoiding flash of wrong theme

Because "system" is CSS-driven, the inline `<head>` script only has to restore the stored theme and,
if present, the explicit color mode. It runs before the stylesheet is parsed:

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

The script is deliberately minimal. A fixed-mode theme ignores any explicit `data-color-mode`, so a
restored `light` attribute cannot make a dark-only theme light; the manager clamps `resolvedMode` and
rewrites the attribute once it initialises. If the default mode preference is not `system`, set it
explicitly with `defaultMode` in `createThemeManager`.

## Framework adapters

The package is framework-agnostic; apps add a tiny adapter. React:

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

Vue:

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

## Design decisions

- **Two attributes, one optional.** `data-theme` is always explicit because it is meaningful content
  (which visual identity). The color mode is optional so the default can be "follow the system"
  without JavaScript and without writing a resolved value into the DOM.
- **Definitions in, state out.** Theme packages export plain `{ id, label, modes }` objects; the
  manager derives ids, labels and the mode union. There is no separate registry object to keep in
  sync, and this package never depends on a concrete theme package.
- **Per-theme mode support, app-wide preferences.** The saved preference stays the user's choice; only
  the rendered `data-color-mode` is clamped, so a fixed-mode theme never receives an unsupported mode
  while a later switch to a full-mode theme still honours the preference.
- **No CSS in this package.** Token ownership stays in `@ezhana/design-tokens` and the theme packages;
  this package only writes state onto the root element.
- **No framework dependencies.** Adapters live in the apps; the core is testable with plain fakes.
