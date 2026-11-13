# @ezhana/theme-builder

Build and validate a theme package for [`@ezhana/design-tokens`](../design-tokens/README.md).

A theme is a package that overrides **semantic** tokens and ships a complete, self-contained
stylesheet selected by `:root[data-theme="<id>"]`. This tool turns a small DTCG source into that
package:

- validates the theme against the core contract (required overrides, known semantic targets,
  allowed references, declared color modes);
- computes WCAG AA contrast for the tokens a theme can change that carry text or interaction;
- resolves theme-private tokens at build time; they never become CSS custom properties;
- copies font files into `dist/fonts/` and rewrites `@font-face` URLs to the local copies, so
  consumers never install font packages or resolve a dependency's internal font URLs;
- emits `:root[data-theme]`-prefixed CSS, so a theme never depends on stylesheet load order;
- supports color-mode subsets, including fixed-mode (dark-only) themes;
- emits typed metadata that the optional [`@ezhana/theme`](../theme/README.md) runtime consumes
  directly as a `ThemeDefinition`.

## Installation

In the theme package:

```sh
pnpm add @ezhana/design-tokens
pnpm add -D @ezhana/theme-builder
pnpm add -D @fontsource-variable/inter # only if the theme uses a web font
```

- `@ezhana/design-tokens` is a **normal dependency**: the builder resolves it from the theme package
  directory, so the theme is always built against the exact core version it declares. The build
  fails if the manifest does not declare it.
- `@ezhana/theme-builder` and every font package are **devDependencies only**. Fonts are inlined and
  copied into the published `dist/`, so consumers never install them.

## Theme package layout

```text
my-theme/
├── package.json
├── theme.config.mjs
├── tokens/
│   ├── palette.json     # theme-private tokens, rooted at `theme.`
│   └── theme.json       # semantic overrides: base + one section per declared color mode
├── scripts/build.mjs
└── dist/                # generated
```

```js
// theme.config.mjs
import { defineTheme } from '@ezhana/theme-builder'

export default defineTheme({
  id: 'acme', // lowercase kebab-case; used in data-theme and CSS selectors
  label: 'ACME', // switcher label
  description: 'ACME brand theme.',
  tokens: ['tokens/palette.json'], // theme-private DTCG sources
  overrides: 'tokens/theme.json', // DTCG sections: base + one per declared color mode
  fonts: ['@fontsource-variable/inter'], // optional; inlined and copied by the build
  modes: ['light', 'dark'], // optional: modes this theme supports (default: all contract modes)
})
```

```js
// scripts/build.mjs
import { buildTheme } from '@ezhana/theme-builder'

await buildTheme(new URL('../theme.config.mjs', import.meta.url))
```

```json
// package.json
{
  "type": "module",
  "scripts": {
    "build": "node ./scripts/build.mjs",
    "test": "node --test ./test/*.test.mjs",
    "prepack": "pnpm build"
  },
  "dependencies": {
    "@ezhana/design-tokens": "^1.1.0"
  },
  "devDependencies": {
    "@ezhana/theme-builder": "^0.2.0",
    "@fontsource-variable/inter": "^5.3.0"
  }
}
```

## Configuration reference

`defineTheme(config)` validates eagerly and returns a frozen configuration. Unknown option names,
empty strings, duplicate modes and malformed contrast pairs throw `TypeError` at import time.

| Field         | Type               | Default      | Meaning                                                                                                   |
| ------------- | ------------------ | ------------ | --------------------------------------------------------------------------------------------------------- |
| `id`          | `string`           | — (required) | Theme identity, lowercase kebab-case, written to `data-theme`                                             |
| `label`       | `string`           | — (required) | Human-readable label for switcher UIs                                                                     |
| `description` | `string`           | —            | One line, copied into `dist/theme.json`                                                                   |
| `tokens`      | `string[]`         | `[]`         | Theme-private DTCG files, relative to the config file                                                     |
| `overrides`   | `string`           | — (required) | DTCG override file, relative to the config file                                                           |
| `fonts`       | `string[]`         | `[]`         | Font CSS entry points resolved from the theme package (a font package or a local CSS file)                |
| `contrast`    | `{ pairs?, min? }` | `4.5` AA     | Contrast requirements; `pairs` defaults to the core contract pairs plus the builder's additional pairs    |
| `modes`       | `string[]`         | `[]` (all)   | Declared color modes; `[]` = every contract mode, one mode = fixed-mode theme, multiple = declared subset |

## Token sources

### Theme-private tokens (`tokens/palette.json`)

DTCG files whose tokens all live under the `theme.` namespace. They are the theme's palette, shape
scale or any other brand material:

```json
{
  "theme": {
    "color": {
      "acme": {
        "$type": "color",
        "600": { "$value": "#0057b8" },
        "700": { "$value": "#004494" }
      }
    }
  }
}
```

They are resolved into the override values at build time and are **never emitted as CSS custom
properties**, so they cannot be consumed by product CSS and do not extend the core
`PrimitiveTokenName` union.

### Semantic overrides (`tokens/theme.json`)

Same DTCG format as the core package, split into `base` (mode-independent) and one section per
**declared** color mode (by default every core mode):

```json
{
  "base": {
    "font": {
      "family": {
        "sans": { "$value": "Inter, sans-serif", "$type": "fontFamily" },
        "heading": { "$value": "Inter, sans-serif", "$type": "fontFamily" }
      }
    },
    "radius": { "control": { "$value": "8px", "$type": "dimension" } }
  },
  "light": {
    "color": {
      "accent": { "$value": "{theme.color.acme.600}", "$type": "color" },
      "accent-hover": { "$value": "{theme.color.acme.700}", "$type": "color" },
      "on-accent": { "$value": "{primitive.color.neutral.0}", "$type": "color" },
      "accent-subtle": { "$value": "#0057b81a", "$type": "color" },
      "accent-border": { "$value": "#0057b880", "$type": "color" },
      "focus-ring": { "$value": "{theme.color.acme.600}", "$type": "color" }
    }
  },
  "dark": {
    "color": {
      "accent": { "$value": "#69aaff", "$type": "color" },
      "accent-hover": { "$value": "#93c5fd", "$type": "color" },
      "on-accent": { "$value": "{primitive.color.neutral.950}", "$type": "color" },
      "accent-subtle": { "$value": "#69aaff26", "$type": "color" },
      "accent-border": { "$value": "#69aaff80", "$type": "color" },
      "focus-ring": { "$value": "#69aaff", "$type": "color" }
    }
  }
}
```

Every declared color-mode section must contain the whole required set; the build fails with the
missing token name when one is absent. A section for a contract mode the theme does not declare is
rejected as well, so `modes` and the override file cannot drift apart.

Overrides may reference:

| Reference       | Resolves to                                               |
| --------------- | --------------------------------------------------------- |
| `{primitive.*}` | a core primitive token (`@ezhana/design-tokens`)          |
| `{theme.*}`     | a token declared in the theme's own `tokens` files        |
| anything else   | rejected — semantic tokens are overridden, not referenced |

### Theme contract

The contract is published by the core package as `@ezhana/design-tokens/contract.json` and is
versioned, so the builder refuses contracts it does not understand.

| Section                   | Required overrides                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `base` (mode-independent) | `font.family.sans`, `font.family.heading`, `radius.control`                                                               |
| every declared color mode | `color.accent`, `color.accent-hover`, `color.on-accent`, `color.accent-subtle`, `color.accent-border`, `color.focus-ring` |

Only this set is required. A theme may override more semantic tokens; because themes are independent
packages, different themes do not have to override the same additional tokens — the build only
rejects overrides that are not semantic tokens of that section.

## Generated artifacts

`buildTheme()` writes a fixed layout to `<theme package>/dist`; a theme package does not configure
output paths (the recommended `exports` map below depends on them).

| Artifact          | Contents                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `dist/style.css`  | complete self-contained preset: the theme's `@font-face` rules + the full core stylesheet + theme overrides |
| `dist/theme.css`  | theme overrides only, resolved values, `:root[data-theme="<id>"]` selectors                                 |
| `dist/fonts.css`  | rewritten `@font-face` rules only; points at `./fonts/*` (or a "ships no font assets" comment)              |
| `dist/fonts/`     | copied font files; `dist/fonts/licenses/*.txt` for the font packages' license files                         |
| `dist/index.js`   | `theme`, `themeId`, `themeLabel`, `modes` (the theme's declared modes)                                      |
| `dist/index.d.ts` | literal types for the above                                                                                 |
| `dist/theme.json` | resolved override values plus resolved semantic values per declared mode, for tooling and tests             |

`dist/style.css` contains no `@import` statements and no package-internal font URLs: it is ready for
a `<link>` tag or a CSS `@import` in any bundler.

### Recommended `exports`

The official theme packages use exactly this map:

```json
{
  "type": "module",
  "files": ["dist", "docs", "README.md", "CHANGELOG.md"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./style.css": "./dist/style.css",
    "./theme.css": "./dist/theme.css",
    "./fonts.css": "./dist/fonts.css",
    "./theme.json": "./dist/theme.json",
    "./package.json": "./package.json"
  },
  "sideEffects": ["**/*.css"]
}
```

- `./style.css` is the primary consumer entry: fonts + core + overrides in one CSS file.
- `./theme.css` is for apps that import the core stylesheet once and share it across several themes.
- `./fonts.css` is the companion when loading `./theme.css` directly.
- `./theme.json` exposes resolved values for tooling and tests.
- The metadata entry (`.`) exports no CSS and can be imported by the app or the runtime.
- `@fontsource` packages stay in `devDependencies`; consumers never install them.

## CSS shape (full-mode themes)

```css
@layer design-tokens;

@layer design-tokens {
  /* Theme "acme": mode-independent overrides + light color values. */
  :root[data-theme='acme'] {
    --color-accent: #0057b8;
    /* ... */
  }

  /* Theme "acme": dark overrides (explicit). */
  :root[data-theme='acme'][data-color-mode='dark'] {
    --color-accent: #69aaff;
  }

  /* Theme "acme": dark overrides (system preference). */
  @media (prefers-color-scheme: dark) {
    :root[data-theme='acme']:not([data-color-mode]) {
      --color-accent: #69aaff;
    }
  }
}
```

Selectors are prefixed with `:root` (specificity 0,2,0 / 0,3,0) so they beat every core rule
regardless of import order — a theme package is never allowed to depend on being imported last.

## Fixed-mode themes (color-mode subset)

`modes` narrows a theme to the color modes it actually implements. The common case is a single mode,
for example a dark-only business or fantasy theme:

```js
export default defineTheme({
  id: 'quest',
  label: 'Quest',
  overrides: 'tokens/theme.json', // `base` + `dark` only
  modes: ['dark'],
})
```

A fixed-mode theme is applied unconditionally: it ignores `data-color-mode` and
`prefers-color-scheme`, so it cannot flash the wrong palette or depend on the application's mode
preference. The generated stylesheet uses one rule whose selector list carries the plain
`:root[data-theme]` selector plus 0,3,0 variants for both the absent and the explicit
`data-color-mode` attribute states:

```css
@layer design-tokens;

@layer design-tokens {
  /* Theme "quest": mode-independent overrides + fixed dark color values. */
  :root[data-theme='quest'],
  :root[data-theme='quest']:not([data-color-mode]),
  :root[data-theme='quest'][data-color-mode] {
    --color-accent: #c084fc;
    color-scheme: dark;
    /* ... base + dark values ... */
  }
}
```

- Both 0,3,0 arms are required for load-order independence: `:not([data-color-mode])` beats the core
  `:root:not([data-color-mode])` system-preference block when the attribute is absent, and
  `[data-color-mode]` beats core's `[data-color-mode="dark"]` arm when any explicit mode is present.
- `color-scheme: <mode colorScheme>` styles native form controls and scrollbars for the fixed mode.
- There is no `[data-theme][data-color-mode=...]` theme rule and no `@media (prefers-color-scheme)`
  theme block at all.
- Metadata and `dist/theme.json` publish only the declared modes (`modes: ['dark']`), and
  `defaultMode` is that mode. The optional runtime clamps a `light` preference to `dark` while the
  theme is active.

A subset with more than one mode keeps the full-mode shape: the contract's default mode (when
declared) — otherwise the first declared mode — goes on the base rule, and the remaining declared
modes get their explicit and system-preference blocks. Declared order is preserved everywhere
(metadata, JSON, CSS).

## Fonts

`fonts` accepts font CSS entry points (for example `@fontsource-variable/inter` or
`@fontsource/cinzel/400.css`) resolved from the theme package. The builder:

1. reads each entry and collects every local `url()` target;
2. copies the font files into `dist/fonts/` with stable names;
3. rewrites the URLs to `./fonts/<name>` in `dist/fonts.css` and `dist/style.css`;
4. copies a font package's `LICENSE` into `dist/fonts/licenses/<package-slug>.txt` when present.

External (`https:`, `data:`, `//`, `#`) URLs are left untouched. A missing font entry fails the build
with the theme package directory and the resolution error.

## Contrast requirements

`buildTheme()` fails when a pair is below WCAG 2.2 AA (4.5:1) for the resolved values (core defaults
merged with the theme's overrides). It validates the core contract's `contrast.pairs` plus additional
theme-specific pairs, de-duplicated:

```text
color.on-accent / color.accent        color.accent / color.bg         color.accent-hover / color.bg
color.fg / color.bg                   color.fg-muted / color.bg       color.fg-strong / color.bg
color.fg-strong / color.bg-subtle     color.on-danger / color.danger-solid
color.danger / color.bg               color.success / color.bg        color.warning / color.bg
color.info / color.bg                 color.on-info / color.info-solid
color.fg / color.surface              color.fg-muted / color.surface  color.fg-strong / color.surface-elevated
```

`on-danger` is checked against the `danger-solid` surface, not the `danger` text color: a danger text
token must stay readable on `bg`, while the solid destructive surface carries the label.

Override the requirements per theme when the theme rethemes more of the semantic layer:

```js
defineTheme({
  // ...
  contrast: { min: 4.5, pairs: [['color.on-accent', 'color.accent']] },
})
```

Contrast is computed on opaque hex colors only; a transparent token in a pair fails with an
explanation instead of a silently wrong ratio.

## Build failures

The build stops at the first problem and names the offending token, file or reference. Typical
messages:

```text
Theme "acme" must override the required theme token "color.focus-ring" in the "dark" section.
The font entry "@fontsource-variable/inter" cannot be resolved from "/repo/packages/acme-theme".
The theme package in "/repo/packages/acme-theme" does not declare @ezhana/design-tokens.
The theme id "Acme" does not match the contract's themeIdPattern ^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$.
```

The builder validates before writing, so a failed build leaves the previous `dist/` in place rather
than shipping partial artifacts.

## API

### `defineTheme(config)`

Returns a validated, frozen configuration. See the
[configuration reference](#configuration-reference).

### `buildTheme(configOrFile, options?)`

```js
await buildTheme(new URL('../theme.config.mjs', import.meta.url))
// or
await buildTheme(defineTheme({ id: 'acme', label: 'ACME', overrides: 'tokens/theme.json' }), {
  cwd: new URL('.', import.meta.url),
})
```

- `configOrFile`: a config object, a path to `theme.config.mjs`, or a file URL. A file input resolves
  `tokens`/`overrides`/`fonts` relative to that file's directory.
- `options.cwd`: the theme package directory used with a config object (defaults to
  `process.cwd()`).
- Resolves to `{ id, label, cwd, contractVersion, outputs }`, where `outputs` carries the absolute
  generated paths (`styleCss`, `themeCss`, `fontsCss`, `fonts`, `metadata`, `types`, `json`).

### `DEFAULT_CONTRAST_PAIRS`, `contrastRatio(foreground, background)`

The default foreground/background pairs and the WCAG contrast helper used by the build. Both are
exported for theme tests and tooling.

## CLI

```sh
pnpm exec theme-builder [build] [--config ./theme.config.mjs] [--cwd <dir>]
```

The programmatic API is the primary interface; the CLI exists for ad-hoc builds and package managers
that prefer a binary.

## Consuming the generated theme

A single theme package is complete:

```bash
pnpm add @ezhana/design-theme-acme
```

```css
@import '@ezhana/design-theme-acme/style.css';
```

```html
<html data-theme="acme"></html>
```

For a multi-theme app, import the core stylesheet once plus each theme's split entries:

```css
@import '@ezhana/design-tokens/style.css';
@import '@ezhana/design-theme-acme/fonts.css';
@import '@ezhana/design-theme-acme/theme.css';
```

The theme metadata is available for the optional runtime:

```ts
import { theme as acme } from '@ezhana/design-theme-acme'
// acme -> { id: 'acme', label: 'ACME', modes: ['light', 'dark'] }
```

## Official examples

- [`@ezhana/design-theme-cerulean`](../design-theme-cerulean/README.md) — custom palette, Public Sans
  variable font, measured contrast table in
  [`docs/DESIGN.md`](../design-theme-cerulean/docs/DESIGN.md).
- [`@ezhana/design-theme-ocean`](../design-theme-ocean/README.md) — pill-shaped controls, no custom
  font, light + dark.
- [`@ezhana/design-theme-onyx`](../design-theme-onyx/README.md) — a fixed-mode (dark-only) black-gold
  business theme: champagne gold on soft warm graphite, Public Sans, moderate 8px/12px shape scale.
- [`@ezhana/design-theme-quest`](../design-theme-quest/README.md) — a fixed-mode (dark-only) fantasy
  theme with a custom palette, three font families and tokenized component recipes. It is the
  reference for `modes` and fixed-mode output.
- [`@ezhana/design-theme-obsidian`](../design-theme-obsidian/README.md) — a fixed-mode (dark-only)
  Obsidian & Gold business theme: 24K gold on warm near-black obsidian, Inter body with Playfair
  Display headings.

Their `test/theme.test.mjs` suites are the reference contract tests for a theme package.
