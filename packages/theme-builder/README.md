# @ezhana/theme-builder

Build and validate a theme package for [`@ezhana/design-tokens`](../design-tokens/README.md).

A theme is not a token layer: it is a package that overrides **semantic** tokens and ships a
stylesheet selected by `:root[data-theme="<id>"]`. This tool turns a small token source into that
package: validated, resolved, typed and documented by generated metadata.

- Validates the theme against the core contract (required overrides, known semantic tokens,
  references, color modes).
- Computes WCAG AA contrast for the tokens a theme can change that carry text or interaction.
- Resolves theme-private tokens at build time; they never become CSS custom properties.
- Emits `:root[data-theme]`-prefixed CSS, so a theme never depends on stylesheet load order.
- Emits typed metadata for `defineThemeRegistry` from [`@ezhana/theme`](../theme/README.md).

## Installation

```sh
pnpm add -D @ezhana/theme-builder
pnpm add @ezhana/design-tokens
```

`@ezhana/design-tokens` belongs in the theme package's dependencies: the builder resolves it from
the theme package directory, so the theme is always built against the exact core version it
declares.

## Theme package layout

```text
my-theme/
├── package.json
├── theme.config.mjs
├── tokens/
│   ├── palette.json     # theme-private tokens, rooted at `theme.`
│   └── theme.json       # semantic overrides: base + one section per color mode
├── scripts/build.mjs
└── dist/                # generated
```

```js
// theme.config.mjs
import { defineTheme } from '@ezhana/theme-builder'

export default defineTheme({
  id: 'acme', // lowercase kebab-case, used in data-theme and CSS selectors
  label: 'ACME', // switcher label
  description: 'ACME brand theme.',
  tokens: ['tokens/palette.json'], // theme-private DTCG sources
  overrides: 'tokens/theme.json', // DTCG sections: base + one per color mode
  fonts: ['@fontsource-variable/inter'], // optional: imported by the generated style entry
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
    "@ezhana/design-tokens": "^1.0.0",
    "@fontsource-variable/inter": "^5.3.0"
  },
  "devDependencies": {
    "@ezhana/theme-builder": "^0.1.0"
  }
}
```

## Token sources

### Theme-private tokens (`tokens/palette.json`)

DTCG files whose tokens all live under the `theme.` namespace. They are the theme's palette,
shape scale or any other brand material:

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

Same DTCG format as the core package, split into `base` (mode-independent) and one section per color
mode:

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

Every color-mode section must contain the whole required set; the build fails with the missing token
name when one is absent.

Overrides may reference:

| Reference       | Resolves to                                               |
| --------------- | --------------------------------------------------------- |
| `{primitive.*}` | a core primitive token (`@ezhana/design-tokens`)          |
| `{theme.*}`     | a token declared in the theme's own `tokens` files        |
| anything else   | rejected — semantic tokens are overridden, not referenced |

### Theme contract

The contract is published by the core package as `@ezhana/design-tokens/contract`
(`dist/json/contract.json`) and is versioned, so the builder refuses contracts it does not
understand.

| Section                   | Required overrides                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `base` (mode-independent) | `font.family.sans`, `font.family.heading`, `radius.control`                                                               |
| every color mode          | `color.accent`, `color.accent-hover`, `color.on-accent`, `color.accent-subtle`, `color.accent-border`, `color.focus-ring` |

Only this set is required. A theme may override more semantic tokens; because themes are
independent packages, different themes do not have to override the same additional tokens — the
build only rejects overrides that are not semantic tokens of that section.

## Generated artifacts

`buildTheme()` writes a fixed layout to `<theme package>/dist`, so a theme package does not configure
output paths (the recommended `exports` map below depends on them):

| Artifact                  | Contents                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `dist/css/theme.css`      | overrides only, resolved values, `:root[data-theme="<id>"]` selectors                 |
| `dist/css/standalone.css` | core `tokens.css` concatenated with the theme overrides                               |
| `dist/style.js`           | imports the core stylesheet, the configured font entries and `./css/theme.css`        |
| `dist/js/index.js`        | `themeId`, `themeLabel`, `modes`, `theme` (a `ThemeDefinition`)                       |
| `dist/js/index.d.ts`      | literal types for the above                                                           |
| `dist/json/theme.json`    | resolved override values and resolved semantic values per mode, for tooling and tests |

Recommended `exports` (the two official theme packages do exactly this):

```json
{
  "exports": {
    ".": { "types": "./dist/js/index.d.ts", "default": "./dist/js/index.js" },
    "./style": "./dist/style.js",
    "./theme.css": "./dist/css/theme.css",
    "./standalone.css": "./dist/css/standalone.css",
    "./json": "./dist/json/theme.json",
    "./package.json": "./package.json"
  },
  "sideEffects": ["**/*.css", "./dist/style.js"]
}
```

- `./style` is self-sufficient: core CSS + fonts + overrides. Importing only a theme package works.
- `./theme.css` is for apps that load the core stylesheet themselves or ship several themes.
- `./standalone.css` is for HTML-only pages, CDN links and environments without a bundler.

### CSS shape

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

## Contrast requirements

`buildTheme()` fails when a pair is below WCAG 2.2 AA (4.5:1) for the resolved values (core
defaults merged with the theme's overrides). Default pairs:

```text
color.on-accent / color.accent      color.accent / color.bg        color.accent-hover / color.bg
color.fg / color.bg                 color.fg-muted / color.bg       color.fg-strong / color.bg
color.fg-strong / color.bg-subtle   color.on-danger / color.danger
color.danger / color.bg             color.success / color.bg        color.warning / color.bg
```

The core package publishes the pairs it validates itself in `contract.contrast.pairs`, and the
builder validates those plus the theme-specific pairs above — a theme cannot slip a failing
`on-danger`/`danger` combination through one tool while the other rejects it.

Override them per theme when the theme rethemes more of the semantic layer:

```js
defineTheme({
  // ...
  contrast: { min: 4.5, pairs: [['color.on-accent', 'color.accent']] },
})
```

Contrast is computed on opaque hex colors only; a transparent token in a pair fails with an
explanation instead of a silently wrong ratio.

## Configuration reference

| Field         | Type               | Default      | Meaning                                                    |
| ------------- | ------------------ | ------------ | ---------------------------------------------------------- |
| `id`          | `string`           | — (required) | Theme identity, lowercase kebab-case, used in `data-theme` |
| `label`       | `string`           | — (required) | Human-readable label for switcher UIs                      |
| `description` | `string`           | —            | One line, copied into `dist/json/theme.json`               |
| `tokens`      | `string[]`         | `[]`         | Theme-private DTCG files, relative to the config file      |
| `overrides`   | `string`           | — (required) | DTCG override file, relative to the config file            |
| `fonts`       | `string[]`         | `[]`         | CSS entry points imported by `dist/style.js`               |
| `contrast`    | `{ pairs?, min? }` | `4.5` AA     | Contrast requirements                                      |

Invalid configuration throws `TypeError` at import time — including unknown option names, so a
`font` typo fails instead of silently shipping without a font. Build failures stop at the first
problem and name the offending token, file or reference, for example:

```text
Theme "acme" must override the required theme token "color.focus-ring" in the "dark" section.
The font entry "@fontsource-variable/inter" cannot be resolved from "/repo/packages/acme-theme".
```

## CLI

```sh
pnpm exec theme-builder [build] [--config ./theme.config.mjs] [--cwd <dir>]
```

The programmatic API is the primary interface; the CLI exists for ad-hoc builds and package managers
that prefer a binary.

## Official examples

- [`@ezhana/design-theme-cerulean`](../design-theme-cerulean/README.md) — custom palette, Public Sans
  variable font, measured contrast table in [`docs/DESIGN.md`](../design-theme-cerulean/docs/DESIGN.md).
- [`@ezhana/design-theme-ocean`](../design-theme-ocean/README.md) — pill-shaped controls, no custom
  font.

Their `test/theme.test.mjs` suites are the reference contract tests for a theme package.
