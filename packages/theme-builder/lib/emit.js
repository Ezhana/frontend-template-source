/**
 * Artifact generation for a theme package.
 *
 * Every artifact is generated from the same resolved data, so the CSS, metadata and JSON snapshot
 * cannot disagree. Theme CSS contains resolved values only: theme-private tokens (`theme.*`) are
 * build-time material and never become CSS custom properties.
 */

const indent = (text, depth) =>
  text
    .split('\n')
    .map((line) => (line.length === 0 ? line : `${'  '.repeat(depth)}${line}`))
    .join('\n')

const declarations = (entries, depth) =>
  entries.map(([name, value]) => `${'  '.repeat(depth)}${name}: ${value};`).join('\n')

const rule = (selector, entries, depth) =>
  `${'  '.repeat(depth)}${selector} {\n${declarations(entries, depth + 1)}\n${'  '.repeat(depth)}}`

const mediaRule = (query, selector, entries, depth) =>
  `${'  '.repeat(depth)}@media ${query} {\n${rule(selector, entries, depth + 1)}\n${'  '.repeat(depth)}}`

const describe = (config, packageName) =>
  packageName ? `${packageName} —` : `Theme "${config.id}" —`

/**
 * @param {object} input
 * @param {object} input.config Resolved theme config.
 * @param {string | undefined} input.packageName `name` from the theme package.json.
 * @param {string[]} input.modeIds
 * @param {string} input.defaultMode
 * @param {Record<string, string>} input.colorSchemes Mode id -> `color-scheme` value.
 * @param {Array<[string, string]>} input.baseDeclarations Base section + default mode declarations.
 * @param {Map<string, Array<[string, string]>>} input.modeDeclarations Non-default mode declarations.
 * @param {boolean} [input.banner] Include the file banner (default true).
 */
export const createThemeCss = ({
  config,
  packageName,
  modeIds,
  defaultMode,
  colorSchemes,
  baseDeclarations,
  modeDeclarations,
  banner = true,
}) => {
  const { id } = config
  const defaultModeLabel = modeIds.includes(defaultMode) ? defaultMode : modeIds[0]
  const fixedMode = modeIds.length === 1
  const sections = []

  if (fixedMode) {
    // A fixed-mode theme supports exactly one color mode, so it never reacts to data-color-mode or
    // prefers-color-scheme. The 0,3,0 attribute selectors keep the rule above the core mode and
    // system-preference rules regardless of stylesheet order.
    sections.push(
      `/* Theme "${id}": mode-independent overrides + fixed ${defaultModeLabel} color values. */\n` +
        rule(
          [
            `:root[data-theme="${id}"]`,
            `:root[data-theme="${id}"]:not([data-color-mode])`,
            `:root[data-theme="${id}"][data-color-mode]`,
          ].join(', '),
          baseDeclarations,
          0,
        ),
    )
  } else {
    sections.push(
      `/* Theme "${id}": mode-independent overrides + ${defaultModeLabel} color values. */\n` +
        rule(`:root[data-theme="${id}"]`, baseDeclarations, 0),
    )

    for (const mode of modeIds) {
      if (mode === defaultMode) continue
      const entries = modeDeclarations.get(mode)
      if (!entries || entries.length === 0) continue
      sections.push(
        `/* Theme "${id}": ${mode} overrides (explicit). */\n` +
          rule(`:root[data-theme="${id}"][data-color-mode="${mode}"]`, entries, 0),
      )
      if (colorSchemes[mode] === 'dark') {
        sections.push(
          `/* Theme "${id}": ${mode} overrides (system preference). */\n` +
            mediaRule(
              '(prefers-color-scheme: dark)',
              `:root[data-theme="${id}"]:not([data-color-mode])`,
              entries,
              0,
            ),
        )
      }
    }
  }

  const body = `@layer design-tokens;\n\n@layer design-tokens {\n${indent(sections.join('\n\n'), 1)}\n}\n`

  if (!banner) return body

  if (fixedMode) {
    return `/**
 * ${describe(config, packageName)} generated theme overrides.
 *
 * Theme "${id}" is fixed to the "${defaultModeLabel}" color mode and always applies it; it does not
 * react to data-color-mode or prefers-color-scheme. Use it together with the core stylesheet, or
 * import the complete "./style.css" entry. Do not edit; run "pnpm build" instead.
 */
${body}`
  }

  return `/**
 * ${describe(config, packageName)} generated theme overrides.
 *
 * Overrides semantic tokens of @ezhana/design-tokens for :root[data-theme="${id}"]. Use it together
 * with the core stylesheet, or import the complete "./style.css" entry. Color mode is selected by
 * data-color-mode and falls back to prefers-color-scheme when the attribute is absent.
 *
 *   <html data-theme="${id}">                                    system color mode
 *   <html data-theme="${id}" data-color-mode="dark">             explicit color mode
 *
 * Do not edit; run "pnpm build" instead.
 */
${body}`
}

/**
 * @param {object} input
 * @param {object} input.config
 * @param {string | undefined} input.packageName
 * @param {string} input.fontFaceCss Rewritten `@font-face` rules, relative to `dist/fonts.css`.
 * @param {number} input.fontCount
 */
export const createFontsCss = ({ config, packageName, fontFaceCss, fontCount }) => {
  const content =
    fontCount === 0
      ? `/* Theme "${config.id}" ships no font assets. */\n`
      : `${fontFaceCss.trimEnd()}\n`

  return `/**
 * ${describe(config, packageName)} generated font faces.
 *
 * Self-hosted font assets, emitted next to the stylesheet ("fonts/"). Import this entry when you
 * load "./theme.css" directly instead of the complete "./style.css".
 *
 * Do not edit; run "pnpm build" instead.
 */
${content}`
}

/**
 * @param {object} input
 * @param {object} input.config
 * @param {string | undefined} input.packageName
 * @param {string} input.fontFaceCss
 * @param {string} input.coreCss Core `@ezhana/design-tokens` stylesheet.
 * @param {string} input.themeCss Generated theme overrides without banner.
 */
export const createStyleCss = ({ config, packageName, fontFaceCss, coreCss, themeCss }) => `/**
 * ${describe(config, packageName)} complete stylesheet.
 *
 * Self-contained: this file contains the theme's @font-face rules, the full
 * @ezhana/design-tokens core stylesheet and the "${config.id}" theme overrides. A single import is
 * enough for a plain <link> or a CSS @import; no other package CSS is required.
 *
 *   <html data-theme="${config.id}">                     system color mode
 *   <html data-theme="${config.id}" data-color-mode="dark">  explicit color mode
 *
 * Do not edit; run "pnpm build" instead.
 */
${fontFaceCss.trimEnd()}

${coreCss.trimEnd()}

${themeCss.trimEnd()}
`

export const createMetadataJs = ({ config, packageName, modeIds }) => `/**
 * ${describe(config, packageName)} generated theme metadata.
 * Do not edit directly; run "pnpm build" instead.
 */

export const themeId = ${JSON.stringify(config.id)}

export const themeLabel = ${JSON.stringify(config.label)}

export const modes = Object.freeze(${JSON.stringify(modeIds)})

export const theme = Object.freeze({
  id: themeId,
  label: themeLabel,
  modes,
})
`

export const createMetadataDts = ({ config, packageName, modeIds }) => `/**
 * ${describe(config, packageName)} generated theme metadata types.
 * Do not edit directly; run "pnpm build" instead.
 */

export type ThemeId = ${JSON.stringify(config.id)}

export type ThemeMode = ${modeIds.map((mode) => JSON.stringify(mode)).join(' | ')}

export declare const themeId: ThemeId

export declare const themeLabel: ${JSON.stringify(config.label)}

export declare const modes: readonly ThemeMode[]

export declare const theme: {
  readonly id: ThemeId
  readonly label: ${JSON.stringify(config.label)}
  readonly modes: readonly ThemeMode[]
}
`

/**
 * @param {object} input
 * @param {object} input.config
 * @param {object} input.validated
 * @param {Record<string, Record<string, { value: string, type: string }>>} input.resolvedOverrides
 * @param {Record<string, Record<string, { value: string, type: string }>>} input.resolved
 */
export const createThemeJson = ({
  config,
  validated,
  resolvedOverrides,
  resolved,
  contractVersion,
}) => ({
  generator: '@ezhana/theme-builder',
  version: 2,
  contractVersion,
  theme: {
    id: config.id,
    label: config.label,
    ...(config.description ? { description: config.description } : {}),
  },
  modes: validated.modeIds,
  defaultMode: validated.defaultMode,
  overrides: resolvedOverrides,
  resolved,
})
