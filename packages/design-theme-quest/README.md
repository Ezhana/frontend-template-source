# @ezhana/design-theme-quest

Official **QuestUI** theme for [`@ezhana/design-tokens`](../design-tokens/README.md): a fantasy,
ornate, RPG-styled identity built from gold, deep red and royal purple over layered warm browns, with
Cinzel + Spectral + Fira Code and gold-glow elevation. QuestUI is **dark-only**.

This is a **theme package**, not a token layer. It owns its palette, overrides the core semantic
contract and ships generated CSS. It depends on `@ezhana/design-tokens` for the shared tokens and
contract but not on `@ezhana/theme` — theme/mode state is the application's choice.

- **Gold `#CA8A04`** primary actions and highlights, **deep red `#991B1B`** for danger and damage,
  **royal purple `#581C87`** for rare, legendary and magical surfaces.
- Layered brown surfaces (`#1A0F0A` → `#2C1A10` → `#3D2517`), parchment text (`#F5E6D3`), never pure
  black and never pure white.
- **Cinzel** headings, **Spectral** body, **Fira Code** code/stats — self-hosted and copied into the
  published preset.
- Coloured gold-glow elevation (`--shadow-sm` … `--shadow-glow`) instead of neutral drop shadows.
- **Dark-only**: the design brief defines one warm palette, so the package declares
  `modes: ['dark']`. The builder emits a fixed-mode stylesheet and the runtime clamps mode
  preferences to QuestUI's single supported mode.

The full design narrative — palette, measured contrast, typography, shape, elevation, tokenized
component recipes and intentional deviations from the brief — is in
[`docs/DESIGN.md`](./docs/DESIGN.md).

## Installation

```sh
pnpm add @ezhana/design-theme-quest
```

`@ezhana/design-tokens` is a normal dependency of this package. Cinzel, Spectral and Fira Code are
devDependencies only: their CSS and font files are inlined/copied into `dist/`, so consumers never
install a font package.

## Usage

The theme is activated by `data-theme="quest"`. QuestUI is a fixed dark-mode theme: there is no
`data-color-mode` to set, and a stray mode attribute cannot make it light.

```html
<html data-theme="quest"></html>
```

### A single theme (recommended)

`style.css` is a complete preset: the Cinzel/Spectral/Fira Code `@font-face` rules, the full core
stylesheet and the QuestUI overrides. One import is enough.

```css
/* src/styles/global.css */
@import '@ezhana/design-theme-quest/style.css';
```

Do not import `@ezhana/design-tokens/style.css` as well in this setup; it is already included.

### Multi-theme apps

When several themes share one core stylesheet, import the core once and each theme's split entries:

```css
@import '@ezhana/design-tokens/style.css';
@import '@ezhana/design-theme-quest/fonts.css';
@import '@ezhana/design-theme-quest/theme.css';
```

`theme.css` contains only the semantic overrides. Its fixed-mode selector is stronger than every core
rule, so it does not depend on being loaded after the core stylesheet. `fonts.css` contains only the
theme's `@font-face` rules.

### Plain HTML / CDN

```html
<link rel="stylesheet" href="/node_modules/@ezhana/design-theme-quest/dist/style.css" />
```

All generated CSS lives inside `@layer design-tokens`, so unlayered application CSS still wins:

```css
.quest-inventory {
  --radius-panel: 0; /* overrides the layered theme value */
}
```

### Fixed-mode CSS shape

```css
@layer design-tokens {
  :root[data-theme='quest'],
  :root[data-theme='quest']:not([data-color-mode]),
  :root[data-theme='quest'][data-color-mode] {
    color-scheme: dark;
    --color-bg: #1a0f0a;
    /* ... */
  }
}
```

The two 0,3,0 variants cover both attribute states — `:not([data-color-mode])` when the attribute is
absent and `[data-color-mode]` when any explicit mode is present — keeping the theme load-order
independent. There are no `data-color-mode` or `prefers-color-scheme` theme blocks.

## Theme metadata

```ts
import { theme, themeId, themeLabel, modes } from '@ezhana/design-theme-quest'

themeId // 'quest'
themeLabel // 'Quest'
modes // ['dark']
theme // { id: 'quest', label: 'Quest', modes: ['dark'] }
```

`theme` is a plain `ThemeDefinition` and can be passed straight to the optional runtime's `themes`
array. The manager derives that QuestUI supports only `dark`, so a `light` preference is clamped to
`dark` while QuestUI is active and applies again after switching to a full-mode theme.

```ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { theme as quest } from '@ezhana/design-theme-quest'
import { createThemeManager } from '@ezhana/theme'

export const themeManager = createThemeManager({
  themes: [defaultThemeDefinition, ocean, cerulean, quest],
})

themeManager.setTheme('quest')
themeManager.getState().resolvedMode // 'dark'
```

The switcher should disable the `light` option while QuestUI is selected by checking QuestUI's
`modes: ['dark']` in the definitions array.

## Theme contents

```text
packages/design-theme-quest/
├── theme.config.mjs       # id/label/description, modes: ['dark'], token sources, font entries
├── tokens/
│   ├── palette.json       # theme-private palette, rooted at `theme.`
│   └── theme.json         # semantic overrides: base + dark
├── scripts/build.mjs      # thin @ezhana/theme-builder wrapper
├── docs/DESIGN.md         # design narrative + tokenized component recipes
├── test/theme.test.mjs    # generated-artifact contract and contrast checks
└── dist/                  # generated, not committed
```

The palette lives at `theme.color.quest.*` (gold, parchment, crimson, royal, brown, green). It is
**build-time material only**: it is resolved into the override values and never emitted as CSS
custom properties, so it cannot leak into product CSS or into the core `PrimitiveTokenName` union.

`tokens/theme.json` satisfies the theme contract from the core package and re-themes the rest of the
semantic layer for the warm dark palette:

| Section                   | Overrides                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base` (mode-independent) | `font.family.*`, full `font.size`/`weight`/`lineHeight` scale, `font.letterSpacing.label`, `radius.*`                                               |
| `dark`                    | backgrounds/surfaces, text, borders, accent set, focus ring, danger/success/warning/info sets and their tints, and `shadow.*` (gold-glow elevation) |

Everything else — spacing, motion, content width and border widths — is inherited from the core
defaults. `color-scheme: dark` is not inherited: the fixed-mode theme rule pins it so native controls
and scrollbars match the warm palette.

## Generated artifacts

| Artifact          | Contents                                                                          |
| ----------------- | --------------------------------------------------------------------------------- |
| `dist/style.css`  | theme font faces + full core stylesheet + QuestUI overrides (complete preset)     |
| `dist/theme.css`  | overrides only, resolved values, fixed-mode `:root[data-theme="quest"]` selectors |
| `dist/fonts.css`  | theme `@font-face` rules only, pointing at `./fonts/*`                            |
| `dist/fonts/`     | copied Cinzel/Spectral/Fira Code files and `fonts/licenses/*.txt`                 |
| `dist/index.js`   | `theme`, `themeId`, `themeLabel`, `modes`                                         |
| `dist/index.d.ts` | literal TypeScript declarations for the above                                     |
| `dist/theme.json` | resolved semantic values for the dark mode plus metadata                          |

Public exports: `.` (metadata), `./style.css`, `./theme.css`, `./fonts.css`, `./theme.json` and
`./package.json`.

## Rebuilding

`dist/` is generated from `tokens/` and `theme.config.mjs`; do not edit it by hand. From the repo
root:

```sh
pnpm --filter @ezhana/design-tokens build          # core contract + stylesheet (once)
pnpm --filter @ezhana/design-theme-quest build     # this package (pretest runs it automatically)
pnpm --filter @ezhana/design-theme-quest test      # generated-artifact contract + WCAG AA checks
```

The build validates the configuration and overrides against the core contract: a missing required
token, an unsupported color mode, an unknown reference, an invalid theme id or a contract version
mismatch fails with an actionable error. The test suite checks the fixed-mode selector and
`color-scheme`, the required overrides, the absence of primitive/theme-private variables, the
self-contained preset, the fonts, the documented palette/type/shape values and WCAG AA contrast for
every contract pair.

## Design decisions and trade-offs

- **Dark-only, honestly.** The brief has one palette. Declaring both modes and shipping the same dark
  values twice would make `color-scheme` and the mode UI lie; the builder's mode-subset support is
  the correct underlying fix.
- **The theme owns its palette.** QuestUI colours are not core primitives; only this package consumes
  them, and they are inlined into the overrides at build time.
- **Fonts ship with the preset.** Cinzel, Spectral and Fira Code are devDependencies; the build copies
  their files and rewrites the `@font-face` URLs, so the published theme is self-contained.
- **Overrides, not a layer.** The theme adds no token names, so component code and the semantic
  contract stay stable across themes.
- **Accessible status text.** The brief's deep red and royal purple are kept as the solid fills
  (`--color-danger-solid`, `--color-info-solid`); the text roles use lighter tints so damage and lore
  text pass AA on the dark page.
- **Explicit values, no colour math.** Resolved hexadecimal values keep the output predictable and the
  contrast auditable.
- **Component recipes are documentation, not shipped code.** This repository's scope is tokens and
  themes; `docs/DESIGN.md` supplies portable recipes for a future component package, and they use
  semantic tokens only.
- **Load-order independence.** The fixed-mode selector list is what makes several theme packages safe
  to load in any order, including against the core system-preference block.
