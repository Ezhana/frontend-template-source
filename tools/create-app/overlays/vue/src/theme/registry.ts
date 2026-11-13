import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import type { ThemeDefinition } from '@ezhana/theme'

/**
 * Themes available in this app.
 *
 * Every theme package exports a frozen `ThemeDefinition` (`{ id, label, modes }`), and
 * `defaultThemeDefinition` is the core default theme. The theme manager consumes this array
 * directly, so adding a theme is: install its package and add its `theme` export here.
 */
export const themeDefinitions = [
  defaultThemeDefinition,
  ocean,
  cerulean,
] as const satisfies readonly ThemeDefinition[]

export type AppTheme = (typeof themeDefinitions)[number]['id']

export const themeIds = themeDefinitions.map((definition) => definition.id) as AppTheme[]

export const themeLabels = Object.fromEntries(
  themeDefinitions.map((definition) => [definition.id, definition.label]),
) as Record<AppTheme, string>
