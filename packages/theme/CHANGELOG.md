# @ezhana/theme

## 0.2.0

### Minor Changes

- be02686: Add a layered design token pipeline and a framework-agnostic theme runtime.

  - `@ezhana/design-tokens` defines global, brand and semantic tokens in DTCG format and compiles
    them with Style Dictionary into one layered CSS custom property stylesheet, resolved theme JSON
    and typed ESM metadata. It supports multiple brands and color modes, validates the cross-layer
    contract at build time and enforces WCAG AA contrast in its test suite.
  - `@ezhana/theme` provides the framework-agnostic theme state machine: brand and light/dark/system
    preference, persistence, `prefers-color-scheme` tracking and cross-tab synchronisation.
  - Both Vite templates now ship with a theme switcher that consumes these packages.

- be02686: Switch the theming runtime to `data-theme` + optional `data-color-mode`.

  - `data-theme` now names the **theme identity** (`default`, `cerulean`, `ocean`) and is always
    present; the old `data-brand` attribute and the `brand.*` naming are gone. Generated metadata is
    renamed to `themes` / `themeLabels` / `defaultTheme`, with a `Theme` union type.
  - `data-color-mode` is the **optional** color-mode attribute (`light` / `dark`). It is only written
    for explicit mode preferences; in `system` mode the runtime removes it and the token stylesheet
    follows `prefers-color-scheme`, including `color-scheme: light dark` for native UI.
  - The generated CSS now emits system-dark media-query variants for the semantic layer and for each
    theme's mode-specific overrides, so the default is "follow the OS" with no JavaScript needed.
  - `@ezhana/theme` API: `themes` / `defaultTheme` options and `setTheme`; storage payload is
    `{ theme, mode }`; the root element must implement `removeAttribute`.
  - Both template apps, tests, usage docs and the Cerulean design narrative are updated.
