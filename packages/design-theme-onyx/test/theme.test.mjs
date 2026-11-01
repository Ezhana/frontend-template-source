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
const readPackageFile = (path) => readFile(join(packageRoot, path), 'utf8')

const THEME_ID = 'onyx'
const THEME_LABEL = 'Onyx'
const BASE_SELECTOR = `:root[data-theme="${THEME_ID}"]`
const FIXED_NO_ATTRIBUTE_SELECTOR = `${BASE_SELECTOR}:not([data-color-mode])`
const FIXED_ATTRIBUTE_SELECTOR = `${BASE_SELECTOR}[data-color-mode]`
const PREFERS_COLOR_SCHEME = 'prefers-color-scheme'
const FONT_ENTRIES = ['@fontsource-variable/public-sans']

const REQUIRED_BASE = [
  '--font-family-sans',
  '--font-family-heading',
  '--font-letter-spacing-label',
  '--radius-small',
  '--radius-control',
  '--radius-surface',
  '--radius-modal',
  '--radius-panel',
  '--radius-pill',
]
const REQUIRED_MODE = [
  '--color-bg',
  '--color-bg-subtle',
  '--color-surface',
  '--color-surface-elevated',
  '--color-fg',
  '--color-fg-muted',
  '--color-fg-strong',
  '--color-border',
  '--color-border-subtle',
  '--color-accent',
  '--color-accent-hover',
  '--color-on-accent',
  '--color-accent-subtle',
  '--color-accent-border',
  '--color-focus-ring',
  '--color-danger',
  '--color-danger-solid',
  '--color-on-danger',
  '--color-success',
  '--color-warning',
  '--color-info',
  '--color-info-solid',
  '--color-on-info',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  '--shadow-glow',
]

const themeCss = await read('css/theme.css')
const standaloneCss = await read('css/standalone.css')
const styleJs = await read('style.js')
const themeJson = JSON.parse(await read('json/theme.json'))
const metadata = await import(pathToFileURL(dist('js/index.js')).href)
const dts = await read('js/index.d.ts')

// Read the core contract directly so "inherited from the core" is asserted, not assumed. Onyx only
// overrides the body/heading families, the label tracking and its own palette/shape/elevation; every
// other semantic token must be exactly what @ezhana/design-tokens ships for the dark mode.
const requireFromPackage = createRequire(join(packageRoot, 'package.json'))
const coreContract = JSON.parse(
  await readFile(requireFromPackage.resolve('@ezhana/design-tokens/json'), 'utf8'),
)
const coreDarkSemantic = coreContract.semantic.dark

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

const declared = (body) => [...body.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])
const declaredValues = (body) => {
  const values = new Map()
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    values.set(match[1], match[2].trim())
  }
  return values
}
const hasDeclarations = (body, names) => {
  const present = new Set(declared(body))
  return names.filter((name) => !present.has(name))
}

const cssNameFor = (path) =>
  `--${path
    .replace(/\./g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()}`

const cleanCss = stripComments(themeCss)
const blocks = parseBlocks(cleanCss)
const themeRules = blocks.filter((block) => block.selector.includes('[data-theme='))
const fixedModeRule = themeRules.find(
  (block) => block.selector.includes(BASE_SELECTOR) && !block.selector.startsWith('@media'),
)

/** `dist/json/theme.json` exposes resolved values per supported mode. */
const modeMap = themeJson.resolved
assert.ok(
  modeMap !== null && typeof modeMap === 'object',
  'dist/json/theme.json must expose a `resolved` object',
)
assert.equal(typeof modeMap.dark, 'object', 'dist/json/theme.json must resolve the "dark" mode')

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

/** WCAG AA text pairs Onyx must keep: the core contract plus the theme's own split status roles. */
const CONTRAST_PAIRS = [
  ['color.fg', 'color.bg'],
  ['color.fg-muted', 'color.bg'],
  ['color.fg-strong', 'color.bg'],
  ['color.fg-strong', 'color.bg-subtle'],
  ['color.fg', 'color.surface'],
  ['color.fg-muted', 'color.surface'],
  ['color.fg-strong', 'color.surface-elevated'],
  ['color.accent', 'color.bg'],
  ['color.on-accent', 'color.accent'],
  ['color.accent-hover', 'color.bg'],
  ['color.danger', 'color.bg'],
  ['color.on-danger', 'color.danger-solid'],
  ['color.success', 'color.bg'],
  ['color.warning', 'color.bg'],
  ['color.info', 'color.bg'],
  ['color.on-info', 'color.info-solid'],
]

/* -------------------------------------------------------------------------- */
/* Metadata                                                                   */
/* -------------------------------------------------------------------------- */

test('generated metadata describes the fixed-mode theme', () => {
  assert.equal(metadata.themeId, THEME_ID)
  assert.equal(metadata.themeLabel, THEME_LABEL)
  assert.equal(metadata.theme.id, THEME_ID)
  assert.equal(metadata.theme.label, THEME_LABEL)
  assert.deepEqual([...metadata.theme.modes], ['dark'])
  assert.deepEqual([...metadata.modes], ['dark'])

  // The declaration file must narrow the identifiers to literals, not plain strings, so a consumer
  // typed against `ThemeId` cannot pass an unknown theme id.
  assert.match(dts, /export type ThemeId = "onyx"/)
  assert.match(dts, /export type ThemeMode = "dark"/)
  assert.match(dts, /export declare const themeLabel: "Onyx"/)
  assert.match(dts, /export declare const theme/)
  assert.doesNotMatch(dts, /"light"/, 'a dark-only theme must not declare a light mode')

  assert.equal(themeJson.theme.id, THEME_ID)
  assert.equal(themeJson.theme.label, THEME_LABEL)
})

test('the theme package declares a single supported color mode', () => {
  assert.deepEqual(themeJson.modes, ['dark'])
  assert.equal(themeJson.defaultMode, 'dark')
  assert.deepEqual(Object.keys(themeJson.resolved), ['dark'])
  assert.deepEqual(Object.keys(themeJson.overrides), ['dark'])
  assert.equal(themeJson.resolved.light, undefined)
  assert.equal(themeJson.overrides.light, undefined)
})

/* -------------------------------------------------------------------------- */
/* Resolved values: palette, type, shape, elevation                           */
/* -------------------------------------------------------------------------- */

test('resolved palette follows the Onyx design brief', () => {
  const expected = {
    'color.bg': '#292623',
    'color.bg-subtle': '#302d29',
    'color.surface': '#36322d',
    'color.surface-elevated': '#3f3a34',
    'color.fg': '#ede6d9',
    'color.fg-muted': '#b6ac9c',
    'color.fg-strong': '#f6f1e7',
    'color.border': '#534c42',
    'color.border-subtle': '#423d36',
    'color.accent': '#d4af37',
    'color.accent-hover': '#e8c566',
    'color.on-accent': '#292623',
    'color.accent-subtle': '#d4af371a',
    'color.accent-border': '#d4af3759',
    'color.focus-ring': '#e8c566',
    'color.danger': '#e28f87',
    'color.danger-solid': '#7e2f2c',
    'color.on-danger': '#f6f1e7',
    'color.danger-subtle': '#e28f871a',
    'color.success': '#8ac7a4',
    'color.success-subtle': '#8ac7a41a',
    'color.warning': '#e8a94f',
    'color.warning-subtle': '#e8a94f1a',
    'color.info': '#8fb8db',
    'color.info-solid': '#2f4a61',
    'color.on-info': '#f6f1e7',
    'color.info-subtle': '#8fb8db1a',
  }
  for (const [path, value] of Object.entries(expected)) {
    expectValue('dark', path, value)
  }
})

test('resolved typography follows the Onyx type contract', () => {
  for (const path of ['font.family.sans', 'font.family.heading']) {
    const value = resolved('dark', path)
    assert.ok(value, `Missing resolved value for ${path}`)
    assert.match(value, /Public Sans/, `${path} must use Public Sans`)
  }
  expectValue('dark', 'font.letterSpacing.label', '0.08em')

  // Onyx deliberately inherits the core type scale: it overrides the body/heading families and the
  // label tracking only. Every other font token must match @ezhana/design-tokens exactly and must
  // not appear in the theme overrides.
  assert.deepEqual(themeJson.overrides.dark['font.family.mono'], undefined)
  assert.equal(resolved('dark', 'font.family.mono'), coreDarkSemantic['font.family.mono'].value)
  for (const path of Object.keys(coreDarkSemantic)) {
    if (!/^font\.(size|weight|lineHeight)\./.test(path)) continue
    assert.equal(
      themeJson.overrides.dark[path],
      undefined,
      `${path} must not be overridden by the theme`,
    )
    assert.equal(
      resolved('dark', path),
      coreDarkSemantic[path].value,
      `${path} must be inherited from the core contract`,
    )
  }
})

test('resolved shape and elevation follow the Onyx design brief', () => {
  const radii = {
    'radius.small': '0.25rem',
    'radius.control': '0.5rem',
    'radius.surface': '0.75rem',
    'radius.modal': '1rem',
    'radius.panel': '1rem',
    'radius.pill': '9999px',
  }
  for (const [path, value] of Object.entries(radii)) expectValue('dark', path, value)

  const shadows = {
    'shadow.sm': '0 1px 2px rgb(9 8 6 / 0.35)',
    'shadow.md': '0 8px 20px -8px rgb(9 8 6 / 0.45)',
    'shadow.lg': '0 20px 44px -12px rgb(9 8 6 / 0.55)',
    'shadow.xl': '0 32px 72px -16px rgb(9 8 6 / 0.65)',
    'shadow.glow': '0 0 24px rgb(212 175 55 / 0.2)',
  }
  for (const [path, value] of Object.entries(shadows)) expectValue('dark', path, value)
})

/* -------------------------------------------------------------------------- */
/* CSS selector strategy                                                      */
/* -------------------------------------------------------------------------- */

test('fixed-mode CSS is scoped by :root[data-theme] and load-order independent', () => {
  assert.ok(
    themeCss.includes('@layer design-tokens'),
    'theme.css must stay in @layer design-tokens',
  )
  assert.ok(themeCss.includes(BASE_SELECTOR), `Missing ${BASE_SELECTOR} selector`)
  assert.ok(
    themeCss.includes(FIXED_NO_ATTRIBUTE_SELECTOR),
    `Missing the fixed-mode selector ${FIXED_NO_ATTRIBUTE_SELECTOR} (needed to beat core's system rule)`,
  )
  assert.ok(
    themeCss.includes(FIXED_ATTRIBUTE_SELECTOR),
    `Missing the fixed-mode selector ${FIXED_ATTRIBUTE_SELECTOR} (needed when data-color-mode is present)`,
  )
  assert.match(themeCss, /color-scheme:\s*dark/, 'fixed-mode theme must pin color-scheme: dark')

  // A fixed-mode theme has no per-mode theme blocks and never follows the OS preference.
  assert.doesNotMatch(themeCss, new RegExp(`\\[data-theme="${THEME_ID}"\\]\\[data-color-mode=`))
  assert.ok(
    !themeCss.includes(PREFERS_COLOR_SCHEME),
    'fixed-mode theme must not emit a prefers-color-scheme media query',
  )
  assert.ok(
    !themeCss.includes('[data-color-mode="'),
    'fixed-mode theme must not declare any data-color-mode="…" block',
  )
  assert.doesNotMatch(
    themeCss,
    /(?:^|[\s,{}])\s*\[data-theme=/,
    'Found an unprefixed theme selector',
  )

  assert.ok(themeRules.length > 0, 'theme.css contains no data-theme rules')
  const selectors = themeRules
    .flatMap((block) => block.selector.split(',').map((selector) => selector.trim()))
    .filter((selector) => selector.includes('[data-theme='))
  for (const selector of selectors) {
    assert.ok(selector.startsWith(BASE_SELECTOR), `Theme selector must be rooted at ":root"`)
  }
})

test('the fixed-mode rule declares the required contract, type, shape and elevation tokens', () => {
  assert.ok(fixedModeRule, 'Missing the fixed-mode theme rule')
  assert.ok(
    fixedModeRule.selector.includes(FIXED_NO_ATTRIBUTE_SELECTOR),
    'The fixed-mode rule must include the :not([data-color-mode]) selector',
  )
  assert.ok(
    fixedModeRule.selector.includes(FIXED_ATTRIBUTE_SELECTOR),
    'The fixed-mode rule must include the [data-color-mode] selector',
  )

  // Both attribute states are covered by a 0,3,0 arm, so the theme wins over core's 0,2,0 dark
  // system block regardless of stylesheet order (the plain 0,2,0 arm would tie when the attribute
  // is present).
  const arms = fixedModeRule.selector.split(',').map((arm) => arm.trim())
  const specificity = (arm) => {
    const ids = (arm.match(/#[\w-]+/g) ?? []).length
    const classes = (arm.match(/:root|\[[^\]]+\]|:not\(\[[^\]]+\]\)/g) ?? []).length
    return [ids, classes, 0]
  }
  for (const arm of [FIXED_NO_ATTRIBUTE_SELECTOR, FIXED_ATTRIBUTE_SELECTOR]) {
    assert.ok(arms.includes(arm), `Missing fixed-mode arm ${arm}`)
    const [, classes] = specificity(arm)
    assert.ok(classes >= 3, `${arm} must have specificity >= 0,3,0 (got 0,${classes},0)`)
  }

  assert.deepEqual(hasDeclarations(fixedModeRule.body, [...REQUIRED_BASE, ...REQUIRED_MODE]), [])
  assert.match(fixedModeRule.body, /color-scheme:\s*dark;/)

  // No duplicate declarations inside the rule.
  const names = declared(fixedModeRule.body)
  assert.equal(new Set(names).size, names.length)
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

test('the fixed-mode rule agrees with dist/json/theme.json value for value', () => {
  assert.ok(fixedModeRule, 'Missing the fixed-mode theme rule')
  const actual = declaredValues(fixedModeRule.body)
  const overrides = themeJson.overrides.dark
  assert.ok(
    overrides !== null && typeof overrides === 'object',
    'dist/json/theme.json must expose the resolved dark overrides',
  )

  for (const [path, entry] of Object.entries(overrides)) {
    const name = cssNameFor(path)
    assert.ok(actual.has(name), `theme.css must declare ${name} for "${path}"`)
    assert.equal(
      actual.get(name).toLowerCase(),
      String(entry.value).trim().toLowerCase(),
      `theme.css must agree with dist/json/theme.json for "${path}"`,
    )
  }
  assert.equal(
    actual.size,
    Object.keys(overrides).length,
    'theme.css must emit exactly the resolved override set',
  )
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

test('style.js imports the core stylesheet, the Public Sans font and the theme CSS in order', () => {
  const styleBody = stripComments(styleJs)
  const imports = [...styleBody.matchAll(/import\s+['"]([^'"]+)['"]/g)].map((match) => match[1])

  assert.equal(imports[0], '@ezhana/design-tokens/css/tokens.css')
  assert.equal(imports.at(-1), './css/theme.css')
  assert.deepEqual(
    imports.filter((specifier) => specifier === './css/theme.css'),
    ['./css/theme.css'],
    'theme.css must be imported exactly once',
  )
  assert.deepEqual(
    imports.slice(1, -1),
    FONT_ENTRIES,
    'the generated style entry must load Public Sans and nothing else',
  )

  // Self-sufficiency: every specifier must resolve from THIS package.
  for (const specifier of imports) {
    if (specifier.startsWith('.')) {
      const target = new URL(specifier, pathToFileURL(dist('style.js')))
      assert.ok(existsSync(fileURLToPath(target)), `${specifier} does not exist in the tarball`)
      continue
    }
    assert.doesNotThrow(
      () => requireFromPackage.resolve(specifier),
      `${specifier} must be resolvable from ${packageRoot} (declare it as a dependency)`,
    )
  }
})

/* -------------------------------------------------------------------------- */
/* Accessibility                                                              */
/* -------------------------------------------------------------------------- */

test('every documented text pair meets WCAG AA contrast', () => {
  for (const [foregroundPath, backgroundPath] of CONTRAST_PAIRS) {
    const foreground = resolved('dark', foregroundPath)
    const background = resolved('dark', backgroundPath)
    assert.ok(foreground && background, `Missing contrast pair ${foregroundPath}/${backgroundPath}`)
    const ratio = contrastRatio(foreground, background)
    assert.ok(
      ratio >= 4.5,
      `${foregroundPath} on ${backgroundPath} = ${ratio.toFixed(2)}:1 is below WCAG AA (4.5:1)`,
    )
  }
})

/* -------------------------------------------------------------------------- */
/* Documentation                                                              */
/* -------------------------------------------------------------------------- */

test('the package ships its design narrative and usage documentation', async () => {
  const design = await readPackageFile('docs/DESIGN.md')
  const readme = await readPackageFile('README.md')

  assert.match(design, /# Design System Narrative — Onyx Theme/)
  assert.match(design, /dark-only/i)
  assert.match(design, /WCAG 2\.2 AA/)
  assert.match(design, /Public Sans/)
  assert.match(design, /#292623/i, 'DESIGN.md must document the soft-charcoal page background')
  for (const component of [
    'Buttons',
    'Cards',
    'Inputs',
    'Chips',
    'Lists',
    'Checkboxes',
    'Radio buttons',
    'Tooltips',
  ]) {
    assert.match(
      design,
      new RegExp(`### ${component}`),
      `DESIGN.md is missing the ${component} recipe`,
    )
  }

  assert.match(readme, /@ezhana\/design-theme-onyx/)
  assert.match(readme, /modes: \['dark'\]/)
})

/* -------------------------------------------------------------------------- */
/* Packaging and composited component contrast                                */
/* -------------------------------------------------------------------------- */

test('the documented package exports point at generated files', async () => {
  const pkg = JSON.parse(await readPackageFile('package.json'))
  for (const [subpath, target] of Object.entries(pkg.exports)) {
    if (subpath === './package.json') continue
    const file = typeof target === 'string' ? target : target.default
    assert.ok(
      typeof file === 'string' && existsSync(join(packageRoot, file)),
      `Export "${subpath}" points at a missing file (${String(file)})`,
    )
  }
})

test('component recipe text keeps WCAG AA over every surface', () => {
  const parseColor = (value) => {
    const hex = String(value).replace('#', '')
    const [r, g, b] = hex
      .slice(0, 6)
      .match(/../g)
      .map((part) => Number.parseInt(part, 16) / 255)
    const alpha = hex.length === 8 ? Number.parseInt(hex.slice(6), 16) / 255 : 1
    return { rgb: [r, g, b], alpha }
  }
  const blend = (foreground, background) => {
    const [r, g, b] = foreground.rgb.map(
      (channel, index) =>
        channel * foreground.alpha + background.rgb[index] * (1 - foreground.alpha),
    )
    const hex = [r, g, b]
      .map((channel) =>
        Math.round(channel * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
    return `#${hex}`
  }

  const surfaces = ['color.bg', 'color.surface', 'color.surface-elevated'].map((path) =>
    resolved('dark', path),
  )
  const recipes = [
    // The 300 steps are the accessible text-on-tint variants for the translucent status fills.
    { name: 'secondary button', foreground: '#e8c566', tint: 'color.accent-subtle' },
    { name: 'warning chip', foreground: '#f0be72', tint: 'color.warning-subtle' },
    { name: 'success chip', foreground: '#a3d6b9', tint: 'color.success-subtle' },
    { name: 'error chip', foreground: '#f2a8a0', tint: 'color.danger-subtle' },
    { name: 'info chip', foreground: '#afcfe9', tint: 'color.info-subtle' },
  ]

  for (const recipe of recipes) {
    const tint = parseColor(resolved('dark', recipe.tint))
    for (const surface of surfaces) {
      const composited = blend(tint, parseColor(surface))
      const ratio = contrastRatio(recipe.foreground, composited)
      assert.ok(
        ratio >= 4.5,
        `${recipe.name}: ${recipe.foreground} on ${recipe.tint} over ${surface} = ` +
          `${ratio.toFixed(2)}:1 is below WCAG AA (4.5:1)`,
      )
    }
  }
})
