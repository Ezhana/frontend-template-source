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

const THEME_ID = 'quest'
const THEME_LABEL = 'Quest'
const BASE_SELECTOR = `:root[data-theme="${THEME_ID}"]`
const FIXED_NO_ATTRIBUTE_SELECTOR = `${BASE_SELECTOR}:not([data-color-mode])`
const FIXED_ATTRIBUTE_SELECTOR = `${BASE_SELECTOR}[data-color-mode]`
const SYSTEM_MEDIA = '@media (prefers-color-scheme: dark)'
const FONT_ENTRIES = [
  '@fontsource/cinzel/400.css',
  '@fontsource/cinzel/500.css',
  '@fontsource/cinzel/600.css',
  '@fontsource/cinzel/700.css',
  '@fontsource/spectral/400.css',
  '@fontsource/spectral/500.css',
  '@fontsource/spectral/600.css',
  '@fontsource-variable/fira-code',
]

const REQUIRED_BASE = [
  '--font-family-sans',
  '--font-family-heading',
  '--font-family-mono',
  '--radius-control',
  '--radius-surface',
  '--radius-modal',
  '--radius-panel',
  '--font-size-display',
  '--font-size-h1',
  '--font-size-h2',
  '--font-size-h3',
  '--font-size-h4',
  '--font-size-body-lg',
  '--font-size-caption',
  '--font-weight-bold',
  '--font-line-height-display',
  '--font-line-height-h1',
  '--font-letter-spacing-label',
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
const hasDeclarations = (body, names) => {
  const present = new Set(declared(body))
  return names.filter((name) => !present.has(name))
}

const cleanCss = stripComments(themeCss)
const blocks = parseBlocks(cleanCss)
const themeRules = blocks.filter((block) => block.selector.includes('[data-theme='))

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

/** WCAG AA text pairs the QuestUI palette must keep, including the theme's own split status roles. */
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

  assert.match(dts, /themeId/)
  assert.match(dts, /themeLabel/)
  assert.match(dts, /export declare const theme/)
  assert.match(dts, /"dark"/)

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

test('resolved palette follows the QuestUI design brief', () => {
  const expected = {
    'color.bg': '#1a0f0a',
    'color.bg-subtle': '#2c1a10',
    'color.surface': '#2c1a10',
    'color.surface-elevated': '#3d2517',
    'color.fg': '#f5e6d3',
    'color.fg-muted': '#bfa98a',
    'color.fg-strong': '#f5e6d3',
    'color.border': '#5c3d2e',
    'color.border-subtle': '#3d2517',
    'color.accent': '#ca8a04',
    'color.accent-hover': '#b8780a',
    'color.on-accent': '#1a0f0a',
    'color.accent-subtle': '#ca8a0415',
    'color.accent-border': '#ca8a0440',
    'color.focus-ring': '#ca8a04',
    'color.danger': '#f87171',
    'color.danger-solid': '#991b1b',
    'color.on-danger': '#f5e6d3',
    'color.danger-subtle': '#991b1b20',
    'color.success': '#22c55e',
    'color.success-subtle': '#22c55e20',
    'color.warning': '#ca8a04',
    'color.warning-subtle': '#ca8a0420',
    'color.info': '#c084fc',
    'color.info-solid': '#581c87',
    'color.on-info': '#f5e6d3',
    'color.info-subtle': '#581c8720',
  }
  for (const [path, value] of Object.entries(expected)) {
    expectValue('dark', path, value)
  }
})

test('resolved typography follows the QuestUI type scale', () => {
  const families = {
    'font.family.sans': 'Spectral',
    'font.family.heading': 'Cinzel',
    'font.family.mono': 'Fira Code',
  }
  for (const [path, family] of Object.entries(families)) {
    const value = resolved('dark', path)
    assert.ok(value, `Missing resolved value for ${path}`)
    assert.match(value, new RegExp(family), `${path} must use ${family}`)
  }

  const sizes = {
    'font.size.display': '2.5rem',
    'font.size.h1': '2rem',
    'font.size.h2': '1.5rem',
    'font.size.h3': '1.25rem',
    'font.size.h4': '1rem',
    'font.size.body-lg': '1.125rem',
    'font.size.body': '1rem',
    'font.size.small': '0.875rem',
    'font.size.caption': '0.75rem',
    'font.size.code': '0.875rem',
    'font.size.control': '0.875rem',
  }
  for (const [path, value] of Object.entries(sizes)) expectValue('dark', path, value)

  const lineHeights = {
    'font.lineHeight.display': '1.15',
    'font.lineHeight.h1': '1.2',
    'font.lineHeight.h2': '1.25',
    'font.lineHeight.h3': '1.3',
    'font.lineHeight.h4': '1.35',
    'font.lineHeight.body': '1.7',
    'font.lineHeight.small': '1.6',
    'font.lineHeight.caption': '1.4',
    'font.lineHeight.code': '1.6',
  }
  for (const [path, value] of Object.entries(lineHeights)) expectValue('dark', path, value)

  const weights = {
    'font.weight.body': '400',
    'font.weight.medium': '500',
    'font.weight.strong': '600',
    'font.weight.bold': '700',
  }
  for (const [path, value] of Object.entries(weights)) expectValue('dark', path, value)

  expectValue('dark', 'font.letterSpacing.label', '1px')
})

test('resolved shape and elevation follow the QuestUI design brief', () => {
  const radii = {
    'radius.small': '2px',
    'radius.control': '4px',
    'radius.surface': '4px',
    'radius.modal': '6px',
    'radius.panel': '8px',
    'radius.pill': '9999px',
  }
  for (const [path, value] of Object.entries(radii)) expectValue('dark', path, value)

  const shadows = {
    'shadow.sm': '0 1px 3px rgb(202 138 4 / 0.15)',
    'shadow.md': '0 2px 8px rgb(202 138 4 / 0.2)',
    'shadow.lg': '0 4px 16px rgb(202 138 4 / 0.25)',
    'shadow.xl': '0 8px 32px rgb(202 138 4 / 0.3)',
    'shadow.glow': '0 0 20px rgb(202 138 4 / 0.4)',
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

  // A fixed-mode theme has no per-mode theme blocks.
  assert.doesNotMatch(themeCss, new RegExp(`\\[data-theme="${THEME_ID}"\\]\\[data-color-mode=`))
  assert.doesNotMatch(themeCss, new RegExp(SYSTEM_MEDIA))
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
  const rule = themeRules.find(
    (block) => block.selector.includes(BASE_SELECTOR) && !block.selector.startsWith('@media'),
  )
  assert.ok(rule, 'Missing the fixed-mode theme rule')
  assert.ok(
    rule.selector.includes(FIXED_NO_ATTRIBUTE_SELECTOR),
    'The fixed-mode rule must include the :not([data-color-mode]) selector',
  )
  assert.ok(
    rule.selector.includes(FIXED_ATTRIBUTE_SELECTOR),
    'The fixed-mode rule must include the [data-color-mode] selector',
  )

  // Both attribute states are covered by a 0,3,0 arm, so the theme wins over core's 0,2,0 dark
  // system block regardless of stylesheet order (the plain 0,2,0 arm would tie when the attribute
  // is present).
  const arms = rule.selector.split(',').map((arm) => arm.trim())
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

  assert.deepEqual(hasDeclarations(rule.body, [...REQUIRED_BASE, ...REQUIRED_MODE]), [])
  assert.match(rule.body, /color-scheme:\s*dark;/)

  // No duplicate declarations inside the rule.
  const names = declared(rule.body)
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

test('style.js imports the core stylesheet, every font and the theme CSS in order', () => {
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
    'the generated style entry must load Cinzel, Spectral and Fira Code',
  )

  // Self-sufficiency: every specifier must resolve from THIS package.
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

  assert.match(design, /# Design System Narrative — QuestUI Theme/)
  assert.match(design, /dark-only/i)
  assert.match(design, /WCAG 2\.2 AA/)
  assert.match(design, /Cinzel/)
  assert.match(design, /Spectral/)
  assert.match(design, /Fira Code/)
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

  assert.match(readme, /@ezhana\/design-theme-quest/)
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
    // The brief's bright gold is the accessible text-on-tint variant for gold tinted fills.
    { name: 'secondary button', foreground: '#daa520', tint: 'color.accent-subtle' },
    { name: 'warning chip', foreground: '#daa520', tint: 'color.warning-subtle' },
    {
      name: 'success chip',
      foreground: resolved('dark', 'color.success'),
      tint: 'color.success-subtle',
    },
    {
      name: 'error chip',
      foreground: resolved('dark', 'color.danger'),
      tint: 'color.danger-subtle',
    },
    { name: 'info chip', foreground: resolved('dark', 'color.info'), tint: 'color.info-subtle' },
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
