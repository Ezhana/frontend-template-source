import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = (path) => join(packageRoot, 'dist', path)

const coreJson = JSON.parse(await readFile(dist('json/core.json'), 'utf8'))
const contract = JSON.parse(await readFile(dist('json/contract.json'), 'utf8'))
const css = await readFile(dist('css/tokens.css'), 'utf8')
const js = await readFile(dist('js/index.js'), 'utf8')
const dts = await readFile(dist('js/index.d.ts'), 'utf8')

const { defaultTheme, modes, defaultMode, modeLabels, primitives, semantic } = coreJson
const DARK_MODE = modes.includes('dark') ? 'dark' : modes.find((mode) => mode !== defaultMode)

const toKebabCase = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

const cssVariableName = (tokenPath) => `--${tokenPath.split('.').map(toKebabCase).join('-')}`

const semanticPaths = (mode) => Object.keys(semantic[mode])
const primitivePaths = Object.keys(primitives)

const cssBody = css.slice(css.indexOf('@layer design-tokens {'))
const declaredVariables = [...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])
const referencedVariables = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1])
const namesIn = (text) => [...text.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])

const SECTION_MARKERS = {
  primitive: 'Primitive tokens',
  base: 'Semantic tokens: default theme',
  modeDefault: `Semantic tokens: ${modeLabels[defaultMode].toLowerCase()} color mode (default theme, :root base values)`,
  modeExplicit: (mode) =>
    `Semantic tokens: ${modeLabels[mode].toLowerCase()} color mode (default theme, data-color-mode="${mode}")`,
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
  ['color.on-danger', 'color.danger-solid'],
  ['color.danger', 'color.bg'],
  ['color.success', 'color.bg'],
  ['color.warning', 'color.bg'],
  ['color.info', 'color.bg'],
  ['color.on-info', 'color.info-solid'],
  ['color.fg', 'color.surface'],
  ['color.fg-muted', 'color.surface'],
  ['color.fg-strong', 'color.surface-elevated'],
]

/* Layer model ---------------------------------------------------------------- */

test('core package ships no themes: layers are primitive and semantic only', () => {
  assert.equal(defaultTheme, 'default')
  assert.ok(primitivePaths.length > 0)
  assert.ok(semanticPaths(defaultMode).length > 0)

  // Themes are separate packages; the core stylesheet never selects by data-theme.
  assert.doesNotMatch(cssBody, /\[data-theme=/)
  assert.deepEqual(
    primitivePaths.filter((path) => path.startsWith('theme.')),
    [],
  )
  assert.deepEqual(
    semanticPaths(defaultMode).filter((path) => path.startsWith('theme.')),
    [],
  )
  assert.doesNotMatch(css, /--theme-[\w-]+\s*:/)
  assert.doesNotMatch(css, /--brand-[\w-]+\s*:/)
})

test('primitive tokens are emitted once and never themed', () => {
  const primitiveSection = section(SECTION_MARKERS.primitive, SECTION_MARKERS.base)
  for (const path of primitivePaths) {
    const name = cssVariableName(path)
    assert.ok(primitiveSection.includes(`${name}:`), `Missing primitive token ${name}`)
    assert.equal(css.split(`${name}:`).length - 1, 1, `Primitive token ${name} declared twice`)
  }

  // No semantic section re-declares a primitive token.
  assert.doesNotMatch(css.slice(css.indexOf(SECTION_MARKERS.base)), /--primitive-[\w-]+\s*:/)
})

test('every semantic token is declared for every color mode', () => {
  for (const mode of modes) {
    for (const path of semanticPaths(mode)) {
      assert.ok(semantic[mode][path], `Missing token ${path} in mode ${mode}`)
    }
    assert.deepEqual(
      semanticPaths(mode).sort(),
      semanticPaths(defaultMode).sort(),
      `Mode ${mode} exposes a different semantic token set`,
    )
  }
})

test('every color mode is emitted on :root, data-color-mode and prefers-color-scheme', () => {
  assert.match(css, /@layer design-tokens;/)
  assert.match(cssBody, /^ {2}:root \{$/m)

  const baseSection = section(SECTION_MARKERS.base, SECTION_MARKERS.modeDefault)
  assert.ok(baseSection.includes('--font-family-sans:'))
  assert.ok(baseSection.includes('--radius-control:'))

  const defaultModeSection = section(
    SECTION_MARKERS.modeDefault,
    SECTION_MARKERS.modeExplicit(DARK_MODE),
  )
  assert.ok(defaultModeSection.includes('--color-bg:'))

  assert.ok(css.includes(`[data-color-mode="${DARK_MODE}"] {`))
  assert.match(css, /@media \(prefers-color-scheme: dark\)/)
  assert.ok(
    css.includes(`:root:not([data-color-mode]), :root[data-color-mode="${DARK_MODE}"]`),
    'System-preference block must cover both the absent attribute and an explicit dark mode',
  )
  assert.ok(css.includes(SECTION_MARKERS.modeSystem(DARK_MODE)))
})

test('explicit dark and system dark blocks declare the same values', () => {
  const explicit = section(
    SECTION_MARKERS.modeExplicit(DARK_MODE),
    SECTION_MARKERS.modeSystem(DARK_MODE),
  )
  const system = section(SECTION_MARKERS.modeSystem(DARK_MODE))
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
  // No duplicate custom property in a block.
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

  // Every var() reference resolves to a declared custom property.
  const declared = new Set(declaredVariables)
  const missing = [...new Set(referencedVariables)].filter((name) => !declared.has(name))
  assert.deepEqual(missing, [])

  // No `{token}` placeholder leaked into the output.
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
      new RegExp(`\\[data-color-mode="${mode.id}"\\] \\{\\s*color-scheme: ${mode.colorScheme};`),
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

  // The contrast pairs this suite checks are published to theme builders, so both sides validate
  // the same list instead of maintaining drifting copies.
  assert.deepEqual(contract.contrast.pairs, CONTRAST_PAIRS)
  assert.equal(contract.contrast.min, 4.5)

  // Every required token exists in the matching semantic section.
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

test('contract token sets match the resolved core JSON', () => {
  assert.deepEqual(contract.primitiveTokens, primitivePaths.slice().sort())
  assert.deepEqual(contract.semanticTokens.base.length > 0, true)
  for (const mode of modes) {
    const contractPaths = new Set([
      ...contract.semanticTokens.base,
      ...contract.semanticTokens.modes[mode],
    ])
    assert.deepEqual(
      [...contractPaths].sort(),
      semanticPaths(mode).sort(),
      `Contract and core JSON disagree for mode ${mode}`,
    )
  }
})

/* Resolved values ------------------------------------------------------------ */

test('new semantic token groups resolve in every color mode', () => {
  // Mode-specific additions: layered surfaces, info/solid-danger roles, status tints and the
  // richer elevation scale. [value, $type] as resolved into dist/json/core.json.
  const MODE_TOKENS = {
    light: {
      'color.surface': ['#fafafa', 'color'],
      'color.surface-elevated': ['#ffffff', 'color'],
      'color.border-subtle': ['#f4f4f5', 'color'],
      'color.info': ['#821fca', 'color'],
      'color.info-solid': ['#9b2ceb', 'color'],
      'color.on-info': ['#ffffff', 'color'],
      'color.info-subtle': ['#821fca1a', 'color'],
      'color.danger-solid': ['#b91c1c', 'color'],
      'color.danger-subtle': ['#b91c1c1a', 'color'],
      'color.success-subtle': ['#1665341a', 'color'],
      'color.warning-subtle': ['#92400e1a', 'color'],
      'shadow.lg': ['0 24px 48px -12px rgb(0 0 0 / 0.18)', 'string'],
      'shadow.xl': ['0 32px 64px -16px rgb(0 0 0 / 0.24)', 'string'],
      'shadow.glow': ['0 0 20px rgb(155 44 235 / 0.4)', 'string'],
    },
    dark: {
      'color.surface': ['#26222e', 'color'],
      'color.surface-elevated': ['#453f4f', 'color'],
      'color.border-subtle': ['#26222e', 'color'],
      'color.info': ['#cd98ff', 'color'],
      'color.info-solid': ['#c084fc', 'color'],
      'color.on-info': ['#0b0b0f', 'color'],
      'color.info-subtle': ['#cd98ff26', 'color'],
      'color.danger-solid': ['#f87171', 'color'],
      'color.danger-subtle': ['#f8717126', 'color'],
      'color.success-subtle': ['#4ade8026', 'color'],
      'color.warning-subtle': ['#fcd34d26', 'color'],
      'shadow.lg': ['0 24px 48px -12px rgb(0 0 0 / 0.5)', 'string'],
      'shadow.xl': ['0 32px 64px -16px rgb(0 0 0 / 0.6)', 'string'],
      'shadow.glow': ['0 0 20px rgb(192 132 252 / 0.4)', 'string'],
    },
  }

  // Mode-independent additions: type scale, line-height scale, label tracking and radii.
  const BASE_TOKENS = {
    'font.size.display': ['clamp(2.5rem, 1.9rem + 2.4vw, 4rem)', 'dimension'],
    'font.size.h3': ['1.25rem', 'dimension'],
    'font.size.h4': ['1rem', 'dimension'],
    'font.size.body-lg': ['clamp(1.125rem, 0.95rem + 0.4vw, 1.25rem)', 'dimension'],
    'font.size.caption': ['0.75rem', 'dimension'],
    'font.weight.bold': [700, 'fontWeight'],
    'font.lineHeight.display': [1.15, 'number'],
    'font.lineHeight.h1': [1.2, 'number'],
    'font.lineHeight.h2': [1.25, 'number'],
    'font.lineHeight.h3': [1.3, 'number'],
    'font.lineHeight.h4': [1.35, 'number'],
    'font.lineHeight.small': [1.45, 'number'],
    'font.lineHeight.caption': [1.4, 'number'],
    'font.lineHeight.code': [1.35, 'number'],
    'font.letterSpacing.label': ['0.05em', 'dimension'],
    'radius.modal': ['0.5rem', 'dimension'],
    'radius.panel': ['0.75rem', 'dimension'],
  }

  for (const mode of modes) {
    assert.ok(MODE_TOKENS[mode], `Missing expected new-token values for color mode ${mode}`)
    for (const [path, [value, type]] of Object.entries(MODE_TOKENS[mode])) {
      assert.deepEqual(
        semantic[mode][path],
        { value, type },
        `Unexpected resolved value for ${path} in ${mode}`,
      )
    }
    for (const [path, [value, type]] of Object.entries(BASE_TOKENS)) {
      assert.deepEqual(
        semantic[mode][path],
        { value, type },
        `Unexpected resolved value for ${path} in ${mode}`,
      )
    }
  }

  // The new tokens also reach the stylesheet as semantic custom properties.
  for (const name of [
    '--color-surface',
    '--color-surface-elevated',
    '--color-border-subtle',
    '--color-info',
    '--color-info-solid',
    '--color-on-info',
    '--color-danger-solid',
    '--shadow-lg',
    '--shadow-xl',
    '--shadow-glow',
    '--font-size-display',
    '--font-letter-spacing-label',
    '--font-line-height-display',
    '--radius-modal',
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
        `${mode}: ${foregroundPath}/${backgroundPath} = ${ratio.toFixed(2)} < 4.5`,
      )
    }
  }
})

/* JavaScript / TypeScript artifacts ----------------------------------------- */

test('generated metadata exposes the default theme and mode metadata', () => {
  assert.match(js, /export const defaultTheme = "default"/)
  const modeIds = modes.map((mode) => `"${mode}"`).join(',')
  assert.ok(js.includes(`export const modes = Object.freeze([${modeIds}])`))
  assert.match(js, /export const modeLabels = Object\.freeze\(\{/)
  assert.match(js, /export const defaultThemeDefinition = Object\.freeze\(\{/)
  assert.match(
    js,
    /export const tokenNames = Object\.freeze\(\[\.\.\.primitiveTokenNames, \.\.\.semanticTokenNames\]\)/,
  )

  // Theme identity is a registry concern now; the core package does not enumerate themes.
  assert.doesNotMatch(js, /export const themes =/)
  assert.doesNotMatch(js, /export const themeLabels =/)
  assert.doesNotMatch(js, /export const brands/)
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
})

test('generated metadata is frozen at runtime', async () => {
  const metadata = await import(new URL('../dist/js/index.js', import.meta.url).href)

  assert.ok(Object.isFrozen(metadata.modes))
  assert.ok(Object.isFrozen(metadata.modeLabels))
  assert.ok(Object.isFrozen(metadata.defaultThemeDefinition))
  assert.ok(Object.isFrozen(metadata.primitiveTokenNames))
  assert.ok(Object.isFrozen(metadata.semanticTokenNames))
  assert.ok(Object.isFrozen(metadata.tokenNames))
  assert.equal(metadata.defaultThemeDefinition.modes, metadata.modes)
  assert.equal(
    metadata.tokenNames.length,
    metadata.primitiveTokenNames.length + metadata.semanticTokenNames.length,
  )
})

test('generated TypeScript declarations expose literal unions and ThemeDefinition', () => {
  assert.match(dts, /export type Mode = "light" \| "dark"/)
  assert.match(dts, /export type ModePreference = Mode \| 'system'/)
  assert.match(dts, /export type TokenName = PrimitiveTokenName \| SemanticTokenName/)
  assert.match(dts, /export type ThemeDefinition</)
  assert.match(dts, /export declare const defaultTheme: "default"/)
  assert.match(dts, /export declare const defaultThemeDefinition: ThemeDefinition<"default", Mode>/)
  assert.doesNotMatch(dts, /export type Theme =/)
  assert.doesNotMatch(dts, /Brand/)
})
