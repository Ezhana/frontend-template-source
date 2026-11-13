/**
 * The theme build: read the theme sources, validate them against the core contract, resolve every
 * value and write the theme package artifacts. The complete `style.css` inlines the core stylesheet
 * and the theme's font faces, so importing one file is enough to use the theme.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import StyleDictionary from 'style-dictionary'

import { defineTheme } from './config.js'
import { loadCoreTokens } from './core.js'
import {
  createFontsCss,
  createMetadataDts,
  createMetadataJs,
  createStyleCss,
  createThemeCss,
  createThemeJson,
} from './emit.js'
import { inlineFonts } from './fonts.js'
import { cssVariableName, expandFlatTokens, mergeTrees, readJson, stripRootMeta } from './tokens.js'
import {
  DEFAULT_CONTRAST_PAIRS,
  filterKnownContrastPairs,
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
 * Read the theme package manifest. A theme build always runs inside a publishable package: the
 * manifest names the package in generated documentation and proves the core token package is a
 * declared dependency instead of an accidental hoisted install.
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
        'Add it as a dependency: the theme stylesheet is layered on that package.',
    )
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

const writeText = (path, content) => writeFile(path, content)

/**
 * Build a theme package.
 *
 * @param {object | string | URL} configOrFile A config object, a path to `theme.config.mjs`, or a URL.
 * @param {{ cwd?: string }} [options] Base directory when a config object is passed.
 */
export const buildTheme = async (configOrFile, options = {}) => {
  const { config, cwd } = await resolveConfigSource(configOrFile, options)
  const packageJson = await loadThemePackage(cwd)
  assertCoreDependency(packageJson, cwd)

  const { contract, values, cssPath } = await loadCoreTokens(cwd)

  const contractModeIds = contract.modes.map((mode) => mode.id)
  const themeModes = config.modes.length > 0 ? [...config.modes] : contractModeIds
  for (const mode of themeModes) {
    if (!contractModeIds.includes(mode)) {
      throw new Error(
        `Theme "${config.id}" declares the color mode "${mode}", which is not supported by the ` +
          '@ezhana/design-tokens contract. Supported modes: ' +
          `${contractModeIds.join(', ')}. Fix "modes" in theme.config.mjs.`,
      )
    }
  }

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
    modes: themeModes,
  })

  const resolvedOverrides = {}
  const resolved = {}
  for (const mode of validated.modeIds) {
    const modeTree = mergeTrees(
      [overrides.base ?? {}, overrides[mode]],
      `theme "${config.id}" ${mode} override`,
    )
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

  // Built-in contrast defaults are filtered to the tokens the installed core contract knows, so a
  // newer builder remains compatible with an older core; explicit theme pairs still fail loudly.
  const contrastPairs =
    config.contrast.pairs.length > 0
      ? config.contrast.pairs
      : mergeContrastPairs(
          filterKnownContrastPairs(contract.contrast?.pairs ?? [], contract),
          filterKnownContrastPairs(DEFAULT_CONTRAST_PAIRS, contract),
        )
  validateContrast({
    id: config.id,
    resolved,
    modeIds: validated.modeIds,
    contrast: { pairs: contrastPairs, min: config.contrast.min },
  })

  const packageName = packageJson.name
  const coreCss = await readFile(cssPath, 'utf8')
  const fontAssets = await inlineFonts({ fonts: config.fonts, cwd })

  // Every non-default mode block re-declares every mode-varying override the theme makes, so a
  // token overridden only in the default mode cannot leak into another mode from the base rule.
  const themeModePaths = [
    ...new Set(validated.modeIds.flatMap((mode) => validated.modePaths.get(mode))),
  ]

  const colorSchemes = colorSchemeByMode(contract)
  const baseDeclarations = declarationsFor(
    [...validated.basePaths, ...validated.modePaths.get(validated.defaultMode)],
    resolved[validated.defaultMode],
  )
  const fixedMode = validated.modeIds.length === 1
  if (fixedMode) {
    const colorScheme = colorSchemes[validated.modeIds[0]]
    if (colorScheme !== undefined) baseDeclarations.push(['color-scheme', colorScheme])
  }

  const cssOptions = {
    config,
    packageName,
    modeIds: validated.modeIds,
    defaultMode: validated.defaultMode,
    colorSchemes,
    baseDeclarations,
    modeDeclarations: new Map(
      validated.modeIds
        .filter((mode) => mode !== validated.defaultMode)
        .map((mode) => [mode, declarationsFor(themeModePaths, resolved[mode])]),
    ),
  }

  const themeCss = createThemeCss(cssOptions)
  const themeCssBody = createThemeCss({ ...cssOptions, banner: false })
  const fontsCss = createFontsCss({
    config,
    packageName,
    fontFaceCss: fontAssets.fontFaceCss,
    fontCount: fontAssets.fontFiles.size,
  })
  const styleCss = createStyleCss({
    config,
    packageName,
    fontFaceCss: fontAssets.fontFaceCss,
    coreCss,
    themeCss: themeCssBody,
  })
  const metadataJs = createMetadataJs({ config, packageName, modeIds: validated.modeIds })
  const metadataDts = createMetadataDts({ config, packageName, modeIds: validated.modeIds })
  const themeJson = createThemeJson({
    config,
    validated,
    resolvedOverrides,
    resolved,
    contractVersion: contract.version,
  })

  const outputDir = join(cwd, 'dist')
  await rm(outputDir, { recursive: true, force: true })
  await mkdir(join(outputDir, 'fonts', 'licenses'), { recursive: true })

  const outputs = {
    styleCss: join(outputDir, 'style.css'),
    themeCss: join(outputDir, 'theme.css'),
    fontsCss: join(outputDir, 'fonts.css'),
    metadata: join(outputDir, 'index.js'),
    types: join(outputDir, 'index.d.ts'),
    json: join(outputDir, 'theme.json'),
  }

  const fontOutputs = [...fontAssets.fontFiles.entries()].map(([source, target]) => ({
    source,
    target: join(outputDir, target),
  }))
  const licenseOutputs = [...fontAssets.licenseFiles.entries()].map(([source, target]) => ({
    source,
    target: join(outputDir, target),
  }))

  await Promise.all([
    writeText(outputs.styleCss, styleCss),
    writeText(outputs.themeCss, themeCss),
    writeText(outputs.fontsCss, fontsCss),
    writeText(outputs.metadata, metadataJs),
    writeText(outputs.types, metadataDts),
    writeText(outputs.json, `${JSON.stringify(themeJson, null, 2)}\n`),
    ...fontOutputs.map(async ({ source, target }) => writeFile(target, await readFile(source))),
    ...licenseOutputs.map(async ({ source, target }) => writeFile(target, await readFile(source))),
  ])

  return {
    id: config.id,
    label: config.label,
    cwd,
    contractVersion: contract.version,
    outputs: {
      ...outputs,
      fonts: fontOutputs.map(({ target }) => target),
    },
  }
}
