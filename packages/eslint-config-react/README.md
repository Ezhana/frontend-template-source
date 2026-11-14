# @ezhana/eslint-config-react

> **Published npm package.** `create-ezhana-app --eslint` adds it as a devDependency and the
> generated app imports it from a thin `eslint.config.mjs`. Edit the shared rules in
> [`index.js`](./index.js) and release with Changesets.

ESLint flat config for React and TypeScript projects.

## Usage

```js
// apps/<name>/eslint.config.mjs
import config from '@ezhana/eslint-config-react'

export default config
```

## Include

- Base and TypeScript rules composed from `@ezhana/eslint-config-base` and
  `@ezhana/eslint-config-typescript`
- React and React Hooks recommended rules
- Prettier compatibility
