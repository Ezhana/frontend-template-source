# @ezhana/design-tokens

## 0.2.1

### Patch Changes

- Ship the Cerulean design narrative in the published package tarball.

## 0.2.0

### Minor Changes

- be02686: Add the Cerulean brand theme.

  - New `cerulean` brand (light/dark): cerulean-blue accent on the shared neutral scale, `0.625rem`
    level-2 control radius, and Public Sans as a brand-owned typeface.
  - Typography is part of the theme override contract: the Cerulean theme overrides the semantic
    `font.family.sans` / `font.family.heading` tokens so it can ship its own typeface while `default`
    and `ocean` keep the system stacks.
  - The generated theme metadata and switcher UI pick the brand up automatically, and the contract /
    WCAG AA contrast tests cover all six brand × mode combinations.
  - Documented in `docs/themes/cerulean/DESIGN.md`.

- be02686: Add a layered design token pipeline and a framework-agnostic theme runtime.

  - `@ezhana/design-tokens` defines global, brand and semantic tokens in DTCG format and compiles
    them with Style Dictionary into one layered CSS custom property stylesheet, resolved theme JSON
    and typed ESM metadata. It supports multiple brands and color modes, validates the cross-layer
    contract at build time and enforces WCAG AA contrast in its test suite.
  - `@ezhana/theme` provides the framework-agnostic theme state machine: brand and light/dark/system
    preference, persistence, `prefers-color-scheme` tracking and cross-tab synchronisation.
  - Both Vite templates now ship with a theme switcher that consumes these packages.

- be02686: Refactor the token package to the standard primitive / semantic / (optional) component model.

  - Rename the primitive layer namespace from `global.*` / `--global-*` to `primitive.*` / `--primitive-*`.
  - Remove the `brand.*` token layer: themes are now overrides of **semantic** tokens
    (`tokens/themes/<theme>.json`), so themes add no new token names and the public semantic contract
    stays stable across themes.
  - Keep the optional component layer out of this package; document it as a separate package built
    exclusively on semantic tokens, suitable for headless components + styles.
  - Update contract validation, generated metadata/types (no `BrandTokenName`), tests, docs and both
    template apps to the new layer names.

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
