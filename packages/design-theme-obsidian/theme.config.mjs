import { defineTheme } from '@ezhana/theme-builder'

/**
 * Obsidian theme package.
 *
 * Obsidian is the template's Obsidian & Gold business identity: near-black warm obsidian surfaces,
 * a single 24K gold used with discipline, Inter for body copy and Playfair Display for Latin display
 * headings. It is a **dark-only** theme — the design system defines one dark palette and reserves
 * future identities (for example `ivory`) for separate themes — so the package declares the single
 * color mode it supports instead of inventing a light palette. `@ezhana/theme-builder` emits a
 * fixed-mode stylesheet that applies unconditionally for `data-theme="obsidian"`.
 */
export default defineTheme({
  id: 'obsidian',
  label: 'Obsidian',
  description:
    'Obsidian & Gold business identity: 24K gold on warm near-black obsidian, Inter + Playfair Display, dark-only.',
  modes: ['dark'],
  tokens: ['tokens/palette.json'],
  overrides: 'tokens/theme.json',
  fonts: ['@fontsource-variable/inter', '@fontsource-variable/playfair-display'],
})
