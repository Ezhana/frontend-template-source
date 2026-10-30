# Design System Narrative — Cerulean Theme

> **Status:** implemented as the standalone package `@ezhana/design-theme-cerulean` and built with
> `@ezhana/theme-builder`. It is derived from the reference design-system brief (monochrome blue,
> Public Sans, moderate shape/spacing) with the adjustments documented at the end of this file.
> The palette and overrides live in this package; `@ezhana/design-tokens` only provides the shared
> semantic contract.

## Visual Identity

Cerulean is the calm, technical sibling of the template's `default` and `ocean` themes. It is built
on the same principles as the reference brief — clarity, professional efficiency and modern utility —
and expresses them through a single, restrained cerulean-blue accent over a neutral grey hierarchy.

The aesthetic is clean and contemporary. Colour is used as a signal, not as decoration: the accent
appears only on interactive and identity moments (links, selected controls, focus rings, key
illustrations), while surfaces, text and borders stay neutral. This keeps data-dense, productivity-
oriented screens quiet and lets the user find the action without scanning colour noise.

Cerulean ships in **light and dark** modes with equal priority. Dark mode is not a dimmed afterthought:
it re-maps the semantic layer and flips the accent to a lighter cerulean so contrast stays AA.

## Color Palette

A monochrome-cerulean foundation conveys trust, precision and calm. The accent is anchored on
**Cerulean Blue `#007BA7`** — a cooler, more technical blue than the reference brief's
`#007BFF`, chosen so the theme has its own identity next to the (indigo-blue) `ocean` theme while
remaining unmistakably "trustworthy blue".

| Role                       | Token (semantic)                                       | Light mode                        | Dark mode                         |
| -------------------------- | ------------------------------------------------------ | --------------------------------- | --------------------------------- |
| Primary / interactive      | `--color-accent`                                       | `#007BA7`                         | `#7AC6E2`                         |
| Primary hover              | `--color-accent-hover`                                 | `#00688F`                         | `#B0DEEE`                         |
| On primary                 | `--color-on-accent`                                    | `#FFFFFF`                         | `#0B0B0F`                         |
| Tinted accent surface      | `--color-accent-subtle`                                | `#007BA71A`                       | `#7AC6E226`                       |
| Accent border / ring       | `--color-accent-border`                                | `#007BA780`                       | `#7AC6E280`                       |
| Page background            | `--color-bg`                                           | `#FFFFFF`                         | `#16171D`                         |
| Secondary surface          | `--color-bg-subtle`                                    | `#F4F4F5`                         | `#26222E`                         |
| Default text               | `--color-fg`                                           | `#453F4F`                         | `#D6D4DB`                         |
| Supporting text            | `--color-fg-muted`                                     | `#78707F`                         | `#A8A3B0`                         |
| Strong / heading text      | `--color-fg-strong`                                    | `#0B0B0F`                         | `#FAFAFA`                         |
| Hairline border            | `--color-border`                                       | `#E5E4E7`                         | `#3B3644`                         |
| Danger / success / warning | `--color-danger`, `--color-success`, `--color-warning` | `#B91C1C` / `#166534` / `#92400E` | `#F87171` / `#4ADE80` / `#FCD34D` |

The accent rows are owned by this theme (`tokens/theme.json`). Every other row is inherited from the
`@ezhana/design-tokens` default semantic layer and is re-themed by changing the core package, not by
this theme.

### Supporting neutrals

The reference brief's recurring grey `#777777` is represented by the tokenized neutral ramp rather
than a literal color, so it can be tuned per mode and still be tested for contrast. `--color-fg-muted`
is `#78707F` in light mode — visually equivalent to the spec grey while passing WCAG AA (4.75:1 on
white). Borders, code surfaces and dividers use the same neutral ramp, which keeps the accent as the
only saturated element on screen.

### Contrast (measured, not estimated)

The accent pairs are asserted by this package's test suite
(`pnpm --filter @ezhana/design-theme-cerulean test`) in **both** modes. The inherited
foreground/surface pairs are asserted by the core package's suite
(`pnpm --filter @ezhana/design-tokens test`), because this theme does not override them. A future
palette edit cannot silently break either layer.

| Pair (foreground / background)         | Light   | Dark    |
| -------------------------------------- | ------- | ------- |
| `--color-fg` / `--color-bg`            | 10.11:1 | 12.18:1 |
| `--color-fg-muted` / `--color-bg`      | 4.75:1  | 7.26:1  |
| `--color-fg-strong` / `--color-bg`     | 19.64:1 | 17.13:1 |
| `--color-accent` / `--color-bg`        | 4.78:1  | 9.37:1  |
| `--color-on-accent` / `--color-accent` | 4.78:1  | 10.29:1 |
| `--color-accent-hover` / `--color-bg`  | 6.22:1  | 12.37:1 |
| `--color-danger` / `--color-bg`        | 6.47:1  | 6.46:1  |
| `--color-success` / `--color-bg`       | 7.13:1  | 10.26:1 |
| `--color-warning` / `--color-bg`       | 7.09:1  | 12.40:1 |

All foreground/background pairs meet **WCAG 2.2 AA (≥ 4.5:1)**. The accent is also usable as a solid
button background: white text on `#007BA7` reaches 4.78:1, and dark text on the dark-mode accent
reaches 10.29:1.

### Palette ramp

The full ramp is theme-private material in [`tokens/palette.json`](../tokens/palette.json) under
`theme.color.cerulean`, and is the only source for the theme's accent tokens:

| Step | 50        | 100       | 200       | 300       | 400       | 500       | 600       | 700       | 800       | 900       | 950       |
| ---- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| Hex  | `#EEF8FC` | `#D6EEF7` | `#B0DEEE` | `#7AC6E2` | `#3AA8CC` | `#0B8CB4` | `#007BA7` | `#00688F` | `#005574` | `#00425B` | `#002B3C` |

The palette is resolved at build time into the override values and is **never emitted as CSS custom
properties**. It therefore cannot be consumed by product code and does not appear in the core
`primitive.*` scale or in the generated `PrimitiveTokenName` union. Changing the ramp requires no
change to `@ezhana/design-tokens`.

## Typography

**Public Sans** is the universal typeface across all roles — headlines, body text, labels and
interactive controls. It provides a neutral yet friendly tone that excels at digital legibility, and
using a single family creates a cohesive experience that emphasises content over decorative flair.

The font is self-hosted as a variable font via
[`@fontsource-variable/public-sans`](https://fontsource.org/fonts/public-sans) (weights 100–900,
`font-display: swap`). It is listed in `fonts` in `theme.config.mjs`, so the generated
`dist/style.js` imports it after the core stylesheet and before the theme overrides. Because the
`@font-face` is only referenced by the cerulean theme's font tokens, browsers only download Public
Sans when the cerulean theme is active — the other themes keep their system stacks.

| Role           | Token                 | Size                                           | Weight                       | Line height                         |
| -------------- | --------------------- | ---------------------------------------------- | ---------------------------- | ----------------------------------- |
| Body           | `--font-size-body`    | fluid `16px → 18px`                            | 400 (`--font-weight-body`)   | 1.45 (`--font-line-height-body`)    |
| H1             | `--font-size-h1`      | fluid `clamp(2.25rem, 1.5rem + 2.2vw, 3.5rem)` | 500 (`--font-weight-medium`) | 1.18 (`--font-line-height-heading`) |
| H2             | `--font-size-h2`      | fluid `clamp(1.25rem, 1rem + 0.5vw, 1.5rem)`   | 500                          | 1.18                                |
| Small / labels | `--font-size-small`   | `0.875rem` (14px)                              | 400–500                      | 1.2–1.45                            |
| Control labels | `--font-size-control` | `1rem` (16px, fixed)                           | 500                          | 1.2                                 |
| Code           | `--font-size-code`    | `0.9375rem` (15px)                             | 400                          | 1.35                                |

Font stacks:

```
--font-family-sans    → "Public Sans Variable", "Public Sans", system-ui, 'Segoe UI', Roboto, sans-serif
--font-family-heading → same stack (unity: one family for every role)
--font-family-mono    → ui-monospace, Consolas, monospace (code only)
```

Public Sans is a theme-owned value: `tokens/theme.json` overrides the semantic `font.family.sans` and
`font.family.heading` tokens, and each theme decides its own typeface. `default` and `ocean` keep the
system stack.

## Shape & Spacing

**Roundedness — level 2 (moderate).** Controls have clearly defined, softened corners: `0.625rem`
(10px) for buttons, selects, inputs and chips; `0.75rem` (12px) for cards/surfaces; `0.25rem` (4px)
for code and very small elements. No pills and no sharp edges. This lands between the `default`
theme's compact 6px controls and the `ocean` theme's pill-shaped controls.

| Role           | Token                                              | Value             |
| -------------- | -------------------------------------------------- | ----------------- |
| Control radius | `--radius-control`                                 | `0.625rem` (10px) |
| Surface radius | `--radius-surface`                                 | `0.75rem` (12px)  |
| Small radius   | `--radius-small`                                   | `0.25rem` (4px)   |
| Border width   | `--border-width-default` / `--border-width-strong` | `1px` / `2px`     |

`radius.control` is a theme-contract token overridden in `tokens/theme.json`; the other radii are
inherited from the core package.

**Spacing — level 2 (normal).** The standard 4px-based density scale is used unchanged, giving a
familiar, breathable-but-efficient rhythm for professional applications. Layout code may consume the
primitive scale directly; themed properties (colour, type, radius, elevation) go through semantic
tokens.

| Step          | `--primitive-space-1` | `-2` | `-3` | `-4` | `-5` | `-6` | `-8` | `-10` | `-12` | `-16` | `-24` |
| ------------- | --------------------- | ---- | ---- | ---- | ---- | ---- | ---- | ----- | ----- | ----- | ----- |
| Rem           | 0.25                  | 0.5  | 0.75 | 1    | 1.25 | 1.5  | 2    | 2.5   | 3     | 4     | 6     |
| px @16px root | 4                     | 8    | 12   | 16   | 20   | 24   | 32   | 40    | 48    | 64    | 96    |

**Focus & feedback.** Focus rings use a 2px `--color-focus-ring` (cerulean accent) outline with a 2px
offset. Transitions use `--motion-duration-fast` (150ms) / `--motion-duration-normal` (300ms) with a
standard easing curve; they animate colour/background only, never layout.

**Elevation.** Two semantic shadows inherited from the core package: `--shadow-sm` for floating
controls, `--shadow-md` for hover elevation on interactive cards/links; dark mode uses stronger
shadow alphas.

## Theme Activation

The theme is activated with `data-theme="cerulean"`. The color mode is optional
(`data-color-mode`) and defaults to following the operating system through `prefers-color-scheme`:

```html
<!-- follow the OS color mode -->
<html data-theme="cerulean"></html>
<!-- explicit color mode -->
<html data-theme="cerulean" data-color-mode="dark"></html>
```

The generated theme CSS uses `:root[data-theme="cerulean"]` for the base and default-mode overrides
(specificity 0,2,0), an explicit `:root[data-theme="cerulean"][data-color-mode="dark"]` block, and a
system-dark block inside `@media (prefers-color-scheme: dark)`. Because the theme selectors are more
specific than every core rule, the theme CSS is load-order independent and several theme packages
can be loaded together safely.

`@ezhana/theme` persists the user's choice (`{ theme, mode }`), resolves `system` mode through
`prefers-color-scheme`, synchronises tabs, and writes `data-theme` — plus `data-color-mode` only for
explicit `light` / `dark` preferences; in `system` mode the attribute is removed and CSS follows the
media query. Components never know which theme is active because they only consume semantic tokens.

Theme identities are assembled by the application's registry. `@ezhana/design-tokens` no longer
exports a `themes` list or a `Theme` union:

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

themeManager.setTheme('cerulean')
themeManager.setMode('system') // no data-color-mode attribute; CSS follows the OS
```

Loading the theme itself is a separate, static concern: `import '@ezhana/design-theme-cerulean/style'`
(core stylesheet + Public Sans + overrides) or the split `@ezhana/design-tokens/css/tokens.css` +
`@ezhana/design-theme-cerulean/theme.css` entries.

## Implementation Notes

| Concern                                                                    | Location                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Theme identity, label, description, palette sources and font entry         | [`theme.config.mjs`](../theme.config.mjs)                                |
| Cerulean palette ramp                                                      | [`tokens/palette.json`](../tokens/palette.json) (`theme.color.cerulean`) |
| Semantic overrides (accent set, Public Sans, control radius)               | [`tokens/theme.json`](../tokens/theme.json) (`base`, `light`, `dark`)    |
| Generated CSS overrides and single-file bundle                             | `dist/css/theme.css`, `dist/css/standalone.css`                          |
| Generated bundler entry (core stylesheet + Public Sans + overrides)        | `dist/style.js`                                                          |
| Generated metadata (`themeId`, `themeLabel`, `theme`) and TypeScript types | `dist/js/index.js`, `dist/js/index.d.ts`                                 |
| Resolved values per mode (used by tests and tooling)                       | `dist/json/theme.json`                                                   |
| Generation + validation                                                    | `pnpm --filter @ezhana/design-theme-cerulean build`                      |
| Tests (selectors, contract, no leaked variables, WCAG AA)                  | `pnpm --filter @ezhana/design-theme-cerulean test`                       |
| Switcher UI (theme options are generated from the app's theme registry)    | React: `ThemeSwitcher.tsx`; Vue: `ThemeSwitcher.vue`                     |

Adding the theme required **no application-specific theming code** beyond registering it in the
application's theme registry: the theme package ships its own palette, overrides, metadata and
bundler entry; the contract tests of the theme package fail if any required semantic token is
missing.

### Theme override contract satisfied by `cerulean`

Themes do not define a token layer; they override semantic tokens. The Cerulean package provides the
required theme contract (and inherits everything else from the default semantic layer of
`@ezhana/design-tokens`):

| Semantic token                             | Value                                |
| ------------------------------------------ | ------------------------------------ |
| `color.accent`                             | `#007BA7` (light) / `#7AC6E2` (dark) |
| `color.accent-hover`                       | `#00688F` / `#B0DEEE`                |
| `color.on-accent`                          | `#FFFFFF` / `#0B0B0F`                |
| `color.accent-subtle`                      | `#007BA71A` / `#7AC6E226`            |
| `color.accent-border`                      | `#007BA780` / `#7AC6E280`            |
| `color.focus-ring`                         | `#007BA7` / `#7AC6E2`                |
| `font.family.sans` / `font.family.heading` | Public Sans stack                    |
| `radius.control`                           | `0.625rem`                           |

Only this required set is enforced. Extra overrides are allowed but belong to this package alone:
theme packages are independently versioned, so the old repository-wide "every theme must override
the same set" rule no longer applies.

## Usage Guidelines

**Do**

- Use the accent for primary actions, links, selection state and focus rings — one accent per view is enough.
- Use `--color-bg-subtle` for inert surfaces (code, toolbars, secondary cards) and `--color-border` for separation instead of shadows.
- Keep headings and body in Public Sans; use weight and size for hierarchy rather than a second family.
- Rely on semantic tokens (`--color-*`, `--font-*`, `--radius-*`, `--shadow-*`) in components.
- Register the theme in the app's theme registry so the switcher can select it.

**Don't**

- Don't use the theme palette as tokens: `theme.color.cerulean.*` is build-time material and is never emitted as CSS variables.
- Don't use the accent as a large background or long-form text color (keep it for local emphasis).
- Don't hard-code `#007BA7` or Public Sans — both are theme values and can be replaced by another theme.
- Don't mix pill and moderate radii within one control group; roundedness is a theme decision.

## Deviations from the Reference Brief (intentional)

1. **Primary hue `#007BFF` → `#007BA7`.** Cerulean's identity is the cooler, more technical blue;
   keeping the original classic blue would make the theme indistinguishable from the `ocean` theme.
   The chosen step still passes AA as text on white and as a button surface with white text (4.78:1).
2. **Neutral grey `#777777` tokenized.** The literal grey is approximated by `--color-fg-muted`
   (`#78707F`, 4.75:1 on white) so it participates in the mode system and the contrast test suite
   instead of drifting as a hard-coded value.
3. **Dark mode uses a lighter accent (`#7AC6E2`) with dark text.** Reusing `#007BA7` on a dark
   surface would only reach ~2.9:1. The semantic layer swaps the accent per mode, which is exactly
   what the token architecture is for.
4. **Roundedness "level 2" made concrete** as a 10px control radius / 12px surface radius (between
   compact and pill), and **spacing "level 2"** as the existing 4px-base normal density scale.
5. **Public Sans self-hosted as a variable font** rather than depending on a third-party CDN, so the
   template works offline and avoids a font-loading privacy/performance dependency. It ships with
   the theme package and is imported by the generated `./style` entry.
