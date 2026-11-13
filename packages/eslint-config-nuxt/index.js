// Shared Nuxt rules: the Vue/TypeScript preset plus Nuxt auto-import tolerance.
import { defineConfig } from 'eslint/config'

import vueConfig from '@ezhana/eslint-config-vue'

export default defineConfig([
  ...vueConfig,

  {
    files: ['**/*.{ts,vue}'],
    rules: {
      'no-undef': 'off',
    },
  },
])
