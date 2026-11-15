# create-ezhana-app

## 3.1.1

### Patch Changes

- 609edd8: Scope pnpm's local-workspace linking to the lint/format config install.

  The previous global linking preference also applied to `--theme`, so a fresh source checkout linked
  the local `@ezhana/design-theme-*` sources before their `dist/` was built and the generated app
  failed to resolve `<theme>/style.css`. The generator now passes
  `--config.prefer-workspace-packages`, `--config.link-workspace-packages` and
  `--config.save-workspace-protocol=false` only to the `pnpm add -D` call that installs
  `@ezhana/eslint-config-*` / `@ezhana/prettier-config`.

  Config packages still link locally during source-repository testing while `package.json` keeps the
  consumer-facing `^<version>` spec; theme packages and scaffold dependencies resolve from the
  registry, so their published `dist/` output is used.

## 3.1.0

### Minor Changes

- Publish the shared ESLint and Prettier config packages and consume them as npm dependencies.

  The `@ezhana/eslint-config-*` and `@ezhana/prettier-config` packages are no longer private: they
  carry `publishConfig.access: "public"`, a repository entry, and are versioned and published by
  Changesets. Their sibling config dependencies use `workspace:^` so published manifests carry semver
  ranges.

  The generated template no longer copies them into `packages/`. Its root `package.json` depends on
  `@ezhana/eslint-config-base` and `@ezhana/prettier-config` with `^<version>` ranges, and `packages/`
  is reserved for the user's own packages. `create:app --eslint/--prettier` adds the published
  framework config package (and `@ezhana/prettier-config`) as normal devDependencies using the
  versions in `versions.json`, and no longer requires the target to live inside a workspace that ships
  the packages. Generated configs keep importing the installed packages and use ESLint's
  `defineConfig` helper.

  Publish the nine config packages before `create-ezhana-app` and before re-exporting the template.

## 3.0.1

### Patch Changes

- a2baaf6: Generated apps now import their Prettier plugins as modules instead of listing the plugin package
  names, so the app config works from any working directory.

  - `--prettier` writes `import * as astro from 'prettier-plugin-astro'` (and the equivalent for
    `prettier-plugin-svelte`) and puts the imported value in `plugins`.
  - Prettier resolves plugin names against its process cwd, so the pre-commit hook and the root
    `format` script failed with `Cannot find package 'prettier-plugin-astro' imported from
<workspace>/noop.js` when the plugin was installed only in the app.
  - Module imports resolve from the generated config file, i.e. from the app's `node_modules`,
    regardless of the cwd.

## 3.0.0

### Major Changes

- ccbe792: Remove the `configure` subcommand. ESLint, Prettier and theme integration are now only available as
  creation flags: `--eslint`, `--prettier` and `--theme`.

## 2.0.0

### Major Changes

- 3e90191: Replace the themed React/Vue/Astro generator with a registry-driven official-scaffolder dispatcher.

  - Frameworks: Next.js, Vue, Astro, Nuxt and SvelteKit. The mapping from framework to CLI, interactive
    flags, default flags, ESLint config package and Prettier plugins lives in `lib/registry.mjs`.
  - Interactive by default; `--defaults` runs the official CLI with the registry defaults. Non-TTY
    environments without `--defaults` fail with a clear error.
  - The `react` template, theme overlays, switchers, theme runtime dependencies and anti-flash scripts
    are removed.
  - `--theme <name>` is now a minimal CSS-only integration: it injects a theme package's `style.css`
    into a conventional global CSS file and skips with a warning when none is found.
  - `--eslint` / `--prettier` still write root config files, selected by the framework registry. Nuxt
    and SvelteKit config packages are added; Next.js composes the shared React config with
    `@next/eslint-plugin-next`.

## 1.0.0

### Major Changes

- 002b09f: Refactor Ezhana into a CSS-first, framework-agnostic design-token system. Styling no longer needs
  JavaScript, a theme manager or any bundler workaround.

  - **One CSS entry per package.**
    - `@ezhana/design-tokens/style.css` replaces `@ezhana/design-tokens/css` and
      `@ezhana/design-tokens/css/tokens.css`.
    - `@ezhana/design-theme-*/style.css` replaces the JavaScript `./style` entry and
      `./standalone.css`. It is a complete, self-contained preset: the theme's `@font-face` rules
      (font files copied into `dist/fonts/`), the full core stylesheet and the theme overrides. No
      internal `@import`, no CSS imported from JavaScript, no `noExternal` configuration.
    - `./theme.css` (overrides only) and `./fonts.css` (`@font-face` only) remain for multi-theme
      setups that import the core stylesheet once.
  - **Theme packages dropped their `@fontsource*` runtime dependencies.** Fonts are inlined and copied
    at build time; consumers install only the theme package.
  - **`@ezhana/theme` is now a small optional runtime.** `createThemeManager({ themes })` takes the
    theme definitions directly; `defineThemeRegistry` (and the registry object it returned) is removed.
    The manager never touches the DOM at import time and runs headless with `root: null`, so it is
    SSR-safe. Styling does not depend on it at all.
  - **`@ezhana/theme-builder` emits the new artifact layout** (`style.css`, `theme.css`, `fonts.css`,
    `fonts/`, `index.js`, `index.d.ts`, `theme.json`) and copies/rewrites font assets. It still
    validates the theme against the core contract and enforces WCAG AA contrast.
  - **Token sources** now separate the mode-independent semantic layer (`tokens/semantic/base.json`)
    from the default theme's color modes (`tokens/semantic/modes/*.json`); generated artifacts are
    driven only by those sources.
  - The `data-theme` / `data-color-mode` contract is unchanged: no attribute means "follow the OS",
    explicit `light`/`dark` always wins over `prefers-color-scheme`, and the system preference is
    implemented in CSS only.

## 0.5.0

### Minor Changes

- c9da1b8: Add a `--no-theme` escape hatch to `create`.

  - `create-app <template> <name> --no-theme` skips the Ezhana theme overlay and the theme packages
    and keeps the plain official scaffold. The metadata patch, optional `--eslint`/`--prettier`
    configs and the lint/build verification still run.
  - The theme overlay and theme dependencies stay enabled by default, so existing commands are
    unchanged.

## 0.4.0

### Minor Changes

- 40c348e: Lint/format configuration now composes the shared workspace config packages instead of writing
  self-contained rule copies.

  - `configure` and `create --eslint --prettier` write thin `eslint.config.mjs` /
    `prettier.config.mjs` files that import `@ezhana/eslint-config-<framework>` and
    `@ezhana/prettier-config`, and add them as `workspace:*` devDependencies together with `eslint`,
    `prettier` and `typescript`.
  - The rule sets live only in those packages, so a rule change is made once and reaches the
    workspace root, the generated template and every generated app.
  - The config features require the app to live inside a pnpm workspace that ships the config
    packages (the `frontend-template` workspace); `configure` reports a clear error otherwise.

  The `@ezhana/eslint-config-*` and `@ezhana/prettier-config` packages remain private. They are no
  longer published to npm; they ship as workspace packages inside the generated template repository.

## 0.3.0

### Minor Changes

- f7243ed: Lint/format configuration is now opt-in and app-owned.

  - `create` no longer removes or rewrites the scaffold's ESLint/Prettier/Oxlint configuration,
    dependencies or scripts. It also no longer patches `package.json` dependencies; theme
    dependencies are added with `pnpm add`.
  - Add a `configure` subcommand that writes self-contained `eslint.config.mjs` /
    `prettier.config.mjs` files into an existing app and adds their dependencies with `pnpm add -D`:
    `create-ezhana-app configure apps/my-app --eslint --prettier`.
  - `create --eslint --prettier` runs the same configuration step during creation.
  - The generated configs do not import any `@ezhana` config package, so apps can extend the base
    rules directly.
  - No compatibility, migration, cleanup or patch logic is included: existing configs, dependencies
    and scripts are left alone, and `package.json` scripts are not changed.

  The internal `@ezhana/eslint-config-*` and `@ezhana/prettier-config` packages remain in the source
  repository as private modules and are no longer published.

## 0.2.1

### Patch Changes

- Refresh the bundled `versions.json` after the theme release. Generated apps now pin
  `@ezhana/theme` `^0.4.0` (per-theme color modes) and the new core/theme versions instead of
  `@ezhana/theme` `^0.3.0`, which rejects themes whose color-mode list differs from the others.

  Without this patch, an app generated by `create-ezhana-app@0.2.0` that adds a mode-subset theme such
  as QuestUI fails at start-up with:
  `defineThemeRegistry(definitions): the theme "quest" supports dark but light, dark was registered first`.

## 0.2.0

### Minor Changes

- 873f1c7: Ship themes as standalone packages ([ADR 0003](../../docs/adr/0003-themes-as-packages.md)).

  `@ezhana/design-tokens` is now the core package: primitive scale, semantic contract, default theme,
  core stylesheet, resolved values and a versioned machine-readable contract
  (`@ezhana/design-tokens/contract`). Theme identities and their palettes moved out of the package.

  - **Breaking:** removed `themes`, `themeLabels` and the `Theme` union from `@ezhana/design-tokens`;
    apps derive theme ids from their registry instead. `@ezhana/design-tokens/json` now exposes core
    values (`core.json`) instead of per-theme values (`themes.json`).
  - **Breaking:** removed the in-package theme sources (`tokens/themes/`), the Cerulean design
    narrative and the `primitive.color.blue` / `primitive.color.cerulean` ramps. Brand palettes belong
    to the theme packages that use them and are no longer emitted as CSS custom properties or typed as
    `PrimitiveTokenName`.
  - `@ezhana/theme-builder` (new) validates a theme against the contract — required overrides, known
    semantic tokens, references, color modes and WCAG AA contrast — and generates the theme
    stylesheet, standalone stylesheet, style entry, metadata, types and resolved JSON.
  - `@ezhana/design-theme-cerulean` and `@ezhana/design-theme-ocean` (new) are the official themes,
    built with `@ezhana/theme-builder`. Each owns its palette, its typeface and its overrides, depends
    on `@ezhana/design-tokens` but not on `@ezhana/theme`, and ships `./style`, `./theme.css`,
    `./standalone.css`, metadata and resolved JSON.
  - `@ezhana/theme` gains `defineThemeRegistry(definitions, options?)`, which merges theme definitions
    into frozen `{ themes, themeLabels, defaultTheme, modes }` metadata with literal id types.
  - Theme stylesheets now use `:root[data-theme="<id>"]` selectors, so they win over the core
    stylesheet regardless of import order.
  - Generated apps import `@ezhana/design-theme-ocean/style` and
    `@ezhana/design-theme-cerulean/style` and register the themes explicitly; the app no longer
    imports the Public Sans font package itself.
