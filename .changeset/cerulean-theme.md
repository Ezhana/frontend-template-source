---
'@ezhana/design-tokens': minor
---

Add the Cerulean brand theme.

- New `cerulean` brand (light/dark): cerulean-blue accent on the shared neutral scale, `0.625rem`
  level-2 control radius, and Public Sans as a brand-owned typeface.
- Typography is part of the theme override contract: the Cerulean theme overrides the semantic
  `font.family.sans` / `font.family.heading` tokens so it can ship its own typeface while `default`
  and `ocean` keep the system stacks.
- The generated theme metadata and switcher UI pick the brand up automatically, and the contract /
  WCAG AA contrast tests cover all six brand × mode combinations.
- Documented in `docs/themes/cerulean/DESIGN.md`.
