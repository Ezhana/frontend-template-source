# @ezhana/design-theme-ocean

Official Ocean theme for [`@ezhana/design-tokens`](../design-tokens/README.md): an indigo-blue accent
and pill-shaped controls.

This is a **theme package**, not a token layer. It owns its palette, overrides the core semantic
contract and ships generated CSS. It depends on `@ezhana/design-tokens` for the shared tokens and
contract but not on `@ezhana/theme` — theme/mode state is the application's choice.

- Indigo-blue accent on the shared neutral surfaces and text.
- The system font stack (no webfont dependency).
- `9999px` control radius: pill-shaped buttons, inputs and selects.
- Independently versioned; adding or changing it never touches the core package.

The design narrative is in [`docs/DESIGN.md`](./docs/DESIGN.md).

## Installation

```sh
pnpm add @ezhana/design-theme-ocean
```

`@ezhana/design-tokens` is a dependency of this package, so the core stylesheet and contract are
installed with it.

## Usage

The theme is activated by `data-theme="ocean"` on the document root. The color mode is optional:
without `data-color-mode` the CSS follows the operating system through `prefers-color-scheme`.

```html
<!-- follow the OS color mode -->
<html data-theme="ocean"></html>

<!-- explicit color mode -->
<html data-theme="ocean" data-color-mode="dark"></html>
```

There are three ways to load the theme, depending on your setup.

### 1. Self-sufficient entry (bundlers)

```ts
import '@ezhana/design-theme-ocean/style'
```

`./style` imports the core stylesheet and the theme overrides, in that order. Importing it is enough
to get valid CSS — no separate token import is needed. The core stylesheet is imported by module id,
so an application that also imports `@ezhana/design-tokens/css/tokens.css` does not pay for it
twice.

### 2. Core stylesheet + theme overrides (split entries)

```ts
import '@ezhana/design-tokens/css/tokens.css'
import '@ezhana/design-theme-ocean/theme.css'
```

Use this when several themes share one core stylesheet import. `./theme.css` contains overrides
only. Its selectors are `:root[data-theme="ocean"]` (specificity 0,2,0), which is higher than every
core rule, so it does not depend on being loaded after the core stylesheet.

### 3. Static CSS (no bundler)

```html
<link rel="stylesheet" href="/node_modules/@ezhana/design-theme-ocean/dist/css/standalone.css" />
```

`./standalone.css` is the core stylesheet concatenated with this theme's overrides: a single file
for HTML-only pages, CDN links or environments without a bundler.

All generated CSS lives inside `@layer design-tokens`, so unlayered application CSS still wins:

```css
.checkout {
  --radius-control: 0; /* overrides the layered theme value */
}
```

## Theme metadata

The generated metadata describes the theme identity for registries and UI:

```ts
import { theme, themeId, themeLabel } from '@ezhana/design-theme-ocean'

themeId // 'ocean'
themeLabel // 'Ocean'
theme // { id: 'ocean', label: 'Ocean', modes: ['light', 'dark'] }
```

Use it with `@ezhana/theme` to build an application registry:

```ts
import { defaultThemeDefinition, type Mode } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { createThemeManager, defineThemeRegistry } from '@ezhana/theme'

export const themeRegistry = defineThemeRegistry([defaultThemeDefinition, ocean, cerulean])
export type AppTheme = (typeof themeRegistry.themes)[number]

export const themeManager = createThemeManager<AppTheme, Mode>({
  themes: [...themeRegistry.themes],
  modes: [...themeRegistry.modes],
  defaultTheme: themeRegistry.defaultTheme,
})
```

`@ezhana/design-tokens` no longer exports a `themes` list or a `Theme` union — theme identities are
owned by theme packages and assembled by the registry.

## Theme contents

```text
packages/design-theme-ocean/
├── theme.config.mjs       # id/label/description, token sources
├── tokens/
│   ├── palette.json       # theme-private palette, rooted at `theme.`
│   └── theme.json         # semantic overrides: base + light + dark
├── scripts/build.mjs      # thin @ezhana/theme-builder wrapper
├── docs/DESIGN.md         # design narrative
├── test/theme.test.mjs    # generated-artifact contract and contrast checks
└── dist/                  # generated, not committed
```

The palette lives at `theme.color.blue.*` (`50`–`950`). It is **build-time material only**: it is
resolved into the override values and never emitted as CSS custom properties, so it cannot leak into
product CSS or into the core `PrimitiveTokenName` union. No change to `@ezhana/design-tokens` is
needed to change or tune this palette.

`tokens/theme.json` satisfies the theme contract from the core package:

| Section                   | Overrides                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `base` (mode-independent) | `font.family.sans`, `font.family.heading`, `radius.control`                                                               |
| `light`, `dark`           | `color.accent`, `color.accent-hover`, `color.on-accent`, `color.accent-subtle`, `color.accent-border`, `color.focus-ring` |

Everything else — backgrounds, text, borders, spacing, shadows, motion — is inherited from the core
default theme. Only the required set is enforced; a theme may add overrides without affecting other
themes.

## Generated artifacts

| Artifact                  | Contents                                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| `dist/css/theme.css`      | overrides only, resolved values, `:root[data-theme="ocean"]` selectors |
| `dist/css/standalone.css` | core `tokens.css` + `theme.css`, for single-file usage                 |
| `dist/style.js`           | core stylesheet import + `./css/theme.css`                             |
| `dist/js/index.js`        | `themeId`, `themeLabel`, `theme` (`ThemeDefinition`)                   |
| `dist/js/index.d.ts`      | literal TypeScript declarations for the above                          |
| `dist/json/theme.json`    | resolved semantic values per mode plus metadata, for tooling and tests |

## Rebuilding

`dist/` is generated from `tokens/` and `theme.config.mjs`; do not edit it by hand. From the repo
root:

```sh
pnpm --filter @ezhana/design-tokens build        # core contract + stylesheet (once)
pnpm --filter @ezhana/design-theme-ocean build  # this package (pretest runs it automatically)
pnpm --filter @ezhana/design-theme-ocean test   # generated-artifact contract + WCAG AA checks
```

The build validates the configuration and overrides against the core contract: a missing required
token, an unknown reference, an invalid theme id or a contract version mismatch fails with an
actionable error. The test suite checks the generated CSS selectors, the required overrides, the
absence of primitive/theme-private variables, the self-sufficiency of `standalone.css` and WCAG AA
contrast for the accent pairs in both modes.

## Design decisions and trade-offs

- **The theme owns its palette.** The blue ramp is not a core primitive; only this package consumes
  it, and it is inlined into the overrides at build time.
- **Overrides, not a layer.** The theme adds no token names, so component code and the semantic
  contract stay stable across themes.
- **Attributes, not classes.** `data-theme` / optional `data-color-mode` are easy to drive from SSR,
  tests and plain HTML.
- **Self-sufficient entry.** `./style` is the default import because "install only a theme package"
  should produce valid CSS; the split entries exist for apps that manage the core stylesheet
  themselves.
- **Load-order independence.** `:root[data-theme]` specificity is what makes several theme packages
  safe to load in any order.
- **Explicit values, no color math.** Resolved hexadecimal values keep the output predictable and
  the contrast auditable.
