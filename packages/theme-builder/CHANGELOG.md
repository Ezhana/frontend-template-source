# @ezhana/theme-builder

## 0.2.0

### Minor Changes

- f59fe75: Add the QuestUI fantasy theme and the capabilities it requires.

  - **`@ezhana/design-theme-quest` (new)** — the QuestUI theme package: a dark-only fantasy RPG
    identity built from gold `#CA8A04`, deep red `#991B1B` and royal purple `#581C87` over layered warm
    browns, with Cinzel + Spectral + Fira Code, gold-glow elevation, and a full design narrative and
    tokenized component recipes in `docs/DESIGN.md`.
  - **`@ezhana/design-tokens`** — new general-purpose semantic roles and scales with default values in
    every color mode: layered surfaces (`color.surface`, `color.surface-elevated`,
    `color.border-subtle`), status tints (`success`/`warning`/`danger`/`info-subtle`), the `info` /
    `info-solid` / `on-info` and `danger-solid` roles, the complete display→caption type scale with
    per-role line heights and `font.letterSpacing.label`, `font.weight.bold`, `radius.modal` /
    `radius.panel`, and `shadow.lg` / `shadow.xl` / `shadow.glow`. The destructive contrast pair is
    now `color.on-danger` / `color.danger-solid` (danger text is a separate AA role), and the contract
    publishes new info, surface and elevation contrast pairs. The contract version stays 1: the token
    additions are additive, and the builder filters its own default pairs against the tokens an older
    v1 contract publishes, so the two packages remain usable in either update order. Theme overrides
    that reference the new tokens still require the matching core release.
  - **`@ezhana/theme-builder`** — `modes` in `theme.config.mjs` lets a theme declare the subset of the
    contract's color modes it supports. A single declared mode produces a fixed-mode stylesheet (one
    load-order-independent `:root[data-theme]` rule plus `color-scheme`), so dark-only themes no longer
    need to invent a second palette. Full-mode themes keep byte-identical output.
  - **`@ezhana/theme`** — theme definitions may declare different mode lists. `defineThemeRegistry`
    now returns `themeModes` (per-theme modes; `modes` is the union in first-seen order) and
    `createThemeManager` accepts `themeModes`, clamping `resolvedMode` to a mode the active theme
    supports. A light preference on a dark-only theme renders and records `dark`, and applies again
    after switching back to a full-mode theme.

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
