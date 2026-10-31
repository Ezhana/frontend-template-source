// Internal Vue composition. The standalone mirror for generated apps is
// tools/create-app/templates/eslint-vue.config.mjs; keep the rules in sync (ADR 0004).
import { defineConfig } from 'eslint/config'
import eslintPluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tseslint from 'typescript-eslint'

import { prettierConfig } from '@ezhana/eslint-config-base'

import typescriptConfig from '@ezhana/eslint-config-typescript'

export default defineConfig([
  ...typescriptConfig,

  ...eslintPluginVue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],

    languageOptions: {
      parser: vueParser,

      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },

    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  prettierConfig,
])
