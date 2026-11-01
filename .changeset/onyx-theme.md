---
'@ezhana/design-theme-onyx': minor
---

Add `@ezhana/design-theme-onyx`, the black-gold business identity for the template: champagne-gold
accents (`#D4AF37`) on soft warm graphite surfaces (`#292623`) — deliberately not near-black — with
warm ivory text, Public Sans and a moderate shape scale (8px controls, 12px surfaces). Elevation is
a warm near-black shadow with a restrained gold glow instead of a neutral grey one.

The theme is dark-only: it declares `modes: ['dark']` and builds a fixed-mode stylesheet with the
existing `@ezhana/theme-builder` mode-subset support, so no other package changes. It ships the
generated contract artifacts, contract tests and a design narrative in `docs/DESIGN.md`.
