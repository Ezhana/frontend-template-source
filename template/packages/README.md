# packages/

Workspace packages you own. The template intentionally ships no packages here; add shared code as
your monorepo grows.

The ESLint/Prettier rules are **not** in this directory. They live in the published npm packages:

```text
@ezhana/eslint-config-base
@ezhana/eslint-config-typescript
@ezhana/eslint-config-react
@ezhana/eslint-config-vue
@ezhana/eslint-config-astro
@ezhana/eslint-config-next
@ezhana/eslint-config-nuxt
@ezhana/eslint-config-svelte
@ezhana/prettier-config
```

The root `eslint.config.mjs` / `prettier.config.mjs` compose the base and Prettier packages, and
apps created with `pnpm create:app ... --eslint --prettier` add the framework-mapped package as a
normal devDependency. Update those npm dependencies to pick up rule changes; do not copy the
packages into this directory.

## Changing rules

- Put workspace-wide overrides in the root `eslint.config.mjs` / `prettier.config.mjs`.
- Put app-specific overrides in that app's config file.
- The shared `@ezhana/*` config packages are read-only npm dependencies. To change rules for every
  consumer, update the package in the source repository and release a new version.

## Adding a package

1. Create `packages/<your-package>` with:

   ```
   packages/<your-package>/
   ├── package.json
   ├── src/index.ts
   └── tsconfig.json
   ```

   A minimal `package.json`:

   ```json
   {
     "name": "@your-scope/utils",
     "version": "0.1.0",
     "private": true,
     "type": "module",
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "default": "./dist/index.js"
       }
     },
     "files": ["dist"],
     "scripts": {
       "build": "tsc -p tsconfig.json"
     },
     "devDependencies": {
       "typescript": "catalog:"
     }
   }
   ```

2. Add it to an app as a workspace dependency:

   ```json
   {
     "dependencies": {
       "@your-scope/utils": "workspace:*"
     }
   }
   ```

3. Build it before building an app that imports its compiled output:

   ```bash
   pnpm --filter @your-scope/utils build
   # or build all packages:
   pnpm build:packages
   ```

The root `pnpm build` script builds packages before the apps. Your packages are private by default;
add your own release/versioning workflow (for example Changesets) if you want to publish them.

## Conventions

- Keep `type: "module"` and explicit `exports` with `types` and `default` entries.
- Build TypeScript packages to `dist/` and keep `dist/` out of git (already ignored).
- Prefer `workspace:*` for internal dependencies inside this monorepo.
- Do not commit `node_modules/` or build output.
