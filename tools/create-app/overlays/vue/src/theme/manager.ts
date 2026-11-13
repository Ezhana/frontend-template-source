import type { Mode } from '@ezhana/design-tokens'
import { createThemeManager } from '@ezhana/theme'

import { themeDefinitions, type AppTheme } from './registry'

/**
 * Browser-wide theme singleton.
 *
 * The definitions in `src/theme/registry.ts` are the single source of truth for the available
 * themes, so a theme added there automatically shows up in the switcher UI.
 */
export const themeManager = createThemeManager<AppTheme, Mode>({
  themes: themeDefinitions,
})
