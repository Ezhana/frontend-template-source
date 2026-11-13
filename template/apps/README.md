# apps/

Applications generated with `pnpm create:app` live here.

This directory is intentionally empty in the template. After cloning, run:

```bash
pnpm create:app
```

and choose Next.js, Vue, Astro, Nuxt or SvelteKit. The generated app is placed in `apps/<name>` and
becomes part of the pnpm workspace automatically.

## Themes

`create:app --theme <name>` injects a theme package's `style.css` into the app's global CSS and adds
the package. There is no theme overlay or switcher in the generated app.

If the app has no global CSS file, the generator warns and skips the theme. Add a global stylesheet
at `src/styles/global.css` (or another conventional path) and rerun the theme step manually if you
want to use a theme later.
