# Design System Narrative — Obsidian Theme

> **Status:** implemented as the standalone package `@ezhana/design-theme-obsidian` and built with
> `@ezhana/theme-builder` against the `@ezhana/design-tokens` contract. Obsidian is the template's
> **Obsidian & Gold (黑金商务设计系统) business identity**: 24K gold on warm near-black obsidian,
> Inter body copy with Playfair Display headings, hairline-led hierarchy and crisp geometry. It is a
> **dark-only** identity — the source system defines one dark palette and reserves future light
> identities (for example `ivory`) for separate themes — so the package declares the single color
> mode it supports instead of inventing a second palette.
>
> The source is a Chinese design-system document ("黑金商务设计系统 / Obsidian & Gold", written for
> the Cstarera compute console) supplied by the product owner. This document is **not a copy** of
> that spec: the spec describes a Tailwind + Vue application, while this repository ships token and
> theme packages. The narrative below records how the source design was **translated into the core
> semantic contract**, which source roles are tokenized, which stay component- or application-level,
> and where the translation intentionally deviates. Source section references (§) point at the
> original document. The palette and overrides live in this package; the core package only provides
> the shared semantic contract and layout scales (see
> [ADR 0003](../../../docs/adr/0003-themes-as-packages.md)).

## Visual Identity

Obsidian is the template's **boardroom identity**. It is built for enterprise brand sites, private
banking and wealth-management landing pages, high-end consulting and legal services, B2B SaaS brand
sites, investor-relations pages — and, in its console form, for the teams that buy and operate
compute. The keywords are **authority, restraint, precision, permanence** (权威、克制、精准、恒久).
The interface should read like a document on a private banker's desk: black lacquer, warm ivory text,
a single metal used sparingly, and hairlines instead of decoration.

It is not a consumer identity. It is deliberately unsuited to playful, high-saturation or
toy-like products, and it should never be used to ask for attention.

The identity is carried by three materials:

- **Obsidian** — a warm near-black, not a neutral or blue black. The page canvas is `#070606`; the
  warm red-yellow bias makes gold sit correctly and keeps ivory from looking grey. No pure
  `#000000` or `#FFFFFF` is used as a surface or text colour (the only pure black is the alpha
  channel of the source shadow spec, where it is invisible as a colour).
- **Gold** — 24K gold `#D4AF37`, a metal, never a saturated yellow. It marks brand, key figures, the
  primary action, links, selection and focus. It is a scarce signal, not a background.
- **Humanist serif × modern sans** — Playfair Display for Latin display headings and key figures,
  Inter for body copy and UI, with the Chinese system faces paired behind each. The result is the
  source's tension of "classical authority × modern rationality" (古典权威 × 现代理性).

### The three hard rules

The source document defines three rules that override any local aesthetic preference. They are
reproduced here because every component recipe later in this document depends on them.

1. **Gold is scarce.** Solid gold may cover **no more than 8% of a viewport**, and a screen carries
   **at most one gold primary button**. The only exception is the CTA gold-panel recipe (source
   §10.8): it appears at most once per page, is the page's single gold focal point, its text is
   obsidian ink, and that text must still meet WCAG AA. A second gold button on the same screen —
   including inside a modal over a page that already has one — is a defect. Gold outlines, icons,
   links and figures draw from the same budget; the budget is about area and focal points, not only
   about buttons.
2. **Hierarchy comes from luminance and hairlines, not from heavy shadows.** Build depth with the
   four warm-black surfaces (`--color-bg`, `--color-bg-subtle`, `--color-surface`,
   `--color-surface-elevated`) plus 1px borders. Shadows are reserved for layers that genuinely
   float (menus, tooltips, dialogs, the one glowing gold focal point). A card does not need a 32px
   shadow to be a card.
3. **No raw values in component code.** A component does not contain `#hex`, `rgb()`/`rgba()`, or
   magic `px` values; every value comes from a design token or a token-mapped utility. The recipes in
   this document are tokenized for that reason. A small, explicitly documented component-token layer
   is still required for the material the core contract cannot express — gradients, glass, the
   `border-strong` hairline, `accent-active`, the tertiary text step, the inset top highlight and the
   layout/z-index tokens — and those values are listed in
   [Tokens the core contract cannot represent](#tokens-the-core-contract-cannot-represent). They are
   component-layer tokens, not raw values sprinkled into components.

**Fixed to dark mode.** The obsidian palette is the identity, not a preference. A light "Obsidian"
would be a different design system. `@ezhana/theme-builder` emits a fixed-mode stylesheet, and
`@ezhana/theme` resolves any light preference on an Obsidian app to its one supported mode (`dark`).

## Color Palette

The palette is anchored on **24K gold `#D4AF37`**, **warm ivory `#F3EFE6`** and the four warm
near-black surfaces. Every inherited core colour is overridden: the core neutral greys are cool and
the core accent is violet, both of which would break the obsidian-and-gold palette.

| Role                     | Token (semantic)           | Value             |
| ------------------------ | -------------------------- | ----------------- |
| Page canvas              | `--color-bg`               | `#070606`         |
| Interactive / inset fill | `--color-bg-subtle`        | `#191715`         |
| Card / section surface   | `--color-surface`          | `#0B0A09`         |
| Overlay / input surface  | `--color-surface-elevated` | `#111010`         |
| Primary text             | `--color-fg`               | `#F3EFE6` (ivory) |
| Supporting text          | `--color-fg-muted`         | `#C9C1B5`         |
| Strong / heading text    | `--color-fg-strong`        | `#FAF7F0`         |
| Default hairline         | `--color-border`           | `#F3EFE61A` (10%) |
| Divider hairline         | `--color-border-subtle`    | `#F3EFE60F` (6%)  |
| Primary / interactive    | `--color-accent`           | `#D4AF37`         |
| Primary hover            | `--color-accent-hover`     | `#DFC06A`         |
| On primary               | `--color-on-accent`        | `#070606`         |
| Gold tint / selection    | `--color-accent-subtle`    | `#D4AF371A` (10%) |
| Gold border at 35%       | `--color-accent-border`    | `#D4AF3759` (35%) |
| Focus ring               | `--color-focus-ring`       | `#E8D189`         |
| Danger text / icon       | `--color-danger`           | `#E4695F`         |
| Destructive button fill  | `--color-danger-solid`     | `#8F2F2A`         |
| On destructive           | `--color-on-danger`        | `#F3EFE6`         |
| Danger tint              | `--color-danger-subtle`    | `#E4695F1A`       |
| Success / positive       | `--color-success`          | `#54C795`         |
| Success tint             | `--color-success-subtle`   | `#54C7951A`       |
| Warning / pending        | `--color-warning`          | `#E3A94F`         |
| Warning tint             | `--color-warning-subtle`   | `#E3A94F1A`       |
| Info / neutral notice    | `--color-info`             | `#6EA8E0`         |
| Informational solid fill | `--color-info-solid`       | `#2F4A61`         |
| On info                  | `--color-on-info`          | `#F3EFE6`         |
| Info tint                | `--color-info-subtle`      | `#6EA8E01A`       |

### The ink ramp

The warm near-black ramp is the source Ink scale, unchanged. `950` is the page canvas; `900`, `800`
and `700` are the raised, elevated and interactive surfaces; `600`–`100` are borders and
de-emphasized text steps. The ramp never reaches pure black.

| Step  | Value     | Source role                                        |
| ----- | --------- | -------------------------------------------------- |
| `950` | `#070606` | Page canvas                                        |
| `900` | `#0B0A09` | Raised surface (cards, sections)                   |
| `800` | `#111010` | Elevated surface (overlays, inputs)                |
| `700` | `#191715` | Interactive surface (hover / selection)            |
| `600` | `#23201D` | Strong border / partition                          |
| `500` | `#35312C` | Decorative outline                                 |
| `400` | `#514B43` | Disabled text                                      |
| `300` | `#736C62` | De-emphasized text (large text or decoration only) |
| `200` | `#9C9489` | Tertiary text step                                 |
| `100` | `#C9C1B5` | Secondary text                                     |
| `50`  | `#E9E4DA` | Light text / inverse background                    |

### The gold ramp

The 24K gold ramp keeps all ten source steps. `500` is the solid brand fill and the primary action;
`400` is emphasis text and hover; `300` is the focus ring and the gold text step on tinted surfaces;
`600` is the pressed state and gradient shadow; `50`–`200` are gradient highlights; `700`–`900` are
deep gold used in small decorative areas and the gradient tail.

| Step  | Value     | Source role                             |
| ----- | --------- | --------------------------------------- |
| `50`  | `#FBF7EA` | Extremely light highlight               |
| `100` | `#F7EFD4` | Gradient highlight                      |
| `200` | `#F0E1AC` | Gradient secondary highlight            |
| `300` | `#E8D189` | Gold text on dark surfaces, focus ring  |
| `400` | `#DFC06A` | Emphasis text, hover                    |
| `500` | `#D4AF37` | Brand gold, primary button, key figures |
| `600` | `#B8952B` | Pressed state, gradient shadow          |
| `700` | `#96771F` | Deep gold, decoration                   |
| `800` | `#6E5717` | Extremely deep gold, gradient tail      |
| `900` | `#4A3B0F` | Tiny decorative accents                 |

Status pigments are the source status colours: success `#54C795`, warning `#E3A94F`, danger
`#E4695F` and info `#6EA8E0`. The theme adds two derived solid fills — claret `#8F2F2A` for
destructive buttons and steel `#2F4A61` for informational solid fills — because the core contract
requires `danger-solid` / `info-solid` surfaces and the source defines its status roles as text only.
Both derived fills are paired with warm ivory text and measured below.

### The four-surface mapping

The source design system names four surfaces — `canvas`, `raised`, `elevated` and `interactive` — and
one glass surface. The core contract has four surface roles (`bg`, `bg-subtle`, `surface`,
`surface-elevated`) and no glass role. The mapping follows the **role** each surface plays, not its
position in a luminance order:

| Source role | Source token / value                        | Core token                 | Why this role                                               |
| ----------- | ------------------------------------------- | -------------------------- | ----------------------------------------------------------- |
| Canvas      | `--ds-surface-canvas` `#070606`             | `--color-bg`               | The page itself; everything else sits on it.                |
| Raised      | `--ds-surface-raised` `#0B0A09`             | `--color-surface`          | Cards and sections: the default "paper" layer.              |
| Elevated    | `--ds-surface-elevated` `#111010`           | `--color-surface-elevated` | Overlays, popovers and inputs that float above cards.       |
| Interactive | `--ds-surface-interactive` `#191715`        | `--color-bg-subtle`        | Hover/selected fills and wells: an inset fill, not a layer. |
| Glass       | `--ds-surface-glass` `rgba(243,239,230,4%)` | _(none — recipe)_          | The contract has no translucent surface token; see Glass.   |

The mapping is deliberately **not** monotonic by luminance: `interactive` (`#191715`) is lighter
than `elevated` (`#111010`). That is the source design, and it is correct for its roles. A hover or
selected fill is a **state of the current layer**, so `--color-bg-subtle` is consumed as an inset
wash; it never pretends to be a fifth elevation. An overlay or input is a **separate, floating
layer** that must read as deep obsidian even above a card, so it uses `--color-surface-elevated` —
the near-black step — and depth is carried by the shadow and the hairline, not by making the overlay
brighter. Mapping by elevation order would have put interactive above elevated and turned every
selected row into a fake modal. Mapping by role keeps the two axes separate: luminance says "how deep
is the material", role says "is this a layer or a state".

The glass surface and the four gradients are component recipes because the contract has no gradient
or glass token (see [Gradients, Glass and Texture](#gradients-glass-and-texture)).

### Three palette rules

1. **Gold has three jobs and one budget.** `#D4AF37` is the solid interactive fill and the brand
   accent; `#DFC06A` is the hover step and the on-page emphasis text (`--ds-content-accent` in the
   source); `#E8D189` is the focus ring and the gold text step on tinted gold. All three are the
   same metal, never a second accent. The area rule from the hard rules still applies: solid gold
   fills stay at or below 8% of the viewport, and there is at most one gold primary action per
   screen.
2. **Status roles split into text and solid fill.** The source names a text colour per status role.
   The theme keeps those as `--color-success` / `--color-warning` / `--color-danger` / `--color-info`
   (all AA on every surface) and adds exactly two solid fills — claret `--color-danger-solid` and
   steel `--color-info-solid` — for filled destructive and informational buttons and banners, always
   paired with `--color-on-danger` / `--color-on-info` ivory text. Success and warning need no solid
   role in this identity.
3. **Tints are alpha.** The eight-digit values are `10%` transparencies (the gold border is `35%`),
   composited over whatever surface is underneath. They are measured composited, not assumed.

### Theme-private palette

The source's raw colours live under `theme.color.obsidian.*` in
[`tokens/palette.json`](../tokens/palette.json): the `ink` and `gold` ramps, the two ivory text
steps, the derived `claret` and `steel` fills and the four `status` colours. They are resolved into
the override values at build time and are **never emitted as CSS custom properties**: product code
cannot consume them and they do not appear in the core `primitive.*` scale or in
`PrimitiveTokenName`. The palette is build-time material, exactly as ADR 0003 requires.

### Contrast (measured, not estimated)

Every pair is asserted by this package's test suite
(`pnpm --filter @ezhana/design-theme-obsidian test`) and by the theme builder's WCAG check. The pairs
come from the `@ezhana/design-tokens` contract plus the theme's own split status roles and its
gold-on-page pairs.

| Pair (foreground / background)                      | Ratio   |
| --------------------------------------------------- | ------- |
| `--color-fg` / `--color-bg`                         | 17.64:1 |
| `--color-fg-muted` / `--color-bg`                   | 11.35:1 |
| `--color-fg-strong` / `--color-bg`                  | 18.91:1 |
| `--color-fg-strong` / `--color-bg-subtle`           | 16.71:1 |
| `--color-fg` / `--color-surface`                    | 17.24:1 |
| `--color-fg-muted` / `--color-surface`              | 11.10:1 |
| `--color-fg-strong` / `--color-surface-elevated`    | 17.76:1 |
| `--color-accent` / `--color-bg`                     | 9.62:1  |
| `--color-on-accent` / `--color-accent`              | 9.62:1  |
| `--color-accent-hover` / `--color-bg`               | 11.45:1 |
| `--color-accent-hover` / `--color-surface`          | 11.20:1 |
| `--color-accent-hover` / `--color-surface-elevated` | 10.75:1 |
| `--color-danger` / `--color-bg`                     | 6.25:1  |
| `--color-danger` / `--color-surface`                | 6.11:1  |
| `--color-success` / `--color-bg`                    | 9.62:1  |
| `--color-warning` / `--color-bg`                    | 9.69:1  |
| `--color-info` / `--color-bg`                       | 8.04:1  |
| `--color-on-danger` / `--color-danger-solid`        | 7.02:1  |
| `--color-on-info` / `--color-info-solid`            | 8.05:1  |

All pairs meet **WCAG 2.2 AA (≥ 4.5:1)**, and the measured ratios match the source requirement that
the gold primary button's ink text clears 8:1 (`9.62:1` on the solid gold fill). Gold `#D4AF37` is
usable both as text on the page and as a solid button surface with `#070606` ink; the primary button
is safe on every surface because the ink-on-gold pair is surface-independent.

The table above covers opaque semantic-token pairs. Component recipes that place text on a
translucent tint are measured against the **composited** background on each surface; see
[Component contrast (composited)](#component-contrast-composited). Those pairs are asserted by this
package's test suite too, so a palette change cannot silently break a recipe.

### Component contrast (composited)

Tinted fills are translucent, so their text contrast depends on the surface underneath. The recipes
in this document are measured on every Obsidian surface — `--color-bg` (`#070606`),
`--color-surface` (`#0B0A09`) and `--color-surface-elevated` (`#111010`) — with the tint composited
onto the surface, and the test suite asserts these ratios as well.

| Recipe       | Text (literal)            | Over `--color-bg` | Over `--color-surface` | Over `--color-surface-elevated` |
| ------------ | ------------------------- | ----------------- | ---------------------- | ------------------------------- |
| Gold chip    | `#E8D189` on accent tint  | 11.82:1           | 11.39:1                | 10.74:1                         |
| Success chip | `#54C795` on success tint | 8.47:1            | 8.22:1                 | 7.69:1                          |
| Warning chip | `#E3A94F` on warning tint | 8.52:1            | 8.24:1                 | 7.73:1                          |
| Error chip   | `#E4695F` on danger tint  | 5.71:1            | 5.53:1                 | 5.24:1                          |
| Info chip    | `#6EA8E0` on info tint    | 7.16:1            | 6.95:1                 | 6.58:1                          |

All values are ≥ 4.5:1. These literals are the **text-on-tint** steps of the theme-private palette.
The status texts are the semantic 500 steps (`--color-success`, `--color-warning`, `--color-danger`,
`--color-info`); the gold chip uses gold-300 `#E8D189` — the source's "gold text on dark surfaces"
step — because a tinted gold chip wants more headroom than gold-500, not because gold-500 fails
(`--color-accent` on its own tint is still 7.71:1 over the elevated surface). Unlike the Onyx theme,
no status role needs a lighter text-on-tint literal: the obsidian surfaces are dark enough that the
semantic 500 steps clear AA on their own 10% tints on every surface. The gold-300 literal is a
documented component-layer value, listed in
[Tokens the core contract cannot represent](#tokens-the-core-contract-cannot-represent).

### Accessibility notes (intentional)

**Text-on-tint literals versus semantic roles.** Every semantic status role clears AA as text on the
page and on every surface (see the measured table). The composited chip table exists because the chip
recipes place the text on a translucent fill; the semantic steps still pass, so only the gold chip
uses a documented literal (`#E8D189`, gold-300) to keep the gold-on-gold recipe comfortably above
AA and visually distinct from the solid gold button.

**Non-text contrast is documented as decorative.** The hairlines are part of the obsidian-and-gold
material, but they are below WCAG 1.4.11's 3:1 for a control boundary that is the only visual
indicator. Measured composited: `--color-border` is 1.22:1 on the page, 1.23:1 on `--color-surface`
and 1.27:1 on `--color-surface-elevated`; `--color-border-subtle` is 1.10:1, 1.11:1 and 1.13:1;
`--color-accent-border` (35% gold) composites to 2.02:1, 2.06:1 and 2.09:1. The source's
`--ds-border-strong` (`rgba(243,239,230,0.18)`) composites to about 1.54–1.63:1 and has no semantic
slot. Obsidian therefore treats hairlines as decorative: controls always carry a visible label,
checked/selected state is conveyed by the gold fill, check glyph or dot, and focus is always visible
through the gold focus ring (13.41:1 on the page, 13.11:1 on `--color-surface`, 12.59:1 on
`--color-surface-elevated`). This is a documented limitation of the hairline palette, not a contrast
regression in the theme.

**Tertiary text is a contract gap.** `--ds-content-tertiary` `#8F867A` (5.65:1 on the page, 5.52:1 on
`--color-surface`, 5.30:1 on `--color-surface-elevated`) would pass AA, but the core contract has only
`fg`, `fg-muted` and `fg-strong`. The theme maps secondary content to `--color-fg-muted`
(`#C9C1B5`) and documents tertiary captions as a component-layer literal; see
[Tokens the core contract cannot represent](#tokens-the-core-contract-cannot-represent).

**Never pure white, never pure black.** `--color-fg-strong` is `#FAF7F0` (18.91:1 on the page), and
the page is `#070606`. The only pure black in the system is the alpha of the source shadow spec
(`rgba(0,0,0,.5)`), which is a shadow colour, not a surface or text colour.

### Core tokens this theme uses (not a patch)

Obsidian needed **no new token names**. It consumes roles that were already added to
`@ezhana/design-tokens` for the template's fixed-mode themes: layered surfaces, status tints,
`info` / solid-danger / solid-info roles, the complete type scale with label tracking,
`radius.modal` / `radius.panel`, and `shadow.lg` / `shadow.xl` / `shadow.glow`. Those are
general-purpose semantic roles (any theme may use them), not Obsidian-private names; the palette
stays private to this package. The fixed-mode support in `@ezhana/theme-builder` and `@ezhana/theme`
predates Obsidian, so this package is a pure theme package: palette, overrides, metadata, docs and
tests. That is the validation that the model in
[ADR 0003](../../../docs/adr/0003-themes-as-packages.md) works.

## Source `--ds-*` Token Mapping

This section is the complete record of the translation: every source token, its value, the core
semantic token (or recipe) that carries it, and the role it serves. Source tokens are written as they
appear in the source document; core tokens are the CSS custom properties emitted by
`@ezhana/design-tokens` plus this theme's overrides.

### Colour roles

| Source token               | Value                    | Core token                 | Role / note                                                        |
| -------------------------- | ------------------------ | -------------------------- | ------------------------------------------------------------------ |
| `--ds-surface-canvas`      | `#070606`                | `--color-bg`               | Page background.                                                   |
| `--ds-surface-raised`      | `#0B0A09`                | `--color-surface`          | Cards and sections.                                                |
| `--ds-surface-elevated`    | `#111010`                | `--color-surface-elevated` | Overlays, popovers, inputs.                                        |
| `--ds-surface-interactive` | `#191715`                | `--color-bg-subtle`        | Hover / selected fills and wells (an inset state, not a layer).    |
| `--ds-surface-glass`       | `rgba(243,239,230,0.04)` | _(no slot)_                | Glass/surface recipe; see [Glass](#gradients-glass-and-texture).   |
| `--ds-content-primary`     | `#F3EFE6`                | `--color-fg`               | Body copy.                                                         |
| `--ds-content-secondary`   | `#C9C1B5`                | `--color-fg-muted`         | Secondary copy.                                                    |
| `--ds-content-tertiary`    | `#8F867A`                | _(no slot)_                | Tertiary captions; component-layer literal (see gaps).             |
| `--ds-content-inverse`     | `#070606`                | `--color-on-accent`        | Text on a solid gold surface.                                      |
| `--ds-content-accent`      | `#DFC06A`                | `--color-accent-hover`     | Gold emphasis text and links.                                      |
| `--ds-border-subtle`       | `rgba(243,239,230,0.06)` | `--color-border-subtle`    | Hairline dividers.                                                 |
| `--ds-border-default`      | `rgba(243,239,230,0.10)` | `--color-border`           | Default border.                                                    |
| `--ds-border-strong`       | `rgba(243,239,230,0.18)` | _(no slot)_                | Button/input borders; component recipe via `color-mix` (see gaps). |
| `--ds-border-accent`       | `rgba(212,175,55,0.35)`  | `--color-accent-border`    | Gold hairline, hover highlight.                                    |
| `--ds-accent-solid`        | `#D4AF37`                | `--color-accent`           | Primary action fill, brand gold.                                   |
| `--ds-accent-hover`        | `#DFC06A`                | `--color-accent-hover`     | Primary action hover.                                              |
| `--ds-accent-active`       | `#B8952B`                | _(no slot)_                | Pressed state; component recipe (see gaps).                        |
| `--ds-accent-contrast`     | `#070606`                | `--color-on-accent`        | Text/icon on solid gold.                                           |
| `--ds-accent-soft`         | `rgba(212,175,55,0.10)`  | `--color-accent-subtle`    | Gold chips, selected backgrounds.                                  |
| `--ds-accent-soft-hover`   | `rgba(212,175,55,0.16)`  | _(no slot)_                | Gold-soft hover; component recipe (see gaps).                      |
| `--ds-focus-ring`          | `rgba(232,209,137,0.75)` | `--color-focus-ring`       | Focus ring; emitted opaque as `#E8D189` (intentional deviation).   |
| `--ds-status-success`      | `#54C795`                | `--color-success`          | Success text and icons.                                            |
| `--ds-status-warning`      | `#E3A94F`                | `--color-warning`          | Warning text and icons.                                            |
| `--ds-status-danger`       | `#E4695F`                | `--color-danger`           | Error / risk text and icons.                                       |
| `--ds-status-info`         | `#6EA8E0`                | `--color-info`             | Informational text and links.                                      |

The source defines status colours as text only. The core contract also needs tinted status surfaces
and, for destructive/informational actions, solid fills, so the theme derives:

| Derived role        | Value                        | Core token               | Why it exists                                           |
| ------------------- | ---------------------------- | ------------------------ | ------------------------------------------------------- |
| Success tint        | `--ds-status-success` at 10% | `--color-success-subtle` | Filled success chips/banners; source has no tint token. |
| Warning tint        | `--ds-status-warning` at 10% | `--color-warning-subtle` | Filled warning chips/banners.                           |
| Danger tint         | `--ds-status-danger` at 10%  | `--color-danger-subtle`  | Filled error chips/banners.                             |
| Info tint           | `--ds-status-info` at 10%    | `--color-info-subtle`    | Filled info chips/banners.                              |
| Destructive solid   | derived claret `#8F2F2A`     | `--color-danger-solid`   | Destructive button fill with ivory text (`7.02:1`).     |
| Informational solid | derived steel `#2F4A61`      | `--color-info-solid`     | Informational solid fill with ivory text (`8.05:1`).    |

### Colour primitives

The source's primitive ramps are the theme's private palette. The values match the source exactly;
only the namespace differs (`theme.color.obsidian.*` instead of `--ds-color-*`, and never emitted as
CSS variables).

| Source ramp token     | Value     | Theme-private token             |
| --------------------- | --------- | ------------------------------- |
| `--ds-color-ink-950`  | `#070606` | `theme.color.obsidian.ink.950`  |
| `--ds-color-ink-900`  | `#0B0A09` | `theme.color.obsidian.ink.900`  |
| `--ds-color-ink-800`  | `#111010` | `theme.color.obsidian.ink.800`  |
| `--ds-color-ink-700`  | `#191715` | `theme.color.obsidian.ink.700`  |
| `--ds-color-ink-600`  | `#23201D` | `theme.color.obsidian.ink.600`  |
| `--ds-color-ink-500`  | `#35312C` | `theme.color.obsidian.ink.500`  |
| `--ds-color-ink-400`  | `#514B43` | `theme.color.obsidian.ink.400`  |
| `--ds-color-ink-300`  | `#736C62` | `theme.color.obsidian.ink.300`  |
| `--ds-color-ink-200`  | `#9C9489` | `theme.color.obsidian.ink.200`  |
| `--ds-color-ink-100`  | `#C9C1B5` | `theme.color.obsidian.ink.100`  |
| `--ds-color-ink-50`   | `#E9E4DA` | `theme.color.obsidian.ink.50`   |
| `--ds-color-gold-50`  | `#FBF7EA` | `theme.color.obsidian.gold.50`  |
| `--ds-color-gold-100` | `#F7EFD4` | `theme.color.obsidian.gold.100` |
| `--ds-color-gold-200` | `#F0E1AC` | `theme.color.obsidian.gold.200` |
| `--ds-color-gold-300` | `#E8D189` | `theme.color.obsidian.gold.300` |
| `--ds-color-gold-400` | `#DFC06A` | `theme.color.obsidian.gold.400` |
| `--ds-color-gold-500` | `#D4AF37` | `theme.color.obsidian.gold.500` |
| `--ds-color-gold-600` | `#B8952B` | `theme.color.obsidian.gold.600` |
| `--ds-color-gold-700` | `#96771F` | `theme.color.obsidian.gold.700` |
| `--ds-color-gold-800` | `#6E5717` | `theme.color.obsidian.gold.800` |
| `--ds-color-gold-900` | `#4A3B0F` | `theme.color.obsidian.gold.900` |

The theme also adds two ivory text steps — `theme.color.obsidian.ivory.100` `#F3EFE6` (primary) and
`ivory.50` `#FAF7F0` (a warm step above primary so `--color-fg-strong` is visibly stronger than body
copy) — plus the derived `claret` and `steel` solids and the four `status` colours. These are
theme-private material; only the semantic values reach CSS.

### Type scale mapping

| Source token         | Source value                             | Source weight / line-height / tracking | Core token                                       |
| -------------------- | ---------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| `--text-display-2xl` | `clamp(3rem, 2.1rem + 3.8vw, 5rem)`      | 500 / 1.02 / -0.035em                  | `--font-size-display`                            |
| `--text-display-xl`  | `clamp(2.5rem, 1.9rem + 2.6vw, 3.75rem)` | 500 / 1.06 / -0.03em                   | `--font-size-h1`                                 |
| `--text-display-lg`  | `clamp(2rem, 1.65rem + 1.6vw, 2.75rem)`  | 500 / 1.12 / -0.02em                   | `--font-size-h2`                                 |
| `--text-heading-lg`  | `1.75rem`                                | 500 / 1.25 / -0.015em                  | `--font-size-h3`                                 |
| `--text-heading-md`  | `1.375rem`                               | 500 / 1.35 / -0.01em                   | `--font-size-h4`                                 |
| `--text-heading-sm`  | `1.125rem`                               | 500 / 1.45 / 0                         | `--font-size-body-lg`                            |
| `--text-body-lg`     | `1.125rem`                               | 400 / 1.65 / 0                         | `--font-size-body-lg`                            |
| `--text-body`        | `1rem`                                   | 400 / 1.7 / 0                          | `--font-size-body`                               |
| `--text-body-sm`     | `0.875rem`                               | 400 / 1.6 / 0                          | `--font-size-small`                              |
| `--text-caption`     | `0.75rem`                                | 400 / 1.5 / 0.01em                     | `--font-size-caption`                            |
| `--text-overline`    | `0.6875rem` (11px)                       | 600 / 1.2 / 0.22em                     | _(none; recipe — caption size + label tracking)_ |

The line-height values in the table above are the theme's overrides (`1.02` display, `1.06` h1,
`1.12` h2, `1.25` h3, `1.35` h4, `1.7` body, `1.6` small, `1.5` caption, `1.5` code, `1.2` heading,
`1.02` tight) and match the source exactly. The source's per-step **weights** (500 for display and
headings, 400 for body) and **negative tracking** are component-level recipes; the core contract has
one weight scale (400/500/600/700) and exactly one tracking token, `--font-letter-spacing-label`
(`0.22em`). See [Typography rules](#typography-rules).

### Shape, elevation and motion

| Source token         | Value                                                                    | Core token / recipe                    |
| -------------------- | ------------------------------------------------------------------------ | -------------------------------------- |
| `--ds-radius-xs`     | `2px`                                                                    | _(no slot)_ component recipe           |
| `--ds-radius-sm`     | `4px`                                                                    | `--radius-small`                       |
| `--ds-radius-md`     | `6px`                                                                    | `--radius-control`                     |
| `--ds-radius-lg`     | `10px`                                                                   | _(no slot)_ nearest `--radius-surface` |
| `--ds-radius-xl`     | `14px`                                                                   | `--radius-surface`                     |
| `--ds-radius-2xl`    | `20px`                                                                   | `--radius-modal`                       |
| `--ds-radius-3xl`    | `28px`                                                                   | `--radius-panel`                       |
| `--ds-radius-full`   | `9999px`                                                                 | `--radius-pill`                        |
| `--ds-shadow-xs`     | `0 1px 2px rgba(0,0,0,.5)`                                               | `--shadow-sm`                          |
| `--ds-shadow-sm`     | `0 2px 8px -2px rgba(0,0,0,.55)`                                         | `--shadow-md`                          |
| `--ds-shadow-md`     | `0 12px 32px -16px rgba(0,0,0,.75)`                                      | `--shadow-lg`                          |
| `--ds-shadow-lg`     | `0 32px 80px -32px rgba(0,0,0,.85)`                                      | `--shadow-xl`                          |
| `--ds-shadow-glow`   | `0 0 0 1px rgba(212,175,55,.22), 0 18px 48px -20px rgba(212,175,55,.38)` | `--shadow-glow`                        |
| `--ds-shadow-inset`  | `inset 0 1px 0 rgba(243,239,230,.05)`                                    | _(no slot)_ component recipe           |
| `--ds-duration-fast` | `120ms`                                                                  | `--motion-duration-fast`               |
| `--ds-duration-base` | `200ms`                                                                  | `--motion-duration-normal`             |
| `--ds-ease-standard` | `cubic-bezier(.2,0,0,1)`                                                 | `--motion-easing-standard` (inherited) |

### Layout and layers

The source layout tokens remain **application-level**. The core contract has one content-width token
and no sidebar, topbar, gutter or z-index tokens; a console shell is an application concern, not a
theme concern, so these values are documented here rather than emitted by the theme package.

| Source token                    | Value     | Application-level usage                    |
| ------------------------------- | --------- | ------------------------------------------ |
| `--ds-container-shell`          | `75rem`   | Brand-site main container (`max-w-shell`). |
| `--ds-container-narrow`         | `48rem`   | Quotes, forms (`max-w-narrow`).            |
| `--ds-container-prose`          | `40rem`   | Body line length (`max-w-prose`).          |
| `--ds-gutter`                   | `1.5rem`  | Page gutter (`px-6`).                      |
| `--ds-header-height`            | `4.5rem`  | Brand-site header (72px).                  |
| `--ds-section-space`            | `7rem`    | Brand-site section rhythm.                 |
| `--ds-layout-sidebar`           | `16.5rem` | Console sidebar (264px).                   |
| `--ds-layout-sidebar-collapsed` | `4.75rem` | Collapsed console sidebar (76px).          |
| `--ds-layout-topbar`            | `4.5rem`  | Console topbar (72px).                     |
| `--ds-layout-content-max`       | `90rem`   | Console content max width (1440px).        |
| `--ds-layout-gutter`            | `2rem`    | Console content gutter (32px).             |
| `--ds-z-header`                 | `40`      | Sticky header / console topbar.            |
| `--ds-z-overlay`                | `60`      | Skip link, mobile nav panel.               |
| `--ds-z-modal`                  | `80`      | Dialogs (reserved).                        |
| `--ds-z-toast`                  | `100`     | Global toasts (reserved).                  |

The theme package's own contribution to layout is limited to the inherited `--size-content`
(`70.375rem`) and the border widths; console layout guidance is in
[Applications and Console](#applications-and-console).

### Tokens the core contract cannot represent

The source's material is richer than the core semantic contract. These roles are **not** emitted by
this package; a component library (or an app) owns them as a documented component-token layer. The
values are the source values, kept here so the recipes stay faithful and measurable.

| Source role / token              | Source value                                                                  | Why the core cannot hold it                      | Recipe strategy                                                     |
| -------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| `--ds-surface-glass`             | `rgba(243,239,230,0.04)`                                                      | No translucent surface token.                    | `color-mix(in srgb, var(--color-fg) 4%, transparent)`               |
| `--ds-border-strong`             | `rgba(243,239,230,0.18)`                                                      | Only `border` and `border-subtle` exist.         | `color-mix(in srgb, var(--color-fg) 18%, transparent)`              |
| `--ds-content-tertiary`          | `#8F867A`                                                                     | Only `fg`, `fg-muted`, `fg-strong` exist.        | Component literal `#8F867A`; token-only fallback `--color-fg-muted` |
| `--ds-accent-active`             | `#B8952B`                                                                     | No pressed/active accent role.                   | Component literal or `color-mix` toward the page ink                |
| `--ds-accent-soft-hover`         | `rgba(212,175,55,0.16)`                                                       | No second gold-tint step.                        | `color-mix(in srgb, var(--color-accent) 16%, transparent)`          |
| `--ds-gradient-gold`             | `linear-gradient(135deg, #F7EFD4 0%, #D4AF37 38%, #B8952B 70%, #96771F 100%)` | No gradient token.                               | Literal gradient in the CTA/primary-button recipe                   |
| `--ds-gradient-gold-soft`        | `linear-gradient(135deg, rgba(212,175,55,.18), rgba(212,175,55,.02))`         | No gradient token.                               | Literal gradient in the gold-soft panel recipe                      |
| `--ds-gradient-panel`            | `linear-gradient(160deg, rgba(255,255,255,.05), rgba(255,255,255,0) 60%)`     | No gradient token.                               | Literal gradient in the card top-highlight recipe                   |
| `--ds-gradient-glow`             | `radial-gradient(60% 60% at 50% 0%, rgba(212,175,55,.16), transparent 72%)`   | No gradient token.                               | Literal gradient in the hero-glow recipe                            |
| `--ds-shadow-inset`              | `inset 0 1px 0 rgba(243,239,230,.05)`                                         | No inset elevation slot.                         | Literal inset shadow in card recipes                                |
| `--ds-radius-xs` / `-lg`         | `2px` / `10px`                                                                | Only five named radii; no 2px or 10px slot.      | Nearest token (`--radius-small` / `--radius-surface`)               |
| `--text-overline` size           | `0.6875rem` (11px)                                                            | No 11px size step; caption is 12px.              | `--font-size-caption` + `--font-letter-spacing-label`               |
| Display tracking / weights       | `-0.035em` … `-0.01em`, 500                                                   | One tracking token; weights are 400/500/600/700. | Component recipes using `--font-weight-medium` and letter-spacing   |
| Layout / z-index tokens          | see [Layout and layers](#layout-and-layers)                                   | Core has no layout or stacking tokens.           | Application-level custom properties                                 |
| `--ds-duration-slow`             | `320ms`                                                                       | Core tokenizes fast and normal only.             | App-level duration custom property                                  |
| `--ds-duration-reveal`           | `640ms`                                                                       | Core tokenizes fast and normal only.             | App-level duration custom property                                  |
| `--ds-ease-emphasized` / `-exit` | `cubic-bezier(.16,1,.3,1)` / `cubic-bezier(.4,0,1,1)`                         | Core has only `easing-standard`.                 | App-level easing custom properties                                  |

## Typography

Two families, one job each:

- **Inter** — body copy, UI labels, buttons, table headers, form text and everything in the console.
  Self-hosted as a variable font via `@fontsource-variable/inter`.
- **Playfair Display** — Latin display headings, key figures, pull quotes and the gold gradient
  headline. Self-hosted as a variable font via `@fontsource-variable/playfair-display`. It is a
  display face; it is not used for body copy or UI labels.
- **Core mono stack** — inherited from `@ezhana/design-tokens` (`ui-monospace, 'SF Mono', Menlo,
Consolas, 'Liberation Mono', monospace`) for code, identifiers and tabular annotations.

```css
--font-family-sans:
  'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei',
  sans-serif;
--font-family-heading:
  'Playfair Display Variable', 'Playfair Display', 'Times New Roman', 'Songti SC', Georgia, serif;
--font-family-mono: ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
```

### Latin and CJK mixing

The source's mixing rule is explicit: Chinese uses the system faces; Playfair Display only carries
Latin headings and figures; a Chinese heading must never fall through to a Latin serif and produce
mismatched glyphs.

- **Body and UI (CJK).** `PingFang SC` / `Microsoft YaHei` sit immediately after Inter in the sans
  stack, before any generic fallback. Chinese body copy therefore never falls through to a Latin
  serif, and the Latin and Chinese of a mixed paragraph share the same optical weight.
- **Headings (CJK).** Playfair Display has no CJK coverage, so Chinese headings fall back to
  `Songti SC`, then the system serif (`Georgia` is the last Latin resort, never the first). This is
  the source's intended pairing: Latin display headings in Playfair, Chinese display headings in a
  high-contrast Chinese serif. It is an intentional deviation that the core `font.family.heading`
  token carries a CJK serif at all — a heading stack without one would render Chinese in a Latin
  serif or a UI sans.
- **Figures.** Key figures use `--font-family-heading` with `font-variant-numeric: tabular-nums`, as
  the source requires. In a mixed Chinese/English figure caption, the numerals come from Playfair and
  the surrounding characters from the body stack.
- **No faux faces.** The theme never requests synthetic bold or oblique; Playfair Display and Inter
  are variable fonts with real weights.

The two font packages are listed in `fonts` in [`theme.config.mjs`](../theme.config.mjs), so the
generated `dist/fonts.css` declares the self-hosted `@font-face` rules (inlined by `dist/style.css`) and the font files are copied into `dist/fonts/`.
Because the `@font-face` rules are referenced only by the Obsidian font tokens, a browser downloads
them only when the Obsidian theme is active.

### Type scale

| Role          | Token                 | Size                                           | Weight                       | Line height                         |
| ------------- | --------------------- | ---------------------------------------------- | ---------------------------- | ----------------------------------- |
| Display       | `--font-size-display` | fluid `clamp(3rem, 2.1rem + 3.8vw, 5rem)`      | 500 (`--font-weight-medium`) | 1.02 (`--font-line-height-display`) |
| H1            | `--font-size-h1`      | fluid `clamp(2.5rem, 1.9rem + 2.6vw, 3.75rem)` | 500                          | 1.06 (`--font-line-height-h1`)      |
| H2            | `--font-size-h2`      | fluid `clamp(2rem, 1.65rem + 1.6vw, 2.75rem)`  | 500                          | 1.12 (`--font-line-height-h2`)      |
| H3            | `--font-size-h3`      | `1.75rem` (28px)                               | 500                          | 1.25 (`--font-line-height-h3`)      |
| H4            | `--font-size-h4`      | `1.375rem` (22px)                              | 500                          | 1.35 (`--font-line-height-h4`)      |
| Lead / list   | `--font-size-body-lg` | `1.125rem` (18px)                              | 500 / 400                    | component: 1.45 / 1.65              |
| Body          | `--font-size-body`    | `1rem` (16px)                                  | 400                          | 1.7 (`--font-line-height-body`)     |
| Body SM       | `--font-size-small`   | `0.875rem` (14px)                              | 400                          | 1.6 (`--font-line-height-small`)    |
| Caption       | `--font-size-caption` | `0.75rem` (12px)                               | 400                          | 1.5 (`--font-line-height-caption`)  |
| Code          | `--font-size-code`    | `0.75rem` (12px)                               | 400                          | 1.5 (`--font-line-height-code`)     |
| Control label | `--font-size-control` | `0.875rem` (14px)                              | 500                          | 1.2 (component)                     |

The type scale is fully overridden by this theme, because the source's scale is larger and more
dramatic than the core display scale: the hero reaches `5rem`, headings are tracked negatively, and
body copy is looser (`1.7`). Only the weights are inherited from the core scale; 500 covers both
display and heading roles, and 600 is reserved for the overline and strong labels.

### Typography rules

These rules are component-level recipes, not tokens. The core contract has exactly one tracking
token (`--font-letter-spacing-label`, `0.22em`), so negative display tracking and per-role weights
are applied by the component (or by a future component-token layer) using the type-size and weight
tokens.

| Source step        | Letter spacing | Weight | Where it is applied                                  |
| ------------------ | -------------- | ------ | ---------------------------------------------------- |
| `text-display-2xl` | `-0.035em`     | 500    | Hero title (`--font-size-display`)                   |
| `text-display-xl`  | `-0.03em`      | 500    | Section title (`--font-size-h1`)                     |
| `text-display-lg`  | `-0.02em`      | 500    | Sub-section title (`--font-size-h2`)                 |
| `text-heading-lg`  | `-0.015em`     | 500    | Card-group title (`--font-size-h3`)                  |
| `text-heading-md`  | `-0.01em`      | 500    | Card title (`--font-size-h4`)                        |
| `text-heading-sm`  | `0`            | 500    | List title (`--font-size-body-lg`)                   |
| `text-body-lg`     | `0`            | 400    | Lead paragraph (`--font-size-body-lg`)               |
| `text-body`        | `0`            | 400    | Body copy (`--font-size-body`)                       |
| `text-body-sm`     | `0`            | 400    | Supporting copy, button labels (`--font-size-small`) |
| `text-caption`     | `0.01em`       | 400    | Footnotes, copyright (`--font-size-caption`)         |
| `text-overline`    | `0.22em`       | 600    | Eyebrow (`--font-size-caption` + label tracking)     |

- **Eyebrow.** Uppercase, `--font-weight-strong`, `--font-letter-spacing-label` (`0.22em`), gold
  `--color-accent-hover`; it is preceded by the 24px gold short rule. The tracking token is the only
  tracking the core contract has, and 0.22em is exactly the source overline tracking.
- **Two-line display rule.** A display heading is at most two lines. Only one line per screen — the
  second — may become gold gradient text; see the gradient-text recipe. It is the page's single gold
  emphasis, so it also consumes the gold budget.
- **Measure.** Body copy sits at 45–75 characters; use `max-w-prose` (`40rem`, the source
  `--ds-container-prose`). Lead paragraphs cap at `56ch`.
- **Links.** Gold `--color-accent-hover` with `text-underline-offset: 4px` and an underline on hover
  (and always on focus). Colour alone never distinguishes a link, per source §5.3.
- **Numbers.** Key figures use `--font-family-heading` with `font-variant-numeric: tabular-nums`;
  units use the small gold or muted step. Table and stat numerals always tabular.
- **Line breaks.** `text-wrap: balance` on display headings and `text-wrap: pretty` on body copy is
  allowed (progressive enhancement); it does not affect the tokens.
- **Overline size.** The source overline is 11px (`0.6875rem`); the core contract has no 11px step, so
  the recipe uses `--font-size-caption` (12px) with the 0.22em tracking. This is a documented
  one-pixel deviation, listed in [Intentional deviations](#intentional-deviations).

## Spacing

The source uses a 4px base unit (`--spacing: 0.25rem` in Tailwind) and multiplies it for component
padding. The core 4px primitive scale is used unchanged, so Obsidian lands on the template's familiar
rhythm; the source's larger vertical rhythm is a composition choice, not a scale change.

| Step  | Primitive token        | Obsidian use                                  |
| ----- | ---------------------- | --------------------------------------------- |
| 4px   | `--primitive-space-1`  | Icon gaps, hairline offsets                   |
| 8px   | `--primitive-space-2`  | Tight component padding                       |
| 16px  | `--primitive-space-4`  | Default padding, grid gap on mobile           |
| 20px  | `--primitive-space-5`  | Eyebrow → heading gap (`mt-5`)                |
| 24px  | `--primitive-space-6`  | Card padding (small), heading → lead (`mt-6`) |
| 32px  | `--primitive-space-8`  | Card padding (large), desktop grid gap        |
| 48px  | `--primitive-space-12` | Lead → content gap (`mt-12`)                  |
| 64px  | `--primitive-space-16` | Lead → content gap on large screens (`mt-16`) |
| 96px  | `--primitive-space-24` | Section rhythm on mobile (`py-24`)            |
| 112px | app-level `7rem`       | Section rhythm on tablet (`py-28`)            |
| 128px | app-level `8rem`       | Section rhythm on desktop (`py-32`)           |

The source's containers are application-level layout tokens (`--ds-container-shell` `75rem`,
`--ds-container-narrow` `48rem`, `--ds-container-prose` `40rem`); the core contract has one content
token, `--size-content` (`70.375rem`), and the theme inherits it. A brand site or console should add
its own container widths, as the source does; see
[Applications and Console](#applications-and-console). The 12-column grid, the mobile-first
breakpoints and the "no horizontal scrolling" rule are likewise application concerns.

Theme-independent layout and motion tokens are inherited unchanged from the core defaults:
`--size-content` (`70.375rem`), `--border-width-default` (`1px`), `--border-width-strong` (`2px`) and
`--motion-easing-standard` (`cubic-bezier(0.2, 0, 0, 1)`). Obsidian overrides the two core durations
to the source's `120ms` / `200ms`.

## Shape

The source geometry is **crisp**: controls are barely rounded, cards carry a moderate 14px corner and
large panels a generous 28px corner. There are no soft 8/12px "app" corners and no pill buttons.

| Role    | Token              | Value    | Source token       | Use                                    |
| ------- | ------------------ | -------- | ------------------ | -------------------------------------- |
| Small   | `--radius-small`   | `4px`    | `--ds-radius-sm`   | Badges, checkboxes, inline tags        |
| Control | `--radius-control` | `6px`    | `--ds-radius-md`   | Buttons, inputs, selects               |
| Surface | `--radius-surface` | `14px`   | `--ds-radius-xl`   | Cards, panels, modals, code containers |
| Modal   | `--radius-modal`   | `20px`   | `--ds-radius-2xl`  | CTA blocks, hero panels, large dialogs |
| Panel   | `--radius-panel`   | `28px`   | `--ds-radius-3xl`  | Large containment panels               |
| Pill    | `--radius-pill`    | `9999px` | `--ds-radius-full` | Avatars, status dots, toggle tracks    |

The source's `--ds-radius-xs` (`2px`, micro tag corners) and `--ds-radius-lg` (`10px`, small cards and
tag groups) have no semantic slot. Components pick the nearest step — `--radius-small` for micro
corners, `--radius-surface` for small cards — or, if a component-token layer exists, keep the source
value there. **No more than three concurrent radii per view** (source §7.1): the normal vocabulary is
`--radius-control` for controls, `--radius-surface` for containers and `--radius-pill` for circular
elements; a fourth radius is a defect.

Border widths use the core `--border-width-default` (`1px`). Only the gold CTA panel may carry a 1px
gold border (`--color-accent-border`); dividers prefer `--color-border-subtle`; coloured borders
never exceed 2px, and the `2px` width (`--border-width-strong`) is reserved for the focus ring. The
source's `--ds-border-strong` (`rgba(243,239,230,0.18)`) is a component-layer recipe (see
[Tokens the core contract cannot represent](#tokens-the-core-contract-cannot-represent)) used for
button and input boundaries.

## Elevation

Elevation is a **warm near-black shadow**: every shadow in the source uses black alpha, so it reads
as depth in the obsidian material rather than as a coloured smudge. The five-level source scale maps
one step onto the core scale and keeps the gold glow for the single focal point.

| Source token       | Value                                                                        | Core token      | Use                               |
| ------------------ | ---------------------------------------------------------------------------- | --------------- | --------------------------------- |
| `--ds-shadow-xs`   | `0 1px 2px rgb(0 0 0 / 0.5)`                                                 | `--shadow-sm`   | Inputs, micro popovers            |
| `--ds-shadow-sm`   | `0 2px 8px -2px rgb(0 0 0 / 0.55)`                                           | `--shadow-md`   | Dropdowns, tags                   |
| `--ds-shadow-md`   | `0 12px 32px -16px rgb(0 0 0 / 0.75)`                                        | `--shadow-lg`   | Interactive card hover            |
| `--ds-shadow-lg`   | `0 32px 80px -32px rgb(0 0 0 / 0.85)`                                        | `--shadow-xl`   | Modals, hero panels               |
| `--ds-shadow-glow` | `0 0 0 1px rgb(212 175 55 / 0.22), 0 18px 48px -20px rgb(212 175 55 / 0.38)` | `--shadow-glow` | The one gold primary action / CTA |

Depth across surfaces is carried primarily by the four surface steps and the hairlines; shadows only
separate floating layers (menus, tooltips, dialogs) and mark hover on interactive cards. The glow is
**reserved for the single gold focal point** — the one gold primary button or the CTA panel — and is
never ambient decoration, never combined with a second glow, and never applied to a card. The
`--ds-shadow-inset` top highlight is a component recipe:

```css
/* Source: inset 0 1px 0 rgba(243,239,230,.05) — no inset elevation slot in the core contract. */
--obsidian-panel-highlight: inset 0 1px 0 rgb(243 239 230 / 0.05);
```

The source uses `--ds-shadow-inset` on cards and panels to fake a top light edge. Because the core
contract has no inset elevation token, the recipe ships the literal (or the `--ds-gradient-panel`
overlay) in the component layer.

## Motion

Motion is restrained and short. Only the source's two fast durations are tokenized; the longer
choreography belongs to the application.

| Source token           | Value                      | Where it lives                           |
| ---------------------- | -------------------------- | ---------------------------------------- |
| `--ds-duration-fast`   | `120ms`                    | `--motion-duration-fast` (theme token)   |
| `--ds-duration-base`   | `200ms`                    | `--motion-duration-normal` (theme token) |
| `--ds-ease-standard`   | `cubic-bezier(.2,0,0,1)`   | inherited `--motion-easing-standard`     |
| `--ds-duration-slow`   | `320ms`                    | app-level duration custom property       |
| `--ds-duration-reveal` | `640ms`                    | app-level duration custom property       |
| `--ds-ease-emphasized` | `cubic-bezier(.16,1,.3,1)` | app-level easing custom property         |
| `--ds-ease-exit`       | `cubic-bezier(.4,0,1,1)`   | app-level easing custom property         |

Rules:

- Animate only `transform`, `opacity`, `color`, `background-color` and `border-color`. Never animate
  `width`, `height`, `top` or `left`.
- Hover and colour transitions use `--motion-duration-fast`; button and input transitions use
  `--motion-duration-normal`. Onyx-style 300ms transitions would feel sluggish here — the source
  console is dense and reactive, not cinematic.
- Panel expansion and navigation (`320ms`) and scroll reveals (`640ms`, 24px rise plus fade, 60–90ms
  stagger within a group) are app-level; the theme package neither emits those durations nor ships
  reveal keyframes.
- `prefers-reduced-motion: reduce` disables all movement and scroll reveals, showing the final state
  immediately; autoplay and infinite decorative animation are forbidden (the gold sheen may only
  brighten slightly on CTA hover).

```css
/* App-level reveal, not shipped by the theme package. */
@media (prefers-reduced-motion: no-preference) {
  .reveal {
    transition:
      opacity 640ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 640ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal[data-revealed='false'] {
    opacity: 0;
    transform: translateY(24px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

## Gradients, Glass and Texture

The core contract has no gradient, glass or texture token, so this material is expressed as
**component recipes** with the source values. A component-token layer would own these literals; an
application that uses the theme directly may define them under an `--obsidian-*` namespace, never in
the middle of a component rule.

### Gold gradient

The signature gold gradient is used on the primary button, gold ribbon and the single gradient
headline line per screen. Its four stops are the source's gold-100, gold-500, gold-600 and gold-700.

```css
.obsidian-primary {
  background: linear-gradient(135deg, #f7efd4 0%, #d4af37 38%, #b8952b 70%, #96771f 100%);
  color: var(--color-on-accent);
  box-shadow: var(--shadow-glow);
}
```

The gradient is never applied to large areas except the CTA panel, which appears once per page. Ink
text (`--color-on-accent`) over the gradient ranges from 17.59:1 on the lightest stop through 9.62:1
on gold-500 to 4.78:1 on the darkest tail `#96771F`; the tail is decoration, so labels stay over the
light-to-mid stops. The solid `--color-accent` remains the token-safe fallback and the measured
9.62:1 ink pair: if a component cannot use a gradient, the solid gold token is the correct
substitute.

### Gold-soft ambient panel

```css
.obsidian-gold-soft {
  background: linear-gradient(135deg, rgb(212 175 55 / 0.18), rgb(212 175 55 / 0.02));
  border: var(--border-width-default) solid var(--color-accent-border);
}
```

Used for the selected card, the gold-soft hero band and the decorative gold wash; text on it is
`--color-fg` (15.55–14.13:1 composited across the surface stack) or `--color-fg-muted`
(10.01–9.09:1).

### Panel top highlight

```css
.obsidian-panel-highlight {
  background: linear-gradient(160deg, rgb(255 255 255 / 0.05), rgb(255 255 255 / 0) 60%);
  /* or, as the source inset: inset 0 1px 0 rgb(243 239 230 / 0.05) */
}
```

### Hero glow

```css
.obsidian-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(60% 60% at 50% 0%, rgb(212 175 55 / 0.16), transparent 72%);
}
```

The glow is decorative and must be `aria-hidden`, `pointer-events-none`, clipped by
`overflow: hidden`, and never used on a page that already has its one gold focal point above the
fold.

### Glass surface

The source's `--ds-surface-glass` (`rgba(243,239,230,0.04)`) has no semantic slot. The recipe derives
it from the text token so it stays warm:

```css
.obsidian-glass {
  background: color-mix(in srgb, var(--color-fg) 4%, transparent);
  border: var(--border-width-default) solid color-mix(in srgb, var(--color-fg) 10%, transparent);
  backdrop-filter: blur(24px) saturate(120%);
  color: var(--color-fg);
}
```

Glass is used for the scrolled sticky header and the secondary button only. It is not a card style;
large glass areas over the page would turn the obsidian material into a generic frosted UI. Text on
glass is measured at 16.68–15.30:1 across the surface stack.

### 1px grid texture

The only allowed background texture is a very faint 1px grid (white at 4%, 80px pitch), optionally
with the hero glow above:

```css
.obsidian-grid-texture {
  background-image:
    linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px);
  background-size: 80px 80px;
  overflow: hidden;
  pointer-events: none;
}
```

No noise textures, no large gold gradients and no stack of glass highlights: the source forbids them
explicitly, and they destroy the material's calm.

## Components (tokenized recipes)

This repository ships **token and theme packages, not a component library**. The source's component
specifications are preserved here as portable CSS recipes that consume only semantic tokens, plus the
documented component-layer literals from
[Tokens the core contract cannot represent](#tokens-the-core-contract-cannot-represent). A
React/Vue design-system package — or an app — can implement them verbatim without learning Obsidian
values. The recipes are the design contract for those components.

Every recipe below assumes the theme's tokens are active (`data-theme="obsidian"`). Class names are
illustrative; the tokens are the contract.

### Buttons

Four variants plus a destructive variant. A screen carries **at most one gold primary button**; a
modal must not add a second one, and a CTA panel must not contain a gold button at all.

```css
/* Base: crisp 6px control radius, 500 weight, short transitions. */
.obsidian-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--primitive-space-2);
  border: var(--border-width-default) solid transparent;
  border-radius: var(--radius-control);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-control);
  font-weight: var(--font-weight-medium);
  letter-spacing: -0.01em;
  line-height: 1;
  transition:
    background-color var(--motion-duration-fast) var(--motion-easing-standard),
    border-color var(--motion-duration-fast) var(--motion-easing-standard),
    filter var(--motion-duration-fast) var(--motion-easing-standard);
}
.obsidian-button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.obsidian-button:disabled {
  opacity: 0.45;
  pointer-events: none;
}

/* Primary — the one gold action. Gradient fill, ink text, gold glow. */
.obsidian-button--primary {
  background: linear-gradient(135deg, #f7efd4 0%, #d4af37 38%, #b8952b 70%, #96771f 100%);
  color: var(--color-on-accent);
  box-shadow: var(--shadow-glow);
}
.obsidian-button--primary:hover {
  filter: brightness(1.05);
}
.obsidian-button--primary:active {
  filter: brightness(0.95);
}

/* Secondary — glass fill, strong hairline, gold on hover. */
.obsidian-button--secondary {
  background: color-mix(in srgb, var(--color-fg) 4%, transparent);
  border-color: color-mix(in srgb, var(--color-fg) 18%, transparent);
  color: var(--color-fg);
}
.obsidian-button--secondary:hover {
  border-color: var(--color-accent);
}

/* Ghost — no fill, muted text that strengthens. */
.obsidian-button--ghost {
  background: transparent;
  color: var(--color-fg-muted);
}
.obsidian-button--ghost:hover {
  color: var(--color-fg);
}

/* Inverse — inside the gold CTA panel only. */
.obsidian-button--inverse {
  background: var(--color-bg);
  color: var(--color-fg);
}

/* Destructive — derived claret fill, ivory text. */
.obsidian-button--destructive {
  background: var(--color-danger-solid);
  color: var(--color-on-danger);
  border-color: var(--color-danger);
}
.obsidian-button--destructive:hover {
  filter: brightness(1.08);
}
```

Sizes (source §10.1), in Inter:

| Size | Height | Horizontal padding           | Font size           | Radius             |
| ---- | ------ | ---------------------------- | ------------------- | ------------------ |
| sm   | 36px   | 16px (`--primitive-space-4`) | `--font-size-small` | `--radius-control` |
| md   | 44px   | 20px (`--primitive-space-5`) | `--font-size-small` | `--radius-control` |
| lg   | 52px   | 28px (app-level `1.75rem`)   | `--font-size-body`  | `--radius-control` |

Button padding is 16/20/28px. The 16px and 20px steps use core spacing tokens; 28px has no
primitive step (`--primitive-space-7` does not exist), so the large button's inline padding is an
application- or component-level `1.75rem` value, documented in the component layer. Labels are
`--font-weight-medium`; the primary and destructive labels may use `--font-weight-strong`. Focus is
the 2px gold ring with a 2px offset, never a colour change alone.
Disabled state is `opacity: 0.45` plus `pointer-events: none` (source §10.1); a loading button is
disabled and shows a progress indicator without changing its width. The arrow variant translates the
arrow by `var(--primitive-space-1)` on hover over `--motion-duration-normal`.

### Cards

```css
.obsidian-card {
  background: var(--color-surface);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-surface);
  padding: var(--primitive-space-6);
  box-shadow: inset 0 1px 0 rgb(243 239 230 / 0.05);
}

/* Interactive cards lift, they do not glow. */
.obsidian-card--interactive {
  transition:
    transform var(--motion-duration-normal) var(--motion-easing-standard),
    box-shadow var(--motion-duration-normal) var(--motion-easing-standard),
    border-color var(--motion-duration-fast) var(--motion-easing-standard);
}
.obsidian-card--interactive:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--color-fg) 18%, transparent);
  box-shadow: var(--shadow-lg);
}

.obsidian-card--nested {
  background: var(--color-bg-subtle);
}
```

Card padding is 24–32px (`--primitive-space-6` / `--primitive-space-8`); cards in one grid stretch to
equal height (`height: 100%` plus flex). The top 1px highlight is the source's `--ds-shadow-inset`
recipe. Cards never use `--shadow-glow`, and nested cards flatten to `--color-bg-subtle` instead of
gaining another shadow level.

### Badges

Pill badges are the one place `--radius-pill` appears outside avatars and toggle tracks. They never
carry a click action.

```css
.obsidian-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--primitive-space-1);
  padding: var(--primitive-space-1) var(--primitive-space-3); /* 4px 12px */
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-fg) 4%, transparent);
  color: var(--color-fg-muted);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
}
.obsidian-badge--gold {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent-border);
  color: #e8d189; /* gold-300 text-on-tint literal; 10.74:1 over the elevated surface */
}
.obsidian-badge--success {
  background: var(--color-success-subtle);
  color: var(--color-success);
  border-color: transparent;
}
.obsidian-badge--warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
  border-color: transparent;
}
.obsidian-badge--danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  border-color: transparent;
}
.obsidian-badge--info {
  background: var(--color-info-subtle);
  color: var(--color-info);
  border-color: transparent;
}
```

A 6px status dot may be added (`width: 6px; height: 6px; border-radius: var(--radius-pill)`), but the
dot never replaces the label: status is conveyed by text and icon/dot together, never by colour
alone. The gold badge is a tinted surface, not a second primary action — a screen may have several
badges without violating the gold budget because their solid-gold area is negligible.

### Section heading

```css
.obsidian-section-heading__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--primitive-space-3); /* 12px between rule and text */
  font-family: var(--font-family-sans);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-strong);
  letter-spacing: var(--font-letter-spacing-label);
  text-transform: uppercase;
  color: var(--color-accent-hover);
}
.obsidian-section-heading__eyebrow::before {
  content: '';
  width: 24px;
  height: var(--border-width-default);
  background: var(--color-accent);
}
.obsidian-section-heading__title {
  margin-top: var(--primitive-space-5); /* mt-5 */
  font-family: var(--font-family-heading);
  font-size: var(--font-size-h2);
  line-height: var(--font-line-height-h2);
  letter-spacing: -0.02em;
  color: var(--color-fg-strong);
}
.obsidian-section-heading__lead {
  margin-top: var(--primitive-space-6); /* mt-6 */
  max-width: 56ch;
  font-family: var(--font-family-sans);
  font-size: var(--font-size-body-lg);
  line-height: 1.65;
  color: var(--color-fg-muted);
}
```

The source pairs a 24px gold short rule with the uppercase eyebrow; the rule is a 1px gold bar, not a
thick underline. Default alignment is left; a centred variant centres all three lines and auto-margins
the lead. The heading block sits `--primitive-space-12` (`--primitive-space-16` on large screens) above
its content.

### Header

The brand-site header is 72px tall (`--ds-header-height`), `position: sticky; top: 0` with the
application's z-index (40). It starts transparent and, after 8px of scroll, becomes
`rgb(7 6 6 / 0.8)` with `backdrop-filter: blur(24px)` and a bottom hairline.

```css
.obsidian-header {
  height: 4.5rem;
  position: sticky;
  top: 0;
  z-index: 40;
  background: transparent;
  border-bottom: var(--border-width-default) solid transparent;
  transition:
    background-color var(--motion-duration-normal) var(--motion-easing-standard),
    border-color var(--motion-duration-normal) var(--motion-easing-standard);
}
.obsidian-header[data-scrolled='true'] {
  background: rgb(7 6 6 / 0.8);
  backdrop-filter: blur(24px);
  border-bottom-color: var(--color-border-subtle);
}
```

Left: gold monogram plus wordmark. Centre: navigation in `--font-size-small`, `--color-fg-muted`,
hover `--color-fg`, active `--color-fg` or `--color-accent-hover`. Right: secondary and primary
buttons (the primary here counts against the one-per-screen budget). Mobile: the hamburger exposes
`aria-expanded` / `aria-controls` and a full-width panel with 44px link spacing. A "Skip to content"
link is the first focusable element on the page.

### Footer

Top hairline (`--color-border-subtle`), four columns — brand and intro, then Firm / Services / Legal
link groups — with links in `--color-fg-muted` and hover `--color-fg`. The bottom row is
`--font-size-caption` in the tertiary text step (component-layer literal or `--color-fg-muted`), and
compliance and risk statements are the same small de-emphasised text. The footer is where the source
system expects the largest amount of quiet text: keep it at body-small or caption, never gold except
for the one brand mark.

### Stats

Four columns on desktop, 2×2 on mobile, separated by 1px `--color-border-subtle` rules instead of
cards. The value uses `--font-family-heading`, `--font-size-h2`, `font-variant-numeric: tabular-nums`;
the unit is small and gold (`--color-accent-hover`); the label is an uppercase overline in the
tertiary text step with `--font-letter-spacing-label`.

### Service cards

A 40px icon container with a 1px `--color-accent-border` outline and `--radius-control`, holding a
24×24 stroke-1.5 gold icon; then the title (`--font-size-h4`, heading family), description
(`--font-size-small`, `--color-fg-muted`), a bullet list whose checks use `--color-accent`, and a text
link in `--color-accent-hover`. The card is a standard `--color-surface` card; the gold is confined to
the icon outline, checks and link, keeping the card well inside the 8% budget.

### Steps

A vertical list: `01 / 02 / 03` in `--font-family-heading` and `--color-accent-hover`, then a title in
`--font-size-h4`, then a description in `--color-fg-muted`. Rows are separated by 1px
`--color-border-subtle` lines. The number is decorative typography, not a badge, and does not use the
heading token scale.

### Testimonials

A large quote in `--font-family-heading` (H2 size), a decorative gold quotation mark, attribution in
`--font-size-small` `--color-fg-muted`, plus two or three supporting figures. The quote mark is
decorative and `aria-hidden`; the figures use tabular numerals. Never place the testimonial on a gold
gradient — that is the CTA panel's single job.

### CTA panel

The only large gold surface in the system. It appears once per page, is the page's single gold focal
point, and cannot contain another gold button.

```css
.obsidian-cta-panel {
  background: linear-gradient(135deg, #f7efd4 0%, #d4af37 38%, #b8952b 70%, #96771f 100%);
  border: var(--border-width-default) solid var(--color-accent-border);
  border-radius: var(--radius-modal);
  color: var(--color-on-accent);
  box-shadow: var(--shadow-glow);
}
.obsidian-cta-panel .obsidian-button--inverse {
  background: var(--color-bg);
  color: var(--color-fg);
}
```

Text on the panel is obsidian ink `--color-on-accent`: 17.59:1 on the lightest gradient stop, 9.62:1
on gold-500, and 4.78:1 on the darkest tail `#96771F` — above WCAG AA everywhere, with the darkest
tail used for decoration rather than long body copy. Because the panel consumes the gold budget, the
surrounding page should not also carry a gold primary button above it.

### Inputs

Labels sit above the field; inputs are 44px tall with the source's elevated fill and strong hairline.

```css
.obsidian-field-label {
  display: block;
  margin-bottom: var(--primitive-space-1);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg-muted);
}
.obsidian-input {
  width: 100%;
  height: 44px;
  padding: var(--primitive-space-3) var(--primitive-space-4); /* 12px 16px */
  color: var(--color-fg);
  background: var(--color-surface-elevated);
  border: var(--border-width-default) solid color-mix(in srgb, var(--color-fg) 18%, transparent);
  border-radius: var(--radius-control);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-small);
  transition: border-color var(--motion-duration-normal) var(--motion-easing-standard);
}
.obsidian-input::placeholder {
  color: var(--color-fg-muted);
}
.obsidian-input:hover {
  border-color: var(--color-accent-border);
}
.obsidian-input:focus-visible {
  border-color: var(--color-accent);
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.obsidian-input[aria-invalid='true'] {
  border-color: var(--color-danger);
}
.obsidian-input:disabled {
  color: var(--color-fg-muted);
  background: var(--color-bg);
  border-color: var(--color-border-subtle);
  cursor: not-allowed;
}
.obsidian-field-error {
  margin-top: var(--primitive-space-1);
  color: var(--color-danger);
  font-size: var(--font-size-caption);
}
```

The strong hairline is the `--ds-border-strong` recipe; the focus ring is always the gold outline in
addition to the gold border, so focus is visible even on the tinted fill. Error text is attached to
the input with `aria-describedby` and announced with `role="alert"`; the border change is never the
only error signal. A submitting button is disabled and shows a loading state; textareas share the
border, fill and focus treatment with `height: auto`, `min-height: 96px` and the same padding.

### Tables

The console's main data surface. Tables scroll inside their own container, never the page.

```css
.obsidian-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-family-sans);
  font-size: var(--font-size-small);
  color: var(--color-fg);
}
.obsidian-table thead th {
  padding: var(--primitive-space-3) var(--primitive-space-4);
  text-align: left;
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-strong);
  letter-spacing: var(--font-letter-spacing-label);
  text-transform: uppercase;
  color: #8f867a; /* source content-tertiary; component-layer literal */
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
}
.obsidian-table tbody td {
  padding: var(--primitive-space-3) var(--primitive-space-4);
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
}
.obsidian-table tbody tr:hover {
  background: color-mix(in srgb, var(--color-bg-subtle) 60%, transparent);
}
.obsidian-table .is-numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.obsidian-table-scroll {
  overflow-x: auto;
  border-radius: var(--radius-surface);
  border: var(--border-width-default) solid var(--color-border);
}
```

Header cells use the source's overline treatment (caption size plus 0.22em tracking) in the tertiary
text step. Row separators are `--color-border-subtle`; a clickable row hovers to the interactive fill
at 60%. Numeric columns are right-aligned and tabular. The table container has zero padding
(`p-0`); loading state is five skeleton rows, the empty state is a centred icon + explanation +
optional action, and errors show a retry action. Status must be text plus icon, not colour alone.

### Modals

```css
.obsidian-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgb(7 6 6 / 0.8);
  backdrop-filter: blur(8px);
}
.obsidian-modal {
  background: var(--color-surface-elevated);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-surface);
  box-shadow: var(--shadow-xl);
  padding: var(--primitive-space-6);
}
```

Overlay is the page canvas at 80% with a small blur; panel is the elevated surface with the 14px
surface radius and the `--shadow-lg` source level. Dangerous operations use the destructive button
variant; **the dialog must not contain a gold primary button** (the page already has its one gold
action). Focus is trapped, Escape closes, focus returns to the trigger, and the dialog is labelled
with `aria-labelledby` and described with `aria-describedby`.

### Toasts

Bottom-right stack of at most three, `aria-live="polite"`, auto-dismiss after 4 seconds, paused on
hover and focus. Every toast carries an icon and text; the status colour is never the only signal.

```css
.obsidian-toast {
  display: flex;
  gap: var(--primitive-space-3);
  padding: var(--primitive-space-3) var(--primitive-space-4);
  background: var(--color-surface-elevated);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-md);
  color: var(--color-fg);
  font-size: var(--font-size-small);
}
.obsidian-toast--success {
  border-color: var(--color-success);
}
.obsidian-toast--warning {
  border-color: var(--color-warning);
}
.obsidian-toast--danger {
  border-color: var(--color-danger);
}
```

The toast icon uses the matching status token; the title and message stay in `--color-fg` /
`--color-fg-muted`. A toast never covers the primary action and never stacks more than three deep.

### Code blocks

```css
.obsidian-code-block {
  background: var(--color-surface-elevated);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-control);
  padding: var(--primitive-space-4);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-code); /* 0.75rem — the source's caption step for code */
  line-height: var(--font-line-height-code);
  color: var(--color-fg);
  overflow-x: auto;
}
.obsidian-code-block .token-comment {
  color: #8f867a; /* tertiary literal; comments are the only code text below body contrast */
}
```

The block scrolls horizontally inside itself — never the page — and renders text content only
(`v-html` is forbidden). Inline code uses the same mono stack at `--font-size-small`, a
`--color-bg-subtle` fill and the control radius. A copy button is 44×44px, focus-visible, and
announces its state through text, not colour.

### Carousels

Autoplay every 6 seconds; pause on hover, focus and when the page is hidden. Previous/next arrows are
44×44px, indicators are clickable, left/right arrow keys work and touch swipe is supported.
`prefers-reduced-motion: reduce` stops autoplay entirely. Slides are labelled
(`aria-roledescription="carousel"`, `aria-live="polite"` for the active slide), and the carousel never
runs infinite decorative motion.

### Charts

Charts are wrapped in one component set (the source uses ECharts 6 with on-demand modules) and read
their colours from CSS variables at runtime through a chart theme module — never hard-coded. The
category mapping is fixed:

| Category                   | Token                                               | Resolved value          |
| -------------------------- | --------------------------------------------------- | ----------------------- |
| Conversation / main series | `--color-accent`                                    | `#D4AF37`               |
| Image                      | `--color-info`                                      | `#6EA8E0`               |
| Video                      | `--color-warning`                                   | `#E3A94F`               |
| Audio                      | `--color-success`                                   | `#54C795`               |
| Comparison series          | `--color-accent-hover` + tertiary ink-300 `#736C62` | component-layer literal |
| Axis / grid                | `--color-border-subtle`                             | `#F3EFE60F`             |
| Tick text                  | tertiary `#8F867A`                                  | component-layer literal |
| Tooltip background         | `--color-surface-elevated`                          | `#111010`               |
| Tooltip border             | `--color-border`                                    | `#F3EFE61A`             |

Every chart must have `role="img"` and a **Chinese** `aria-label` that summarises the key values —
for example `aria-label="近 7 天调用量趋势：周三达到峰值 12.4 万次，周末回落至 6.1 万次"`. A visible
caption or data table alternative is preferred for complex charts. Charts use
`ResizeObserver` for responsive sizing, render with a transparent background, respect
`prefers-reduced-motion` (no entry animation, no streaming animation), and never use 3D, shadows or a
rainbow palette. Real-time pricing flickers no faster than every 5 seconds and pairs the colour
(`--color-success` / `--color-danger`) with a directional arrow and tabular numerals.

## Theme Activation

Obsidian declares `modes: ['dark']`, so `@ezhana/theme-builder` emits a **fixed-mode** stylesheet:
one rule carrying every override and `color-scheme: dark`, with a selector list that also covers both
attribute states at specificity 0,3,0 — `:not([data-color-mode])` when the attribute is absent and
`[data-color-mode]` when it is present. That keeps the theme ahead of the core mode/system rules
regardless of stylesheet order. No `data-color-mode` is required or consulted.

```html
<!-- Obsidian: always the obsidian palette -->
<html data-theme="obsidian"></html>
```

```css
@layer design-tokens {
  :root[data-theme='obsidian'],
  :root[data-theme='obsidian']:not([data-color-mode]),
  :root[data-theme='obsidian'][data-color-mode] {
    color-scheme: dark;
    --color-bg: #070606;
    /* ... every override ... */
  }
}
```

In a multi-theme app, register Obsidian with the other themes and pass the per-theme mode map to the
runtime. `@ezhana/theme` clamps a light preference or a light OS preference to Obsidian's supported
`dark` mode, so the switcher can stay visible without producing a broken light Obsidian:

```ts
import { defaultThemeDefinition } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as obsidian } from '@ezhana/design-theme-obsidian'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { theme as onyx } from '@ezhana/design-theme-onyx'
import { theme as quest } from '@ezhana/design-theme-quest'
import { createThemeManager } from '@ezhana/theme'

export const themeManager = createThemeManager({
  themes: [defaultThemeDefinition, ocean, cerulean, quest, onyx, obsidian],
})

themeManager.setTheme('obsidian')
themeManager.getState().resolvedMode // 'dark', even when the OS prefers light
```

`data-color-mode` is written only for explicit preferences and always holds a mode the active theme
supports; in `system` mode the attribute is removed and the fixed-mode theme stylesheet applies
unconditionally. Loading the theme itself: `import '@ezhana/design-theme-obsidian/style.css'` (complete preset: core
tokens + overrides), or the split `@ezhana/design-tokens/style.css` +
`@ezhana/design-theme-obsidian/fonts.css` + `@ezhana/design-theme-obsidian/theme.css` entries for
multi-theme apps. The
README documents the three loading modes.

## Accessibility

The source's accessibility rules (§12) are part of the identity, not an afterthought: a near-black
interface with hairline borders has to be more disciplined about focus, target size and status
semantics than a high-contrast light UI.

- **Semantics.** Use `header`, `nav`, `main`, `section` (with `aria-labelledby`) and `footer`. Exactly
  one `h1` per page; heading order never skips a level. The console shell's sidebar is a `nav` with
  an accessible name, and the page title is the `h1`.
- **Skip link.** "Skip to content" is the first focusable element on the page, visible when focused,
  and targets `main`. It rides above the sticky header, which is why the app-level stacking order
  reserves the skip link with the overlay layer.
- **Focus.** Every interactive element shows `outline: 2px solid var(--color-focus-ring)` with
  `outline-offset: 2px` on `:focus-visible`. Outline removal without a replacement is forbidden. The
  gold ring measures 13.41:1 on the page, 13.11:1 on `--color-surface` and 12.59:1 on
  `--color-surface-elevated`, so it is visible on every surface.
- **Target size.** Click and tap targets are at least 44×44px (icon buttons, carousel arrows, table
  row actions, mobile menu items), exceeding WCAG 2.2's 24px minimum and matching the source.
- **Icons and SVG.** Decorative SVG is `aria-hidden="true"`; informative icons provide a `<title>` or
  adjacent text. Icons are a single style: 24×24 viewBox, `fill="none"`, `stroke="currentColor"`,
  `stroke-width: 1.5`, round caps.
- **Forms.** Every label is programmatically associated with its input; help text is connected with
  `aria-describedby`; error messages use `role="alert"` and `--color-danger` text, and the invalid
  state is not conveyed by the red border alone. Submitting disables the button and announces the
  loading state.
- **Status is never colour-only.** Success/warning/danger/info always pair their colour with an icon
  and text; charts pair colour with a label or direct annotation; price movements pair colour with an
  arrow and a number.
- **Motion.** `prefers-reduced-motion: reduce` disables scroll reveals, autoplay, streaming and
  price-tick animation, showing final states immediately. No animation loops infinitely.
- **Contrast.** All text pairs meet WCAG 2.2 AA (see [Contrast](#contrast-measured-not-estimated)).
  Gold is used for large or high-contrast text only; body copy is always ivory. The hairline palette is
  documented as decorative, with focus and labelled controls providing the real affordances.
- **Dialogs and overlays.** Modals trap focus, close on Escape, restore focus to the trigger and are
  labelled; toasts use `aria-live="polite"`; carousels pause on interaction and have keyboard and
  touch controls.

## Applications and Console

Obsidian is designed to theme both a marketing site and the **Cstarera console** from the same
palette. The console has a higher information density, but the material rules do not change: four
warm-black surfaces, 1px hairlines, gold only for the current navigation state, key numbers and the
primary action.

### Brand pages

- **Login.** Left: brand narrative (eyebrow, display title, gold emphasis, three capability points and
  three metrics) over the obsidian canvas. Right: the login form and demo account. On mobile it
  becomes a single column with the form first and the narrative shortened.
- **Platform intro.** A carousel (autoplay, manual controls, metrics and CTA) followed by positioning,
  capability grid, model matrix, milestones and compliance notes.
- **Model plaza / playground.** Category model cards with live pricing; select a model, choose
  parameters in a panel, then a simulated streaming conversation. The streaming animation stops under
  `prefers-reduced-motion`.

### Console shell

The source's console layout tokens stay **application-level**; the theme package emits none of them.
The effective stack is layered 40 / 50 / 80 / 100: sticky header `40`, skip link and mobile drawer
`50`, modal `80`, toast `100`. The source declares `--ds-z-overlay: 60` for its overlay token while
bridging it as `z-50`; the app's effective z-index for the drawer is 50, matching the console
guidance, and the theme documents that bridge rather than hiding it.

| Role                      | Value    | Application usage                                |
| ------------------------- | -------- | ------------------------------------------------ |
| Sidebar                   | `264px`  | Fixed console sidebar on desktop (≥1024px)       |
| Sidebar (collapsed)       | `76px`   | Icon-only collapsed sidebar                      |
| Topbar                    | `72px`   | Sticky console topbar                            |
| Content max width         | `1440px` | Console content container                        |
| Content gutter            | `32px`   | Console horizontal padding                       |
| Z-index: header / topbar  | `40`     | Sticky brand header and console topbar           |
| Z-index: overlay / drawer | `50`     | Skip link, mobile navigation panel and its scrim |
| Z-index: modal            | `80`     | Dialogs                                          |
| Z-index: toast            | `100`    | Global toasts                                    |

The shell is a sidebar (sticky on desktop, drawer on mobile) plus a sticky topbar (source §15.2 uses
`z-30` for the console topbar; the app may use 30–40 as long as modals and toasts stay above it) and a
content column capped at 1440px with 32px gutters. Below 1024px the sidebar becomes a drawer with a
scrim, Escape-to-close, body scroll lock and focus return to the trigger; below 640px the topbar keeps
only the menu, the current page and the account entry. Content spacing is `--primitive-space-6` /
`--primitive-space-8`; card padding is 20–24px; table containers are `p-0`.

Navigation rules: primary items use an 18px icon plus a 15px/500 label at ≥40px row height; secondary
items indent by `--primitive-space-3` with a 1px hairline guide and ≥36px row height. The active
chain uses `--color-fg` or `--color-accent-hover` text on `--color-accent-subtle`, and a primary leaf
may add a 1px gold vertical rule. Exactly one chain is highlighted at a time; parents with children
start collapsed and auto-expand when a route is active; the collapsed sidebar is icon-only with
`title` and `aria-label`, and clicking a collapsed parent goes to its first child. The sidebar footer
pins the available-credit balance and recharge entry, in the heading family with tabular numerals;
the topbar balance reads from the same source.

### Console pages

- **Dashboard.** Four KPI cards, then the daily usage trend and model distribution charts, quick
  actions, and the recent calls / spend ranking tables.
- **FDE orders.** An order list with status tabs, stage and service-type filters, pagination, a detail
  modal and CSV export, plus a five-stage delivery board where each column is a status lane.
- **Quick start / API keys.** Grouped documentation navigation, code samples, error codes and billing
  notes, alongside API-key management (masked reveal, copy, rotate and a revoke confirmation whose
  dialog uses the destructive button, not a gold one). Code samples use the code-block recipe and
  never render raw HTML.
- **Wallet.** Credit balance and exchange entry, recharge packages and a transaction table.
- **Model plaza / playground.** Category model cards with live pricing; a model detail panel with
  parameters and a simulated streaming chat that respects reduced motion.

Console component patterns follow §15.4 of the source: table headers use the overline treatment in the
tertiary step, rows are separated by `--color-border-subtle`, numeric columns are right-aligned and
tabular, and every data region has loading skeleton, empty and error-with-retry states. Forms keep
labels above inputs, inputs are 44px tall with the strong hairline, and errors are announced. Modals
use the elevated surface and the 14px surface radius, and never add a gold primary button. Toasts
stack at most three at the bottom-right. The component styles come from the same token recipes as the
brand site — the console only changes density and layout.

## Implementation Notes

| Concern                                                                     | Location                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Theme identity, label, description, single supported mode, font entry       | [`theme.config.mjs`](../theme.config.mjs)                                |
| Obsidian palette (ink, gold, ivory, claret, steel, status)                  | [`tokens/palette.json`](../tokens/palette.json) (`theme.color.obsidian`) |
| Semantic overrides (type scale, families, tracking, shape, motion, palette) | [`tokens/theme.json`](../tokens/theme.json) (`base`, `dark`)             |
| Complete preset (fonts + core tokens + overrides)                           | `dist/style.css`                                                         |
| Theme overrides only                                                        | `dist/theme.css`                                                         |
| Self-hosted `@font-face` rules and font files                               | `dist/fonts.css`, `dist/fonts/`                                          |
| Generated metadata (`themeId`, `themeLabel`, `theme`) + types               | `dist/index.js`, `dist/index.d.ts`                                       |
| Resolved values per mode (used by tests and tooling)                        | `dist/theme.json`                                                        |
| Generation + validation                                                     | `pnpm --filter @ezhana/design-theme-obsidian build`                      |
| Tests (selectors, contract, no leaked variables, WCAG AA, recipes, docs)    | `pnpm --filter @ezhana/design-theme-obsidian test`                       |

### What the theme package emits — and what stays app-level

**Emitted as semantic overrides** (all existing core token names, no new names):

- the four surfaces, three text roles, two borders, the gold accent set (solid, hover, on-accent,
  tint, border, focus ring), the split status roles and their tints, the derived destructive and
  informational solid fills, and the five-level shadow scale;
- the two font families, the full type scale (sizes and line heights), the `0.22em` label tracking,
  the five radii plus the pill, and the two motion durations;
- the fixed-mode selector list and `color-scheme: dark`.

**Deliberately not emitted** (application- or component-level):

- **Gradients, glass, texture.** No gradient/glass/texture tokens exist in the core contract; these
  are component recipes with documented source literals.
- **Layout.** Sidebars, topbars, gutters, containers and z-index are application concerns. A theme
  package that emitted layout would couple every consumer to a console shell.
- **Component tokens.** `border-strong`, tertiary text, `accent-active`, `accent-soft-hover`,
  `shadow-inset`, the 2px/10px radii and the overline size stay in the component layer (values are in
  [Tokens the core contract cannot represent](#tokens-the-core-contract-cannot-represent)).
- **Slow choreography.** `320ms` slow, `640ms` reveal, emphasized/exit easings and negative display
  tracking are app- or component-level.
- **Font weights.** The core weights (400/500/600/700) are inherited unchanged; the source's "500 for
  everything display" is a component rule, not a new weight token.

**Known contract gaps.** The core semantic contract has no slot for `color.border-strong`, a tertiary
text colour, `color.accent-active`, `color.accent-soft-hover`, `shadow-inset`, gradient/glass
surfaces, the 2px and 10px radii, an 11px overline size, or layout/z-index/motion-choreography
tokens. This document lists each gap and its recipe instead of pretending the theme covers them.
Adding any of these later would be a core-contract change, not an Obsidian change, and would not
alter the recipes' semantics.

### Theme override contract satisfied by `obsidian`

| Semantic token                             | Value                           |
| ------------------------------------------ | ------------------------------- |
| `color.accent`                             | `#D4AF37`                       |
| `color.accent-hover`                       | `#DFC06A`                       |
| `color.on-accent`                          | `#070606`                       |
| `color.accent-subtle`                      | `#D4AF371A`                     |
| `color.accent-border`                      | `#D4AF3759`                     |
| `color.focus-ring`                         | `#E8D189`                       |
| `font.family.sans` / `font.family.heading` | Inter / Playfair Display stacks |
| `radius.control`                           | `6px`                           |

Only this set is required. Obsidian additionally overrides the full type scale, the rest of the
palette, all radii and the two durations — all existing semantic tokens, no new names. The package
required no changes to `@ezhana/design-tokens`, `@ezhana/theme-builder` or `@ezhana/theme`: the
fixed-mode support and the extra semantic roles already existed, which is the point of
[ADR 0003](../../../docs/adr/0003-themes-as-packages.md).

### Intentional deviations

These are places where the implementation deliberately differs from a literal reading of the source
document. Each one is measured or justified; none is accidental drift.

1. **The focus ring is opaque.** The source declares `--ds-focus-ring` as gold-300 at 75% alpha
   (`rgba(232,209,137,0.75)`). The theme emits `#E8D189` at full opacity, because an alpha ring's
   contrast depends on the surface and hover state underneath and would vary across the four surfaces.
   The opaque ring is 12.59:1 even on the elevated surface, and remains recognisably the source's
   gold-300.
2. **Destructive and informational solid fills are derived.** The source defines danger and info as
   text colours only. The core contract requires `danger-solid` / `info-solid` surfaces, so the theme
   adds claret `#8F2F2A` and steel `#2F4A61`, both measured with ivory text at 7.02:1 and 8.05:1.
   They sit in the same hue families as the source status colours.
3. **Code is `0.75rem`.** The source renders code blocks at `text-caption` (`0.75rem`); the theme maps
   `font.size.code` to the same caption step, so code is smaller than the core default `0.9375rem`.
   This is the source's console aesthetic (dense code samples), not a mistake.
4. **Chinese headings fall back to Songti SC.** Playfair Display has no CJK coverage; without an
   explicit Chinese serif, Chinese headings would fall through to a Latin serif or a UI sans. The
   heading stack therefore lists `'Songti SC'` before `Georgia`, matching the source's "Chinese
   headings use a Chinese serif" rule.
5. **The overline uses the 12px caption step.** The source overline is 11px (`0.6875rem`). The core
   contract has no 11px size; using `--font-size-caption` with the `0.22em` tracking preserves the
   eyebrow's look at one pixel larger. A component-token layer may restore 11px.
6. **Status tints are derived.** The source defines status text only; the core contract needs tinted
   surfaces for chips and banners, so each status colour is also emitted at 10% as its `-subtle` role.
7. **`fg-strong` is a theme addition.** The source has one primary text colour. The core contract has
   `fg-strong`, so the theme adds ivory-50 `#FAF7F0`, one warm step above `#F3EFE6`, keeping headings
   visibly stronger than body copy (18.91:1).
8. **The four-surface mapping is role-based, not ordered by luminance.** `--color-bg-subtle` carries
   the interactive surface even though it is lighter than `--color-surface-elevated`; see
   [The four-surface mapping](#the-four-surface-mapping).
9. **The source has no gradient, glass, layout or z-index tokens.** They remain component- or
   app-level recipes rather than being invented as core tokens.

### Documentation and token mismatches found while writing this narrative

- The source's `--ds-content-tertiary` is `#8F867A`, which is **not** one of its own Ink ramp steps
  (the nearest are ink-200 `#9C9489` and ink-300 `#736C62`). The theme palette therefore cannot resolve
  it; tertiary text is documented as the component literal `#8F867A`. This is the one source value
  that has no representation anywhere in the package, by design, because the core contract has no
  tertiary role.
- The source's `--ds-z-overlay` is `60`, while its Tailwind bridge is `z-50`. The app-level stack in
  this document uses the effective `50` and records the discrepancy.
- The source's interactive surface (`#191715`) is lighter than its elevated surface (`#111010`),
  which the core role mapping must respect rather than "fix"; see above.

## Obsidian and Onyx

Obsidian and Onyx are the template's two black-gold business identities, and they are deliberately
different designs rather than two palettes of one system. Onyx is the softer, lifted-graphite sibling;
Obsidian is the near-black, serif-led one.

| Aspect           | Obsidian                                           | Onyx                                                      |
| ---------------- | -------------------------------------------------- | --------------------------------------------------------- |
| Page background  | `#070606` warm near-black                          | `#292623` soft warm graphite, lifted above the core dark  |
| Surface depth    | `#0B0A09` / `#111010` / `#191715` near-black steps | `#302D29` / `#36322D` / `#3F3A34` raised graphite steps   |
| Display type     | Playfair Display serif headings, Inter body        | Public Sans everywhere                                    |
| Label tracking   | `0.22em` overline                                  | `0.08em` label tracking                                   |
| Shape            | crisp `4 / 6 / 14 / 20 / 28px`                     | soft `4 / 8 / 12 / 16 / 16px`                             |
| Accent hover     | `#DFC06A`                                          | `#E8C566`                                                 |
| Focus ring       | `#E8D189` opaque                                   | `#E8C566`                                                 |
| Gold glow        | 1px gold edge + long gold shadow, one focal point  | restrained 24px champagne halo for selected state         |
| Shadows          | black-alpha scale (`rgb(0 0 0 / …)`)               | warm near-black (`rgb(9 8 6 / …)`)                        |
| Status treatment | semantic 500 steps clear AA on their own tints     | muted 500 steps plus documented 300 text-on-tint literals |
| Mood             | boardroom lacquer, document, classical authority   | lifted charcoal paper, quiet corporate calm               |

Choose Onyx when the interface should feel like a warm, low-glare working document; choose Obsidian
when it should feel like a private-bank or investor presentation in a dark room. Both are dark-only
fixed-mode themes and can be registered side by side, with `resolvedMode` clamped to `dark` while a fixed-mode theme is active.

## Usage Guidelines

**Do**

- Do use `--color-accent` for the single primary action, key figures, links, selection and focus, and
  keep solid gold at or below 8% of the viewport with at most one gold primary button per screen.
- Do build depth from the four obsidian surfaces and 1px hairlines before reaching for a shadow; keep
  shadows for floating layers and the one gold focal point.
- Do use Playfair Display for Latin display headings and key figures, Inter for body and UI, and let
  Chinese headings fall back to Songti SC and Chinese body text to PingFang SC / Microsoft YaHei.
- Do keep the `0.22em` tracking on uppercase eyebrows and table headers; it is the source's
  overline signature.
- Do use the documented text-on-tint steps (`#E8D189`, `#54C795`, `#E3A94F`, `#E4695F`, `#6EA8E0`)
  when text sits on a translucent tinted fill, and the semantic 500 steps for text on the page.
- Do keep focus visible with the 2px `#E8D189` outline at a 2px offset on every interactive element.
- Do keep the four-surface, hairline-led hierarchy inside the console as well; density changes, the
  material does not.

**Don't**

- Don't introduce pure black (`#000000`) or pure white (`#FFFFFF`) as a surface or text colour, cool
  neutral greys, or a second accent hue; the warm obsidian and ivory are the theme.
- Don't use gold as ambient decoration, a background wash, or a second accent; don't exceed the gold
  area budget and don't add a gold primary button inside a modal or the CTA panel.
- Don't use `--color-danger-solid` or `--color-info-solid` as text colours, and don't use
  `--color-danger` / `--color-info` as solid fills: the roles are split for a reason.
- Don't use Playfair Display for body copy, UI labels or Chinese text; it is a Latin display face.
- Don't mix more than three radii in one view; the crisp 6/14/28px vocabulary is the system.
- Don't animate layout, movement or bounce; fade colour and opacity over `120ms` / `200ms` and keep
  reveals at the application level, disabled under `prefers-reduced-motion`.
- Don't consume `theme.color.obsidian.*` from product code — it is build-time material and is never
  emitted as a CSS custom property.
- Don't put the source's aliases into product code (`--ds-*` names are the source document's
  namespace); consume the core `--color-*`, `--font-*`, `--radius-*` and `--shadow-*` tokens.

## Acceptance Checklist

Adapted from the source's visual acceptance list (§13) for a token/theme package and a consuming
application. A release that ships Obsidian should be able to tick every item.

- [ ] At 1440px, 768px and 390px there is no horizontal page scrolling and no text overflow.
- [ ] The console sidebar's primary/secondary active states are correct; collapse/expand and the
      mobile drawer work, close on Escape and return focus to the trigger.
- [ ] Tables scroll horizontally only inside their own container, never the page.
- [ ] Chart colours come from semantic tokens; every chart has `role="img"` and a Chinese
      `aria-label` with a key-value summary; `ResizeObserver` sizing works.
- [ ] Real-time price and streaming animations stop under `prefers-reduced-motion: reduce`.
- [ ] Solid gold covers at most 8% of any viewport, and there is at most one gold primary button per
      screen; the CTA panel appears at most once per page and contains no gold button.
- [ ] Every colour, font size, radius and shadow comes from a token (or a documented component-layer
      literal from [Tokens the core contract cannot represent](#tokens-the-core-contract-cannot-represent));
      no `#hex` or hard-coded `px` in component code.
- [ ] Headings use Playfair Display, body copy uses Inter, and mixed Chinese/Latin text renders with
      the intended serif/sans fallbacks and no wrong glyphs.
- [ ] Scroll reveals work and disappear under reduced motion; no animation loops indefinitely.
- [ ] Tab traversal shows visible gold focus everywhere, the skip link works, and the mobile menu
      exposes correct `aria-expanded`.
- [ ] Every text pair meets WCAG 2.2 AA; the measured contrast table matches the built tokens.
- [ ] `pnpm lint` and `pnpm format:check` pass, the package build passes, and the generated CSS
      contains no unresolved references, no primitive variables and no theme-private palette
      variables.
