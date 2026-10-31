---
'create-ezhana-app': minor
---

Add a `--no-theme` escape hatch to `create`.

- `create-app <template> <name> --no-theme` skips the Ezhana theme overlay and the theme packages
  and keeps the plain official scaffold. The metadata patch, optional `--eslint`/`--prettier`
  configs and the lint/build verification still run.
- The theme overlay and theme dependencies stay enabled by default, so existing commands are
  unchanged.
