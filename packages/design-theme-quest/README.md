# @ezhana/design-theme-quest

Official **QuestUI** theme for [`@ezhana/design-tokens`](../design-tokens/README.md): a fantasy,
ornate, RPG-styled identity built from gold, deep red and royal purple over layered warm browns,
with Cinzel + Spectral + Fira Code and gold-glow elevation.

This is a **theme package**, not a token layer. It owns its palette, overrides the core semantic
contract and ships generated CSS. It depends on `@ezhana/design-tokens` for the shared tokens and
contract but not on `@ezhana/theme` — theme/mode state is the application's choice.

- **Gold `#CA8A04`** primary actions and highlights, **deep red `#991B1B`** for danger and damage,
  **royal purple `#581C87`** for rare, legendary and magical surfaces.
- Layered brown surfaces (`#1A0F0A` → `#2C1A10` → `#3D2517`), parchment text (`#F5E6D3`),
  never pure black and never pure white.
- **Cinzel** headings, **Spectral** body, **Fira Code** code/stats — self-hosted through Fontsource.
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

`@ezhana/design-tokens` is a dependency of this package, so the core stylesheet and contract are
installed with it. The three font packages are dependencies too; the generated `./style` entry loads
them.

## Usage

The theme is activated by `data-theme="quest"`. QuestUI is a fixed dark-mode theme: there is no
`data-color-mode` to set, and a stray mode attribute cannot make it light.

```html
<html data-theme="quest"></html>
```

There are three ways to load the theme, depending on your setup.

### 1. Self-sufficient entry (bundlers)

```ts
import '@ezhana/design-theme-quest/style'
```

`./style` imports the core stylesheet, the Cinzel (400/500/600/700), Spectral (400/500/600) and
Fira Code `@font-face` entries, and the theme overrides, in that order. Importing it is enough to get valid CSS. The core stylesheet is
imported by module id, so an application that also imports
`@ezhana/design-tokens/css/tokens.css` does not pay for it twice.

### 2. Core stylesheet + theme overrides (split entries)

```ts
import '@ezhana/design-tokens/css/tokens.css'
import '@ezhana/design-theme-quest/theme.css'
```

Use this when several themes share one core stylesheet import. `./theme.css` contains overrides
only. Its selector is stronger than every core rule, so it does not depend on being loaded after the
core stylesheet. This path does **not** load the fonts — import them yourself if you pick it instead
of `./style`.

### 3. Static CSS (no bundler)

```html
<link rel="stylesheet" href="/node_modules/@ezhana/design-theme-quest/dist/css/standalone.css" />
```

`./standalone.css` is the core stylesheet concatenated with this theme's overrides: a single file
for HTML-only pages, CDN links or environments without a bundler. It sets `color-scheme: dark` and
does not include the fonts.

All generated CSS lives inside `@layer design-tokens`, so unlayered application CSS still wins:

```css
.quest-inventory {
  --radius-panel: 0; /* overrides the layered theme value */
}
```

### Fixed-mode CSS shape

Because the theme supports one color mode, the generated stylesheet is unconditional for
`data-theme="quest"`:

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
absent (against core's system-preference rule) and `[data-color-mode]` when any explicit mode is
present (against core's `[data-color-mode="dark"]` system rule). That keeps the theme load-order
independent in both cases. There are no `data-color-mode` or `prefers-color-scheme` theme blocks.

## Theme metadata

The generated metadata describes the theme identity for registries and UI:

```ts
import { theme, themeId, themeLabel, modes } from '@ezhana/design-theme-quest'

themeId // 'quest'
themeLabel // 'Quest'
modes // ['dark']
theme // { id: 'quest', label: 'Quest', modes: ['dark'] }
```

Use it with `@ezhana/theme` to build an application registry. Because QuestUI supports a subset of
the app's color modes, pass the registry's `themeModes` map to the manager so a light preference is
clamped to `dark` while QuestUI is active:

```ts
import { defaultThemeDefinition, type Mode } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { theme as quest } from '@ezhana/design-theme-quest'
import { createThemeManager, defineThemeRegistry } from '@ezhana/theme'

export const registry = defineThemeRegistry([defaultThemeDefinition, ocean, cerulean, quest])
export type AppTheme = (typeof registry.themes)[number]

export const manager = createThemeManager<AppTheme, Mode>({
  themes: [...registry.themes],
  modes: [...registry.modes],
  themeModes: registry.themeModes, // quest: ['dark']
  defaultTheme: registry.defaultTheme,
})

manager.setTheme('quest')
manager.getState().resolvedMode // 'dark'
```

The theme switcher can read `registry.themeModes` to disable the light option while QuestUI is
selected.

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

`tokens/theme.json` satisfies the theme contract from the core package and re-themes the rest of
the semantic layer for the warm dark palette:

| Section                   | Overrides                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base` (mode-independent) | `font.family.*`, full `font.size`/`weight`/`lineHeight` scale, `font.letterSpacing.label`, `radius.*`                                               |
| `dark`                    | backgrounds/surfaces, text, borders, accent set, focus ring, danger/success/warning/info sets and their tints, and `shadow.*` (gold-glow elevation) |

Everything else — spacing, motion, content width and border widths — is inherited from the core
defaults. `color-scheme: dark` is not inherited: the fixed-mode theme rule pins it so native controls
and scrollbars match the warm palette.

### Core capabilities this theme required

QuestUI needed semantic roles the core package did not previously expose, and a theme that supports
one color mode. Those were implemented at the source instead of patched around in this package:

- `@ezhana/design-tokens`: layered surfaces, status tints, `info` / solid-danger / solid-info roles,
  the complete display→caption type scale with line heights and label tracking, `radius.modal` /
  `radius.panel`, and `shadow.lg` / `shadow.xl` / `shadow.glow`.
- `@ezhana/theme-builder`: `modes` in `theme.config.mjs` and fixed-mode CSS emission.
- `@ezhana/theme`: per-theme mode metadata and `resolvedMode` clamping.

## Generated artifacts

| Artifact                  | Contents                                                                        |
| ------------------------- | ------------------------------------------------------------------------------- |
| `dist/css/theme.css`      | overrides only, resolved values, fixed-mode `:root[data-theme="quest"]`         |
| `dist/css/standalone.css` | core `tokens.css` + `theme.css`, for single-file usage                          |
| `dist/style.js`           | core stylesheet import + 8 font imports (Cinzel/Spectral/Fira Code) + theme CSS |
| `dist/js/index.js`        | `themeId`, `themeLabel`, `modes`, `theme` (`ThemeDefinition`)                   |
| `dist/js/index.d.ts`      | literal TypeScript declarations for the above                                   |
| `dist/json/theme.json`    | resolved semantic values for the dark mode plus metadata                        |

## Rebuilding

`dist/` is generated from `tokens/` and `theme.config.mjs`; do not edit it by hand. From the repo
root:

```sh
pnpm --filter @ezhana/design-tokens build          # core contract + stylesheet (once)
pnpm --filter @ezhana/design-theme-quest build     # this package (pretest runs it automatically)
pnpm --filter @ezhana/design-theme-quest test      # generated-artifact contract + WCAG AA checks
```

The build validates the configuration and overrides against the core contract: a missing required
token, an unsupported/unlisted color mode, an unknown reference, an invalid theme id or a contract
version mismatch fails with an actionable error. The test suite checks the fixed-mode selector and
`color-scheme`, the required overrides, the absence of primitive/theme-private variables, the
self-sufficiency of `standalone.css`, the font imports, the documented palette/type/shape values and
WCAG AA contrast for every contract pair.

## Design decisions and trade-offs

- **Dark-only, honestly.** The brief has one palette. Declaring both modes and shipping the same
  dark values twice would make `color-scheme` and the mode UI lie; mode-subset support in the
  builder/runtime is the correct underlying fix.
- **The theme owns its palette.** QuestUI colours are not core primitives; only this package
  consumes them, and they are inlined into the overrides at build time.
- **Overrides, not a layer.** The theme adds no token names, so component code and the semantic
  contract stay stable across themes.
- **Accessible status text.** The brief's deep red and royal purple are kept as the solid fills
  (`--color-danger-solid`, `--color-info-solid`); the text roles use lighter tints so damage and
  lore text pass AA on the dark page.
- **Explicit values, no colour math.** Resolved hexadecimal values keep the output predictable and
  the contrast auditable.
- **Component recipes are documentation, not shipped code.** This repository's scope is tokens and
  themes; `docs/DESIGN.md` supplies portable recipes for a future component package, and they use
  semantic tokens only (plus the brief's explicitly component-only literal colours).
- **Load-order independence.** The fixed-mode selector list is what makes several theme packages
  safe to load in any order, including against the core system-preference block.
