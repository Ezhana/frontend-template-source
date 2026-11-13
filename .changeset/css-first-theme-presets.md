---
'@ezhana/design-tokens': major
'@ezhana/theme-builder': major
'@ezhana/theme': major
'@ezhana/design-theme-cerulean': major
'@ezhana/design-theme-ocean': major
'@ezhana/design-theme-onyx': major
'@ezhana/design-theme-quest': major
'@ezhana/design-theme-obsidian': major
'create-ezhana-app': major
---

Refactor Ezhana into a CSS-first, framework-agnostic design-token system. Styling no longer needs
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
