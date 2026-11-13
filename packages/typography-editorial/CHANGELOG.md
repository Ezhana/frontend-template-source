# @ezhana/typography-editorial

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
