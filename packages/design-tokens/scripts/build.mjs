#!/usr/bin/env node
/**
 * Build the core design token artifacts with Style Dictionary.
 *
 * Outputs (dist/):
 *   css/tokens.css      primitive + semantic CSS custom properties for the default theme
 *   json/core.json      resolved primitive + semantic values per color mode
 *   json/contract.json  machine-readable theme contract consumed by @ezhana/theme-builder
 *   js/index.js         generated metadata (default theme, modes, labels, token names)
 *   js/index.d.ts       literal types for the generated metadata
 *
 * Layer model:
 *   primitive   raw, context-free values (`--primitive-*`); never consumed by product code
 *   semantic    intent tokens (`--color-*`, `--font-*`, ...); the public API for product code
 *   component   (optional, separate package) component-scoped tokens built on semantic tokens
 *
 * Themes are not part of this package. A theme is a separate package that overrides semantic
 * tokens selected by `:root[data-theme="<id>"]`, compiled with `@ezhana/theme-builder` from this
 * package's contract. The default theme is the baseline in tokens/semantic and is emitted on
 * `:root`, so an app that installs only this package is complete.
 *
 * The pipeline is intentionally strict: broken references, mismatched semantic token sets,
 * duplicate declarations or invalid mode metadata fail the build with an actionable error.
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
const PRIMITIVE_ROOT = 'primitive'
const BASE_FILE = 'base'
const PREFERRED_MODE_ORDER = ['light', 'dark']
const TRANSFORMS = ['attribute/cti', 'name/kebab']

/** Version of the contract file consumed by `@ezhana/theme-builder`. Bump on breaking changes. */
const CONTRACT_VERSION = 1

/**
 * The theme contract: the semantic tokens every theme must override. Values that are not listed
 * here inherit the default theme from tokens/semantic, which keeps themes small and predictable.
 * Themes are independent packages, so only this required set is enforced — extra overrides are
 * allowed for themes that want to retheme more of the semantic layer.
 */
const REQUIRED_THEME_BASE = ['font.family.sans', 'font.family.heading', 'radius.control']
const REQUIRED_THEME_MODE = [
  'color.accent',
  'color.accent-hover',
  'color.on-accent',
  'color.accent-subtle',
  'color.accent-border',
  'color.focus-ring',
]

/**
 * Foreground/background pairs the default theme guarantees at WCAG AA. They are published in the
 * contract so theme builders validate the same pairs instead of maintaining their own copy.
 */
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

/** Minimum WCAG 2.2 AA contrast ratio for text. */
const CONTRAST_MIN = 4.5

/** Theme-only token namespace. Theme-private material never becomes a CSS custom property. */
const THEME_NAMESPACE = 'theme'

/** Theme ids are used in `data-theme` and in CSS selectors, so keep them URL/CSS-safe. */
const THEME_ID_PATTERN = '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'

const output = (message) => process.stdout.write(`${message}\n`)

/* -------------------------------------------------------------------------- */
/* Token tree helpers                                                          */
/* -------------------------------------------------------------------------- */

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isToken = (node) =>
  isPlainObject(node) && (Object.hasOwn(node, '$value') || Object.hasOwn(node, 'value'))

/** Drop file-level metadata such as `$description` / `$extensions`. */
const stripRootMeta = (tree) =>
  Object.fromEntries(Object.entries(tree).filter(([key]) => !key.startsWith('$')))

/** Return the dot-joined paths of every token leaf in a token tree. */
const tokenPaths = (tree, prefix = []) => {
  const paths = []
  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith('$')) continue
    const path = [...prefix, key]
    if (isToken(value)) {
      paths.push(path.join('.'))
    } else if (isPlainObject(value)) {
      paths.push(...tokenPaths(value, path))
    }
  }
  return paths
}

/** Merge token trees recursively; token-vs-token collisions are build errors. */
const mergeTrees = (trees, label = 'tokens') => {
  const merge = (target, source) => {
    for (const [key, value] of Object.entries(source)) {
      if (isToken(value)) {
        if (target[key] !== undefined) {
          throw new Error(`Duplicate ${label} "${key}" found while merging token sources.`)
        }
        target[key] = value
      } else if (isPlainObject(value)) {
        if (isToken(target[key])) {
          throw new Error(
            `${label} "${key}" is declared both as a token and as a group; a token cannot also ` +
              'contain other tokens.',
          )
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

/** Collect every `{reference}` used in token $value / value entries. */
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

/* -------------------------------------------------------------------------- */
/* Load token sources                                                          */
/* -------------------------------------------------------------------------- */

const loadTokenSources = async () => {
  const primitiveDir = join(tokensDir, PRIMITIVE_ROOT)
  const primitiveFiles = (await readdir(primitiveDir))
    .filter((file) => file.endsWith('.json'))
    .sort()
  const primitiveTrees = await Promise.all(
    primitiveFiles.map(async (file) => stripRootMeta(await readJson(join(primitiveDir, file)))),
  )
  const primitiveTokens = mergeTrees(primitiveTrees, 'primitive token')

  const semanticDir = join(tokensDir, 'semantic')
  const semanticFiles = (await readdir(semanticDir)).filter((file) => file.endsWith('.json')).sort()
  if (!semanticFiles.includes(`${BASE_FILE}.json`)) {
    throw new Error(`Missing mode-independent semantic tokens: tokens/semantic/${BASE_FILE}.json`)
  }

  const semanticBase = stripRootMeta(await readJson(join(semanticDir, `${BASE_FILE}.json`)))

  const modes = await Promise.all(
    semanticFiles
      .filter((file) => file !== `${BASE_FILE}.json`)
      .map(async (file) => {
        const raw = await readJson(join(semanticDir, file))
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
      const index = PREFERRED_MODE_ORDER.indexOf(mode.id)
      return index === -1 ? PREFERRED_MODE_ORDER.length : index
    }
    return rank(a) - rank(b) || a.id.localeCompare(b.id)
  })

  if (modes.length === 0) throw new Error('No color mode token files found in tokens/semantic.')

  const defaultTheme = 'default'

  return {
    primitiveFiles,
    primitiveTokens,
    semanticBase,
    modes,
    defaultTheme,
    defaultMode: modes.some((mode) => mode.id === 'light') ? 'light' : modes[0].id,
  }
}

/* -------------------------------------------------------------------------- */
/* Contract validation                                                         */
/* -------------------------------------------------------------------------- */

const validateSources = ({ primitiveTokens, semanticBase, modes }) => {
  const primitivePaths = new Set(tokenPaths(primitiveTokens))
  const basePaths = new Set(tokenPaths(semanticBase))
  const modePathSets = new Map(modes.map((mode) => [mode.id, new Set(tokenPaths(mode.tokens))]))

  // Semantic modes must expose exactly the same contract.
  const referenceMode = modes[0]
  const referencePathSet = new Set(modePathSets.get(referenceMode.id))
  for (const mode of modes.slice(1)) {
    const paths = modePathSets.get(mode.id)
    const missing = [...referencePathSet].filter((path) => !paths.has(path))
    const extra = [...paths].filter((path) => !referencePathSet.has(path))
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `Color mode "${mode.id}" is out of sync with "${referenceMode.id}".\n` +
          (missing.length > 0 ? `  Missing: ${missing.join(', ')}\n` : '') +
          (extra.length > 0 ? `  Extra: ${extra.join(', ')}\n` : '') +
          `Add the same semantic tokens to tokens/semantic/${mode.id}.json.`,
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
  for (const mode of modes) validateReferences(mode.tokens, `tokens/semantic/${mode.id}.json`)

  // The required theme contract must exist in the semantic layer, otherwise a theme could not
  // satisfy it and the published contract file would be wrong.
  for (const path of REQUIRED_THEME_BASE) {
    if (!basePaths.has(path)) {
      throw new Error(
        `Required theme token "${path}" is missing from tokens/semantic/base.json. ` +
          'Add it to the semantic layer or remove it from the theme contract.',
      )
    }
  }
  for (const mode of modes) {
    for (const path of REQUIRED_THEME_MODE) {
      if (!modePathSets.get(mode.id).has(path)) {
        throw new Error(
          `Required theme token "${path}" is missing from tokens/semantic/${mode.id}.json.`,
        )
      }
    }
  }

  return { primitivePaths, basePaths, modePathSets }
}

/* -------------------------------------------------------------------------- */
/* Style Dictionary builds                                                     */
/* -------------------------------------------------------------------------- */

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

const silentLog = { verbosity: 'silent' }

/**
 * Run one Style Dictionary instance and capture the requested file outputs in memory.
 *
 * @param {object} tokens merged token tree
 * @param {Array<{destination: string, format: string, filter?: Function, options?: object}>} files
 * @returns {Promise<Record<string, string>>} map of destination -> content
 */
const formatFiles = async (tokens, files) => {
  const styleDictionary = new StyleDictionary(
    {
      tokens: structuredClone(tokens),
      log: silentLog,
      platforms: {
        build: {
          transforms: TRANSFORMS,
          files,
        },
      },
    },
    { init: false },
  )
  // The constructor's internal init promise is not safe to await directly when
  // the config is invalid; initialise explicitly so errors can be handled.
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

const buildArtifacts = async (sources, validated) => {
  const { primitiveTokens, semanticBase, modes, defaultMode } = sources
  const { basePaths, modePathSets } = validated

  // Resolved semantic values for the default theme, one entry per color mode. This is the
  // baseline themes are merged onto, and what the contrast checks and tooling consume.
  const resolvedSemantic = {}
  for (const mode of modes) {
    const tokens = mergeTrees(
      [primitiveTokens, semanticBase, mode.tokens],
      `semantic mode "${mode.id}"`,
    )
    const built = await formatFiles(tokens, [
      { destination: 'mode.json', format: 'ezhana/json-flat' },
    ])
    const all = JSON.parse(built['mode.json'])
    resolvedSemantic[mode.id] = Object.fromEntries(
      Object.entries(all).filter(([path]) => !path.startsWith(`${PRIMITIVE_ROOT}.`)),
    )
  }

  const resolvedPrimitives = await formatFiles(mergeTrees([primitiveTokens], 'primitive'), [
    { destination: 'primitive.json', format: 'ezhana/json-flat' },
  ])
  const primitives = JSON.parse(resolvedPrimitives['primitive.json'])

  // Primitive layer (theme-agnostic), emitted once.
  const primitiveBuilt = await formatFiles(primitiveTokens, [
    cssFile('primitive.css', ':root', (token) => token.path[0] === PRIMITIVE_ROOT),
  ])

  // Semantic layer, mode-independent defaults.
  const baseBuilt = await formatFiles(
    mergeTrees([primitiveTokens, semanticBase], 'semantic base'),
    [cssFile('base.css', ':root', filterByPaths(basePaths))],
  )

  // Semantic layer per color mode: the default mode lives on :root (no-JS fallback), other modes
  // are selected explicitly by data-color-mode and, for dark modes, by prefers-color-scheme when
  // the data-color-mode attribute is absent.
  const modeCss = {}
  for (const mode of modes) {
    const tokens = mergeTrees(
      [primitiveTokens, semanticBase, mode.tokens],
      `semantic mode "${mode.id}"`,
    )
    const modePaths = modePathSets.get(mode.id)
    const css = {}
    if (mode.id === defaultMode) {
      const built = await formatFiles(tokens, [
        cssFile('mode.css', ':root', filterByPaths(modePaths)),
      ])
      css.explicit = built['mode.css']
    } else {
      const explicit = await formatFiles(tokens, [
        cssFile('mode.css', `[data-color-mode="${mode.id}"]`, filterByPaths(modePaths)),
      ])
      css.explicit = explicit['mode.css']
      if (mode.colorScheme === 'dark') {
        const system = await formatFiles(tokens, [
          cssFile(
            'mode-system.css',
            [
              '@media (prefers-color-scheme: dark)',
              `:root:not([data-color-mode]), :root[data-color-mode="${mode.id}"]`,
            ],
            filterByPaths(modePaths),
          ),
        ])
        css.system = system['mode-system.css']
      }
    }
    modeCss[mode.id] = css
  }

  return {
    primitives,
    resolvedSemantic,
    primitiveCss: primitiveBuilt['primitive.css'],
    baseCss: baseBuilt['base.css'],
    modeCss,
  }
}

/* -------------------------------------------------------------------------- */
/* CSS assembly                                                                */
/* -------------------------------------------------------------------------- */

const banner = `/**
 * ${PACKAGE_NAME} — generated core CSS custom properties.
 *
 * Layers:
 *   primitive  --primitive-*  raw palette / scales, context-free and never themed
 *   semantic   --color-*, --font-*, --radius-*, ...  intent tokens; product code uses these
 *   component  (optional)     component tokens in a separate package, built on semantic tokens
 *
 * This stylesheet contains the default theme only. A theme is a separate package that overrides
 * semantic tokens selected by [data-theme="<id>"]; see the theme contract in
 * dist/json/contract.json.
 *
 * The color mode is selected by the optional data-color-mode attribute. When the attribute is
 * absent the stylesheet follows the operating-system preference via prefers-color-scheme.
 *
 *   <html data-theme="default">                          system color mode
 *   <html data-theme="cerulean" data-color-mode="dark">  explicit color mode
 *
 * The "design-tokens" cascade layer lets unlayered application CSS override a token without
 * specificity battles. Do not edit this file directly; run "pnpm build" instead.
 */
`

const assembleCss = (artifacts, sources) => {
  const { modes, defaultMode } = sources
  const sections = []

  sections.push(
    '/* Primitive tokens: raw values, independent of theme. */',
    artifacts.primitiveCss.trim(),
  )
  sections.push('/* Semantic tokens: default theme, mode-independent. */', artifacts.baseCss.trim())

  for (const mode of modes) {
    const css = artifacts.modeCss[mode.id]
    sections.push(
      `/* Semantic tokens: ${mode.label.toLowerCase()} color mode (default theme, ${
        mode.id === defaultMode ? ':root base values' : `data-color-mode="${mode.id}"`
      }). */`,
      css.explicit.trim(),
    )
    if (css.system) {
      sections.push(
        `/* Semantic tokens: ${mode.label.toLowerCase()} color mode, system preference. */`,
        css.system.trim(),
      )
    }
  }

  const colorSchemes = [...new Set(modes.map((mode) => mode.colorScheme).filter(Boolean))]
  const colorSchemeRules = [
    `:root {\n  color-scheme: ${colorSchemes.length > 0 ? colorSchemes.join(' ') : 'light dark'};\n}`,
  ]
  for (const mode of modes) {
    if (mode.colorScheme) {
      colorSchemeRules.push(
        `[data-color-mode="${mode.id}"] {\n  color-scheme: ${mode.colorScheme};\n}`,
      )
    }
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

/* -------------------------------------------------------------------------- */
/* Metadata and contract artifacts                                             */
/* -------------------------------------------------------------------------- */

const collectTokenNames = (resolvedSemantic, primitives) => ({
  primitive: Object.keys(primitives).map(cssVariableName).sort(),
  semantic: Object.keys(resolvedSemantic).map(cssVariableName).sort(),
})

const createMetadataArtifacts = (sources, artifacts) => {
  const { modes, defaultTheme, defaultMode } = sources
  const modeIds = modes.map((mode) => mode.id)
  const modeLabels = Object.fromEntries(modes.map((mode) => [mode.id, mode.label]))
  const tokenNames = collectTokenNames(
    artifacts.resolvedSemantic[defaultMode],
    artifacts.primitives,
  )

  const js = `/**
 * ${PACKAGE_NAME} — generated metadata.
 * Do not edit directly; run "pnpm build" instead.
 */

export const defaultTheme = ${JSON.stringify(defaultTheme)}

export const modes = Object.freeze(${JSON.stringify(modeIds)})

export const modeLabels = Object.freeze(${JSON.stringify(modeLabels, null, 2)})

export const defaultThemeDefinition = Object.freeze({
  id: defaultTheme,
  label: 'Default',
  modes,
})

export const primitiveTokenNames = Object.freeze(${JSON.stringify(tokenNames.primitive, null, 2)})

export const semanticTokenNames = Object.freeze(${JSON.stringify(tokenNames.semantic, null, 2)})

export const tokenNames = Object.freeze([...primitiveTokenNames, ...semanticTokenNames])
`

  const literalUnion = (values) => values.map((value) => JSON.stringify(value)).join(' | ')
  const dts = `/**
 * ${PACKAGE_NAME} — generated metadata types.
 * Do not edit directly; run "pnpm build" instead.
 */

/**
 * A theme package identifies itself with this shape. Themes are separate packages, so the
 * declaration is structural: \`@ezhana/design-theme-*\` packages declare the same object with a
 * literal id, and \`defineThemeRegistry\` from \`@ezhana/theme\` accepts them.
 */
export type ThemeDefinition<Id extends string = string, Mode extends string = string> = {
  readonly id: Id
  readonly label: string
  readonly modes: readonly Mode[]
}

export type Mode = ${literalUnion(modeIds)}

export type ModePreference = Mode | 'system'

export type PrimitiveTokenName = ${literalUnion(tokenNames.primitive)}

export type SemanticTokenName = ${literalUnion(tokenNames.semantic)}

export type TokenName = PrimitiveTokenName | SemanticTokenName

export declare const defaultTheme: ${JSON.stringify(defaultTheme)}

export declare const defaultThemeDefinition: ThemeDefinition<${JSON.stringify(defaultTheme)}, Mode>

export declare const modes: readonly Mode[]

export declare const modeLabels: Readonly<Record<Mode, string>>

export declare const primitiveTokenNames: readonly PrimitiveTokenName[]

export declare const semanticTokenNames: readonly SemanticTokenName[]

export declare const tokenNames: readonly TokenName[]
`

  return { js, dts, tokenNames }
}

const createContract = (sources, validated) => {
  const { modes, defaultMode } = sources
  const { primitivePaths, basePaths, modePathSets } = validated

  return {
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
    contrast: {
      min: CONTRAST_MIN,
      pairs: CONTRAST_PAIRS.map((pair) => [...pair]),
    },
    themeNamespace: THEME_NAMESPACE,
    themeIdPattern: THEME_ID_PATTERN,
  }
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

const main = async () => {
  const sources = await loadTokenSources()
  const validated = validateSources(sources)
  const artifacts = await buildArtifacts(sources, validated)
  const css = assembleCss(artifacts, sources)
  const { js, dts, tokenNames } = createMetadataArtifacts(sources, artifacts)
  const contract = createContract(sources, validated)

  const coreJson = {
    generator: PACKAGE_NAME,
    version: CONTRACT_VERSION,
    defaultTheme: sources.defaultTheme,
    modes: sources.modes.map((mode) => mode.id),
    defaultMode: sources.defaultMode,
    modeLabels: Object.fromEntries(sources.modes.map((mode) => [mode.id, mode.label])),
    primitives: artifacts.primitives,
    semantic: artifacts.resolvedSemantic,
  }

  await rm(distDir, { recursive: true, force: true })
  await mkdir(join(distDir, 'css'), { recursive: true })
  await mkdir(join(distDir, 'json'), { recursive: true })
  await mkdir(join(distDir, 'js'), { recursive: true })

  await Promise.all([
    writeFile(join(distDir, 'css', 'tokens.css'), css),
    writeFile(join(distDir, 'json', 'core.json'), `${JSON.stringify(coreJson, null, 2)}\n`),
    writeFile(join(distDir, 'json', 'contract.json'), `${JSON.stringify(contract, null, 2)}\n`),
    writeFile(join(distDir, 'js', 'index.js'), js),
    writeFile(join(distDir, 'js', 'index.d.ts'), dts),
  ])

  output(
    `Core design tokens built: ${sources.modes.length} color modes, ` +
      `${tokenNames.primitive.length + tokenNames.semantic.length} CSS variables ` +
      `(${tokenNames.primitive.length} primitive + ${tokenNames.semantic.length} semantic).`,
  )
  output('  dist/css/tokens.css, dist/json/{core,contract}.json, dist/js/index.{js,d.ts}')
}

main().catch((error) => {
  process.stderr.write(`\nDesign token build failed:\n${error.message}\n`)
  process.exitCode = 1
})
