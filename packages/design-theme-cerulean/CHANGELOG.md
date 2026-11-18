# @ezhana/design-theme-cerulean

## 2.0.0

### Major Changes

- Replace the Cerulean accent with the designer-supplied brand blue, expressed as one 11-step ramp
  shared by both color modes.

  - `--color-accent` is `#0079A4` in light mode (4.92:1 on white) and `#2CC9FF` in dark mode (9.29:1 on
    `#16171D`), with matching `accent-hover`, `accent-subtle`, `accent-border`, `focus-ring`, `info`,
    `info-solid`, `on-info` and `shadow.glow` values.
  - `theme.color.cerulean` is re-derived from the two designer ramps: steps `50`–`400` keep the brighter
    dark-surface values, `500`–`950` the deeper light-surface values, and `700` (`#0079A4`) is a new
    step tuned to the brightest WCAG AA-safe accent on white.
  - Theme id, `data-theme` selector, mode support, fonts and the required token contract are unchanged;
    only the resolved color values change. This is a visual brand change: consumers should expect
    different colors, most noticeably in dark mode.

## 1.0.0

### Major Changes

- 002b09f: Refactor Ezhana into a CSS-first, framework-agnostic design-token system. Styling no longer needs
  JavaScript, a theme manager or any bundler workaround.

  - **One CSS entry per package.**
    - `@ezhana/design-tokens/style.css` replaces `@ezhana/design-tokens/css` and
      `@ezhana/design-tokens/css/tokens.css`.
    - `@ezhana/design-theme-*/style.css` replaces the JavaScript `./style` entry and
      `./standalone.css`. It is a complete, self-contained preset: the theme's `@font-face` rules
      (font files copied into `dist/fonts/`), the full core stylesheet and the theme overrides. No
      internal `@import`, no CSS imported from JavaScript, no `noExternal` configuration.
    - `./theme.css` (overrides only) and `./fonts.css` (`@font-face` only) remain for multi-theme
      setups that import the core stylesheet once.
  - **Theme packages dropped their `@fontsource*` runtime dependencies.** Fonts are inlined and copied
    at build time; consumers install only the theme package.
  - **`@ezhana/theme` is now a small optional runtime.** `createThemeManager({ themes })` takes the
    theme definitions directly; `defineThemeRegistry` (and the registry object it returned) is removed.
    The manager never touches the DOM at import time and runs headless with `root: null`, so it is
    SSR-safe. Styling does not depend on it at all.
  - **`@ezhana/theme-builder` emits the new artifact layout** (`style.css`, `theme.css`, `fonts.css`,
    `fonts/`, `index.js`, `index.d.ts`, `theme.json`) and copies/rewrites font assets. It still
    validates the theme against the core contract and enforces WCAG AA contrast.
  - **Token sources** now separate the mode-independent semantic layer (`tokens/semantic/base.json`)
    from the default theme's color modes (`tokens/semantic/modes/*.json`); generated artifacts are
    driven only by those sources.
  - The `data-theme` / `data-color-mode` contract is unchanged: no attribute means "follow the OS",
    explicit `light`/`dark` always wins over `prefers-color-scheme`, and the system preference is
    implemented in CSS only.

### Patch Changes

- Updated dependencies [002b09f]
  - @ezhana/design-tokens@2.0.0

## 0.1.0

### Minor Changes

- 873f1c7: Ship themes as standalone packages ([ADR 0003](../../docs/adr/0003-themes-as-packages.md)).

  `@ezhana/design-tokens` is now the core package: primitive scale, semantic contract, default theme,
  core stylesheet, resolved values and a versioned machine-readable contract
  (`@ezhana/design-tokens/contract`). Theme identities and their palettes moved out of the package.

  - **Breaking:** removed `themes`, `themeLabels` and the `Theme` union from `@ezhana/design-tokens`;
    apps derive theme ids from their registry instead. `@ezhana/design-tokens/json` now exposes core
    values (`core.json`) instead of per-theme values (`themes.json`).
  - **Breaking:** removed the in-package theme sources (`tokens/themes/`), the Cerulean design
    narrative and the `primitive.color.blue` / `primitive.color.cerulean` ramps. Brand palettes belong
    to the theme packages that use them and are no longer emitted as CSS custom properties or typed as
    `PrimitiveTokenName`.
  - `@ezhana/theme-builder` (new) validates a theme against the contract — required overrides, known
    semantic tokens, references, color modes and WCAG AA contrast — and generates the theme
    stylesheet, standalone stylesheet, style entry, metadata, types and resolved JSON.
  - `@ezhana/design-theme-cerulean` and `@ezhana/design-theme-ocean` (new) are the official themes,
    built with `@ezhana/theme-builder`. Each owns its palette, its typeface and its overrides, depends
    on `@ezhana/design-tokens` but not on `@ezhana/theme`, and ships `./style`, `./theme.css`,
    `./standalone.css`, metadata and resolved JSON.
  - `@ezhana/theme` gains `defineThemeRegistry(definitions, options?)`, which merges theme definitions
    into frozen `{ themes, themeLabels, defaultTheme, modes }` metadata with literal id types.
  - Theme stylesheets now use `:root[data-theme="<id>"]` selectors, so they win over the core
    stylesheet regardless of import order.
  - Generated apps import `@ezhana/design-theme-ocean/style` and
    `@ezhana/design-theme-cerulean/style` and register the themes explicitly; the app no longer
    imports the Public Sans font package itself.

### Patch Changes

- Updated dependencies [873f1c7]
  - @ezhana/design-tokens@1.0.0

Release notes are generated by Changesets from the changeset files.
