# @ezhana/design-theme-onyx

Official **Onyx** theme for [`@ezhana/design-tokens`](../design-tokens/README.md): the template's
black-gold business identity — champagne-gold accents on soft warm graphite surfaces, with Public
Sans and moderately soft geometry. Onyx is **dark-only**.

This is a **theme package**, not a token layer. It owns its palette, overrides the core semantic
contract and ships generated CSS. It depends on `@ezhana/design-tokens` for the shared tokens and
contract but not on `@ezhana/theme` — theme/mode state is the application's choice.

- **Champagne gold `#D4AF37`** for primary actions, links, selection and focus — a metal, never a
  saturated yellow.
- **Soft warm graphite** surfaces (`#292623` → `#302D29` → `#36322D` → `#3F3A34`) and warm ivory
  text (`#EDE6D9`); never pure black and never pure white.
- **Public Sans** for every role, self-hosted as a variable font; code uses the core mono stack.
- **Moderately soft geometry**: `4px` small / `8px` control / `12px` surface / `16px` modal and panel
  radii — softened corners, never pill-shaped.
- **Warm near-black elevation** (`rgb(9 8 6 / …)`) with a restrained champagne glow reserved for the
  selected state.
- **Dark-only**: the brief defines one soft-graphite palette, so the package declares
  `modes: ['dark']`. The builder emits a fixed-mode stylesheet and the runtime clamps mode
  preferences to Onyx's single supported mode.

The full design narrative — palette, measured contrast, typography, shape, elevation, tokenized
component recipes and intentional deviations from the brief — is in
[`docs/DESIGN.md`](./docs/DESIGN.md).

## Installation

```sh
pnpm add @ezhana/design-theme-onyx
```

`@ezhana/design-tokens` is a normal dependency of this package. Public Sans is a devDependency only:
its files are copied into `dist/fonts/`, so consumers never install a font package.

## Usage

The theme is activated by `data-theme="onyx"`. Onyx is a fixed dark-mode theme: there is no
`data-color-mode` to set, and a stray mode attribute cannot make it light.

```html
<html data-theme="onyx"></html>
```

### A single theme (recommended)

`style.css` is a complete preset: the Public Sans `@font-face` rules, the full core stylesheet and
the Onyx overrides. One import is enough.

```css
/* src/styles/global.css */
@import '@ezhana/design-theme-onyx/style.css';
```

Do not import `@ezhana/design-tokens/style.css` as well in this setup; it is already included.

### Multi-theme apps

When several themes share one core stylesheet, import the core once and each theme's split entries:

```css
@import '@ezhana/design-tokens/style.css';
@import '@ezhana/design-theme-onyx/fonts.css';
@import '@ezhana/design-theme-onyx/theme.css';
```

`theme.css` contains only the semantic overrides. Its fixed-mode selector is stronger than every core
rule, so it does not depend on being loaded after the core stylesheet. `fonts.css` contains only the
Public Sans `@font-face` rules.

### Plain HTML / CDN

```html
<link rel="stylesheet" href="/node_modules/@ezhana/design-theme-onyx/dist/style.css" />
```

All generated CSS lives inside `@layer design-tokens`, so unlayered application CSS still wins:

```css
.onyx-invoice-total {
  --radius-panel: 0; /* overrides the layered theme value */
}
```

### Color mode

Onyx is fixed-mode, so `data-color-mode` is ignored. The generated rule matches both the absent
attribute (`:not([data-color-mode])`) and any explicit attribute (`[data-color-mode]`), which keeps
Onyx dark even when the OS or an application preference asks for light. There is no light palette to
disable — the theme has one state. A switcher can read the theme metadata to disable its light option
while Onyx is selected.

```css
@layer design-tokens {
  :root[data-theme='onyx'],
  :root[data-theme='onyx']:not([data-color-mode]),
  :root[data-theme='onyx'][data-color-mode] {
    color-scheme: dark;
    --color-bg: #292623;
    /* ... */
  }
}
```

## Theme metadata

```ts
import { theme, themeId, themeLabel, modes } from '@ezhana/design-theme-onyx'

themeId // 'onyx'
themeLabel // 'Onyx'
modes // ['dark']
theme // { id: 'onyx', label: 'Onyx', modes: ['dark'] }
```

`theme` is a plain `ThemeDefinition` and can be passed straight to the optional runtime's `themes`
array. The manager derives that Onyx supports only `dark`, so a `light` preference is clamped to
`dark` while Onyx is active and applies again after switching to a full-mode theme.

```ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { theme as onyx } from '@ezhana/design-theme-onyx'
import { createThemeManager } from '@ezhana/theme'

export const themeManager = createThemeManager({
  themes: [defaultThemeDefinition, ocean, cerulean, onyx],
})

themeManager.setTheme('onyx')
themeManager.getState().resolvedMode // 'dark'
```

The switcher should disable the `light` option while Onyx is selected by checking Onyx's
`modes: ['dark']` in the definitions array.

## Theme contents

```text
packages/design-theme-onyx/
├── theme.config.mjs       # id/label/description, modes: ['dark'], token sources, font entry
├── tokens/
│   ├── palette.json       # theme-private palette, rooted at `theme.`
│   └── theme.json         # semantic overrides: base + dark
├── scripts/build.mjs      # thin @ezhana/theme-builder wrapper
├── docs/DESIGN.md         # design narrative + tokenized component recipes
├── test/theme.test.mjs    # generated-artifact contract and contrast checks
└── dist/                  # generated, not committed
```

The palette lives at `theme.color.onyx.*` (graphite, ivory, gold, rose, jade, amber, steel). It is
**build-time material only**: it is resolved into the override values and never emitted as CSS
custom properties, so it cannot leak into product CSS or into the core `PrimitiveTokenName` union.

`tokens/theme.json` satisfies the theme contract from the core package and re-themes the rest of the
semantic layer for the warm graphite palette:

| Section                   | Overrides                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base` (mode-independent) | `font.family.sans`, `font.family.heading`, `font.letterSpacing.label`, and the full `radius` scale (`small`, `control`, `surface`, `modal`, `panel`, `pill`)              |
| `dark`                    | backgrounds/surfaces, text, borders, the gold accent set, focus ring, danger/success/warning/info sets and their tints, and `shadow.*` (warm near-black elevation + glow) |

Everything else — type sizes, weights, line heights, spacing, motion, content width and border
widths — is inherited from the core defaults. `color-scheme: dark` is not inherited: the fixed-mode
theme rule pins it so native controls and scrollbars match the warm palette.

## Generated artifacts

| Artifact          | Contents                                                                           |
| ----------------- | ---------------------------------------------------------------------------------- |
| `dist/style.css`  | Public Sans `@font-face` + full core stylesheet + Onyx overrides (complete preset) |
| `dist/theme.css`  | overrides only, resolved values, fixed-mode `:root[data-theme="onyx"]` selectors   |
| `dist/fonts.css`  | Public Sans `@font-face` rules only, pointing at `./fonts/*`                       |
| `dist/fonts/`     | copied Public Sans `.woff2` files and `fonts/licenses/*.txt`                       |
| `dist/index.js`   | `theme`, `themeId`, `themeLabel`, `modes`                                          |
| `dist/index.d.ts` | literal TypeScript declarations for the above                                      |
| `dist/theme.json` | resolved semantic values for the dark mode plus metadata                           |

Public exports: `.` (metadata), `./style.css`, `./theme.css`, `./fonts.css`, `./theme.json` and
`./package.json`.

## Rebuilding

`dist/` is generated from `tokens/` and `theme.config.mjs`; do not edit it by hand. From the repo
root:

```sh
pnpm --filter @ezhana/design-tokens build        # core contract + stylesheet (once)
pnpm --filter @ezhana/design-theme-onyx build    # this package (pretest runs it automatically)
pnpm --filter @ezhana/design-theme-onyx test     # generated-artifact contract + WCAG AA checks
```

The build validates the configuration and overrides against the core contract: a missing required
token, an unsupported color mode, an unknown reference, an invalid theme id or a contract version
mismatch fails with an actionable error. The test suite
([`test/theme.test.mjs`](./test/theme.test.mjs)) checks the fixed-mode selector and `color-scheme`,
the required overrides, the absence of primitive/theme-private variables, the self-contained preset,
the font files, the documented palette/type/shape values and WCAG AA contrast for every contract pair
and composited status recipe.

## Design decisions and trade-offs

- **Dark-only, honestly.** The brief has one palette. Declaring both modes and shipping the same
  graphite values twice would make `color-scheme` and the mode UI lie; the builder's mode-subset
  support is the correct underlying fix.
- **Soft graphite, not black.** `#292623` is lifted above the core dark `#16171D` on purpose: pure or
  near-black pages flatten the surface hierarchy, and Onyx builds depth from four warm graphite steps
  instead of shadow alone. No `#000000` is used anywhere.
- **The theme owns its palette.** Onyx colours are not core primitives; only this package consumes
  them, and they are inlined into the overrides at build time.
- **Gold is reserved.** `--color-accent` is for actions, links, selection and focus only. `#D4AF37`
  is the solid fill and the interactive accent; the brighter `#E8C566` (`--color-accent-hover`) is
  also the text-on-tint variant, because the 500 step does not reach AA as text on the translucent
  gold fill over the elevated surface.
- **Muted status palette.** Status text roles use the 500 steps (`#E28F87`, `#8AC7A4`, `#E8A94F`,
  `#8FB8DB`); the deeper 600 steps exist only as solid fills behind ivory text (`danger-solid`,
  `info-solid`).
- **Component recipes are documentation, not shipped code.** This repository's scope is tokens and
  themes; `docs/DESIGN.md` supplies portable recipes for a future component package, and they use
  semantic tokens only.
- **Load-order independence.** The fixed-mode selector list is what makes several theme packages safe
  to load in any order, including against the core system-preference block.
