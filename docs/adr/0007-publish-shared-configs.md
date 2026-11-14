# ADR 0007: Publish the shared lint/format configs as npm packages

- **Status:** Accepted
- **Date:** 2026-11-14
- **Scope:** the nine `@ezhana/*` config packages, `scripts/export-template.mjs`,
  `create-ezhana-app`, the generated `frontend-template` repository, Changesets
- **Supersedes:** [ADR 0004](0004-app-owned-lint-format-configs.md)
- **Amends:** [ADR 0002](0002-distribute-create-app-via-npm.md) for how the template obtains its
  lint/format configuration

## Context

[ADR 0004](0004-app-owned-lint-format-configs.md) made the config packages the single source of
lint/format rules, but kept them private and copied them into the generated template's `packages/`
directory as workspace packages. That removed the hand-maintained rule copies, but it created new
problems:

1. **No upgrade path.** A template repository keeps its copy of `packages/eslint-config-*` forever.
   Rule fixes and framework upgrades reach users only when they manually copy files from a new
   template export. A package dependency would be a one-line version bump.
2. **The template ships source it does not own.** The exported repository contains `@ezhana` source
   that is overwritten by the next export, so users cannot safely edit it, and the repository's
   `packages/` directory is not actually spare space for their own packages.
3. **The generator needs the workspace.** `create-ezhana-app --eslint/--prettier` could only run
   inside a workspace that already shipped the packages, even though the generated app only needs
   the rules. That blocked `--target` outside the template workspace and coupled the generator to a
   specific template layout.
4. **The packages were already release artifacts in practice.** They are versioned, have
   changelogs, and several versions were published ad hoc. Keeping them `private` made the release
   process inconsistent with the design/theme packages.

## Decision

### 1. The nine config packages are public npm packages

`packages/eslint-config-*` and `packages/prettier-config` no longer set `private: true`. Each has a
`publishConfig.access: "public"` and a `repository` entry, is versioned and published by Changesets,
and lists its sibling config packages with `workspace:^` so published manifests carry semver
ranges.

The package set is:

```text
@ezhana/eslint-config-base
@ezhana/eslint-config-typescript
@ezhana/eslint-config-react
@ezhana/eslint-config-vue
@ezhana/eslint-config-astro
@ezhana/eslint-config-next
@ezhana/eslint-config-nuxt
@ezhana/eslint-config-svelte
@ezhana/prettier-config
```

The React/Vue/Astro/Next/Nuxt/Svelte packages compose the base and TypeScript packages; the base
package exports `prettierConfig` for them. The rules still live only in `packages/`.

### 2. The generated template consumes the packages from npm

`scripts/export-template.mjs` no longer copies the config package directories. The exported root
`package.json` declares:

```json
{
  "devDependencies": {
    "@ezhana/eslint-config-base": "^<version>",
    "@ezhana/prettier-config": "^<version>"
  }
}
```

`packages/` in the template contains only a README: it is space for the user's own workspace
packages. The root `eslint.config.mjs` / `prettier.config.mjs` import the npm packages, so a rule
fix is a dependency bump. The export fails if any `workspace:` dependency or any `packages/*`
directory is present.

### 3. Generated apps add the published packages as normal devDependencies

`create-ezhana-app --eslint` writes a thin `eslint.config.mjs` and runs `pnpm add -D` with:

- the framework-mapped `@ezhana/eslint-config-*` at `^<version>` from `versions.json`;
- `eslint` and `typescript` at the catalog versions;
- `typescript-eslint` for Astro, because `eslint-plugin-astro` resolves its parser from the app.

`--prettier` adds `@ezhana/prettier-config@^<version>`, `prettier`, and the registry's Prettier
plugins. The config files still contain no rules: they import the package and spread it into
`defineConfig([...])`.

The generator no longer walks up to find `pnpm-workspace.yaml` and no longer requires the packages
to be workspace members. `--eslint` / `--prettier` work for any target. `versions.json` now includes
the config packages because it is generated from all non-private package manifests.

The generated configs use ESLint's official `defineConfig` helper from `eslint/config`. The
`extends: ['@ezhana/eslint-config-*']` string form is not used: in `@eslint/config-helpers` (the
implementation behind `defineConfig`) a string in `extends` refers to a registered plugin config,
not to an npm package. A normal ESM import of the installed package is the supported way to compose
a shared config package.

### 4. The config install prefers local packages

So that the generator can be tested before a release, the `pnpm add -D` run that adds the config
packages passes `--config.prefer-workspace-packages=true`,
`--config.link-workspace-packages=true` and `--config.save-workspace-protocol=false`. Against the
source workspace, a matching `@ezhana/eslint-config-*` / `@ezhana/prettier-config` range links the
local package while `package.json` keeps the consumer-facing `^<version>` spec. The flags are
scoped to that one install: theme packages and every other dependency still resolve from the
registry. In the exported template there are no local config packages, so the same specs resolve
from npm.

### 5. Release order

The config packages are released before the generator version that references them and before the
template export:

1. `@ezhana/design-tokens`
2. official theme packages
3. `@ezhana/typography-editorial` and `@ezhana/theme`
4. the nine shared lint/format config packages
5. `create-ezhana-app`
6. export/push the template

The export workflow verifies that every config package version referenced by the template exists on
npm before running `pnpm install --lockfile-only`.

## Consequences

### Positive

- Users upgrade lint/format rules by bumping an npm dependency; no file copy or re-export.
- The generated template no longer contains `@ezhana` source, and `packages/` is genuinely free for
  the user's own packages.
- The generator works for any target, including `--target` outside a workspace.
- One release process for design/theme/config packages: Changesets, changelogs and public manifests.
- The rules remain defined once, in `packages/`.

### Negative / trade-offs

- Nine more public npm release artifacts to version and support.
- Template and app installs need the config packages on npm; the export cannot run before publish.
  The release order and the export-workflow check make this explicit.
- Source-repository config installs link the local packages, while template and consumer installs
  resolve from the registry. The source workflow and the template workflow therefore exercise
  different resolution paths (links vs registry), although both use the same `^<version>` manifests.
- Users who want a different rule set must add overrides in their config or fork the package; they
  can no longer edit a copied source file in `packages/`.

### Neutral

- Generated apps still keep the official scaffold's own lint/format configuration unless
  `--eslint` / `--prettier` is passed.
- The `.prettierignore` file and plugin import strategy are unchanged.
- Themes and tokens were already npm packages and keep their existing distribution model.

## Alternatives considered

1. **Keep copying the packages into the template (ADR 0004).** Rejected: no upgrade path, the
   template ships foreign source, and the generator stays coupled to the workspace.
2. **Publish only the root configs (`base` and `prettier`) and let apps define framework rules.**
   Rejected: it reintroduces per-app rule copies and loses the framework mapping in the registry.
3. **Use `extends: ['@ezhana/eslint-config-*']`.** Rejected for this ESLint version: string
   extensions resolve plugin configs, not npm packages. The generated configs import the package
   directly with `defineConfig`.
4. **Keep the packages private and have users install them from a registry-less workspace.**
   Rejected: that is ADR 0004's model and does not survive outside the template workspace.
5. **Generate the template's package copies from npm tarballs at export time.** Rejected: it adds a
   second packaging step and still leaves copied source in the template for no benefit over a
   dependency.

## Migration and release notes

- Add a Changesets release that includes all nine config packages. `pnpm changeset version` bumps
  them and updates the internal `workspace:^` ranges; `pnpm changeset:publish` publishes them with
  pnpm, which rewrites the workspace protocol.
- `create-ezhana-app` gets a minor release for the npm-dependency specs and the removed workspace
  requirement.
- Re-export the template after publishing. Existing generated apps are unaffected until they bump
  their config dependencies; re-running `create:app` for a new app writes the npm specs.
- The template's `packages/` directory no longer carries the config packages; the template CI
  installs them from npm and runs the configured app creation path end to end.
