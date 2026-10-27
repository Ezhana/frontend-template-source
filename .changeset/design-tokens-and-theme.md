---
'@ezhana/design-tokens': minor
'@ezhana/theme': minor
---

Add a layered design token pipeline and a framework-agnostic theme runtime.

- `@ezhana/design-tokens` defines global, brand and semantic tokens in DTCG format and compiles
  them with Style Dictionary into one layered CSS custom property stylesheet, resolved theme JSON
  and typed ESM metadata. It supports multiple brands and color modes, validates the cross-layer
  contract at build time and enforces WCAG AA contrast in its test suite.
- `@ezhana/theme` provides the framework-agnostic theme state machine: brand and light/dark/system
  preference, persistence, `prefers-color-scheme` tracking and cross-tab synchronisation.
- Both Vite templates now ship with a theme switcher that consumes these packages.
