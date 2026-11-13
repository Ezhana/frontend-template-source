---
'create-ezhana-app': major
---

Replace the themed React/Vue/Astro generator with a registry-driven official-scaffolder dispatcher.

- Frameworks: Next.js, Vue, Astro, Nuxt and SvelteKit. The mapping from framework to CLI, interactive
  flags, default flags, ESLint config package and Prettier plugins lives in `lib/registry.mjs`.
- Interactive by default; `--defaults` runs the official CLI with the registry defaults. Non-TTY
  environments without `--defaults` fail with a clear error.
- The `react` template, theme overlays, switchers, theme runtime dependencies and anti-flash scripts
  are removed.
- `--theme <name>` is now a minimal CSS-only integration: it injects a theme package's `style.css`
  into a conventional global CSS file and skips with a warning when none is found.
- `--eslint` / `--prettier` still write root config files, selected by the framework registry. Nuxt
  and SvelteKit config packages are added; Next.js composes the shared React config with
  `@next/eslint-plugin-next`.
