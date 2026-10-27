# packages/

This directory is **optional**. It is a placeholder for shared packages that you develop inside
this monorepo. Delete it (and the `build:packages` script in the root `package.json`) if you do not
need any shared packages.

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

The root `pnpm build` script builds packages before the apps. Packages are private by default; add
your own release/versioning workflow (for example Changesets) if you want to publish them.

## Conventions

- Keep `type: "module"` and explicit `exports` with `types` and `default` entries.
- Build TypeScript packages to `dist/` and keep `dist/` out of git (already ignored).
- Prefer `workspace:*` for internal dependencies inside this monorepo.
- Do not commit `node_modules/` or build output.
