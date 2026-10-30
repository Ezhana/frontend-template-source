/**
 * The theme build: read the theme sources, validate them against the core contract, resolve every
 * value with Style Dictionary and emit the theme package artifacts.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import StyleDictionary from 'style-dictionary'

import { defineTheme } from './config.js'
import { loadCoreTokens } from './core.js'
import {
  createMetadataDts,
  createMetadataJs,
  createStandaloneCss,
  createStyleEntry,
  createThemeCss,
  createThemeJson,
} from './emit.js'
import { cssVariableName, expandFlatTokens, mergeTrees, readJson, stripRootMeta } from './tokens.js'
import {
  DEFAULT_CONTRAST_PAIRS,
  mergeContrastPairs,
  validateContrast,
  validateTheme,
} from './validate.js'

const TRANSFORMS = ['attribute/cti', 'name/kebab']

/** Incremented per config import so repeated builds in one process pick up edits. */
let configImports = 0

StyleDictionary.registerFormat({
  name: 'ezhana/theme-flat',
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

const resolveFrom = (cwd, path) => (isAbsolute(path) ? path : resolve(cwd, path))

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

/**
 * Read the theme package manifest. A theme build always runs inside a publishable package, so the
 * manifest is required: it names the package in the generated documentation and proves that
 * `@ezhana/design-tokens` and the configured font entries are declared dependencies instead of
 * accidental hoisting.
 *
 * @param {string} cwd
 * @returns {Promise<{ name: string } & Record<string, unknown>>}
 */
const loadThemePackage = async (cwd) => {
  const packageJsonPath = join(cwd, 'package.json')
  let packageJson
  try {
    packageJson = await readJson(packageJsonPath)
  } catch (error) {
    throw new Error(
      `A theme build runs inside a theme package, but "${cwd}" has no package.json. ` +
        'Point the build at the theme package directory.',
      { cause: error },
    )
  }
  if (typeof packageJson.name !== 'string' || packageJson.name.length === 0) {
    throw new Error(`"${packageJsonPath}" has no "name"; a theme must be published as a package.`)
  }
  return packageJson
}

const assertCoreDependency = (packageJson, cwd) => {
  const declared = DEPENDENCY_FIELDS.some((field) =>
    Object.hasOwn(packageJson[field] ?? {}, '@ezhana/design-tokens'),
  )
  if (!declared) {
    throw new Error(
      `The theme package in "${cwd}" does not declare @ezhana/design-tokens. ` +
        'Add it to "dependencies": the theme is built against — and its stylesheet is layered ' +
        'on — that package, so relying on hoisting breaks consumers.',
    )
  }
}

const assertFontsResolve = (fonts, cwd) => {
  if (fonts.length === 0) return
  const require = createRequire(join(cwd, 'package.json'))
  for (const font of fonts) {
    try {
      require.resolve(font)
    } catch (error) {
      throw new Error(
        `The font entry "${font}" cannot be resolved from "${cwd}". ` +
          'Add the font package to the theme package dependencies; the generated "style" entry ' +
          'imports it for consumers.\n' +
          `Cause: ${error.message}`,
        { cause: error },
      )
    }
  }
}

/** Resolve every `{reference}` in a token tree and return a flat `path -> { value, type }` map. */
const resolveTokenTree = async (tree, id) => {
  const styleDictionary = new StyleDictionary(
    {
      tokens: structuredClone(tree),
      log: { verbosity: 'silent' },
      platforms: {
        build: {
          transforms: TRANSFORMS,
          files: [{ destination: 'tokens.json', format: 'ezhana/theme-flat' }],
        },
      },
    },
    { init: false },
  )

  try {
    await styleDictionary.init()
    const [file] = await styleDictionary.formatPlatform('build')
    return JSON.parse(file.output)
  } catch (error) {
    throw new Error(
      `Theme "${id}" could not be resolved by Style Dictionary: ${error.message}\n` +
        'Check its token references: a theme may reference core primitives ("primitive.*") and ' +
        'its own theme tokens ("theme.*") only.',
      { cause: error },
    )
  }
}

const importConfigModule = async (file) => {
  const module = await import(`${pathToFileURL(file).href}?build=${configImports++}`)
  if (module.default === undefined) {
    throw new Error(
      `Theme config "${file}" has no default export. Use \`export default defineTheme({ ... })\`.`,
    )
  }
  return module.default
}

const resolveConfigSource = async (configOrFile, options) => {
  if (typeof configOrFile === 'string' || configOrFile instanceof URL) {
    const file =
      configOrFile instanceof URL
        ? fileURLToPath(configOrFile)
        : resolveFrom(options.cwd ?? process.cwd(), configOrFile)
    const cwd = dirname(file)
    const config = defineTheme(await importConfigModule(file))
    return { config, cwd, configPath: file }
  }

  if (configOrFile === null || typeof configOrFile !== 'object') {
    throw new TypeError(
      'buildTheme(config): pass a theme config, a path to a theme.config.mjs, or a file URL.',
    )
  }

  const cwd = options.cwd === undefined ? process.cwd() : resolve(options.cwd)
  return { config: defineTheme(configOrFile), cwd, configPath: undefined }
}

const colorSchemeByMode = (contract) =>
  Object.fromEntries(
    contract.modes
      .filter((mode) => mode.colorScheme !== undefined)
      .map((mode) => [mode.id, mode.colorScheme]),
  )

const declarationsFor = (paths, values) =>
  paths
    .filter((path) => values[path] !== undefined)
    .sort()
    .map((path) => [cssVariableName(path), String(values[path].value)])

/**
 * Build a theme package.
 *
 * @param {object | string | URL} configOrFile A config object, a path to `theme.config.mjs`, or a URL.
 * @param {{ cwd?: string }} [options] Base directory when a config object is passed.
 * @returns {Promise<{ id: string, label: string, cwd: string, outputs: Record<string, string> }>}
 */
export const buildTheme = async (configOrFile, options = {}) => {
  const { config, cwd } = await resolveConfigSource(configOrFile, options)
  const packageJson = await loadThemePackage(cwd)
  assertCoreDependency(packageJson, cwd)
  assertFontsResolve(config.fonts, cwd)

  const { contract, values, cssPath } = await loadCoreTokens(cwd)

  const idPattern = new RegExp(contract.themeIdPattern)
  if (!idPattern.test(config.id)) {
    throw new Error(
      `The theme id "${config.id}" does not match the contract's themeIdPattern ` +
        `(${contract.themeIdPattern}). Change the id in theme.config.mjs: it becomes the ` +
        '"data-theme" value and part of the generated CSS selectors.',
    )
  }

  const primitivePaths = new Set(contract.primitiveTokens)
  const primitiveTree = expandFlatTokens(values.primitives)

  const localTrees = []
  for (const file of config.tokens) {
    localTrees.push(stripRootMeta(await readJson(resolveFrom(cwd, file))))
  }
  const localTokens = mergeTrees(localTrees, `theme "${config.id}" token`)

  const overrides = stripRootMeta(await readJson(resolveFrom(cwd, config.overrides)))

  const validated = validateTheme({
    config,
    contract,
    localTokens,
    overrides,
    primitivePaths,
  })

  const resolvedOverrides = {}
  const resolved = {}
  for (const mode of validated.modeIds) {
    const modeTree = mergeTrees(
      [overrides.base ?? {}, overrides[mode]],
      `theme "${config.id}" ${mode} override`,
    )
    // `primitiveTree` and `localTokens` are already rooted (`primitive.*` / `theme.*`), and the
    // override sections are rooted at their semantic path, so they can be merged at the top level.
    const flat = await resolveTokenTree(
      { ...primitiveTree, ...localTokens, ...modeTree },
      config.id,
    )

    const overridePaths = [...validated.basePaths, ...validated.modePaths.get(mode)]
    resolvedOverrides[mode] = Object.fromEntries(
      overridePaths.map((path) => [path, { value: flat[path].value, type: flat[path].type }]),
    )

    resolved[mode] = { ...values.semantic[mode] }
    for (const path of overridePaths) {
      resolved[mode][path] = { value: flat[path].value, type: flat[path].type }
    }
  }

  const contrastPairs =
    config.contrast.pairs.length > 0
      ? config.contrast.pairs
      : mergeContrastPairs(contract.contrast?.pairs ?? [], DEFAULT_CONTRAST_PAIRS)
  validateContrast({
    id: config.id,
    resolved,
    modeIds: validated.modeIds,
    contrast: { pairs: contrastPairs, min: config.contrast.min },
  })

  const packageName = packageJson.name
  const specifier = packageName
  const coreCss = await readFile(cssPath, 'utf8')

  // Every non-default mode block re-declares *all* mode-varying overrides the theme makes, with
  // the value that applies in that mode. Without this, a token overridden only in the default mode
  // would be emitted on the unconditional base selector and leak into the other modes (the theme
  // base rule is more specific than core's mode rules), making the CSS disagree with `resolved`.
  const themeModePaths = [
    ...new Set(validated.modeIds.flatMap((mode) => validated.modePaths.get(mode))),
  ]

  const cssOptions = {
    config,
    packageName,
    modeIds: validated.modeIds,
    defaultMode: validated.defaultMode,
    colorSchemes: colorSchemeByMode(contract),
    baseDeclarations: declarationsFor(
      [...validated.basePaths, ...validated.modePaths.get(validated.defaultMode)],
      resolved[validated.defaultMode],
    ),
    modeDeclarations: new Map(
      validated.modeIds
        .filter((mode) => mode !== validated.defaultMode)
        .map((mode) => [mode, declarationsFor(themeModePaths, resolved[mode])]),
    ),
  }

  const themeCss = createThemeCss(cssOptions)
  const standaloneCss = createStandaloneCss({
    config,
    packageName,
    coreCss,
    themeCss: createThemeCss({ ...cssOptions, banner: false }),
  })
  const metadataJs = createMetadataJs({ config, packageName, modeIds: validated.modeIds })
  const metadataDts = createMetadataDts({ config, packageName, modeIds: validated.modeIds })
  const styleEntry = createStyleEntry({ config, packageName, specifier })
  const themeJson = createThemeJson({
    config,
    validated,
    resolvedOverrides,
    resolved,
    contractVersion: contract.version,
  })

  // Fixed layout: the documented exports map points at dist/, so the build writes there and
  // nowhere else.
  const outputDir = join(cwd, 'dist')
  await rm(outputDir, { recursive: true, force: true })
  await mkdir(join(outputDir, 'css'), { recursive: true })
  await mkdir(join(outputDir, 'js'), { recursive: true })
  await mkdir(join(outputDir, 'json'), { recursive: true })

  const outputs = {
    css: join(outputDir, 'css', 'theme.css'),
    standaloneCss: join(outputDir, 'css', 'standalone.css'),
    style: join(outputDir, 'style.js'),
    metadata: join(outputDir, 'js', 'index.js'),
    types: join(outputDir, 'js', 'index.d.ts'),
    json: join(outputDir, 'json', 'theme.json'),
  }

  await Promise.all([
    writeFile(outputs.css, themeCss),
    writeFile(outputs.standaloneCss, standaloneCss),
    writeFile(outputs.style, styleEntry),
    writeFile(outputs.metadata, metadataJs),
    writeFile(outputs.types, metadataDts),
    writeFile(outputs.json, `${JSON.stringify(themeJson, null, 2)}\n`),
  ])

  return { id: config.id, label: config.label, cwd, contractVersion: contract.version, outputs }
}
