---
'create-ezhana-app': patch
---

Scope pnpm's local-workspace linking to the lint/format config install.

The previous global linking preference also applied to `--theme`, so a fresh source checkout linked
the local `@ezhana/design-theme-*` sources before their `dist/` was built and the generated app
failed to resolve `<theme>/style.css`. The generator now passes
`--config.prefer-workspace-packages`, `--config.link-workspace-packages` and
`--config.save-workspace-protocol=false` only to the `pnpm add -D` call that installs
`@ezhana/eslint-config-*` / `@ezhana/prettier-config`.

Config packages still link locally during source-repository testing while `package.json` keeps the
consumer-facing `^<version>` spec; theme packages and scaffold dependencies resolve from the
registry, so their published `dist/` output is used.
