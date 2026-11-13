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

// Obsidian is a fixed-mode theme: it declares the dark color mode only and applies it
// unconditionally for `data-theme="obsidian"` (no prefers-color-scheme fallback, no light arm).
const THEME_ID = 'obsidian'
const THEME_LABEL = 'Obsidian'
const BASE_SELECTOR = `:root[data-theme="${THEME_ID}"]`
const FIXED_NO_ATTRIBUTE_SELECTOR = `${BASE_SELECTOR}:not([data-color-mode])`
const FIXED_ATTRIBUTE_SELECTOR = `${BASE_SELECTOR}[data-color-mode]`
const PREFERS_COLOR_SCHEME = 'prefers-color-scheme'

const REQUIRED_BASE = [
  '--font-family-sans',
  '--font-family-heading',
  '--font-family-mono',
  '--font-letter-spacing-label',
  '--font-size-display',
  '--font-size-h1',
  '--font-size-h2',
  '--font-size-h3',
  '--font-size-h4',
  '--font-size-body-lg',
  '--font-size-body',
  '--font-size-small',
  '--font-size-caption',
  '--font-size-code',
  '--font-size-control',
  '--font-line-height-display',
  '--font-line-height-h1',
  '--font-line-height-h2',
  '--font-line-height-h3',
  '--font-line-height-h4',
  '--font-line-height-body',
  '--font-line-height-small',
  '--font-line-height-caption',
  '--font-line-height-code',
  '--font-line-height-heading',
  '--font-line-height-tight',
  '--motion-duration-fast',
  '--motion-duration-normal',
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
  '--color-danger-subtle',
  '--color-success',
  '--color-success-subtle',
  '--color-warning',
  '--color-warning-subtle',
  '--color-info',
  '--color-info-solid',
  '--color-on-info',
  '--color-info-subtle',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  '--shadow-glow',
]

const themeCss = await read('theme.css')
const styleCss = await read('style.css')
const fontsCss = await read('fonts.css')
const themeJson = JSON.parse(await read('theme.json'))
const metadata = await import(pathToFileURL(dist('index.js')).href)
const dts = await read('index.d.ts')
const pkg = JSON.parse(await readPackageFile('package.json'))

// Read the core contract directly so "inherited from the core" is asserted, not assumed. Obsidian
// overrides the Inter/Playfair families, the whole Obsidian type scale, the crisp shape scale, its
// two motion durations and its own palette/elevation; font weights and easing stay core-owned.
const requireFromPackage = createRequire(join(packageRoot, 'package.json'))
const coreContract = JSON.parse(
  await readFile(requireFromPackage.resolve('@ezhana/design-tokens/tokens.json'), 'utf8'),
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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const cleanCss = stripComments(themeCss)
const blocks = parseBlocks(cleanCss)
const themeRules = blocks.filter((block) => block.selector.includes('[data-theme='))
const fixedModeRule = themeRules.find(
  (block) => block.selector.includes(BASE_SELECTOR) && !block.selector.startsWith('@media'),
)

/** `dist/theme.json` exposes resolved values per supported mode. */
const modeMap = themeJson.resolved
assert.ok(
  modeMap !== null && typeof modeMap === 'object',
  'dist/theme.json must expose a `resolved` object',
)
assert.equal(typeof modeMap.dark, 'object', 'dist/theme.json must resolve the "dark" mode')

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

const overridesDark = themeJson.overrides.dark

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

/**
 * WCAG AA text pairs Obsidian must keep: every pair the core contract publishes, the gold
 * accent-hover-on-page pair the theme's identity relies on, and the theme's split status roles
 * (readable status text on the page; near-black surfaces carry the solid status fills).
 */
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
  ['color.accent-hover', 'color.surface'],
  ['color.accent-hover', 'color.surface-elevated'],
  ['color.danger', 'color.bg'],
  ['color.on-danger', 'color.danger-solid'],
  ['color.danger', 'color.surface'],
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
  assert.match(dts, /export type ThemeId = "obsidian"/)
  assert.match(dts, /export type ThemeMode = "dark"/)
  assert.match(dts, /export declare const themeLabel: "Obsidian"/)
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
/* Resolved values: palette, type, shape, elevation, motion                   */
/* -------------------------------------------------------------------------- */

test('resolved palette follows the Obsidian design brief', () => {
  // Warm near-black obsidian surfaces, ink-on-obsidian text, a single 24K gold used with
  // discipline (accent, accent-hover, focus ring) and muted status roles that stay readable.
  const expected = {
    'color.bg': '#070606',
    'color.bg-subtle': '#191715',
    'color.surface': '#0b0a09',
    'color.surface-elevated': '#111010',
    'color.fg': '#f3efe6',
    'color.fg-muted': '#c9c1b5',
    'color.fg-strong': '#faf7f0',
    'color.border': '#f3efe61a',
    'color.border-subtle': '#f3efe60f',
    'color.accent': '#d4af37',
    'color.accent-hover': '#dfc06a',
    'color.on-accent': '#070606',
    'color.accent-subtle': '#d4af371a',
    'color.accent-border': '#d4af3759',
    'color.focus-ring': '#e8d189',
    'color.danger': '#e4695f',
    'color.danger-solid': '#8f2f2a',
    'color.on-danger': '#f3efe6',
    'color.danger-subtle': '#e4695f1a',
    'color.success': '#54c795',
    'color.success-subtle': '#54c7951a',
    'color.warning': '#e3a94f',
    'color.warning-subtle': '#e3a94f1a',
    'color.info': '#6ea8e0',
    'color.info-solid': '#2f4a61',
    'color.on-info': '#f3efe6',
    'color.info-subtle': '#6ea8e01a',
  }
  for (const [path, value] of Object.entries(expected)) {
    expectValue('dark', path, value)
  }
})

test('resolved typography follows the Obsidian type contract', () => {
  // Latin body copy is Inter, Latin display headings are Playfair Display, code stays on the
  // source system's monospace stack.
  assert.match(resolved('dark', 'font.family.sans'), /Inter/, 'sans must use Inter')
  assert.match(
    resolved('dark', 'font.family.heading'),
    /Playfair Display/,
    'heading must use Playfair Display',
  )
  assert.match(
    resolved('dark', 'font.family.mono'),
    /ui-monospace/,
    'mono must use the system mono stack',
  )
  expectValue('dark', 'font.letterSpacing.label', '0.22em')

  // Obsidian owns its full display/type scale — the source editorial scale, not the core scale.
  const sizes = {
    'font.size.display': 'clamp(3rem, 2.1rem + 3.8vw, 5rem)',
    'font.size.h1': 'clamp(2.5rem, 1.9rem + 2.6vw, 3.75rem)',
    'font.size.h2': 'clamp(2rem, 1.65rem + 1.6vw, 2.75rem)',
    'font.size.h3': '1.75rem',
    'font.size.h4': '1.375rem',
    'font.size.body-lg': '1.125rem',
    'font.size.body': '1rem',
    'font.size.small': '0.875rem',
    'font.size.caption': '0.75rem',
    'font.size.code': '0.75rem',
    'font.size.control': '0.875rem',
  }
  for (const [path, value] of Object.entries(sizes)) {
    expectValue('dark', path, value)
    assert.ok(overridesDark[path], `${path} must be a theme override, not a core default`)
  }

  const lineHeights = {
    'font.lineHeight.display': 1.02,
    'font.lineHeight.h1': 1.06,
    'font.lineHeight.h2': 1.12,
    'font.lineHeight.h3': 1.25,
    'font.lineHeight.h4': 1.35,
    'font.lineHeight.body': 1.7,
    'font.lineHeight.small': 1.6,
    'font.lineHeight.caption': 1.5,
    'font.lineHeight.code': 1.5,
    'font.lineHeight.heading': 1.2,
    'font.lineHeight.tight': 1.02,
  }
  for (const [path, value] of Object.entries(lineHeights)) {
    expectValue('dark', path, String(value))
    assert.ok(overridesDark[path], `${path} must be a theme override, not a core default`)
  }

  for (const path of ['font.family.sans', 'font.family.heading', 'font.family.mono']) {
    assert.ok(overridesDark[path], `${path} must be a theme override, not a core default`)
  }
})

test('font weights are inherited from the core contract, not overridden', () => {
  // Obsidian deliberately keeps the core weight scale in every mode: body 400, medium 500,
  // strong 600, bold 700. Asserting both sides proves the inheritance rather than assuming it.
  const weightPaths = Object.keys(coreDarkSemantic).filter((path) => /^font\.weight\./.test(path))
  assert.ok(weightPaths.length > 0, 'the core contract must publish font weights')
  for (const path of weightPaths) {
    assert.equal(overridesDark[path], undefined, `${path} must not be overridden by the theme`)
    assert.equal(
      resolved('dark', path),
      coreDarkSemantic[path].value,
      `${path} must be inherited from the core contract`,
    )
  }
})

test('resolved shape and elevation follow the Obsidian design brief', () => {
  // Crisp editorial radius scale (not the core's soft scale) and near-black elevation with a
  // restrained gold glow for accented surfaces.
  const radii = {
    'radius.small': '4px',
    'radius.control': '6px',
    'radius.surface': '14px',
    'radius.modal': '20px',
    'radius.panel': '28px',
    'radius.pill': '9999px',
  }
  for (const [path, value] of Object.entries(radii)) expectValue('dark', path, value)

  const shadows = {
    'shadow.sm': '0 1px 2px rgb(0 0 0 / 0.5)',
    'shadow.md': '0 2px 8px -2px rgb(0 0 0 / 0.55)',
    'shadow.lg': '0 12px 32px -16px rgb(0 0 0 / 0.75)',
    'shadow.xl': '0 32px 80px -32px rgb(0 0 0 / 0.85)',
    'shadow.glow': '0 0 0 1px rgb(212 175 55 / 0.22), 0 18px 48px -20px rgb(212 175 55 / 0.38)',
  }
  for (const [path, value] of Object.entries(shadows)) expectValue('dark', path, value)
})

test('motion overrides the two source durations and inherits the core easing', () => {
  // Faster, snappier motion than the core's 150/300ms, while easing stays core-owned.
  for (const [path, value] of Object.entries({
    'motion.duration.fast': '120ms',
    'motion.duration.normal': '200ms',
  })) {
    expectValue('dark', path, value)
    assert.ok(overridesDark[path], `${path} must be a theme override`)
  }

  const easingPaths = Object.keys(coreDarkSemantic).filter((path) => /^motion\.easing\./.test(path))
  assert.ok(easingPaths.length > 0, 'the core contract must publish motion easing tokens')
  for (const path of easingPaths) {
    assert.equal(overridesDark[path], undefined, `${path} must not be overridden by the theme`)
    assert.equal(
      resolved('dark', path),
      coreDarkSemantic[path].value,
      `${path} must be inherited from the core contract`,
    )
  }
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
  const cleanThemeCss = stripComments(themeCss)
  assert.doesNotMatch(
    cleanThemeCss,
    new RegExp(`\\[data-theme="${THEME_ID}"\\]\\[data-color-mode=`),
  )
  assert.ok(
    !cleanThemeCss.includes(PREFERS_COLOR_SCHEME),
    'fixed-mode theme must not emit a prefers-color-scheme media query',
  )
  assert.ok(
    !cleanThemeCss.includes('[data-color-mode="'),
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

test('the fixed-mode rule agrees with dist/theme.json value for value', () => {
  assert.ok(fixedModeRule, 'Missing the fixed-mode theme rule')
  const actual = declaredValues(fixedModeRule.body)
  assert.ok(
    overridesDark !== null && typeof overridesDark === 'object',
    'dist/theme.json must expose the resolved dark overrides',
  )

  for (const [path, entry] of Object.entries(overridesDark)) {
    const name = cssNameFor(path)
    assert.ok(actual.has(name), `theme.css must declare ${name} for "${path}"`)
    assert.equal(
      actual.get(name).toLowerCase(),
      String(entry.value).trim().toLowerCase(),
      `theme.css must agree with dist/theme.json for "${path}"`,
    )
  }
  assert.equal(
    actual.size,
    Object.keys(overridesDark).length,
    'theme.css must emit exactly the resolved override set',
  )
})

test('complete style.css embeds the fonts, core tokens and theme overrides', () => {
  assert.ok(styleCss.length > themeCss.length, 'style.css must include the core stylesheet')
  assert.match(styleCss, /@layer design-tokens/)
  assert.ok(styleCss.includes('--color-bg:'), 'style.css is missing core semantic tokens')
  assert.ok(styleCss.includes(BASE_SELECTOR), 'style.css is missing the theme block')
  assert.ok(
    styleCss.indexOf('--color-bg:') < styleCss.indexOf(BASE_SELECTOR),
    'core tokens must come before the theme overrides in style.css',
  )

  // The published preset resolves its own dependencies: no CSS imports remain, and every font URL
  // points at a file shipped next to the stylesheet.
  assert.doesNotMatch(styleCss, /@import\s/)
  const fontUrls = [...styleCss.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1])
  if (styleCss.includes('@font-face {')) {
    assert.ok(fontUrls.length > 0, 'style.css declares fonts but no font files')
  }
  for (const url of fontUrls) {
    assert.match(url, /^\.\/fonts\/[^/]+\.woff2?$/)
    assert.ok(existsSync(join(packageRoot, 'dist', url)), `Missing font file ${url}`)
  }
})

test('the package ships CSS-first entries and no JavaScript CSS imports', async () => {
  const pkg = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
  assert.ok(pkg.files.includes('dist'))
  assert.deepEqual(pkg.sideEffects, ['**/*.css'])
  assert.match(await read('index.js'), /export const theme/, 'Expected theme metadata')
  assert.doesNotMatch(await read('index.js'), /\.css['"]/, 'Metadata must not import CSS')
  assert.match(fontsCss, /@font-face \{|ships no font assets/)
})

/* -------------------------------------------------------------------------- */
/* JavaScript entry                                                           */
/* -------------------------------------------------------------------------- */

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

  const firstHeading = design.match(/^# .+$/m)
  assert.ok(firstHeading, 'docs/DESIGN.md must start with an H1 heading')
  assert.equal(
    firstHeading[0].trim(),
    '# Design System Narrative — Obsidian Theme',
    'docs/DESIGN.md must open with the Obsidian design narrative title',
  )
  assert.match(design, /dark-only/i)
  assert.match(design, /WCAG 2\.2 AA/)
  assert.match(design, /Inter/)
  assert.match(design, /Playfair Display/)
  assert.match(design, /#070606/i, 'DESIGN.md must document the obsidian-black page background')
  assert.match(design, /8%/, 'DESIGN.md must document the restrained gold usage budget')
  assert.ok(
    design.includes('--ds-'),
    'DESIGN.md must document the theme token mapping (--ds- custom properties)',
  )

  // The component recipe section must cover every Obsidian component contract.
  for (const component of [
    'Buttons',
    'Cards',
    'Inputs',
    'Tables',
    'Modals',
    'Toasts',
    'Code blocks',
    'Carousels',
    'Charts',
  ]) {
    assert.match(
      design,
      new RegExp(`^### ${escapeRegExp(component)}\\s*$`, 'm'),
      `DESIGN.md is missing the ${component} recipe heading`,
    )
  }

  assert.match(readme, /@ezhana\/design-theme-obsidian/)
  assert.match(readme, /modes: \['dark'\]/)
})

/* -------------------------------------------------------------------------- */
/* Packaging and composited component contrast                                */
/* -------------------------------------------------------------------------- */

test('the documented package exports point at generated files', () => {
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
    // The theme's text-on-tint variants for the translucent accent/status fills: the composited
    // chip background must stay dark enough for the gold/status text to clear AA.
    { name: 'gold chip', foreground: '#e8d189', tint: 'color.accent-subtle' },
    { name: 'success chip', foreground: '#54c795', tint: 'color.success-subtle' },
    { name: 'warning chip', foreground: '#e3a94f', tint: 'color.warning-subtle' },
    { name: 'error chip', foreground: '#e4695f', tint: 'color.danger-subtle' },
    { name: 'info chip', foreground: '#6ea8e0', tint: 'color.info-subtle' },
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
