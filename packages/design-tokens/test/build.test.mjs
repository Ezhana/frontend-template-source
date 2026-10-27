import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = (path) => join(packageRoot, 'dist', path)

const themesJson = JSON.parse(await readFile(dist('json/themes.json'), 'utf8'))
const css = await readFile(dist('css/tokens.css'), 'utf8')
const js = await readFile(dist('js/index.js'), 'utf8')
const dts = await readFile(dist('js/index.d.ts'), 'utf8')

const THEMES = themesJson.resolved
const THEME_IDS = themesJson.themes
const MODES = themesJson.modes
const DEFAULT_THEME = themesJson.defaultTheme
const DEFAULT_MODE = MODES.includes('light') ? 'light' : MODES[0]
const DARK_MODE = MODES.includes('dark') ? 'dark' : MODES.find((mode) => mode !== DEFAULT_MODE)

const toKebabCase = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

const cssVariableName = (tokenPath) => `--${tokenPath.split('.').map(toKebabCase).join('-')}`

const tokenPaths = (theme) => Object.keys(theme)
const isPrimitivePath = (path) => path.startsWith('primitive.')
const isSemanticPath = (path) => !isPrimitivePath(path)

const themeTokens = (filter) => tokenPaths(THEMES[DEFAULT_THEME][DEFAULT_MODE]).filter(filter)

const expectEachTheme = (assertion) => {
  for (const theme of THEME_IDS) {
    for (const mode of MODES) {
      assertion(THEMES[theme][mode], `${theme}/${mode}`)
    }
  }
}

const NAMED_THEME_IDS = THEME_IDS.filter((theme) => theme !== DEFAULT_THEME)

const MODE_LABELS = { light: 'light', dark: 'dark' }
const SECTION_MARKERS = {
  primitive: 'Primitive tokens',
  base: 'Semantic tokens: default theme',
  modeDefault: `Semantic tokens: ${MODE_LABELS[DEFAULT_MODE]} color mode (default theme, :root base values)`,
  modeExplicit: (mode) =>
    `Semantic tokens: ${MODE_LABELS[mode]} color mode (default theme, data-color-mode="${mode}")`,
  modeSystem: (mode) => `Semantic tokens: ${MODE_LABELS[mode]} color mode, system preference`,
  themeBase: (theme) => `Theme overrides: ${theme} (base + ${MODE_LABELS[DEFAULT_MODE]})`,
  themeExplicit: (theme, mode) => `Theme overrides: ${theme} × ${mode} (explicit)`,
  themeSystem: (theme, mode) => `Theme overrides: ${theme} × ${mode} (system preference)`,
}

const section = (startMarker, endMarker) => {
  const start = css.indexOf(startMarker)
  assert.notEqual(start, -1, `Missing CSS section marker: ${startMarker}`)
  const end = endMarker ? css.indexOf(endMarker, start) : css.length
  assert.notEqual(end, -1, `Missing CSS section marker: ${endMarker}`)
  return css.slice(start, end)
}

const declaredVariables = [...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])
const referencedVariables = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1])
const namesIn = (text) => [...text.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])

/* WCAG helpers --------------------------------------------------------------- */

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

const CONTRAST_PAIRS = [
  ['color.fg', 'color.bg'],
  ['color.fg-muted', 'color.bg'],
  ['color.fg-strong', 'color.bg'],
  ['color.fg-strong', 'color.bg-subtle'],
  ['color.accent', 'color.bg'],
  ['color.on-accent', 'color.accent'],
  ['color.on-danger', 'color.danger'],
  ['color.danger', 'color.bg'],
  ['color.success', 'color.bg'],
  ['color.warning', 'color.bg'],
]

/* Layer model ---------------------------------------------------------------- */

test('layers are primitive and semantic only (no brand token namespace)', () => {
  const allPaths = themeTokens(() => true)
  assert.ok(allPaths.some((path) => path.startsWith('primitive.')))
  assert.ok(allPaths.some((path) => path.startsWith('color.')))
  assert.deepEqual(
    allPaths.filter((path) => path.startsWith('brand.')),
    [],
  )
  assert.doesNotMatch(css, /--brand-[\w-]+\s*:/)
})

test('primitive tokens are theme-agnostic', () => {
  const primitivePaths = themeTokens(isPrimitivePath).sort()
  const reference = THEMES[DEFAULT_THEME][DEFAULT_MODE]
  expectEachTheme((theme, label) => {
    for (const path of primitivePaths) {
      assert.equal(theme[path].value, reference[path].value, `${label} changes primitive "${path}"`)
    }
  })
})

test('semantic token contract is identical for every theme', () => {
  const semanticPaths = themeTokens(isSemanticPath).sort()
  expectEachTheme((theme, label) => {
    assert.deepEqual(
      tokenPaths(theme).filter(isSemanticPath).sort(),
      semanticPaths,
      `${label} semantic token contract is out of sync`,
    )
  })
})

/* Theme metadata ------------------------------------------------------------- */

test('generated metadata lists every theme and color mode', () => {
  assert.deepEqual(THEME_IDS, ['default', 'cerulean', 'ocean'])
  assert.deepEqual(MODES, ['light', 'dark'])
  assert.equal(DEFAULT_THEME, 'default')
  assert.deepEqual(themesJson.themeLabels, {
    default: 'Default',
    cerulean: 'Cerulean',
    ocean: 'Ocean',
  })
  assert.deepEqual(themesJson.modeLabels, { light: 'Light', dark: 'Dark' })
  assert.equal(Object.keys(THEMES).length, 3)
})

test('themes override semantic values rather than adding token names', () => {
  const { default: defaultTheme, cerulean, ocean } = THEMES
  assert.equal(defaultTheme.light['color.accent'].value, '#9b2ceb')
  assert.equal(cerulean.light['color.accent'].value, '#007ba7')
  assert.equal(ocean.light['color.accent'].value, '#2563eb')
  assert.equal(cerulean.dark['color.accent'].value, '#7ac6e2')
  assert.equal(ocean.dark['color.accent'].value, '#60a5fa')
  assert.match(cerulean.light['font.family.sans'].value, /Public Sans/)
  assert.doesNotMatch(defaultTheme.light['font.family.sans'].value, /Public Sans/)
  assert.equal(cerulean.light['radius.control'].value, '0.625rem')
  assert.equal(defaultTheme.light['radius.control'].value, '0.375rem')
  assert.equal(ocean.light['radius.control'].value, '9999px')
  assert.equal(cerulean.light['color.bg'].value, defaultTheme.light['color.bg'].value)
  assert.equal(cerulean.dark['color.fg'].value, defaultTheme.dark['color.fg'].value)
})

/* CSS output ----------------------------------------------------------------- */

test('themes are selected by data-theme and the mode attribute is optional', () => {
  assert.match(css, /@layer design-tokens;/)
  assert.match(css, /:root \{/)
  assert.match(css, /\[data-color-mode="dark"\] \{/)

  // Default theme and default mode are the no-JS fallback on :root.
  const baseSection = section(SECTION_MARKERS.base, SECTION_MARKERS.modeDefault)
  assert.ok(baseSection.includes('--font-family-sans:'))
  assert.ok(baseSection.includes('--radius-control:'))
  const defaultModeSection = section(
    SECTION_MARKERS.modeDefault,
    SECTION_MARKERS.modeExplicit(DARK_MODE),
  )
  assert.ok(defaultModeSection.includes('--color-bg:'))

  // System preference is handled by CSS when data-color-mode is absent.
  assert.match(css, /@media \(prefers-color-scheme: dark\)/)
  assert.ok(css.includes(':root:not([data-color-mode]), :root[data-color-mode="dark"]'))
  assert.ok(css.includes(':root {\n    color-scheme: light dark;'))

  // Each named theme is selected directly by data-theme, with explicit and system dark overrides.
  for (const theme of NAMED_THEME_IDS) {
    assert.ok(css.includes(`[data-theme="${theme}"] {`))
    assert.ok(css.includes(`[data-theme="${theme}"][data-color-mode="${DARK_MODE}"]`))
    assert.ok(
      css.includes(
        `[data-theme="${theme}"]:not([data-color-mode]), [data-theme="${theme}"][data-color-mode="${DARK_MODE}"]`,
      ),
    )
  }

  // Old brand attribute is gone everywhere.
  assert.doesNotMatch(css, /data-brand/)
  assert.ok(!css.includes('[data-theme="default"]'), 'default theme uses the :root fallback')
})

test('theme overrides come after semantic defaults so system-dark wins correctly', () => {
  const semanticSystem = section(
    SECTION_MARKERS.modeSystem(DARK_MODE),
    SECTION_MARKERS.themeBase(NAMED_THEME_IDS[0]),
  )
  const themeSystem = section(
    SECTION_MARKERS.themeSystem(NAMED_THEME_IDS[0], DARK_MODE),
    SECTION_MARKERS.themeBase(NAMED_THEME_IDS[1]),
  )
  assert.ok(css.indexOf(semanticSystem) < css.indexOf(themeSystem))
  // Both dark system blocks are emitted for each named theme.
  for (const theme of NAMED_THEME_IDS) {
    assert.ok(css.includes(SECTION_MARKERS.themeSystem(theme, DARK_MODE)))
  }
})

test('CSS output has no duplicate custom property declarations in a block', () => {
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  assert.ok(blocks.length > 5)
  for (const [, blockSelector, declarations] of blocks) {
    const names = namesIn(declarations)
    assert.equal(
      new Set(names).size,
      names.length,
      `Duplicate declaration in block ${blockSelector.trim()}`,
    )
  }
})

test('all CSS variables referenced by var() are declared', () => {
  const declared = new Set(declaredVariables)
  const missing = [...new Set(referencedVariables)].filter((name) => !declared.has(name))
  assert.deepEqual(missing, [])
})

test('all references are resolved (no unresolved {token} placeholders)', () => {
  const values = [...css.matchAll(/--[\w-]+:\s*([^;]+);/g)].map((match) => match[1])
  for (const value of values) assert.ok(!/\{[^{}]+\}/.test(value), `Unresolved reference: ${value}`)
})

test('primitive tokens are declared exactly once, in the primitive section', () => {
  const primitiveSection = section(SECTION_MARKERS.primitive, SECTION_MARKERS.base)
  for (const name of new Set(themeTokens(isPrimitivePath).map(cssVariableName))) {
    assert.ok(primitiveSection.includes(`${name}:`), `Missing primitive token ${name}`)
    assert.equal(
      css.split(`${name}:`).length - 1,
      1,
      `Primitive token ${name} is declared more than once`,
    )
  }
})

test('every semantic token is declared by the default theme', () => {
  const defaultSections = [
    section(SECTION_MARKERS.base, SECTION_MARKERS.modeDefault),
    section(SECTION_MARKERS.modeDefault, SECTION_MARKERS.modeExplicit(DARK_MODE)),
    section(SECTION_MARKERS.modeExplicit(DARK_MODE), SECTION_MARKERS.modeSystem(DARK_MODE)),
    section(SECTION_MARKERS.modeSystem(DARK_MODE), SECTION_MARKERS.themeBase(NAMED_THEME_IDS[0])),
  ].join('')
  for (const path of themeTokens(isSemanticPath)) {
    assert.ok(
      defaultSections.includes(`${cssVariableName(path)}:`),
      `Missing semantic token ${path}`,
    )
  }
})

test('explicit dark and system dark blocks declare the same semantic values', () => {
  const explicit = section(
    SECTION_MARKERS.modeExplicit(DARK_MODE),
    SECTION_MARKERS.modeSystem(DARK_MODE),
  )
  const system = section(
    SECTION_MARKERS.modeSystem(DARK_MODE),
    SECTION_MARKERS.themeBase(NAMED_THEME_IDS[0]),
  )
  const explicitNames = new Set(namesIn(explicit))
  const systemNames = new Set(namesIn(system))
  assert.deepEqual([...systemNames].sort(), [...explicitNames].sort())
  for (const name of explicitNames) {
    const explicitValue = explicit.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
    const systemValue = system.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
    assert.equal(systemValue, explicitValue, `System dark value differs for ${name}`)
  }
})

test('each named theme declares its required overrides', () => {
  const REQUIRED_BASE = ['--font-family-sans', '--font-family-heading', '--radius-control']
  const REQUIRED_MODE = [
    '--color-accent',
    '--color-accent-hover',
    '--color-on-accent',
    '--color-accent-subtle',
    '--color-accent-border',
    '--color-focus-ring',
  ]
  for (const theme of NAMED_THEME_IDS) {
    const baseSection = section(
      SECTION_MARKERS.themeBase(theme),
      SECTION_MARKERS.themeExplicit(theme, DARK_MODE),
    )
    for (const name of REQUIRED_BASE)
      assert.ok(baseSection.includes(`${name}:`), `Missing ${name} in ${theme} base`)
    for (const name of REQUIRED_MODE)
      assert.ok(baseSection.includes(`${name}:`), `Missing ${name} in ${theme} default mode`)

    const explicit = section(
      SECTION_MARKERS.themeExplicit(theme, DARK_MODE),
      SECTION_MARKERS.themeSystem(theme, DARK_MODE),
    )
    const nextTheme = NAMED_THEME_IDS[NAMED_THEME_IDS.indexOf(theme) + 1]
    const system = section(
      SECTION_MARKERS.themeSystem(theme, DARK_MODE),
      nextTheme ? SECTION_MARKERS.themeBase(nextTheme) : undefined,
    )
    for (const name of REQUIRED_MODE) {
      assert.ok(explicit.includes(`${name}:`), `Missing ${name} in ${theme}/${DARK_MODE} explicit`)
      assert.ok(system.includes(`${name}:`), `Missing ${name} in ${theme}/${DARK_MODE} system`)
    }
  }
})

test('native color-scheme follows the optional mode attribute', () => {
  assert.match(css, /:root \{\s*color-scheme: light dark;/)
  assert.match(css, /\[data-color-mode="light"\] \{\s*color-scheme: light;/)
  assert.match(css, /\[data-color-mode="dark"\] \{\s*color-scheme: dark;/)
})

/* Accessibility -------------------------------------------------------------- */

test('semantic color pairs meet WCAG AA contrast in every theme', () => {
  expectEachTheme((theme, label) => {
    for (const [foregroundPath, backgroundPath] of CONTRAST_PAIRS) {
      const foreground = theme[foregroundPath]?.value
      const background = theme[backgroundPath]?.value
      assert.ok(
        foreground && background,
        `Missing contrast pair ${foregroundPath}/${backgroundPath}`,
      )
      const ratio = contrastRatio(foreground, background)
      assert.ok(
        ratio >= 4.5,
        `${label}: ${foregroundPath}/${backgroundPath} = ${ratio.toFixed(2)} < 4.5`,
      )
    }
  })
})

/* JavaScript / TypeScript artifacts ----------------------------------------- */

test('generated JS metadata matches theme JSON', () => {
  assert.match(js, /export const themes = \["default","cerulean","ocean"\]/)
  assert.match(js, /export const modes = \["light","dark"\]/)
  assert.match(js, /export const defaultTheme = "default"/)
  assert.match(js, /export const themeLabels =/)
  assert.doesNotMatch(js, /export const brands/)
  assert.doesNotMatch(js, /export const brandLabels/)
  assert.match(
    js,
    /export const tokenNames = \[\.\.\.primitiveTokenNames, \.\.\.semanticTokenNames\]/,
  )
})

test('token name arrays respect the layer split', () => {
  const primitiveSection = js.slice(
    js.indexOf('export const primitiveTokenNames'),
    js.indexOf('export const semanticTokenNames'),
  )
  const semanticSection = js.slice(js.indexOf('export const semanticTokenNames'))
  assert.ok(primitiveSection.includes('"--primitive-color-neutral-0"'))
  assert.ok(!primitiveSection.includes('"--color-bg"'))
  assert.ok(semanticSection.includes('"--color-bg"'))
  assert.ok(semanticSection.includes('"--font-family-sans"'))
  assert.ok(semanticSection.includes('"--radius-control"'))
  assert.ok(!semanticSection.includes('"--primitive-color-neutral-0"'))
  assert.ok(!semanticSection.includes('"--brand-'))
})

test('generated TypeScript declarations expose literal unions', () => {
  assert.match(dts, /export type Theme = "default" \| "cerulean" \| "ocean"/)
  assert.match(dts, /export type Mode = "light" \| "dark"/)
  assert.match(dts, /export type ModePreference = Mode \| 'system'/)
  assert.match(dts, /export type TokenName = PrimitiveTokenName \| SemanticTokenName/)
  assert.doesNotMatch(dts, /Brand/)
  assert.match(dts, /export declare const defaultTheme: Theme/)
})

test('theme JSON contains resolved values for contrast and tooling', () => {
  expectEachTheme((theme, label) => {
    const colors = Object.entries(theme).filter(
      ([path, token]) => !path.startsWith('primitive.') && token.type === 'color',
    )
    assert.ok(colors.length >= 15, `${label} has too few semantic colors`)
    for (const [path, token] of colors) {
      assert.ok(typeof token.value === 'string', `Expected resolved color for ${path}`)
      assert.ok(!token.value.includes('var('), `Unresolved color for ${path}`)
    }
  })
})
