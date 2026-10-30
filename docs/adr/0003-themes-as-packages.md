# ADR 0003: Themes ship as standalone packages

- **Status:** Accepted
- **Date:** 2026-10-30
- **Scope:** `@ezhana/design-tokens`, new `@ezhana/theme-builder`, `@ezhana/theme`, new
  `@ezhana/design-theme-*` packages, the generated app template
- **Supersedes:** the "themes are in-package semantic overrides" model of
  [ADR 0001](0001-create-app-in-template-repo.md) and the token-package README sections that
  document it

## Context

Until now every theme lived inside `@ezhana/design-tokens`:

```text
packages/design-tokens/tokens/themes/<theme>.json   # semantic overrides
packages/design-tokens/tokens/primitive/color.json  # every theme's palette ramp
```

That model has three structural problems.

1. **Third parties cannot add a theme.** The build script scans a fixed directory inside the
   package, `files` never ships `tokens/`, and the generated `Theme` union type is frozen at publish
   time. A third party can only fork the package or ship CSS by hand — bypassing validation,
   contrast checks and metadata.
2. **Theme-private material leaks into the core namespace.** `primitive.color.cerulean.*` and
   `primitive.color.blue.*` exist only because two themes need them, yet they are declared as
   global CSS custom properties and typed as `PrimitiveTokenName`, inviting product code to consume
   them. Every new theme would grow the core palette forever.
3. **Themes are not independently versioned.** A theme fix forces a release of the shared token
   package, and the "all themes must override exactly the same token set" rule couples unrelated
   themes: one theme adding an override breaks every other one.

The long-term product goal is: a third party installs `@ezhana/design-tokens`, defines a theme with
`@ezhana/theme-builder`, and ships a theme package. An app then imports either the core package
alone, a third-party theme package alone, or a set of theme packages; theming state is handled by
`@ezhana/theme` or by the app itself.

## Decision

### 1. Layer ownership

| Layer                        | Owner                         | Emitted as CSS variables?              |
| ---------------------------- | ----------------------------- | -------------------------------------- |
| Core primitive scale         | `@ezhana/design-tokens`       | yes (`--primitive-*`, never themed)    |
| Semantic contract + default  | `@ezhana/design-tokens`       | yes (`--color-*`, `--font-*`, …)       |
| Theme-private palette/tokens | the theme package (`theme.*`) | **no** — build-time material only      |
| Theme semantic overrides     | the theme package             | yes, selected by `:root[data-theme=…]` |
| Theme + mode state           | `@ezhana/theme` (or the app)  | n/a (`data-theme` / `data-color-mode`) |

`primitive.color.violet` stays in core because it is the default theme's accent. The `blue` and
`cerulean` ramps move to the theme packages that need them.

### 2. Packages

| Package                         | Kind            | Responsibility                                                                  |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| `@ezhana/design-tokens`         | build-time data | core primitive scale, semantic contract, default theme, base CSS, contract JSON |
| `@ezhana/theme-builder`         | build-time tool | validate + build a theme source into CSS/metadata; CLI                          |
| `@ezhana/theme`                 | runtime         | theme/mode state machine, `defineThemeRegistry`, DOM attributes, persistence    |
| `@ezhana/design-theme-cerulean` | official theme  | Cerulean palette, Public Sans, overrides, docs                                  |
| `@ezhana/design-theme-ocean`    | official theme  | Ocean palette, pill controls, overrides, docs                                   |

A theme package depends on `@ezhana/design-tokens` (its CSS and contract are the build input) and
**must not** depend on `@ezhana/theme`: state management is the app's choice.

### 3. `@ezhana/design-tokens` public surface

```ts
import {
  defaultTheme, // 'default'
  defaultThemeDefinition, // { id: 'default', label: 'Default', modes: ['light', 'dark'] }
  modes, // ['light', 'dark']
  modeLabels, // { light: 'Light', dark: 'Dark' }
  primitiveTokenNames,
  semanticTokenNames,
  tokenNames,
  type Mode,
  type ModePreference,
  type ThemeDefinition,
} from '@ezhana/design-tokens'

import '@ezhana/design-tokens/css/tokens.css' // core CSS only: primitives + default theme
```

Removed: `themes`, `themeLabels` (theme identity is a registry concern now) and the `Theme` union
(ids are owned by theme packages).

Subpath exports:

| Subpath                     | Content                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `.`                         | metadata + types listed above                                   |
| `./css`, `./css/tokens.css` | core CSS custom properties (primitives + default theme × modes) |
| `./contract`                | machine-readable contract consumed by `@ezhana/theme-builder`   |
| `./json`                    | resolved core values (primitives + semantic per mode)           |

`dist/json/contract.json` shape (versioned; `version` bumps on breaking changes):

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
  "themeNamespace": "theme",
  "themeIdPattern": "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$"
}
```

Only the **required** set is enforced. Extra overrides are allowed per theme, because themes are
independent packages: the previous "every theme must override the same set" rule cannot be enforced
across repository boundaries and is dropped.

### 4. Theme source format and build

A theme package contains a `theme.config.mjs` and its own token sources:

```text
packages/design-theme-cerulean/
├── theme.config.mjs
├── tokens/
│   ├── palette.json     # theme-private tokens, all under `theme.*`
│   └── theme.json       # DTCG overrides: base + one block per color mode
└── dist/                # generated
```

```js
// theme.config.mjs
import { defineTheme } from '@ezhana/theme-builder'

export default defineTheme({
  id: 'cerulean',
  label: 'Cerulean',
  description: 'Cerulean-blue accent, Public Sans, moderate (level 2) controls.',
  tokens: ['tokens/palette.json'], // theme-private DTCG files, root must be `theme`
  overrides: 'tokens/theme.json', // base + light + dark DTCG sections
  fonts: ['@fontsource-variable/public-sans'], // imported by the generated runtime entry
})
```

```js
// scripts/build.mjs
import { buildTheme } from '@ezhana/theme-builder'

await buildTheme(new URL('../theme.config.mjs', import.meta.url))
```

`theme.json` sections are the same DTCG format as the core package. Overrides may reference
`{primitive.*}` (core scale) and `{theme.*}` (this theme's private tokens) and nothing else.

The builder validates the theme before writing anything: the required overrides exist in every
color mode, every override targets an existing semantic token of that section, every reference
resolves to a core primitive or a theme-private token, the color-mode sections match the contract,
and the resolved values meet WCAG 2.2 AA contrast for the tokens a theme can retheme.

Generated outputs (fixed layout, written to `<theme package>/dist`):

| Artifact                  | Content                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `dist/css/theme.css`      | overrides only, `:root[data-theme="<id>"]` selectors, resolved values                     |
| `dist/css/standalone.css` | core `tokens.css` + `theme.css` (single-import usage)                                     |
| `dist/style.js`           | `import` of the core stylesheet, then every configured font entry, then `./css/theme.css` |
| `dist/js/index.js`        | `themeId`, `themeLabel`, `modes`, `theme` (a `ThemeDefinition`)                           |
| `dist/js/index.d.ts`      | literal types for the above                                                               |
| `dist/json/theme.json`    | resolved semantic values per mode + metadata (tooling and tests)                          |

Theme packages export: `.` (metadata), `./style` (self-sufficient bundler entry: core stylesheet +
fonts + overrides), `./theme.css` (overrides only), `./standalone.css` (core + overrides, for
consumers that do not have a bundler), `./json`.

The self-sufficient `./style` entry is what makes "install only a theme package" work: importing it
is enough to get valid CSS. It imports the core stylesheet by module id, so an app that also imports
`@ezhana/design-tokens/css/tokens.css` does not pay for it twice.

### 5. CSS selector strategy

Theme CSS uses `:root[data-theme="<id>"]` (specificity 0,2,0) rather than `[data-theme="<id>"]`
(0,1,0), so a theme rule always beats core's `:root` (0,1,0) and `[data-color-mode="dark"]` (0,1,0)
rules. Core's system-preference rule `:root:not([data-color-mode])` (0,2,0) ties the theme base rule,
which is why the theme emits an explicit system block `:root[data-theme]:not([data-color-mode])`
(0,3,0) inside the same media query — and an explicit `:root[data-theme][data-color-mode="<mode>"]`
(0,3,0) block per other mode. To make that sound rather than order-dependent, **every mode block
declares every mode-varying token the theme overrides**: a token overridden only for the default
mode is still pinned to its resolved value in each other mode, so nothing leaks from the base rule.
The CSS therefore never depends on the core stylesheet being loaded first, which is required once
themes are separate packages.

Both core and theme CSS stay inside `@layer design-tokens`, so unlayered application CSS still wins.

### 6. Theme registry

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

`defineThemeRegistry` validates unique ids, non-empty labels, identical `modes` across definitions
and returns a frozen `{ themes, themeLabels, defaultTheme, modes }`. Apps that do not want the
runtime can ignore the package entirely and write `data-theme` themselves. (The identical-modes rule
was superseded by the [amendment](#amendment-mode-subset-themes-and-expanded-semantic-roles-2026-10-30)
below.)

## Consequences

### Positive

- Third parties can publish a theme without forking the core package, reusing its validation,
  contrast checks and metadata generation.
- Core primitive scale only contains shared material; theme palettes stop leaking into product CSS
  and into `PrimitiveTokenName`.
- Themes version independently; the all-themes-must-match override rule disappears.
- The token stylesheet no longer grows with every theme: an app ships the themes it installs.
- Theme CSS is load-order independent, which is what makes multi-package theming safe.

### Negative / trade-offs

- More packages to release (core → theme packages → generator → template export ordering).
- An app that wants several themes now imports several CSS files instead of one; that is the price
  of per-theme artifacts, and each extra theme is a few kB of custom properties.
- Theme authors must satisfy the contract through a build tool (`@ezhana/theme-builder`); hand-written
  theme CSS is supported but unvalidated.
- The `Theme` union type no longer exists in the core package; apps derive it from their registry.

### Neutral

- `@ezhana/theme` keeps its API; only `defineThemeRegistry` is added.
- The design-token layering (primitive → semantic → optional component) is unchanged.

## Alternatives considered

1. **Keep themes in core and add a `registerTheme()` runtime API** (rejected: themes are static CSS
   data; a runtime registry would either inline CSS at runtime or require every theme to ship in one
   stylesheet, reintroducing the leak and the release coupling).
2. **Merge third-party primitives into the global primitive namespace** (rejected: collisions
   between packages, unpredictable CSS output, unstable `PrimitiveTokenName`).
3. **Lazy-load a CSS file per theme at runtime** (rejected: a network round trip, a loading state and
   a flash of the wrong theme; static imports let bundlers handle it).
4. **Keep one theme in core as a worked example** (rejected: it would keep a theme-private palette and
   a second theme implementation inside the core package, which is exactly the coupling this ADR
   removes; the official themes now demonstrate the pattern instead).
5. **A single `@ezhana/themes` package containing all official themes** (rejected: it recreates the
   coupling and forces every app to install/depend on every official theme).

## Amendment: mode-subset themes and expanded semantic roles (2026-10-30)

The QuestUI fantasy theme (`@ezhana/design-theme-quest`) exposed two limits of the original decision.
The brief defines a single warm, dark palette — inventing a light-mode palette would be a different
design system — and its component specifications need semantic roles the core layer did not expose.
Both were fixed at the source rather than patched in the theme package.

### 1. Themes may support a subset of color modes

- `theme.config.mjs` accepts an optional `modes` list. Omitted/empty means "every contract color
  mode"; otherwise the theme declares the subset it supports and provides an override section for
  each declared mode only.
- A single declared mode produces a **fixed-mode** stylesheet: one rule whose selector list is
  `:root[data-theme="<id>"]`, `:root[data-theme="<id>"]:not([data-color-mode])` and
  `:root[data-theme="<id>"][data-color-mode]`, carrying the contract overrides and the mode values
  plus `color-scheme: <mode>`. There are no `data-color-mode` or `prefers-color-scheme` theme blocks.
  The two 0,3,0 variants cover both attribute states, keeping the specificity above core's mode and
  system-preference rules and preserving load-order independence (section 5).
- `defineThemeRegistry` no longer rejects differing mode lists. It returns `themeModes`
  (`Record<id, modes[]>` in each theme's declared order) and `modes` as the union in first-seen order.
- `createThemeManager` accepts `themeModes`. `resolvedMode` is clamped to a mode the active theme
  supports: a `light` preference (or a light OS preference in `system` mode) resolves to `dark` while
  QuestUI is active, and applies again after switching back to a full-mode theme. `data-color-mode`
  is only written for explicit preferences and only ever contains a supported mode.
- Full-mode themes are unaffected; their generated artifacts remain byte-identical.

### 2. The semantic layer gained general-purpose roles and scales

`@ezhana/design-tokens` now exposes layered surfaces (`color.surface`, `color.surface-elevated`,
`color.border-subtle`), status tints (`color.*-subtle`), the `info` / `info-solid` / `on-info` and
`danger-solid` roles, the complete display→caption type scale with per-role line heights and
`font.letterSpacing.label`, `font.weight.bold`, `radius.modal` / `radius.panel`, and
`shadow.lg` / `shadow.xl` / `shadow.glow`. Every token has default values in every color mode, so
existing themes and the default theme are unaffected.

The destructive contrast pair is now `color.on-danger` / `color.danger-solid`: `color.danger` is the
accessible danger _text_ role and `color.danger-solid` is the solid destructive surface. The
contract publishes additional info, surface and elevation contrast pairs. Contract `version` stays
`1` because the change is additive for consumers; the corrected pair semantics are documented in
the package changelog.

### Consequences of the amendment

- A third-party theme can be dark-only (or light-only) without duplicating a palette for a mode it
  does not design, and apps can register it next to mode-complete themes.
- Component-adjacent roles (surfaces, tints, status solids, elevation) no longer force themes to
  inject raw CSS or abuse unrelated tokens.
- The switcher must consult `registry.themeModes` when enabling mode options for the selected theme;
  the manager still keeps working if it does not, by clamping `resolvedMode`.
