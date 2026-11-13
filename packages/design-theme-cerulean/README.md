# @ezhana/design-theme-cerulean

Official Cerulean theme for [`@ezhana/design-tokens`](../design-tokens/README.md): a cerulean-blue
accent, Public Sans and moderate (level 2) controls, in light and dark.

This is a **theme package**, not a token layer. It owns its palette, overrides the core semantic
contract and ships generated CSS. It depends on `@ezhana/design-tokens` for the shared tokens and
contract but not on `@ezhana/theme` — theme/mode state is the application's choice.

- Cerulean-blue accent on the shared neutral surfaces and text.
- **Public Sans** as the body and heading typeface, self-hosted as a variable font.
- `0.625rem` control radius: clearly softened controls, between the compact default controls and the
  pill-shaped Ocean controls.
- Light + dark color modes.
- Independently versioned; adding or changing it never touches the core package.

The full design narrative — palette, measured contrast, typography, shape, deviations from the
reference brief — is in [`docs/DESIGN.md`](./docs/DESIGN.md).

## Installation

```sh
pnpm add @ezhana/design-theme-cerulean
```

`@ezhana/design-tokens` is a normal dependency of this package, so the core contract is installed
with it. Public Sans is a devDependency of this package only: its files are copied into `dist/fonts/`
at build time, so **consumers never install a font package**.

## Usage

The theme is activated by `data-theme="cerulean"` on the document root. The color mode is optional:
without `data-color-mode` the CSS follows the operating system through `prefers-color-scheme`.

```html
<!-- follow the OS color mode -->
<html data-theme="cerulean"></html>

<!-- explicit color mode; wins over the OS preference -->
<html data-theme="cerulean" data-color-mode="dark"></html>
```

### A single theme (recommended)

`style.css` is a complete preset: Public Sans `@font-face` rules, the full core stylesheet and the
Cerulean overrides. One import is enough.

```css
/* src/styles/global.css */
@import '@ezhana/design-theme-cerulean/style.css';
```

Do not import `@ezhana/design-tokens/style.css` as well in this setup; it is already included.

### Multi-theme apps

When several themes share one core stylesheet, import the core once and each theme's split entries:

```css
@import '@ezhana/design-tokens/style.css';
@import '@ezhana/design-theme-cerulean/fonts.css';
@import '@ezhana/design-theme-cerulean/theme.css';
```

`theme.css` contains only the semantic overrides. Its selectors are `:root[data-theme="cerulean"]`
(specificity 0,2,0), higher than every core rule, so it does not depend on being loaded after the
core stylesheet. `fonts.css` contains only the Public Sans `@font-face` rules.

### Plain HTML / CDN

The same complete preset can be linked directly; everything is relative to `dist/`:

```html
<link rel="stylesheet" href="/node_modules/@ezhana/design-theme-cerulean/dist/style.css" />
```

All generated CSS lives inside `@layer design-tokens`, so unlayered application CSS still wins:

```css
.checkout {
  --radius-control: 0; /* overrides the layered theme value */
}
```

## Theme metadata

```ts
import { theme, themeId, themeLabel, modes } from '@ezhana/design-theme-cerulean'

themeId // 'cerulean'
themeLabel // 'Cerulean'
modes // ['light', 'dark']
theme // { id: 'cerulean', label: 'Cerulean', modes: ['light', 'dark'] }
```

`theme` is a plain `ThemeDefinition` (`{ id, label, modes }`) and can be passed straight to the
optional runtime's `themes` array:

```ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { createThemeManager } from '@ezhana/theme'

export const themeManager = createThemeManager({
  themes: [defaultThemeDefinition, ocean, cerulean],
})

themeManager.setTheme('cerulean')
themeManager.getState().resolvedMode // 'light', 'dark' or the OS mode in system mode
```

The runtime is optional: if the app does not need a switcher, set `data-theme` yourself or let the
user's build-time choice set it.

## Theme contents

```text
packages/design-theme-cerulean/
├── theme.config.mjs       # id/label/description, token sources, font entry
├── tokens/
│   ├── palette.json       # theme-private palette, rooted at `theme.`
│   └── theme.json         # semantic overrides: base + light + dark
├── scripts/build.mjs      # thin @ezhana/theme-builder wrapper
├── docs/DESIGN.md         # design narrative
├── test/theme.test.mjs    # generated-artifact contract and contrast checks
└── dist/                  # generated, not committed
```

The palette lives at `theme.color.cerulean.*` (`50`–`950`). It is **build-time material only**: it
is resolved into the override values and never emitted as CSS custom properties, so it cannot leak
into product CSS or into the core `PrimitiveTokenName` union. No change to
`@ezhana/design-tokens` is needed to change or tune this palette.

`tokens/theme.json` satisfies the theme contract from the core package:

| Section                   | Overrides                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `base` (mode-independent) | `font.family.sans`, `font.family.heading`, `radius.control`                                                               |
| `light`, `dark`           | `color.accent`, `color.accent-hover`, `color.on-accent`, `color.accent-subtle`, `color.accent-border`, `color.focus-ring` |

Everything else — backgrounds, text, borders, spacing, shadows, motion — is inherited from the core
default theme. Only the required set is enforced; a theme may add overrides without affecting other
themes.

## Generated artifacts

| Artifact          | Contents                                                                               |
| ----------------- | -------------------------------------------------------------------------------------- |
| `dist/style.css`  | Public Sans `@font-face` + full core stylesheet + Cerulean overrides (complete preset) |
| `dist/theme.css`  | overrides only, resolved values, `:root[data-theme="cerulean"]` selectors              |
| `dist/fonts.css`  | Public Sans `@font-face` rules only, pointing at `./fonts/*`                           |
| `dist/fonts/`     | copied Public Sans `.woff2` files and `fonts/licenses/*.txt`                           |
| `dist/index.js`   | `theme`, `themeId`, `themeLabel`, `modes`                                              |
| `dist/index.d.ts` | literal TypeScript declarations for the above                                          |
| `dist/theme.json` | resolved override values and resolved semantic values per mode, plus metadata          |

Public exports: `.` (metadata), `./style.css`, `./theme.css`, `./fonts.css`, `./theme.json` and
`./package.json`.

## Rebuilding

`dist/` is generated from `tokens/` and `theme.config.mjs`; do not edit it by hand. From the repo
root:

```sh
pnpm --filter @ezhana/design-tokens build          # core contract + stylesheet (once)
pnpm --filter @ezhana/design-theme-cerulean build  # this package (pretest runs it automatically)
pnpm --filter @ezhana/design-theme-cerulean test   # generated-artifact contract + WCAG AA checks
```

The build validates the configuration and overrides against the core contract: a missing required
token, an unknown reference, an invalid theme id or a contract version mismatch fails with an
actionable error. The test suite checks the generated CSS selectors, the required overrides, the
absence of primitive/theme-private variables, that `style.css` embeds fonts + core + overrides, and
WCAG AA contrast for the accent pairs in both modes.

## Design decisions and trade-offs

- **The theme owns its palette.** The cerulean ramp is not a core primitive; only this package
  consumes it, and it is inlined into the overrides at build time.
- **Self-hosted font, no consumer install.** Public Sans is a devDependency; the build copies the
  font files into `dist/fonts/` so the published preset has no external font URL and no peer install.
- **Complete preset first.** `style.css` is the default import because "install only a theme package"
  should produce valid CSS; the split entries exist for apps that manage the core stylesheet or the
  font themselves.
- **Overrides, not a layer.** The theme adds no token names, so component code and the semantic
  contract stay stable across themes.
- **Attributes, not classes.** `data-theme` / optional `data-color-mode` are easy to drive from SSR,
  tests and plain HTML.
- **Load-order independence.** `:root[data-theme]` specificity is what makes several theme packages
  safe to load in any order.
- **Explicit values, no color math.** Resolved hexadecimal values keep the output predictable and the
  contrast auditable.
