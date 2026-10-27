import config from '@ezhana/eslint-config-base'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  ...config,
  {
    ignores: [
      'dist-template/**',
      '.pnpm-store/**',
      'tools/create-app/overlays/**',
      '.create-app-*/',
    ],
  },
])
