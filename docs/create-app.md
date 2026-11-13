# Creating an app from official scaffolders

`tools/create-app` is a dispatcher over the official framework CLIs. It scaffolds Next.js, Vue,
Astro, Nuxt and SvelteKit apps, optionally writes root-level ESLint/Prettier configuration, and can
inject a theme stylesheet into an existing global CSS file. The same code is published as
[`create-ezhana-app`](https://www.npmjs.com/package/create-ezhana-app) and pinned by the generated
template; this repository runs it from `tools/create-app` directly.

```bash
pnpm create:app
# choose a framework, then the official CLI prompts for its options

pnpm create:app next my-next-app
pnpm create:app vue my-vue-app
pnpm create:app astro my-astro-app
pnpm create:app nuxt my-nuxt-app
pnpm create:app sveltekit my-sveltekit-app

pnpm create:app next my-next-app --defaults
pnpm create:app vue my-vue-app --defaults --eslint --prettier
pnpm create:app next my-next-app --defaults --theme ocean
```

Apps are created under `apps/<name>` by default. Use `--target <path>` to generate elsewhere. The
command requires network access (the external scaffolders are downloaded with `pnpm dlx`) and
Node.js 24 + pnpm 12. In the generated template, run `pnpm install` once first: it installs the
pinned `create-ezhana-app` devDependency.

## Registry

[`tools/create-app/lib/registry.mjs`](../tools/create-app/lib/registry.mjs) is the single place that
maps a framework to its scaffolder:

| Framework   | Package                  | `--defaults` flags                                        |
| ----------- | ------------------------ | --------------------------------------------------------- |
| `next`      | `create-next-app@latest` | TypeScript, App Router, `src/`, Tailwind, official ESLint |
| `vue`       | `create-vue@3.24.0`      | `--ts --force`                                            |
| `astro`     | `create-astro@latest`    | `--template basics --yes`                                 |
| `nuxt`      | `nuxi@latest`            | `init --template minimal`                                 |
| `sveltekit` | `sv@latest`              | `create --template minimal --types ts --no-add-ons`       |

Each entry also defines `interactiveFlags`, the ESLint config package used by `--eslint`, and the
Prettier plugins used by `--prettier`.

## Lifecycle

```text
preflight → official scaffold → metadata patch → move → optional theme CSS
          → install → optional app config → verify
```

1. **preflight**: resolve the framework and target (`apps/<name>` by default); the target must be
   empty.
2. **scaffold**: run the registry CLI in a staging directory next to the target. Without
   `--defaults`, the official CLI runs interactively; with `--defaults`, the registry flags are
   appended.
3. **prepare metadata**: remove generated lockfiles, `node_modules`, `.git` and any
   `pnpm-workspace.yaml`; set the app `name` and `private` fields. The scaffold's dependencies,
   scripts and lint/format configuration are otherwise left untouched.
4. **move**: rename the staging app to the target before dependency installation, so the app exists
   at `apps/<name>` when pnpm resolves the workspace.
5. **optional theme**: with `--theme`, find a global CSS file from a fixed candidate list, prepend
   the theme package's `style.css` import, and add the theme package. If no CSS file is found, warn
   and skip the theme.
6. **install**: the theme package with `pnpm add`, otherwise `pnpm install --no-frozen-lockfile`.
7. **optional app config**: write `eslint.config.mjs` / `prettier.config.mjs` and add their
   dependencies when `--eslint` / `--prettier` is passed.
8. **verify**: run ESLint if configured, otherwise the app's `lint` script when present, then
   `pnpm build`.

If installation or verification fails, the moved app is removed so the command can be retried
against an empty target (`--keep-temp` skips both the cleanup and the staging cleanup).

## Interactive mode

Without `--defaults`, the official CLI owns its prompts. The wrapper only prompts for a missing
framework and app name. Passing the framework positionally (or with `--framework`) skips the
framework prompt; the official CLI still prompts.

Non-interactive environments (CI, piped stdin) must pass `--defaults`; otherwise the command exits
with an error instead of hanging.

Examples of official prompts:

- Next.js: TypeScript, ESLint, Tailwind, App Router, `src/`, import alias, React Compiler.
- Vue: TypeScript, JSX, Router, Pinia, Vitest, E2E, ESLint, Prettier.
- Astro: template choice.
- Nuxt: template choice.
- SvelteKit: template, type checking, add-ons.

## Lint and format

`--eslint` / `--prettier` write files at the **app root** and never inspect framework internals:

- `eslint.config.mjs` imports the framework's workspace config package
  (`@ezhana/eslint-config-next|vue|astro|nuxt|svelte`);
- `prettier.config.mjs` re-exports `@ezhana/prettier-config` and enables the registry's Prettier
  plugins;
- `.prettierignore` is the shared file.

Dependencies are added with `pnpm add -D`: the config package as `workspace:*`, plus `eslint`,
`typescript` and `prettier` at the catalog versions from `versions.json`, and any Prettier plugins at
their catalog versions.

The shared rules live in `packages/eslint-config-*` and `packages/prettier-config`; edit them there.
The flags overwrite the files they own during creation and do not delete Oxlint or other scaffold
configuration, rewrite scripts, or migrate old configs. There is no standalone command for
existing apps.

The lint/format features require the app to be inside a pnpm workspace that ships these packages
(the generated template or this repository). Outside such a workspace they stop with an error before
writing files.

## Theme CSS

`--theme` is a CSS-only integration:

- a bare id such as `ocean` maps to `@ezhana/design-theme-ocean`;
- a package spec such as `@acme/design-theme` is used as-is;
- the tool searches fixed global CSS candidates, preferring `src/styles/global.css` and then
  `src/styles/globals.css`, `src/app/globals.css`, `src/assets/main.css`, `src/app.css`,
  `src/routes/layout.css`, and a few other conventional paths;
- the theme's `style.css` is prepended as `@import`;
- if no candidate exists, the theme is skipped with a warning and no package is installed.

There is no overlay, switcher, runtime or anti-flash script. The generator does not modify framework
entry files or layouts to apply the theme.

## CI

`.github/workflows/create-app.yml` runs the matrix for all five frameworks:

- `--defaults` for a plain scaffold;
- `--defaults --eslint --prettier` for the shared config path;
- `--defaults --theme ocean` for Next.js and `--defaults --theme cerulean` for Vue.

Interactive mode is not exercised in CI because GitHub Actions has no TTY. The workflow also packs
the generator and asserts that overlays and recipes are no longer published.

## Distribution

The tool is published as the [`create-ezhana-app`](https://www.npmjs.com/package/create-ezhana-app)
npm package; see [ADR 0002](adr/0002-distribute-create-app-via-npm.md). The generated
`frontend-template` repository depends on it as an exact devDependency and exposes it as
`pnpm create:app`:

```json
{
  "devDependencies": {
    "create-ezhana-app": "<version>"
  },
  "scripts": {
    "create:app": "create-ezhana-app"
  }
}
```

`scripts/export-template.mjs` reads the version from `tools/create-app/package.json`, injects the
devDependency and script, and never copies the tool into the template. It also copies the nine
shared config packages into the template's `packages/`. Users run `pnpm install` once before the
command, which puts the pinned generator (and its integrity) in the template's `pnpm-lock.yaml`.

`versions.json` is regenerated from the **non-private** package manifests under `packages/` (theme
and token packages) plus the workspace catalog by the package's `prepack` hook (and manually with
`pnpm sync:create-app`). The shared config packages are private, so they are not listed there; the
template export copies them into the template's `packages/`.

## Shared config packages

`packages/eslint-config-*` and `packages/prettier-config` are **workspace packages**: private, not
published to npm, and the single source of the lint/format rules. The framework mapping lives in the
create-app registry, not in duplicated template files. See
[ADR 0004](adr/0004-app-owned-lint-format-configs.md).
