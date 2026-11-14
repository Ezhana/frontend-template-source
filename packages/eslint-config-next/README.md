# @ezhana/eslint-config-next

> **Published npm package.** `create-ezhana-app --eslint` adds it as a devDependency and the
> generated app imports it from a thin `eslint.config.mjs`. Edit the shared rules in
> [`index.js`](./index.js) and release with Changesets.

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
