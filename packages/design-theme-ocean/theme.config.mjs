import { defineTheme } from '@ezhana/theme-builder'

export default defineTheme({
  id: 'ocean',
  label: 'Ocean',
  description: 'Indigo-blue accent, pill-shaped controls.',
  tokens: ['tokens/palette.json'],
  overrides: 'tokens/theme.json',
})
