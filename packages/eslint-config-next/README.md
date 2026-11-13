# @ezhana/eslint-config-next

> **Shared workspace package.** Apps configured with `--eslint` import it from their thin
> `eslint.config.mjs`. It is workspace source under `packages/`, not an npm dependency; edit the
> shared rules in [`index.js`](./index.js).

ESLint flat config for Next.js and TypeScript projects.

## Usage

```js
// apps/<name>/eslint.config.mjs
import config from '@ezhana/eslint-config-next'

export default config
```

## Include

- `@ezhana/eslint-config-react` (base, TypeScript, React and React Hooks rules)
- `@next/eslint-plugin-next` core-web-vitals rules
- Prettier compatibility
