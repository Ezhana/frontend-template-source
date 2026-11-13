---
'@ezhana/design-theme-obsidian': minor
---

Add `@ezhana/design-theme-obsidian`, the Obsidian & Gold business identity: 24K gold (`#D4AF37`)
on warm near-black obsidian surfaces (`#070606`) with warm ivory text, Inter for body copy and
Playfair Display for Latin display headings. Hierarchy comes from the obsidian surface stack and
hairline borders rather than heavy fills, and the crisp shape scale (6px controls, 14px surfaces,
28px panels) keeps the console/ledger surface flat rather than rounded.

The theme is dark-only: it declares `modes: ['dark']` and builds a fixed-mode stylesheet with the
existing `@ezhana/theme-builder` mode-subset support, so no other package changes. It ships the
generated contract artifacts, contract tests and a design narrative in `docs/DESIGN.md`.
