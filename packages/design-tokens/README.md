# @ezhana/design-tokens

Core design tokens for the Ezhana templates: a primitive scale, a semantic contract and a default
theme, compiled with [Style Dictionary](https://styledictionary.com/) into one stylesheet of CSS
custom properties plus generated metadata, types and a machine-readable theme contract.

The package follows the standard layering — **primitive → semantic → component** — with two
important rules:

- **Themes are not a layer and not a token namespace.** A theme is a separate package that
  overrides semantic tokens; it is built with [`@ezhana/theme-builder`](../theme-builder/README.md).
  This package ships the contract those themes are validated against, and the default theme.
- **The color mode is orthogonal to the theme identity.** Themes are selected by `data-theme`,
  modes by the optional `data-color-mode` attribute, and the system preference by CSS.

```html
<!-- default theme, follow the OS color mode -->
<html data-theme="default"></html>

<!-- a theme package with an explicit color mode -->
<html data-theme="cerulean" data-color-mode="dark"></html>
```

## Installation

```sh
pnpm add @ezhana/design-tokens
# optional: the official themes
pnpm add @ezhana/design-theme-cerulean @ezhana/design-theme-ocean
```

At the source-repository root, `pnpm build` compiles this package and every theme package, and
`pnpm test` runs the contract, CSS, metadata and WCAG contrast checks:

```bash
pnpm build           # core tokens, then the theme packages
pnpm test            # contract, CSS, metadata and WCAG contrast checks
```

Generated applications are consumers, not builders: they install the published packages and import
the generated CSS, so there is no token build step in an app. Rebuild here whenever you change
`tokens/`, and the theme packages are rebuilt after the core package because they read its contract
and stylesheet.

## Usage

Import the core stylesheet once, before any application CSS, and a theme package entry after it:

```ts
// main.ts / main.tsx
import '@ezhana/design-tokens/css/tokens.css'
import '@ezhana/design-theme-cerulean/style' // core CSS + theme overrides + fonts
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
}
```

Theme metadata is generated as ESM with literal TypeScript types:

```ts
import {
  defaultTheme,
  defaultThemeDefinition,
  modeLabels,
  modes,
  semanticTokenNames,
  tokenNames,
  type Mode,
  type ModePreference,
  type ThemeDefinition,
} from '@ezhana/design-tokens'
```

There is no `themes` list and no `Theme` union in this package: theme identities belong to theme
packages, and `defineThemeRegistry` from [`@ezhana/theme`](../theme/README.md#definethemeregistrydefinitions-options)
assembles them.

## Layer model

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ primitive layer      raw, context-free values. Never themed.                │
│ --primitive-color-neutral-0     neutral, violet, red, green, amber ramps     │
│ --primitive-space-4             spacing, radius, border, size, motion       │
│ --primitive-font-size-md        typography scales                           │
│        ▲                                                                    │
│        │ semantic values may only reference primitives                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ semantic layer       intent-based tokens. The public API for product code.   │
│ --color-bg           The default theme lives here (tokens/semantic).        │
│ --color-accent       Theme packages override these exact names.             │
│ --font-family-sans   No theme adds new token names.                         │
│ --radius-control                                                            │
│        ▲                                                                    │
│        │ component tokens (optional) live in a separate package             │
├─────────────────────────────────────────────────────────────────────────────┤
│ theme packages       semantic-token overrides. Not part of this package.     │
└─────────────────────────────────────────────────────────────────────────────┘
```

A token in a lower layer never references a higher layer, so adding a theme or a color mode can
never break component CSS.

### What lives where

| Concern                              | Owner                      | Emitted as CSS variables        |
| ------------------------------------ | -------------------------- | ------------------------------- |
| Shared primitive scale               | this package               | yes (`--primitive-*`)           |
| Semantic tokens + default theme      | this package               | yes (`--color-*`, …)            |
| Theme contract                       | this package               | no (`dist/json/contract.json`)  |
| Theme-private palette (`theme.*`)    | theme package, build time  | **no**                          |
| Theme semantic overrides             | theme package              | yes, `:root[data-theme="<id>"]` |
| Theme + mode state (`data-theme`, …) | `@ezhana/theme` or the app | n/a                             |

The core primitive scale intentionally contains only shared material: neutrals, the status colors,
the default theme's violet accent, spacing, radii, borders, type and motion. A brand hue such as
cerulean blue or ocean blue lives in the theme package that uses it — see
[ADR 0003](../../docs/adr/0003-themes-as-packages.md).

## Theme contract

Every theme must override the following semantic tokens. Anything else is inherited from the default
semantic values, which keeps themes small and lets new semantic tokens appear everywhere without
touching every theme.

| Section                   | Required overrides                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `base` (mode-independent) | `font.family.sans`, `font.family.heading`, `radius.control`                                                               |
| every color mode          | `color.accent`, `color.accent-hover`, `color.on-accent`, `color.accent-subtle`, `color.accent-border`, `color.focus-ring` |

The contract is published for tooling as `@ezhana/design-tokens/contract`
(`dist/json/contract.json`) and is versioned: `@ezhana/theme-builder` refuses a contract version it
does not understand.

```json
{
  "version": 1,
  "modes": [
    { "id": "light", "label": "Light", "colorScheme": "light" },
    { "id": "dark", "label": "Dark", "colorScheme": "dark" }
  ],
  "defaultMode": "light",
  "required": {
    "base": ["font.family.sans", "font.family.heading", "radius.control"],
    "mode": ["color.accent", "…"]
  },
  "semanticTokens": { "base": ["…"], "modes": { "light": ["…"], "dark": ["…"] } },
  "primitiveTokens": ["primitive.color.neutral.0", "…"],
  "themeNamespace": "theme",
  "themeIdPattern": "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$"
}
```

Only the **required** set is enforced. Because themes are independent packages, a theme may override
additional semantic tokens without other themes having to match — the previous "every theme must
override exactly the same set" rule cannot be enforced across package boundaries and is dropped.

## Generated artifacts

`dist/` is rebuilt from `tokens/` and is not committed.

| artifact                  | contents                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `dist/css/tokens.css`     | primitive tokens, default-theme semantic tokens for every mode, `color-scheme` rules                                    |
| `dist/json/core.json`     | resolved primitive values plus resolved semantic values per mode (tooling, tests, theme baseline)                       |
| `dist/json/contract.json` | the theme contract described above                                                                                      |
| `dist/js/index.js`        | `defaultTheme`, `defaultThemeDefinition`, `modes`, `modeLabels`, token-name arrays                                      |
| `dist/js/index.d.ts`      | literal unions (`Mode`, `ModePreference`, `PrimitiveTokenName`, `SemanticTokenName`, `TokenName`) and `ThemeDefinition` |

Public subpath exports: `@ezhana/design-tokens/css/tokens.css`, `@ezhana/design-tokens/json`,
`@ezhana/design-tokens/contract` and `@ezhana/design-tokens` (metadata).

### One core stylesheet, one stylesheet per theme

The core stylesheet contains the primitive layer and the default theme. A theme package adds one
small stylesheet that only remaps semantic custom properties, so the payload grows by a few
kilobytes per installed theme instead of shipping every theme to every app.

Themes ship as static CSS rather than lazily loaded files: a network round trip, a loading state and
a flash of the wrong theme are worse than a few kilobytes the bundler already has to serve. Because
each theme only overrides semantic properties, an app that installs two themes pays for two small
files, not for a per-theme bundle.

The core stylesheet also declares fallbacks so the app is usable before JavaScript runs and for
users without JavaScript:

- the `default` theme + `light` mode are emitted for `:root`;
- the stylesheet includes `color-scheme` for each mode, so native scrollbars and form controls match.

For a flash-free _dark_ first paint when the user explicitly chose dark, resolve the stored
preference in an inline `<head>` script before the stylesheet is parsed. The snippet is documented in
[`@ezhana/theme`](../theme/README.md#avoiding-flash-of-wrong-theme).

### Selector strategy

Core:

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
```

A theme package adds blocks with higher specificity, so it wins regardless of import order:

```css
:root[data-theme='ocean'] {
  /* mode-independent overrides + ocean values for the default color mode */
}
:root[data-theme='ocean'][data-color-mode='dark'] {
  /* ocean values for the explicit dark mode */
}
@media (prefers-color-scheme: dark) {
  :root[data-theme='ocean']:not([data-color-mode]) {
    /* ocean values for the system dark mode */
  }
}
```

`data-theme` is never "resolved" to a mode value; it always names the theme. The color mode is
either explicit (`data-color-mode`) or inherited from the OS through CSS.

### Cascade layer

All token declarations live inside a single
[`@layer design-tokens`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer), in the core
package and in every theme package. The consequence is useful: any **unlayered** application CSS can
override a token — no specificity battles, no `!important`:

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

Keeping the `var()` chain (instead of flattening to a hex value) means browser dev tools show the
full token lineage, and consumers can override a primitive without touching semantics. Theme
packages are the exception: they emit resolved values, because their private palette is build-time
material that must not become a CSS variable.

### Naming rules

- **Primitive layer**: `primitive.<category>.<scale>` → `--primitive-color-violet-600`,
  `--primitive-space-4`. Raw values only; no intent in the name.
- **Semantic layer**: `<category>.<role>[.<state>]` → `--color-fg-muted`, `--color-accent-hover`,
  `--font-size-body`. Names describe **intent**, never appearance (never `--color-blue-text`).
  Semantic values may only reference primitive tokens.
- **Theme-private tokens** (theme packages only): `theme.<category>.<name>` — build-time material,
  never emitted, never consumable by product CSS.
- **Component layer** (optional, separate package): `<component>.<property>[.<state>]` →
  `--button-bg`, `--card-padding`. Values must reference semantic tokens, never primitives or raw
  values. See [Component layer](#component-layer-optional).

Layout primitives such as spacing may be consumed directly from the primitive scale
(`--primitive-space-4`); colors, typography, radii and elevation should always go through semantic
tokens so a theme can change them.

### Directory layout

```text
tokens/
├── primitive/              # context-free values, never themed
│   ├── color.json          #   neutral, violet, red, green, amber ramps
│   ├── dimension.json      #   space, radius, border width, content width, motion
│   └── typography.json     #   font stacks, size scale, weights, line heights
└── semantic/
    ├── base.json           # mode-independent semantic defaults
    ├── light.json          # default theme, light mode (color + shadow)
    └── dark.json           # default theme, dark mode
```

Theme sources live in their own packages — see
[`@ezhana/design-theme-cerulean`](../design-theme-cerulean/README.md) for the canonical layout.

### Adding a color mode

1. Add `tokens/semantic/<mode>.json` with the same semantic token set as `light.json`
   (start by copying it) and your values.
2. Add a `<mode>` block to every theme package; their build fails with an actionable message listing
   what is missing.
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
├── theme.config.mjs        # id, label, tokens, overrides, fonts
├── tokens/palette.json     # theme-private palette, under `theme.*`
├── tokens/theme.json       # semantic overrides: base + one section per color mode
└── scripts/build.mjs       # await buildTheme(new URL('../theme.config.mjs', import.meta.url))
```

The builder validates the required overrides, rejects unknown references and non-semantic overrides,
checks WCAG AA contrast for the resolved values, and generates the theme stylesheet, standalone
stylesheet, style entry, metadata and types. Nothing in this package changes when a theme is added.

Two official theme packages demonstrate the pattern:
[`@ezhana/design-theme-cerulean`](../design-theme-cerulean/README.md) (custom palette, Public Sans,
full [design narrative](../design-theme-cerulean/docs/DESIGN.md)) and
[`@ezhana/design-theme-ocean`](../design-theme-ocean/README.md).

## Component layer (optional)

Component tokens are intentionally **not** part of this package. They describe a specific component
and belong to a component API; keeping them out keeps `@ezhana/design-tokens` stable and
theme-agnostic.

When a component layer is needed, add it as a **separate package** (e.g. `@ezhana/component-tokens`)
that depends on this one:

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

## Build pipeline

`scripts/build.mjs` is a thin, strict orchestrator around Style Dictionary's programmatic API:

1. **Load** primitive and semantic token files, stripping file-level metadata.
2. **Validate the contract** before generating anything:
   - every color mode declares exactly the same semantic token set;
   - every `{reference}` resolves and only points at the primitive layer;
   - every required theme-contract token exists in the semantic layer (otherwise the published
     contract would be unsatisfiable);
   - no duplicate declarations.
3. **Build one Style Dictionary instance per color mode** to resolve and validate every value, plus
   one instance per CSS section.
4. **Capture outputs in memory** with `styleDictionary.formatPlatform()`, assemble sections in a
   deterministic order with fallback selectors, and wrap everything in `@layer design-tokens`.
5. **Emit** CSS, resolved JSON, the contract, ESM metadata and `.d.ts` declarations. The resolved
   JSON is also what the accessibility tests consume.

## Tests

`pnpm --filter @ezhana/design-tokens test` builds the tokens and then checks, among other things:

- the layer model: primitives are emitted once, never themed, and the core stylesheet contains no
  theme selectors;
- the semantic contract across every color mode, in the core JSON and in `contract.json`;
- that `contract.json` and the resolved values describe exactly the same token sets;
- that every `var()` reference is declared, no `{token}` placeholder leaked and no custom property is
  declared twice in a block;
- the CSS selector strategy for explicit and system color modes, and `color-scheme`;
- **WCAG AA contrast (≥ 4.5:1)** for every foreground/background pair of the default theme.

Theme packages run their own suites with the same contrast assertion for the tokens they override.

## Design decisions

- **Design tokens are data, not runtime code.** The build produces static artifacts; apps pay zero
  runtime cost for token resolution.
- **Semantic layer is the public API.** Primitive tokens are exported for tooling and layout scales,
  but themed properties must use semantic tokens.
- **Themes are packages, not layers.** A theme does not introduce new token names (theme-private
  tokens are build-time material), so component code and the semantic contract stay stable.
- **Themes are attributes, not classes.** Attributes are easy to drive from SSR, tests and plain
  HTML, and they compose with a second `data-color-mode` axis.
- **Both axes are orthogonal.** Theme identities are added without touching color modes and vice
  versa.
- **One core stylesheet, one small stylesheet per theme.** No per-theme bundling, no runtime CSS
  loading, no flash of the wrong theme.
- **No component layer in this package.** Component tokens belong to a component API and are better
  versioned separately.

## References

- [Design Tokens Community Group format](https://www.w3.org/community/design-tokens/)
- [Style Dictionary](https://styledictionary.com/)
- [W3C Design Tokens format](https://tr.designtokens.org/format/)
- [CSS cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
