import { defaultTheme, modes, themes, type Mode, type Theme } from '@ezhana/design-tokens'
import { createThemeManager } from '@ezhana/theme'

/**
 * Browser-wide theme singleton.
 *
 * The generated metadata (`themes`, `modes`, `defaultTheme`) is the single
 * source of truth for the available themes, so adding a theme or a color mode
 * in `@ezhana/design-tokens` automatically shows up in the switcher UI.
 */
export const themeManager = createThemeManager<Theme, Mode>({
  themes: [...themes],
  modes: [...modes],
  defaultTheme,
})
