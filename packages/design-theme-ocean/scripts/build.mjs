#!/usr/bin/env node
/**
 * Build the Ocean theme package with @ezhana/theme-builder.
 *
 * Reads ../theme.config.mjs, validates it against the @ezhana/design-tokens contract and writes
 * dist/css/theme.css, dist/css/standalone.css, dist/style.js, dist/js/index.{js,d.ts} and
 * dist/json/theme.json. Do not edit dist/ directly; run "pnpm --filter @ezhana/design-theme-ocean
 * build" instead.
 */
import { buildTheme } from '@ezhana/theme-builder'

await buildTheme(new URL('../theme.config.mjs', import.meta.url))
