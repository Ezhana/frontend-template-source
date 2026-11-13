---
'create-ezhana-app': patch
---

Generated apps now import their Prettier plugins as modules instead of listing the plugin package
names, so the app config works from any working directory.

- `--prettier` writes `import * as astro from 'prettier-plugin-astro'` (and the equivalent for
  `prettier-plugin-svelte`) and puts the imported value in `plugins`.
- Prettier resolves plugin names against its process cwd, so the pre-commit hook and the root
  `format` script failed with `Cannot find package 'prettier-plugin-astro' imported from
<workspace>/noop.js` when the plugin was installed only in the app.
- Module imports resolve from the generated config file, i.e. from the app's `node_modules`,
  regardless of the cwd.
