# @ezhana/eslint-config-nuxt

> **Shared workspace package.** Apps configured with `--eslint` import it from their thin
> `eslint.config.mjs`. It is workspace source under `packages/`, not an npm dependency; edit the
> shared rules in [`index.js`](./index.js).

ESLint flat config for Nuxt and TypeScript projects.

## Usage

```js
// apps/<name>/eslint.config.mjs
import config from '@ezhana/eslint-config-nuxt'

export default config
```

## Include

- `@ezhana/eslint-config-vue` (base, TypeScript and Vue rules)
- `no-undef` disabled for `.vue` files, because Nuxt auto-imports are not declared
