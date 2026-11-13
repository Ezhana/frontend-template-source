/**
 * Public types for `@ezhana/theme` — the optional theme-state runtime.
 *
 * Styling does not need this package: the CSS-first contract is `data-theme` plus the optional
 * `data-color-mode` attribute. These declarations are hand-written because the runtime is plain ESM
 * with no build step.
 */

export declare const SYSTEM_MODE: 'system'
export declare const DEFAULT_STORAGE_KEY: 'ezhana-theme'
export declare const DEFAULT_THEME_ATTRIBUTE: 'data-theme'
export declare const DEFAULT_MODE_ATTRIBUTE: 'data-color-mode'

/** A theme package's metadata, as exported by `@ezhana/design-theme-*`. */
export interface ThemeDefinition<Id extends string = string, Mode extends string = string> {
  readonly id: Id
  readonly label: string
  /** Color modes the theme supports; a fixed-mode theme declares a single one. */
  readonly modes: readonly Mode[]
}

/** A mode preference: a concrete mode or `system`. */
export type ModePreference<Mode extends string = string> = Mode | 'system'

/** Frozen theme state, referentially stable until a value changes. */
export interface ThemeState<Theme extends string = string, Mode extends string = string> {
  /** Resolved theme identity, always written to `data-theme`. */
  readonly theme: Theme
  /** Saved preference: a configured mode or `system`. */
  readonly mode: ModePreference<Mode>
  /** Effective mode for the active theme; always one the theme supports. */
  readonly resolvedMode: Mode
  /** Color mode the operating system currently prefers. */
  readonly systemMode: Mode
}

/** Minimal root surface; `HTMLElement` satisfies it. */
export interface ThemeRoot {
  setAttribute(name: string, value: string): void
  removeAttribute?(name: string): void
}

/** Minimal storage surface; `localStorage` satisfies it. */
export interface ThemeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Event passed to `change` listeners of the system color-scheme query. */
export interface ThemeMediaQueryListEvent {
  readonly matches: boolean
}

/** Minimal `MediaQueryList` surface. */
export interface ThemeMediaQueryList {
  readonly matches: boolean
  addEventListener?(type: 'change', listener: (event: ThemeMediaQueryListEvent) => void): void
  removeEventListener?(type: 'change', listener: (event: ThemeMediaQueryListEvent) => void): void
  addListener?(listener: (event: ThemeMediaQueryListEvent) => void): void
  removeListener?(listener: (event: ThemeMediaQueryListEvent) => void): void
}

export type ThemeMatchMedia = (query: string) => ThemeMediaQueryList

/** `StorageEvent` subset used for cross-tab synchronisation. */
export interface ThemeStorageEvent {
  readonly key: string | null
  readonly newValue: string | null
}

/** Minimal event target surface; `window` satisfies it. */
export interface ThemeEventTarget {
  addEventListener(type: 'storage', listener: (event: ThemeStorageEvent) => void): void
  removeEventListener(type: 'storage', listener: (event: ThemeStorageEvent) => void): void
}

export interface ThemeManagerOptions<Theme extends string = string, Mode extends string = string> {
  /** Theme definitions to select from; the first one is the default unless `defaultTheme` is set. */
  themes: readonly ThemeDefinition<Theme, Mode>[]
  /** Default theme id. Must be one of `themes`; defaults to the first definition. */
  defaultTheme?: Theme
  /** Default mode preference: a mode or `'system'` (the default). */
  defaultMode?: ModePreference<Mode>
  /** localStorage key. Defaults to {@link DEFAULT_STORAGE_KEY}. */
  storageKey?: string
  /** Attribute that receives the theme identity. Defaults to {@link DEFAULT_THEME_ATTRIBUTE}. */
  themeAttribute?: string
  /** Attribute that receives an explicit color mode. Defaults to {@link DEFAULT_MODE_ATTRIBUTE}. */
  modeAttribute?: string
  /**
   * Element that receives the attributes. Defaults to `document.documentElement`; pass `null` to
   * run headless (for example during SSR) and inject the root on the client.
   */
  root?: ThemeRoot | null
  /** Storage for the preference. Defaults to `localStorage` when available; `null` disables it. */
  storage?: ThemeStorage | null
  /** `matchMedia` used for the system mode. Defaults to `window.matchMedia`. */
  matchMedia?: ThemeMatchMedia | null
  /** Target whose `storage` events are observed for cross-tab sync. Defaults to `window`. */
  eventTarget?: ThemeEventTarget | null
}

export type ThemeListener<Theme extends string = string, Mode extends string = string> = (
  state: ThemeState<Theme, Mode>,
) => void

export interface ThemeManager<Theme extends string = string, Mode extends string = string> {
  /** Current frozen state; safe as a `useSyncExternalStore` snapshot. */
  getState(): ThemeState<Theme, Mode>
  /** Switch theme, validate, persist, apply attributes and notify subscribers. */
  setTheme(theme: Theme): void
  /** Switch the mode preference, persist, apply and notify. */
  setMode(mode: ModePreference<Mode>): void
  /** Subscribe to state changes; returns an idempotent unsubscribe function. */
  subscribe(listener: ThemeListener<Theme, Mode>): () => void
  /** Remove listeners and clear subscribers. Idempotent; setters become no-ops. */
  destroy(): void
}

/**
 * Create a theme manager and apply the initial attributes to the resolved root.
 *
 * Importing this module performs no DOM access; the DOM is touched only here (and only when a root
 * is available), which keeps the package SSR-safe.
 */
export declare function createThemeManager<
  Theme extends string = string,
  Mode extends string = string,
>(options: ThemeManagerOptions<Theme, Mode>): ThemeManager<Theme, Mode>
