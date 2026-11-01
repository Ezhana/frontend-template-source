import { defineTheme } from '@ezhana/theme-builder'

/**
 * Onyx theme package.
 *
 * Onyx is the black-gold business identity of the template: champagne-gold accents on warm graphite
 * surfaces, with Public Sans and moderately soft geometry. It is a **dark-only** theme — the brief
 * defines one soft dark palette and no light variant — so the package declares the single color mode
 * it supports instead of inventing a second palette. `@ezhana/theme-builder` emits a fixed-mode
 * stylesheet that applies unconditionally for `data-theme="onyx"`.
 */
export default defineTheme({
  id: 'onyx',
  label: 'Onyx',
  description:
    'Onyx black-gold business identity: champagne gold on soft warm graphite, Public Sans, dark-only.',
  modes: ['dark'],
  tokens: ['tokens/palette.json'],
  overrides: 'tokens/theme.json',
  fonts: ['@fontsource-variable/public-sans'],
})
