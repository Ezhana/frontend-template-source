import { defineConfig } from 'eslint/config'
import base from '@ezhana/eslint-config-base'

// ESLint rules for this workspace root. The shared rules live in the published
// @ezhana/eslint-config-base package; add workspace-wide overrides below.
export default defineConfig([...base])
