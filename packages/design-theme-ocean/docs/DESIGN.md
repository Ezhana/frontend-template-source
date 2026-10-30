# Design System Narrative — Ocean Theme

> **Status:** implemented as the standalone package `@ezhana/design-theme-ocean` and built with
> `@ezhana/theme-builder`. This is a compact narrative; the theme's contract is enforced by the
> package's test suite rather than described at length here.

## Visual Identity

Ocean is the cool, confident sibling of the template's `default` and `cerulean` themes: an
indigo-blue accent on the shared neutral hierarchy, with pill-shaped controls as its defining shape
decision. Colour is a signal, not decoration — the accent marks links, selection state and focus
rings, while surfaces, text and borders stay neutral.

Light and dark modes have equal priority. Dark mode re-maps the semantic layer and switches the
accent to a lighter blue so contrast stays AA.

## Color Palette

The accent is anchored on **`#2563EB`** in light mode and **`#60A5FA`** in dark mode, both taken from
the theme-private blue ramp. Everything below the accent — backgrounds, text, borders, status
colours — is inherited from the `@ezhana/design-tokens` default semantic layer.

| Role                  | Token (semantic)        | Light mode  | Dark mode   |
| --------------------- | ----------------------- | ----------- | ----------- |
| Primary / interactive | `--color-accent`        | `#2563EB`   | `#60A5FA`   |
| Primary hover         | `--color-accent-hover`  | `#1D4ED8`   | `#93C5FD`   |
| On primary            | `--color-on-accent`     | `#FFFFFF`   | `#0B0B0F`   |
| Tinted accent surface | `--color-accent-subtle` | `#2563EB1A` | `#60A5FA26` |
| Accent border / ring  | `--color-accent-border` | `#2563EB80` | `#60A5FA80` |

### Contrast (measured, not estimated)

The accent pairs are asserted by this package's test suite
(`pnpm --filter @ezhana/design-theme-ocean test`) in both modes; the inherited foreground/surface
pairs are covered by the core package's suite.

| Pair                                   | Light  | Dark   |
| -------------------------------------- | ------ | ------ |
| `--color-accent` / `--color-bg`        | 5.17:1 | 7.03:1 |
| `--color-on-accent` / `--color-accent` | 5.17:1 | 7.73:1 |

Both pairs meet **WCAG 2.2 AA (≥ 4.5:1)**, so the accent works as link text and as a solid button
background with `--color-on-accent` text.

### Palette ramp

The full ramp is theme-private material in [`tokens/palette.json`](../tokens/palette.json) under
`theme.color.blue`:

| Step | 50        | 100       | 200       | 300       | 400       | 500       | 600       | 700       | 800       | 900       | 950       |
| ---- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| Hex  | `#EFF6FF` | `#DBEAFE` | `#BFDBFE` | `#93C5FD` | `#60A5FA` | `#3B82F6` | `#2563EB` | `#1D4ED8` | `#1E40AF` | `#1E3A8A` | `#172554` |

It is resolved into the override values at build time and is never emitted as CSS custom properties:
product code cannot consume it, and it does not appear in the core `primitive.*` scale.

## Typography

Ocean deliberately ships **no webfont**. `tokens/theme.json` overrides `font.family.sans` and
`font.family.heading` with the core primitive system stacks, so the theme has no font download, no
`@font-face` and no font-related `dist/style.js` import. Type scale, weights and line heights are
inherited from the core semantic layer.

## Shape & Spacing

**Pill controls.** `radius.control` is `9999px`: buttons, inputs, selects and chips are fully
rounded. This is the theme's single defining shape decision and is intentionally different from the
compact `default` controls and the moderate Cerulean controls. Surface, small, spacing, border-width
and elevation tokens are inherited from the core package unchanged.

## Theme Activation

The theme is activated with `data-theme="ocean"`; the color mode is optional and defaults to the OS
preference:

```html
<!-- follow the OS color mode -->
<html data-theme="ocean"></html>
<!-- explicit color mode -->
<html data-theme="ocean" data-color-mode="dark"></html>
```

The generated CSS uses `:root[data-theme="ocean"]` (specificity 0,2,0), an explicit
`:root[data-theme="ocean"][data-color-mode="dark"]` block and a system-dark block inside
`@media (prefers-color-scheme: dark)`. Theme selectors outrank the core rules, so theme CSS is
load-order independent.

Load the theme with `import '@ezhana/design-theme-ocean/style'`, or with the split
`@ezhana/design-tokens/css/tokens.css` + `@ezhana/design-theme-ocean/theme.css` entries. Theme
identities are assembled by the application registry; `@ezhana/design-tokens` does not export a
`themes` list or a `Theme` union:

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

## Implementation Notes

| Concern                                                   | Location                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| Theme identity, label, description and palette sources    | [`theme.config.mjs`](../theme.config.mjs)                             |
| Ocean palette ramp                                        | [`tokens/palette.json`](../tokens/palette.json) (`theme.color.blue`)  |
| Semantic overrides (accent set, font stacks, pill radius) | [`tokens/theme.json`](../tokens/theme.json) (`base`, `light`, `dark`) |
| Generated CSS overrides and single-file bundle            | `dist/css/theme.css`, `dist/css/standalone.css`                       |
| Generated bundler entry (core stylesheet + overrides)     | `dist/style.js`                                                       |
| Generated metadata and TypeScript types                   | `dist/js/index.js`, `dist/js/index.d.ts`                              |
| Resolved values per mode (used by tests and tooling)      | `dist/json/theme.json`                                                |
| Generation + validation / tests                           | `pnpm --filter @ezhana/design-theme-ocean build` / `... test`         |

### Theme override contract satisfied by `ocean`

| Semantic token                             | Value                                |
| ------------------------------------------ | ------------------------------------ |
| `color.accent`                             | `#2563EB` (light) / `#60A5FA` (dark) |
| `color.accent-hover`                       | `#1D4ED8` / `#93C5FD`                |
| `color.on-accent`                          | `#FFFFFF` / `#0B0B0F`                |
| `color.accent-subtle`                      | `#2563EB1A` / `#60A5FA26`            |
| `color.accent-border`                      | `#2563EB80` / `#60A5FA80`            |
| `color.focus-ring`                         | `#2563EB` / `#60A5FA`                |
| `font.family.sans` / `font.family.heading` | core system stacks                   |
| `radius.control`                           | `9999px`                             |

Extra overrides are allowed but belong to this package alone: theme packages are independently
versioned, so the old repository-wide "every theme must override the same set" rule no longer
applies.

## Usage Guidelines

**Do**

- Use the accent for primary actions, links, selection state and focus rings.
- Keep every control in a group pill-shaped; use the semantic radii, never literal `border-radius`.
- Rely on semantic tokens (`--color-*`, `--font-*`, `--radius-*`, `--shadow-*`) in components.
- Register the theme in the app's theme registry so the switcher can select it.

**Don't**

- Don't use `theme.color.blue.*` in CSS: it is build-time material, not an emitted token.
- Don't hard-code `#2563EB` or the pill radius — both can be replaced by another theme.
- Don't mix pill and moderate radii within one control group; roundedness is a theme decision.
