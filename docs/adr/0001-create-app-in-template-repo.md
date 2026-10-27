# ADR 0001: Create apps from inside the template repository

- **Status:** Accepted; the generator distribution section is superseded by
  [ADR 0002](0002-distribute-create-app-via-npm.md)
- **Date:** 2026-10-27
- **Scope:** `frontend-template` distribution and `tools/create-app`

## Context

The generated `frontend-template` repository currently ships two complete apps
(`apps/react-vite`, `apps/vue-vite`). Users choose a stack by deleting the app they do not need.

That model has two problems:

1. A static GitHub template cannot ask the user which stack they want. GitHub's **Use this
   template** only copies the repository; the "choice" happens outside the template.
2. Shipping both apps by default makes the template heavier and encourages maintaining complete
   sample apps instead of a small, versioned patch layer.

The source repository already has a generator (`tools/create-app`) that wraps the official
scaffolders (`create-vite` / `create-vue`), normalizes generated tooling and applies the
`@ezhana/*` config/theme overlay. It is currently a source-repository-only tool and is not included
in the generated template.

## Decision

`frontend-template` becomes a **workspace starter**, not a ready-to-run application repository. The
template ships:

- the root workspace (`apps/`, optional `packages/`, pnpm config, shared tooling);
- a `create:app` command;
- English and Chinese READMEs explaining the one-command workflow.

The generated template does **not** ship default apps. After cloning or using the template, the user
runs one command:

```bash
pnpm create:app
```

The command interactively selects:

1. the framework/stack (initially React and Vue);
2. the target app name;
3. (optionally) the package manager.

It then routes to the official CLI for that stack, applies the repository patch, installs
dependencies and verifies the result. Non-interactive flags are available for CI and power users:

```bash
pnpm create:app react my-app
pnpm create:app vue my-app
```

Apps are created under `apps/<name>` and become part of the existing pnpm workspace.

### Distribution of the generator

> Superseded by [ADR 0002](0002-distribute-create-app-via-npm.md): the generator is published as
> `create-ezhana-app` and pinned as an exact devDependency of the generated template. The section
> below is kept for context.

`create:app` must be a standalone command and must not depend on this source repository's
`packages/*` or `apps/*` directories. The preferred distribution is a published npm package (for
example `create-ezhana-app`) containing:

- the official-CLI adapters/recipes;
- the framework and bundler overlays;
- a version manifest for `@ezhana/*` packages;
- the CLI entry point.

The generated template declares the command as a dependency:

```json
{
  "devDependencies": {
    "create-ezhana-app": "<pinned>"
  },
  "scripts": {
    "create:app": "create-ezhana-app"
  }
}
```

Vendoring the generator into the template was a transitional option only; see ADR 0002 for why it
was dropped.

## Architecture

```text
user: pnpm create:app
        │
        ▼
  selector (interactive / flags)
        │
        ▼
  recipe resolver  ──► framework adapter + bundler adapter + official CLI adapter
        │
        ▼
  scaffold into a staging directory (pinned official CLI, non-interactive, no install)
        │
        ▼
  repository patch
    ├── normalize: remove generated ESLint/Prettier/Oxlint configs and scripts
    ├── overlay:   write @ezhana configs, theme runtime, ThemeRoot, ThemeSwitcher
    ├── package:   patch package.json dependencies/scripts
    └── entry:     patch index.html and entry imports
        │
        ▼
  install once → format/lint/build verify → move to apps/<name>
```

The wrapper owns the hooks. Official scaffolders do not expose a reliable post-generation hook, so
the wrapper's lifecycle is the only supported extension point.

## Repository patch rules

- Patch by **known contract**, not heuristic config discovery. Prefer official CLI flags that skip
  generated ESLint/Prettier configuration (for example `create-vue` feature flags).
- Remove only known generated config files and `package.json` keys. If an unknown lint/format config
  appears, fail with a clear message and update the recipe.
- Never merge generated ESLint/Prettier configs; the patch layer owns the final state.
- Patch `package.json` structurally (JSON), not with regular expressions.
- Patch entry files with markers/AST or by replacing the entry file from the framework overlay; do not
  use blind string replacement across the app.
- Apply the patch **before** installing dependencies, then install exactly once.
- Generate in a staging directory first; only move into `apps/<name>` after verification succeeds.
- Pin official CLI versions and test the generated output in CI.

## Root scripts and template layout

Because apps are now user-created, root scripts must not hardcode `react-vite` / `vue-vite`:

```json
{
  "scripts": {
    "dev:react": "pnpm --filter ./apps/react-vite dev",
    "dev:vue": "pnpm --filter ./apps/vue-vite dev",
    "build:apps": "pnpm -r --filter './apps/*' --if-present build",
    "lint": "eslint . && pnpm -r --filter './apps/*' --if-present lint",
    "build": "pnpm build:packages && pnpm build:apps"
  }
}
```

The initial `apps/` directory is empty except for a README/placeholder. `pnpm install`, `pnpm lint`,
`pnpm build` and `pnpm check` must remain valid with zero apps.

## Consequences

### Positive

- Users choose the stack themselves instead of deleting an unwanted app.
- The template no longer carries full sample apps, so the patch layer is the single source of truth.
- Adding a framework or bundler means adding a recipe/adapter, not maintaining another app.
- The same generator can be used locally, in the template repository and in CI.

### Negative / trade-offs

- **Not an instant `Use this template` experience.** The template needs one explicit command after
  cloning; READMEs and CLI output must make this obvious.
- The generator must become a standalone distributable, including overlays and versions.
- The template repository needs network access for `pnpm create:app` (official scaffolders) and for
  installing the generated app.
- Generated output must be contract-tested against fixed official CLI versions.

### Neutral

- The source repository remains the development home for `@ezhana/*` packages and the generator;
  only the distribution shape changes.
- The GitHub **Template repository** setting can stay enabled on `frontend-template`, but the
  template is intentionally not optimized for immediate development.

## Alternatives considered

1. **Keep both default apps and let users delete one.** Simple today, but does not satisfy the
   in-template stack choice and keeps full sample apps.
2. **Separate template repositories per stack.** Direct out-of-box UX, but reintroduces the
   multi-template maintenance problem.
3. **CLI-only, outside any template repository.** Flexible, but does not provide the shared
   monorepo/workspace and optional `packages/` layout the template is meant to deliver.

## Implementation notes

- Refactor `createApp` to accept a resolved recipe from a registry rather than
  `react`/`vue`-specific fields.
- Package the CLI plus `overlays/` and a `versions.json`; remove reads of the source repository's
  `packages/*`, `pnpm-workspace.yaml` catalog and `apps/*`.
- Refactor the recipes into framework × bundler × scaffold adapters so Rollup/Webpack can be added
  without duplicating the React/Vue integration.
- Export a template without generated apps, but with `create:app` wired up.
- Add CI coverage for: initial empty template install/check, and generated React/Vue apps.
- Keep the one-command flow in both `README.md` and `README.zh-CN.md`.

## Open questions

- ~~Publish the CLI as `create-ezhana-app` or vendor it until the first stable release?~~ Resolved
  by [ADR 0002](0002-distribute-create-app-via-npm.md): published package, exact devDependency, no vendoring.
- Should the template still include a minimal "hello world" app for visual smoke tests, or keep
  `apps/` empty?
- Which package manager selection is exposed in the prompt: pnpm only, or pnpm/npm/yarn?
