// Internal React composition. The standalone mirror for generated apps is
// tools/create-app/templates/eslint-react.config.mjs; keep the rules in sync (ADR 0004).
import { defineConfig } from 'eslint/config'
import eslintReact from '@eslint-react/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'

import typescriptConfig from '@ezhana/eslint-config-typescript'
import { prettierConfig } from '@ezhana/eslint-config-base'

export default defineConfig([
  ...typescriptConfig,

  {
    files: ['**/*.{jsx,tsx}'],

    extends: [
      eslintReact.configs['recommended-typescript'],
      reactHooks.configs.flat.recommended,
      eslintReact.configs['disable-conflict-eslint-plugin-react-hooks'],
    ],

    rules: {
      '@eslint-react/no-missing-key': 'warn',
    },
  },

  prettierConfig,
])
