# create-ezhana-app

Scaffolds a Next.js, Vue, Astro, Nuxt or SvelteKit app inside an Ezhana `frontend-template`
workspace. The tool is a dispatcher over the official scaffolders; the framework-to-CLI mapping and
the default flags live in [`lib/registry.mjs`](./lib/registry.mjs).

```bash
pnpm install
pnpm create:app                              # choose a framework, then run the official CLI interactively
pnpm create:app next my-app                  # official CLI interactive, framework preselected
pnpm create:app next my-app --defaults       # registry defaults, no prompts
pnpm create:app vue my-app --defaults --eslint --prettier
pnpm create:app next my-app --defaults --theme ocean
pnpm create:app configure apps/my-app --eslint --prettier
```

Apps are created under `apps/<name>` and become part of the pnpm workspace. Run create from the
workspace root; `--target <path>` generates somewhere else.

## Interactive and non-interactive modes

Without `--defaults`, the official scaffolder owns its prompts. The wrapper only asks for a missing
framework and app name. Passing the framework positionally (or with `--framework`) skips the
wrapper's framework prompt; the official CLI still prompts for its own options.

`--defaults` runs the same CLI with the `defaultFlags` from the registry, so the command is suitable
for CI. Non-interactive environments without `--defaults` fail with a clear error.

## Registry

Each entry in [`lib/registry.mjs`](./lib/registry.mjs) defines:

| Field              | Meaning                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `package`          | published scaffolder package, e.g. `create-next-app@latest`      |
| `args`             | argument builder that inserts the project directory and flags    |
| `interactiveFlags` | flags used when the official CLI should prompt                   |
| `defaultFlags`     | flags used by `--defaults`                                       |
| `eslintConfig`     | workspace ESLint config package used by `--eslint` / `configure` |
| `prettierPlugins`  | extra Prettier plugins added by `--prettier`                     |
| `detect`           | package.json detection used by `configure`                       |

To add a framework, add one registry entry and (if needed) a shared ESLint config package.

## Lint and format

`--eslint` writes `eslint.config.mjs` at the app root and adds the framework-mapped workspace
config package plus `eslint` and `typescript` at the catalog versions from `versions.json`.

`--prettier` writes `prettier.config.mjs` and `.prettierignore` at the app root and adds
`@ezhana/prettier-config`, `prettier`, and any registry `prettierPlugins` (for example
`prettier-plugin-astro` and `prettier-plugin-svelte`).

The written files contain no rules: the rules live in `packages/eslint-config-*/index.js` and
`packages/prettier-config/index.js`. The lint/format features require the app to be inside a pnpm
workspace that ships these packages; `--target` outside the workspace cannot be combined with
`--eslint` / `--prettier`.

`configure` detects the framework from `package.json` and accepts `--framework` as an override. It
overwrites the config files it owns and does not delete or rewrite scaffold configuration, scripts
or dependencies.

## Theme CSS

`--theme <name>` is a minimal CSS-only integration:

- a bare id such as `ocean` maps to `@ezhana/design-theme-ocean`;
- a full package spec such as `@acme/design-theme` is used as-is;
- the tool searches a fixed list of global CSS paths (preferring `src/styles/global.css`), prepends
  `@import '<package>/style.css';`, and adds the theme package to the app;
- if no global CSS file is found, the theme is skipped with a warning and nothing is installed.

There is no runtime, switcher, anti-flash script or framework-specific overlay.

## Options

| Option               | Effect                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| `--framework <name>` | framework name (alternative to the first positional argument)           |
| `--name <name>`      | app directory name (alternative to the second positional argument)      |
| `--target <path>`    | explicit output path instead of `apps/<name>`                           |
| `--root <path>`      | workspace root used for the default `apps/<name>` path                  |
| `--defaults`         | run the official scaffolder with the registry default flags             |
| `--eslint`           | write `eslint.config.mjs` and add the framework's shared ESLint package |
| `--prettier`         | write `prettier.config.mjs` / `.prettierignore` and add Prettier        |
| `--theme <name>`     | inject a theme CSS import into the app's global CSS                     |
| `--no-install`       | scaffold and write files only; print the install commands               |
| `--no-verify`        | add dependencies but skip lint/build verification                       |
| `--keep-temp`        | keep the staging directory when generation fails                        |
| `--list`             | list available frameworks                                               |

## Configure an existing app

```bash
pnpm create:app configure apps/my-app --eslint --prettier
```

| Option               | Effect                                                           |
| -------------------- | ---------------------------------------------------------------- |
| `--target <path>`    | app directory (default: current directory)                       |
| `--framework <name>` | framework override; otherwise inferred from `package.json`       |
| `--eslint`           | write `eslint.config.mjs` and add the shared ESLint package      |
| `--prettier`         | write `prettier.config.mjs` / `.prettierignore` and add Prettier |
| `--no-install`       | write files only; print the `pnpm add` command                   |

Requires Node.js 24 and pnpm 12, and network access for the first run (the official scaffolders and
dependencies are downloaded).
