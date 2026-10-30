import type { Mode } from '@ezhana/design-tokens'
import { createThemeManager } from '@ezhana/theme'

import { themeRegistry, type AppTheme } from './registry'

/**
 * Single browser-wide theme manager.
 *
 * It applies `data-theme` and the optional `data-color-mode` to `<html>`, keeps the state in
 * localStorage and follows the OS preference while the mode is `system`.
 * `getState` is referentially stable, so it can feed `useSyncExternalStore`
 * directly (see `./useTheme.ts`).
 */
export const themeManager = createThemeManager<AppTheme, Mode>({
  themes: [...themeRegistry.themes],
  modes: [...themeRegistry.modes],
  defaultTheme: themeRegistry.defaultTheme,
})
