/**
 * Type-level contract of the published `@ezhana/*` API.
 *
 * Compiled by `pnpm typecheck` against the generated declarations; it is not executed. It checks
 * that the metadata exports stay literal, that every official theme fits the shared
 * `ThemeDefinition` shape, and that the optional runtime accepts the theme definitions as-is.
 */
import {
  defaultThemeDefinition,
  modeLabels,
  semanticTokenNames,
  type Mode,
  type ThemeDefinition,
} from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as obsidian } from '@ezhana/design-theme-obsidian'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { theme as onyx } from '@ezhana/design-theme-onyx'
import { theme as quest } from '@ezhana/design-theme-quest'
import { createThemeManager } from '@ezhana/theme'
import {
  buildTheme,
  defineTheme,
  type ResolvedThemeConfig,
  type ThemeBuildResult,
  type ThemeConfig,
} from '@ezhana/theme-builder'

export const definitions: readonly ThemeDefinition[] = [
  defaultThemeDefinition,
  ocean,
  cerulean,
  quest,
  onyx,
  obsidian,
]

export const ceruleanId: 'cerulean' = cerulean.id
export const oceanId: 'ocean' = ocean.id
export const questId: 'quest' = quest.id
export const onyxId: 'onyx' = onyx.id
export const obsidianId: 'obsidian' = obsidian.id
export const ceruleanModes: readonly Mode[] = cerulean.modes
export const questModes: readonly Mode[] = quest.modes
export const definitionLabels: readonly string[] = definitions.map(({ label }) => label)

/* The runtime consumes theme definitions directly and narrows ids to a literal union. */
export const themeManager = createThemeManager({
  themes: [defaultThemeDefinition, ocean, cerulean, quest, onyx, obsidian],
})

themeManager.setTheme('cerulean')
themeManager.setMode('system')
export const stateTheme: 'default' | 'ocean' | 'cerulean' | 'quest' | 'onyx' | 'obsidian' =
  themeManager.getState().theme
export const stateMode: Mode | 'system' = themeManager.getState().mode
export const resolvedMode: Mode = themeManager.getState().resolvedMode
export const themeLabel: string = modeLabels.light
export const someTokenName: string = semanticTokenNames[0] ?? '--color-bg'

// @ts-expect-error - a theme id that is not configured must not type-check.
themeManager.setTheme('nope')

/* The theme-builder config surface: typos must not type-check. */
export const resolvedThemeConfig: ResolvedThemeConfig = defineTheme({
  id: 'acme',
  label: 'ACME',
  description: 'ACME brand theme.',
  tokens: ['tokens/palette.json'],
  overrides: 'tokens/theme.json',
  fonts: ['@fontsource-variable/inter'],
  contrast: { min: 4.5, pairs: [['color.on-accent', 'color.accent']] },
})
export const themeConfigSurface: ThemeConfig = resolvedThemeConfig

export const configWithOutputDir: ThemeConfig = {
  id: 'acme',
  label: 'ACME',
  overrides: 'x',
  // @ts-expect-error - `outputDir` is not part of the theme config: the layout is fixed.
  outputDir: 'build',
}

export const themeBuild: Promise<ThemeBuildResult> = buildTheme('./theme.config.mjs', {
  cwd: '/tmp',
})
export const configBuild: Promise<ThemeBuildResult> = buildTheme(resolvedThemeConfig, {
  cwd: '/tmp',
})
