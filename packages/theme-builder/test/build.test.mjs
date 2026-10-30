import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildTheme, contrastRatio, defineTheme } from '../index.js'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const fixtureDir = join(packageRoot, 'test', 'fixtures', 'theme')
const fixtureConfig = join(fixtureDir, 'theme.config.mjs')

const tempDirs = []
const createTempDir = async () => {
  const dir = await mkdtemp(join(packageRoot, 'test', '.tmp-'))
  tempDirs.push(dir)
  return dir
}

after(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
})

const read = async (path) => readFile(path, 'utf8')

/** Build the fixture theme with a config override and return the artifact contents. */
const buildFixture = async (overrides = {}) => {
  const config = defineTheme({
    id: 'fixture',
    label: 'Fixture',
    description: 'Theme used by the theme-builder test suite.',
    tokens: ['tokens/palette.json'],
    overrides: 'tokens/theme.json',
    fonts: ['@fontsource-variable/public-sans'],
    ...overrides,
  })
  const result = await buildTheme(config, { cwd: fixtureDir })
  const [css, standaloneCss, style, metadata, types, json] = await Promise.all([
    read(result.outputs.css),
    read(result.outputs.standaloneCss),
    read(result.outputs.style),
    read(result.outputs.metadata),
    read(result.outputs.types),
    read(result.outputs.json),
  ])
  return { result, css, standaloneCss, style, metadata, types, json: JSON.parse(json) }
}

const writeTree = async (dir, files) => {
  for (const [name, value] of Object.entries(files)) {
    await writeFile(join(dir, name), typeof value === 'string' ? value : JSON.stringify(value))
  }
}

/* -------------------------------------------------------------------------- */
/* Build output                                                                */
/* -------------------------------------------------------------------------- */

test('builds a theme package from a config file', async () => {
  const result = await buildTheme(fixtureConfig)

  assert.equal(result.id, 'fixture')
  assert.equal(result.label, 'Fixture')
  assert.equal(result.cwd, fixtureDir)
  assert.deepEqual(Object.keys(result.outputs).sort(), [
    'css',
    'json',
    'metadata',
    'standaloneCss',
    'style',
    'types',
  ])
  for (const output of Object.values(result.outputs)) {
    assert.match(await read(output), /./, `Expected ${output} to have content`)
  }
})

test('theme CSS only overrides semantic tokens, selected by :root[data-theme]', async () => {
  const { css } = await buildFixture()

  assert.match(css, /@layer design-tokens;/)
  assert.match(css, /^ {2}:root\[data-theme="fixture"\] \{$/m)
  assert.match(css, /^ {2}:root\[data-theme="fixture"\]\[data-color-mode="dark"\] \{$/m)
  assert.match(
    css,
    /@media \(prefers-color-scheme: dark\) \{\n {4}:root\[data-theme="fixture"\]:not\(\[data-color-mode\]\) \{/,
  )

  // Theme CSS must never depend on load order, so every selector is :root-prefixed.
  assert.doesNotMatch(css, /^ {2}\[data-theme="fixture"\]/m)

  // Theme-private material never becomes a CSS custom property.
  assert.doesNotMatch(css, /--theme-[\w-]+\s*:/)
  assert.doesNotMatch(css, /--primitive-[\w-]+\s*:/)

  // No unresolved references and no duplicate declarations inside a block.
  assert.doesNotMatch(css, /--[\w-]+:\s*[^;]*\{[^{}]+\}/)
  for (const [, declarations] of css.matchAll(/\{([^{}]*)\}/g)) {
    const names = [...declarations.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])
    assert.equal(new Set(names).size, names.length, `Duplicate declaration in: ${declarations}`)
  }

  // Values are resolved: a theme cannot reference core primitives in the output.
  assert.doesNotMatch(css, /var\(--primitive-/)
})

test('the base block carries the contract and the default mode values', async () => {
  const { css } = await buildFixture()
  const baseBlock = css.slice(
    css.indexOf(':root[data-theme="fixture"] {'),
    css.indexOf('/* Theme "fixture": dark'),
  )

  for (const name of [
    '--font-family-sans',
    '--font-family-heading',
    '--radius-control',
    '--color-accent',
    '--color-accent-hover',
    '--color-on-accent',
    '--color-accent-subtle',
    '--color-accent-border',
    '--color-focus-ring',
  ]) {
    assert.ok(baseBlock.includes(`${name}:`), `Missing ${name} in the base block`)
  }

  assert.match(baseBlock, /--color-accent: #007ba7;/)
  assert.match(baseBlock, /--color-on-accent: #ffffff;/)
  assert.match(baseBlock, /--radius-control: 0\.5rem;/)
})

test('every non-default mode gets an explicit and a system-preference block', async () => {
  const { css, json } = await buildFixture()
  const darkBlocks = [...css.matchAll(/--color-accent: ([^;]+);/g)].map((match) => match[1])

  assert.deepEqual(json.modes, ['light', 'dark'])
  assert.equal(json.defaultMode, 'light')
  // light values on the base selector, then dark explicit, then dark system preference.
  assert.deepEqual(darkBlocks, ['#007ba7', '#7ac6e2', '#7ac6e2'])
})

test('standalone CSS embeds the core stylesheet and the theme overrides', async () => {
  const { standaloneCss } = await buildFixture()

  assert.match(standaloneCss, /@ezhana\/design-tokens — generated core CSS custom properties/)
  assert.match(standaloneCss, /:root\[data-theme="fixture"\]/)
  assert.ok(
    standaloneCss.indexOf('--primitive-color-neutral-0') <
      standaloneCss.indexOf(':root[data-theme="fixture"]'),
    'Core stylesheet must come before the theme overrides',
  )
})

test('style entry loads core CSS, fonts and the theme overrides', async () => {
  const { style } = await buildFixture()
  const imports = [...style.matchAll(/^import '([^']+)'$/gm)].map((match) => match[1])

  assert.deepEqual(imports, [
    '@ezhana/design-tokens/css/tokens.css',
    '@fontsource-variable/public-sans',
    './css/theme.css',
  ])
})

test('metadata exposes a ThemeDefinition with literal types', async () => {
  const { metadata, types } = await buildFixture()

  assert.match(metadata, /export const themeId = "fixture"/)
  assert.match(metadata, /export const themeLabel = "Fixture"/)
  assert.match(metadata, /export const modes = Object\.freeze\(\["light","dark"\]\)/)
  assert.match(metadata, /export const theme = Object\.freeze\(\{/)

  assert.match(types, /export type ThemeId = "fixture"/)
  assert.match(types, /export type ThemeMode = "light" \| "dark"/)
  assert.match(types, /readonly id: ThemeId/)
  assert.match(types, /readonly label: "Fixture"/)
  assert.match(types, /readonly modes: readonly ThemeMode\[\]/)
})

test('theme JSON contains resolved values for every mode', async () => {
  const { json } = await buildFixture()

  assert.equal(json.generator, '@ezhana/theme-builder')
  assert.equal(json.version, 1)
  assert.deepEqual(json.theme, {
    id: 'fixture',
    label: 'Fixture',
    description: 'Theme used by the theme-builder test suite.',
  })

  for (const mode of json.modes) {
    assert.equal(json.overrides[mode]['color.accent'].value.startsWith('#'), true)
    assert.equal(json.resolved[mode]['color.accent'].value.startsWith('#'), true)
    assert.equal(json.resolved[mode]['color.bg'].value.startsWith('#'), true)
    assert.equal(json.resolved[mode]['font.family.sans'].value.includes('Fixture Sans'), true)
  }

  assert.ok(contrastRatio(json.resolved.light['color.on-accent'].value, '#007ba7') >= 4.5)
})

test('a theme without fonts still gets a valid style entry', async () => {
  const { style } = await buildFixture({ fonts: [] })

  assert.deepEqual(
    [...style.matchAll(/^import '([^']+)'$/gm)].map((match) => match[1]),
    ['@ezhana/design-tokens/css/tokens.css', './css/theme.css'],
  )
})

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

test('rejects a theme that misses a required contract token', async () => {
  const dir = await createTempDir()
  await writeTree(dir, {
    'theme.json': JSON.stringify({
      base: {
        font: {
          family: {
            sans: { $value: 'system-ui, sans-serif', $type: 'fontFamily' },
            heading: { $value: 'system-ui, sans-serif', $type: 'fontFamily' },
          },
        },
        radius: { control: { $value: '0.5rem', $type: 'dimension' } },
      },
      light: {
        color: {
          accent: { $value: '#007ba7', $type: 'color' },
          'accent-hover': { $value: '#00688f', $type: 'color' },
          'on-accent': { $value: '#ffffff', $type: 'color' },
          'accent-subtle': { $value: '#007ba71a', $type: 'color' },
          'accent-border': { $value: '#007ba780', $type: 'color' },
        },
      },
      dark: {
        color: {
          accent: { $value: '#7ac6e2', $type: 'color' },
          'accent-hover': { $value: '#eef8fc', $type: 'color' },
          'on-accent': { $value: '#0b0b0f', $type: 'color' },
          'accent-subtle': { $value: '#7ac6e226', $type: 'color' },
          'accent-border': { $value: '#7ac6e280', $type: 'color' },
          'focus-ring': { $value: '#7ac6e2', $type: 'color' },
        },
      },
    }),
  })

  await assert.rejects(
    buildTheme(
      {
        id: 'fixture',
        label: 'Fixture',
        overrides: join(dir, 'theme.json'),
      },
      { cwd: fixtureDir },
    ),
    /color\.focus-ring/,
  )
})

test('rejects overriding a token that is not part of the semantic contract', async () => {
  const dir = await createTempDir()
  await writeTree(dir, {
    'theme.json': JSON.stringify({
      base: {
        font: {
          family: {
            sans: { $value: 'system-ui, sans-serif', $type: 'fontFamily' },
            heading: { $value: 'system-ui, sans-serif', $type: 'fontFamily' },
          },
        },
        radius: { control: { $value: '0.5rem', $type: 'dimension' } },
      },
      light: {
        color: {
          accent: { $value: '#007ba7', $type: 'color' },
          'accent-hover': { $value: '#00688f', $type: 'color' },
          'on-accent': { $value: '#ffffff', $type: 'color' },
          'accent-subtle': { $value: '#007ba71a', $type: 'color' },
          'accent-border': { $value: '#007ba780', $type: 'color' },
          'focus-ring': { $value: '#007ba7', $type: 'color' },
          brand: { $value: '#007ba7', $type: 'color' },
        },
      },
      dark: {
        color: {
          accent: { $value: '#7ac6e2', $type: 'color' },
          'accent-hover': { $value: '#eef8fc', $type: 'color' },
          'on-accent': { $value: '#0b0b0f', $type: 'color' },
          'accent-subtle': { $value: '#7ac6e226', $type: 'color' },
          'accent-border': { $value: '#7ac6e280', $type: 'color' },
          'focus-ring': { $value: '#7ac6e2', $type: 'color' },
        },
      },
    }),
  })

  await assert.rejects(
    buildTheme(
      {
        id: 'fixture',
        label: 'Fixture',
        overrides: join(dir, 'theme.json'),
      },
      { cwd: fixtureDir },
    ),
    /color\.brand/,
  )
})

test('rejects a local token outside the theme namespace', async () => {
  const dir = await createTempDir()
  await writeTree(dir, {
    'palette.json': JSON.stringify({ brand: { accent: { $value: '#007ba7', $type: 'color' } } }),
  })

  await assert.rejects(
    buildTheme(
      {
        id: 'fixture',
        label: 'Fixture',
        tokens: [join(dir, 'palette.json')],
        overrides: join(fixtureDir, 'tokens', 'theme.json'),
      },
      { cwd: fixtureDir },
    ),
    /theme\./,
  )
})

test('rejects references to unknown primitives and to semantic tokens', async () => {
  const fixtureTheme = JSON.parse(await read(join(fixtureDir, 'tokens', 'theme.json')))

  const unknownPrimitive = await createTempDir()
  const unknownPrimitiveTheme = structuredClone(fixtureTheme)
  unknownPrimitiveTheme.base.font.family.sans.$value = '{primitive.font.family.nope}'
  await writeTree(unknownPrimitive, { 'theme.json': JSON.stringify(unknownPrimitiveTheme) })

  await assert.rejects(
    buildTheme(
      {
        id: 'fixture',
        label: 'Fixture',
        tokens: [join(fixtureDir, 'tokens', 'palette.json')],
        overrides: join(unknownPrimitive, 'theme.json'),
      },
      { cwd: fixtureDir },
    ),
    /unknown core primitive token/,
  )

  const semanticReference = await createTempDir()
  const semanticReferenceTheme = structuredClone(fixtureTheme)
  semanticReferenceTheme.light.color.accent.$value = '{color.bg}'
  await writeTree(semanticReference, {
    'theme.json': JSON.stringify(semanticReferenceTheme),
    'palette.json': await read(join(fixtureDir, 'tokens', 'palette.json')),
  })

  await assert.rejects(
    buildTheme(
      {
        id: 'fixture',
        label: 'Fixture',
        tokens: [join(semanticReference, 'palette.json')],
        overrides: join(semanticReference, 'theme.json'),
      },
      { cwd: fixtureDir },
    ),
    /may only reference core primitive tokens/,
  )
})

test('rejects a contrast failure and reports the measured ratio', async () => {
  const dir = await createTempDir()
  const themeJson = JSON.parse(await read(join(fixtureDir, 'tokens', 'theme.json')))
  themeJson.light.color.accent = { $value: '#ff0000', $type: 'color' }
  themeJson.light.color['focus-ring'] = { $value: '#ff0000', $type: 'color' }
  await writeTree(dir, {
    'theme.json': JSON.stringify(themeJson),
    'palette.json': await read(join(fixtureDir, 'tokens', 'palette.json')),
  })

  await assert.rejects(
    buildTheme(
      {
        id: 'fixture',
        label: 'Fixture',
        tokens: [join(dir, 'palette.json')],
        overrides: join(dir, 'theme.json'),
      },
      { cwd: fixtureDir },
    ),
    /WCAG|contrast/i,
  )
})

/* -------------------------------------------------------------------------- */
/* Configuration                                                               */
/* -------------------------------------------------------------------------- */

test('defineTheme normalizes defaults and freezes the result', () => {
  const config = defineTheme({
    id: 'ocean',
    label: 'Ocean',
    overrides: 'tokens/theme.json',
  })

  assert.deepEqual(config.tokens, [])
  assert.deepEqual(config.fonts, [])
  assert.deepEqual(config.contrast, { pairs: [], min: 4.5 })
  assert.ok(Object.isFrozen(config))
})

test('defineTheme rejects invalid configurations', () => {
  assert.throws(() => defineTheme(undefined), TypeError)
  assert.throws(() => defineTheme({ label: 'Ocean', overrides: 'x' }), /id/)
  assert.throws(() => defineTheme({ id: 'Ocean', label: 'Ocean', overrides: 'x' }), /id/)
  assert.throws(() => defineTheme({ id: 'ocean', overrides: 'x' }), /label/)
  assert.throws(() => defineTheme({ id: 'ocean', label: 'Ocean' }), /overrides/)
  assert.throws(
    () => defineTheme({ id: 'ocean', label: 'Ocean', overrides: 'x', tokens: 'tokens' }),
    /tokens/,
  )
  assert.throws(
    () =>
      defineTheme({
        id: 'ocean',
        label: 'Ocean',
        overrides: 'x',
        contrast: { pairs: [['color.accent']] },
      }),
    /contrast\.pairs/,
  )
  assert.throws(
    () => defineTheme({ id: 'ocean', label: 'Ocean', overrides: 'x', contrast: { min: 30 } }),
    /contrast\.min/,
  )
  assert.throws(
    () => defineTheme({ id: 'ocean', label: 'Ocean', overrides: 'x', font: ['Inter'] }),
    /unknown option `font`/,
  )
  assert.throws(
    () => defineTheme({ id: 'ocean', label: 'Ocean', overrides: 'x', outputDir: 'build' }),
    /unknown option `outputDir`/,
  )
})

test('contrastRatio implements WCAG 2.2', () => {
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(2), '21.00')
  assert.equal(contrastRatio('#ffffff', '#ffffff').toFixed(2), '1.00')
  assert.ok(contrastRatio('#007ba7', '#ffffff') >= 4.5)
})

/* -------------------------------------------------------------------------- */
/* Mode isolation                                                              */
/* -------------------------------------------------------------------------- */

/** Parse `--var: value;` declarations per rule of the theme stylesheet, in document order. */
const parseRules = (css) => {
  const rules = []
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [, selector, body] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = Object.fromEntries(
      [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
    )
    rules.push({ selector: selector.trim(), declarations })
  }
  return rules
}

const findRule = (rules, selectorStart) => {
  const rule = rules.find((candidate) => candidate.selector.startsWith(selectorStart))
  assert.ok(rule, `Missing CSS rule starting with "${selectorStart}"`)
  return rule
}

const toKebabCase = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

const cssVariableName = (path) => `--${path.split('.').map(toKebabCase).join('-')}`

test('a default-mode-only override does not leak into the other modes', async () => {
  const themeJson = JSON.parse(await read(join(fixtureDir, 'tokens', 'theme.json')))
  // Override a mode-varying token in the default mode only. This used to be emitted on the
  // unconditional base selector, so it applied to dark mode too.
  themeJson.light.shadow = {
    sm: { $value: '0 2px 4px rgb(0 0 0 / 0.2)', $type: 'string' },
  }

  const dir = await createTempDir()
  await writeTree(dir, { 'theme.json': JSON.stringify(themeJson) })

  const { css, json } = await buildFixture({ overrides: join(dir, 'theme.json') })
  const rules = parseRules(css)

  const base = findRule(rules, ':root[data-theme="fixture"]')
  const explicitDark = findRule(rules, ':root[data-theme="fixture"][data-color-mode="dark"]')
  const systemDark = findRule(rules, ':root[data-theme="fixture"]:not([data-color-mode])')

  assert.equal(base.declarations['--shadow-sm'], '0 2px 4px rgb(0 0 0 / 0.2)')
  // The dark blocks must pin the dark value instead of inheriting the base (light) value.
  assert.equal(explicitDark.declarations['--shadow-sm'], json.resolved.dark['shadow.sm'].value)
  assert.equal(systemDark.declarations['--shadow-sm'], json.resolved.dark['shadow.sm'].value)
  assert.notEqual(json.resolved.dark['shadow.sm'].value, '0 2px 4px rgb(0 0 0 / 0.2)')
  assert.equal(json.resolved.light['shadow.sm'].value, '0 2px 4px rgb(0 0 0 / 0.2)')
})

test('every emitted declaration equals the resolved JSON value for that mode', async () => {
  const { css, json } = await buildFixture()
  const rules = parseRules(css)

  const expected = (mode) => {
    const map = new Map()
    for (const [path, token] of Object.entries(json.resolved[mode])) {
      map.set(cssVariableName(path), String(token.value))
    }
    return map
  }

  const base = findRule(rules, ':root[data-theme="fixture"]')
  const lightValues = expected('light')
  for (const [name, value] of Object.entries(base.declarations)) {
    assert.equal(value, lightValues.get(name), `CSS ${name} disagrees with resolved light value`)
  }

  const dark = findRule(rules, ':root[data-theme="fixture"][data-color-mode="dark"]')
  const darkValues = expected('dark')
  for (const [name, value] of Object.entries(dark.declarations)) {
    assert.equal(value, darkValues.get(name), `CSS ${name} disagrees with resolved dark value`)
  }
})

/* -------------------------------------------------------------------------- */
/* Build environment                                                           */
/* -------------------------------------------------------------------------- */

test('writes artifacts to the package dist/ directory only', async () => {
  const { result } = await buildFixture()

  for (const output of Object.values(result.outputs)) {
    assert.ok(
      output.startsWith(join(fixtureDir, 'dist') + '/'),
      `Expected ${output} to live under ${fixtureDir}/dist`,
    )
  }
  assert.equal(result.contractVersion, 1)
})

test('requires a theme package directory', async () => {
  const dir = await createTempDir()

  await assert.rejects(
    buildTheme(
      {
        id: 'fixture',
        label: 'Fixture',
        tokens: [join(fixtureDir, 'tokens', 'palette.json')],
        overrides: join(fixtureDir, 'tokens', 'theme.json'),
      },
      { cwd: dir },
    ),
    /has no package\.json/,
  )
})

test('requires @ezhana/design-tokens to be declared by the theme package', async () => {
  const dir = await createTempDir()
  await writeTree(dir, {
    'package.json': JSON.stringify({ name: 'theme-without-core', type: 'module' }),
  })

  await assert.rejects(
    buildTheme(
      {
        id: 'fixture',
        label: 'Fixture',
        tokens: [join(fixtureDir, 'tokens', 'palette.json')],
        overrides: join(fixtureDir, 'tokens', 'theme.json'),
      },
      { cwd: dir },
    ),
    /does not declare @ezhana\/design-tokens/,
  )
})

test('rejects font entries that do not resolve from the theme package', async () => {
  await assert.rejects(
    buildFixture({ fonts: ['@fontsource-variable/does-not-exist'] }),
    /cannot be resolved from/,
  )
})

test('default contrast pairs cover the pairs the core package publishes', async () => {
  const { DEFAULT_CONTRAST_PAIRS } = await import('../index.js')
  const key = (pair) => pair.join('|')
  const defaults = new Set(DEFAULT_CONTRAST_PAIRS.map(key))

  for (const pair of [
    ['color.on-accent', 'color.accent'],
    ['color.on-danger', 'color.danger'],
    ['color.fg-strong', 'color.bg-subtle'],
    ['color.accent', 'color.bg'],
  ]) {
    assert.ok(defaults.has(key(pair)), `Missing default contrast pair ${key(pair)}`)
  }

  // The build consumes the pairs published in the core contract as well.
  const contract = JSON.parse(
    await read(join(packageRoot, '..', 'design-tokens', 'dist', 'json', 'contract.json')),
  )
  for (const pair of contract.contrast.pairs) {
    assert.ok(Array.isArray(pair) && pair.length === 2, `Invalid contract contrast pair ${pair}`)
  }
  assert.equal(contract.contrast.min, 4.5)
})

/* -------------------------------------------------------------------------- */
/* Core contract compatibility                                                 */
/* -------------------------------------------------------------------------- */

test('rejects a core contract version this builder does not understand', async () => {
  const dir = await createTempDir()
  const packageDir = join(dir, 'node_modules', '@ezhana', 'design-tokens')
  await mkdir(join(packageDir, 'dist', 'json'), { recursive: true })
  await mkdir(join(packageDir, 'dist', 'css'), { recursive: true })
  await writeFile(
    join(packageDir, 'package.json'),
    `${JSON.stringify({
      name: '@ezhana/design-tokens',
      version: '99.0.0',
      type: 'module',
      exports: {
        './contract': './dist/json/contract.json',
        './json': './dist/json/core.json',
        './css/tokens.css': './dist/css/tokens.css',
        './package.json': './package.json',
      },
    })}\n`,
  )
  await writeFile(
    join(packageDir, 'dist', 'json', 'contract.json'),
    `${JSON.stringify({
      version: 99,
      generator: '@ezhana/design-tokens',
      modes: [{ id: 'light', label: 'Light' }],
      defaultMode: 'light',
      required: { base: [], mode: [] },
      semanticTokens: { base: [], modes: { light: [] } },
      primitiveTokens: [],
      themeNamespace: 'theme',
      themeIdPattern: '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
    })}\n`,
  )
  await writeFile(
    join(packageDir, 'dist', 'json', 'core.json'),
    `${JSON.stringify({ primitives: {}, semantic: { light: {} } })}\n`,
  )
  await writeFile(join(packageDir, 'dist', 'css', 'tokens.css'), ':root {}\n')
  await writeTree(dir, {
    'package.json': JSON.stringify({
      name: 'theme-built-against-a-newer-contract',
      type: 'module',
      dependencies: { '@ezhana/design-tokens': 'workspace:*' },
    }),
  })

  await assert.rejects(
    buildTheme(
      {
        id: 'fixture',
        label: 'Fixture',
        tokens: [join(fixtureDir, 'tokens', 'palette.json')],
        overrides: join(fixtureDir, 'tokens', 'theme.json'),
      },
      { cwd: dir },
    ),
    /contract version 99 is not supported/,
  )
})

test('reports a missing core build with an actionable message', async () => {
  const dir = await createTempDir()
  const packageDir = join(dir, 'node_modules', '@ezhana', 'design-tokens')
  await mkdir(packageDir, { recursive: true })
  await writeFile(
    join(packageDir, 'package.json'),
    `${JSON.stringify({
      name: '@ezhana/design-tokens',
      version: '0.0.0',
      exports: {
        './contract': './dist/json/contract.json',
        './json': './dist/json/core.json',
        './css/tokens.css': './dist/css/tokens.css',
        './package.json': './package.json',
      },
    })}\n`,
  )
  await writeTree(dir, {
    'package.json': JSON.stringify({
      name: 'theme-without-a-core-build',
      type: 'module',
      dependencies: { '@ezhana/design-tokens': 'workspace:*' },
    }),
  })

  await assert.rejects(
    buildTheme(
      {
        id: 'fixture',
        label: 'Fixture',
        tokens: [join(fixtureDir, 'tokens', 'palette.json')],
        overrides: join(fixtureDir, 'tokens', 'theme.json'),
      },
      { cwd: dir },
    ),
    /generated artifacts are missing/,
  )
})
