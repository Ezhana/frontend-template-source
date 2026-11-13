# @ezhana/design-theme-onyx

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

- 1ab5d78: Add `@ezhana/design-theme-onyx`, the black-gold business identity for the template: champagne-gold
  accents (`#D4AF37`) on soft warm graphite surfaces (`#292623`) — deliberately not near-black — with
  warm ivory text, Public Sans and a moderate shape scale (8px controls, 12px surfaces). Elevation is
  a warm near-black shadow with a restrained gold glow instead of a neutral grey one.

  The theme is dark-only: it declares `modes: ['dark']` and builds a fixed-mode stylesheet with the
  existing `@ezhana/theme-builder` mode-subset support, so no other package changes. It ships the
  generated contract artifacts, contract tests and a design narrative in `docs/DESIGN.md`.
