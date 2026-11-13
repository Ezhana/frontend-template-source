# @ezhana/design-theme-obsidian

Official **Obsidian** theme for [`@ezhana/design-tokens`](../design-tokens/README.md): the template's
**Obsidian & Gold business identity** — 24K gold on warm near-black obsidian, Inter body copy with
Playfair Display headings, hairline-led hierarchy and crisp geometry. Obsidian is **dark-only**.

This is a **theme package**, not a token layer. It owns its palette, overrides the core semantic
contract and ships generated CSS. It depends on `@ezhana/design-tokens` for the shared tokens and
contract but not on `@ezhana/theme` — theme/mode state is the application's choice.

- **24K gold `#D4AF37`** for the single primary action, links, key figures, selection and focus — a
  metal, never a saturated yellow. Solid gold stays within **8% of a viewport** and a screen carries
  **at most one gold primary button**; the rarity is the identity.
- **Warm near-black obsidian** surfaces (`#070606` → `#0B0A09` → `#111010` → `#191715`) and warm ivory
  text (`#F3EFE6`); never pure `#000000` and never pure white. Depth comes from the surface stack and
  1px hairlines, not from heavy shadows.
- **Inter** for body copy and UI, **Playfair Display** for Latin display headings and key figures.
  Chinese headings fall back to Songti SC, Chinese body text to PingFang SC / Microsoft YaHei; code
  uses the source system's mono stack.
- **Crisp geometry**: `4px` small / `6px` control / `14px` surface / `20px` modal / `28px` panel
  radii — no soft 8/12px "app" corners and no pill buttons.
- **Black-alpha elevation** with a restrained two-part gold glow reserved for the one gold focal
  point.
- **Dark-only**: the source system defines one obsidian palette, so the package declares
  `modes: ['dark']`. The builder emits a fixed-mode stylesheet and the runtime clamps mode
  preferences to Obsidian's single supported mode.

The full design narrative — source `--ds-*` token mapping, measured contrast, typography, shape,
elevation, tokenized component recipes, console guidance, intentional deviations and known contract
gaps — is in [`docs/DESIGN.md`](./docs/DESIGN.md).

## Installation

```sh
pnpm add @ezhana/design-theme-obsidian
```

`@ezhana/design-tokens` is a normal dependency of this package. Inter and Playfair Display are
devDependencies only: their CSS and font files are inlined/copied into `dist/`, so consumers never
install a font package.

## Usage

The theme is activated by `data-theme="obsidian"`. Obsidian is a fixed dark-mode theme: there is no
`data-color-mode` to set, and a stray mode attribute cannot make it light.

```html
<html data-theme="obsidian"></html>
```

### A single theme (recommended)

`style.css` is a complete preset: the Inter/Playfair Display `@font-face` rules, the full core
stylesheet and the Obsidian overrides. One import is enough.

```css
/* src/styles/global.css */
@import '@ezhana/design-theme-obsidian/style.css';
```

Do not import `@ezhana/design-tokens/style.css` as well in this setup; it is already included.

### Multi-theme apps

When several themes share one core stylesheet, import the core once and each theme's split entries:

```css
@import '@ezhana/design-tokens/style.css';
@import '@ezhana/design-theme-obsidian/fonts.css';
@import '@ezhana/design-theme-obsidian/theme.css';
```

`theme.css` contains only the semantic overrides. Its fixed-mode selector is stronger than every core
rule, so it does not depend on being loaded after the core stylesheet. `fonts.css` contains only the
theme's `@font-face` rules.

### Plain HTML / CDN

```html
<link rel="stylesheet" href="/node_modules/@ezhana/design-theme-obsidian/dist/style.css" />
```

All generated CSS lives inside `@layer design-tokens`, so unlayered application CSS still wins:

```css
.obsidian-invoice-total {
  --radius-panel: 0; /* overrides the layered theme value */
}
```

### Fixed-mode CSS shape

```css
@layer design-tokens {
  :root[data-theme='obsidian'],
  :root[data-theme='obsidian']:not([data-color-mode]),
  :root[data-theme='obsidian'][data-color-mode] {
    color-scheme: dark;
    --color-bg: #070606;
    /* ... */
  }
}
```

The two 0,3,0 variants cover both attribute states — `:not([data-color-mode])` when the attribute is
absent and `[data-color-mode]` when any explicit mode is present — keeping the theme load-order
independent. There are no `data-color-mode` or `prefers-color-scheme` theme blocks.

## Theme metadata

```ts
import { theme, themeId, themeLabel, modes } from '@ezhana/design-theme-obsidian'

themeId // 'obsidian'
themeLabel // 'Obsidian'
modes // ['dark']
theme // { id: 'obsidian', label: 'Obsidian', modes: ['dark'] }
```

`theme` is a plain `ThemeDefinition` and can be passed straight to the optional runtime's `themes`
array. The manager derives that Obsidian supports only `dark`, so a `light` preference is clamped to
`dark` while Obsidian is active and applies again after switching to a full-mode theme.

```ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as obsidian } from '@ezhana/design-theme-obsidian'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { theme as onyx } from '@ezhana/design-theme-onyx'
import { theme as quest } from '@ezhana/design-theme-quest'
import { createThemeManager } from '@ezhana/theme'

export const themeManager = createThemeManager({
  themes: [defaultThemeDefinition, ocean, cerulean, quest, onyx, obsidian],
})

themeManager.setTheme('obsidian')
themeManager.getState().resolvedMode // 'dark'
```

The switcher should disable the `light` option while Obsidian is selected by checking Obsidian's
`modes: ['dark']` in the definitions array.

## Theme contents

```text
packages/design-theme-obsidian/
├── theme.config.mjs       # id/label/description, modes: ['dark'], token sources, font entries
├── tokens/
│   ├── palette.json       # theme-private palette, rooted at `theme.`
│   └── theme.json         # semantic overrides: base + dark
├── scripts/build.mjs      # thin @ezhana/theme-builder wrapper
├── docs/DESIGN.md         # design narrative, source token mapping, component recipes
├── test/theme.test.mjs    # generated-artifact contract, contrast and documentation checks
└── dist/                  # generated, not committed
```

The palette lives at `theme.color.obsidian.*` (ink, gold, ivory, claret, steel, status). It is
**build-time material only**: it is resolved into the override values and never emitted as CSS
custom properties, so it cannot leak into product CSS or into the core `PrimitiveTokenName` union.

`tokens/theme.json` satisfies the theme contract from the core package and re-themes the rest of the
semantic layer for the obsidian palette:

| Section                   | Overrides                                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `base` (mode-independent) | Inter / Playfair Display / mono font families, the full source type scale (sizes and line heights), `0.22em` label tracking, all radii (`4/6/14/20/28px` + pill) and the two source durations (`120ms` / `200ms`)        |
| `dark`                    | the four warm near-black surfaces, three text roles, the two hairlines, the gold accent set, focus ring, the split danger/success/warning/info sets and their tints, and the black-alpha shadow scale with the gold glow |

Everything else — font weights, the `cubic-bezier(0.2, 0, 0, 1)` standard easing, border widths,
spacing, the content width — is inherited from the core defaults. `color-scheme: dark` is not
inherited: the fixed-mode theme rule pins it so native controls and scrollbars match the obsidian
palette.

## Generated artifacts

| Artifact          | Contents                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `dist/style.css`  | Inter/Playfair Display `@font-face` + full core stylesheet + Obsidian overrides (preset) |
| `dist/theme.css`  | overrides only, resolved values, fixed-mode `:root[data-theme="obsidian"]` selectors     |
| `dist/fonts.css`  | theme `@font-face` rules only, pointing at `./fonts/*`                                   |
| `dist/fonts/`     | copied Inter/Playfair Display files and `fonts/licenses/*.txt`                           |
| `dist/index.js`   | `theme`, `themeId`, `themeLabel`, `modes`                                                |
| `dist/index.d.ts` | literal TypeScript declarations for the above                                            |
| `dist/theme.json` | resolved semantic values for the dark mode plus metadata                                 |

Public exports: `.` (metadata), `./style.css`, `./theme.css`, `./fonts.css`, `./theme.json` and
`./package.json`.

## Rebuilding

`dist/` is generated from `tokens/` and `theme.config.mjs`; do not edit it by hand. From the repo
root:

```sh
pnpm --filter @ezhana/design-tokens build          # core contract + stylesheet (once)
pnpm --filter @ezhana/design-theme-obsidian build  # this package (pretest runs it automatically)
pnpm --filter @ezhana/design-theme-obsidian test   # generated artifacts, WCAG AA and docs
```

The build validates the configuration and overrides against the core contract: a missing required
token, an unsupported color mode, an unknown reference, an invalid theme id or a contract version
mismatch fails with an actionable error. The test suite
([`test/theme.test.mjs`](./test/theme.test.mjs)) checks the fixed-mode selector and `color-scheme`,
the required overrides, the absence of primitive/theme-private variables, the self-contained preset,
the font files, the documented palette/type/shape values, WCAG AA for every contract pair and
composited recipe, and the required documentation sections.

## Design decisions and trade-offs

- **Dark-only, honestly.** The source defines one obsidian palette. Declaring both modes and shipping
  the same near-black values twice would make `color-scheme` and the mode UI lie; the builder's
  mode-subset support is the correct underlying fix.
- **Near-black, not lifted graphite.** The page is `#070606`, darker than Onyx's `#292623`, because
  the identity is black lacquer. Depth is built from the four warm near-black steps plus hairlines and
  black-alpha shadows rather than by lifting the page.
- **A serif display face is the identity.** Playfair Display on headings and key figures is what
  makes Obsidian read as a private-bank document rather than a console theme. Chinese headings fall
  back to Songti SC and body text to the system CJK sans, and the font stack encodes that order.
- **Gold is rationed.** `--color-accent` is for the single primary action, links, key figures,
  selection and focus only; solid gold stays within 8% of the viewport and there is at most one gold
  primary button per screen. The theme cannot enforce an area budget, so the recipes document the
  rule and design review enforces it.
- **The theme owns its palette.** Obsidian colours are not core primitives; only this package
  consumes them, and they are inlined into the overrides at build time. The source's `--ds-*` names
  never reach product code; consumers use the core `--color-*`, `--font-*`, `--radius-*` and
  `--shadow-*` tokens.
- **Status roles split into text and solid fill.** The source status colours are text roles; the theme
  keeps them as-is and adds claret `#8F2F2A` / steel `#2F4A61` solid fills so destructive and
  informational buttons pass AA with ivory text.
- **The focus ring is opaque.** The source's gold-300 ring at 75% alpha is emitted opaquely as
  `#E8D189`, so its contrast does not depend on the surface underneath.
- **Component recipes are documentation, not shipped code.** This repository's scope is tokens and
  themes; `docs/DESIGN.md` supplies portable recipes for a future component package, and they use
  semantic tokens only.
- **Load-order independence.** The fixed-mode selector list is what makes several theme packages safe
  to load in any order, including against the core system-preference block.
