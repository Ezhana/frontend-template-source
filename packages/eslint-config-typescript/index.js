// Internal TypeScript layer composed by the React/Vue modules. Generated apps inline this rule set
// in tools/create-app/templates/ instead of importing it (ADR 0004).
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

import baseConfig from '@ezhana/eslint-config-base'

export default defineConfig([
  ...baseConfig,

  {
    files: ['**/*.{ts,mts,cts,tsx}'],

    extends: [tseslint.configs.recommended],
  },
])
