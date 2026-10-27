# @ezhana/design-tokens

Layered design tokens, compiled with [Style Dictionary](https://styledictionary.com/) into a single
stylesheet of CSS custom properties plus typed theme metadata.

The package follows the standard design-token layering — **primitive → semantic → component** — with
an important simplification: **themes are not a layer**. A theme is a set of overrides applied to the
semantic layer, activated at runtime by `data-theme` on the root element. The color mode is
selected by the optional `data-color-mode` attribute; when it is absent the stylesheet follows
`prefers-color-scheme`. Components never know which theme is active because they only consume
semantic tokens.

```html
<html data-theme="default">
  <!-- or an explicit color mode: data-theme="cerulean" data-color-mode="dark" -->
</html>
```

## Why this architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│ primitive layer      raw, context-free values. Never themed.               │
│ --primitive-color-*  Owned by the design system; components must not use   │
│ --primitive-space-*  them for themed properties.                           │
│ --primitive-font-*   e.g. --primitive-color-cerulean-600 = #007ba7        │
├────────────────────────────────────────────────────────────────────────────┤
│ semantic layer       intent-based tokens. The public API for product code. │
│ --color-bg           The default theme lives here (tokens/semantic).       │
│ --color-accent       Other themes override these exact names               │
│ --font-family-sans   (tokens/themes/<theme>.json).                         │
│ --radius-control                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ component layer      OPTIONAL. Component-scoped tokens such as             │
│ --button-bg…         --button-bg that reference semantic tokens.           │
│                      Not shipped here — create it as a separate package    │
│                      when a component system needs its own contract.       │
└────────────────────────────────────────────────────────────────────────────┘
```

The important property of this layering is the **direction of dependency**: semantic → primitive.
A token in a lower layer never references a higher layer, so adding a theme can never break
component CSS.

### Themes are semantic-token overrides

`default`, `cerulean` and `ocean` are **theme identities**, not a token layer. The default theme is
the baseline semantic layer; additional themes only override the semantic tokens that differ (accent
colors, focus ring, typography, control radius). Everything else — backgrounds, text, borders,
spacing, shadows — is inherited from the default semantic values. That is why adding a theme does
not add new CSS variable names, and why product code keeps working unchanged.

Theme identities are combined with an orthogonal **color mode** axis (`light` / `dark`), so the
system scales as `themes × modes` instead of named combinations:

| axis  | attribute         | values                         | owner           |
| ----- | ----------------- | ------------------------------ | --------------- |
| theme | `data-theme`      | `default`, `cerulean`, `ocean` | visual identity |
| mode  | `data-color-mode` | `light`, `dark` (optional)     | color scheme    |

The mode attribute is optional by design: without it the CSS follows the operating system via
`@media (prefers-color-scheme: dark)`, so "system" mode needs no JavaScript and no resolved-value
attribute.

## Installation

```bash
pnpm add @ezhana/design-tokens
```

This package is part of the monorepo and is already wired into both template apps. From the repo
root:

```bash
pnpm build:tokens   # compile tokens/ → dist/
pnpm test           # contract, CSS and WCAG contrast checks
```

The apps run `pnpm build:tokens` from their `predev` / `prebuild` hooks, so the generated CSS is
always fresh during local development and in CI.

## Usage

Import the generated stylesheet once, before any application CSS:

```ts
// main.ts / main.tsx
import '@ezhana/design-tokens/css/tokens.css'
import './index.css'
```

Import the stylesheet with its full `tokens.css` extension so TypeScript's bundler resolution and
Vite's `*.css` module typing line up.

Then consume semantic custom properties in application CSS — never hex values, never `--primitive-*`:

```css
.card {
  color: var(--color-fg);
  background: var(--color-bg-subtle);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-surface);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-body);
}
```

Theme metadata is generated as ESM with literal TypeScript types:

```ts
import {
  themes,
  modes,
  defaultTheme,
  themeLabels,
  modeLabels,
  primitiveTokenNames,
  semanticTokenNames,
  type Theme,
  type Mode,
  type TokenName,
} from '@ezhana/design-tokens'
```

Because the scales and layout values are `rem`-based and authored against a 16px root, apply fluid
body typography to `<body>` rather than to `:root`. Setting a fluid root font-size would scale every
`rem`-based token (spacing, radii, content width) and break the design scale.

Switching themes is a DOM concern, not a token concern. Use the companion
[`@ezhana/theme`](../theme/README.md) package: it persists the user's choice, writes `data-theme`,
adds `data-color-mode` only for explicit modes and leaves the attribute absent in `system` mode so
the CSS follows `prefers-color-scheme`.

## Token inventory

**163 CSS custom properties**: 120 primitive + 43 semantic. Themes add no new variable names — they
override the semantic ones.

### Primitive tokens (`--primitive-*`)

| Group          | Count | Tokens                                                                                                         |
| -------------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| Color palettes | 78    | `neutral` (12 steps: 0, 50–950), `violet`, `blue`, `cerulean`, `red`, `green`, `amber` (11 steps each: 50–950) |
| Spacing        | 13    | `--primitive-space-{0,1,2,3,4,5,6,8,10,12,16,20,24}` (4px base)                                                |
| Radius         | 6     | `none, sm, md, lg, xl, full`                                                                                   |
| Border width   | 2     | `thin` (1px), `thick` (2px)                                                                                    |
| Content size   | 1     | `--primitive-size-content` (70.375rem = 1126px)                                                                |
| Motion         | 3     | durations `fast` (150ms), `normal` (300ms); easing `standard`                                                  |
| Font family    | 3     | sans, heading, mono system stacks                                                                              |
| Font size      | 8     | `xs … 4xl` (0.75rem → 3.5rem)                                                                                  |
| Font weight    | 3     | regular 400, medium 500, semibold 600                                                                          |
| Line height    | 3     | tight 1.1, snug 1.18, normal 1.45                                                                              |

### Semantic tokens (public API)

**43 tokens.** `mode` means the token has separate values in `tokens/semantic/light.json` and
`dark.json`; `base` means it is mode-independent (`tokens/semantic/base.json`). Themes may override
any token, but the [theme contract](#theme-contract) requires the accent/typography/shape tokens.

| Token                                           | Layer file | Type                | Purpose                                                    |
| ----------------------------------------------- | ---------- | ------------------- | ---------------------------------------------------------- |
| `color.bg`                                      | mode       | color               | Page background                                            |
| `color.bg-subtle`                               | mode       | color               | Secondary surface (code blocks, toolbars, quiet cards)     |
| `color.fg`                                      | mode       | color               | Default foreground text                                    |
| `color.fg-muted`                                | mode       | color               | Secondary / de-emphasized text (≈ reference neutral grey)  |
| `color.fg-strong`                               | mode       | color               | Headings and high-emphasis text                            |
| `color.border`                                  | mode       | color               | Hairline borders and dividers                              |
| `color.accent`                                  | mode       | color               | Theme/interaction accent (links, selected controls, icons) |
| `color.accent-hover`                            | mode       | color               | Hover feedback for accent surfaces                         |
| `color.on-accent`                               | mode       | color               | Text/icons on a solid accent surface                       |
| `color.accent-subtle`                           | mode       | color               | Tinted accent surface                                      |
| `color.accent-border`                           | mode       | color               | Accent border / ring                                       |
| `color.focus-ring`                              | mode       | color               | Keyboard focus ring                                        |
| `color.danger` / `color.on-danger`              | mode       | color               | Destructive semantics                                      |
| `color.success`                                 | mode       | color               | Success semantics                                          |
| `color.warning`                                 | mode       | color               | Warning semantics                                          |
| `shadow.sm` / `shadow.md`                       | mode       | string (CSS shadow) | Elevation                                                  |
| `font.family.sans` / `heading` / `mono`         | base       | fontFamily          | Type stacks (themes may override sans/heading)             |
| `font.size.body`                                | base       | dimension           | Fluid 16→18px body size                                    |
| `font.size.small` / `code` / `control`          | base       | dimension           | 14px / 15px / fixed 16px                                   |
| `font.size.h1` / `h2`                           | base       | dimension           | Fluid display sizes                                        |
| `font.weight.body` / `medium` / `strong`        | base       | fontWeight          | 400 / 500 / 600                                            |
| `font.lineHeight.body` / `heading` / `tight`    | base       | number              | 1.45 / 1.18 / 1.1                                          |
| `radius.control` / `small` / `surface` / `pill` | base       | dimension           | Themeable control radius, 4px / 12px / pill                |
| `border.width.default` / `strong`               | base       | dimension           | 1px / 2px                                                  |
| `size.content`                                  | base       | dimension           | Content column width                                       |
| `motion.duration.fast` / `normal`               | base       | duration            | 150ms / 300ms                                              |
| `motion.easing.standard`                        | base       | cubicBezier         | Standard easing                                            |

Programmatic access: `semanticTokenNames`, `primitiveTokenNames` and `tokenNames` are generated
literal arrays, and `dist/json/themes.json` contains every resolved value for every theme × mode
(used by tests and available for tooling).

### Theme contract

Every theme must override the following semantic tokens. Anything else is inherited from the default
semantic values, which keeps themes small and lets new semantic tokens appear everywhere without
touching every theme.

| Section                   | Required overrides                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `base` (mode-independent) | `font.family.sans`, `font.family.heading`, `radius.control`                                                               |
| `light` and `dark`        | `color.accent`, `color.accent-hover`, `color.on-accent`, `color.accent-subtle`, `color.accent-border`, `color.focus-ring` |

All theme files must satisfy exactly the same contract: if one theme overrides an additional
semantic token, every theme must do so (the build fails otherwise). This prevents a token from being
themed in one theme and silently hard-coded in another.

## Generated artifacts

`dist/` is rebuilt from `tokens/` and is not committed.

| artifact                | contents                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `dist/css/tokens.css`   | primitive tokens, default-theme semantic tokens, then each named theme's semantic overrides; plus `color-scheme` rules |
| `dist/json/themes.json` | resolved semantic values for every theme × mode (used by tests and available for tooling)                              |
| `dist/js/index.js`      | `themes`, `modes`, `defaultTheme`, labels, token-name arrays                                                           |
| `dist/js/index.d.ts`    | literal unions (`Theme`, `Mode`, `PrimitiveTokenName`, `SemanticTokenName`, `TokenName`)                               |

Public subpath exports: `@ezhana/design-tokens/css/tokens.css`, `@ezhana/design-tokens/json`,
`@ezhana/design-tokens` (metadata).

### One stylesheet, no FOUC

Each theme only remaps semantic custom properties, so all themes fit in a few kilobytes and ship in
the same request. This is deliberately simpler and faster than lazy-loading a CSS file per theme
(a network round-trip, a loading state and a flash of the wrong theme) or shipping per-theme bundles
(which multiply build outputs and invalidate caching on every theme change).

`dist/css/tokens.css` also declares fallbacks so the app is usable before JavaScript runs and for
users without JavaScript:

- the `default` theme + `light` mode are emitted for `:root`;
- the stylesheet includes `color-scheme` for each mode, so native scrollbars and form controls match.

For a flash-free _dark_ first paint when the user explicitly chose dark, resolve the stored
preference in an inline `<head>` script before the stylesheet is parsed. The snippet is documented in
[`@ezhana/theme`](../theme/README.md#avoiding-flash-of-wrong-theme).

### Cascade layer

All token declarations live inside a single [`@layer design-tokens`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer).
The consequence is useful: any **unlayered** application CSS can override a token — no specificity
battles, no `!important`:

```css
.checkout {
  --radius-control: 0; /* wins over the layered theme token */
}
```

## Authoring tokens

Source files use the [DTCG token format](https://www.w3.org/community/design-tokens/) (`$value`,
`$type`, `$description`, `$extensions`). References between tokens use `{dot.path}` syntax and are
preserved as `var()` in the output:

```json
{ "color": { "bg": { "$type": "color", "$value": "{primitive.color.neutral.0}" } } }
/* → --color-bg: var(--primitive-color-neutral-0); */
```

Keeping the `var()` chain (instead of flattening to a hex value) means a theme only has to remap
semantic aliases, browser dev tools show the full token lineage, and consumers can override a
primitive without touching semantics.

### Naming rules

- **Primitive layer**: `primitive.<category>.<scale>` → `--primitive-color-violet-600`,
  `--primitive-space-4`. Raw values only; no intent in the name.
- **Semantic layer**: `<category>.<role>[.<state>]` → `--color-fg-muted`, `--color-accent-hover`,
  `--font-size-body`. Names describe **intent**, never appearance (never `--color-blue-text`).
  Semantic values may only reference primitive tokens.
- **Component layer** (optional, separate package): `<component>.<property>[.<state>]` →
  `--button-bg`, `--card-padding`. Values must reference semantic tokens, never primitives or raw
  values. See [Component layer](#component-layer-optional).

Layout primitives such as spacing may be consumed directly from the primitive scale
(`--primitive-space-4`); colors, typography, radii and elevation should always go through semantic
tokens so a theme can change them.

### Directory layout

```
tokens/
├── primitive/              # context-free values, never themed
│   ├── color.json          #   palette ramps
│   ├── dimension.json      #   space, radius, border width, content width, motion
│   └── typography.json     #   font stacks, size scale, weights, line heights
├── semantic/
│   ├── base.json           # mode-independent semantic defaults
│   ├── light.json          # default theme, light mode (color + shadow)
│   └── dark.json           # default theme, dark mode
└── themes/                 # theme identities = semantic-token overrides
    ├── cerulean.json       #   base overrides + light/dark color overrides
    └── ocean.json
```

`tokens/themes/<theme>.json` shape:

```json
{
  "$extensions": { "ezhana": { "label": "Ocean" } },
  "base": {
    "font": {
      "family": { "sans": { "$value": "{primitive.font.family.sans}", "$type": "fontFamily" } }
    },
    "radius": { "control": { "$value": "9999px", "$type": "dimension" } }
  },
  "light": { "color": { "accent": { "$value": "{primitive.color.blue.600}", "$type": "color" } } },
  "dark": { "color": { "accent": { "$value": "{primitive.color.blue.400}", "$type": "color" } } }
}
```

A worked example of a complete theme with a custom typeface (Public Sans) and measured contrast
ratios is the Cerulean theme: [`docs/themes/cerulean/DESIGN.md`](../../docs/themes/cerulean/DESIGN.md).

### Adding a theme

1. Copy `tokens/themes/ocean.json` to `tokens/themes/<theme>.json` and change the values.
2. Keep the `base`, `light` and `dark` blocks and all required contract tokens.
3. Run `pnpm build:tokens`.

There is no application code change: the generated `themes` metadata feeds the theme switcher UI,
`[data-theme="<theme>"]` selectors are generated automatically, and the theme shows up in the
switcher's theme selector.

### Adding a color mode

1. Add `tokens/semantic/<mode>.json` with the same semantic token set as `light.json`
   (start by copying it) and your values.
2. Add a `<mode>` block to every theme file. The build error tells you exactly which theme is
   missing what.
3. Optionally add `$extensions.ezhana.label` / `colorScheme` metadata.
4. Run `pnpm build:tokens`.

`color-scheme` for native controls is emitted when `colorScheme` is set. Existing components pick up
the new mode automatically because they only reference semantic tokens; the generated `modes` array
adds the option to the switcher UI.

### Adding or changing a token

1. Add it to the layer where it belongs.
2. Run `pnpm build:tokens && pnpm test`. The test suite enforces the theme contract, so a token added
   to the semantic layer but missing from a mode (or from the theme contract) fails CI.
3. Consume it by name in CSS. Literal-union types keep autocompletion honest.

## Component layer (optional)

Component tokens are intentionally **not** part of this package. They describe a specific component
API (`--button-bg`, `--card-padding`, …), change when that API changes, and are only useful when a
component system exists. Keeping them out keeps `@ezhana/design-tokens` stable and theme-agnostic.

When a component layer is needed, add it as a **separate package** (e.g. `@ezhana/component-tokens`)
that consumes this package's semantic contract:

```
packages/component-tokens/
├── tokens/button.json      # { "button": { "bg": { "$value": "{color.accent}" }, ... } }
└── dist/component-tokens.css
```

Rules for that package:

1. **Only reference semantic tokens** (`{color.accent}`, `{radius.control}`), never primitives and
   never raw values.
2. **Do not duplicate themes.** Component tokens are emitted once with `var()` references; theme
   overrides of the semantic layer flow through automatically:
   ```css
   :root {
     --button-bg: var(--color-accent);
     --button-fg: var(--color-on-accent);
     --button-radius: var(--radius-control);
   }
   ```
3. **Keep the component-token contract small** and scoped to reusable primitives (Button, Input,
   Card, …). Business-specific styling belongs in business CSS, not in the token package.
4. Reuse the same validation approach: every token must resolve, no dangling references, no raw
   color values, documented contract.

The intended workflow for product teams is **headless components + styles**:

```tsx
// unstyled/headless component (Radix, Ark UI, Headless UI, your own primitive…)
<Dialog.Root />
```

```css
/* product styles consume tokens only */
.dialog-overlay {
  background: var(--color-bg);
}
.dialog-content {
  background: var(--color-bg-subtle);
  color: var(--color-fg);
  border-radius: var(--radius-surface);
  box-shadow: var(--shadow-md);
}
```

This means a product can adopt a new theme without touching component logic: it only needs the
semantic contract. If a component system grows enough to warrant it, add the optional
component-token package on top; business-specific components remain headless + token-styled.

## Build pipeline

`scripts/build.mjs` is a thin, strict orchestrator around Style Dictionary's programmatic API:

1. **Load** primitive, semantic and theme token files, stripping file-level metadata.
2. **Validate the contract** before generating anything:
   - every color mode declares exactly the same semantic token set;
   - every `{reference}` resolves and only points at the primitive layer;
   - every theme declares every color mode and the required contract tokens;
   - themes satisfy the same override contract, and overrides only target existing semantic tokens;
   - no duplicate declarations.
3. **Build one Style Dictionary instance per theme × mode** to resolve and validate every value, plus
   one instance per CSS section.
4. **Capture outputs in memory** with `styleDictionary.formatPlatform()`, assemble sections in a
   deterministic order with fallback selectors, and wrap everything in `@layer design-tokens`.
5. **Emit** CSS, resolved theme JSON, ESM metadata and `.d.ts` declarations. The resolved JSON is
   also what the accessibility test consumes.

The resulting selector strategy:

```css
:root {
  /* default theme + light semantics, no-JS fallback */
}
[data-color-mode='dark'] {
  /* dark semantics (explicit mode) */
}
@media (prefers-color-scheme: dark) {
  :root:not([data-color-mode]),
  :root[data-color-mode='dark'] {
    /* dark semantics (system preference) */
  }
}
[data-theme='ocean'] {
  /* mode-independent theme overrides + ocean accent (light mode) */
}
[data-theme='ocean'][data-color-mode='dark'] {
  /* ocean accent (explicit dark mode) */
}
@media (prefers-color-scheme: dark) {
  [data-theme='ocean']:not([data-color-mode]),
  [data-theme='ocean'][data-color-mode='dark'] {
    /* ocean accent (system dark mode) */
  }
}
```

`data-theme` is never "resolved" to a mode value; it always names the theme. The color mode is
either explicit (`data-color-mode`) or inherited from the OS via CSS. Theme selectors have higher
specificity than the semantic defaults, so switching themes never depends on stylesheet order.

## Validation and accessibility

`pnpm --filter @ezhana/design-tokens test` builds the tokens and then checks, among other things:

- the primitive/semantic split and the absence of a `brand.*` namespace;
- the semantic contract across all 6 themes (3 themes × 2 modes);
- that every theme overrides the same contract and only existing semantic tokens;
- that every `var(--…)` reference in the generated CSS resolves to a declaration;
- that no `{token}` placeholder leaked into the output and no custom property is declared twice in a
  block;
- generated JS/TS metadata stays in sync;
- **WCAG AA contrast (≥ 4.5:1)** for every foreground/background pair in every theme:

  | foreground                       | background                        |
  | -------------------------------- | --------------------------------- |
  | `--color-fg`                     | `--color-bg`                      |
  | `--color-fg-muted`               | `--color-bg`                      |
  | `--color-fg-strong`              | `--color-bg`, `--color-bg-subtle` |
  | `--color-accent`                 | `--color-bg`                      |
  | `--color-on-accent`              | `--color-accent`                  |
  | `--color-on-danger`              | `--color-danger`                  |
  | `--color-danger/success/warning` | `--color-bg`                      |

## Design decisions and trade-offs

- **Design tokens are data, not runtime code.** The build produces static artifacts; apps pay zero
  runtime cost for token resolution.
- **Semantic layer is the public API.** Primitive tokens are exported for tooling and layout scales,
  but themed properties must use semantic tokens. This keeps palette changes and new themes from
  rippling through components.
- **Themes are semantic overrides, not a layer.** A theme does not introduce new token names, so
  component code and the public contract stay stable while visual identity changes.
- **Themes are attributes, not classes.** Attributes are easy to drive from SSR, tests and
  non-JS/HTML-only contexts, and avoid selector-specificity games with component classes.
- **Both axes are orthogonal.** Theme identities are added without touching color modes and vice
  versa; the generated metadata and switcher UI pick both up automatically.
- **Explicit values instead of derived colors (`color-mix`, etc.).** Pre-computed values keep output
  predictable, contrast auditable and avoid requiring designers to trust color math.
- **No component layer in this package.** Component tokens belong to a component API and are better
  versioned separately; the semantic layer is deliberately sufficient for headless components plus
  styles.
- **Generated CSS is not committed.** The build is deterministic and cheap (well under a second),
  the apps run it automatically, and CI builds it before building the templates.

## References

- [Style Dictionary](https://styledictionary.com/) — DTCG support, formats, `outputReferences`
- [Design Tokens Community Group format](https://www.w3.org/community/design-tokens/)
- [MDN: CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [MDN: @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [MDN: color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)
- [WCAG 2.2 contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C Design Tokens format](https://tr.designtokens.org/format/)
