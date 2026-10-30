/**
 * Type-level contract of the publishable `@ezhana/*` API.
 *
 * This file is not executed: `pnpm typecheck` compiles it with the generated declarations, so the
 * promise documented in the READMEs — the registry narrows theme ids to a literal union, the theme
 * manager accepts the registry output without casts, and every official theme fits the
 * `ThemeDefinition` shape — is checked in CI instead of in a generated application.
 *
 * Paths map to the built `dist/` declarations, so run `pnpm build` first (`pnpm test` does).
 */
import {
  defaultThemeDefinition,
  modeLabels,
  semanticTokenNames,
  type Mode,
  type ThemeDefinition,
} from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { createThemeManager, defineThemeRegistry } from '@ezhana/theme'
import {
  buildTheme,
  defineTheme,
  type ResolvedThemeConfig,
  type ThemeBuildResult,
  type ThemeConfig,
} from '@ezhana/theme-builder'

/* Theme packages expose a ThemeDefinition with a literal id. */
const definitions: readonly ThemeDefinition[] = [defaultThemeDefinition, ocean, cerulean]
export const ceruleanId: 'cerulean' = cerulean.id
export const oceanId: 'ocean' = ocean.id
export const modeNames: readonly Mode[] = cerulean.modes
export const definitionLabels: readonly string[] = definitions.map((definition) => definition.label)

/* The registry narrows ids and modes to literal unions. */
export const registry = defineThemeRegistry([defaultThemeDefinition, ocean, cerulean])
export type AppTheme = (typeof registry.themes)[number]

export const defaultThemeIsValid: AppTheme = registry.defaultTheme
const selected: AppTheme = 'cerulean'
// @ts-expect-error - an unregistered theme id must not type-check.
const unknownTheme: AppTheme = 'nope'

export const registryLabels: Readonly<Record<AppTheme, string>> = registry.themeLabels
export const registryModes: readonly Mode[] = registry.modes

/* The manager accepts the registry output as-is (no casts, no `as`). */
export const themeManager = createThemeManager<AppTheme, Mode>({
  themes: [...registry.themes],
  modes: [...registry.modes],
  defaultTheme: registry.defaultTheme,
})

themeManager.setTheme(selected)
const preference: Mode | 'system' = 'system'
themeManager.setMode(preference)
export const stateTheme: AppTheme = themeManager.getState().theme
export const stateResolvedMode: Mode = themeManager.getState().resolvedMode

/* The theme-builder config surface: a typo must not type-check. */
export const themeConfig = defineTheme({
  id: 'acme',
  label: 'ACME',
  description: 'ACME brand theme.',
  tokens: ['tokens/palette.json'],
  overrides: 'tokens/theme.json',
  fonts: ['@fontsource-variable/inter'],
  contrast: { min: 4.5, pairs: [['color.on-accent', 'color.accent']] },
})
export const resolvedThemeConfig: ResolvedThemeConfig = themeConfig
export const themeConfigSurface: ThemeConfig = themeConfig

export const configWithOutputDir: ThemeConfig = {
  id: 'acme',
  label: 'ACME',
  overrides: 'x',
  // @ts-expect-error - `outputDir` is not part of the theme config: the layout is fixed at dist/.
  outputDir: 'build',
}

export const themeBuild: Promise<ThemeBuildResult> = buildTheme('./theme.config.mjs', {
  cwd: '/tmp',
})
export const configBuild: Promise<ThemeBuildResult> = buildTheme(themeConfig, { cwd: '/tmp' })

/* Token names and labels stay literal. */
export const themeModeLabel: string = modeLabels.light
export const someTokenName: string = semanticTokenNames[0] ?? '--color-bg'
