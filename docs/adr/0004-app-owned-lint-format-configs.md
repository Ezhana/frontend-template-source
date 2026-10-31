# ADR 0004: Lint/format configs ship as workspace packages

- **Status:** Accepted; rewritten in place on 2026-11-01. Replaces the earlier "app-owned
  self-contained configs" decision.
- **Date:** 2026-11-01
- **Scope:** the five `@ezhana/*` config packages, the generated `frontend-template` repository,
  `create-ezhana-app`
- **Amends:** [ADR 0001](0001-create-app-in-template-repo.md#repository-patch-rules) for lint/format
  patch rules and [ADR 0002](0002-distribute-create-app-via-npm.md) for how the template is
  assembled

## Context

The previous revision of this ADR made lint/format configuration app-owned and self-contained:
`create-ezhana-app` wrote complete rule sets into every generated app, and the generated template's
root configs were complete files too. Those files were hand-maintained copies of the private
packages in `packages/`:

- `packages/eslint-config-base/index.js`
- `packages/eslint-config-typescript/index.js`
- `packages/eslint-config-react/index.js`
- `packages/eslint-config-vue/index.js`
- `packages/prettier-config/index.js`

That created three sources of the same rules — the packages, `tools/create-app/templates/` and
`template/` — that had to be kept in sync by hand. Every rule change had to be repeated in up to
three places, and the copies could drift. The generated template also shipped a `packages/`
directory with only a placeholder README, while the rules users were expected to edit lived in files
that a template regeneration overwrites.

The config packages themselves are useful: they are the repository's real lint/format composition,
they are small, and there is no reason to publish them to npm.

## Decision

### 1. The five config packages are the single source of rules

The packages stay in `packages/` and are the only place where the rule sets exist:

- `@ezhana/eslint-config-base`
- `@ezhana/eslint-config-typescript`
- `@ezhana/eslint-config-react`
- `@ezhana/eslint-config-vue`
- `@ezhana/prettier-config`

They stay private (`private: true`, no `publishConfig`) and are not published or versioned by
Changesets. The React and Vue packages compose the base and TypeScript packages; the base package
exports the Prettier compatibility config (`prettierConfig`) that the framework packages append.
No copies exist to keep in sync.

### 2. The generated template ships the packages under `packages/`

`scripts/export-template.mjs` copies the five package directories from this repository into the
generated `frontend-template` repository under `packages/`, keeping the same layout. The exported
root configs compose them:

```js
// eslint.config.mjs
import config from '@ezhana/eslint-config-base'

export default config
```

```js
// prettier.config.mjs
export { default } from '@ezhana/prettier-config'
```

The exported root `package.json` declares `@ezhana/eslint-config-base` and
`@ezhana/prettier-config` as `workspace:*` devDependencies, plus `eslint`, `prettier` and
`typescript` from the catalog. The packages' own dependencies (`@eslint/js`,
`eslint-config-prettier`, `globals`, `typescript-eslint` and the framework plugins) are declared
once, in the package manifests.

### 3. Generated apps get thin configs that compose the packages

`create-ezhana-app` still writes lint/format configuration only when asked. The files it writes
contain no rules of their own:

- `eslint.config.mjs` imports `@ezhana/eslint-config-<framework>` and spreads it into
  `defineConfig([...])`, leaving the array as the extension point for app-level overrides;
- `prettier.config.mjs` re-exports `@ezhana/prettier-config`;
- `.prettierignore` remains a standalone file.

Dependencies are added with `pnpm add -D`: `@ezhana/eslint-config-<framework>` (or
`@ezhana/prettier-config`) as `workspace:*`, plus `eslint`/`prettier` and `typescript` at the catalog
versions from `versions.json`. A rule change is made once, in `packages/eslint-config-*/index.js` or
`packages/prettier-config/index.js`; an app can still add its own rule overrides in its config file.

### 4. The config features require a workspace that contains the packages

The written app configs import workspace packages, so `configure` (and `create:app` with
`--eslint`/`--prettier`) only works when the app is inside a pnpm workspace that ships them: the
generated `frontend-template` repository or this source repository. `configure` walks up from the
target to find `pnpm-workspace.yaml` and fails with an explicit error when the workspace or the
needed packages are missing. Generating with `--target` outside such a workspace cannot be combined
with `--eslint`/`--prettier`.

### 5. No copies, no codegen, no patch logic

The change removes the hand-maintained rule copies rather than generating them. There is no codegen
or sync step: the export copies whole package directories. `configure` keeps its narrow behavior: it
writes the files it owns, adds dependencies and stops. It does not remove scaffold tooling, rewrite
scripts, migrate old apps or reconcile versions.

## Consequences

### Positive

- One source of truth for lint/format rules; a rule change is made once.
- Users can extend the base rules in the app config and change shared rules in the workspace
  packages.
- The generated template carries editable, visible config packages instead of hidden copies.
- The config packages need no npm release: the generated template links them as workspace packages.

### Negative / trade-offs

- The generated template now contains `@ezhana` source code (the five config packages), not only
  configuration.
- Lint/format configuration is available only inside a workspace that ships the packages; a
  standalone app directory cannot use `--eslint`/`--prettier`.
- The template snapshot is a copy: edits users make in their generated repository are not propagated
  automatically, and changes here reach users only through a new export.
- Framework plugins and `typescript-eslint` versions are pinned in the package manifests, so
  upgrading them means editing the packages, not the generated apps.
- Users who want `pnpm lint` to run ESLint still adjust their scripts themselves.

### Neutral

- The packages remain private workspace packages, outside Changesets and `versions.json`.
- Theme packages and the theme runtime are still installed from npm; only the config packages ship
  as workspace source.

## Alternatives considered

1. **Publish the five packages to npm.** Rejected: it recreates a dependency users cannot freely
   edit and adds five more release artifacts; the packages only need to exist inside the workspace.
2. **Keep self-contained copies in the generator templates and the template root.** Rejected: it is
   the design this ADR replaces — three hand-maintained rule sources that drift.
3. **Generate or sync the copies from the packages.** Rejected: a codegen step adds build tooling,
   generated files and its own failure modes for no benefit over shipping the packages themselves.
4. **Keep the packages private and do not ship them.** Rejected: generated configs would either
   import an unpublished package or fall back to copies.
5. **Make `configure` a migration/cleanup tool.** Rejected: it adds compatibility branches and patch
   logic; a small explicit writer is more maintainable.

## Migration and release notes

- This file is rewritten in place to keep incoming links working: the title and the decision
  changed, not the filename.
- `create-ezhana-app` gets a minor release for the thin configs and the workspace requirement.
- The five config packages stay `private`; they are not versioned or published (they were already
  unpublished under the previous decision).
- Apps generated by older releases keep their self-contained configs; nothing is migrated. Running
  `configure` from the new release writes the thin configs into a workspace app.
- The generated template must be re-exported for the packages and the new root configs to appear.
  After a config-package change, re-export as well: the rules ship as a copy inside the generated
  repository. Users edit the rules in their own copy generated from the template; the template
  repository itself is force-pushed from this source repository, so upstream rule changes belong
  here.
