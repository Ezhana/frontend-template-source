import { defineTheme } from '@ezhana/theme-builder'

/**
 * QuestUI theme package.
 *
 * QuestUI is a dark-only fantasy identity: the design narrative defines one warm, parchment-and-gold
 * palette, so the package declares the single color mode it supports instead of inventing a light
 * mode. `@ezhana/theme-builder` emits a fixed-mode stylesheet that applies unconditionally for
 * `data-theme="quest"`.
 */
export default defineTheme({
  id: 'quest',
  label: 'Quest',
  description:
    'QuestUI fantasy RPG identity: gold, parchment and royal purple on deep brown, Cinzel + Spectral, dark-only.',
  modes: ['dark'],
  tokens: ['tokens/palette.json'],
  overrides: 'tokens/theme.json',
  fonts: [
    '@fontsource/cinzel/400.css',
    '@fontsource/cinzel/500.css',
    '@fontsource/cinzel/600.css',
    '@fontsource/cinzel/700.css',
    '@fontsource/spectral/400.css',
    '@fontsource/spectral/500.css',
    '@fontsource/spectral/600.css',
    '@fontsource-variable/fira-code',
  ],
})
