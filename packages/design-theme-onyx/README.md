# @ezhana/design-theme-onyx

Official **Onyx** theme for [`@ezhana/design-tokens`](../design-tokens/README.md): the template's
black-gold business identity — champagne-gold accents on soft warm graphite surfaces, with Public
Sans and moderately soft geometry.

This is a **theme package**, not a token layer. It owns its palette, overrides the core semantic
contract and ships generated CSS. It depends on `@ezhana/design-tokens` for the shared tokens and
contract but not on `@ezhana/theme` — theme/mode state is the application's choice.

- **Champagne gold `#D4AF37`** for primary actions, links, selection and focus — a metal, never a
  saturated yellow.
- **Soft warm graphite** surfaces (`#292623` → `#302D29` → `#36322D` → `#3F3A34`) and warm ivory
  text (`#EDE6D9`); never pure black and never pure white. The page background is deliberately
  lifted above the core dark `#16171D` instead of sitting at near-black.
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

`@ezhana/design-tokens` and `@fontsource-variable/public-sans` are dependencies of this package, so
the core stylesheet, the contract and the font are installed with it.

## Usage

The theme is activated by `data-theme="onyx"`. Onyx is a fixed dark-mode theme: there is no
`data-color-mode` to set, and a stray mode attribute cannot make it light.

```html
<html data-theme="onyx"></html>
```

There are three ways to load the theme, depending on your setup.

### 1. Self-sufficient entry (bundlers)

```ts
import '@ezhana/design-theme-onyx/style'
```

`./style` imports the core stylesheet, the Public Sans `@font-face` and the theme overrides, in that
order. Importing it is enough to get valid CSS. The core stylesheet is imported by module id, so an
application that also imports `@ezhana/design-tokens/css/tokens.css` does not pay for it twice.

### 2. Core stylesheet + theme overrides (split entries)

```ts
import '@ezhana/design-tokens/css/tokens.css'
import '@ezhana/design-theme-onyx/theme.css'
```

Use this when several themes share one core stylesheet import. `./theme.css` contains overrides
only. Its selector is stronger than every core rule, so it does not depend on being loaded after the
core stylesheet. This path does **not** load Public Sans — import `@fontsource-variable/public-sans`
yourself if you pick it instead of `./style`.

### 3. Static CSS (no bundler)

```html
<link rel="stylesheet" href="/node_modules/@ezhana/design-theme-onyx/dist/css/standalone.css" />
```

`./standalone.css` is the core stylesheet concatenated with this theme's overrides: a single file for
HTML-only pages, CDN links or environments without a bundler. It sets `color-scheme: dark` and does
not include the font.

All generated CSS lives inside `@layer design-tokens`, so unlayered application CSS still wins:

```css
.onyx-invoice-total {
  --radius-panel: 0; /* overrides the layered theme value */
}
```

### Color mode

Onyx is fixed-mode, so `data-color-mode` is optional in the strongest sense: it is ignored. The
generated rule matches both the absent attribute (`:not([data-color-mode])`) and any explicit
attribute (`[data-color-mode]`), which keeps Onyx dark even when the OS or an application preference
asks for light. There is no `--no-color-mode` variant and no light palette to disable — the theme
simply has one state. A switcher can read the theme metadata below to disable its light option while
Onyx is selected.

### Fixed-mode CSS shape

Because the theme supports one color mode, the generated stylesheet is unconditional for
`data-theme="onyx"`:

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

The two 0,3,0 variants cover both attribute states — `:not([data-color-mode])` when the attribute is
absent (against core's system-preference rule) and `[data-color-mode]` when any explicit mode is
present (against core's `[data-color-mode="dark"]` system rule). That keeps the theme load-order
independent in both cases. There are no `data-color-mode` or `prefers-color-scheme` theme blocks.

## Theme metadata

The generated metadata describes the theme identity for registries and UI:

```ts
import { theme, themeId, themeLabel, modes } from '@ezhana/design-theme-onyx'

themeId // 'onyx'
themeLabel // 'Onyx'
modes // ['dark']
theme // { id: 'onyx', label: 'Onyx', modes: ['dark'] }
```

Use it with `@ezhana/theme` to build an application registry. Because Onyx supports a subset of the
app's color modes, pass the registry's `themeModes` map to the manager so a light preference is
clamped to `dark` while Onyx is active:

```ts
import { defaultThemeDefinition, type Mode } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { theme as onyx } from '@ezhana/design-theme-onyx'
import { createThemeManager, defineThemeRegistry } from '@ezhana/theme'

export const registry = defineThemeRegistry([defaultThemeDefinition, ocean, cerulean, onyx])
export type AppTheme = (typeof registry.themes)[number]

export const manager = createThemeManager<AppTheme, Mode>({
  themes: [...registry.themes],
  modes: [...registry.modes],
  themeModes: registry.themeModes, // onyx: ['dark']
  defaultTheme: registry.defaultTheme,
})

manager.setTheme('onyx')
manager.getState().resolvedMode // 'dark'
```

The theme switcher can read `registry.themeModes` to disable the light option while Onyx is
selected.

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

### Core capabilities this theme required

Nothing new. Onyx consumes the fixed-mode (color-mode subset) support and the extra semantic roles
that were added at the source for the first dark-only theme — layered surfaces, status tints,
`info` / solid-danger / solid-info roles, label tracking, `radius.modal` / `radius.panel` and
`shadow.lg` / `shadow.xl` / `shadow.glow`. Per
[ADR 0003](../../docs/adr/0003-themes-as-packages.md), a theme package owns its palette and identity;
Onyx needed no changes to `@ezhana/design-tokens`, `@ezhana/theme-builder` or `@ezhana/theme`, which
is the point of the package model.

## Generated artifacts

| Artifact                  | Contents                                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| `dist/css/theme.css`      | overrides only, resolved values, fixed-mode `:root[data-theme="onyx"]` |
| `dist/css/standalone.css` | core `tokens.css` + `theme.css`, for single-file usage                 |
| `dist/style.js`           | core stylesheet import + Public Sans import + theme CSS                |
| `dist/js/index.js`        | `themeId`, `themeLabel`, `modes`, `theme` (`ThemeDefinition`)          |
| `dist/js/index.d.ts`      | literal TypeScript declarations for the above                          |
| `dist/json/theme.json`    | resolved semantic values for the dark mode plus metadata               |

## Rebuilding

`dist/` is generated from `tokens/` and `theme.config.mjs`; do not edit it by hand. From the repo
root:

```sh
pnpm --filter @ezhana/design-tokens build        # core contract + stylesheet (once)
pnpm --filter @ezhana/design-theme-onyx build    # this package (pretest runs it automatically)
pnpm --filter @ezhana/design-theme-onyx test     # generated-artifact contract + WCAG AA checks
```

The build validates the configuration and overrides against the core contract: a missing required
token, an unsupported/unlisted color mode, an unknown reference, an invalid theme id or a contract
version mismatch fails with an actionable error. The test suite
([`test/theme.test.mjs`](./test/theme.test.mjs)) checks the fixed-mode selector and `color-scheme`,
the required overrides, the absence of primitive/theme-private variables, the self-sufficiency of
`standalone.css`, the font import, the documented palette/type/shape values and WCAG AA contrast for
every contract pair and every composited status recipe.

## Design decisions and trade-offs

- **Dark-only, honestly.** The brief has one palette. Declaring both modes and shipping the same
  graphite values twice would make `color-scheme` and the mode UI lie; mode-subset support in the
  builder/runtime is the correct underlying fix.
- **Soft graphite, not black.** `#292623` is lifted above the core dark `#16171D` on purpose: pure
  or near-black pages flatten the surface hierarchy, and Onyx builds depth from four warm graphite
  steps instead of shadow alone. No `#000000` is used anywhere.
- **The theme owns its palette.** Onyx colours are not core primitives; only this package consumes
  them, and they are inlined into the overrides at build time.
- **Overrides, not a layer.** The theme adds no token names, so component code and the semantic
  contract stay stable across themes.
- **Gold is reserved.** `--color-accent` is for actions, links, selection and focus only. `#D4AF37`
  is the solid fill and the interactive accent; the brighter `#E8C566` (`--color-accent-hover`) is
  also the text-on-tint variant, because the 500 step does not reach AA as text on the translucent
  gold fill over the elevated surface.
- **Muted status palette.** Status text roles use the 500 steps (`#E28F87`, `#8AC7A4`, `#E8A94F`,
  `#8FB8DB`); the deeper 600 steps exist only as solid fills behind ivory text (`danger-solid`,
  `info-solid`). The palette's 300 steps double as the text-on-tint literals in the chip recipes,
  keeping a tinted chip legible on every surface.
- **Explicit values, no colour math.** Resolved hexadecimal values keep the output predictable and
  the contrast auditable.
- **Component recipes are documentation, not shipped code.** This repository's scope is tokens and
  themes; `docs/DESIGN.md` supplies portable recipes for a future component package, and they use
  semantic tokens only (plus the documented text-on-tint literals).
- **Load-order independence.** The fixed-mode selector list is what makes several theme packages
  safe to load in any order, including against the core system-preference block.
