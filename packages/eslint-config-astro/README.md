# @ezhana/eslint-config-astro

> **Published npm package.** `create-ezhana-app --eslint` adds it as a devDependency and the
> generated app imports it from a thin `eslint.config.mjs`. Edit the shared rules in
> [`index.js`](./index.js) and release with Changesets.

ESLint flat config for Astro and TypeScript projects.

## Usage

```js
// apps/<name>/eslint.config.mjs
import config from '@ezhana/eslint-config-astro'

export default config
```

## Include

- Base and TypeScript rules composed from `@ezhana/eslint-config-base` and
  `@ezhana/eslint-config-typescript`
- `eslint-plugin-astro` flat/recommended rules
- Prettier compatibility
