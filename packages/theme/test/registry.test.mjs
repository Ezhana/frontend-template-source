import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createThemeManager, defineThemeRegistry } from '../index.js'

const DEFAULT_DEFINITION = Object.freeze({
  id: 'default',
  label: 'Default',
  modes: Object.freeze(['light', 'dark']),
})

const OCEAN_DEFINITION = Object.freeze({
  id: 'ocean',
  label: 'Ocean',
  modes: Object.freeze(['light', 'dark']),
})

const CERULEAN_DEFINITION = Object.freeze({
  id: 'cerulean',
  label: 'Cerulean',
  modes: Object.freeze(['light', 'dark']),
})

/* -------------------------------------------------------------------------- */
/* Registry shape                                                              */
/* -------------------------------------------------------------------------- */

test('merges theme definitions into registry metadata', () => {
  const registry = defineThemeRegistry([DEFAULT_DEFINITION, OCEAN_DEFINITION, CERULEAN_DEFINITION])

  assert.deepEqual(registry.themes, ['default', 'ocean', 'cerulean'])
  assert.deepEqual(registry.themeLabels, {
    default: 'Default',
    ocean: 'Ocean',
    cerulean: 'Cerulean',
  })
  assert.equal(registry.defaultTheme, 'default')
  assert.deepEqual(registry.modes, ['light', 'dark'])
  assert.deepEqual(registry.themeModes, {
    default: ['light', 'dark'],
    ocean: ['light', 'dark'],
    cerulean: ['light', 'dark'],
  })
})

test('the registry is frozen and keeps the declaration order', () => {
  const registry = defineThemeRegistry([CERULEAN_DEFINITION, DEFAULT_DEFINITION])

  assert.ok(Object.isFrozen(registry))
  assert.ok(Object.isFrozen(registry.themes))
  assert.ok(Object.isFrozen(registry.themeLabels))
  assert.ok(Object.isFrozen(registry.modes))
  assert.ok(Object.isFrozen(registry.themeModes))
  assert.deepEqual(registry.themes, ['cerulean', 'default'])
  assert.equal(registry.defaultTheme, 'cerulean')
})

test('accepts an explicit default theme', () => {
  const registry = defineThemeRegistry([DEFAULT_DEFINITION, OCEAN_DEFINITION], {
    defaultTheme: 'ocean',
  })

  assert.equal(registry.defaultTheme, 'ocean')
})

test('derives the shared color mode list from the definitions', () => {
  const registry = defineThemeRegistry([
    { id: 'default', label: 'Default', modes: ['light', 'dark', 'dim'] },
    { id: 'ocean', label: 'Ocean', modes: ['dim', 'light', 'dark'] },
  ])

  assert.deepEqual([...registry.modes].sort(), ['dark', 'dim', 'light'])
})

test('feeds createThemeManager directly', () => {
  const registry = defineThemeRegistry([DEFAULT_DEFINITION, OCEAN_DEFINITION])
  const attributes = new Map()
  const manager = createThemeManager({
    themes: [...registry.themes],
    modes: [...registry.modes],
    defaultTheme: registry.defaultTheme,
    root: {
      setAttribute(name, value) {
        attributes.set(name, value)
      },
      removeAttribute(name) {
        attributes.delete(name)
      },
    },
    storage: null,
    matchMedia: null,
    eventTarget: null,
  })

  assert.equal(manager.getState().theme, 'default')

  manager.setTheme(registry.themes[1])
  assert.equal(attributes.get('data-theme'), 'ocean')
})

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

test('rejects empty and non-array definitions', () => {
  assert.throws(() => defineThemeRegistry([]), TypeError)
  assert.throws(() => defineThemeRegistry(undefined), TypeError)
  assert.throws(() => defineThemeRegistry('default'), TypeError)
})

test('rejects invalid ids, labels and duplicate ids', () => {
  assert.throws(() => defineThemeRegistry([{ id: 'Ocean', label: 'Ocean', modes: ['light'] }]), {
    name: 'TypeError',
    message: /theme id/,
  })
  assert.throws(
    () => defineThemeRegistry([{ id: '', label: 'Empty', modes: ['light'] }]),
    TypeError,
  )
  assert.throws(
    () => defineThemeRegistry([{ id: 'ocean', label: '', modes: ['light'] }]),
    TypeError,
  )
  assert.throws(
    () =>
      defineThemeRegistry([
        { id: 'ocean', label: 'Ocean', modes: ['light'] },
        { id: 'ocean', label: 'Ocean again', modes: ['light'] },
      ]),
    { name: 'TypeError', message: /more than once/ },
  )
})

test('rejects definitions without modes and with duplicate modes', () => {
  assert.throws(() => defineThemeRegistry([{ id: 'ocean', label: 'Ocean' }]), TypeError)
  assert.throws(() => defineThemeRegistry([{ id: 'ocean', label: 'Ocean', modes: [] }]), {
    name: 'TypeError',
    message: /modes/,
  })
  assert.throws(
    () => defineThemeRegistry([{ id: 'ocean', label: 'Ocean', modes: ['light', 'light'] }]),
    { name: 'TypeError', message: /more than once/ },
  )
})

test('accepts themes with different supported color modes', () => {
  const registry = defineThemeRegistry([
    { id: 'default', label: 'Default', modes: ['light', 'dark'] },
    { id: 'quest', label: 'Quest', modes: ['dark'] },
    { id: 'abyss', label: 'Abyss', modes: ['dim', 'dark'] },
  ])

  assert.deepEqual(registry.themes, ['default', 'quest', 'abyss'])
  // `modes` is the union of every declared list in first-seen order.
  assert.deepEqual(registry.modes, ['light', 'dark', 'dim'])
  assert.deepEqual(registry.themeModes, {
    default: ['light', 'dark'],
    quest: ['dark'],
    abyss: ['dim', 'dark'],
  })
  assert.ok(Object.isFrozen(registry.themeModes))
  assert.ok(Object.isFrozen(registry.themeModes.default))
  assert.ok(Object.isFrozen(registry.themeModes.quest))
  assert.ok(Object.isFrozen(registry.themeModes.abyss))
  assert.ok(Object.isFrozen(registry.modes))
})

test('rejects the reserved system mode', () => {
  assert.throws(
    () => defineThemeRegistry([{ id: 'ocean', label: 'Ocean', modes: ['light', 'system'] }]),
    { name: 'TypeError', message: /reserved mode/ },
  )
})

test('rejects an unknown default theme', () => {
  assert.throws(() => defineThemeRegistry([DEFAULT_DEFINITION], { defaultTheme: 'ocean' }), {
    name: 'TypeError',
    message: /defaultTheme/,
  })
})
