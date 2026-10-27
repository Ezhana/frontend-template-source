#!/usr/bin/env node
/**
 * Build the design token artifacts with Style Dictionary.
 *
 * Outputs (dist/):
 *   css/tokens.css      primitive + semantic CSS custom properties, with theme overrides
 *   json/themes.json    resolved semantic values for every theme × color-mode combination
 *   js/index.js         generated theme metadata (themes, modes, labels, token names)
 *   js/index.d.ts       literal types for the generated metadata
 *
 * Layer model:
 *   primitive   raw, context-free values (`--primitive-*`); never consumed by product code
 *   semantic    intent tokens (`--color-*`, `--font-*`, ...); the public API for product code
 *   component   (optional, separate package) component-scoped tokens built on semantic tokens
 *
 * Themes are not a token layer: they are per-theme (theme identity × color-mode) overrides of semantic
 * tokens. The default theme lives in tokens/semantic; additional themes live in tokens/themes.
 *
 * The pipeline is intentionally strict: broken references, missing theme overrides, mismatched
 * semantic token sets, duplicate overrides or invalid theme metadata all fail the build with an
 * actionable error.
 */
import { readdir, readFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import StyleDictionary from 'style-dictionary'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const tokensDir = join(packageRoot, 'tokens')
const distDir = join(packageRoot, 'dist')

const PRIMITIVE_ROOT = 'primitive'
const BASE_FILE = 'base'
const THEMES_DIR = 'themes'
const PREFERRED_MODE_ORDER = ['light', 'dark']
const TRANSFORMS = ['attribute/cti', 'name/kebab']

/**
 * The theme contract: the semantic tokens every theme must override. Values that are not listed
 * here inherit the default theme from tokens/semantic, which keeps themes small and predictable.
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
        if (isToken(target[key])) {
          throw new Error(`Duplicate ${label} "${key}" found while merging token sources.`)
        }
        target[key] = value
      } else if (isPlainObject(value)) {
        target[key] = merge(isPlainObject(target[key]) ? target[key] : {}, value)
      } else {
        target[key] = value
      }
    }
    return target
  }
  return trees.reduce((result, tree) => merge(result, tree), {})
}

/** Merge token trees where later token leaves intentionally override earlier ones (themes). */
const mergeOverrides = (trees) => {
  const merge = (target, source) => {
    for (const [key, value] of Object.entries(source)) {
      if (isToken(value)) {
        target[key] = value
      } else if (isPlainObject(value)) {
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

  const semanticBaseRaw = await readJson(join(semanticDir, `${BASE_FILE}.json`))
  const semanticBase = stripRootMeta(semanticBaseRaw)

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

  const themesDir = join(tokensDir, THEMES_DIR)
  const themeFiles = (await readdir(themesDir)).filter((file) => file.endsWith('.json')).sort()
  const themes = await Promise.all(
    themeFiles.map(async (file) => {
      const raw = await readJson(join(themesDir, file))
      const id = file.replace(/\.json$/, '')
      const sections = stripRootMeta(raw)
      const theme = {
        id,
        label: raw.$extensions?.ezhana?.label ?? titleCase(id),
        base: sections[BASE_FILE] ?? {},
        modes: {},
      }
      for (const [mode, modeTree] of Object.entries(sections)) {
        if (mode === BASE_FILE) continue
        theme.modes[mode] = modeTree
      }
      return theme
    }),
  )

  // The "default" theme is the fallback theme: it lives directly in tokens/semantic and is
  // always first in generated metadata so switcher UIs present it first.
  const availableThemes = [
    { id: 'default', label: 'Default' },
    ...themes.sort((a, b) => a.id.localeCompare(b.id)),
  ]

  return {
    primitiveFiles,
    primitiveTokens,
    semanticBase,
    modes,
    themes,
    availableThemes,
    defaultTheme: 'default',
    defaultMode: modes.some((mode) => mode.id === 'light') ? 'light' : modes[0].id,
  }
}

/* -------------------------------------------------------------------------- */
/* Contract validation                                                         */
/* -------------------------------------------------------------------------- */

const validateSources = ({ primitiveTokens, semanticBase, modes, themes }) => {
  const primitivePaths = new Set(tokenPaths(primitiveTokens))
  const basePaths = new Set(tokenPaths(semanticBase))
  const modePathSets = new Map(modes.map((mode) => [mode.id, new Set(tokenPaths(mode.tokens))]))
  const modeIdSet = new Set(modes.map((mode) => mode.id))

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

  const allowedThemeSections = new Set([BASE_FILE, ...modeIdSet])
  const themeBasePathSets = new Map()
  const themeModePathSets = new Map()
  let referenceBaseSet = null
  let referenceModeSets = null

  for (const theme of themes) {
    const label = `tokens/${THEMES_DIR}/${theme.id}.json`
    if (theme.id === 'default') {
      throw new Error(
        `${label} must not be called "default": the default theme lives in tokens/semantic.`,
      )
    }

    for (const section of Object.keys(theme.modes)) {
      if (!allowedThemeSections.has(section)) {
        throw new Error(
          `${label} defines section "${section}", which is not a configured color mode. ` +
            `Expected base + ${[...modeIdSet].join(', ')}.`,
        )
      }
    }
    for (const mode of modes) {
      if (!theme.modes[mode.id]) {
        throw new Error(
          `${label} is missing overrides for color mode "${mode.id}". ` +
            `Add a "${mode.id}" block with the theme contract tokens.`,
        )
      }
    }

    validateReferences(theme.base, label)
    for (const mode of modes) validateReferences(theme.modes[mode.id], label)

    const baseThemePaths = new Set(tokenPaths(theme.base))
    const modeThemePaths = new Map(
      modes.map((mode) => [mode.id, new Set(tokenPaths(theme.modes[mode.id]))]),
    )

    for (const required of REQUIRED_THEME_BASE) {
      if (!baseThemePaths.has(required)) {
        throw new Error(`${label} is missing required theme token "${required}" in the base block.`)
      }
      if (!basePaths.has(required)) {
        throw new Error(`${label} overrides "${required}", which is not a semantic base token.`)
      }
    }
    for (const path of baseThemePaths) {
      if (!basePaths.has(path)) {
        throw new Error(`${label} base block overrides "${path}", which is not a semantic token.`)
      }
    }

    for (const mode of modes) {
      const paths = modeThemePaths.get(mode.id)
      for (const required of REQUIRED_THEME_MODE) {
        if (!paths.has(required)) {
          throw new Error(
            `${label} is missing required theme token "${required}" in the "${mode.id}" block.`,
          )
        }
        if (!modePathSets.get(mode.id).has(required)) {
          throw new Error(
            `${label} overrides "${required}", which is not a semantic token in mode "${mode.id}".`,
          )
        }
      }
      for (const path of paths) {
        if (!modePathSets.get(mode.id).has(path)) {
          throw new Error(
            `${label} "${mode.id}" block overrides "${path}", which is not a semantic token.`,
          )
        }
      }
    }

    // All themes must satisfy exactly the same contract (same override set), so adding a theme
    // can never silently change which semantic tokens are themed.
    if (referenceBaseSet === null) {
      referenceBaseSet = baseThemePaths
      referenceModeSets = new Map(modeThemePaths)
    } else {
      const diff = (a, b) => [...a].filter((path) => !b.has(path))
      const baseMissing = diff(referenceBaseSet, baseThemePaths)
      const baseExtra = diff(baseThemePaths, referenceBaseSet)
      if (baseMissing.length > 0 || baseExtra.length > 0) {
        throw new Error(
          `Theme "${theme.id}" base overrides are out of sync with other themes.\n` +
            (baseMissing.length > 0 ? `  Missing: ${baseMissing.join(', ')}\n` : '') +
            (baseExtra.length > 0 ? `  Extra: ${baseExtra.join(', ')}\n` : ''),
        )
      }
      for (const mode of modes) {
        const paths = modeThemePaths.get(mode.id)
        const expected = referenceModeSets.get(mode.id)
        const missing = diff(expected, paths)
        const extra = diff(paths, expected)
        if (missing.length > 0 || extra.length > 0) {
          throw new Error(
            `Theme "${theme.id}" ${mode.id} overrides are out of sync with other themes.\n` +
              (missing.length > 0 ? `  Missing: ${missing.join(', ')}\n` : '') +
              (extra.length > 0 ? `  Extra: ${extra.join(', ')}\n` : ''),
          )
        }
      }
    }

    themeBasePathSets.set(theme.id, baseThemePaths)
    themeModePathSets.set(theme.id, modeThemePaths)
  }

  return {
    primitivePaths,
    basePaths,
    modePathSets,
    themeBasePathSets,
    themeModePathSets,
  }
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
  const { primitiveTokens, semanticBase, modes, themes, availableThemes, defaultMode } = sources
  const { basePaths, modePathSets, themeBasePathSets, themeModePathSets } = validated

  const resolvedThemes = {}
  for (const themeMeta of availableThemes) {
    resolvedThemes[themeMeta.id] = {}
    const override = themes.find((candidate) => candidate.id === themeMeta.id)
    for (const mode of modes) {
      const rawTokens = [
        primitiveTokens,
        semanticBase,
        mode.tokens,
        ...(override ? [override.base, override.modes[mode.id]] : []),
      ]
      const tokens = override
        ? mergeOverrides(rawTokens)
        : mergeTrees(rawTokens, `theme "${themeMeta.id}" / mode "${mode.id}"`)
      const built = await formatFiles(tokens, [
        { destination: 'theme.json', format: 'ezhana/json-flat' },
      ])
      resolvedThemes[themeMeta.id][mode.id] = JSON.parse(built['theme.json'])
    }
  }

  // Primitive layer (theme-agnostic), emitted once.
  const primitiveBuilt = await formatFiles(primitiveTokens, [
    cssFile('primitive.css', ':root', (token) => token.path[0] === PRIMITIVE_ROOT),
  ])
  const primitiveCss = primitiveBuilt['primitive.css']

  // Semantic layer, mode-independent defaults.
  const baseBuilt = await formatFiles(
    mergeTrees([primitiveTokens, semanticBase], 'semantic base'),
    [cssFile('base.css', ':root', filterByPaths(basePaths))],
  )
  const baseCss = baseBuilt['base.css']

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
              ':root:not([data-color-mode]), :root[data-color-mode="dark"]',
            ],
            filterByPaths(modePaths),
          ),
        ])
        css.system = system['mode-system.css']
      }
    }
    modeCss[mode.id] = css
  }

  // Theme overrides. The default theme values live in tokens/semantic, so only named themes are
  // emitted. Mode-independent overrides and default-mode overrides share the [data-theme] block.
  const themeCss = {}
  for (const theme of themes) {
    const themeBasePaths = themeBasePathSets.get(theme.id)
    const themeModePaths = themeModePathSets.get(theme.id)
    const defaultModePaths = themeModePaths.get(defaultMode)

    const baseTokens = mergeTrees(
      [primitiveTokens, theme.base, theme.modes[defaultMode]],
      `theme "${theme.id}" base + ${defaultMode}`,
    )
    const baseBuilt = await formatFiles(baseTokens, [
      cssFile(
        'theme-base.css',
        `[data-theme="${theme.id}"]`,
        filterByPaths(new Set([...themeBasePaths, ...defaultModePaths])),
      ),
    ])

    themeCss[theme.id] = { base: baseBuilt['theme-base.css'], modes: {} }

    for (const mode of modes) {
      if (mode.id === defaultMode) continue
      const tokens = mergeTrees(
        [primitiveTokens, theme.modes[mode.id]],
        `theme "${theme.id}" mode "${mode.id}"`,
      )
      const explicit = await formatFiles(tokens, [
        cssFile(
          'theme-mode.css',
          `[data-theme="${theme.id}"][data-color-mode="${mode.id}"]`,
          filterByPaths(themeModePaths.get(mode.id)),
        ),
      ])
      themeCss[theme.id].modes[mode.id] = { explicit: explicit['theme-mode.css'] }
      if (mode.colorScheme === 'dark') {
        const system = await formatFiles(tokens, [
          cssFile(
            'theme-mode-system.css',
            [
              '@media (prefers-color-scheme: dark)',
              `[data-theme="${theme.id}"]:not([data-color-mode]), [data-theme="${theme.id}"][data-color-mode="dark"]`,
            ],
            filterByPaths(themeModePaths.get(mode.id)),
          ),
        ])
        themeCss[theme.id].modes[mode.id].system = system['theme-mode-system.css']
      }
    }
  }

  return { resolvedThemes, primitiveCss, baseCss, modeCss, themeCss }
}

/* -------------------------------------------------------------------------- */
/* CSS assembly                                                                */
/* -------------------------------------------------------------------------- */

const banner = `/**
 * @ezhana/design-tokens — generated CSS custom properties.
 *
 * Layers:
 *   primitive  --primitive-*  raw palette / scales, context-free and never themed
 *   semantic   --color-*, --font-*, --radius-*, ...  intent tokens; product code uses these
 *   component  (optional)     component tokens in a separate package, built on semantic tokens
 *
 * Themes are semantic-token overrides selected by data-theme; the default theme lives on :root.
 * The color mode is selected by the optional data-color-mode attribute. When the attribute is
 * absent the stylesheet follows the operating-system preference via prefers-color-scheme.
 *
 *   <html data-theme="default">                                  system color mode
 *   <html data-theme="cerulean" data-color-mode="dark">          explicit color mode
 *
 * The "design-tokens" cascade layer lets unlayered application CSS override a token without
 * specificity battles. Do not edit this file directly; run "pnpm build:tokens" instead.
 */
`

const assembleCss = (artifacts, sources) => {
  const { modes, themes, defaultMode } = sources
  const defaultModeLabel =
    modes.find((mode) => mode.id === defaultMode)?.label.toLowerCase() ?? defaultMode
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

  for (const theme of themes) {
    const css = artifacts.themeCss[theme.id]
    sections.push(
      `/* Theme overrides: ${theme.id} (base + ${defaultModeLabel}). */`,
      css.base.trim(),
    )
    for (const mode of modes) {
      if (mode.id === defaultMode) continue
      const modeCss = css.modes[mode.id]
      sections.push(
        `/* Theme overrides: ${theme.id} × ${mode.id} (explicit). */`,
        modeCss.explicit.trim(),
      )
      if (modeCss.system) {
        sections.push(
          `/* Theme overrides: ${theme.id} × ${mode.id} (system preference). */`,
          modeCss.system.trim(),
        )
      }
    }
  }

  const colorSchemeRules = [':root {\n  color-scheme: light dark;\n}']
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
/* Theme metadata (JS + TypeScript declarations)                               */
/* -------------------------------------------------------------------------- */

const collectTokenNames = (resolvedTheme) => {
  const groups = { primitive: [], semantic: [] }
  for (const tokenPath of Object.keys(resolvedTheme)) {
    const name = cssVariableName(tokenPath)
    if (tokenPath.startsWith(`${PRIMITIVE_ROOT}.`)) groups.primitive.push(name)
    else groups.semantic.push(name)
  }
  for (const names of Object.values(groups)) names.sort()
  return groups
}

const createJsArtifacts = (sources, { resolvedThemes }) => {
  const { availableThemes, modes, defaultTheme, defaultMode } = sources
  const themeIds = availableThemes.map((theme) => theme.id)
  const modeIds = modes.map((mode) => mode.id)
  const themeLabels = Object.fromEntries(availableThemes.map((theme) => [theme.id, theme.label]))
  const modeLabels = Object.fromEntries(modes.map((mode) => [mode.id, mode.label]))
  const tokenNames = collectTokenNames(resolvedThemes[defaultTheme][defaultMode])

  const js = `/**
 * @ezhana/design-tokens — generated theme metadata.
 * Do not edit directly; run "pnpm build:tokens" instead.
 */

export const themes = ${JSON.stringify(themeIds)}

export const modes = ${JSON.stringify(modeIds)}

export const defaultTheme = ${JSON.stringify(defaultTheme)}

export const themeLabels = ${JSON.stringify(themeLabels, null, 2)}

export const modeLabels = ${JSON.stringify(modeLabels, null, 2)}

export const primitiveTokenNames = ${JSON.stringify(tokenNames.primitive, null, 2)}

export const semanticTokenNames = ${JSON.stringify(tokenNames.semantic, null, 2)}

export const tokenNames = [...primitiveTokenNames, ...semanticTokenNames]
`

  const literalUnion = (values) => values.map((value) => JSON.stringify(value)).join(' | ')
  const dts = `/**
 * @ezhana/design-tokens — generated theme metadata types.
 * Do not edit directly; run "pnpm build:tokens" instead.
 */

export type Theme = ${literalUnion(themeIds)}

export type Mode = ${literalUnion(modeIds)}

export type ModePreference = Mode | 'system'

export type PrimitiveTokenName = ${literalUnion(tokenNames.primitive)}

export type SemanticTokenName = ${literalUnion(tokenNames.semantic)}

export type TokenName = PrimitiveTokenName | SemanticTokenName

export declare const themes: readonly Theme[]

export declare const modes: readonly Mode[]

export declare const defaultTheme: Theme

export declare const themeLabels: Readonly<Record<Theme, string>>

export declare const modeLabels: Readonly<Record<Mode, string>>

export declare const primitiveTokenNames: readonly PrimitiveTokenName[]

export declare const semanticTokenNames: readonly SemanticTokenName[]

export declare const tokenNames: readonly TokenName[]
`

  return { js, dts, tokenNames }
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

const main = async () => {
  const sources = await loadTokenSources()
  const validated = validateSources(sources)
  const artifacts = await buildArtifacts(sources, validated)
  const css = assembleCss(artifacts, sources)
  const { js, dts, tokenNames } = createJsArtifacts(sources, artifacts)

  const themesJson = {
    generator: '@ezhana/design-tokens',
    themes: sources.availableThemes.map((theme) => theme.id),
    modes: sources.modes.map((mode) => mode.id),
    defaultTheme: sources.defaultTheme,
    themeLabels: Object.fromEntries(
      sources.availableThemes.map((theme) => [theme.id, theme.label]),
    ),
    modeLabels: Object.fromEntries(sources.modes.map((mode) => [mode.id, mode.label])),
    resolved: artifacts.resolvedThemes,
  }

  await rm(distDir, { recursive: true, force: true })
  await mkdir(join(distDir, 'css'), { recursive: true })
  await mkdir(join(distDir, 'json'), { recursive: true })
  await mkdir(join(distDir, 'js'), { recursive: true })

  await Promise.all([
    writeFile(join(distDir, 'css', 'tokens.css'), css),
    writeFile(join(distDir, 'json', 'themes.json'), `${JSON.stringify(themesJson, null, 2)}\n`),
    writeFile(join(distDir, 'js', 'index.js'), js),
    writeFile(join(distDir, 'js', 'index.d.ts'), dts),
  ])

  const themeCount = sources.availableThemes.length * sources.modes.length
  output(
    `Design tokens built: ${themeCount} combinations (` +
      `${sources.availableThemes.map((theme) => theme.id).join(', ')} × ` +
      `${sources.modes.map((mode) => mode.id).join(', ')}), ` +
      `${new Set(tokenNames.primitive.concat(tokenNames.semantic)).size} CSS variables.`,
  )
  output('  dist/css/tokens.css, dist/json/themes.json, dist/js/index.{js,d.ts}')
}

main().catch((error) => {
  process.stderr.write(`\nDesign token build failed:\n${error.message}\n`)
  process.exitCode = 1
})
