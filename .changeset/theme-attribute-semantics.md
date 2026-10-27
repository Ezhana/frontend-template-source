---
'@ezhana/design-tokens': minor
'@ezhana/theme': minor
---

Switch the theming runtime to `data-theme` + optional `data-color-mode`.

- `data-theme` now names the **theme identity** (`default`, `cerulean`, `ocean`) and is always
  present; the old `data-brand` attribute and the `brand.*` naming are gone. Generated metadata is
  renamed to `themes` / `themeLabels` / `defaultTheme`, with a `Theme` union type.
- `data-color-mode` is the **optional** color-mode attribute (`light` / `dark`). It is only written
  for explicit mode preferences; in `system` mode the runtime removes it and the token stylesheet
  follows `prefers-color-scheme`, including `color-scheme: light dark` for native UI.
- The generated CSS now emits system-dark media-query variants for the semantic layer and for each
  theme's mode-specific overrides, so the default is "follow the OS" with no JavaScript needed.
- `@ezhana/theme` API: `themes` / `defaultTheme` options and `setTheme`; storage payload is
  `{ theme, mode }`; the root element must implement `removeAttribute`.
- Both template apps, tests, usage docs and the Cerulean design narrative are updated.
