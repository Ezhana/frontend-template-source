#!/usr/bin/env node
/**
 * Build the Ocean theme package with @ezhana/theme-builder.
 *
 * Reads ../theme.config.mjs, validates it against the @ezhana/design-tokens contract and writes
 * dist/style.css, dist/theme.css, dist/fonts.css, dist/fonts/, dist/index.{js,d.ts} and
 * dist/theme.json. Do not edit dist/ directly; run "pnpm --filter @ezhana/design-theme-ocean
 * build" instead.
 */
import { buildTheme } from '@ezhana/theme-builder'

await buildTheme(new URL('../theme.config.mjs', import.meta.url))
