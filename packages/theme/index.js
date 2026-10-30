/**
 * @ezhana/theme — framework-agnostic theme runtime.
 *
 * Owns the theme + color-mode state machine behind `@ezhana/design-tokens`:
 *
 * - the resolved theme is always written to `data-theme`;
 * - the color mode is optional and written to `data-color-mode` only when the user chooses an
 *   explicit mode; in `system` mode the attribute is removed and the stylesheet follows
 *   `prefers-color-scheme` on its own;
 * - themes may support different subsets of the configured modes: `resolvedMode` is clamped to a
 *   mode the active theme supports, while the user preference is kept as-is;
 * - the preference is persisted, validated against the generated theme/mode metadata and synced
 *   across tabs.
 *
 * Plain ESM, zero dependencies, no build step. Importing this module never touches `window` or
 * `document`, so it is safe in Node and during SSR.
 */

/** Default localStorage key used to persist the theme preference. */
export const DEFAULT_STORAGE_KEY = 'ezhana-theme'

/** Default attribute that receives the theme identity. */
export const DEFAULT_THEME_ATTRIBUTE = 'data-theme'

/** Default attribute that receives the explicit color mode (removed when following the system). */
export const DEFAULT_MODE_ATTRIBUTE = 'data-color-mode'

/** Mode preference that follows the operating system color scheme. */
export const SYSTEM_MODE = 'system'

/** Semantic color modes used when the consumer does not pass an explicit list. */
const DEFAULT_MODES = Object.freeze(['light', 'dark'])

/** Media query that reports the operating system color-scheme preference. */
const SYSTEM_MODE_QUERY = '(prefers-color-scheme: dark)'

/**
 * @typedef {object} ThemeStateShape
 * @property {string} theme Validated theme identity (`data-theme`).
 * @property {string} mode User preference: an explicit color mode or `system`.
 * @property {string} resolvedMode Effective color mode for the active theme (explicit preference or
 *   the OS preference, clamped to a mode the active theme supports).
 * @property {string} systemMode Color mode the operating system currently prefers.
 */

/**
 * @typedef {object} ThemeRootLike
 * @property {(name: string, value: string) => void} setAttribute
 * @property {(name: string) => void} removeAttribute
 */

/**
 * @typedef {object} ThemeStorageLike
 * @property {(key: string) => string | null} getItem
 * @property {(key: string, value: string) => void} setItem
 */

/**
 * @typedef {object} ThemeMediaQueryListEventLike
 * @property {boolean} [matches]
 * @property {string} [media]
 */

/**
 * @typedef {object} ThemeMediaQueryListLike
 * @property {boolean} matches
 * @property {string} [media]
 * @property {(type: 'change', listener: (event: ThemeMediaQueryListEventLike) => void) => void} [addEventListener]
 * @property {(type: 'change', listener: (event: ThemeMediaQueryListEventLike) => void) => void} [removeEventListener]
 * @property {(listener: (event: ThemeMediaQueryListEventLike) => void) => void} [addListener]
 * @property {(listener: (event: ThemeMediaQueryListEventLike) => void) => void} [removeListener]
 */

/**
 * @typedef {(query: string) => ThemeMediaQueryListLike} ThemeMatchMediaLike
 */

/**
 * @typedef {object} ThemeStorageEventLike
 * @property {string | null} [key]
 * @property {string | null} [newValue]
 */

/**
 * @typedef {object} ThemeEventTargetLike
 * @property {(type: 'storage', listener: (event: ThemeStorageEventLike) => void) => void} addEventListener
 * @property {(type: 'storage', listener: (event: ThemeStorageEventLike) => void) => void} removeEventListener
 */

/**
 * @typedef {object} ThemeManagerOptionsShape
 * @property {readonly string[]} themes Required, unique, non-empty. First item is the default.
 * @property {readonly string[]} [modes] Defaults to `['light', 'dark']`.
 * @property {Readonly<Record<string, readonly string[]>>} [themeModes] Modes each theme supports.
 *   Defaults to every theme supporting all `modes`. Must cover exactly the configured themes, and
 *   every value must be a non-empty, unique subset of `modes` without the reserved `system` value.
 * @property {string} [defaultTheme] Defaults to `themes[0]`.
 * @property {string} [defaultMode] Defaults to `system`.
 * @property {string} [storageKey] Defaults to {@link DEFAULT_STORAGE_KEY}.
 * @property {string} [themeAttribute] Defaults to {@link DEFAULT_THEME_ATTRIBUTE}.
 * @property {string} [modeAttribute] Defaults to {@link DEFAULT_MODE_ATTRIBUTE}.
 * @property {ThemeRootLike} [root] Defaults to `document.documentElement` when a DOM exists.
 * @property {ThemeStorageLike | null} [storage] Defaults to `window.localStorage` when available.
 * @property {ThemeMatchMediaLike | null} [matchMedia] Defaults to `window.matchMedia` when available.
 * @property {ThemeEventTargetLike | null} [eventTarget] Defaults to `window` when available.
 */

/**
 * @typedef {object} ThemeManagerShape
 * @property {() => ThemeStateShape} getState
 * @property {(theme: string) => void} setTheme
 * @property {(mode: string) => void} setMode
 * @property {(listener: (state: ThemeStateShape) => void) => (() => void)} subscribe
 * @property {() => void} destroy
 */

/**
 * Create a theme manager.
 *
 * The manager writes `data-theme` to `root` immediately. `data-color-mode` is written only for
 * explicit `light` / `dark` preferences and removed in `system` mode, where the stylesheet follows
 * the operating-system preference through `prefers-color-scheme`.
 *
 * Themes may support different subsets of the configured modes (see `themeModes`). `resolvedMode` is
 * always a mode the active theme supports: the preference (or the OS preference in `system` mode)
 * when supported, otherwise the first mode declared for that theme. Explicit preferences are only
 * clamped for presentation, so `data-color-mode` never names an unsupported mode; the preference
 * itself is persisted unchanged and can apply again after switching to a theme that supports it.
 *
 * @param {ThemeManagerOptionsShape} options
 * @returns {ThemeManagerShape}
 */
export function createThemeManager(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('createThemeManager(options): an options object is required')
  }

  const themes = normalizeThemes(options.themes)
  const modes = normalizeModes(options.modes)
  const themeModes = normalizeThemeModes(options.themeModes, themes, modes)
  const defaultTheme = normalizeDefaultTheme(options.defaultTheme, themes)
  const defaultMode = normalizeDefaultMode(options.defaultMode, modes)
  const storageKey = normalizeStringOption(options.storageKey, DEFAULT_STORAGE_KEY, 'storageKey')
  const themeAttribute = normalizeStringOption(
    options.themeAttribute,
    DEFAULT_THEME_ATTRIBUTE,
    'themeAttribute',
  )
  const modeAttribute = normalizeStringOption(
    options.modeAttribute,
    DEFAULT_MODE_ATTRIBUTE,
    'modeAttribute',
  )

  const root = resolveRoot(options.root === undefined ? defaultRoot() : options.root)
  const storage = resolveStorage(options.storage === undefined ? defaultStorage() : options.storage)
  const matchMedia = resolveMatchMedia(
    options.matchMedia === undefined ? defaultMatchMedia() : options.matchMedia,
  )
  const eventTarget = resolveEventTarget(
    options.eventTarget === undefined ? defaultEventTarget() : options.eventTarget,
  )

  const mediaQueryList = resolveMediaQueryList(matchMedia)

  /**
   * Mode used when the OS query cannot be mapped into the configured modes.
   */
  const systemModeFallback =
    defaultMode === SYSTEM_MODE ? (modes.includes('light') ? 'light' : modes[0]) : defaultMode

  /**
   * Clamp a mode preference to a mode the active theme actually supports.
   *
   * @param {string} themeId Active theme identity.
   * @param {string} modePreference Explicit mode preference or `system`.
   * @param {string} osMode Current OS preference, already mapped into the configured modes.
   * @returns {string}
   */
  function resolveModeFor(themeId, modePreference, osMode) {
    const supported = themeModes[themeId]
    const candidate = modePreference === SYSTEM_MODE ? osMode : modePreference
    return supported.includes(candidate) ? candidate : supported[0]
  }

  const initialPreferences = readInitialPreferences()
  let theme = initialPreferences.theme
  let mode = initialPreferences.mode
  let systemMode = detectSystemMode()
  let resolvedMode = resolveModeFor(theme, mode, systemMode)
  let state = createState()
  let destroyed = false
  const listeners = new Set()
  let removeMediaQueryListener = null
  let removeStorageListener = null

  function isModePreference(value) {
    return typeof value === 'string' && (value === SYSTEM_MODE || modes.includes(value))
  }

  /** @param {boolean} matches */
  function mapMatchesToSystemMode(matches) {
    if (matches) return modes.includes('dark') ? 'dark' : systemModeFallback
    return modes.includes('light') ? 'light' : systemModeFallback
  }

  function detectSystemMode() {
    if (mediaQueryList === null) return systemModeFallback
    let matches
    try {
      matches = Boolean(mediaQueryList.matches)
    } catch {
      return systemModeFallback
    }
    return mapMatchesToSystemMode(matches)
  }

  function parseStoredJson(raw) {
    if (typeof raw !== 'string' || raw === '') return null
    try {
      const parsed = JSON.parse(raw)
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
      return parsed
    } catch {
      return null
    }
  }

  function readInitialPreferences() {
    let raw = null
    if (storage !== null) {
      try {
        raw = storage.getItem(storageKey)
      } catch {
        raw = null
      }
    }
    const parsed = parseStoredJson(raw)
    const storedTheme = parsed === null ? undefined : parsed.theme
    const storedMode = parsed === null ? undefined : parsed.mode
    return {
      theme:
        typeof storedTheme === 'string' && themes.includes(storedTheme)
          ? storedTheme
          : defaultTheme,
      mode: isModePreference(storedMode) ? storedMode : defaultMode,
    }
  }

  function parseStoredPreferences(raw) {
    const parsed = parseStoredJson(raw)
    if (parsed === null) return null
    const storedTheme = parsed.theme
    const storedMode = parsed.mode
    if (typeof storedTheme !== 'string' || !themes.includes(storedTheme)) return null
    if (!isModePreference(storedMode)) return null
    return { theme: storedTheme, mode: storedMode }
  }

  function createState() {
    return Object.freeze({ theme, mode, resolvedMode, systemMode })
  }

  function applyAttributes() {
    root.setAttribute(themeAttribute, theme)
    if (mode === SYSTEM_MODE) {
      root.removeAttribute(modeAttribute)
    } else {
      root.setAttribute(modeAttribute, resolvedMode)
    }
  }

  function persist() {
    if (storage === null) return
    try {
      storage.setItem(storageKey, JSON.stringify({ theme, mode }))
    } catch {
      // Persistence is best-effort: quota and privacy-mode errors must not break theming.
    }
  }

  function notify() {
    const snapshot = state
    for (const listener of [...listeners]) {
      listener(snapshot)
    }
  }

  function readMatchesFromChangeEvent(event) {
    if (event !== null && typeof event === 'object' && typeof event.matches === 'boolean') {
      return event.matches
    }
    if (mediaQueryList !== null) {
      try {
        return Boolean(mediaQueryList.matches)
      } catch {
        return false
      }
    }
    return false
  }

  function handleMediaChange(event) {
    if (destroyed) return
    const nextSystemMode = mapMatchesToSystemMode(readMatchesFromChangeEvent(event))
    if (nextSystemMode === systemMode) return
    systemMode = nextSystemMode
    resolvedMode = resolveModeFor(theme, mode, systemMode)
    state = createState()
    notify()
  }

  function handleStorageEvent(event) {
    if (destroyed) return
    if (event === null || typeof event !== 'object' || event.key !== storageKey) return
    const preferences = parseStoredPreferences(event.newValue)
    if (preferences === null) return
    if (preferences.theme === theme && preferences.mode === mode) return
    theme = preferences.theme
    mode = preferences.mode
    resolvedMode = resolveModeFor(theme, mode, systemMode)
    state = createState()
    applyAttributes()
    notify()
  }

  function attachMediaQueryListener() {
    if (mediaQueryList === null) return
    const listener = (event) => {
      handleMediaChange(event)
    }
    try {
      if (typeof mediaQueryList.addEventListener === 'function') {
        mediaQueryList.addEventListener('change', listener)
        removeMediaQueryListener = () => {
          if (typeof mediaQueryList.removeEventListener === 'function') {
            mediaQueryList.removeEventListener('change', listener)
          }
        }
      } else if (typeof mediaQueryList.addListener === 'function') {
        mediaQueryList.addListener(listener)
        removeMediaQueryListener = () => {
          if (typeof mediaQueryList.removeListener === 'function') {
            mediaQueryList.removeListener(listener)
          }
        }
      }
    } catch {
      removeMediaQueryListener = null
    }
  }

  function attachStorageListener() {
    if (eventTarget === null) return
    try {
      eventTarget.addEventListener('storage', handleStorageEvent)
      removeStorageListener = () => {
        try {
          eventTarget.removeEventListener('storage', handleStorageEvent)
        } catch {
          // The target may already be torn down; removal is best-effort.
        }
      }
    } catch {
      removeStorageListener = null
    }
  }

  function getState() {
    return state
  }

  function setTheme(nextTheme) {
    if (destroyed) return
    if (typeof nextTheme !== 'string' || !themes.includes(nextTheme)) {
      throw new RangeError(
        `Invalid theme "${String(nextTheme)}". Expected one of: ${themes.join(', ')}.`,
      )
    }
    if (nextTheme === theme) return
    theme = nextTheme
    resolvedMode = resolveModeFor(theme, mode, systemMode)
    state = createState()
    persist()
    applyAttributes()
    notify()
  }

  function setMode(nextMode) {
    if (destroyed) return
    if (!isModePreference(nextMode)) {
      throw new RangeError(
        `Invalid color mode "${String(nextMode)}". Expected one of: ${[...modes, SYSTEM_MODE].join(
          ', ',
        )}.`,
      )
    }
    if (nextMode === mode) return
    mode = nextMode
    resolvedMode = resolveModeFor(theme, mode, systemMode)
    state = createState()
    persist()
    applyAttributes()
    notify()
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('subscribe(listener): listener must be a function')
    }
    if (destroyed) return () => {}
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    if (removeMediaQueryListener !== null) {
      removeMediaQueryListener()
      removeMediaQueryListener = null
    }
    if (removeStorageListener !== null) {
      removeStorageListener()
      removeStorageListener = null
    }
    listeners.clear()
  }

  applyAttributes()
  attachMediaQueryListener()
  attachStorageListener()

  return { getState, setTheme, setMode, subscribe, destroy }
}

/* ------------------------------------------------------------------ */
/* Option validation and environment defaults                          */
/* ------------------------------------------------------------------ */

function normalizeThemes(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(
      'createThemeManager(options): `themes` must be a non-empty array of unique strings.',
    )
  }
  const themes = []
  for (const [index, theme] of value.entries()) {
    if (typeof theme !== 'string' || theme.length === 0) {
      throw new TypeError(
        `createThemeManager(options): \`themes[${index}]\` must be a non-empty string.`,
      )
    }
    if (themes.includes(theme)) {
      throw new TypeError(
        `createThemeManager(options): \`themes\` must not contain duplicates ("${theme}" appears more than once).`,
      )
    }
    themes.push(theme)
  }
  return Object.freeze(themes)
}

function normalizeModes(value) {
  const source = value === undefined ? DEFAULT_MODES : value
  if (!Array.isArray(source) || source.length === 0) {
    throw new TypeError(
      'createThemeManager(options): `modes` must be a non-empty array of unique strings.',
    )
  }
  const modes = []
  for (const [index, mode] of source.entries()) {
    if (typeof mode !== 'string' || mode.length === 0) {
      throw new TypeError(
        `createThemeManager(options): \`modes[${index}]\` must be a non-empty string.`,
      )
    }
    if (mode === SYSTEM_MODE) {
      throw new TypeError(
        'createThemeManager(options): `modes` must not include the reserved "system" value.',
      )
    }
    if (modes.includes(mode)) {
      throw new TypeError(
        `createThemeManager(options): \`modes\` must not contain duplicates ("${mode}" appears more than once).`,
      )
    }
    modes.push(mode)
  }
  return Object.freeze(modes)
}

/**
 * Normalize the per-theme supported mode map.
 *
 * @param {unknown} value
 * @param {readonly string[]} themes
 * @param {readonly string[]} modes
 * @returns {Readonly<Record<string, readonly string[]>>}
 */
function normalizeThemeModes(value, themes, modes) {
  if (value === undefined) {
    const themeModes = {}
    for (const theme of themes) themeModes[theme] = modes
    return Object.freeze(themeModes)
  }
  if (!isPlainObject(value)) {
    throw new TypeError(
      'createThemeManager(options): `themeModes` must be a plain object mapping every configured theme to its supported modes.',
    )
  }
  const keys = Object.keys(value)
  for (const theme of themes) {
    if (!Object.prototype.hasOwnProperty.call(value, theme)) {
      throw new TypeError(
        `createThemeManager(options): \`themeModes\` is missing the configured theme "${theme}".`,
      )
    }
  }
  for (const key of keys) {
    if (!themes.includes(key)) {
      throw new TypeError(
        `createThemeManager(options): \`themeModes\` contains the unknown theme "${key}". Expected only: ${themes.join(
          ', ',
        )}.`,
      )
    }
  }
  const themeModes = {}
  for (const theme of themes) {
    themeModes[theme] = normalizeThemeModeList(value[theme], theme, modes)
  }
  return Object.freeze(themeModes)
}

/**
 * @param {unknown} value
 * @param {string} theme
 * @param {readonly string[]} modes
 * @returns {readonly string[]}
 */
function normalizeThemeModeList(value, theme, modes) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(
      `createThemeManager(options): \`themeModes["${theme}"]\` must be a non-empty array of supported modes.`,
    )
  }
  const supported = []
  for (const [index, mode] of value.entries()) {
    if (typeof mode !== 'string' || mode.length === 0) {
      throw new TypeError(
        `createThemeManager(options): \`themeModes["${theme}"][${index}]\` must be a non-empty string.`,
      )
    }
    if (mode === SYSTEM_MODE) {
      throw new TypeError(
        `createThemeManager(options): \`themeModes["${theme}"]\` must not include the reserved "system" preference.`,
      )
    }
    if (!modes.includes(mode)) {
      throw new TypeError(
        `createThemeManager(options): \`themeModes["${theme}"]\` includes "${mode}", which is not one of the configured modes: ${modes.join(
          ', ',
        )}.`,
      )
    }
    if (supported.includes(mode)) {
      throw new TypeError(
        `createThemeManager(options): \`themeModes["${theme}"]\` must not contain duplicates ("${mode}" appears more than once).`,
      )
    }
    supported.push(mode)
  }
  return Object.freeze(supported)
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

function normalizeDefaultTheme(value, themes) {
  if (value === undefined) return themes[0]
  if (typeof value !== 'string' || !themes.includes(value)) {
    throw new TypeError(
      `createThemeManager(options): \`defaultTheme\` must be one of the configured themes: ${themes.join(
        ', ',
      )}.`,
    )
  }
  return value
}

function normalizeDefaultMode(value, modes) {
  if (value === undefined) return SYSTEM_MODE
  if (typeof value !== 'string' || (value !== SYSTEM_MODE && !modes.includes(value))) {
    throw new TypeError(
      `createThemeManager(options): \`defaultMode\` must be "system" or one of the configured modes: ${modes.join(
        ', ',
      )}.`,
    )
  }
  return value
}

function normalizeStringOption(value, fallback, name) {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`createThemeManager(options): \`${name}\` must be a non-empty string.`)
  }
  return value
}

function resolveRoot(value) {
  if (value === null || value === undefined) {
    throw new Error(
      'createThemeManager(options): `root` is required when no DOM is available (for example in Node or during SSR). Pass the element that should receive the theme attributes, such as `document.documentElement`, or a minimal object implementing `setAttribute` and `removeAttribute`.',
    )
  }
  if (
    typeof value !== 'object' ||
    typeof value.setAttribute !== 'function' ||
    typeof value.removeAttribute !== 'function'
  ) {
    throw new TypeError(
      'createThemeManager(options): `root` must be an object with `setAttribute(name, value)` and `removeAttribute(name)` methods.',
    )
  }
  return value
}

function resolveStorage(value) {
  if (value === null || value === undefined) return null
  if (
    typeof value !== 'object' ||
    typeof value.getItem !== 'function' ||
    typeof value.setItem !== 'function'
  ) {
    throw new TypeError(
      'createThemeManager(options): `storage` must be null or an object with `getItem(key)` and `setItem(key, value)` methods.',
    )
  }
  return value
}

function resolveMatchMedia(value) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'function') {
    throw new TypeError(
      'createThemeManager(options): `matchMedia` must be null or a function such as `window.matchMedia`.',
    )
  }
  return value
}

function resolveEventTarget(value) {
  if (value === null || value === undefined) return null
  if (
    typeof value !== 'object' ||
    typeof value.addEventListener !== 'function' ||
    typeof value.removeEventListener !== 'function'
  ) {
    throw new TypeError(
      'createThemeManager(options): `eventTarget` must be null or an object with `addEventListener` and `removeEventListener` methods.',
    )
  }
  return value
}

function resolveMediaQueryList(matchMedia) {
  if (matchMedia === null) return null
  try {
    const candidate = matchMedia(SYSTEM_MODE_QUERY)
    return candidate !== null && typeof candidate === 'object' ? candidate : null
  } catch {
    return null
  }
}

function defaultRoot() {
  if (typeof document === 'undefined') return null
  return document.documentElement ?? null
}

function defaultStorage() {
  if (typeof window === 'undefined') return null
  try {
    const storage = window.localStorage
    return storage !== null && typeof storage === 'object' ? storage : null
  } catch {
    return null
  }
}

function defaultMatchMedia() {
  if (typeof window === 'undefined') return null
  try {
    if (typeof window.matchMedia !== 'function') return null
    return window.matchMedia.bind(window)
  } catch {
    return null
  }
}

function defaultEventTarget() {
  if (typeof window === 'undefined') return null
  return typeof window.addEventListener === 'function' &&
    typeof window.removeEventListener === 'function'
    ? window
    : null
}

/* ------------------------------------------------------------------ */
/* Theme registry                                                      */
/* ------------------------------------------------------------------ */

/**
 * @typedef {object} ThemeDefinitionShape
 * @property {string} id Theme identity written to `data-theme`.
 * @property {string} label Human-readable label for switcher UIs.
 * @property {readonly string[]} modes Color modes the theme supports; lists may differ between themes.
 */

/**
 * @typedef {object} ThemeRegistryShape
 * @property {readonly string[]} themes Theme identities, registry order, frozen.
 * @property {Readonly<Record<string, string>>} themeLabels Labels keyed by theme id, frozen.
 * @property {string} defaultTheme Default theme identity.
 * @property {readonly string[]} modes Union of the modes declared by the registered themes in
 *   first-seen order, frozen.
 * @property {Readonly<Record<string, readonly string[]>>} themeModes Modes supported by each theme,
 *   keyed by theme id and preserving the theme's declared order, frozen.
 */

/** Theme ids end up in `data-theme` and in CSS attribute selectors, so they follow the contract. */
const THEME_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/**
 * Combine theme definitions into the metadata the theme manager consumes.
 *
 * A definition is what a theme package exports (`{ id, label, modes }`), plus the default theme
 * from `@ezhana/design-tokens`. Definitions may declare different mode lists (for example a
 * dark-only theme next to light+dark themes): `modes` becomes the union in first-seen order and
 * `themeModes` records each theme's own list, which the manager uses to clamp `resolvedMode`.
 *
 * The registry is pure data: it performs no DOM work, imports no CSS
 * and never depends on a specific theme package, so it works with the official themes, with
 * third-party themes and with definitions written by hand.
 *
 * @param {readonly ThemeDefinitionShape[]} definitions
 * @param {{ readonly defaultTheme?: string }} [options]
 * @returns {ThemeRegistryShape}
 */
export function defineThemeRegistry(definitions, options = {}) {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    throw new TypeError(
      'defineThemeRegistry(definitions): `definitions` must be a non-empty array of theme definitions.',
    )
  }

  const themes = []
  const themeLabels = {}
  const themeModes = {}
  const modes = []

  for (const [index, definition] of definitions.entries()) {
    if (definition === null || typeof definition !== 'object') {
      throw new TypeError(
        `defineThemeRegistry(definitions): \`definitions[${index}]\` must be an object with \`id\`, \`label\` and \`modes\`.`,
      )
    }

    const { id, label } = definition
    if (typeof id !== 'string' || !THEME_ID_PATTERN.test(id)) {
      throw new TypeError(
        `defineThemeRegistry(definitions): \`definitions[${index}].id\` must be a theme id matching ${String(
          THEME_ID_PATTERN,
        )}, received ${JSON.stringify(id)}.`,
      )
    }
    if (themes.includes(id)) {
      throw new TypeError(
        `defineThemeRegistry(definitions): the theme "${id}" is registered more than once.`,
      )
    }
    if (typeof label !== 'string' || label.trim().length === 0) {
      throw new TypeError(
        `defineThemeRegistry(definitions): \`definitions[${index}].label\` must be a non-empty string.`,
      )
    }

    const definitionModes = normalizeDefinitionModes(definition.modes, id)
    for (const mode of definitionModes) {
      if (!modes.includes(mode)) modes.push(mode)
    }

    themes.push(id)
    themeLabels[id] = label
    themeModes[id] = Object.freeze(definitionModes)
  }

  const defaultTheme = options.defaultTheme ?? themes[0]
  if (!themes.includes(defaultTheme)) {
    throw new TypeError(
      `defineThemeRegistry(definitions): \`defaultTheme\` must be one of the registered themes: ${themes.join(
        ', ',
      )}.`,
    )
  }

  return Object.freeze({
    themes: Object.freeze(themes),
    themeLabels: Object.freeze(themeLabels),
    defaultTheme,
    modes: Object.freeze(modes),
    themeModes: Object.freeze(themeModes),
  })
}

/**
 * @param {unknown} value
 * @param {string} id
 * @returns {string[]}
 */
function normalizeDefinitionModes(value, id) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(
      `defineThemeRegistry(definitions): the theme "${id}" must declare a non-empty \`modes\` array.`,
    )
  }
  const modes = []
  for (const mode of value) {
    if (typeof mode !== 'string' || mode.length === 0) {
      throw new TypeError(
        `defineThemeRegistry(definitions): the theme "${id}" declares a mode that is not a non-empty string.`,
      )
    }
    if (mode === SYSTEM_MODE) {
      throw new TypeError(
        `defineThemeRegistry(definitions): the theme "${id}" declares the reserved mode "${SYSTEM_MODE}". ` +
          '`system` is a preference, not a color mode; list the concrete modes only.',
      )
    }
    if (modes.includes(mode)) {
      throw new TypeError(
        `defineThemeRegistry(definitions): the theme "${id}" declares the mode "${mode}" more than once.`,
      )
    }
    modes.push(mode)
  }
  return modes
}
