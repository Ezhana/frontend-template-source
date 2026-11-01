# Design System Narrative — Onyx Theme

> **Status:** implemented as the standalone package `@ezhana/design-theme-onyx` and built with
> `@ezhana/theme-builder` against the `@ezhana/design-tokens` contract. Onyx is the template's
> **black-gold business identity**: champagne gold on soft warm graphite, Public Sans and moderately
> soft geometry. It is a **dark-only** identity — the brief defines one graphite palette and no light
> variant — so the package declares the single color mode it supports instead of inventing a second
> palette. The palette and overrides live in this package; the core package only provides the shared
> semantic contract and the layout scales (see
> [ADR 0003](../../../docs/adr/0003-themes-as-packages.md)).

## Visual Identity

Onyx is the corporate sibling of the template's `default`, `cerulean`, `ocean` and `quest` themes.
It is built for business software: admin consoles, finance and reporting dashboards, CRM and
document review, client portals and back-office tools. The interface should read like a well-bound
board document — calm graphite paper, warm ivory ink and one metal used with discipline — rather than
like a consumer app asking for attention.

The identity is **restrained luxury**. Gold is a signal, not decoration: `--color-accent` marks what
the user can act on, where the focus is and what is selected. Everything else is graphite and ivory.
Depth comes from a four-step surface stack (`--color-bg` → `--color-bg-subtle` → `--color-surface` →
`--color-surface-elevated`), hairline borders and warm near-black shadows; a champagne glow is kept
in reserve for the selected state and is never used as ambient decoration. The result should feel
expensive in the way a printed annual report is expensive: material, spacing and restraint, not
ornament.

### Soft graphite, not black

The page background is `#292623` — a **soft charcoal deliberately lifted above the core dark
background `#16171D`**, not a near-black. Onyx never uses pure black (`#000000`) anywhere: not for
surfaces, not for text, not for borders, and not even for shadows. Shadows are a warm near-black wash
(`rgb(9 8 6 / …)`), and the deepest surface in the theme is the page itself at `#292623`.

The choice is deliberate and load-bearing:

- A near-black page maximises contrast and glare on long working sessions; `#292623` keeps the
  interface warm and low-glare while still reading as dark.
- Lifting the page above the core dark background leaves room for **four distinguishable graphite
  steps**. On a near-black page the surface stack collapses and cards can only be separated with
  borders or heavy shadows.
- Warm graphite (a hint of red-yellow in the black) sits correctly under champagne gold. A neutral or
  blue-black would make the gold look yellow and the ivory look grey.

Text is warm ivory (`#EDE6D9`), never pure white (`#FFFFFF`), for the same reason: the pair reads as
paper and ink, and still reaches 12.12:1 on the page.

### One typeface, used honestly

Onyx adopts **Public Sans** as the template's business-grade neutral sans, the same family the
`cerulean` theme ships. This is an intentional reuse, not a shortcut with a hidden identity: the
brief's identity is carried by the graphite-and-gold colour system, the wide `0.08em` label tracking
and the shape scale — not by a novelty display face. A humanist government-grade sans is exactly the
right voice for documents and dashboards, and it keeps the chrome quiet so the product's content and
its one metal can do the talking.

Onyx is **fixed to dark mode**. The soft graphite page is the identity, not a preference; a light
"Onyx" would be a different design system. `@ezhana/theme-builder` emits a fixed-mode stylesheet, and
`@ezhana/theme` resolves any light preference on an Onyx app to its one supported mode (`dark`).

## Color Palette

The palette is anchored on **champagne gold `#D4AF37`**, **warm ivory `#EDE6D9`** and the four
**warm graphite** surfaces. Every inherited core colour is overridden: the core neutral greys are
cool and the core accent is violet, both of which would break the black-gold palette.

| Role                     | Token (semantic)           | Value             |
| ------------------------ | -------------------------- | ----------------- |
| Page background          | `--color-bg`               | `#292623`         |
| Secondary page surface   | `--color-bg-subtle`        | `#302D29`         |
| Card / panel surface     | `--color-surface`          | `#36322D`         |
| Elevated surface         | `--color-surface-elevated` | `#3F3A34`         |
| Default text             | `--color-fg`               | `#EDE6D9` (ivory) |
| Supporting text          | `--color-fg-muted`         | `#B6AC9C`         |
| Strong / heading text    | `--color-fg-strong`        | `#F6F1E7`         |
| Default border           | `--color-border`           | `#534C42`         |
| Divider / hairline       | `--color-border-subtle`    | `#423D36`         |
| Primary / interactive    | `--color-accent`           | `#D4AF37`         |
| Primary hover            | `--color-accent-hover`     | `#E8C566`         |
| On primary               | `--color-on-accent`        | `#292623`         |
| Secondary fill / tint    | `--color-accent-subtle`    | `#D4AF371A`       |
| Gold border at 35%       | `--color-accent-border`    | `#D4AF3759`       |
| Focus ring               | `--color-focus-ring`       | `#E8C566`         |
| Danger text / icon       | `--color-danger`           | `#E28F87`         |
| Destructive button fill  | `--color-danger-solid`     | `#7E2F2C`         |
| On destructive           | `--color-on-danger`        | `#F6F1E7`         |
| Danger tint              | `--color-danger-subtle`    | `#E28F871A`       |
| Success / complete       | `--color-success`          | `#8AC7A4`         |
| Success tint             | `--color-success-subtle`   | `#8AC7A41A`       |
| Warning / pending        | `--color-warning`          | `#E8A94F`         |
| Warning tint             | `--color-warning-subtle`   | `#E8A94F1A`       |
| Info / neutral notice    | `--color-info`             | `#8FB8DB`         |
| Informational solid fill | `--color-info-solid`       | `#2F4A61`         |
| On info                  | `--color-on-info`          | `#F6F1E7`         |
| Info tint                | `--color-info-subtle`      | `#8FB8DB1A`       |

Three rules govern the palette:

1. **Gold has two jobs.** `#D4AF37` is the solid interactive fill and the page-level accent;
   `#E8C566` is both the hover step and the accessible **text-on-tint** variant on translucent gold
   surfaces. The 500 step does not reach AA as text on a tint (see
   [Component contrast](#component-contrast-composited)).
2. **Status roles split into text and solid fill.** Status text is the muted 500 steps; only
   destructive and informational roles also have a solid fill (`danger-solid`, `info-solid`) for
   filled buttons and banners, always paired with `on-danger` / `on-info` ivory text.
3. **Tints are alpha.** The eight-digit values are `10%` transparencies (the gold border is `35%`),
   composited over whatever surface is underneath. They are measured composited, not assumed.

### Theme-private palette

The brief's raw colours live under `theme.color.onyx.*` in
[`tokens/palette.json`](../tokens/palette.json). They are resolved into the override values at build
time and are **never emitted as CSS custom properties**: product code cannot consume them and they do
not appear in the core `primitive.*` scale or in `PrimitiveTokenName`.

| Pigment  | Steps                                                                                         |
| -------- | --------------------------------------------------------------------------------------------- |
| Graphite | `600 #534C42` · `700 #423D36` · `800 #3F3A34` · `850 #36322D` · `900 #302D29` · `950 #292623` |
| Ivory    | `100 #F6F1E7` · `200 #EDE6D9` · `400 #B6AC9C`                                                 |
| Gold     | `300 #E8C566` · `500 #D4AF37`                                                                 |
| Rose     | `300 #F2A8A0` · `500 #E28F87` · `600 #7E2F2C`                                                 |
| Jade     | `300 #A3D6B9` · `500 #8AC7A4`                                                                 |
| Amber    | `300 #F0BE72` · `500 #E8A94F`                                                                 |
| Steel    | `300 #AFCFE9` · `500 #8FB8DB` · `600 #2F4A61`                                                 |

The graphite scale runs from the lightest step (`600`, the default border) down to the darkest
(`950`, the page). The `300` step of every status pigment is the text-on-tint variant used by the chip
recipes; `500` is the status text colour and the solid accent; `600` of rose and steel are the two
solid fills.

### Contrast (measured, not estimated)

Every pair is asserted by this package's test suite
(`pnpm --filter @ezhana/design-theme-onyx test`) and by the theme builder's WCAG check. The pairs
come from the `@ezhana/design-tokens` contract plus the builder's default list (the builder filters
that list down to the tokens the installed contract publishes); this theme does not need a custom
`contrast` block.

| Pair (foreground / background)                   | Ratio   |
| ------------------------------------------------ | ------- |
| `--color-fg` / `--color-bg`                      | 12.12:1 |
| `--color-fg-muted` / `--color-bg`                | 6.71:1  |
| `--color-fg-strong` / `--color-bg`               | 13.36:1 |
| `--color-fg-strong` / `--color-bg-subtle`        | 12.17:1 |
| `--color-fg` / `--color-surface`                 | 10.25:1 |
| `--color-fg-muted` / `--color-surface`           | 5.68:1  |
| `--color-fg-strong` / `--color-surface-elevated` | 10.00:1 |
| `--color-accent` / `--color-bg`                  | 7.15:1  |
| `--color-on-accent` / `--color-accent`           | 7.15:1  |
| `--color-accent-hover` / `--color-bg`            | 9.03:1  |
| `--color-danger` / `--color-bg`                  | 6.10:1  |
| `--color-on-danger` / `--color-danger-solid`     | 8.01:1  |
| `--color-success` / `--color-bg`                 | 7.73:1  |
| `--color-warning` / `--color-bg`                 | 7.32:1  |
| `--color-info` / `--color-bg`                    | 7.20:1  |
| `--color-on-info` / `--color-info-solid`         | 8.21:1  |

All pairs meet **WCAG 2.2 AA (≥ 4.5:1)**. Gold `#D4AF37` is usable both as text on the page and as a
solid button surface with `#292623` ink; the "never pure white" rule is a contrast-neutral choice
because ivory `#EDE6D9` is already 12.12:1 on the page.

The table above covers opaque semantic-token pairs. Component recipes that place text on a
translucent tint are measured against the **composited** background on each surface; see
[Component contrast (composited)](#component-contrast-composited). Those pairs are asserted by this
package's test suite too, so a palette change cannot silently break a recipe.

### Component contrast (composited)

Tinted fills are translucent, so their text contrast depends on the surface underneath. The recipes
in this document are measured on every Onyx surface — `--color-bg` (`#292623`), `--color-surface`
(`#36322D`) and `--color-surface-elevated` (`#3F3A34`) — with the tint composited onto the surface,
and the test suite asserts these ratios as well.

| Recipe           | Text (literal)            | Over `--color-bg` | Over `--color-surface` | Over `--color-surface-elevated` |
| ---------------- | ------------------------- | ----------------- | ---------------------- | ------------------------------- |
| Secondary button | `#E8C566` on accent tint  | 7.43:1            | 6.27:1                 | 5.61:1                          |
| Warning chip     | `#F0BE72` on warning tint | 7.26:1            | 6.13:1                 | 5.48:1                          |
| Success chip     | `#A3D6B9` on success tint | 7.53:1            | 6.35:1                 | 5.68:1                          |
| Error chip       | `#F2A8A0` on danger tint  | 6.52:1            | 5.57:1                 | 4.93:1                          |
| Info chip        | `#AFCFE9` on info tint    | 7.59:1            | 6.41:1                 | 5.73:1                          |

All values are ≥ 4.5:1. These five literals are the **text-on-tint** steps of the theme-private
palette — the semantic `500` steps are the accent and status roles, the `300` steps are their
text-on-tint variants. The distinction is measured, not stylistic: the semantic 500 steps on their
own tints over the elevated surface reach only 4.44:1 (`#D4AF37`), 3.85:1 (`#E28F87`) and 4.46:1
(`#8FB8DB`), which would fail AA for the secondary button and the error and info chips. The `300`
steps clear AA on every surface while staying clearly recognisable as the same hue family.

### Accessibility notes (intentional)

**Status text versus solid fills.** The brief names one muted colour per status role, but a single
hex cannot serve both "text on the warm graphite page" and "solid fill behind ivory text". The theme
therefore splits destructive and informational roles: the semantic text roles use the lighter 500
steps (`--color-danger`, `--color-info`, 6.10:1 and 7.20:1 on the page), while `--color-danger-solid`
(`#7E2F2C`) and `--color-info-solid` (`#2F4A61`) are the solid fills, paired with `--color-on-danger`
/ `--color-on-info` ivory text (8.01:1 and 8.21:1). Success and warning need no solid role in this
identity, so they expose only a text colour and a tint.

**Non-text contrast is documented as decorative.** The hairlines are part of the black-gold material,
but they are below WCAG 1.4.11's 3:1 for a control boundary that is the only visual indicator:
`--color-border` is 1.50:1 on `--color-surface` and 1.78:1 on the page, `--color-border-subtle` is
1.18:1 on `--color-surface`, and the gold 35% `--color-accent-border` composites to roughly 2.00:1 on
`--color-surface`. Onyx therefore treats those hairlines as decorative: controls always carry a
visible label, checked/selected state is conveyed by the gold fill, checkmark/dash or inner dot, and
focus is always visible through the `#E8C566` focus ring (`9.03:1` on the page). If a control has to
rely on its outline alone, use `--color-fg-muted` for the boundary — `#B6AC9C` is 5.68:1 on
`--color-surface` and 5.02:1 on `--color-surface-elevated`. This is a documented limitation of the
hairline palette, not a contrast regression in the theme.

**Never pure white, never pure black.** `--color-fg-strong` is `#F6F1E7` (13.36:1 on the page), and
the page is `#292623`. Neither extreme is used as a colour or as a shadow.

### Core tokens this theme uses (not a patch)

Onyx needed **no new token names**. It consumes roles that were added to `@ezhana/design-tokens` at
the source for the template's first dark-only theme: layered surfaces, status tints, `info` /
solid-danger / solid-info roles, the complete type scale with label tracking, `radius.modal` /
`radius.panel`, and `shadow.lg` / `shadow.xl` / `shadow.glow`. Those are general-purpose semantic
roles (any theme may use them), not Onyx-private names; the palette itself stays private to this
package. The fixed-mode (color-mode subset) support in `@ezhana/theme-builder` and `@ezhana/theme`
predates Onyx, so this package is a pure theme package: palette, overrides, metadata, docs and tests
— the validation that the model in [ADR 0003](../../../docs/adr/0003-themes-as-packages.md) works.

## Typography

One family, one job per weight:

- **Public Sans** — every role: headings, body copy, UI labels, chips, buttons and table headers. A
  neutral, business-grade humanist sans, self-hosted as a variable font.
- **Core mono stack** — inherited unchanged from `@ezhana/design-tokens` (`ui-monospace, Consolas,
monospace`) for code, IDs and tabular readouts. Onyx does not override `font.family.mono`.

The font is self-hosted as a variable font via
[`@fontsource-variable/public-sans`](https://fontsource.org/fonts/public-sans) (weights 100–900,
`font-display: swap`). It is listed in `fonts` in [`theme.config.mjs`](../theme.config.mjs), so the
generated `dist/style.js` imports it after the core stylesheet and before the theme overrides.
Because the `@font-face` is only referenced by the Onyx font tokens, browsers only download Public
Sans when a theme that uses it is active — Onyx or the Cerulean theme, which shares the family; the
other themes keep their own stacks.

| Role          | Token                 | Size                                              | Weight                       | Line height                         |
| ------------- | --------------------- | ------------------------------------------------- | ---------------------------- | ----------------------------------- |
| Display       | `--font-size-display` | fluid `clamp(2.5rem, 1.9rem + 2.4vw, 4rem)`       | 700 (`--font-weight-bold`)   | 1.15 (`--font-line-height-display`) |
| H1            | `--font-size-h1`      | fluid `clamp(2.25rem, 1.5rem + 2.2vw, 3.5rem)`    | 600 (`--font-weight-strong`) | 1.2 (`--font-line-height-h1`)       |
| H2            | `--font-size-h2`      | fluid `clamp(1.25rem, 1rem + 0.5vw, 1.5rem)`      | 600                          | 1.25 (`--font-line-height-h2`)      |
| H3            | `--font-size-h3`      | `1.25rem` (20px)                                  | 600                          | 1.3 (`--font-line-height-h3`)       |
| H4            | `--font-size-h4`      | `1rem` (16px)                                     | 500 (`--font-weight-medium`) | 1.35 (`--font-line-height-h4`)      |
| Body LG       | `--font-size-body-lg` | fluid `clamp(1.125rem, 0.95rem + 0.4vw, 1.25rem)` | 400                          | 1.45 (`--font-line-height-body`)    |
| Body          | `--font-size-body`    | fluid `clamp(1rem, 0.5rem + 0.78vw, 1.125rem)`    | 400                          | 1.45                                |
| Body SM       | `--font-size-small`   | `0.875rem` (14px)                                 | 400                          | 1.45 (`--font-line-height-small`)   |
| Caption       | `--font-size-caption` | `0.75rem` (12px)                                  | 500                          | 1.4 (`--font-line-height-caption`)  |
| Code          | `--font-size-code`    | `0.9375rem` (15px)                                | 400                          | 1.35 (`--font-line-height-code`)    |
| Control label | `--font-size-control` | `1rem` (16px)                                     | 500                          | 1.2 (component)                     |

The type scale is inherited from the core semantic layer — Onyx overrides only the font families and
the label tracking. Hierarchy comes from size and weight, not from a second family.

**Label tracking is the business-document cue.** `font.letterSpacing.label` is overridden to
`0.08em` and is used for eyebrow labels, table headers, field-group captions and uppercase chips.
Wide tracking on a 12px uppercase label is what separates "document heading" from "badge": it reads
as typeset stationery rather than app chrome. The tracking token is semantic, so any small label can
opt into it; body text is never tracked.

```css
--font-family-sans:
  'Public Sans Variable', 'Public Sans', system-ui, 'Segoe UI', Roboto, sans-serif;
--font-family-heading:
  'Public Sans Variable', 'Public Sans', system-ui, 'Segoe UI', Roboto, sans-serif;
--font-family-mono: ui-monospace, Consolas, monospace; /* inherited from core */
--font-letter-spacing-label: 0.08em;
```

## Spacing

The 4px-based core scale is used unchanged, so Onyx lands on the template's familiar rhythm while
its slightly higher card padding gives reports a calmer, document-like density. Layout may consume
the primitive scale directly; themed properties (colour, type, radius, elevation) go through semantic
tokens.

| Step | Primitive token        | Use                     |
| ---- | ---------------------- | ----------------------- |
| 4px  | `--primitive-space-1`  | Inline icon gaps        |
| 8px  | `--primitive-space-2`  | Tight component padding |
| 16px | `--primitive-space-4`  | Default padding         |
| 24px | `--primitive-space-6`  | Card padding            |
| 32px | `--primitive-space-8`  | Panel gaps              |
| 48px | `--primitive-space-12` | Layout sections         |
| 64px | `--primitive-space-16` | Page-level spacing      |

Theme-independent layout and motion tokens are inherited unchanged from the core defaults:
`--size-content` (`70.375rem`), `--border-width-*`, and `--motion-duration-fast` (`150ms`),
`--motion-duration-normal` (`300ms`) with `--motion-easing-standard`
(`cubic-bezier(0.2, 0, 0, 1)`).

## Shape

Moderately soft geometry: every control has a clearly softened corner, but nothing is pill-shaped.
The scale is deliberately one level softer than the compact default controls and calmer at the
surface level, so containers read as surfaces rather than buttons.

| Role          | Token              | Value            | Use                                 |
| ------------- | ------------------ | ---------------- | ----------------------------------- |
| Small         | `--radius-small`   | `0.25rem` (4px)  | Badges, checkboxes, inline tags     |
| Control       | `--radius-control` | `0.5rem` (8px)   | Buttons, inputs, selects, chips     |
| Surface       | `--radius-surface` | `0.75rem` (12px) | Cards, panels, list containers      |
| Modal / panel | `--radius-modal`   | `1rem` (16px)    | Dialogs and side panels             |
| Panel         | `--radius-panel`   | `1rem` (16px)    | Full-height panels                  |
| Pill          | `--radius-pill`    | `9999px`         | Avatars, status dots, toggle tracks |

Border widths use the core `--border-width-default` (`1px`) and `--border-width-strong` (`2px`); the
thicker width is reserved for invalid states and for the gold card-header rule, and the `2px` focus
outline matches it. There are no sharp edges and no pills on interactive controls — roundedness is a
system decision.

## Elevation

Elevation is a **warm near-black shadow**, never a grey or blue drop shadow: the shadow colour is
`rgb(9 8 6 / …)`, the same warm-black family as the graphite, so shadows read as depth in the
material rather than as a smudge. The scale has four offset levels plus a special champagne glow:

| Level | Token           | Value                                 | Use                          |
| ----- | --------------- | ------------------------------------- | ---------------------------- |
| sm    | `--shadow-sm`   | `0 1px 2px rgb(9 8 6 / 0.35)`         | Buttons, small items         |
| md    | `--shadow-md`   | `0 8px 20px -8px rgb(9 8 6 / 0.45)`   | Cards and panels             |
| lg    | `--shadow-lg`   | `0 20px 44px -12px rgb(9 8 6 / 0.55)` | Elevated panels and dialogs  |
| xl    | `--shadow-xl`   | `0 32px 72px -16px rgb(9 8 6 / 0.65)` | Modals and overlays          |
| glow  | `--shadow-glow` | `0 0 24px rgb(212 175 55 / 0.2)`      | Active / selected state only |

The glow is **reserved for the selected state** of an interactive element — a selected filter chip,
a current nav item, a chosen card. It is a restrained 20% champagne halo, not a neon outline, and it
is never combined with another glow. Depth across surfaces is primarily expressed by the graphite
steps (`--color-bg` → `--color-surface` → `--color-surface-elevated`); shadows only separate floating
layers (menus, tooltips, dialogs) from the page. Transitions fade colour and shadow only, over the
core `--motion-duration-normal` (`300ms`) — no movement, no bounce; the brief asks for gravitas, not
playfulness.

## Components (tokenized recipes)

This repository ships **token and theme packages, not a component library**. The brief's component
specifications are preserved here as portable CSS recipes that consume only semantic tokens (plus the
documented text-on-tint literals, which are the theme's private `300` steps), so a React/Vue
design-system package — or an app — can implement them verbatim without learning Onyx values. The
recipes are the design contract for those components.

### Buttons

Variants:

```css
/* Primary — champagne-gold fill, graphite ink, warm shadow. */
.onyx-button--primary {
  color: var(--color-on-accent);
  background: var(--color-accent);
  border: var(--border-width-default) solid var(--color-accent);
  box-shadow: var(--shadow-sm);
}
.onyx-button--primary:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}

/* Secondary — translucent gold fill, gold text, gold border. */
.onyx-button--secondary {
  /* #E8C566 is the text-on-tint variant: --color-accent on the translucent gold fill only reaches
     4.97:1 over --color-surface and 4.44:1 over --color-surface-elevated. */
  color: #e8c566;
  background: var(--color-accent-subtle);
  border: var(--border-width-default) solid var(--color-accent);
  box-shadow: var(--shadow-sm);
}
.onyx-button--secondary:hover {
  border-color: var(--color-accent-hover);
}

/* Ghost — no border, muted ivory text, elevated-surface hover. */
.onyx-button--ghost {
  color: var(--color-fg-muted);
  background: transparent;
  border: 0;
}
.onyx-button--ghost:hover {
  background: var(--color-surface-elevated);
}

/* Destructive — deep muted claret fill, ivory text, red border. */
.onyx-button--destructive {
  color: var(--color-on-danger);
  background: var(--color-danger-solid);
  border: var(--border-width-default) solid var(--color-danger);
  box-shadow: var(--shadow-sm);
}
.onyx-button--destructive:hover {
  /* Mix the claret toward the ivory foreground instead of hard-coding a hover hex; ivory text stays
     above 6:1 on the result. */
  background: color-mix(in srgb, var(--color-danger-solid) 88%, var(--color-fg-strong));
}
```

The only literal colours in the button recipes are the **text-on-tint** gold `#E8C566`; all other
values are semantic tokens. In a component package, the text-on-tint steps belong to its component
tokens; this theme-only repository documents them as literals because no component layer is shipped
here.

Sizes (padding / font size / height / border width), in Public Sans:

| Size | Padding     | Font               | Height | Border |
| ---- | ----------- | ------------------ | ------ | ------ |
| sm   | `6px 14px`  | `0.8125rem` (13px) | 32px   | 1px    |
| md   | `8px 22px`  | `0.875rem` (14px)  | 40px   | 1px    |
| lg   | `12px 30px` | `1rem` (16px)      | 48px   | 1px    |

Button labels are `--font-weight-medium`; primary and destructive labels may use
`--font-weight-strong`. Disabled state: `opacity: 0.35`, `cursor: not-allowed`, no glow, and
`--color-border` as the border. Visible focus uses `outline: 2px solid var(--color-focus-ring)` with
`outline-offset: 2px`, never a colour change alone.

### Cards

```css
.onyx-card {
  background: var(--color-surface);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-surface);
  box-shadow: var(--shadow-md);
  padding: var(--primitive-space-6); /* 24px */
}

.onyx-card--elevated {
  background: var(--color-surface-elevated);
  border-color: var(--color-accent-border);
  box-shadow: var(--shadow-lg);
  transition: box-shadow var(--motion-duration-normal) var(--motion-easing-standard);
}
.onyx-card--elevated:hover {
  box-shadow: var(--shadow-xl);
}

/* Section / KPI header: a thick gold rule is the identity's document cue. */
.onyx-card--header {
  border-top: var(--border-width-strong) solid var(--color-accent);
}
```

Cards never use the glow; the gold rule and the border are enough. Nested cards flatten to
`--color-bg-subtle` instead of gaining another shadow level.

### Inputs

```css
.onyx-field-label {
  color: var(--color-fg);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-strong);
  letter-spacing: var(--font-letter-spacing-label);
  text-transform: uppercase;
  margin-bottom: var(--primitive-space-1);
}
.onyx-field-help {
  color: var(--color-fg-muted);
  font-size: var(--font-size-caption);
  margin-top: var(--primitive-space-1);
}
.onyx-field-error {
  color: var(--color-danger);
  font-size: var(--font-size-caption);
  margin-top: var(--primitive-space-1);
}
.onyx-input {
  height: 40px;
  padding: 8px 12px;
  color: var(--color-fg);
  background: var(--color-surface);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-control);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-small);
}
.onyx-input:hover {
  border-color: var(--color-accent);
}
.onyx-input:focus-visible {
  border-color: var(--color-accent);
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.onyx-input[aria-invalid='true'] {
  border: var(--border-width-strong) solid var(--color-danger);
}
.onyx-input:disabled {
  color: var(--color-fg-muted);
  background: var(--color-bg);
  border-color: var(--color-surface-elevated);
}
```

Latin uppercase labels rely on the `0.08em` tracking token — it is what keeps a tracked small label
legible at `0.75rem`. Textareas keep the same border, background and focus treatment with
`height: auto`, `min-height: 96px` and `padding: 12px`.

### Chips

Uppercase, tracked status and filter chips. The chip labels are `--font-size-caption` with
`--font-weight-strong`, the wide label tracking and Public Sans.

```css
.onyx-chip {
  padding: 4px 12px;
  border-radius: var(--radius-small);
  border: var(--border-width-default) solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-fg-muted);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-strong);
  letter-spacing: var(--font-letter-spacing-label);
  text-transform: uppercase;
}
.onyx-chip--filter-active {
  background: var(--color-accent);
  border-color: transparent;
  color: var(--color-on-accent);
  box-shadow: var(--shadow-glow); /* the one place the champagne glow belongs */
}
.onyx-chip--success {
  background: var(--color-success-subtle);
  color: #a3d6b9; /* text-on-tint: --color-success drops below AA on this tint */
  border-color: transparent;
}
.onyx-chip--warning {
  background: var(--color-warning-subtle);
  color: #f0be72; /* text-on-tint: --color-warning drops below AA on the elevated surface */
  border-color: transparent;
}
.onyx-chip--error {
  background: var(--color-danger-subtle);
  color: #f2a8a0; /* text-on-tint: --color-danger is 3.85:1 on this tint over elevated */
  border-color: transparent;
}
.onyx-chip--info {
  background: var(--color-info-subtle);
  color: #afcfe9; /* text-on-tint: --color-info is 4.46:1 on this tint over elevated */
  border-color: transparent;
}
```

The five chip colours (`#A3D6B9`, `#F0BE72`, `#F2A8A0`, `#AFCFE9` and the gold `#E8C566`) are the
documented text-on-tint literals. The semantic `500` steps stay the status text roles, and the deep
`600` steps stay the solid fills; the `500` roles are never used as text on their own tint.

### Lists

```css
.onyx-list {
  background: var(--color-surface);
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-surface);
  overflow: hidden;
}
.onyx-list-row {
  min-height: 48px;
  padding: 8px 16px;
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-body);
  color: var(--color-fg);
}
.onyx-list-row:hover {
  background: var(--color-surface-elevated);
}
.onyx-list-row[aria-selected='true'] {
  background: var(--color-accent-subtle);
  box-shadow: inset 2px 0 0 var(--color-accent); /* gold selection rule */
}
.onyx-list-row-description {
  color: var(--color-fg-muted);
  font-size: var(--font-size-small);
}
.onyx-list-row-meta {
  color: var(--color-fg-muted);
  font-size: var(--font-size-caption);
  letter-spacing: var(--font-letter-spacing-label);
  text-transform: uppercase;
}
```

A selected row uses the translucent gold tint plus the 2px inner gold rule instead of the glow — the
glow is reserved for the control that owns the selection (a filter chip or a toggle), not for every
row that happens to be selected.

### Checkboxes

```css
.onyx-checkbox {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-small);
  border: 2px solid var(--color-border);
  background: var(--color-surface);
}
.onyx-checkbox[aria-checked='true'],
.onyx-checkbox[aria-checked='mixed'] {
  border: 0;
  background: var(--color-accent);
  color: var(--color-on-accent);
}
.onyx-checkbox:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.onyx-checkbox:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.onyx-checkbox-label {
  margin-left: var(--primitive-space-2); /* 8px */
  font-family: var(--font-family-sans);
  font-size: var(--font-size-small);
  color: var(--color-fg);
}
```

The checked state is the gold fill with a graphite checkmark (or dash for `mixed`), not a gold
outline: colour alone never conveys the state, and the check glyph remains visible at `0.35` opacity
in the disabled state.

### Radio buttons

```css
.onyx-radio {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-pill);
  border: 2px solid var(--color-border);
  background: var(--color-surface);
}
.onyx-radio[aria-checked='true'] {
  border-color: var(--color-accent);
}
.onyx-radio[aria-checked='true']::after {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
}
.onyx-radio:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.onyx-radio:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
```

Radio groups keep the native `<input type="radio">` semantics; the dot is drawn with the accent fill.
Radios are the one place where `--radius-pill` appears on an interactive control — a circle is a
shape convention, not a pill button.

### Tooltips

```css
.onyx-tooltip {
  max-width: 260px;
  padding: 8px 14px;
  border-radius: var(--radius-control);
  background: var(--color-surface-elevated);
  color: var(--color-fg);
  border: var(--border-width-default) solid var(--color-accent-border);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-caption);
  transition: opacity var(--motion-duration-normal) var(--motion-easing-standard);
}
```

Show delay is 300ms, hide is immediate — implement with the tooltip library's timing, matching
`--motion-duration-normal`. The arrow matches `--color-surface-elevated` with a
`--color-accent-border` edge on the two visible sides. Tooltips never carry the glow; they are
informational, not selected.

## Theme Activation

Onyx declares `modes: ['dark']`, so `@ezhana/theme-builder` emits a **fixed-mode** stylesheet: one
rule carrying every override and `color-scheme: dark`, with a selector list that also covers both
attribute states at specificity 0,3,0 — `:not([data-color-mode])` when the attribute is absent and
`[data-color-mode]` when it is present. That keeps the theme ahead of the core mode/system rules
regardless of stylesheet order. No `data-color-mode` is required or consulted.

```html
<!-- Onyx: always the Onyx graphite palette -->
<html data-theme="onyx"></html>
```

```css
@layer design-tokens {
  :root[data-theme='onyx'],
  :root[data-theme='onyx']:not([data-color-mode]),
  :root[data-theme='onyx'][data-color-mode] {
    color-scheme: dark;
    --color-bg: #292623;
    /* ... every override ... */
  }
}
```

In a multi-theme app, register Onyx with the other themes and pass the per-theme mode map to the
runtime. `@ezhana/theme` clamps a light preference or a light OS preference to Onyx's supported
`dark` mode, so the switcher can stay visible without producing a broken light Onyx:

```ts
import { defaultThemeDefinition, type Mode } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { theme as onyx } from '@ezhana/design-theme-onyx'
import { createThemeManager, defineThemeRegistry } from '@ezhana/theme'

export const registry = defineThemeRegistry([defaultThemeDefinition, ocean, cerulean, onyx])
export type AppTheme = (typeof registry.themes)[number]

export const manager = createThemeManager<AppTheme, Mode>({
  themes: [...registry.themes],
  modes: [...registry.modes],
  themeModes: registry.themeModes, // onyx → ['dark']
  defaultTheme: registry.defaultTheme,
})

manager.setTheme('onyx')
manager.getState().resolvedMode // 'dark', even when the OS prefers light
```

`data-color-mode` is written only for explicit preferences and always holds a mode the active theme
supports; in `system` mode the attribute is removed and the fixed-mode theme stylesheet applies
unconditionally. The switcher UI can read `registry.themeModes` to disable unsupported mode options.

Loading the theme itself: `import '@ezhana/design-theme-onyx/style'` (core stylesheet + Public Sans +
overrides), or the split `@ezhana/design-tokens/css/tokens.css` +
`@ezhana/design-theme-onyx/theme.css` entries.

## Implementation Notes

| Concern                                                                                    | Location                                                             |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Theme identity, label, description, single supported mode, font entry                      | [`theme.config.mjs`](../theme.config.mjs)                            |
| Onyx palette (graphite, ivory, gold, rose, jade, amber, steel)                             | [`tokens/palette.json`](../tokens/palette.json) (`theme.color.onyx`) |
| Semantic overrides (font families, label tracking, shape, warm palette, status, elevation) | [`tokens/theme.json`](../tokens/theme.json) (`base`, `dark`)         |
| Generated CSS overrides (fixed-mode selector) and standalone bundle                        | `dist/css/theme.css`, `dist/css/standalone.css`                      |
| Generated bundler entry (core CSS + Public Sans + overrides)                               | `dist/style.js`                                                      |
| Generated metadata (`themeId`, `themeLabel`, `theme.modes = ['dark']`)                     | `dist/js/index.js`, `dist/js/index.d.ts`                             |
| Resolved values for the supported mode (used by tests and tooling)                         | `dist/json/theme.json`                                               |
| Generation + validation                                                                    | `pnpm --filter @ezhana/design-theme-onyx build`                      |
| Tests (selectors, contract, no leaked variables, WCAG AA)                                  | `pnpm --filter @ezhana/design-theme-onyx test`                       |

Underlying capabilities this package relies on (all already in place; Onyx added no core code):

- **`@ezhana/design-tokens`** — layered semantic surfaces, status tints, info/solid-danger roles, the
  full type/line-height scale, label tracking, modal/panel radii and the deep elevation levels.
- **`@ezhana/theme-builder`** — `modes` in the theme config and fixed-mode CSS emission, so a theme
  may support a subset of the contract's color modes (here: dark only).
- **`@ezhana/theme`** — per-theme mode metadata (`themeModes`) and `resolvedMode` clamping, so a
  dark-only theme can be registered next to light+dark themes.

Adding Onyx required **no application-specific theming code** beyond registering it in the app's
theme registry: the package ships its palette, overrides, metadata, font and bundler entry.

### Theme override contract satisfied by `onyx`

| Semantic token                             | Value             |
| ------------------------------------------ | ----------------- |
| `color.accent`                             | `#D4AF37`         |
| `color.accent-hover`                       | `#E8C566`         |
| `color.on-accent`                          | `#292623`         |
| `color.accent-subtle`                      | `#D4AF371A`       |
| `color.accent-border`                      | `#D4AF3759`       |
| `color.focus-ring`                         | `#E8C566`         |
| `font.family.sans` / `font.family.heading` | Public Sans stack |
| `radius.control`                           | `0.5rem` (8px)    |

Only this set is required. Onyx additionally overrides the typography families, label tracking, the
full shape scale, the warm graphite surfaces/borders/text, the remaining status colours and the
elevation scale — all existing semantic tokens, no new names.

## Usage Guidelines

**Do**

- Do use `--color-accent` for primary actions, links, selection and focus, and reserve
  `--shadow-glow` for the selected state of the control that owns the selection.
- Do build depth from the graphite surface stack (`--color-bg` → `--color-surface` →
  `--color-surface-elevated`) before reaching for a shadow.
- Do keep Public Sans for every role and use weight and size for hierarchy; use the core mono stack
  for code and IDs.
- Do use the `0.08em` label tracking on uppercase eyebrows, table headers and chips — it is the
  business-document cue.
- Do use the documented text-on-tint steps (`#E8C566`, `#F0BE72`, `#A3D6B9`, `#F2A8A0`, `#AFCFE9`)
  for text on a tinted fill, and the semantic `500` status colours for text on the page.
- Do use `--radius-surface` for containers and `--radius-control` for controls; keep the 2px gold
  top rule for card and section headers.
- Do keep focus visible with the `#E8C566` focus ring on every interactive element, including
  checkboxes and radios.

**Don't**

- Don't introduce pure black (`#000000`), pure white (`#FFFFFF`) or cool-neutral greys; the warm
  graphite and ivory are the theme.
- Don't use gold as ambient decoration, for borders on everything, or as a second accent — it marks
  action and selection only, and the glow belongs to the selected state alone.
- Don't use `--color-danger-solid` or `--color-info-solid` as text colours, and don't use
  `--color-danger` / `--color-info` as solid fills: the roles are split for a reason.
- Don't use the semantic `500` steps as text on their own tints — the accent, danger and info steps
  fall below AA there; use the documented `300` text-on-tint steps.
- Don't consume `theme.color.onyx.*` from product code — it is build-time material and is never
  emitted as a CSS custom property.
- Don't mix pill, moderate and sharp radii inside one control group; roundedness is a system
  decision.
- Don't animate layout, movement or bounce; fade colour and shadow over `--motion-duration-normal`
  (`300ms`).
