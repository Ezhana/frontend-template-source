import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DEFAULT_MODE_ATTRIBUTE,
  DEFAULT_STORAGE_KEY,
  DEFAULT_THEME_ATTRIBUTE,
  SYSTEM_MODE,
  createThemeManager,
} from '../index.js'

/* -------------------------------------------------------------------------- */
/* Fakes                                                                       */
/* -------------------------------------------------------------------------- */

const createRoot = () => {
  const attributes = new Map()
  return {
    attributes,
    setAttribute(name, value) {
      attributes.set(name, String(value))
    },
    removeAttribute(name) {
      attributes.delete(name)
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null
    },
  }
}

const createStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem(key) {
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      data.set(key, String(value))
    },
  }
}

const createMediaQueryList = (matches = false) => {
  const listeners = new Set()
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener(type, listener) {
      if (type === 'change') listeners.add(listener)
    },
    removeEventListener(type, listener) {
      if (type === 'change') listeners.delete(listener)
    },
    emit(nextMatches) {
      mql.matches = nextMatches
      for (const listener of [...listeners]) listener({ matches: nextMatches })
    },
    get listenerCount() {
      return listeners.size
    },
  }
  return mql
}

const createEventTarget = () => {
  const listeners = new Map()
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(listener)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
    emit(type, event) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event)
    },
    get listenerCount() {
      return [...listeners.values()].reduce((total, set) => total + set.size, 0)
    },
  }
}

const setup = (overrides = {}) => {
  const root = overrides.root ?? createRoot()
  const storage = overrides.storage ?? createStorage()
  const mql = overrides.mql ?? createMediaQueryList(false)
  const eventTarget = overrides.eventTarget ?? createEventTarget()
  const options = {
    themes: ['default', 'ocean', 'cerulean'],
    modes: ['light', 'dark'],
    root,
    storage,
    matchMedia: overrides.matchMedia ?? (() => mql),
    eventTarget,
    ...overrides.options,
  }
  const manager = createThemeManager(options)
  return { manager, root, storage, mql, eventTarget }
}

const collect = (manager) => {
  const states = []
  const unsubscribe = manager.subscribe((state) => states.push(state))
  return { states, unsubscribe }
}

/* -------------------------------------------------------------------------- */
/* Constants and initial state                                                 */
/* -------------------------------------------------------------------------- */

test('exports the documented constants', () => {
  assert.equal(DEFAULT_STORAGE_KEY, 'ezhana-theme')
  assert.equal(DEFAULT_THEME_ATTRIBUTE, 'data-theme')
  assert.equal(DEFAULT_MODE_ATTRIBUTE, 'data-color-mode')
  assert.equal(SYSTEM_MODE, 'system')
})

test('applies the default theme and leaves the mode attribute unset (system)', () => {
  const { manager, root } = setup()
  assert.equal(root.getAttribute('data-theme'), 'default')
  assert.equal(root.getAttribute('data-color-mode'), null)

  const state = manager.getState()
  assert.equal(state.theme, 'default')
  assert.equal(state.mode, SYSTEM_MODE)
  assert.equal(state.resolvedMode, 'light')
  assert.equal(state.systemMode, 'light')
  assert.ok(Object.isFrozen(state))
})

test('resolves system dark on start and still omits the mode attribute', () => {
  const { manager, root } = setup({ mql: createMediaQueryList(true) })
  assert.equal(root.getAttribute('data-theme'), 'default')
  assert.equal(root.getAttribute('data-color-mode'), null)
  assert.equal(manager.getState().resolvedMode, 'dark')
  assert.equal(manager.getState().systemMode, 'dark')
})

test('restores a persisted theme and explicit mode', () => {
  const storage = createStorage({
    'ezhana-theme': JSON.stringify({ theme: 'ocean', mode: 'dark' }),
  })
  const { manager, root } = setup({ storage })
  assert.equal(root.getAttribute('data-theme'), 'ocean')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')
  assert.equal(manager.getState().theme, 'ocean')
  assert.equal(manager.getState().mode, 'dark')
  assert.equal(manager.getState().resolvedMode, 'dark')
})

test('restores a persisted system preference without a mode attribute', () => {
  const storage = createStorage({
    'ezhana-theme': JSON.stringify({ theme: 'cerulean', mode: 'system' }),
  })
  const { manager, root } = setup({ storage, mql: createMediaQueryList(true) })
  assert.equal(root.getAttribute('data-theme'), 'cerulean')
  assert.equal(root.getAttribute('data-color-mode'), null)
  assert.equal(manager.getState().resolvedMode, 'dark')
})

test('falls back independently for invalid persisted fields', () => {
  const storage = createStorage({
    'ezhana-theme': JSON.stringify({ theme: 'nope', mode: 'dark' }),
  })
  const { root } = setup({ storage })
  assert.equal(root.getAttribute('data-theme'), 'default')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')

  storage.data.set('ezhana-theme', JSON.stringify({ theme: 'ocean', mode: 'sepia' }))
  const second = setup({ storage })
  assert.equal(second.root.getAttribute('data-theme'), 'ocean')
  assert.equal(second.root.getAttribute('data-color-mode'), null)
  assert.equal(second.manager.getState().mode, SYSTEM_MODE)
})

test('ignores malformed or legacy payloads', () => {
  const storage = createStorage({ 'ezhana-theme': '{not json' })
  const { root } = setup({ storage })
  assert.equal(root.getAttribute('data-theme'), 'default')

  // Legacy payloads are validated per field: `mode` is still usable, unknown `brand` is ignored.
  storage.data.set('ezhana-theme', JSON.stringify({ brand: 'ocean', mode: 'dark' }))
  const second = setup({ storage })
  assert.equal(second.root.getAttribute('data-theme'), 'default')
  assert.equal(second.root.getAttribute('data-color-mode'), 'dark')
})

test('explicit default preference is applied on start', () => {
  const { manager, root } = setup({
    options: { defaultTheme: 'ocean', defaultMode: 'dark' },
  })
  assert.equal(root.getAttribute('data-theme'), 'ocean')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')
  assert.equal(manager.getState().mode, 'dark')
})

/* -------------------------------------------------------------------------- */
/* Setters                                                                     */
/* -------------------------------------------------------------------------- */

test('setTheme applies, persists and notifies', () => {
  const { manager, root, storage } = setup()
  const { states } = collect(manager)
  manager.setTheme('ocean')
  assert.equal(root.getAttribute('data-theme'), 'ocean')
  assert.equal(states.length, 1)
  assert.equal(states[0].theme, 'ocean')
  assert.deepEqual(JSON.parse(storage.data.get('ezhana-theme')), {
    theme: 'ocean',
    mode: SYSTEM_MODE,
  })
})

test('setTheme is a no-op when unchanged and rejects unknown values', () => {
  const { manager, root } = setup()
  const { states } = collect(manager)
  manager.setTheme('default')
  assert.equal(states.length, 0)
  assert.throws(() => manager.setTheme('nope'), RangeError)
  assert.equal(root.getAttribute('data-theme'), 'default')
})

test('setMode light/dark writes the mode attribute and persists', () => {
  const { manager, root, storage } = setup()
  const { states } = collect(manager)
  manager.setMode('dark')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')
  assert.equal(manager.getState().resolvedMode, 'dark')
  assert.equal(states.at(-1).mode, 'dark')
  assert.deepEqual(JSON.parse(storage.data.get('ezhana-theme')), {
    theme: 'default',
    mode: 'dark',
  })

  manager.setMode('light')
  assert.equal(root.getAttribute('data-color-mode'), 'light')
  assert.equal(manager.getState().resolvedMode, 'light')
})

test('setMode system removes the mode attribute and uses the OS preference', () => {
  const { manager, root, mql } = setup()
  manager.setMode('dark')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')

  mql.emit(true)
  manager.setMode(SYSTEM_MODE)
  assert.equal(root.getAttribute('data-color-mode'), null)
  assert.equal(manager.getState().mode, SYSTEM_MODE)
  assert.equal(manager.getState().resolvedMode, 'dark')
  assert.equal(manager.getState().systemMode, 'dark')
})

test('invalid setMode values throw RangeError', () => {
  const { manager } = setup()
  assert.throws(() => manager.setMode('sepia'), RangeError)
  assert.throws(() => manager.setMode('system-mode'), RangeError)
})

/* -------------------------------------------------------------------------- */
/* System preference changes                                                   */
/* -------------------------------------------------------------------------- */

test('system changes update resolvedMode while the mode attribute stays absent', () => {
  const { manager, root, mql } = setup()
  const { states } = collect(manager)
  mql.emit(true)
  assert.equal(manager.getState().resolvedMode, 'dark')
  assert.equal(root.getAttribute('data-color-mode'), null)
  assert.equal(states.at(-1).resolvedMode, 'dark')

  mql.emit(false)
  assert.equal(manager.getState().resolvedMode, 'light')
  assert.equal(root.getAttribute('data-color-mode'), null)
})

test('system changes do not override an explicit mode but update systemMode', () => {
  const { manager, root, mql } = setup()
  manager.setMode('light')
  const { states } = collect(manager)
  mql.emit(true)
  assert.equal(manager.getState().resolvedMode, 'light')
  assert.equal(manager.getState().systemMode, 'dark')
  assert.equal(root.getAttribute('data-color-mode'), 'light')
  assert.equal(states.at(-1).resolvedMode, 'light')
})

test('uses defaultMode when no matchMedia is available', () => {
  const { manager, root } = setup({ matchMedia: null })
  assert.equal(manager.getState().systemMode, 'light')
  assert.equal(root.getAttribute('data-color-mode'), null)
})

test('maps a system preference into configured modes defensively', () => {
  const mql = createMediaQueryList(true)
  const { manager } = setup({
    mql,
    options: { themes: ['default'], modes: ['light'], matchMedia: () => mql },
  })
  assert.equal(manager.getState().systemMode, 'light')
  assert.equal(manager.getState().resolvedMode, 'light')
})

/* -------------------------------------------------------------------------- */
/* Persistence and cross-tab sync                                              */
/* -------------------------------------------------------------------------- */

test('storage writes/reads are best-effort', () => {
  const throwing = {
    getItem() {
      throw new Error('blocked')
    },
    setItem() {
      throw new Error('quota')
    },
  }
  const { manager, root } = setup({ storage: throwing })
  assert.equal(root.getAttribute('data-theme'), 'default')
  manager.setTheme('ocean')
  manager.setMode('dark')
  assert.equal(root.getAttribute('data-theme'), 'ocean')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')
})

test('storage events from another tab apply both fields', () => {
  const { manager, root, eventTarget } = setup()
  const { states } = collect(manager)
  eventTarget.emit('storage', {
    key: 'ezhana-theme',
    newValue: JSON.stringify({ theme: 'cerulean', mode: 'dark' }),
  })
  assert.equal(root.getAttribute('data-theme'), 'cerulean')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')
  assert.equal(states.at(-1).theme, 'cerulean')
})

test('storage events with system mode remove the mode attribute', () => {
  const { manager, root, eventTarget } = setup({ options: { defaultMode: 'dark' } })
  assert.equal(root.getAttribute('data-color-mode'), 'dark')
  eventTarget.emit('storage', {
    key: 'ezhana-theme',
    newValue: JSON.stringify({ theme: 'ocean', mode: 'system' }),
  })
  assert.equal(root.getAttribute('data-color-mode'), null)
  assert.equal(manager.getState().mode, SYSTEM_MODE)
})

test('invalid storage events are ignored', () => {
  const { manager, root, eventTarget } = setup()
  const { states } = collect(manager)
  for (const newValue of [null, '', '{', '[]', JSON.stringify({ theme: 'nope', mode: 'dark' })]) {
    eventTarget.emit('storage', { key: 'ezhana-theme', newValue })
  }
  eventTarget.emit('storage', {
    key: 'other-key',
    newValue: JSON.stringify({ theme: 'ocean', mode: 'dark' }),
  })
  assert.equal(root.getAttribute('data-theme'), 'default')
  assert.equal(states.length, 0)
})

test('equivalent storage events do not notify', () => {
  const { manager, eventTarget } = setup()
  const { states } = collect(manager)
  eventTarget.emit('storage', {
    key: 'ezhana-theme',
    newValue: JSON.stringify({ theme: 'default', mode: 'system' }),
  })
  assert.equal(states.length, 0)
})

/* -------------------------------------------------------------------------- */
/* Subscriptions and lifecycle                                                 */
/* -------------------------------------------------------------------------- */

test('getState is referentially stable between changes', () => {
  const { manager } = setup()
  const first = manager.getState()
  assert.equal(manager.getState(), first)
  manager.setTheme('ocean')
  assert.notEqual(manager.getState(), first)
  assert.equal(manager.getState(), manager.getState())
})

test('subscribe validates listeners, does not call immediately and unsubscribes', () => {
  const { manager } = setup()
  assert.throws(() => manager.subscribe(null), TypeError)
  const states = []
  const unsubscribe = manager.subscribe((state) => states.push(state))
  assert.equal(states.length, 0)
  manager.setTheme('ocean')
  assert.equal(states.length, 1)
  unsubscribe()
  manager.setMode('dark')
  assert.equal(states.length, 1)
  assert.doesNotThrow(() => unsubscribe())
})

test('destroy is idempotent and removes all listeners', () => {
  const { manager, mql, eventTarget } = setup()
  assert.equal(mql.listenerCount, 1)
  assert.equal(eventTarget.listenerCount, 1)
  manager.destroy()
  manager.destroy()
  assert.equal(mql.listenerCount, 0)
  assert.equal(eventTarget.listenerCount, 0)
})

test('setters are no-ops after destroy and subscribe is safe', () => {
  const { manager, root } = setup()
  manager.destroy()
  assert.doesNotThrow(() => manager.setTheme('ocean'))
  assert.doesNotThrow(() => manager.setMode('dark'))
  assert.equal(root.getAttribute('data-theme'), 'default')
  assert.equal(typeof manager.subscribe(() => {}), 'function')
})

/* -------------------------------------------------------------------------- */
/* Option validation                                                           */
/* -------------------------------------------------------------------------- */

test('requires a root when no DOM is available', () => {
  assert.throws(() => createThemeManager({ themes: ['default'], root: null }), Error)
})

test('validates the root, themes, modes and defaults', () => {
  const root = createRoot()
  assert.throws(() => createThemeManager({ themes: [], root }), TypeError)
  assert.throws(() => createThemeManager({ themes: ['a', 'a'], root }), TypeError)
  assert.throws(() => createThemeManager({ themes: ['a'], modes: [], root }), TypeError)
  assert.throws(
    () => createThemeManager({ themes: ['a'], modes: ['light', 'system'], root }),
    TypeError,
  )
  assert.throws(() => createThemeManager({ themes: ['a'], defaultTheme: 'b', root }), TypeError)
  assert.throws(() => createThemeManager({ themes: ['a'], defaultMode: 'sepia', root }), TypeError)
  assert.throws(() => createThemeManager({ themes: ['a'], root: {} }), TypeError)
  assert.throws(
    () => createThemeManager({ themes: ['a'], root: { setAttribute() {} } }),
    TypeError,
    'root must implement removeAttribute as well',
  )
})

test('root is required for SSR-style usage and can be injected', () => {
  const root = createRoot()
  const manager = createThemeManager({
    themes: ['default'],
    root,
    storage: null,
    matchMedia: null,
    eventTarget: null,
  })
  assert.equal(root.getAttribute('data-theme'), 'default')
  manager.setMode('dark')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')
})

test('supports custom attribute names and maps system mode to missing attribute', () => {
  const root = createRoot()
  const manager = createThemeManager({
    themes: ['default', 'ocean'],
    root,
    storage: null,
    matchMedia: null,
    eventTarget: null,
    themeAttribute: 'data-app-theme',
    modeAttribute: 'data-app-mode',
  })
  assert.equal(root.getAttribute('data-app-theme'), 'default')
  assert.equal(root.getAttribute('data-app-mode'), null)
  manager.setMode('dark')
  assert.equal(root.getAttribute('data-app-mode'), 'dark')
})
