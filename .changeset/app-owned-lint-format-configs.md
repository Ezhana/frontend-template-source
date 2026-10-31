---
'create-ezhana-app': minor
---

Lint/format configuration is now opt-in and app-owned.

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
