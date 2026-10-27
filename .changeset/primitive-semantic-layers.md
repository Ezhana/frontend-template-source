---
'@ezhana/design-tokens': minor
---

Refactor the token package to the standard primitive / semantic / (optional) component model.

- Rename the primitive layer namespace from `global.*` / `--global-*` to `primitive.*` / `--primitive-*`.
- Remove the `brand.*` token layer: themes are now overrides of **semantic** tokens
  (`tokens/themes/<theme>.json`), so themes add no new token names and the public semantic contract
  stays stable across themes.
- Keep the optional component layer out of this package; document it as a separate package built
  exclusively on semantic tokens, suitable for headless components + styles.
- Update contract validation, generated metadata/types (no `BrandTokenName`), tests, docs and both
  template apps to the new layer names.
