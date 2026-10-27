# ADR 0002: Distribute create-app as a published npm package

- **Status:** Accepted
- **Date:** 2026-10-27
- **Scope:** `create-ezhana-app` and the generated `frontend-template` repository
- **Supersedes:** the vendoring option in [ADR 0001](0001-create-app-in-template-repo.md#distribution-of-the-generator)

## Context

[ADR 0001](0001-create-app-in-template-repo.md) made `frontend-template` a workspace starter with
a `create:app` command, and listed a published npm package as the preferred distribution of the
generator. Vendoring it into the template was explicitly a transitional option.

The first implementation took the transitional path: `scripts/export-template.mjs` copies
`tools/create-app/` into the generated repository, which runs it as
`node ./tools/create-app/bin/create-app.mjs`. That has four problems:

1. **Two sources of truth.** The generator exists in the source repository and, as a copy, in every
   generated template. The generated repository's CI (`template/.github/workflows/ci.yml`) never
   runs `create:app`, so a broken copy is not caught.
2. **No upgrade path.** A repository created with "Use this template" keeps the generator frozen at
   creation time. Fixing a recipe or an overlay means re-cloning or manually copying files; with a
   published package it is a one-line version bump.
3. **Template noise.** The tool is 24 files / ~1,100 lines / ~108 KB, more than half of the generated
   template's ~200 KB, and every consumer sees and can edit generator internals. The published
   tarball is ~11 kB.
4. **The generator needs its own version.** It pins the official scaffolders
   (`create-vite@9.3.3`, `create-vue@3.24.0`), owns the framework overlays and carries
   `versions.json` with the published `@ezhana/*` versions. Those changes deserve a semantic
   version, a changelog and independent testing — not a snapshot of a template repository.

## Decision

The generator is published as `create-ezhana-app` and is **not** vendored into the template.

- The source of truth stays in `tools/create-app/`, which becomes a workspace member
  (`tools/*` glob) so Changesets version and publish it.
- The package ships `bin/`, `lib/`, `overlays/`, `recipes/`, `snippets/` and `versions.json`, has no
  runtime dependencies. Its `prepack` hook regenerates `versions.json` from the source
  manifests. Releases should run from CI with provenance enabled (`pnpm publish --provenance`, or
  trusted publishing, which attaches it automatically); the current manual changesets flow does not
  force it.
- The exported template pins **exactly**
  `"create-ezhana-app": "<version>"` in `devDependencies` and runs
  `"create:app": "create-ezhana-app"`. `scripts/export-template.mjs` injects both from the package
  manifest, strips the `tools/*` workspace glob and validates that `tools/` is absent.
- Users run `pnpm install` before the first `pnpm create:app`; that installs the pinned generator.
- The export workflow verifies that the pinned version exists on npm before exporting, and the
  generated template's CI smoke-tests `pnpm create:app` against the installed package. The source
  CI packs the tarball and checks its file set.

### Why a devDependency instead of `npx` / `pnpm dlx`

- The generated template commits `pnpm-lock.yaml` and installs with `--frozen-lockfile`. Only a
  devDependency puts the generator, its integrity and its (currently zero) transitive dependencies
  in that lockfile, where they are auditable and can be bumped deliberately.
- `dlx` pins only the named package: transitive dependencies resolve freshly on every run and no
  lockfile entry is produced (see [pnpm discussion #10146](https://github.com/orgs/pnpm/discussions/10146)).
  It also re-resolves after the dlx cache is pruned.
- The workspace requires `pnpm install` anyway, and the generator is tiny, so the install cost is
  negligible; a fresh clone needs one extra documented step.
- `npx` is not used: the template is a pnpm workspace and should not depend on a second package
  manager's resolution and cache behaviour.

`pnpm dlx create-ezhana-app@<exact>` (or `@catalog:` on pnpm 12) remains an accepted alternative if
zero install footprint matters more than lockfile coverage; it must stay exactly pinned.

## Consequences

### Positive

- One source of truth; the generated repository contains only workspace configuration.
- Generator fixes, new recipes and overlay changes reach a cloned template by bumping one version.
- The published artifact is exercised by CI instead of only the source files.
- The generator gets its own semver, changelog and (when released from CI) provenance.
- The template export validates the pin instead of silently copying whatever `tools/` contains.

### Negative / trade-offs

- A release ordering constraint: `@ezhana/*` → `create-ezhana-app` → template export. The export
  fails if the pinned version is unpublished (lockfile generation), which is intentional.
- `pnpm install` is now required before `pnpm create:app`; the template READMEs say so.
- Existing cloned templates do not receive generator updates automatically; they bump the
  devDependency (same limitation as vendoring, but one line instead of a file copy).
- Publishing adds a package to maintain and a small amount of release overhead.

### Neutral

- The source repository keeps `tools/create-app` as the development home; only its distribution
  shape changes.
- The template still needs network access for the official scaffolders and the app install; the
  registry is additionally needed by `pnpm install` for the generator itself.

## Alternatives considered

1. **Keep vendoring** (rejected: duplicated source, no upgrade path, template noise, CI blind spot).
2. **`pnpm dlx` only** (rejected as the default: no lockfile coverage; accepted as an opt-in).
3. **`turbo gen`-style in-repo generator** (rejected: the generator is a framework scaffolder with
   pinned external CLIs; it is not a per-project code generator, and the template repository is
   generated and force-pushed).
4. **Publish the template itself as a package** (Expo-style `--template default@sdk-58`, rejected
   for now: the template is delivered as a GitHub repository, and the workspace skeleton is the
   product).
5. **CLI-only, no template repository** (rejected: the template is also the documented workspace
   landing page and the optional `packages/` layout).

## Implementation

- `tools/create-app/package.json`: package manifest, `bin`, `files`, `prepack`.
- `pnpm-workspace.yaml`: `tools/*` workspace glob (source only). The root `pnpm-lock.yaml` carries an
  empty `tools/create-app` importer: pnpm 12 omits zero-dependency projects when it takes the
  "already up to date" fast path, but `--frozen-lockfile` requires the importer entry.
- `.changeset/config.json`: include `tools/**` in `changedFilePatterns`.
- `scripts/export-template.mjs`: stop copying the tool; inject the pinned devDependency and
  `create:app` script; validate the output.
- CI: source pack/manifest checks, template `create:app` smoke test, export preflight.
- Docs: `docs/create-app.md`, `docs/template-distribution.md`, ADR 0001, the template READMEs and
  the root README.
