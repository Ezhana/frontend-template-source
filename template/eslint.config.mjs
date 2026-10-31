import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import globals from 'globals'
import { defineConfig } from 'eslint/config'

// This file is the editable ESLint base for the template repository. Generated apps get their own
// self-contained config from create-ezhana-app; they do not import this file or any @ezhana package.
//
// Mirrors packages/eslint-config-base and the base portion of
// tools/create-app/templates/eslint-{react,vue}.config.mjs. Keep the mirrors in sync (ADR 0004).
export default defineConfig([
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/.next/**',
      '**/.nuxt/**',
    ],
  },

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },

    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
  },

  eslintConfigPrettier,
])
