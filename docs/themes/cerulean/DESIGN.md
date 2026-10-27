# Design System Narrative — Cerulean Theme

> **Status:** implemented as the `cerulean` theme in `@ezhana/design-tokens`
> (`tokens/themes/cerulean.json`), available in both template apps through the theme switcher.
> It is derived from the reference design-system brief (monochrome blue, Public Sans, moderate
> shape/spacing) with the adjustments documented at the end of this file.

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

### Supporting neutrals

The reference brief's recurring grey `#777777` is represented by the tokenized neutral ramp rather
than a literal color, so it can be tuned per mode and still be tested for contrast. `--color-fg-muted`
is `#78707F` in light mode — visually equivalent to the spec grey while passing WCAG AA (4.75:1 on
white). Borders, code surfaces and dividers use the same neutral ramp, which keeps the accent as the
only saturated element on screen.

### Contrast (measured, not estimated)

Every pair below is asserted by the token build's test suite (`pnpm --filter @ezhana/design-tokens test`)
in **both** modes, so a future palette edit cannot silently break accessibility.

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

The full primitive ramp lives in `tokens/primitive/color.json` under `primitive.color.cerulean` and is the
only source for the theme's accent tokens (never used directly by components):

| Step | 50        | 100       | 200       | 300       | 400       | 500       | 600       | 700       | 800       | 900       | 950       |
| ---- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| Hex  | `#EEF8FC` | `#D6EEF7` | `#B0DEEE` | `#7AC6E2` | `#3AA8CC` | `#0B8CB4` | `#007BA7` | `#00688F` | `#005574` | `#00425B` | `#002B3C` |

## Typography

**Public Sans** is the universal typeface across all roles — headlines, body text, labels and
interactive controls. It provides a neutral yet friendly tone that excels at digital legibility, and
using a single family creates a cohesive experience that emphasises content over decorative flair.

The font is self-hosted as a variable font via
[`@fontsource-variable/public-sans`](https://fontsource.org/fonts/public-sans) (weights 100–900,
`font-display: swap`), imported once in each app entrypoint. Because the `@font-face` is only
referenced by the cerulean theme's font tokens, browsers only download Public Sans when the cerulean
theme is active — the other themes keep their system stacks.

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

Public Sans is a theme-owned value: the semantic `--font-family-*` tokens are overridden by the
Cerulean theme, and each theme decides its typeface. `default` and `ocean` keep the system stack.

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

**Spacing — level 2 (normal).** The standard 4px-based density scale is used unchanged, giving a
familiar, breathable-but-efficient rhythm for professional applications. Layout code may consume the
primitive scale directly; themed properties (colour, type, radius, elevation) go through semantic tokens.

| Step          | `--primitive-space-1` | `-2` | `-3` | `-4` | `-5` | `-6` | `-8` | `-10` | `-12` | `-16` | `-24` |
| ------------- | --------------------- | ---- | ---- | ---- | ---- | ---- | ---- | ----- | ----- | ----- | ----- |
| Rem           | 0.25                  | 0.5  | 0.75 | 1    | 1.25 | 1.5  | 2    | 2.5   | 3     | 4     | 6     |
| px @16px root | 4                     | 8    | 12   | 16   | 20   | 24   | 32   | 40    | 48    | 64    | 96    |

**Focus & feedback.** Focus rings use a 2px `--color-focus-ring` (cerulean accent) outline with a 2px
offset. Transitions use `--motion-duration-fast` (150ms) / `--motion-duration-normal` (300ms) with a
standard easing curve; they animate colour/background only, never layout.

**Elevation.** Two semantic shadows: `--shadow-sm` for floating controls (theme switcher) and
`--shadow-md` for hover elevation on interactive cards/links; dark mode uses stronger shadow alphas.

## Theme Activation

The theme is activated with `data-theme`. The color mode is optional (`data-color-mode`) and defaults
to following the operating system through `prefers-color-scheme`:

```html
<!-- follow the OS color mode -->
<html data-theme="cerulean"></html>
<!-- explicit color mode -->
<html data-theme="cerulean" data-color-mode="dark"></html>
```

`@ezhana/theme` persists the user's choice (`{ theme, mode }`), resolves `system` mode through
`prefers-color-scheme`, synchronises tabs, and writes `data-theme` — plus `data-color-mode` only for
explicit `light` / `dark` preferences; in `system` mode the attribute is removed and CSS follows the
media query. The token stylesheet maps the attributes to CSS custom properties; components never
know which theme is active because they only consume semantic tokens.

```ts
import { createThemeManager } from '@ezhana/theme'
import { defaultTheme, modes, themes } from '@ezhana/design-tokens'

const theme = createThemeManager({ themes: [...themes], modes: [...modes], defaultTheme })
theme.setTheme('cerulean')
theme.setMode('system') // no data-color-mode attribute; CSS follows the OS
```

## Implementation Notes

| Concern                                                                                     | Location                                                                                                                  |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Theme overrides (semantic tokens: accent set, fonts, control radius)                        | [`tokens/themes/cerulean.json`](../../../packages/design-tokens/tokens/themes/cerulean.json)                              |
| Cerulean palette ramp                                                                       | [`tokens/primitive/color.json`](../../../packages/design-tokens/tokens/primitive/color.json) (`primitive.color.cerulean`) |
| Semantic aliases (`--color-accent` → primitive/theme value, `--font-family-*` → theme font) | [`tokens/semantic/`](../../../packages/design-tokens/tokens/semantic/)                                                    |
| Public Sans (self-hosted variable font)                                                     | `@fontsource-variable/public-sans`, imported in both app entrypoints                                                      |
| Generation + validation                                                                     | `pnpm build:tokens` / `pnpm --filter @ezhana/design-tokens test`                                                          |
| Switcher UI (theme options are generated from metadata)                                     | React: `ThemeSwitcher.tsx`; Vue: `ThemeSwitcher.vue`                                                                      |

Adding the theme required **no application-specific theming code**: the generated `themes` metadata
feeds the switcher, `[data-theme="cerulean"]` (plus mode-specific) selectors are generated from the
theme override file, and the contract tests fail the build if any required semantic token is missing.

### Theme override contract satisfied by `cerulean`

Themes do not define a token layer; they override semantic tokens. The Cerulean theme provides the
required theme contract (and inherits everything else from the default semantic layer):

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

## Usage Guidelines

**Do**

- Use the accent for primary actions, links, selection state and focus rings — one accent per view is enough.
- Use `--color-bg-subtle` for inert surfaces (code, toolbars, secondary cards) and `--color-border` for separation instead of shadows.
- Keep headings and body in Public Sans; use weight and size for hierarchy rather than a second family.
- Rely on semantic tokens (`--color-*`, `--font-*`, `--radius-*`, `--shadow-*`) in components.
- Let the switcher change the theme: every theme must satisfy the same semantic contract.

**Don't**

- Don't use `--primitive-color-cerulean-*` directly in components; palette steps are not semantic.
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
   template works offline and avoids a font-loading privacy/performance dependency.
