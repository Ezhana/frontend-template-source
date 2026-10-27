# @ezhana/eslint-config-react

## 0.1.1

### Patch Changes

- 4ec5ac5: Declare the ESLint config packages' runtime dependencies correctly.

  - `@ezhana/eslint-config-vue` imported `eslint-plugin-vue`, `vue-eslint-parser`,
    `typescript-eslint`, `@ezhana/eslint-config-base` and `@ezhana/eslint-config-typescript` from
    `devDependencies`, so published consumers did not install them. Move them to `dependencies`.
  - `@ezhana/eslint-config-react` imports `prettierConfig` from `@ezhana/eslint-config-base`; declare
    that package directly instead of relying on a transitive dependency.

  This was caught by building the generated template against the published packages.
