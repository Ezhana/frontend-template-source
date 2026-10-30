import { defineTheme } from '../../../index.js'

/**
 * Test theme used by the `@ezhana/theme-builder` suite. It is intentionally shaped like a real
 * theme package: theme-private palette, DTCG overrides and a font entry point.
 */
export default defineTheme({
  id: 'fixture',
  label: 'Fixture',
  description: 'Theme used by the theme-builder test suite.',
  tokens: ['tokens/palette.json'],
  overrides: 'tokens/theme.json',
  fonts: ['@fontsource-variable/public-sans'],
})
