# Using the Ezhana design system

This is the consumer guide: how to install a theme or the core tokens, how the zero-JavaScript
theme/mode contract works, when to add the optional runtime, how to build a custom theme, and how to
wire it into Astro, Vite, Next.js, plain HTML or Tailwind.

The architecture decision behind the current CSS-first preset design is
[ADR 0005](adr/0005-css-first-theme-presets.md). The historical theme-package decision is
[ADR 0003](adr/0003-themes-as-packages.md).

## Packages at a glance

| Package                                                                        | Kind            | Responsibility                                                                                      | Not responsible for             |
| ------------------------------------------------------------------------------ | --------------- | --------------------------------------------------------------------------------------------------- | ------------------------------- |
| [`@ezhana/design-tokens`](../packages/design-tokens/README.md)                 | build-time data | primitive scale, semantic contract, default theme, complete core stylesheet, contract JSON, types   | themes, runtime state, DOM      |
| [`@ezhana/theme-builder`](../packages/theme-builder/README.md)                 | build-time tool | validate a theme package against the contract; emit the complete preset, split CSS, fonts, metadata | runtime state, app wiring       |
| [`@ezhana/design-theme-cerulean`](../packages/design-theme-cerulean/README.md) | theme package   | Cerulean palette, Public Sans, semantic overrides, light + dark                                     | other themes, app code          |
| [`@ezhana/design-theme-ocean`](../packages/design-theme-ocean/README.md)       | theme package   | Ocean palette, pill-shaped controls, light + dark                                                   | other themes, app code          |
| [`@ezhana/design-theme-onyx`](../packages/design-theme-onyx/README.md)         | theme package   | Onyx black-gold business palette, Public Sans, dark-only                                            | other themes, app code          |
| [`@ezhana/design-theme-quest`](../packages/design-theme-quest/README.md)       | theme package   | QuestUI fantasy palette, Cinzel/Spectral/Fira Code, dark-only                                       | other themes, app code          |
| [`@ezhana/design-theme-obsidian`](../packages/design-theme-obsidian/README.md) | theme package   | Obsidian & Gold palette, Inter + Playfair Display, dark-only                                        | other themes, app code          |
| [`@ezhana/typography-editorial`](../packages/typography-editorial/README.md)   | CSS preset      | scoped editorial typography for long-form content, theme-aware and Preflight-resilient              | page layout, palette, fonts, JS |
| [`@ezhana/theme`](../packages/theme/README.md)                                 | runtime         | optional theme/mode state: definitions array, persistence, `prefers-color-scheme`, cross-tab sync   | CSS, token values, components   |

The split is deliberate: tokens, theme presets and typography are **static CSS data**, and the
optional runtime is **state + DOM attributes**. No package knows about React or Vue; apps add tiny
adapters.

## Installation

### A — one theme package (recommended for a single-theme app)

```bash
pnpm add @ezhana/design-theme-cerulean
```

```css
/* src/styles/global.css */
@import '@ezhana/design-theme-cerulean/style.css';
```

```html
<html data-theme="cerulean">
  <!-- content; color mode follows the OS -->
</html>
```

That is the complete setup. The theme package declares `@ezhana/design-tokens` as a normal
dependency, so the core is installed automatically. `style.css` contains:

1. the theme's `@font-face` rules (fonts are copied into the theme's `dist/fonts/`);
2. the full core stylesheet (primitives, semantic defaults, light/dark/system rules);
3. the theme's semantic overrides under `:root[data-theme="cerulean"]`.

Consequences:

- no separate `@ezhana/design-tokens` install;
- no `@fontsource` install;
- no JavaScript and no `@ezhana/theme`;
- no Vite `ssr.noExternal`, Astro plugin or CSS workaround.

### B — the core package only

```bash
pnpm add @ezhana/design-tokens
```

```css
@import '@ezhana/design-tokens/style.css';
```

With no `data-theme` attribute the core default theme applies. Use this when the default theme fits,
or as the base for a hand-written custom theme. You can still add `data-color-mode="light"` or
`"dark"`; leaving it off follows the OS.

### C — several themes

Install the core package and each theme package:

```bash
pnpm add @ezhana/design-tokens @ezhana/design-theme-cerulean @ezhana/design-theme-ocean
```

Import the core stylesheet once, then each theme's fonts and overrides:

```css
/* src/styles/global.css */
@import '@ezhana/design-tokens/style.css';
@import '@ezhana/design-theme-cerulean/fonts.css';
@import '@ezhana/design-theme-cerulean/theme.css';
@import '@ezhana/design-theme-ocean/fonts.css';
@import '@ezhana/design-theme-ocean/theme.css';
```

Select a theme per page/app with the attribute:

```html
<html data-theme="cerulean"></html>
<html data-theme="ocean" data-color-mode="light"></html>
```

Ocean ships no font assets, so its `fonts.css` is just a generated comment; importing it keeps one
uniform pattern and is harmless.

Importing several complete `style.css` files also works, but each one includes the full core
stylesheet, so the core block is duplicated in the bundle. Prefer the core + `theme.css` +
`fonts.css` path for multi-theme apps.

### Which CSS entry do I import?

| Setup                     | Import                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| One theme                 | `@ezhana/design-theme-<id>/style.css`                                                           |
| Core only                 | `@ezhana/design-tokens/style.css`                                                               |
| Several themes            | `@ezhana/design-tokens/style.css` then each `@ezhana/design-theme-<id>/fonts.css` + `theme.css` |
| Plain HTML without bundle | `<link rel="stylesheet" href="…/dist/style.css">` from a theme package                          |

Do not import both a theme's `style.css` and `@ezhana/design-tokens/style.css`; the preset already
contains the core. If you use `theme.css` directly, import the core and the matching `fonts.css`.

## The attribute contract (no JavaScript)

Two attributes on `<html>` select the visual result:

| Attribute         | Values                 | Written when                         | Effect                                               |
| ----------------- | ---------------------- | ------------------------------------ | ---------------------------------------------------- |
| `data-theme`      | any installed theme id | always (or absent for the default)   | theme package overrides (`:root[data-theme="<id>"]`) |
| `data-color-mode` | `light`, `dark`        | only for an explicit mode preference | semantic tokens for that mode (`[data-color-mode]`)  |

- No `data-theme` attribute (or `data-theme="default"`) means the core default theme.
- **`data-color-mode` is optional.** Without it the stylesheet follows the OS via
  `@media (prefers-color-scheme: dark)`.
- **Explicit light/dark always wins over the OS preference.** The explicit blocks and the system
  media query are separate and the explicit attribute removes the system-preference selector.
- `system` is a runtime/UI preference only; it is never written into the DOM.
- No JavaScript is required for theme selection, explicit modes or system mode.

```html
<!-- default theme, follow the OS -->
<html></html>

<!-- theme only, follow the OS -->
<html data-theme="cerulean"></html>

<!-- explicit dark, even if the OS is light -->
<html data-theme="cerulean" data-color-mode="dark"></html>

<!-- explicit light, even if the OS is dark -->
<html data-theme="cerulean" data-color-mode="light"></html>
```

All token CSS is emitted into `@layer design-tokens`, so unlayered application CSS wins without
specificity battles:

```css
.checkout {
  --radius-control: 0; /* overrides the layered theme token */
}
```

### Themes that ignore the mode

A fixed-mode theme (Onyx, Quest and Obsidian declare `modes: ['dark']`) always applies its single
palette. `data-color-mode` is ignored, including a stray `light`, because the generated rule matches
every attribute state. If a user needs a light option, choose a light+dark theme (Cerulean or Ocean)
or the default theme.

## Using the tokens

Semantic tokens are the public API. Every documented variable below exists in the core stylesheet
and is themeable:

- **Surfaces/text:** `--color-bg`, `--color-bg-subtle`, `--color-surface`,
  `--color-surface-elevated`, `--color-fg`, `--color-fg-muted`, `--color-fg-strong`,
  `--color-border`, `--color-border-subtle`
- **Accent/info:** `--color-accent`, `--color-accent-hover`, `--color-on-accent`,
  `--color-accent-subtle`, `--color-accent-border`, `--color-focus-ring`, `--color-info`,
  `--color-info-solid`, `--color-on-info`, `--color-info-subtle`
- **Status:** `--color-danger`, `--color-danger-solid`, `--color-on-danger`,
  `--color-danger-subtle`, `--color-success`, `--color-success-subtle`, `--color-warning`,
  `--color-warning-subtle`
- **Typography:** `--font-family-sans`, `--font-family-heading`, `--font-family-mono`,
  `--font-size-body`, `--font-size-h1`, `--font-size-caption`, `--font-size-code`,
  `--font-weight-body`, `--font-weight-bold`, `--font-line-height-body`,
  `--font-line-height-heading`, `--font-letter-spacing-label`
- **Shape/elevation:** `--radius-control`, `--radius-small`, `--radius-surface`, `--radius-modal`,
  `--radius-panel`, `--radius-pill`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`,
  `--shadow-glow`
- **Layout/motion:** `--border-width-default`, `--border-width-strong`, `--size-content`,
  `--motion-duration-fast`, `--motion-duration-normal`, `--motion-easing-standard`

Primitive tokens (`--primitive-*`) are raw material. Use them for layout scales that have no semantic
layer — especially spacing (`--primitive-space-4`) — but use semantic tokens for anything a theme
should be able to change.

```css
.card {
  padding: var(--primitive-space-6);
  color: var(--color-fg);
  background: var(--color-surface);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-surface);
  box-shadow: var(--shadow-sm);
}
```

The full grouped reference, default values, theme contract and contrast guarantees live in
[`packages/design-tokens/README.md`](../packages/design-tokens/README.md#token-reference).

## Editorial typography

Rendered long-form content is styled by the optional, CSS-only
[`@ezhana/typography-editorial`](../packages/typography-editorial/README.md) preset:

```bash
pnpm add @ezhana/typography-editorial
```

```css
@import '@ezhana/design-theme-cerulean/style.css';
@import '@ezhana/typography-editorial/style.css';
```

```html
<article class="ez-editorial">
  <!-- rendered Markdown or article content -->
</article>
```

The preset owns headings, paragraphs, lists, links and focus rings, blockquotes, inline code and
code-block containers, tables, images/figures and rules. It reads the active theme's semantic
variables, so it follows `data-theme` and `data-color-mode` automatically; it declares no palette
and ships no JavaScript or fonts. It does not own the reading column, page layout, Markdown parsing
or syntax highlighting.

Six package-scoped properties tune the preset on `.ez-editorial`: `--ez-editorial-font-size`,
`--ez-editorial-line-height`, `--ez-editorial-heading-scale`, `--ez-editorial-heading-line-height`,
`--ez-editorial-paragraph-spacing` and `--ez-editorial-block-spacing`. See the package README for the
defaults and the full element coverage.

## Theme switching

### Without JavaScript

Set the attributes wherever the page is rendered — server template, static HTML, Astro layout or a
front-end framework's root element:

```html
<html data-theme="ocean" data-color-mode="dark"></html>
```

The CSS does the rest. There is no CSS-in-JS, no re-render and no loading state.

### With the optional runtime

Use [`@ezhana/theme`](../packages/theme/README.md) when the app needs a switcher with persisted,
validated state. Install it and pass the theme definitions array directly:

```bash
pnpm add @ezhana/theme
```

```ts
// src/theme/manager.ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { createThemeManager } from '@ezhana/theme'

export const themeDefinitions = [defaultThemeDefinition, ocean, cerulean] as const

export const themeManager = createThemeManager({
  themes: themeDefinitions,
})
```

The manager:

- derives theme ids/labels and the union of supported modes from the definitions;
- reads and validates the stored preference (`localStorage` key `ezhana-theme`);
- applies `data-theme` and writes `data-color-mode` only for an explicit mode;
- tracks `prefers-color-scheme` while the preference is `system`;
- clamps `resolvedMode` (and the written `data-color-mode`) to a mode the active theme supports;
- persists `{ theme, mode }` and syncs across tabs;
- exposes `getState`, `setTheme`, `setMode`, `subscribe`, `destroy`.

```ts
themeManager.getState()
// { theme: 'default', mode: 'system', resolvedMode: 'dark', systemMode: 'dark' }

themeManager.setTheme('ocean')
themeManager.setMode('light') // writes data-color-mode="light"
themeManager.setMode('system') // removes data-color-mode; CSS follows the OS
```

`getState()` is referentially stable, so it plugs into React's `useSyncExternalStore` or a Vue
`shallowRef` without extra memoisation. The runtime is SSR-safe: importing it touches no DOM, and
`root: null` runs it headless.

A switcher should list `themeDefinitions` for theme options and disable modes the active theme does
not support:

```ts
const active = themeDefinitions.find((definition) => definition.id === state.theme)
const canUseLight = active?.modes.includes('light') ?? false
```

### Avoiding a flash of the wrong theme

An inline classic script in `<head>` restores the stored theme before the stylesheet is parsed. The
template overlay ships this script:

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

It must run before the module script and before the stylesheet is parsed. The script is deliberately
small: it restores the preference, and the theme manager later clamps the resolved mode for
fixed-mode themes.

## Light, dark and system

The three states are expressed entirely with the CSS contract:

| User choice | DOM state                      | CSS result                                    |
| ----------- | ------------------------------ | --------------------------------------------- |
| System      | no `data-color-mode` attribute | `@media (prefers-color-scheme: dark)` decides |
| Light       | `data-color-mode="light"`      | light values, regardless of the OS            |
| Dark        | `data-color-mode="dark"`       | dark values, regardless of the OS             |

`color-scheme` follows the same attribute, so native form controls and scrollbars match. The runtime
stores `system` as the default preference; a persisted `light` or `dark` is explicit. Only the
preference is stored — never the resolved mode — so a `light` preference can resolve to `dark` on a
dark-only theme without rewriting storage.

## Creating a custom theme

A custom theme is an npm package built with
[`@ezhana/theme-builder`](../packages/theme-builder/README.md). Full details are in that package's
README; the flow is:

```text
my-theme/
├── package.json           # dependency: @ezhana/design-tokens; devDeps: builder + fonts
├── theme.config.mjs       # id, label, description, tokens, overrides, fonts, optional modes
├── tokens/
│   ├── palette.json       # theme-private DTCG tokens, all under `theme.*`
│   └── theme.json         # semantic overrides: base + one section per declared color mode
├── scripts/build.mjs      # await buildTheme(new URL('../theme.config.mjs', import.meta.url))
└── dist/                  # generated: style.css, theme.css, fonts.css, fonts/, index.js, theme.json
```

```js
// theme.config.mjs
import { defineTheme } from '@ezhana/theme-builder'

export default defineTheme({
  id: 'acme',
  label: 'ACME',
  description: 'ACME brand theme.',
  tokens: ['tokens/palette.json'],
  overrides: 'tokens/theme.json',
  fonts: ['@fontsource-variable/inter'], // optional, devDependency only
})
```

```json
// tokens/theme.json (abridged)
{
  "base": {
    "font": {
      "family": {
        "sans": { "$value": "Inter, sans-serif", "$type": "fontFamily" },
        "heading": { "$value": "Inter, sans-serif", "$type": "fontFamily" }
      }
    },
    "radius": { "control": { "$value": "8px", "$type": "dimension" } }
  },
  "light": {
    "color": {
      "accent": { "$value": "{theme.color.acme.600}", "$type": "color" },
      "accent-hover": { "$value": "{theme.color.acme.700}", "$type": "color" },
      "on-accent": { "$value": "{primitive.color.neutral.0}", "$type": "color" },
      "accent-subtle": { "$value": "#0057b81a", "$type": "color" },
      "accent-border": { "$value": "#0057b880", "$type": "color" },
      "focus-ring": { "$value": "{theme.color.acme.600}", "$type": "color" }
    }
  },
  "dark": {
    "color": {
      "accent": { "$value": "#69aaff", "$type": "color" },
      "accent-hover": { "$value": "#93c5fd", "$type": "color" },
      "on-accent": { "$value": "{primitive.color.neutral.950}", "$type": "color" },
      "accent-subtle": { "$value": "#69aaff26", "$type": "color" },
      "accent-border": { "$value": "#69aaff80", "$type": "color" },
      "focus-ring": { "$value": "#69aaff", "$type": "color" }
    }
  }
}
```

Build-time validation enforces:

- the required overrides in every declared mode (`base`: `font.family.sans`,
  `font.family.heading`, `radius.control`; each mode: `color.accent`, `color.accent-hover`,
  `color.on-accent`, `color.accent-subtle`, `color.accent-border`, `color.focus-ring`);
- overrides target existing semantic tokens;
- references only use core primitives (`{primitive.*}`) or the theme's own tokens (`{theme.*}`);
- WCAG AA contrast (4.5:1) for the resolved foreground/background pairs;
- `@ezhana/design-tokens` is declared as a dependency; fonts are devDependencies and are copied into
  `dist/fonts/`.

Declare `modes: ['dark']` for a fixed dark-only identity; omit `modes` to support every contract
mode. Publish the package, then consumers can use it exactly like an official theme:

```css
@import '@acme/design-theme/style.css';
```

```html
<html data-theme="acme"></html>
```

Add `{ id: 'acme', label: 'ACME', modes: [...] }` (the package's `theme` export) to the definitions
array only if the app uses the optional runtime.

## Astro integration

Astro works with a plain CSS import; no integration, Vite `ssr.noExternal` entry or plugin is
required. A minimal project installs only the theme and Astro:

```json
{
  "dependencies": {
    "@ezhana/design-theme-cerulean": "^1.0.0",
    "astro": "^7.4.11"
  }
}
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'

export default defineConfig({})
```

```css
/* src/styles/global.css */
@import '@ezhana/design-theme-cerulean/style.css';
```

```astro
---
// src/layouts/Layout.astro
import '../styles/global.css'

const { theme = 'cerulean', colorMode = null } = Astro.props
---

<!doctype html>
<html lang="en" data-theme={theme} data-color-mode={colorMode}>
  <head>
    <meta charset="utf-8" />
    <title>My app</title>
  </head>
  <body><slot /></body>
</html>
```

Passing `colorMode={null}` (or leaving it out) omits the attribute, so Astro-rendered pages follow
the OS by default while explicit pages can force a mode:

- `/` — `data-theme="cerulean"`, no `data-color-mode` → system
- `/light` — `data-color-mode="light"`
- `/dark` — `data-color-mode="dark"`
- `/default-theme` — no `data-theme` → core default theme

The repository's [`fixtures/astro-consumer`](../fixtures/astro-consumer) is exactly this project. It
is the integration test for the published packages:

```bash
pnpm test:consumer
```

`pnpm test:consumer` packs `@ezhana/design-tokens`, `@ezhana/design-theme-cerulean`,
`@ezhana/design-theme-ocean` and `@ezhana/typography-editorial` with `pnpm pack`, installs the
tarballs into throwaway Astro projects and verifies:

- install, dev server and production build succeed with no Astro/Vite CSS workaround;
- the single-theme project declares the theme + typography preset + Astro as dependencies and
  imports `@ezhana/design-theme-cerulean/style.css` plus `@ezhana/typography-editorial/style.css`;
- the built CSS contains the semantic tokens, the theme selector, `@font-face`, the scoped editorial
  rules and the responsive typography breakpoint, and the build emits the font files;
- the cascade resolves the Cerulean accent for explicit light/dark, system light/dark, and explicit
  light/dark against the opposite OS preference;
- `theme.json`, the generated CSS and the metadata agree on ids, labels, modes and every override;
- the optional runtime is not installed by a theme-only consumer;
- a multi-theme project imports the core once plus each theme's `fonts.css`/`theme.css`, emits the
  core primitives once and applies each theme independently.

For multi-theme Astro sites, use the core + split entries from
[scenario C](#c--several-themes) and set `data-theme` per layout/page.

## Vite, Next.js and plain HTML

- **Vite** (React/Vue): import the CSS in the entry module (`main.ts`/`main.tsx`) or a global CSS
  file. No `optimizeDeps` or SSR CSS workaround is needed.
- **Next.js**: import the CSS in `app/layout.tsx` or `pages/_app.tsx`; set `data-theme` /
  `data-color-mode` on the `<html>` element. Server rendering works because no runtime is required.
- **Plain HTML**: link a theme's `dist/style.css` (or the core's `dist/style.css`) and set the
  attributes on `<html>`.

In all cases, if you use an `@import` in CSS it must come before other rules, and the core stylesheet
must be imported before theme overrides (though theme specificity makes the latter robust).

## Tailwind v4 (optional)

The core packages have **no Tailwind dependency** and there is deliberately no adapter package.
Tailwind is an optional consumer choice. If you use Tailwind v4 and want its utilities to speak the
Ezhana token names, map the variables inside `@theme inline`:

```css
@import 'tailwindcss';
@import '@ezhana/design-theme-cerulean/style.css';

/* Optional: expose Ezhana tokens as Tailwind utilities.
   `inline` keeps Tailwind from re-emitting the token; utilities reference the live Ezhana
   variables instead of a second copy. */
@theme inline {
  --color-bg: var(--color-bg);
  --color-bg-subtle: var(--color-bg-subtle);
  --color-surface: var(--color-surface);
  --color-surface-elevated: var(--color-surface-elevated);
  --color-fg: var(--color-fg);
  --color-fg-muted: var(--color-fg-muted);
  --color-fg-strong: var(--color-fg-strong);
  --color-accent: var(--color-accent);
  --color-accent-hover: var(--color-accent-hover);
  --color-on-accent: var(--color-on-accent);
  --color-border: var(--color-border);
  --color-danger: var(--color-danger);
  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --radius-control: var(--radius-control);
  --radius-surface: var(--radius-surface);
  --shadow-sm: var(--shadow-sm);
  --font-sans: var(--font-family-sans);
  --font-heading: var(--font-family-heading);
  --font-mono: var(--font-family-mono);
}
```

This does not redefine tokens: each Tailwind theme entry points at the existing Ezhana variable, so
theme switching and color modes keep working. Use `@theme inline` rather than a plain
`@theme { … }` block for these mappings: with the same variable names, a plain block would emit a
second declaration for the custom property (a self-reference). The mapping is entirely optional —
Ezhana CSS works in Tailwind projects without it.

## Troubleshooting

| Symptom                                    | Check                                                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| No theme styles at all                     | Is the CSS imported from the app entry or a global stylesheet? Is the `@import` before other rules?                                          |
| Theme does not change                      | Is `data-theme` on `<html>` (not `<body>`)? Does the id match the package (`cerulean`, `ocean`, …)?                                          |
| Theme import does nothing                  | Did you import the theme's `style.css` (or core + `fonts.css`/`theme.css`)? Check the browser network panel.                                 |
| Core styles duplicated                     | You imported several complete `style.css` files. Use `@ezhana/design-tokens/style.css` + each theme's `theme.css`.                           |
| Mode does not follow the OS                | Is `data-color-mode` still present? Remove it; an explicit mode is active.                                                                   |
| Explicit light/dark has no effect          | The active theme may be fixed-mode (Onyx/Quest/Obsidian). Those ignore `data-color-mode` by design.                                          |
| Theme font missing or 404                  | Use the theme's `style.css`, or import its `fonts.css` in the core + `theme.css` setup. Do not install the font package.                     |
| Text/custom property is undefined          | Check the exact variable name in [the token reference](../packages/design-tokens/README.md#token-reference) and that the core CSS is loaded. |
| Flash of the wrong theme                   | Is the inline preference script in `<head>`, before the module script and the stylesheet?                                                    |
| Runtime state and CSS disagree             | Pass the same definitions array to `createThemeManager` that the CSS imports represent; fixed-mode themes clamp modes.                       |
| Switcher offers light on a dark-only theme | Check the active definition's `modes`; disable unsupported options in the UI.                                                                |
| Custom theme build rejects an override     | The token is not a semantic token of that section, or a required override is missing; the error names it.                                    |
| Custom theme build rejects a reference     | Use only `{primitive.*}` or your own `{theme.*}` references; semantic tokens are overridden, not referenced.                                 |
| Tailwind utility missing                   | Add the token to the optional `@theme inline` map; Ezhana itself does not generate Tailwind classes.                                         |
| Astro build cannot resolve the CSS         | Upgrade the packages and import the CSS-first `style.css` entry; no `noExternal`/plugin is needed.                                           |

## Further reading

- [`packages/design-tokens/README.md`](../packages/design-tokens/README.md) — core token model,
  grouped reference, contract, artifacts and authoring.
- [`packages/theme/README.md`](../packages/theme/README.md) — optional runtime API, persistence, SSR
  and adapters.
- [`packages/theme-builder/README.md`](../packages/theme-builder/README.md) — custom theme
  configuration, artifacts, fonts and validation.
- [`packages/typography-editorial/README.md`](../packages/typography-editorial/README.md) — editorial
  typography scope, customization contract, theme mapping and accessibility.
- [`docs/create-app.md`](create-app.md) — how the generator wires a themed React/Vue app.
- [ADR 0005](adr/0005-css-first-theme-presets.md) — current CSS-first preset architecture.
- [ADR 0006](adr/0006-editorial-typography-preset.md) — editorial typography preset scope,
  token-only styling and the unlayered decision.
