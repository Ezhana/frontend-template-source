#!/usr/bin/env node
/**
 * Build the `@ezhana/design-tokens` artifacts from the DTCG sources in `tokens/`.
 *
 *   dist/style.css       complete core stylesheet: primitives + semantic tokens for every mode
 *   dist/tokens.json     resolved values per mode (tooling, tests)
 *   dist/contract.json   theme contract consumed by `@ezhana/theme-builder`
 *   dist/index.js        metadata (default theme, modes, token names)
 *   dist/index.d.ts      literal types for the metadata
 *
 * Layer model: primitives are raw, context-free values; semantic tokens are the public API and
 * carry the default theme values. Themes are separate packages that override semantic tokens for
 * `:root[data-theme="<id>"]`; this package never selects by `data-theme`.
 *
 * The pipeline is strict: mode token sets must match, semantic values may only reference
 * primitives, and every required theme-contract token must exist. A broken source fails the build
 * instead of shipping an undefined custom property.
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import StyleDictionary from 'style-dictionary'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const tokensDir = join(packageRoot, 'tokens')
const distDir = join(packageRoot, 'dist')

const PACKAGE_NAME = '@ezhana/design-tokens'
const CONTRACT_VERSION = 1
const PRIMITIVE_ROOT = 'primitive'
const TRANSFORMS = ['attribute/cti', 'name/kebab']
const FALLBACK_MODE_ORDER = ['light', 'dark']

/** Theme tokens every theme package must provide, split by the section it may override. */
const REQUIRED_THEME_BASE = ['font.family.sans', 'font.family.heading', 'radius.control']
const REQUIRED_THEME_MODE = [
  'color.accent',
  'color.accent-hover',
  'color.on-accent',
  'color.accent-subtle',
  'color.accent-border',
  'color.focus-ring',
]

/** Foreground/background pairs the default theme guarantees at WCAG AA. Published for themes. */
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
const CONTRAST_MIN = 4.5

/** Theme-private material never becomes a CSS custom property; the namespace is reserved. */
const THEME_NAMESPACE = 'theme'
const THEME_ID_PATTERN = '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'

const output = (message) => process.stdout.write(`${message}\n`)

/* Token tree helpers ------------------------------------------------------- */

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isToken = (node) =>
  isPlainObject(node) && (Object.hasOwn(node, '$value') || Object.hasOwn(node, 'value'))

const stripRootMeta = (tree) =>
  Object.fromEntries(Object.entries(tree).filter(([key]) => !key.startsWith('$')))

const tokenPaths = (tree, prefix = []) => {
  const paths = []
  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith('$')) continue
    const path = [...prefix, key]
    if (isToken(value)) paths.push(path.join('.'))
    else if (isPlainObject(value)) paths.push(...tokenPaths(value, path))
  }
  return paths
}

const mergeTrees = (trees, label = 'token') => {
  const merge = (target, source) => {
    for (const [key, value] of Object.entries(source)) {
      if (isToken(value)) {
        if (target[key] !== undefined) {
          throw new Error(`Duplicate ${label} "${key}" found while merging token sources.`)
        }
        target[key] = value
      } else if (isPlainObject(value)) {
        if (isToken(target[key])) {
          throw new Error(`Duplicate ${label} "${key}" is declared as both a token and a group.`)
        }
        target[key] = merge(isPlainObject(target[key]) ? target[key] : {}, value)
      } else {
        target[key] = value
      }
    }
    return target
  }
  return trees.reduce((result, tree) => merge(result, tree), {})
}

const collectReferences = (tree) => {
  const references = new Set()
  const visitValue = (value) => {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/\{([^{}]+)\}/g)) references.add(match[1].trim())
    } else if (Array.isArray(value)) {
      value.forEach(visitValue)
    } else if (isPlainObject(value)) {
      Object.values(value).forEach(visitValue)
    }
  }
  const visitNode = (node) => {
    if (isToken(node)) {
      visitValue(node.$value ?? node.value)
    } else if (isPlainObject(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (!key.startsWith('$')) visitNode(value)
      }
    }
  }
  visitNode(tree)
  return references
}

const toKebabCase = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

const cssVariableName = (tokenPath) => `--${tokenPath.split('.').map(toKebabCase).join('-')}`

const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1)

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

/* Token sources ------------------------------------------------------------ */

const loadSources = async () => {
  const primitiveDir = join(tokensDir, PRIMITIVE_ROOT)
  const primitiveFiles = (await readdir(primitiveDir))
    .filter((file) => file.endsWith('.json'))
    .sort()
  const primitiveTrees = await Promise.all(
    primitiveFiles.map(async (file) => stripRootMeta(await readJson(join(primitiveDir, file)))),
  )
  const primitiveTokens = mergeTrees(primitiveTrees, 'primitive token')

  const semanticDir = join(tokensDir, 'semantic')
  const semanticBase = stripRootMeta(await readJson(join(semanticDir, 'base.json')))

  const modesDir = join(semanticDir, 'modes')
  const modeFiles = (await readdir(modesDir)).filter((file) => file.endsWith('.json')).sort()
  if (modeFiles.length === 0) throw new Error('No color mode sources in tokens/semantic/modes.')

  const modes = await Promise.all(
    modeFiles.map(async (file) => {
      const raw = await readJson(join(modesDir, file))
      const id = file.replace(/\.json$/, '')
      const extension = raw.$extensions?.ezhana ?? {}
      return {
        id,
        label: extension.label ?? titleCase(id),
        colorScheme: extension.colorScheme,
        tokens: stripRootMeta(raw),
      }
    }),
  )

  modes.sort((a, b) => {
    const rank = (mode) => {
      const index = FALLBACK_MODE_ORDER.indexOf(mode.id)
      return index === -1 ? FALLBACK_MODE_ORDER.length : index
    }
    return rank(a) - rank(b) || a.id.localeCompare(b.id)
  })

  const defaultMode = modes.some((mode) => mode.id === 'light') ? 'light' : modes[0].id

  return { primitiveTokens, semanticBase, modes, defaultMode }
}

const validateSources = ({ primitiveTokens, semanticBase, modes }) => {
  const primitivePaths = new Set(tokenPaths(primitiveTokens))
  const basePaths = new Set(tokenPaths(semanticBase))
  const modePathSets = new Map(modes.map((mode) => [mode.id, new Set(tokenPaths(mode.tokens))]))

  const referenceMode = modes[0]
  const referencePaths = modePathSets.get(referenceMode.id)
  for (const mode of modes.slice(1)) {
    const paths = modePathSets.get(mode.id)
    const missing = [...referencePaths].filter((path) => !paths.has(path))
    const extra = [...paths].filter((path) => !referencePaths.has(path))
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `Color mode "${mode.id}" is out of sync with "${referenceMode.id}".\n` +
          (missing.length > 0 ? `  Missing: ${missing.join(', ')}\n` : '') +
          (extra.length > 0 ? `  Extra: ${extra.join(', ')}\n` : '') +
          `Add the same semantic tokens to tokens/semantic/modes/${mode.id}.json.`,
      )
    }
  }

  const validateReferences = (tree, label) => {
    for (const reference of collectReferences(tree)) {
      if (!reference.startsWith(`${PRIMITIVE_ROOT}.`)) {
        throw new Error(
          `${label} may only reference primitive tokens ("${PRIMITIVE_ROOT}."), ` +
            `but found "{${reference}}".`,
        )
      }
      if (!primitivePaths.has(reference)) {
        throw new Error(`${label} references unknown primitive token "{${reference}}".`)
      }
    }
  }

  validateReferences(semanticBase, 'tokens/semantic/base.json')
  for (const mode of modes) {
    validateReferences(mode.tokens, `tokens/semantic/modes/${mode.id}.json`)
  }

  for (const path of REQUIRED_THEME_BASE) {
    if (!basePaths.has(path)) {
      throw new Error(`Required theme token "${path}" is missing from tokens/semantic/base.json.`)
    }
  }
  for (const mode of modes) {
    for (const path of REQUIRED_THEME_MODE) {
      if (!modePathSets.get(mode.id).has(path)) {
        throw new Error(
          `Required theme token "${path}" is missing from tokens/semantic/modes/${mode.id}.json.`,
        )
      }
    }
  }

  return { primitivePaths, basePaths, modePathSets }
}

/* Style Dictionary --------------------------------------------------------- */

StyleDictionary.registerFormat({
  name: 'ezhana/json-flat',
  format: ({ dictionary }) => {
    const entries = {}
    for (const token of dictionary.allTokens) {
      entries[token.path.join('.')] = {
        value: token.$value ?? token.value,
        type: token.$type ?? token.type,
      }
    }
    return `${JSON.stringify(entries, null, 2)}\n`
  },
})

const formatFiles = async (tokens, files) => {
  const styleDictionary = new StyleDictionary(
    {
      tokens: structuredClone(tokens),
      log: { verbosity: 'silent' },
      platforms: { build: { transforms: TRANSFORMS, files } },
    },
    { init: false },
  )
  await styleDictionary.init()
  const formatted = await styleDictionary.formatPlatform('build')
  return Object.fromEntries(formatted.map((file) => [file.destination, file.output]))
}

const cssFile = (destination, selector, filter) => ({
  destination,
  format: 'css/variables',
  ...(filter ? { filter } : {}),
  options: {
    selector,
    outputReferences: true,
    showFileHeader: false,
    formatting: { indentation: '  ', commentStyle: 'none' },
  },
})

const filterByPaths = (paths) => (token) => paths.has(token.path.join('.'))

const resolveFlat = async (tokens) => {
  const built = await formatFiles(tokens, [
    { destination: 'tokens.json', format: 'ezhana/json-flat' },
  ])
  return JSON.parse(built['tokens.json'])
}

/* Artifacts ---------------------------------------------------------------- */

const buildArtifacts = async ({ primitiveTokens, semanticBase, modes, defaultMode }, validated) => {
  const { basePaths, modePathSets } = validated

  const primitives = await resolveFlat(mergeTrees([primitiveTokens], 'primitive'))

  // Resolved default-theme values per mode: what theme packages are built against.
  const resolvedSemantic = {}
  for (const mode of modes) {
    const tokens = mergeTrees([primitiveTokens, semanticBase, mode.tokens], `mode "${mode.id}"`)
    const all = await resolveFlat(tokens)
    resolvedSemantic[mode.id] = Object.fromEntries(
      Object.entries(all).filter(([path]) => !path.startsWith(`${PRIMITIVE_ROOT}.`)),
    )
  }

  const primitiveCss = (
    await formatFiles(primitiveTokens, [
      cssFile('primitive.css', ':root', (token) => token.path[0] === PRIMITIVE_ROOT),
    ])
  )['primitive.css']

  const baseCss = (
    await formatFiles(mergeTrees([primitiveTokens, semanticBase], 'semantic base'), [
      cssFile('base.css', ':root', filterByPaths(basePaths)),
    ])
  )['base.css']

  const modeCss = {}
  for (const mode of modes) {
    const tokens = mergeTrees([primitiveTokens, semanticBase, mode.tokens], `mode "${mode.id}"`)
    const paths = modePathSets.get(mode.id)
    const css = {}

    if (mode.id === defaultMode) {
      css.explicit = (
        await formatFiles(tokens, [cssFile('mode.css', ':root', filterByPaths(paths))])
      )['mode.css']
    } else {
      css.explicit = (
        await formatFiles(tokens, [
          cssFile('mode.css', `:root[data-color-mode="${mode.id}"]`, filterByPaths(paths)),
        ])
      )['mode.css']
    }

    if (mode.id !== defaultMode && mode.colorScheme === 'dark') {
      css.system = (
        await formatFiles(tokens, [
          cssFile(
            'mode-system.css',
            ['@media (prefers-color-scheme: dark)', ':root:not([data-color-mode])'],
            filterByPaths(paths),
          ),
        ])
      )['mode-system.css']
    }

    modeCss[mode.id] = css
  }

  return { primitives, resolvedSemantic, primitiveCss, baseCss, modeCss }
}

const banner = `/**
 * ${PACKAGE_NAME} — generated core stylesheet. Do not edit; run "pnpm build" instead.
 *
 * Primitive tokens (--primitive-*): raw, context-free values. Application code uses the semantic
 * tokens (--color-*, --font-*, --radius-*, ...) below.
 *
 * Color mode is selected by data-color-mode; when the attribute is absent the stylesheet follows
 * the operating system through prefers-color-scheme, so it works without JavaScript.
 *
 *   <html data-color-mode="light">  explicit light
 *   <html data-color-mode="dark">   explicit dark
 *   <html>                          system
 *
 * All tokens are emitted into the "design-tokens" cascade layer so unlayered application CSS can
 * override a token without specificity battles.
 */
`

const assembleCss = (artifacts, { modes, defaultMode }) => {
  const sections = []

  sections.push(
    '/* Primitive tokens: raw values, independent of theme. */',
    artifacts.primitiveCss.trim(),
  )
  sections.push(
    '/* Semantic tokens: default theme, mode-independent values. */',
    artifacts.baseCss.trim(),
  )

  for (const mode of modes) {
    const css = artifacts.modeCss[mode.id]
    const selector = mode.id === defaultMode ? ':root' : `:root[data-color-mode="${mode.id}"]`
    sections.push(
      `/* Semantic tokens: ${mode.label.toLowerCase()} color mode (default theme, ${selector}). */`,
      css.explicit.trim(),
    )
    if (css.system) {
      sections.push(
        `/* Semantic tokens: ${mode.label.toLowerCase()} color mode, system preference. */`,
        css.system.trim(),
      )
    }
  }

  const colorSchemeRules = [':root {\n  color-scheme: light dark;\n}']
  for (const mode of modes) {
    if (mode.colorScheme && mode.id !== defaultMode) {
      colorSchemeRules.push(
        `:root[data-color-mode="${mode.id}"] {\n  color-scheme: ${mode.colorScheme};\n}`,
      )
    }
  }
  if (modes.some((mode) => mode.id === 'light')) {
    colorSchemeRules.push(':root[data-color-mode="light"] {\n  color-scheme: light;\n}')
  }
  sections.push(
    '/* Native UI color scheme for form controls and scrollbars. */',
    colorSchemeRules.join('\n\n'),
  )

  return `${banner}\n@layer design-tokens;\n\n@layer design-tokens {\n${sections
    .join('\n\n')
    .split('\n')
    .map((line) => (line.length > 0 ? `  ${line}` : line))
    .join('\n')}\n}\n`
}

const createMetadata = ({ modes, defaultMode }, artifacts) => {
  const modeIds = modes.map((mode) => mode.id)
  const modeLabels = Object.fromEntries(modes.map((mode) => [mode.id, mode.label]))
  const primitiveTokenNames = Object.keys(artifacts.primitives).map(cssVariableName).sort()
  const semanticTokenNames = Object.keys(artifacts.resolvedSemantic[defaultMode])
    .map(cssVariableName)
    .sort()

  const js = `/**
 * ${PACKAGE_NAME} — generated metadata. Do not edit; run "pnpm build" instead.
 */

export const defaultTheme = 'default'

export const modes = Object.freeze(${JSON.stringify(modeIds)})

export const modeLabels = Object.freeze(${JSON.stringify(modeLabels, null, 2)})

export const defaultThemeDefinition = Object.freeze({
  id: defaultTheme,
  label: 'Default',
  modes,
})

export const primitiveTokenNames = Object.freeze(${JSON.stringify(primitiveTokenNames, null, 2)})

export const semanticTokenNames = Object.freeze(${JSON.stringify(semanticTokenNames, null, 2)})

export const tokenNames = Object.freeze([...primitiveTokenNames, ...semanticTokenNames])
`

  const literalUnion = (values) => values.map((value) => JSON.stringify(value)).join(' | ')
  const dts = `/**
 * ${PACKAGE_NAME} — generated metadata types. Do not edit; run "pnpm build" instead.
 */

/** Structural theme metadata shared by every theme package and the optional runtime. */
export type ThemeDefinition<Id extends string = string, Mode extends string = string> = {
  readonly id: Id
  readonly label: string
  readonly modes: readonly Mode[]
}

export type Mode = ${literalUnion(modeIds)}

export type ModePreference = Mode | 'system'

export type PrimitiveTokenName = ${literalUnion(primitiveTokenNames)}

export type SemanticTokenName = ${literalUnion(semanticTokenNames)}

export type TokenName = PrimitiveTokenName | SemanticTokenName

export declare const defaultTheme: 'default'

export declare const modes: readonly Mode[]

export declare const modeLabels: Readonly<Record<Mode, string>>

export declare const defaultThemeDefinition: ThemeDefinition<'default', Mode>

export declare const primitiveTokenNames: readonly PrimitiveTokenName[]

export declare const semanticTokenNames: readonly SemanticTokenName[]

export declare const tokenNames: readonly TokenName[]
`

  return { js, dts, tokenCount: primitiveTokenNames.length + semanticTokenNames.length }
}

const createContract = ({ modes, defaultMode }, { primitivePaths, basePaths, modePathSets }) => ({
  version: CONTRACT_VERSION,
  generator: PACKAGE_NAME,
  modes: modes.map((mode) => ({
    id: mode.id,
    label: mode.label,
    ...(mode.colorScheme ? { colorScheme: mode.colorScheme } : {}),
  })),
  defaultMode,
  required: { base: [...REQUIRED_THEME_BASE], mode: [...REQUIRED_THEME_MODE] },
  semanticTokens: {
    base: [...basePaths].sort(),
    modes: Object.fromEntries(
      modes.map((mode) => [mode.id, [...modePathSets.get(mode.id)].sort()]),
    ),
  },
  primitiveTokens: [...primitivePaths].sort(),
  contrast: { min: CONTRAST_MIN, pairs: CONTRAST_PAIRS.map((pair) => [...pair]) },
  themeNamespace: THEME_NAMESPACE,
  themeIdPattern: THEME_ID_PATTERN,
})

const main = async () => {
  const sources = await loadSources()
  const validated = validateSources(sources)
  const artifacts = await buildArtifacts(sources, validated)
  const css = assembleCss(artifacts, sources)
  const { js, dts, tokenCount } = createMetadata(sources, artifacts)
  const contract = createContract(sources, validated)

  const tokensJson = {
    generator: PACKAGE_NAME,
    version: CONTRACT_VERSION,
    defaultTheme: 'default',
    modes: sources.modes.map((mode) => mode.id),
    defaultMode: sources.defaultMode,
    modeLabels: Object.fromEntries(sources.modes.map((mode) => [mode.id, mode.label])),
    primitives: artifacts.primitives,
    semantic: artifacts.resolvedSemantic,
  }

  await rm(distDir, { recursive: true, force: true })
  await mkdir(distDir, { recursive: true })

  await Promise.all([
    writeFile(join(distDir, 'style.css'), css),
    writeFile(join(distDir, 'tokens.json'), `${JSON.stringify(tokensJson, null, 2)}\n`),
    writeFile(join(distDir, 'contract.json'), `${JSON.stringify(contract, null, 2)}\n`),
    writeFile(join(distDir, 'index.js'), js),
    writeFile(join(distDir, 'index.d.ts'), dts),
  ])

  output(
    `Core design tokens built: ${sources.modes.length} color modes, ${tokenCount} CSS variables.`,
  )
  output('  dist/style.css, dist/{tokens,contract}.json, dist/index.{js,d.ts}')
}

main().catch((error) => {
  process.stderr.write(`\nDesign token build failed:\n${error.message}\n`)
  process.exitCode = 1
})
