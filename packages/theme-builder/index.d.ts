/**
 * Public types for `@ezhana/theme-builder`.
 *
 * The package is plain ESM, so these declarations are hand-written and need no build step.
 */

/** Contrast requirements for a theme. */
export interface ThemeContrastOptions {
  /**
   * Foreground/background semantic token paths to check. Defaults to the pairs that cover the
   * tokens a theme can change and that carry text or a visible interaction surface.
   */
  readonly pairs?: readonly (readonly [string, string])[]
  /** Minimum WCAG contrast ratio. Defaults to `4.5` (WCAG 2.2 AA). */
  readonly min?: number
}

/** Theme configuration accepted by {@link defineTheme}. */
export interface ThemeConfig {
  /** Theme identity written to `data-theme`; lowercase kebab-case. */
  readonly id: string
  /** Human-readable label for switcher UIs. */
  readonly label: string
  /** Optional one-line description, copied into `dist/json/theme.json`. */
  readonly description?: string
  /** Theme-private DTCG files. Every token must live under `theme.*`. */
  readonly tokens?: readonly string[]
  /** DTCG file with a `base` section and one section per declared color mode. */
  readonly overrides: string
  /** Font CSS entry points imported by the generated `style` entry. */
  readonly fonts?: readonly string[]
  /** Contrast requirements. */
  readonly contrast?: ThemeContrastOptions
  /**
   * Color modes this theme supports, in declared order. Defaults to `[]`, meaning every color mode
   * of the `@ezhana/design-tokens` contract. Declaring a subset produces a theme that only works in
   * those modes; a single mode (for example `['dark']`) makes the theme fixed-mode: it always
   * applies that mode and ignores `data-color-mode`.
   */
  readonly modes?: readonly string[]
}

/** Validated theme configuration returned by {@link defineTheme}. */
export interface ResolvedThemeConfig {
  readonly id: string
  readonly label: string
  readonly description?: string
  readonly tokens: readonly string[]
  readonly overrides: string
  readonly fonts: readonly string[]
  readonly contrast: {
    readonly pairs: readonly (readonly [string, string])[]
    readonly min: number
  }
  /** Declared color modes, frozen; empty means "all contract modes". */
  readonly modes: readonly string[]
}

/** Artifacts written by {@link buildTheme}, keyed by kind. */
export interface ThemeBuildOutputs {
  /** `dist/css/theme.css` — semantic overrides only. */
  readonly css: string
  /** `dist/css/standalone.css` — core stylesheet + overrides. */
  readonly standaloneCss: string
  /** `dist/style.js` — self-sufficient bundler entry: core CSS, fonts, overrides. */
  readonly style: string
  /** `dist/js/index.js` — `theme`, `themeId`, `themeLabel`, `modes` (declared modes). */
  readonly metadata: string
  /** `dist/js/index.d.ts` — literal types for the metadata. */
  readonly types: string
  /** `dist/json/theme.json` — resolved values per mode, for tooling and tests. */
  readonly json: string
}

/** Result of {@link buildTheme}. */
export interface ThemeBuildResult {
  readonly id: string
  readonly label: string
  /** Theme package directory the build ran in. Artifacts are always written to `<cwd>/dist`. */
  readonly cwd: string
  /** `@ezhana/design-tokens` contract version the theme was validated against. */
  readonly contractVersion: number
  readonly outputs: ThemeBuildOutputs
}

/**
 * Declare a theme and get back a validated, frozen configuration.
 *
 * Throws `TypeError` for a missing label, an id that is not lowercase kebab-case, or malformed
 * `tokens` / `fonts` / `contrast` / `modes` values (including duplicate modes).
 */
export declare function defineTheme(config: ThemeConfig): ResolvedThemeConfig

/**
 * Build a theme package: read the sources, validate them against the `@ezhana/design-tokens`
 * contract, resolve every value and write the artifacts.
 *
 * A theme that declares a subset of the contract's color modes only validates and emits those
 * modes; with a single declared mode the generated stylesheet is fixed-mode (one rule, no
 * `data-color-mode`/`prefers-color-scheme` selection, plus a `color-scheme` declaration).
 *
 * @param configOrFile A config object, or a path/URL to `theme.config.mjs`.
 * @param options `cwd` is the theme package directory used when a config object is passed.
 */
export declare function buildTheme(
  configOrFile: ThemeConfig | ResolvedThemeConfig | string | URL,
  options?: { readonly cwd?: string },
): Promise<ThemeBuildResult>

/** Default contrast pairs enforced by {@link buildTheme}. */
export declare const DEFAULT_CONTRAST_PAIRS: readonly (readonly [string, string])[]

/** WCAG 2.2 contrast ratio between two opaque hex colors. */
export declare function contrastRatio(foreground: string, background: string): number
