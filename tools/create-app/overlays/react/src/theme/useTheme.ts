import { useSyncExternalStore } from 'react'

import type { Mode, Theme as ThemeName } from '@ezhana/design-tokens'
import type { ThemeState } from '@ezhana/theme'

import { themeManager } from './manager'

export type AppThemeState = ThemeState<ThemeName, Mode>

/** Mode preference accepted by the switcher: a concrete mode or `system`. */
export type ThemeMode = Mode | 'system'

/**
 * React adapter over the singleton theme manager.
 *
 * The manager's `subscribe` / `getState` are stable references and `getState`
 * returns a frozen, referentially stable snapshot, which is exactly what
 * `useSyncExternalStore` needs — no context provider or re-render plumbing.
 */
export function useTheme() {
  const state = useSyncExternalStore(
    themeManager.subscribe,
    themeManager.getState,
    themeManager.getState,
  )

  return {
    ...state,
    setTheme: (theme: ThemeName) => themeManager.setTheme(theme),
    setMode: (mode: ThemeMode) => themeManager.setMode(mode),
  }
}
