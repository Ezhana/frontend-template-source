import { defineTheme } from '@ezhana/theme-builder'

export default defineTheme({
  id: 'cerulean',
  label: 'Cerulean',
  description: 'Cerulean-blue accent, Public Sans, moderate (level 2) controls.',
  tokens: ['tokens/palette.json'],
  overrides: 'tokens/theme.json',
  fonts: ['@fontsource-variable/public-sans'],
})
