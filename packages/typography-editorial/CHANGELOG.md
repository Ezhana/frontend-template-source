# @ezhana/typography-editorial

## 0.2.0

### Minor Changes

- 2574f6a: Make the editorial heading ladder fluid and add a `.not-prose` escape hatch.

  `--ez-editorial-heading-scale` is unitless, so it could not express a fluid size: multiplying `1em`
  by a `clamp()` that contains a length produces a length squared. Each of `h1`–`h5` now uses its own
  `clamp()` between a new compact ladder (`--ez-editorial-heading-scale-compact`, default `1.15`) and
  the full `1.25` ladder, with the viewport term added rather than multiplied. Headings therefore keep
  readable proportions on small screens and no longer wait for the body's `720px` step. `h6` stays at
  the body size.

  Every element rule now ends with a zero-specificity
  `:where(:not(.not-prose):not(.not-prose *))` guard, so a component embedded in an article — friend
  links, a card, a call to action — can opt out of editorial typography with the Tailwind-compatible
  `.not-prose` class without raising the preset's specificity or requiring extra markup. The subtree
  still inherits ambient typography; the component's own CSS owns it from there.

  The test suite, README, design specification and ADR 0006 are updated for the seven settings, the
  clamp structure and the escape hatch.

## 0.1.0

### Minor Changes

- e351780: Add `@ezhana/typography-editorial`, a CSS-only editorial typography preset for rendered long-form
  content.

  The package publishes one canonical `style.css` entry and no JavaScript. Every rule is scoped to
  `.ez-editorial`, so it never styles the page, document root or components. It covers the reference
  typography scale (`1.25` modular headings, `1.7` body leading, `20px`/`18px` responsive body size),
  paragraph and block rhythm, lists, links and focus indication, blockquotes, inline code and generic
  code-block containers, tables, images/figures and horizontal rules.

  Colors, fonts, borders and focus rings come from the existing `@ezhana/design-tokens` semantic
  contract, so the preset follows Cerulean, Ocean, Onyx, Quest and Obsidian without a palette of its
  own. It exposes six package-scoped custom properties for editorial tuning, is deliberately
  unlayered so layered resets such as Tailwind Preflight cannot strip its list markers, and leaves
  syntax highlighting to the consumer. The package ships a contract test suite covering scope, token
  names, scale, element coverage, Preflight resilience, highlighter safety and accessibility.
