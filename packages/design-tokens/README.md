# @ezhana/design-tokens

CSS-first core design tokens for the Ezhana frontend templates: a primitive scale, a semantic
contract and a default theme, compiled with [Style Dictionary](https://styledictionary.com/) into a
complete stylesheet of CSS custom properties plus resolved values, a versioned theme contract and
typed ESM metadata.

The package is the foundation of the theme system:

- **The core stylesheet is complete.** `style.css` contains the primitives, the default theme and the
  light/dark/system color-mode rules. Import it once and the default theme works with no
  `data-theme` attribute.
- **Themes are separate packages.** A theme overrides semantic tokens and is selected with
  `data-theme="<id>"`. It is built against this package's contract with
  [`@ezhana/theme-builder`](../theme-builder/README.md).
- **Color modes are orthogonal to theme identity.** An optional `data-color-mode` attribute forces
  `light` or `dark`; when absent, the stylesheet follows the OS through `prefers-color-scheme`.
- **Theming is zero-JS.** The stylesheet alone handles theme selection, explicit modes and system
  mode. [`@ezhana/theme`](../theme/README.md) is an optional runtime for switcher state.

## Installation

```sh
pnpm add @ezhana/design-tokens
```

For a ready-made visual identity, install a theme package instead — it depends on this package, so a
single install is enough:

```sh
pnpm add @ezhana/design-theme-cerulean
```

## Usage

### Core only: the default theme

Import the core stylesheet once, before application CSS:

```css
/* src/styles/global.css */
@import '@ezhana/design-tokens/style.css';
```

No `data-theme` attribute is needed: the default theme is emitted on `:root`. Consume semantic
custom properties in application CSS — never hex values, never `--primitive-*` for themeable
properties:

```css
.card {
  color: var(--color-fg);
  background: var(--color-surface);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-surface);
  box-shadow: var(--shadow-sm);
}
```

### Use a theme package

A theme's `style.css` is self-contained (fonts + the full core stylesheet + theme overrides), so
installing and importing just the theme package is enough:

```ts
// main.ts / main.tsx
import '@ezhana/design-theme-cerulean/style.css'
import './index.css'
```

```html
<html data-theme="cerulean"></html>
```

Do not also import `@ezhana/design-tokens/style.css` in this setup; the theme preset already contains
it. For multi-theme apps, import the core stylesheet once and each theme's `theme.css`/`fonts.css`
instead — see [`docs/usage.md`](../../docs/usage.md).

### Zero-JS color modes

```html
<!-- follow the OS (data-color-mode absent) -->
<html data-theme="cerulean"></html>

<!-- explicit mode; always wins over the OS preference -->
<html data-theme="cerulean" data-color-mode="dark"></html>
```

### Metadata and types

```ts
import {
  defaultTheme,
  defaultThemeDefinition,
  modeLabels,
  modes,
  primitiveTokenNames,
  semanticTokenNames,
  tokenNames,
  type Mode,
  type ModePreference,
  type PrimitiveTokenName,
  type SemanticTokenName,
  type ThemeDefinition,
  type TokenName,
} from '@ezhana/design-tokens'

defaultTheme // 'default'
defaultThemeDefinition // { id: 'default', label: 'Default', modes: ['light', 'dark'] }
modes // ['light', 'dark']
```

`defaultThemeDefinition` is what an app adds to the `themes` array of
[`@ezhana/theme`](../theme/README.md) when the default theme should be selectable. There is no
`themes` list or `Theme` union in this package: theme identities belong to the theme packages.

## Exports

| Export                                | Kind | Contents                                                                                                                             |
| ------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `@ezhana/design-tokens`               | JS   | `defaultTheme`, `defaultThemeDefinition`, `modes`, `modeLabels`, `primitiveTokenNames`, `semanticTokenNames`, `tokenNames` and types |
| `@ezhana/design-tokens/style.css`     | CSS  | complete core stylesheet: primitives + default theme + light/dark/system color modes, inside `@layer design-tokens`                  |
| `@ezhana/design-tokens/tokens.json`   | JSON | resolved primitive values plus resolved semantic values per color mode                                                               |
| `@ezhana/design-tokens/contract.json` | JSON | the versioned theme contract consumed by the theme builder                                                                           |
| `@ezhana/design-tokens/package.json`  | JSON | package manifest                                                                                                                     |

`tokens.json` is the tooling view of the core (abridged):

```json
{
  "generator": "@ezhana/design-tokens",
  "version": 1,
  "defaultTheme": "default",
  "modes": ["light", "dark"],
  "defaultMode": "light",
  "modeLabels": { "light": "Light", "dark": "Dark" },
  "primitives": { "primitive.color.neutral.0": { "value": "#ffffff", "type": "color" } },
  "semantic": {
    "light": { "color.bg": { "value": "#ffffff", "type": "color" } },
    "dark": { "color.bg": { "value": "#16171d", "type": "color" } }
  }
}
```

At the source-repository root, `pnpm build` compiles this package and every theme package, and
`pnpm test` runs the contract, CSS, metadata and WCAG contrast checks:

```bash
pnpm build           # core tokens, then the theme packages
pnpm test            # contract, CSS, metadata and WCAG contrast checks
```

Generated applications are consumers, not builders: they install the published packages and import
the generated CSS, so there is no token build step in an app.

## Token model

```text
tokens/primitive/*.json       raw, context-free values; never themed
        │
        ▼
tokens/semantic/base.json     mode-independent semantic tokens
tokens/semantic/modes/*.json  color, shadow and mode-specific semantic values
        │
        ▼
dist/style.css                primitives + default theme + light/dark/system rules
```

- **Primitive layer** (`--primitive-*`): the shared scale — neutral, violet, red, green and amber
  ramps, spacing, radii, border widths, typography, motion and content width. Raw material; never
  theme-specific.
- **Semantic layer** (`--color-*`, `--font-*`, `--radius-*`, `--shadow-*`, `--border-*`,
  `--motion-*`, `--size-content`): the public API for product code, and the default theme.
- **Theme packages**: semantic-token overrides selected by `:root[data-theme="<id>"]`. Theme-private
  `theme.*` tokens are build-time material only and never become CSS variables.

A token in a lower layer never references a higher layer, so adding a theme or a color mode cannot
break component CSS.

| Concern                              | Owner                      | Emitted as CSS variables        |
| ------------------------------------ | -------------------------- | ------------------------------- |
| Shared primitive scale               | this package               | yes (`--primitive-*`)           |
| Semantic tokens + default theme      | this package               | yes (`--color-*`, …)            |
| Theme contract                       | this package               | no (`contract.json`)            |
| Theme-private palette (`theme.*`)    | theme package, build time  | **no**                          |
| Theme semantic overrides             | theme package              | yes, `:root[data-theme="<id>"]` |
| Theme + mode state (`data-theme`, …) | `@ezhana/theme` or the app | n/a                             |

The core primitive scale intentionally contains only shared material: neutrals, the status colors,
the default theme's violet accent, spacing, radii, borders, type and motion. A brand hue such as
cerulean blue or ocean blue lives in the theme package that uses it — see
[ADR 0005](../../docs/adr/0005-css-first-theme-presets.md).

## Token reference

Semantic tokens are the public API and are emitted as CSS custom properties for every color mode.
The tables below group the roles with representative variables; the complete, authoritative set is
`semanticTokenNames` and `contract.json`. The default theme supplies the values; themes may override
any of them.

### Surfaces, text and borders

| CSS variable               | Role                                                  |
| -------------------------- | ----------------------------------------------------- |
| `--color-bg`               | Page background, the base layer of a mode.            |
| `--color-bg-subtle`        | Inset surface: code blocks, wells, inactive controls. |
| `--color-surface`          | Raised surface: cards, panels and sheets.             |
| `--color-surface-elevated` | Topmost surface: modals, popovers and menus.          |
| `--color-fg`               | Default body text.                                    |
| `--color-fg-muted`         | Secondary / de-emphasized text.                       |
| `--color-fg-strong`        | Headings and high-emphasis text.                      |
| `--color-border`           | Hairline borders and dividers.                        |
| `--color-border-subtle`    | Low-contrast divider on raised or tinted surfaces.    |

The three surface levels let a layout stack cards on the page and dialogs on cards without inventing
ad-hoc colors. The same semantic names work in light and dark mode.

### Accent and informational roles

| CSS variable            | Role                                                   |
| ----------------------- | ------------------------------------------------------ |
| `--color-accent`        | Accent text, icons and links.                          |
| `--color-accent-hover`  | Accent hover state.                                    |
| `--color-on-accent`     | Content on a solid accent fill.                        |
| `--color-accent-subtle` | Tinted accent surface.                                 |
| `--color-accent-border` | Accent-tinted border for highlighted controls.         |
| `--color-focus-ring`    | Focus outline.                                         |
| `--color-info`          | Informational text and icons.                          |
| `--color-info-solid`    | Solid informational fill; pair with `--color-on-info`. |
| `--color-on-info`       | Content on a solid informational fill.                 |
| `--color-info-subtle`   | Tinted informational surface.                          |

`info` is deliberately a separate role from `accent`, so a theme can give informational UI its own
hue while keeping the accent for interactive emphasis. The default theme maps both to the violet
ramp.

### Status roles

| CSS variable             | Role                                                   |
| ------------------------ | ------------------------------------------------------ |
| `--color-danger`         | Danger text and icons; AA against `--color-bg`.        |
| `--color-danger-solid`   | Solid destructive fill; pair with `--color-on-danger`. |
| `--color-danger-subtle`  | Tinted destructive surface.                            |
| `--color-on-danger`      | Content on a solid destructive fill.                   |
| `--color-success`        | Success text and icons.                                |
| `--color-success-subtle` | Tinted success surface.                                |
| `--color-warning`        | Warning text and icons.                                |
| `--color-warning-subtle` | Tinted warning surface.                                |

Danger is split into a text role and a fill role: `--color-danger` is the accessible danger **text**
color on the page, while `--color-danger-solid` is the destructive **fill** that
`--color-on-danger` is validated against.

### Typography

| CSS variable                                                                                       | Role                                         |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `--font-family-sans`                                                                               | Body font stack (theme contract).            |
| `--font-family-heading`                                                                            | Display font stack (theme contract).         |
| `--font-family-mono`                                                                               | Code and numeric font stack.                 |
| `--font-size-display`                                                                              | Hero display size.                           |
| `--font-size-h1`, `--font-size-h2`, `--font-size-h3`, `--font-size-h4`                             | Heading scale.                               |
| `--font-size-body`                                                                                 | Default body size.                           |
| `--font-size-body-lg`                                                                              | Lead paragraph size.                         |
| `--font-size-control`                                                                              | Fixed control-label size.                    |
| `--font-size-small`                                                                                | Small UI text.                               |
| `--font-size-caption`                                                                              | Captions and metadata.                       |
| `--font-size-code`                                                                                 | Inline code and code blocks.                 |
| `--font-weight-body`                                                                               | Regular body weight.                         |
| `--font-weight-medium`                                                                             | Medium emphasis.                             |
| `--font-weight-strong`                                                                             | Semibold emphasis.                           |
| `--font-weight-bold`                                                                               | Bold weight.                                 |
| `--font-line-height-display`                                                                       | Display line height.                         |
| `--font-line-height-h1`, `--font-line-height-h2`, `--font-line-height-h3`, `--font-line-height-h4` | Heading line heights.                        |
| `--font-line-height-body`                                                                          | Body line height.                            |
| `--font-line-height-small`                                                                         | Small-text line height.                      |
| `--font-line-height-caption`                                                                       | Caption line height.                         |
| `--font-line-height-code`                                                                          | Code line height.                            |
| `--font-line-height-heading`                                                                       | Shared heading line height.                  |
| `--font-line-height-tight`                                                                         | Tight display/utility line height.           |
| `--font-letter-spacing-label`                                                                      | Tracking for small-caps labels and eyebrows. |

The default theme uses fluid `clamp()` sizes for display/H1/body where useful; themes may replace the
whole type scale (Quest and Obsidian do).

### Radii and elevation

| CSS variable       | Role                                      |
| ------------------ | ----------------------------------------- |
| `--radius-control` | Buttons, inputs and selects (contract).   |
| `--radius-small`   | Small chips and tags.                     |
| `--radius-surface` | Cards and panels.                         |
| `--radius-modal`   | Dialogs.                                  |
| `--radius-panel`   | Large panels and sheets.                  |
| `--radius-pill`    | Fully rounded controls.                   |
| `--shadow-sm`      | Resting card shadow.                      |
| `--shadow-md`      | Raised card shadow.                       |
| `--shadow-lg`      | Dialog/popover elevation.                 |
| `--shadow-xl`      | Topmost overlay elevation.                |
| `--shadow-glow`    | Accent-tinted glow for featured surfaces. |

### Layout, borders and motion

| CSS variable               | Role                                |
| -------------------------- | ----------------------------------- |
| `--border-width-default`   | Hairline border.                    |
| `--border-width-strong`    | Emphasis/focus border.              |
| `--size-content`           | Max content width for page layouts. |
| `--motion-duration-fast`   | Hover/press transitions.            |
| `--motion-duration-normal` | Surface and theme transitions.      |
| `--motion-easing-standard` | Shared easing curve.                |

### Primitive material

Primitive values are available as CSS variables and in the typed `primitiveTokenNames` array. Use
them for raw material only; the important exception is spacing, which has no semantic layer:

```css
.page {
  max-width: var(--size-content);
  padding: var(--primitive-space-8);
  gap: var(--primitive-space-4);
}
```

Representative primitives: `--primitive-color-neutral-0`, `--primitive-color-violet-600`,
`--primitive-space-4`, `--primitive-font-size-md`, `--primitive-radius-md`,
`--primitive-border-width-thin`, `--primitive-size-content`.

## Theme contract

Every theme must override the following semantic tokens in every color mode it declares:

| Section                   | Required overrides                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `base` (mode-independent) | `font.family.sans`, `font.family.heading`, `radius.control`                                                               |
| every declared color mode | `color.accent`, `color.accent-hover`, `color.on-accent`, `color.accent-subtle`, `color.accent-border`, `color.focus-ring` |

Only this set is enforced. A theme may override more semantic tokens; because themes are independent
packages, different themes do not have to override the same additional tokens.

The contract is exported as `@ezhana/design-tokens/contract.json` and is versioned:
`@ezhana/theme-builder` refuses a contract version it does not understand. Its shape:

```json
{
  "version": 1,
  "generator": "@ezhana/design-tokens",
  "modes": [
    { "id": "light", "label": "Light", "colorScheme": "light" },
    { "id": "dark", "label": "Dark", "colorScheme": "dark" }
  ],
  "defaultMode": "light",
  "required": {
    "base": ["font.family.sans", "font.family.heading", "radius.control"],
    "mode": [
      "color.accent",
      "color.accent-hover",
      "color.on-accent",
      "color.accent-subtle",
      "color.accent-border",
      "color.focus-ring"
    ]
  },
  "semanticTokens": { "base": ["…"], "modes": { "light": ["…"], "dark": ["…"] } },
  "primitiveTokens": ["primitive.color.neutral.0", "…"],
  "contrast": { "min": 4.5, "pairs": [["color.fg", "color.bg"], "…"] },
  "themeNamespace": "theme",
  "themeIdPattern": "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$"
}
```

### Contrast guarantees

The default theme guarantees WCAG 2.2 AA (≥ 4.5:1) for the foreground/background pairs published in
`contract.contrast.pairs`. Theme builds validate the same pairs against the resolved theme values.

| Foreground        | Background               | Role                                       |
| ----------------- | ------------------------ | ------------------------------------------ |
| `color.fg`        | `color.bg`               | Body text on the page.                     |
| `color.fg-muted`  | `color.bg`               | Secondary text on the page.                |
| `color.fg-strong` | `color.bg`               | Strong text on the page.                   |
| `color.fg-strong` | `color.bg-subtle`        | Strong text on inset surfaces.             |
| `color.fg`        | `color.surface`          | Body text on cards and panels.             |
| `color.fg-muted`  | `color.surface`          | Secondary text on cards and panels.        |
| `color.fg-strong` | `color.surface-elevated` | Strong text in modals, popovers and menus. |
| `color.accent`    | `color.bg`               | Accent text and links.                     |
| `color.on-accent` | `color.accent`           | Content on a solid accent fill.            |
| `color.danger`    | `color.bg`               | Danger text on the page.                   |
| `color.on-danger` | `color.danger-solid`     | Content on a solid destructive fill.       |
| `color.success`   | `color.bg`               | Success text on the page.                  |
| `color.warning`   | `color.bg`               | Warning text on the page.                  |
| `color.info`      | `color.bg`               | Informational text on the page.            |
| `color.on-info`   | `color.info-solid`       | Content on a solid informational fill.     |

`on-danger` is checked against the destructive **fill** (`danger-solid`) it sits on, not against
`danger`, which is the danger **text** role validated against `bg`. This keeps both roles
independently themable.

## CSS shape

All token declarations live in `@layer design-tokens`:

```css
@layer design-tokens;

@layer design-tokens {
  :root {
    /* primitives + mode-independent semantics + default light values */
  }

  :root[data-color-mode='dark'] {
    /* explicit dark */
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-color-mode]) {
      /* system dark; explicit light/dark above always wins */
    }
  }

  :root {
    color-scheme: light dark;
  }
  :root[data-color-mode='dark'] {
    color-scheme: dark;
  }
  :root[data-color-mode='light'] {
    color-scheme: light;
  }
}
```

- The core stylesheet has **no** `data-theme` selectors; theme packages add
  `:root[data-theme="<id>"]` rules.
- `color-scheme` makes native form controls and scrollbars match the selected mode.
- Because every declaration is layered, unlayered application CSS can override a token directly:

```css
.checkout {
  --radius-control: 0; /* wins over the layered theme token */
}
```

## Generated artifacts

`dist/` is rebuilt from `tokens/` by `scripts/build.mjs` and is not committed.

| Artifact             | Contents                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `dist/style.css`     | complete core stylesheet: primitives, default theme, light/dark/system rules, `color-scheme`                       |
| `dist/tokens.json`   | resolved primitive values and resolved semantic values per mode                                                    |
| `dist/contract.json` | the theme contract described above                                                                                 |
| `dist/index.js`      | `defaultTheme`, `defaultThemeDefinition`, `modes`, `modeLabels`, token-name arrays                                 |
| `dist/index.d.ts`    | literal types: `Mode`, `ModePreference`, `ThemeDefinition`, `PrimitiveTokenName`, `SemanticTokenName`, `TokenName` |

## Build pipeline

`scripts/build.mjs` is a strict orchestrator around Style Dictionary's programmatic API:

1. **Load** the primitive and semantic token files, stripping file-level metadata.
2. **Validate the contract** before generating anything:
   - every color mode declares exactly the same semantic token set;
   - every `{reference}` resolves and only points at the primitive layer;
   - every required theme-contract token exists in the semantic layer;
   - no duplicate declarations.
3. **Build one Style Dictionary instance per color mode** to resolve and validate every value, plus
   one instance per CSS section.
4. **Assemble the stylesheet** in a deterministic order with fallback selectors, wrapped in
   `@layer design-tokens`.
5. **Emit** CSS, resolved JSON, the contract, ESM metadata and `.d.ts` declarations.

## Authoring tokens

Source files use the [DTCG token format](https://www.w3.org/community/design-tokens/) (`$value`,
`$type`, `$description`, `$extensions`). References between tokens use `{dot.path}` syntax and are
preserved as `var()` in the output:

```json
{ "color": { "bg": { "$type": "color", "$value": "{primitive.color.neutral.0}" } } }
/* → --color-bg: var(--primitive-color-neutral-0); */
```

Keeping the `var()` chain (instead of flattening to a hex value) means browser dev tools show the
full token lineage, and consumers can override a primitive without touching semantics. Theme
packages are the exception: they emit resolved values, because their private palette is build-time
material that must not become a CSS variable.

### Directory layout

```text
tokens/
├── primitive/              # context-free values, never themed
│   ├── color.json          #   neutral, violet, red, green, amber ramps
│   ├── dimension.json      #   space, radius, border width, content width, motion
│   └── typography.json     #   font stacks, size scale, weights, line heights, label tracking
└── semantic/
    ├── base.json           # mode-independent semantic defaults
    └── modes/
        ├── light.json      # default theme, light mode (color + shadow)
        └── dark.json       # default theme, dark mode
```

### Naming rules

- **Primitive layer**: `primitive.<category>.<scale>` → `--primitive-color-violet-600`,
  `--primitive-space-4`. Raw values only; no intent in the name.
- **Semantic layer**: `<category>.<role>[.<state>]` → `--color-fg-muted`, `--color-accent-hover`,
  `--font-size-body`. Names describe **intent**, never appearance (never `--color-blue-text`).
- **Theme-private tokens** (theme packages only): `theme.<category>.<name>` — build-time material,
  never emitted, never consumable by product CSS.
- **Component layer** (optional, separate package): `<component>.<property>[.<state>]` →
  `--button-bg`, `--card-padding`. Values must reference semantic tokens, never primitives or raw
  values. See [Component layer](#component-layer-optional).

### Adding a color mode

1. Add `tokens/semantic/modes/<mode>.json` with the same semantic token set as `light.json` (start
   by copying it) and your values.
2. Add a `<mode>` block to every theme package that should support it; their builds fail with an
   actionable message listing what is missing.
3. Optionally add `$extensions.ezhana.label` / `colorScheme` metadata.
4. Run `pnpm build`.

`color-scheme` for native controls is emitted when `colorScheme` is set. Components pick up the new
mode automatically because they only reference semantic tokens.

### Adding or changing a semantic token

1. Add it to `tokens/semantic/base.json` or the mode files, referencing primitives only.
2. Run `pnpm build && pnpm test`. The tests enforce that every mode declares the same semantic token
   set, that the contract matches the resolved values, and that contrast still passes.
3. If the token belongs to the theme contract, add it to `REQUIRED_THEME_BASE` /
   `REQUIRED_THEME_MODE` in `scripts/build.mjs` and to every theme package (their builds fail until
   they do).

### Adding a theme

A theme is a separate, independently versioned package built with
[`@ezhana/theme-builder`](../theme-builder/README.md):

```text
my-theme/
├── package.json            # dependency: @ezhana/design-tokens; devDependencies: builder + fonts
├── theme.config.mjs        # id, label, tokens, overrides, fonts, optional modes
├── tokens/palette.json     # theme-private palette, under `theme.*`
├── tokens/theme.json       # semantic overrides: base + one section per declared color mode
└── scripts/build.mjs       # await buildTheme(new URL('../theme.config.mjs', import.meta.url))
```

The builder validates the required overrides, rejects unknown references and non-semantic overrides,
checks WCAG AA contrast for the resolved values, and generates the complete preset plus metadata.
Nothing in this package changes when a theme is added. See the
[worked example](../design-theme-cerulean/theme.config.mjs) and the
[builder reference](../theme-builder/README.md).

## Component layer (optional)

Component tokens are intentionally **not** part of this package. They describe a specific component
and belong to a component API; keeping them out keeps `@ezhana/design-tokens` stable and
theme-agnostic.

When a component layer is needed, add it as a **separate package** (e.g.
`@ezhana/component-tokens`) that depends on this one:

```text
packages/component-tokens/
├── tokens/button.json      # { "button": { "bg": { "$value": "{color.accent}" }, ... } }
└── dist/component-tokens.css
```

Rules:

1. **Only reference semantic tokens** (`{color.accent}`, `{radius.control}`), never primitives and
   never raw values.
2. **Do not duplicate themes.** Component tokens are emitted once with `var()` references; theme
   packages remap the semantic values they point at.
3. **Keep the component-token contract small** and scoped to reusable primitives (Button, Input,
   Card, …). Business-specific styling belongs in business CSS, not in the token package.
4. Reuse the same validation approach: every token must resolve, no dangling references, no raw
   values where a semantic token exists.

## Tests

`pnpm --filter @ezhana/design-tokens test` builds the tokens and then checks, among other things:

- the layer model: primitives are emitted once, never themed, and the core stylesheet contains no
  theme selectors;
- the semantic contract across every color mode, in the resolved JSON and in `contract.json`;
- that `contract.json` and the resolved values describe exactly the same token sets;
- that every `var()` reference is declared, no `{token}` placeholder leaked and no custom property is
  declared twice in a block;
- the CSS selector strategy for explicit and system color modes, and `color-scheme`;
- **WCAG AA contrast (≥ 4.5:1)** for every foreground/background pair published in
  `contract.contrast.pairs`, in every color mode.

Theme packages run their own suites with the same contrast assertion for the tokens they override.

## Design decisions

- **Design tokens are data, not runtime code.** The build produces static artifacts; apps pay zero
  runtime cost for token resolution.
- **Complete core stylesheet.** It can be imported alone (default theme) or embedded by a theme
  preset. The default theme is real, not a placeholder.
- **Semantic layer is the public API.** Primitive tokens are exported for tooling and layout scales,
  but themed properties must use semantic tokens.
- **Themes are packages, not layers.** A theme does not introduce new token names (theme-private
  tokens are build-time material), so component code and the semantic contract stay stable.
- **Themes are attributes, not classes.** Attributes are easy to drive from SSR, tests and plain
  HTML, and they compose with a second `data-color-mode` axis.
- **Both axes are orthogonal.** Theme identities are added without touching color modes and vice
  versa.
- **No component layer in this package.** Component tokens belong to a component API and are better
  versioned separately.

## References

- [Design Tokens Community Group format](https://www.w3.org/community/design-tokens/)
- [Style Dictionary](https://styledictionary.com/)
- [W3C Design Tokens format](https://tr.designtokens.org/format/)
- [CSS cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
