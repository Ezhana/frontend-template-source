# @ezhana/eslint-config-svelte

## 0.2.0

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

### Patch Changes

- Updated dependencies
  - @ezhana/eslint-config-base@0.2.0
  - @ezhana/eslint-config-typescript@0.2.0
