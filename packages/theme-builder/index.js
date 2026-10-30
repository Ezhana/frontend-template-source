/**
 * `@ezhana/theme-builder` — compile and validate a theme package for `@ezhana/design-tokens`.
 *
 * A theme package declares its sources in `theme.config.mjs` and builds them into a stylesheet that
 * overrides semantic tokens selected by `:root[data-theme="<id>"]`, plus typed metadata that
 * `defineThemeRegistry` from `@ezhana/theme` consumes.
 *
 * ```js
 * // theme.config.mjs
 * import { defineTheme } from '@ezhana/theme-builder'
 *
 * export default defineTheme({
 *   id: 'cerulean',
 *   label: 'Cerulean',
 *   tokens: ['tokens/palette.json'],
 *   overrides: 'tokens/theme.json',
 *   fonts: ['@fontsource-variable/public-sans'],
 * })
 * ```
 *
 * ```js
 * // scripts/build.mjs
 * import { buildTheme } from '@ezhana/theme-builder'
 * await buildTheme(new URL('../theme.config.mjs', import.meta.url))
 * ```
 */
export { defineTheme } from './lib/config.js'
export { buildTheme } from './lib/build.js'
export { DEFAULT_CONTRAST_PAIRS, contrastRatio } from './lib/validate.js'
