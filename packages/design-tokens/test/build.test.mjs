import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = (path) => join(packageRoot, 'dist', path)
const read = (path) => readFile(dist(path), 'utf8')

const tokensJson = JSON.parse(await read('tokens.json'))
const contract = JSON.parse(await read('contract.json'))
const css = await read('style.css')
const metadata = await import(pathToFileURL(dist('index.js')).href)
const dts = await read('index.d.ts')
const packageJson = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))

const { defaultTheme, modes, defaultMode, modeLabels, primitives, semantic } = tokensJson
const nonDefaultMode = modes.find((mode) => mode !== defaultMode)

const toKebabCase = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

const cssVariableName = (tokenPath) => `--${tokenPath.split('.').map(toKebabCase).join('-')}`

const cssBody = css.slice(css.indexOf('@layer design-tokens {'))
const declaredVariables = [...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])
const referencedVariables = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1])
const namesIn = (text) => [...text.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])

const SECTION = {
  primitive: 'Primitive tokens',
  base: 'Semantic tokens: default theme',
  modeDefault: `Semantic tokens: ${modeLabels[defaultMode].toLowerCase()} color mode (default theme, :root)`,
  modeExplicit: (mode) =>
    `Semantic tokens: ${modeLabels[mode].toLowerCase()} color mode (default theme, :root[data-color-mode="${mode}"])`,
  modeSystem: (mode) =>
    `Semantic tokens: ${modeLabels[mode].toLowerCase()} color mode, system preference`,
}

const section = (startMarker, endMarker) => {
  const start = css.indexOf(startMarker)
  assert.notEqual(start, -1, `Missing CSS section marker: ${startMarker}`)
  const end = endMarker ? css.indexOf(endMarker, start) : css.length
  assert.notEqual(end, -1, `Missing CSS section marker: ${endMarker}`)
  return css.slice(start, end)
}

const CONTRAST_PAIRS = contract.contrast.pairs

const toRgb = (hex) => {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return null
  return value.match(/../g).map((channel) => Number.parseInt(channel, 16) / 255)
}

const relativeLuminance = (hex) => {
  const rgb = toRgb(hex)
  if (!rgb) return null
  const [r, g, b] = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrastRatio = (foreground, background) => {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  if (foregroundLuminance === null || backgroundLuminance === null) {
    throw new Error(`Expected solid hex colors, received "${foreground}" and "${background}"`)
  }
  const [lighter, darker] = [foregroundLuminance, backgroundLuminance].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

/* Package surface ------------------------------------------------------------ */

test('published files exist and the package exports only CSS-first entries', () => {
  for (const file of ['style.css', 'tokens.json', 'contract.json', 'index.js', 'index.d.ts']) {
    assert.ok(existsSync(dist(file)), `Missing dist/${file}`)
  }

  assert.deepEqual(Object.keys(packageJson.exports).sort(), [
    '.',
    './contract.json',
    './package.json',
    './style.css',
    './tokens.json',
  ])
  for (const subpath of ['./style.css', './tokens.json', './contract.json']) {
    const target = packageJson.exports[subpath]
    assert.match(target, /^\.\/dist\//, `${subpath} must point inside dist/`)
    assert.ok(existsSync(join(packageRoot, target)), `${subpath} points at a missing file`)
  }
  assert.deepEqual(packageJson.sideEffects, ['**/*.css'])
  assert.ok(packageJson.files.includes('dist'))
})

/* Layer model ---------------------------------------------------------------- */

test('core ships primitives, semantic tokens and the default theme only', () => {
  assert.equal(defaultTheme, 'default')
  assert.ok(Object.keys(primitives).length > 0)
  assert.ok(Object.keys(semantic[defaultMode]).length > 0)

  // Theme packages select by data-theme; the core stylesheet must not.
  assert.doesNotMatch(cssBody, /\[data-theme=/)
  assert.doesNotMatch(css, /--theme-[\w-]+\s*:/)
  assert.deepEqual(
    Object.keys(semantic[defaultMode]).filter((path) => path.startsWith('theme.')),
    [],
  )
})

test('primitive tokens are emitted once and never themed', () => {
  const primitiveSection = section(SECTION.primitive, SECTION.base)
  for (const path of Object.keys(primitives)) {
    const name = cssVariableName(path)
    assert.ok(primitiveSection.includes(`${name}:`), `Missing primitive token ${name}`)
    assert.equal(css.split(`${name}:`).length - 1, 1, `Primitive token ${name} declared twice`)
  }
  assert.doesNotMatch(css.slice(css.indexOf(SECTION.base)), /--primitive-[\w-]+\s*:/)
})

test('every semantic token is declared for every color mode', () => {
  for (const mode of modes) {
    assert.deepEqual(
      Object.keys(semantic[mode]).sort(),
      Object.keys(semantic[defaultMode]).sort(),
      `Mode ${mode} exposes a different semantic token set`,
    )
  }
})

/* CSS mode strategy ---------------------------------------------------------- */

test('the default theme is emitted for every mode, including the system preference', () => {
  assert.match(css, /@layer design-tokens;/)

  const baseSection = section(SECTION.base, SECTION.modeDefault)
  assert.ok(baseSection.includes('--font-family-sans:'))
  assert.ok(baseSection.includes('--radius-control:'))

  const defaultModeSection = section(SECTION.modeDefault, SECTION.modeExplicit(nonDefaultMode))
  assert.ok(defaultModeSection.includes('--color-bg:'))

  assert.ok(css.includes(`:root[data-color-mode="${nonDefaultMode}"] {`))
  assert.match(css, /@media \(prefers-color-scheme: dark\)/)
  assert.ok(css.includes(SECTION.modeSystem(nonDefaultMode)))
})

test('explicit color modes are never overridden by the system preference', () => {
  const systemSection = section(SECTION.modeSystem(nonDefaultMode), '/* Native UI color scheme')
  // The system block must not apply when the attribute is present, so an explicit light choice
  // survives a dark OS preference and an explicit dark choice survives a light OS preference.
  assert.ok(systemSection.includes(':root:not([data-color-mode])'))
  assert.doesNotMatch(
    systemSection,
    /\[data-color-mode="/,
    'The system block must only target the absent-attribute state',
  )
})

test('explicit and system dark blocks declare the same values', () => {
  const explicit = section(SECTION.modeExplicit(nonDefaultMode), SECTION.modeSystem(nonDefaultMode))
  const system = section(SECTION.modeSystem(nonDefaultMode))
  const explicitNames = new Set(namesIn(explicit))
  const systemNames = new Set(namesIn(system))
  assert.deepEqual([...systemNames].sort(), [...explicitNames].sort())
  for (const name of explicitNames) {
    const explicitValue = explicit.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
    const systemValue = system.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
    assert.equal(systemValue, explicitValue, `System dark value differs for ${name}`)
  }
})

test('CSS output is internally consistent', () => {
  for (const [, blockSelector, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const names = namesIn(declarations)
    assert.equal(
      new Set(names).size,
      names.length,
      `Duplicate declaration in block ${blockSelector.trim()}`,
    )
  }

  const declared = new Set(declaredVariables)
  const missing = [...new Set(referencedVariables)].filter((name) => !declared.has(name))
  assert.deepEqual(missing, [])

  for (const [, value] of css.matchAll(/--[\w-]+:\s*([^;]+);/g)) {
    assert.ok(!/\{[^{}]+\}/.test(value), `Unresolved reference: ${value}`)
  }
})

test('native color-scheme follows the optional mode attribute', () => {
  assert.match(css, /:root \{\s*color-scheme: light dark;/)
  for (const mode of contract.modes) {
    if (!mode.colorScheme) continue
    assert.match(
      css,
      new RegExp(
        `:root\\[data-color-mode="${mode.id}"\\] \\{\\s*color-scheme: ${mode.colorScheme};`,
      ),
    )
  }
})

/* Contract ------------------------------------------------------------------- */

test('contract describes the theme contract and the core token sets', () => {
  assert.equal(contract.version, 1)
  assert.equal(contract.generator, '@ezhana/design-tokens')
  assert.equal(contract.defaultMode, defaultMode)
  assert.deepEqual(
    contract.modes.map((mode) => mode.id),
    modes,
  )
  assert.equal(contract.themeNamespace, 'theme')
  assert.match('cerulean', new RegExp(contract.themeIdPattern))

  assert.deepEqual(contract.required.base, [
    'font.family.sans',
    'font.family.heading',
    'radius.control',
  ])
  assert.deepEqual(contract.required.mode, [
    'color.accent',
    'color.accent-hover',
    'color.on-accent',
    'color.accent-subtle',
    'color.accent-border',
    'color.focus-ring',
  ])

  assert.deepEqual(contract.contrast.pairs, CONTRAST_PAIRS)
  assert.equal(contract.contrast.min, 4.5)

  for (const path of contract.required.base) {
    assert.ok(contract.semanticTokens.base.includes(path), `Missing required base token ${path}`)
  }
  for (const mode of modes) {
    for (const path of contract.required.mode) {
      assert.ok(
        contract.semanticTokens.modes[mode].includes(path),
        `Missing required theme token ${path} in mode ${mode}`,
      )
    }
  }
})

test('contract token sets match the resolved tokens JSON', () => {
  assert.deepEqual(contract.primitiveTokens, Object.keys(primitives).sort())
  for (const mode of modes) {
    const contractPaths = new Set([
      ...contract.semanticTokens.base,
      ...contract.semanticTokens.modes[mode],
    ])
    assert.deepEqual(
      [...contractPaths].sort(),
      Object.keys(semantic[mode]).sort(),
      `Contract and tokens.json disagree for mode ${mode}`,
    )
  }
})

/* Metadata ------------------------------------------------------------------- */

test('generated metadata describes the default theme and tokens', () => {
  assert.equal(metadata.defaultTheme, 'default')
  assert.deepEqual([...metadata.modes], modes)
  assert.deepEqual([...metadata.modes], [...metadata.defaultThemeDefinition.modes])
  assert.equal(metadata.defaultThemeDefinition.id, 'default')
  assert.equal(metadata.modeLabels.light, 'Light')
  assert.equal(metadata.modeLabels.dark, 'Dark')

  const expectedSemantic = Object.keys(semantic[defaultMode]).map(cssVariableName).sort()
  const expectedPrimitive = Object.keys(primitives).map(cssVariableName).sort()
  assert.deepEqual([...metadata.semanticTokenNames], expectedSemantic)
  assert.deepEqual([...metadata.primitiveTokenNames], expectedPrimitive)
  assert.deepEqual([...metadata.tokenNames], [...expectedPrimitive, ...expectedSemantic])

  assert.match(dts, /export type Mode = "light" \| "dark"/)
  assert.match(dts, /export type SemanticTokenName =/)
  assert.match(dts, /ThemeDefinition/)
})

/* Resolved values ------------------------------------------------------------ */

test('resolved values cover typed semantic groups in every mode', () => {
  for (const mode of modes) {
    for (const path of [
      'font.family.sans',
      'font.size.body',
      'radius.control',
      'shadow.glow',
      'color.bg',
      'color.surface-elevated',
      'color.info-subtle',
      'color.danger-solid',
    ]) {
      assert.ok(semantic[mode][path]?.value, `Missing resolved value for ${path} in ${mode}`)
    }
  }

  for (const name of [
    '--color-surface',
    '--color-info',
    '--shadow-lg',
    '--font-size-display',
    '--radius-panel',
  ]) {
    assert.ok(css.includes(`${name}:`), `Missing semantic CSS variable ${name}`)
  }
})

test('resolved JSON has opaque colors for parsing and tooling', () => {
  for (const mode of modes) {
    const colors = Object.entries(semantic[mode]).filter(([, token]) => token.type === 'color')
    assert.ok(colors.length >= 15, `${mode} has too few semantic colors`)
    for (const [path, token] of colors) {
      assert.equal(typeof token.value, 'string', `Expected resolved color for ${path}`)
      assert.ok(!token.value.includes('var('), `Unresolved color for ${path}`)
      assert.ok(!token.value.includes('{'), `Unresolved reference for ${path}`)
    }
  }
})

test('semantic color pairs meet WCAG AA contrast in every color mode', () => {
  for (const mode of modes) {
    for (const [foregroundPath, backgroundPath] of CONTRAST_PAIRS) {
      const foreground = semantic[mode][foregroundPath]?.value
      const background = semantic[mode][backgroundPath]?.value
      assert.ok(
        foreground && background,
        `Missing contrast pair ${foregroundPath}/${backgroundPath}`,
      )
      const ratio = contrastRatio(foreground, background)
      assert.ok(
        ratio >= 4.5,
        `${mode}: ${foregroundPath} on ${backgroundPath} is ${ratio.toFixed(2)}:1, expected >= 4.5`,
      )
    }
  }
})
