// Shared SvelteKit rules: base + TypeScript + Svelte.
import { defineConfig } from 'eslint/config'
import svelte from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import tseslint from 'typescript-eslint'

import { prettierConfig } from '@ezhana/eslint-config-base'

import typescriptConfig from '@ezhana/eslint-config-typescript'

export default defineConfig([
  {
    ignores: ['.svelte-kit/**', 'build/**', 'dist/**'],
  },

  ...typescriptConfig,

  ...svelte.configs['flat/recommended'],

  {
    files: ['**/*.svelte'],

    languageOptions: {
      parser: svelteParser,

      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
      },
    },

    rules: {
      'prefer-const': 'off',
    },
  },

  prettierConfig,
])
