/**
 * Validation of a theme against the core contract.
 *
 * The builder is strict on purpose: a theme package is consumed by other teams, so a broken
 * reference, a missing required override or an inaccessible accent color must fail the theme's own
 * build instead of surfacing as an undefined CSS custom property in an application.
 */
import { collectReferences, tokenPaths } from './tokens.js'

const alphaHexPattern = /^#(?:[0-9a-f]{4}|[0-9a-f]{8})$/i
const opaqueHexPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * Contrast pairs every theme must satisfy unless the theme config overrides them. They cover the
 * tokens a theme can change that carry text or a visible interaction surface; inherited pairs are
 * already guaranteed by the core package.
 */
export const DEFAULT_CONTRAST_PAIRS = Object.freeze([
  Object.freeze(['color.on-accent', 'color.accent']),
  Object.freeze(['color.accent', 'color.bg']),
  Object.freeze(['color.accent-hover', 'color.bg']),
  Object.freeze(['color.fg', 'color.bg']),
  Object.freeze(['color.fg-muted', 'color.bg']),
  Object.freeze(['color.fg-strong', 'color.bg']),
  Object.freeze(['color.fg-strong', 'color.bg-subtle']),
  Object.freeze(['color.danger', 'color.bg']),
  Object.freeze(['color.on-danger', 'color.danger']),
  Object.freeze(['color.success', 'color.bg']),
  Object.freeze(['color.warning', 'color.bg']),
])

/**
 * Merge contrast pair lists, keeping the first occurrence. The core package publishes the pairs it
 * validates itself (`contract.contrast.pairs`); the builder adds the theme-specific ones on top, so
 * the two suites cannot drift apart.
 *
 * @param {readonly (readonly [string, string])[]} lists
 * @returns {readonly (readonly [string, string])[]}
 */
export const mergeContrastPairs = (...lists) => {
  const seen = new Set()
  const pairs = []
  for (const list of lists) {
    for (const pair of list) {
      const key = `${pair[0]}|${pair[1]}`
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push(pair)
    }
  }
  return pairs
}

const toRgb = (hex) => {
  const value = hex.slice(1)
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((channel) => channel + channel)
          .join('')
      : value
  return expanded.match(/../g).map((channel) => Number.parseInt(channel, 16) / 255)
}

const relativeLuminance = (hex) => {
  const [r, g, b] = toRgb(hex).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.2 contrast ratio between two opaque hex colors. */
export const contrastRatio = (foreground, background) => {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const [lighter, darker] = [foregroundLuminance, backgroundLuminance].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * @typedef {object} ValidatedTheme
 * @property {string[]} basePaths Base-section override paths, in contract order.
 * @property {Map<string, string[]>} modePaths Mode-section override paths, in contract order.
 * @property {string[]} modeIds Every color mode from the contract.
 * @property {string} defaultMode
 */

/**
 * @param {object} input
 * @param {import('./config.js').ThemeConfig} input.config
 * @param {object} input.contract `@ezhana/design-tokens` contract
 * @param {object} input.localTokens Merged theme-private token tree
 * @param {Record<string, object>} input.overrides Parsed override sections
 * @param {Set<string>} input.primitivePaths
 * @returns {ValidatedTheme}
 */
export const validateTheme = ({ config, contract, localTokens, overrides, primitivePaths }) => {
  const { id } = config
  const modeIds = contract.modes.map((mode) => mode.id)
  const defaultMode = contract.defaultMode
  const themeNamespace = contract.themeNamespace
  const semanticBase = new Set(contract.semanticTokens.base)
  const semanticMode = new Map(
    Object.entries(contract.semanticTokens.modes).map(([mode, paths]) => [mode, new Set(paths)]),
  )

  /* Theme-private tokens -------------------------------------------------- */

  const localPaths = tokenPaths(localTokens)
  for (const path of localPaths) {
    if (!path.startsWith(`${themeNamespace}.`)) {
      throw new Error(
        `Theme "${id}" declares the token "${path}" outside the "${themeNamespace}." namespace. ` +
          `Theme-private tokens must live under "${themeNamespace}.*" ` +
          '(for example "theme.color.accent.600"); they are build-time material and never ' +
          'become CSS custom properties.',
      )
    }
  }
  const localPathSet = new Set(localPaths)

  const validateReferences = (tree, label) => {
    for (const reference of collectReferences(tree)) {
      const allowed =
        reference.startsWith(`${themeNamespace}.`) || reference.startsWith('primitive.')
      if (!allowed) {
        throw new Error(
          `${label} references "${reference}". Theme sources may only reference core primitive ` +
            `tokens ("primitive.*") and their own theme tokens ("${themeNamespace}.*"); ` +
            'semantic tokens must be overridden, not referenced.',
        )
      }
      if (reference.startsWith('primitive.') && !primitivePaths.has(reference)) {
        throw new Error(`${label} references the unknown core primitive token "${reference}".`)
      }
      if (reference.startsWith(`${themeNamespace}.`) && !localPathSet.has(reference)) {
        throw new Error(
          `${label} references "${reference}", which is not declared in the theme token sources.`,
        )
      }
    }
  }

  validateReferences(localTokens, `Theme "${id}" token sources`)

  /* Override sections ----------------------------------------------------- */

  const knownSections = new Set(['base', ...modeIds])
  for (const section of Object.keys(overrides)) {
    if (!knownSections.has(section)) {
      throw new Error(
        `Theme "${id}" defines the section "${section}", which is not a color mode. ` +
          `Expected "base" and one section per color mode: ${modeIds.join(', ')}.`,
      )
    }
  }
  for (const mode of modeIds) {
    if (!overrides[mode]) {
      throw new Error(
        `Theme "${id}" is missing the "${mode}" section. ` +
          'Every theme must override the contract tokens in every color mode.',
      )
    }
  }

  const basePaths = tokenPaths(overrides.base ?? {})
  const modePathMap = new Map(modeIds.map((mode) => [mode, tokenPaths(overrides[mode])]))

  const validateSectionPaths = (paths, known, section) => {
    for (const path of paths) {
      if (!known.has(path)) {
        throw new Error(
          `Theme "${id}" overrides "${path}" in the "${section}" section, which is not a semantic ` +
            'token of that section. Themes may only override existing semantic tokens.',
        )
      }
    }
  }

  validateSectionPaths(basePaths, semanticBase, 'base')
  for (const mode of modeIds)
    validateSectionPaths(modePathMap.get(mode), semanticMode.get(mode), mode)

  for (const required of contract.required.base) {
    if (!basePaths.includes(required)) {
      throw new Error(`Theme "${id}" must override the required base token "${required}".`)
    }
  }
  for (const mode of modeIds) {
    const paths = modePathMap.get(mode)
    for (const required of contract.required.mode) {
      if (!paths.includes(required)) {
        throw new Error(
          `Theme "${id}" must override the required theme token "${required}" in the "${mode}" section.`,
        )
      }
    }
  }

  // The base and mode sections must be disjoint: a token is either mode-independent or per-mode,
  // never both. The contract keeps the two sets apart, but a hand-written contract-equivalent
  // could not, and a duplicate override would be silently resolved by section order.
  const basePathSet = new Set(basePaths)
  for (const [mode, paths] of modePathMap) {
    for (const path of paths) {
      if (basePathSet.has(path)) {
        throw new Error(
          `Theme "${id}" overrides "${path}" in both the "base" and "${mode}" sections. ` +
            'A semantic token belongs to exactly one section.',
        )
      }
    }
    validateReferences(overrides[mode], `Theme "${id}" ${mode} overrides`)
  }
  validateReferences(overrides.base ?? {}, `Theme "${id}" base overrides`)

  return { basePaths, modePaths: modePathMap, modeIds, defaultMode }
}

/**
 * Check WCAG contrast for the resolved (core defaults + theme overrides) color values.
 *
 * @param {object} input
 * @param {string} input.id
 * @param {Record<string, Record<string, { value: string }>>} input.resolved Resolved values per mode.
 * @param {string[]} input.modeIds
 * @param {{ pairs: readonly (readonly [string, string])[], min: number }} input.contrast
 */
export const validateContrast = ({ id, resolved, modeIds, contrast }) => {
  const pairs = contrast.pairs
  const failures = []

  for (const mode of modeIds) {
    for (const [foregroundPath, backgroundPath] of pairs) {
      const foreground = resolved[mode]?.[foregroundPath]?.value
      const background = resolved[mode]?.[backgroundPath]?.value
      if (typeof foreground !== 'string' || typeof background !== 'string') {
        throw new Error(
          `Theme "${id}" contrast check: "${foregroundPath}" / "${backgroundPath}" are not color ` +
            `tokens in the "${mode}" mode.`,
        )
      }
      for (const [path, value] of [
        [foregroundPath, foreground],
        [backgroundPath, background],
      ]) {
        if (alphaHexPattern.test(value)) {
          throw new Error(
            `Theme "${id}" contrast check: "${path}" is "${value}" (transparent), but contrast is ` +
              'computed on opaque colors. Remove it from contrast.pairs or use an opaque value.',
          )
        }
        if (!opaqueHexPattern.test(value)) {
          throw new Error(
            `Theme "${id}" contrast check: "${path}" is "${value}", which is not an opaque hex ` +
              'color. Contrast pairs only support hex colors.',
          )
        }
      }

      const ratio = contrastRatio(foreground, background)
      if (ratio < contrast.min) {
        failures.push(
          `${mode}: ${foregroundPath} (${foreground}) on ${backgroundPath} (${background}) = ` +
            `${ratio.toFixed(2)}:1 < ${contrast.min}:1`,
        )
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Theme "${id}" fails the WCAG contrast check:\n  ${failures.join('\n  ')}\n` +
        'Adjust the theme colors or pass `contrast: { pairs, min }` in theme.config.mjs.',
    )
  }
}
