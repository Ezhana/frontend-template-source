---
'@ezhana/typography-editorial': minor
---

Make the editorial heading ladder fluid and add a `.not-prose` escape hatch.

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
