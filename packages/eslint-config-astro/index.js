// Shared Astro rules: base rules + TypeScript + Astro.
import { defineConfig } from 'eslint/config'
import eslintPluginAstro from 'eslint-plugin-astro'

import { prettierConfig } from '@ezhana/eslint-config-base'

import typescriptConfig from '@ezhana/eslint-config-typescript'

export default defineConfig([
  ...typescriptConfig,

  ...eslintPluginAstro.configs['flat/recommended'],

  prettierConfig,
])
