// Shared Next.js rules: React/TypeScript rules from this workspace plus @next/eslint-plugin-next.
import { defineConfig } from 'eslint/config'
import nextPlugin from '@next/eslint-plugin-next'

import { prettierConfig } from '@ezhana/eslint-config-base'

import reactConfig from '@ezhana/eslint-config-react'

export default defineConfig([...reactConfig, nextPlugin.configs['core-web-vitals'], prettierConfig])
