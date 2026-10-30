/**
 * Theme configuration: the `theme.config.mjs` contract.
 *
 * `defineTheme` validates the shape eagerly so a typo in a theme package fails at import time
 * with a message that points at the offending field. Path resolution (tokens, overrides, output)
 * is relative to the config file directory and happens in the build step.
 */
import { isPlainObject } from './tokens.js'

const THEME_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const DEFAULT_CONTRAST_MIN = 4.5

/** Only these keys are accepted; a typo must fail instead of being silently ignored. */
const CONFIG_KEYS = new Set([
  'id',
  'label',
  'description',
  'tokens',
  'overrides',
  'fonts',
  'contrast',
  'modes',
])

const normalizeString = (value, name, { optional = false } = {}) => {
  if (value === undefined) {
    if (optional) return undefined
    throw new TypeError(`defineTheme(config): \`${name}\` is required.`)
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`defineTheme(config): \`${name}\` must be a non-empty string.`)
  }
  return value
}

const normalizeStringArray = (value, name) => {
  if (value === undefined) return Object.freeze([])
  if (!Array.isArray(value)) {
    throw new TypeError(`defineTheme(config): \`${name}\` must be an array of strings.`)
  }
  const entries = value.map((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new TypeError(`defineTheme(config): \`${name}[${index}]\` must be a non-empty string.`)
    }
    return entry
  })
  return Object.freeze(entries)
}

/**
 * A theme may support only a subset of the contract's color modes (for example a dark-only
 * fantasy theme). The declared order is preserved because it decides the theme's default mode
 * when the contract's default mode is not part of the subset.
 */
const normalizeModes = (value) => {
  const modes = normalizeStringArray(value, 'modes')
  const seen = new Set()
  for (const mode of modes) {
    if (seen.has(mode)) {
      throw new TypeError(
        `defineTheme(config): \`modes\` must not contain duplicates; "${mode}" is declared ` +
          'more than once.',
      )
    }
    seen.add(mode)
  }
  return modes
}

const normalizeContrast = (value) => {
  if (value === undefined) {
    return Object.freeze({ pairs: Object.freeze([]), min: DEFAULT_CONTRAST_MIN })
  }
  if (!isPlainObject(value)) {
    throw new TypeError('defineTheme(config): `contrast` must be an object.')
  }
  const pairs = value.pairs ?? []
  if (!Array.isArray(pairs)) {
    throw new TypeError('defineTheme(config): `contrast.pairs` must be an array of token paths.')
  }
  const normalizedPairs = pairs.map((pair, index) => {
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw new TypeError(
        `defineTheme(config): \`contrast.pairs[${index}]\` must be a [foreground, background] pair.`,
      )
    }
    return Object.freeze([
      normalizeString(pair[0], `contrast.pairs[${index}][0]`),
      normalizeString(pair[1], `contrast.pairs[${index}][1]`),
    ])
  })
  const min = value.min ?? DEFAULT_CONTRAST_MIN
  if (typeof min !== 'number' || !Number.isFinite(min) || min <= 0 || min > 21) {
    throw new TypeError('defineTheme(config): `contrast.min` must be a number between 0 and 21.')
  }
  return Object.freeze({ pairs: Object.freeze(normalizedPairs), min })
}

/**
 * @typedef {object} ThemeConfig
 * @property {string} id Theme identity written to `data-theme`.
 * @property {string} label Human-readable label for switcher UIs.
 * @property {string} [description] Optional one-line description.
 * @property {readonly string[]} [tokens] Theme-private DTCG files, all tokens under `theme.*`.
 * @property {string} overrides DTCG file with `base` and one section per color mode.
 * @property {readonly string[]} [fonts] Font CSS entry points imported by the style entry.
 * @property {{ pairs?: readonly (readonly [string, string])[], min?: number }} [contrast]
 * @property {readonly string[]} [modes] Color modes the theme supports, in order. Defaults to
 *   every color mode of the core contract; a single mode makes the theme a fixed-mode theme.
 */

/**
 * Declare a theme in `theme.config.mjs` and get back a validated, frozen config.
 *
 * @param {ThemeConfig} config
 * @returns {Readonly<Required<Pick<ThemeConfig, 'id' | 'label' | 'tokens' | 'overrides' | 'fonts' | 'contrast' | 'modes'>> & { description?: string }>}
 */
export const defineTheme = (config) => {
  if (!isPlainObject(config)) {
    throw new TypeError('defineTheme(config): an options object is required.')
  }

  const unknownKeys = Object.keys(config).filter((key) => !CONFIG_KEYS.has(key))
  if (unknownKeys.length > 0) {
    throw new TypeError(
      `defineTheme(config): unknown option${unknownKeys.length > 1 ? 's' : ''} ${unknownKeys
        .map((key) => `\`${key}\``)
        .join(', ')}. Supported options: ${[...CONFIG_KEYS].join(', ')}.`,
    )
  }

  const id = normalizeString(config.id, 'id')
  if (!THEME_ID_PATTERN.test(id)) {
    throw new TypeError(
      `defineTheme(config): \`id\` must match ${String(THEME_ID_PATTERN)} (lowercase kebab-case), ` +
        `received ${JSON.stringify(id)}. Theme ids are used in "data-theme" and in CSS selectors.`,
    )
  }

  return Object.freeze({
    id,
    label: normalizeString(config.label, 'label'),
    description: normalizeString(config.description, 'description', { optional: true }),
    tokens: normalizeStringArray(config.tokens, 'tokens'),
    overrides: normalizeString(config.overrides, 'overrides'),
    fonts: normalizeStringArray(config.fonts, 'fonts'),
    contrast: normalizeContrast(config.contrast),
    modes: normalizeModes(config.modes),
  })
}
