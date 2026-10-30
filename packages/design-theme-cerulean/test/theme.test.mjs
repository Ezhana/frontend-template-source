import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = (path) => join(packageRoot, 'dist', path)
const read = (path) => readFile(dist(path), 'utf8')

const THEME_ID = 'cerulean'
const THEME_LABEL = 'Cerulean'
const FONT_PACKAGE = '@fontsource-variable/public-sans'
const BASE_SELECTOR = `:root[data-theme="${THEME_ID}"]`
const DARK_SELECTOR = `${BASE_SELECTOR}[data-color-mode="dark"]`
const SYSTEM_MEDIA = '@media (prefers-color-scheme: dark)'

const REQUIRED_BASE = ['--font-family-sans', '--font-family-heading', '--radius-control']
const REQUIRED_MODE = [
  '--color-accent',
  '--color-accent-hover',
  '--color-on-accent',
  '--color-accent-subtle',
  '--color-accent-border',
  '--color-focus-ring',
]

const themeCss = await read('css/theme.css')
const standaloneCss = await read('css/standalone.css')
const styleJs = await read('style.js')
const themeJson = JSON.parse(await read('json/theme.json'))
const metadata = await import(pathToFileURL(dist('js/index.js')).href)
const dts = await read('js/index.d.ts')

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const parseBlocks = (css) => {
  const blocks = []
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    blocks.push({ selector: match[1].trim(), body: match[2], index: match.index })
  }
  return blocks
}

const mediaRange = (css) => {
  const start = css.indexOf(SYSTEM_MEDIA)
  assert.notEqual(start, -1, `Missing system-dark media query in theme.css`)
  const open = css.indexOf('{', start)
  let depth = 0
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    else if (css[index] === '}') {
      depth -= 1
      if (depth === 0) return { start, end: index }
    }
  }
  throw new Error('Unbalanced braces in the system-dark media query')
}

const cleanCss = stripComments(themeCss)
const blocks = parseBlocks(cleanCss)
const systemRange = mediaRange(cleanCss)
const inSystemBlock = (block) => block.index > systemRange.start && block.index < systemRange.end

const declared = (body) => [...body.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])
const hasDeclarations = (body, names) => {
  const present = new Set(declared(body))
  return names.filter((name) => !present.has(name))
}

const baseBlocks = blocks.filter((block) => block.selector === BASE_SELECTOR)
const darkExplicit = blocks.filter((block) => block.selector === DARK_SELECTOR)
const systemBlocks = blocks.filter(
  (block) => inSystemBlock(block) && block.selector.includes(`[data-theme="${THEME_ID}"]`),
)

/** dist/json/theme.json is the documented envelope: `{ resolved: { <mode>: { <path>: … } } }`. */
const modeMap = themeJson.resolved
assert.ok(
  modeMap !== null && typeof modeMap === 'object',
  'dist/json/theme.json must expose a `resolved` object',
)
for (const mode of ['light', 'dark']) {
  assert.equal(
    typeof modeMap[mode],
    'object',
    `dist/json/theme.json must expose resolved values for the "${mode}" mode`,
  )
}

const resolved = (mode, path) => {
  const entry = modeMap[mode]?.[path]
  if (typeof entry === 'string') return entry
  if (entry !== null && typeof entry === 'object') return entry.value ?? entry.$value
  return undefined
}

const expectValue = (mode, path, expected) => {
  const value = resolved(mode, path)
  assert.ok(value, `Missing resolved value for "${path}" in mode "${mode}"`)
  assert.equal(String(value).trim().toLowerCase(), expected.toLowerCase(), `${path} (${mode})`)
}

const toRgb = (hex) => {
  const value = String(hex).replace('#', '')
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
  assert.notEqual(foregroundLuminance, null, `Expected a solid hex color, received "${foreground}"`)
  assert.notEqual(backgroundLuminance, null, `Expected a solid hex color, received "${background}"`)
  const [lighter, darker] = [foregroundLuminance, backgroundLuminance].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

/* -------------------------------------------------------------------------- */
/* Metadata                                                                   */
/* -------------------------------------------------------------------------- */

test('generated metadata describes the theme', () => {
  assert.equal(metadata.themeId, THEME_ID)
  assert.equal(metadata.themeLabel, THEME_LABEL)
  assert.equal(metadata.theme.id, THEME_ID)
  assert.equal(metadata.theme.label, THEME_LABEL)
  assert.deepEqual([...metadata.theme.modes], ['light', 'dark'])

  assert.match(dts, /themeId/)
  assert.match(dts, /themeLabel/)
  assert.match(dts, /export declare const theme/)

  const jsonMeta = themeJson.metadata ?? themeJson.theme ?? themeJson
  assert.equal(jsonMeta.id, THEME_ID)
  assert.equal(jsonMeta.label, THEME_LABEL)
})

test('resolved JSON satisfies the theme contract in both modes', () => {
  for (const mode of ['light', 'dark']) {
    for (const path of ['font.family.sans', 'font.family.heading']) {
      const value = resolved(mode, path)
      assert.ok(value, `Missing ${path} in mode "${mode}"`)
      assert.match(value, /Public Sans/)
    }
    expectValue(mode, 'radius.control', '0.625rem')

    expectValue(mode, 'color.accent', mode === 'light' ? '#007ba7' : '#7ac6e2')
    expectValue(mode, 'color.accent-hover', mode === 'light' ? '#00688f' : '#b0deee')
    expectValue(mode, 'color.on-accent', mode === 'light' ? '#ffffff' : '#0b0b0f')
    expectValue(mode, 'color.accent-subtle', mode === 'light' ? '#007ba71a' : '#7ac6e226')
    expectValue(mode, 'color.accent-border', mode === 'light' ? '#007ba780' : '#7ac6e280')
    expectValue(mode, 'color.focus-ring', mode === 'light' ? '#007ba7' : '#7ac6e2')
  }
})

/* -------------------------------------------------------------------------- */
/* CSS selector strategy                                                      */
/* -------------------------------------------------------------------------- */

test('theme CSS is scoped by :root[data-theme] (never the unprefixed attribute)', () => {
  assert.ok(
    themeCss.includes('@layer design-tokens'),
    'theme.css must stay in @layer design-tokens',
  )
  assert.ok(themeCss.includes(BASE_SELECTOR), `Missing ${BASE_SELECTOR} block`)
  assert.ok(themeCss.includes(DARK_SELECTOR), `Missing ${DARK_SELECTOR} block`)
  assert.notEqual(themeCss.indexOf(SYSTEM_MEDIA), -1, 'Missing system-dark media query')

  const themeSelectors = blocks.flatMap((block) =>
    block.selector
      .split(',')
      .map((selector) => selector.trim())
      .filter((selector) => selector.includes('[data-theme=')),
  )
  assert.ok(themeSelectors.length > 0, 'theme.css contains no data-theme selectors')
  for (const selector of themeSelectors) {
    assert.ok(
      selector.startsWith(BASE_SELECTOR),
      `Theme selector must be rooted at ":root": "${selector}"`,
    )
  }

  assert.doesNotMatch(
    themeCss,
    /(?:^|[\s,{}])\s*\[data-theme=/,
    'Found an unprefixed theme selector',
  )
})

test('base + light block declares the required theme contract', () => {
  assert.ok(baseBlocks.length > 0, `Missing ${BASE_SELECTOR} block in theme.css`)
  const body = baseBlocks.map((block) => block.body).join('\n')
  assert.deepEqual(hasDeclarations(body, REQUIRED_BASE), [], 'Missing required base overrides')
  assert.deepEqual(
    hasDeclarations(body, REQUIRED_MODE),
    [],
    'Missing required light-mode overrides',
  )
})

test('explicit dark and system-dark blocks declare the required overrides', () => {
  assert.ok(darkExplicit.length > 0, `Missing ${DARK_SELECTOR} block in theme.css`)
  for (const block of darkExplicit) {
    assert.deepEqual(
      hasDeclarations(block.body, REQUIRED_MODE),
      [],
      'Missing explicit dark overrides',
    )
  }

  assert.ok(systemBlocks.length > 0, 'Missing system-dark theme overrides')
  const systemBody = systemBlocks.map((block) => block.body).join('\n')
  assert.deepEqual(hasDeclarations(systemBody, REQUIRED_MODE), [], 'Missing system-dark overrides')
})

test('theme.css contains only resolved overrides', () => {
  const declarations = declared(themeCss)
  assert.deepEqual(
    declarations.filter((name) => name.startsWith('--primitive-')),
    [],
    'theme.css must not declare primitive tokens',
  )
  assert.deepEqual(
    declarations.filter((name) => name.startsWith('--theme-')),
    [],
    'theme-private palette tokens must not be emitted as CSS custom properties',
  )

  for (const match of themeCss.matchAll(/--[\w-]+:\s*([^;]+);/g)) {
    assert.ok(!/\{[^{}]+\}/.test(match[1]), `Unresolved reference in theme.css: ${match[1]}`)
  }
})

test('standalone.css bundles the core stylesheet and the theme overrides', () => {
  assert.ok(
    standaloneCss.length > themeCss.length,
    'standalone.css must include the core stylesheet',
  )
  assert.match(standaloneCss, /@layer design-tokens/)
  assert.ok(standaloneCss.includes('--color-bg:'), 'standalone.css is missing core semantic tokens')
  assert.ok(standaloneCss.includes(BASE_SELECTOR), 'standalone.css is missing the theme block')
  assert.ok(
    standaloneCss.indexOf('--color-bg:') < standaloneCss.indexOf(BASE_SELECTOR),
    'core tokens must come before the theme overrides in standalone.css',
  )
})

/* -------------------------------------------------------------------------- */
/* JavaScript entry                                                           */
/* -------------------------------------------------------------------------- */

test('style.js imports the core stylesheet, the font and the theme CSS in order', () => {
  const styleBody = stripComments(styleJs)
  const imports = [...styleBody.matchAll(/import\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
  assert.equal(imports[0], '@ezhana/design-tokens/css/tokens.css')
  assert.equal(imports.at(-1), './css/theme.css')
  assert.deepEqual(
    imports.filter((specifier) => specifier === './css/theme.css'),
    ['./css/theme.css'],
    'theme.css must be imported exactly once',
  )

  const fontIndex = imports.indexOf(FONT_PACKAGE)
  assert.notEqual(fontIndex, -1, `style.js must import "${FONT_PACKAGE}"`)
  assert.ok(
    fontIndex > 0 && fontIndex < imports.length - 1,
    'font imports come between the two CSS imports',
  )

  // Self-sufficiency: every specifier must resolve from THIS package, so a consumer that installs
  // only this theme gets its dependencies and not a hoisted accident.
  const require = createRequire(join(packageRoot, 'package.json'))
  for (const specifier of imports) {
    if (specifier.startsWith('.')) {
      const target = new URL(specifier, pathToFileURL(dist('style.js')))
      assert.ok(existsSync(fileURLToPath(target)), `${specifier} does not exist in the tarball`)
      continue
    }
    assert.doesNotThrow(
      () => require.resolve(specifier),
      `${specifier} must be resolvable from ${packageRoot} (declare it as a dependency)`,
    )
  }
})

/* -------------------------------------------------------------------------- */
/* Accessibility                                                              */
/* -------------------------------------------------------------------------- */

test('accent pairs meet WCAG AA contrast in both modes', () => {
  for (const mode of ['light', 'dark']) {
    const accent = resolved(mode, 'color.accent')
    const onAccent = resolved(mode, 'color.on-accent')
    const background = resolved(mode, 'color.bg')

    for (const [foreground, background_] of [
      [onAccent, accent],
      [accent, background],
    ]) {
      const ratio = contrastRatio(foreground, background_)
      assert.ok(ratio >= 4.5, `${mode}: contrast ${ratio.toFixed(2)} is below WCAG AA (4.5)`)
    }
  }
})
