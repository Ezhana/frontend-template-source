import eslintReact from '@eslint-react/eslint-plugin'
import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

// Editable ESLint base for this app. It is self-contained on purpose: it does not import any
// @ezhana config package, so the app can extend or replace these rules freely.
//
// Mirrors the internal composition in packages/eslint-config-{base,typescript,react} and the
// JS-only base in template/eslint.config.mjs. Keep the three rule sets in sync (ADR 0004).
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

  {
    files: ['**/*.{ts,mts,cts,tsx}'],
    extends: [tseslint.configs.recommended],
  },

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

  eslintConfigPrettier,
])
