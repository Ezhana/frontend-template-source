import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DEFAULT_MODE_ATTRIBUTE,
  DEFAULT_STORAGE_KEY,
  DEFAULT_THEME_ATTRIBUTE,
  SYSTEM_MODE,
  createThemeManager,
} from '../index.js'

const defaultTheme = { id: 'default', label: 'Default', modes: ['light', 'dark'] }
const oceanTheme = { id: 'ocean', label: 'Ocean', modes: ['light', 'dark'] }
const onyxTheme = { id: 'onyx', label: 'Onyx', modes: ['dark'] }

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
    emitStorage(key, newValue) {
      for (const listener of [...(listeners.get('storage') ?? [])]) {
        listener({ key, newValue })
      }
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

  const manager = createThemeManager({
    themes: [defaultTheme, oceanTheme, onyxTheme],
    root,
    storage,
    matchMedia: overrides.matchMedia ?? (() => mql),
    eventTarget,
    ...overrides.options,
  })

  return { manager, root, storage, mql, eventTarget }
}

const collect = (manager) => {
  const states = []
  const unsubscribe = manager.subscribe((state) => states.push(state))
  return { states, unsubscribe }
}

/* Constants ------------------------------------------------------------------ */

test('exports the documented constants', () => {
  assert.equal(DEFAULT_STORAGE_KEY, 'ezhana-theme')
  assert.equal(DEFAULT_THEME_ATTRIBUTE, 'data-theme')
  assert.equal(DEFAULT_MODE_ATTRIBUTE, 'data-color-mode')
  assert.equal(SYSTEM_MODE, 'system')
})

/* Initial state -------------------------------------------------------------- */

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

test('follows the operating-system color mode without writing the attribute', () => {
  const { manager, root, mql } = setup({ mql: createMediaQueryList(true) })

  assert.equal(manager.getState().systemMode, 'dark')
  assert.equal(manager.getState().resolvedMode, 'dark')
  assert.equal(root.getAttribute('data-color-mode'), null)

  mql.emit(false)
  assert.equal(manager.getState().resolvedMode, 'light')
  assert.equal(root.getAttribute('data-color-mode'), null)
})

test('lands on a mode the first theme supports when it is fixed-mode', () => {
  const { manager } = setup({
    options: { themes: [onyxTheme, oceanTheme], matchMedia: null },
  })

  assert.equal(manager.getState().theme, 'onyx')
  assert.equal(manager.getState().mode, SYSTEM_MODE)
  assert.equal(manager.getState().resolvedMode, 'dark')
})

/* Theme and mode changes ----------------------------------------------------- */

test('setTheme applies the attribute and notifies subscribers', () => {
  const { manager, root } = setup()
  const { states, unsubscribe } = collect(manager)

  manager.setTheme('ocean')
  assert.equal(root.getAttribute('data-theme'), 'ocean')
  assert.deepEqual(
    states.map((state) => state.theme),
    ['ocean'],
  )

  unsubscribe()
  manager.setTheme('default')
  assert.equal(states.length, 1)
})

test('setMode writes explicit modes and removes the attribute for system', () => {
  const { manager, root } = setup()

  manager.setMode('dark')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')
  assert.equal(manager.getState().resolvedMode, 'dark')

  manager.setMode('light')
  assert.equal(root.getAttribute('data-color-mode'), 'light')

  manager.setMode(SYSTEM_MODE)
  assert.equal(root.getAttribute('data-color-mode'), null)
})

test('clamps resolvedMode to a mode a fixed-mode theme supports', () => {
  const { manager, root } = setup({ mql: createMediaQueryList(false) })

  manager.setMode('light')
  assert.equal(manager.getState().resolvedMode, 'light')

  manager.setTheme('onyx')
  assert.equal(manager.getState().resolvedMode, 'dark')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')

  manager.setTheme('ocean')
  assert.equal(manager.getState().resolvedMode, 'light')
  assert.equal(root.getAttribute('data-color-mode'), 'light')
  assert.equal(manager.getState().mode, 'light', 'the preference is kept unchanged')
})

test('setTheme and setMode are no-ops when nothing changes', () => {
  const { manager } = setup()
  const { states } = collect(manager)

  manager.setTheme('default')
  manager.setMode(SYSTEM_MODE)
  assert.equal(states.length, 0)
})

/* Persistence ---------------------------------------------------------------- */

test('persists and restores the preference', () => {
  const { manager, storage } = setup()
  manager.setTheme('ocean')
  manager.setMode('dark')

  assert.equal(
    storage.getItem(DEFAULT_STORAGE_KEY),
    JSON.stringify({ theme: 'ocean', mode: 'dark' }),
  )

  const root = createRoot()
  const restored = createThemeManager({
    themes: [defaultTheme, oceanTheme, onyxTheme],
    root,
    storage,
    matchMedia: () => createMediaQueryList(false),
    eventTarget: null,
  })

  assert.equal(restored.getState().theme, 'ocean')
  assert.equal(restored.getState().mode, 'dark')
  assert.equal(root.getAttribute('data-theme'), 'ocean')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')
})

test('ignores invalid stored preferences', () => {
  const storage = createStorage({
    [DEFAULT_STORAGE_KEY]: JSON.stringify({ theme: 'unknown', mode: 'dim' }),
  })
  const { manager } = setup({ storage })

  assert.equal(manager.getState().theme, 'default')
  assert.equal(manager.getState().mode, SYSTEM_MODE)
})

test('storage failures do not break theming', () => {
  const storage = {
    getItem() {
      throw new Error('denied')
    },
    setItem() {
      throw new Error('denied')
    },
  }
  const { manager, root } = setup({ storage })

  manager.setTheme('ocean')
  assert.equal(root.getAttribute('data-theme'), 'ocean')
})

/* Cross-tab sync ------------------------------------------------------------- */

test('applies preferences written by another tab', () => {
  const { manager, eventTarget, root } = setup()

  eventTarget.emitStorage(DEFAULT_STORAGE_KEY, JSON.stringify({ theme: 'ocean', mode: 'dark' }))

  assert.equal(manager.getState().theme, 'ocean')
  assert.equal(manager.getState().mode, 'dark')
  assert.equal(root.getAttribute('data-theme'), 'ocean')
  assert.equal(root.getAttribute('data-color-mode'), 'dark')
})

test('ignores malformed or unrelated storage events', () => {
  const { manager, eventTarget } = setup()
  const before = manager.getState()

  eventTarget.emitStorage('other-key', JSON.stringify({ theme: 'ocean', mode: 'dark' }))
  eventTarget.emitStorage(DEFAULT_STORAGE_KEY, 'not json')
  eventTarget.emitStorage(DEFAULT_STORAGE_KEY, JSON.stringify({ theme: 'nope', mode: 'dark' }))

  assert.equal(manager.getState(), before)
})

/* Lifecycle ------------------------------------------------------------------ */

test('destroy removes listeners and makes setters no-ops', () => {
  const { manager, mql, eventTarget, root } = setup()
  manager.destroy()

  assert.equal(mql.listenerCount, 0)
  assert.equal(eventTarget.listenerCount, 0)

  manager.setTheme('ocean')
  assert.equal(root.getAttribute('data-theme'), 'default')
})

test('works headless with no DOM, storage or media query', () => {
  const manager = createThemeManager({
    themes: [defaultTheme, oceanTheme],
    root: null,
    storage: null,
    matchMedia: null,
    eventTarget: null,
  })

  assert.equal(manager.getState().theme, 'default')
  assert.equal(manager.getState().mode, SYSTEM_MODE)
  assert.equal(manager.getState().systemMode, 'light')

  const { states } = collect(manager)
  manager.setTheme('ocean')
  manager.setMode('dark')
  assert.equal(manager.getState().theme, 'ocean')
  assert.equal(manager.getState().mode, 'dark')
  assert.equal(states.length, 2)
})

test('importing the module performs no DOM access', async () => {
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  delete globalThis.document
  delete globalThis.window
  try {
    const module = await import(`../index.js?no-dom=${Date.now()}`)
    assert.equal(typeof module.createThemeManager, 'function')
  } finally {
    if (originalDocument !== undefined) globalThis.document = originalDocument
    if (originalWindow !== undefined) globalThis.window = originalWindow
  }
})

/* Validation ----------------------------------------------------------------- */

test('rejects invalid options', () => {
  assert.throws(() => createThemeManager(), TypeError)
  assert.throws(() => createThemeManager({}), /themes/)
  assert.throws(() => createThemeManager({ themes: [] }), /non-empty/)
  assert.throws(
    () => createThemeManager({ themes: [defaultTheme, defaultTheme] }),
    /listed more than once/,
  )
  assert.throws(
    () => createThemeManager({ themes: [defaultTheme], defaultTheme: 'nope' }),
    /defaultTheme/,
  )
  assert.throws(
    () => createThemeManager({ themes: [defaultTheme], defaultMode: 'dim' }),
    /defaultMode/,
  )
  assert.throws(() => createThemeManager({ themes: [defaultTheme], storage: {} }), /storage/)
  assert.throws(() => createThemeManager({ themes: [{ id: 'x', label: 'X', modes: [] }] }), /modes/)
  assert.throws(
    () => createThemeManager({ themes: [{ id: 'x', label: 'X', modes: ['system'] }] }),
    /reserved/,
  )
})

test('rejects invalid values passed to setters', () => {
  const { manager } = setup()
  assert.throws(() => manager.setTheme('nope'), RangeError)
  assert.throws(() => manager.setMode('dim'), RangeError)
  assert.throws(() => manager.subscribe('nope'), TypeError)
})
