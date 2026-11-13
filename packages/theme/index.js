/**
 * `@ezhana/theme` — optional theme-state runtime.
 *
 * Styling is CSS-first: `data-theme` and the optional `data-color-mode` attribute are the contract,
 * so an app needs no JavaScript to render the default theme, switch themes, or follow the system
 * color mode. Use this package only when the app needs theme-switcher state: validated preferences,
 * persistence, system-mode tracking, cross-tab sync or subscriptions.
 *
 * Importing the module never touches `window` or `document`. `createThemeManager` reads the DOM at
 * construction time only (and runs headless when no DOM exists, e.g. during SSR), so a server and a
 * client can share the same code.
 */

export const SYSTEM_MODE = 'system'
export const DEFAULT_STORAGE_KEY = 'ezhana-theme'
export const DEFAULT_THEME_ATTRIBUTE = 'data-theme'
export const DEFAULT_MODE_ATTRIBUTE = 'data-color-mode'

const SYSTEM_MODE_QUERY = '(prefers-color-scheme: dark)'

const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

const normalizeDefinitions = (themes) => {
  if (!Array.isArray(themes) || themes.length === 0) {
    throw new TypeError(
      'createThemeManager(options): `themes` must be a non-empty array of theme definitions.',
    )
  }

  const ids = []
  const modes = []
  const themeModes = {}

  for (const [index, definition] of themes.entries()) {
    if (!isPlainObject(definition)) {
      throw new TypeError(
        `createThemeManager(options): \`themes[${index}]\` must be a theme definition ` +
          '({ id, label, modes }).',
      )
    }
    const { id, modes: supported } = definition
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError(`createThemeManager(options): \`themes[${index}].id\` must be a string.`)
    }
    if (ids.includes(id)) {
      throw new TypeError(
        `createThemeManager(options): the theme "${id}" is listed more than once.`,
      )
    }
    if (!Array.isArray(supported) || supported.length === 0) {
      throw new TypeError(
        `createThemeManager(options): the theme "${id}" must declare a non-empty \`modes\` array.`,
      )
    }
    for (const mode of supported) {
      if (typeof mode !== 'string' || mode.length === 0) {
        throw new TypeError(
          `createThemeManager(options): the theme "${id}" declares a mode that is not a string.`,
        )
      }
      if (mode === SYSTEM_MODE) {
        throw new TypeError(
          `createThemeManager(options): the theme "${id}" declares the reserved "system" mode.`,
        )
      }
      if (modes.includes(mode)) continue
      modes.push(mode)
    }
    ids.push(id)
    themeModes[id] = Object.freeze([...supported])
  }

  return { ids, modes, themeModes }
}

const readStored = (storage, storageKey) => {
  if (storage === null) return null
  let raw
  try {
    raw = storage.getItem(storageKey)
  } catch {
    return null
  }
  if (typeof raw !== 'string' || raw === '') return null
  try {
    const parsed = JSON.parse(raw)
    return isPlainObject(parsed) ? parsed : null
  } catch {
    return null
  }
}

const defaultRoot = () => (typeof document === 'undefined' ? null : document.documentElement)
const defaultWindow = () => (typeof window === 'undefined' ? null : window)

const resolveStorage = (value) => {
  if (value === null) return null
  if (value === undefined) {
    const target = defaultWindow()
    if (target === null) return null
    try {
      return target.localStorage ?? null
    } catch {
      return null
    }
  }
  if (typeof value.getItem !== 'function' || typeof value.setItem !== 'function') {
    throw new TypeError(
      'createThemeManager(options): `storage` must be null or an object with getItem/setItem.',
    )
  }
  return value
}

const resolveMatchMedia = (value) => {
  if (value === null) return null
  if (value === undefined) {
    const target = defaultWindow()
    return target !== null && typeof target.matchMedia === 'function'
      ? target.matchMedia.bind(target)
      : null
  }
  if (typeof value !== 'function') {
    throw new TypeError('createThemeManager(options): `matchMedia` must be null or a function.')
  }
  return value
}

const resolveEventTarget = (value) => {
  if (value === null) return null
  if (value === undefined) {
    const target = defaultWindow()
    return target !== null && typeof target.addEventListener === 'function' ? target : null
  }
  if (typeof value.addEventListener !== 'function') {
    throw new TypeError(
      'createThemeManager(options): `eventTarget` must be null or an object with addEventListener.',
    )
  }
  return value
}

/**
 * Create a theme manager.
 *
 * The manager writes `data-theme` (and `data-color-mode` for an explicit color mode) to `root`.
 * A theme may support a subset of the configured modes: `resolvedMode` is always a mode the active
 * theme supports, while the saved preference is kept unchanged.
 *
 * @param {object} options
 * @param {readonly object[]} options.themes Theme definitions (`{ id, label, modes }`).
 * @param {string} [options.defaultTheme='themes[0].id']
 * @param {string} [options.defaultMode='system'] A mode id or `'system'`.
 * @param {string} [options.storageKey='ezhana-theme']
 * @param {string} [options.themeAttribute='data-theme']
 * @param {string} [options.modeAttribute='data-color-mode']
 * @param {object | null} [options.root] Defaults to `document.documentElement`; `null` = headless.
 * @param {object | null} [options.storage] Defaults to `localStorage`; `null` = no persistence.
 * @param {Function | null} [options.matchMedia] Defaults to `window.matchMedia`.
 * @param {object | null} [options.eventTarget] Defaults to `window`; used for cross-tab sync.
 */
export function createThemeManager(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError('createThemeManager(options): an options object is required.')
  }

  const { ids: themes, modes, themeModes } = normalizeDefinitions(options.themes)
  const defaultTheme = options.defaultTheme ?? themes[0]
  if (!themes.includes(defaultTheme)) {
    throw new TypeError(
      `createThemeManager(options): \`defaultTheme\` must be one of: ${themes.join(', ')}.`,
    )
  }

  const defaultMode = options.defaultMode ?? SYSTEM_MODE
  if (defaultMode !== SYSTEM_MODE && !modes.includes(defaultMode)) {
    throw new TypeError(
      `createThemeManager(options): \`defaultMode\` must be "system" or one of: ${modes.join(', ')}.`,
    )
  }

  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY
  const themeAttribute = options.themeAttribute ?? DEFAULT_THEME_ATTRIBUTE
  const modeAttribute = options.modeAttribute ?? DEFAULT_MODE_ATTRIBUTE
  const root = options.root === undefined ? defaultRoot() : options.root
  const storage = resolveStorage(options.storage)
  const matchMedia = resolveMatchMedia(options.matchMedia)
  const eventTarget = resolveEventTarget(options.eventTarget)

  const osModes = modes.includes('dark') ? { dark: 'dark', light: 'light' } : null
  const fallbackMode = modes.includes('light') ? 'light' : modes[0]
  const mediaQueryList = (() => {
    if (matchMedia === null) return null
    try {
      return matchMedia(SYSTEM_MODE_QUERY)
    } catch {
      return null
    }
  })()

  const readSystemMode = () => {
    if (mediaQueryList === null) return fallbackMode
    let matches
    try {
      matches = Boolean(mediaQueryList.matches)
    } catch {
      return fallbackMode
    }
    if (matches) return osModes?.dark ?? fallbackMode
    return osModes?.light ?? fallbackMode
  }

  const resolvedFor = (themeId, mode, systemMode) => {
    const supported = themeModes[themeId]
    const candidate = mode === SYSTEM_MODE ? systemMode : mode
    return supported.includes(candidate) ? candidate : supported[0]
  }

  const stored = readStored(storage, storageKey)
  const storedTheme =
    stored !== null && typeof stored.theme === 'string' && themes.includes(stored.theme)
      ? stored.theme
      : defaultTheme
  const storedMode =
    stored !== null &&
    typeof stored.mode === 'string' &&
    (stored.mode === SYSTEM_MODE || modes.includes(stored.mode))
      ? stored.mode
      : defaultMode

  let theme = storedTheme
  let mode = storedMode
  let systemMode = readSystemMode()
  let resolvedMode = resolvedFor(theme, mode, systemMode)
  let destroyed = false
  const listeners = new Set()
  let detachMedia = null
  let detachStorage = null

  const snapshot = () => Object.freeze({ theme, mode, resolvedMode, systemMode })
  let state = snapshot()

  const applyAttributes = () => {
    if (root === null || typeof root.setAttribute !== 'function') return
    root.setAttribute(themeAttribute, theme)
    if (mode === SYSTEM_MODE) {
      if (typeof root.removeAttribute === 'function') root.removeAttribute(modeAttribute)
      return
    }
    root.setAttribute(modeAttribute, resolvedMode)
  }

  const persist = () => {
    if (storage === null) return
    try {
      storage.setItem(storageKey, JSON.stringify({ theme, mode }))
    } catch {
      // Persistence is best-effort: quota and privacy-mode errors must not break theming.
    }
  }

  const notify = () => {
    const next = state
    for (const listener of [...listeners]) listener(next)
  }

  const update = () => {
    resolvedMode = resolvedFor(theme, mode, systemMode)
    state = snapshot()
  }

  const handleSystemChange = (matches) => {
    if (destroyed) return
    const nextSystemMode = matches
      ? (osModes?.dark ?? fallbackMode)
      : (osModes?.light ?? fallbackMode)
    if (nextSystemMode === systemMode) return
    systemMode = nextSystemMode
    update()
    notify()
  }

  const handleStorage = (event) => {
    if (destroyed || event === null || typeof event !== 'object') return
    if (event.key !== storageKey) return
    if (typeof event.newValue !== 'string') return
    let parsed
    try {
      parsed = JSON.parse(event.newValue)
    } catch {
      return
    }
    if (!isPlainObject(parsed)) return
    if (typeof parsed.theme !== 'string' || !themes.includes(parsed.theme)) return
    if (typeof parsed.mode !== 'string') return
    if (parsed.mode !== SYSTEM_MODE && !modes.includes(parsed.mode)) return
    if (parsed.theme === theme && parsed.mode === mode) return
    theme = parsed.theme
    mode = parsed.mode
    update()
    applyAttributes()
    notify()
  }

  if (mediaQueryList !== null && typeof mediaQueryList.addEventListener === 'function') {
    const listener = (event) => {
      handleSystemChange(
        event !== null && typeof event.matches === 'boolean' ? event.matches : false,
      )
    }
    mediaQueryList.addEventListener('change', listener)
    detachMedia = () => mediaQueryList.removeEventListener?.('change', listener)
  } else if (mediaQueryList !== null && typeof mediaQueryList.addListener === 'function') {
    const listener = (event) => handleSystemChange(Boolean(event?.matches))
    mediaQueryList.addListener(listener)
    detachMedia = () => mediaQueryList.removeListener?.(listener)
  }

  if (eventTarget !== null) {
    const listener = (event) => handleStorage(event)
    eventTarget.addEventListener('storage', listener)
    detachStorage = () => eventTarget.removeEventListener('storage', listener)
  }

  applyAttributes()

  return {
    getState: () => state,

    setTheme(nextTheme) {
      if (destroyed) return
      if (typeof nextTheme !== 'string' || !themes.includes(nextTheme)) {
        throw new RangeError(
          `Invalid theme "${String(nextTheme)}". Expected one of: ${themes.join(', ')}.`,
        )
      }
      if (nextTheme === theme) return
      theme = nextTheme
      update()
      persist()
      applyAttributes()
      notify()
    },

    setMode(nextMode) {
      if (destroyed) return
      if (nextMode !== SYSTEM_MODE && !modes.includes(nextMode)) {
        throw new RangeError(
          `Invalid color mode "${String(nextMode)}". Expected one of: ${[
            ...modes,
            SYSTEM_MODE,
          ].join(', ')}.`,
        )
      }
      if (nextMode === mode) return
      mode = nextMode
      update()
      persist()
      applyAttributes()
      notify()
    },

    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('subscribe(listener): listener must be a function.')
      }
      if (destroyed) return () => {}
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    destroy() {
      if (destroyed) return
      destroyed = true
      detachMedia?.()
      detachStorage?.()
      listeners.clear()
    },
  }
}
