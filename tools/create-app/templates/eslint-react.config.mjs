// ESLint config for this app. The shared rule set lives in packages/eslint-config-react — edit that
// package to change rules for every app, or add app-specific overrides to the array below.
import config from '@ezhana/eslint-config-react'
import { defineConfig } from 'eslint/config'

export default defineConfig([...config])
