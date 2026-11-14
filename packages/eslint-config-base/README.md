# @ezhana/eslint-config-base

> **Published npm package.** The workspace root and the framework config packages compose it. It
> is published to npm as `@ezhana/eslint-config-base`; edit the shared rules in
> [`index.js`](./index.js) and release with Changesets.

Base ESLint flat config for frontend JavaScript projects.

## Usage

```js
// eslint.config.mjs (workspace root)
import config from '@ezhana/eslint-config-base'

export default config
```

The React, Vue, Astro, Next.js, Nuxt and Svelte config packages extend it, so configured apps normally get these rules through
`@ezhana/eslint-config-react` or `@ezhana/eslint-config-vue`.

## Include

- ESLint recommended rules for JavaScript files
- Browser globals
- Basic JavaScript rules
- Prettier compatibility, exported as `prettierConfig` for the framework configs
