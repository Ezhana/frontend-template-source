---
'create-ezhana-app': minor
---

Lint/format configuration now composes the shared workspace config packages instead of writing
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
