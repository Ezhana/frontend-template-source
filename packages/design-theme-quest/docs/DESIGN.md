# Design System Narrative — QuestUI Theme

> **Status:** implemented as the standalone package `@ezhana/design-theme-quest` and built with
> `@ezhana/theme-builder` against the `@ezhana/design-tokens` contract. QuestUI is a **dark-only**
> identity: the design brief defines one warm, parchment-and-gold palette and no light variant, so
> the package declares the single color mode it supports instead of inventing a second palette.
> The palette and overrides live in this package; the core package only provides the shared
> semantic contract and the layout scales.

## Visual Identity

QuestUI is the ornate, cinematic sibling of the template's `default`, `ocean` and `cerulean`
themes. It is built for RPG game interfaces and fantasy gaming platforms, where the interface is
part of the world: a quest log should feel like a bound tome, an inventory like a treasure chest,
a skill tree like an illuminated manuscript.

The aesthetic is medieval, layered and crafted. Colour is ritual, not decoration: gold marks what
the player can act on or has earned, deep red marks danger and damage, and royal purple is reserved
for the rare, legendary and magical. Surfaces are three warm browns rather than black, so depth is
built from pigment instead of shadow. Every edge is drawn — borders, top-border accents and gold
glows carry the weight that flat, modern design would express with whitespace alone.

The theme deliberately ships **no sans-serif**. Cinzel supplies the carved, inscriptional display
voice; Spectral carries long-form lore and body text; Fira Code handles die rolls, stats and other
numeric readouts. Together they keep a single keyboard of serif and slab forms, which is what makes
the interface feel authored rather than assembled.

QuestUI is **fixed to dark mode**. The brief's page background (`#1A0F0A`) is the identity, not a
preference; a light "QuestUI" would be a different design system. `@ezhana/theme-builder` emits a
fixed-mode stylesheet, and `@ezhana/theme` resolves any light preference on a QuestUI app to its one
supported mode (`dark`).

## Color Palette

The palette is anchored on three named pigments — **gold `#CA8A04`**, **deep red `#991B1B`** and
**royal purple `#581C87`** — layered over the four browns of the brief. Every inherited core colour
is overridden: the core neutral greys and violet accent are cool and would break the warm fantasy
palette.

| Role                     | Token (semantic)           | Value                 |
| ------------------------ | -------------------------- | --------------------- |
| Page background          | `--color-bg`               | `#1A0F0A`             |
| Secondary surface        | `--color-bg-subtle`        | `#2C1A10`             |
| Card / panel surface     | `--color-surface`          | `#2C1A10`             |
| Elevated surface         | `--color-surface-elevated` | `#3D2517`             |
| Default text             | `--color-fg`               | `#F5E6D3` (parchment) |
| Supporting text          | `--color-fg-muted`         | `#BFA98A`             |
| Strong / heading text    | `--color-fg-strong`        | `#F5E6D3`             |
| Default border           | `--color-border`           | `#5C3D2E`             |
| Divider / hairline       | `--color-border-subtle`    | `#3D2517`             |
| Primary / interactive    | `--color-accent`           | `#CA8A04`             |
| Primary hover            | `--color-accent-hover`     | `#B8780A`             |
| On primary               | `--color-on-accent`        | `#1A0F0A`             |
| Secondary fill / tint    | `--color-accent-subtle`    | `#CA8A0415`           |
| Gold border at 25%       | `--color-accent-border`    | `#CA8A0440`           |
| Focus ring               | `--color-focus-ring`       | `#CA8A04`             |
| Danger text / damage     | `--color-danger`           | `#F87171`             |
| Destructive button fill  | `--color-danger-solid`     | `#991B1B`             |
| On destructive           | `--color-on-danger`        | `#F5E6D3`             |
| Danger tint              | `--color-danger-subtle`    | `#991B1B20`           |
| Success / quest complete | `--color-success`          | `#22C55E`             |
| Success tint             | `--color-success-subtle`   | `#22C55E20`           |
| Warning                  | `--color-warning`          | `#CA8A04`             |
| Warning tint             | `--color-warning-subtle`   | `#CA8A0420`           |
| Info / lore / magic text | `--color-info`             | `#C084FC`             |
| Rare / legendary fill    | `--color-info-solid`       | `#581C87`             |
| On rare                  | `--color-on-info`          | `#F5E6D3`             |
| Info tint                | `--color-info-subtle`      | `#581C8720`           |

### Theme-private palette

The brief's raw colours live under `theme.color.quest.*` in
[`tokens/palette.json`](../tokens/palette.json). They are resolved into the override values at
build time and are **never emitted as CSS custom properties**: product code cannot consume them and
they do not appear in the core `primitive.*` scale or in `PrimitiveTokenName`.

| Pigment   | Steps                                                         |
| --------- | ------------------------------------------------------------- |
| Gold      | `300 #DAA520` · `500 #CA8A04` · `600 #B8780A`                 |
| Parchment | `100 #F5E6D3` · `300 #BFA98A`                                 |
| Crimson   | `300 #F87171` · `500 #B91C1C` · `600 #991B1B` · `700 #7F1D1D` |
| Royal     | `300 #C084FC` · `600 #581C87`                                 |
| Brown     | `700 #5C3D2E` · `800 #3D2517` · `900 #2C1A10` · `950 #1A0F0A` |
| Green     | `500 #22C55E`                                                 |

### Contrast (measured, not estimated)

Every pair is asserted by this package's test suite
(`pnpm --filter @ezhana/design-theme-quest test`) and by the theme builder's WCAG check. The pairs
come from the `@ezhana/design-tokens` contract plus the builder's default list (the builder filters
that list down to the tokens the installed contract publishes); this theme does not need a custom
`contrast` block.

| Pair (foreground / background)                   | Ratio   |
| ------------------------------------------------ | ------- |
| `--color-fg` / `--color-bg`                      | 15.35:1 |
| `--color-fg-muted` / `--color-bg`                | 8.29:1  |
| `--color-fg-strong` / `--color-bg`               | 15.35:1 |
| `--color-fg-strong` / `--color-bg-subtle`        | 13.58:1 |
| `--color-fg` / `--color-surface`                 | 13.58:1 |
| `--color-fg-muted` / `--color-surface`           | 7.33:1  |
| `--color-fg-strong` / `--color-surface-elevated` | 11.62:1 |
| `--color-accent` / `--color-bg`                  | 6.40:1  |
| `--color-on-accent` / `--color-accent`           | 6.40:1  |
| `--color-accent-hover` / `--color-bg`            | 5.13:1  |
| `--color-danger` / `--color-bg`                  | 6.80:1  |
| `--color-on-danger` / `--color-danger-solid`     | 6.78:1  |
| `--color-success` / `--color-bg`                 | 8.25:1  |
| `--color-warning` / `--color-bg`                 | 6.40:1  |
| `--color-info` / `--color-bg`                    | 7.12:1  |
| `--color-on-info` / `--color-info-solid`         | 8.88:1  |

All pairs meet **WCAG 2.2 AA (≥ 4.5:1)**. Gold `#CA8A04` is usable both as text on the page and as
a solid button surface with `#1A0F0A` ink; the brief's "never pure white" rule is a contrast-neutral
choice because parchment `#F5E6D3` is already 15.35:1 on the page.

The table above covers opaque semantic-token pairs. Component recipes that place text on a
translucent tint are measured against the **composited** background on each surface; see
[Component contrast (composited)](#component-contrast-composited). Those pairs are asserted by this
package's test suite too, so a palette change cannot silently break a recipe.

### Accessibility adjustments (intentional)

The brief assigns one hex per status role, but a single hex cannot serve both "text on a near-black
page" and "solid fill behind parchment". The theme therefore splits those roles rather than using
inaccessible text:

| Brief value | Role in the brief   | Implementation                                                  |
| ----------- | ------------------- | --------------------------------------------------------------- |
| `#991B1B`   | Error / damage      | `--color-danger-solid` (destructive fill); text uses `#F87171`  |
| `#581C87`   | Info / lore / magic | `--color-info-solid` (rare/legendary fill); text uses `#C084FC` |

`#991B1B` on `#1A0F0A` is 2.26:1 and `#581C87` on `#1A0F0A` is 1.73:1, so using them as body text
would fail AA. Their exact brief values are preserved for the solid surfaces where they are used as
designed, with `--color-on-danger` / `--color-on-info` parchment text (6.78:1 and 8.88:1).

**Non-text contrast.** The brief's 1px `#5C3D2E` boundary is 1.71:1 on `--color-surface` (and the
error boundary `#991B1B` is 2.00:1), below WCAG 1.4.11's 3:1 for a control boundary that is the only
visual indicator. QuestUI therefore treats those hairlines as decorative: controls always carry a
visible label, and checked/selected state is conveyed by the gold fill, checkmark/dash or inner dot,
plus the 3px focus ring. If a control has to rely on its outline alone, use `--color-fg-muted`
(`#BFA98A`, 7.33:1 on `--color-surface`) for the boundary. This is a documented limitation of the
brief's hairline palette, not a contrast regression in the theme.

### Core tokens added for QuestUI (not a patch)

QuestUI needs semantic roles the core package did not expose (layered surfaces, status tints, an
info role, a solid-danger role, a full type scale, modal/panel radii and two deeper elevation
levels). A theme may not invent token names — it only overrides existing semantic tokens — so these
were added to **`@ezhana/design-tokens`** itself, with default-theme values for every mode. They are
general-purpose roles (any theme may use them), not QuestUI-private names.

## Typography

Three families, each with a clear job:

- **Cinzel** — headings, UI labels, chips and buttons. Inscriptional and ornate, with small caps
  energy; never used for long copy.
- **Spectral** — body copy, lore, descriptions, form labels and helper text. A screen-optimised
  serif with a warm, literary tone.
- **Fira Code** — code, stats, timers, die results and numeric readouts.

All three are self-hosted through Fontsource, so the template works offline and loads no third-party
CDN:

| Family    | Package                          | Weights loaded     |
| --------- | -------------------------------- | ------------------ |
| Cinzel    | `@fontsource/cinzel`             | 400, 500, 600, 700 |
| Spectral  | `@fontsource/spectral`           | 400, 500, 600      |
| Fira Code | `@fontsource-variable/fira-code` | variable 300–700   |

The `fonts` array in [`theme.config.mjs`](../theme.config.mjs) puts those imports in the generated
`dist/style.js` after the core stylesheet and before the theme overrides. Because the `@font-face`
rules are only referenced by QuestUI font tokens, a browser downloads them only when QuestUI is the
active theme.

| Role          | Token                 | Size                | Weight                       | Line height                         |
| ------------- | --------------------- | ------------------- | ---------------------------- | ----------------------------------- |
| Display       | `--font-size-display` | `40px` / `2.5rem`   | 700 (`--font-weight-bold`)   | 1.15 (`--font-line-height-display`) |
| H1            | `--font-size-h1`      | `32px` / `2rem`     | 700                          | 1.2 (`--font-line-height-h1`)       |
| H2            | `--font-size-h2`      | `24px` / `1.5rem`   | 600 (`--font-weight-strong`) | 1.25 (`--font-line-height-h2`)      |
| H3            | `--font-size-h3`      | `20px` / `1.25rem`  | 600                          | 1.3 (`--font-line-height-h3`)       |
| H4            | `--font-size-h4`      | `16px` / `1rem`     | 400 (`--font-weight-body`)   | 1.35 (`--font-line-height-h4`)      |
| Body LG       | `--font-size-body-lg` | `18px` / `1.125rem` | 400                          | 1.7 (`--font-line-height-body`)     |
| Body          | `--font-size-body`    | `16px` / `1rem`     | 400                          | 1.7                                 |
| Body SM       | `--font-size-small`   | `14px` / `0.875rem` | 400                          | 1.6 (`--font-line-height-small`)    |
| Caption       | `--font-size-caption` | `12px` / `0.75rem`  | 500 (`--font-weight-medium`) | 1.4 (`--font-line-height-caption`)  |
| Code          | `--font-size-code`    | `14px` / `0.875rem` | 400                          | 1.6 (`--font-line-height-code`)     |
| Control label | `--font-size-control` | `14px` / `0.875rem` | 500                          | 1.2                                 |

Chips are the one micro-label exception: Cinzel `11px`, uppercase, with
`--font-letter-spacing-label` (`1px`) for the inscribed, carved quality the brief asks for. The
tracking token is a semantic token, so other small labels can opt into it.

```css
--font-family-heading: 'Cinzel', 'Spectral', Georgia, serif;
--font-family-sans: 'Spectral', Georgia, 'Times New Roman', serif;
--font-family-mono:
  'Fira Code Variable', 'Fira Code', ui-monospace, SFMono-Regular, Consolas, monospace;
```

## Spacing

The brief's base unit is **8px** with a 4px `xs` inline gap. Layout consumes the core 4px-based
primitive scale directly (the core policy: layout uses primitives, themed properties use semantic
tokens), so the design names map onto existing steps without new tokens:

| Brief | px  | Primitive token        | Use                     |
| ----- | --- | ---------------------- | ----------------------- |
| xs    | 4   | `--primitive-space-1`  | Inline icon gaps        |
| sm    | 8   | `--primitive-space-2`  | Tight component padding |
| md    | 16  | `--primitive-space-4`  | Default padding         |
| lg    | 24  | `--primitive-space-6`  | Card padding            |
| xl    | 32  | `--primitive-space-8`  | Panel gaps              |
| 2xl   | 48  | `--primitive-space-12` | Layout sections         |
| 3xl   | 64  | `--primitive-space-16` | Page-level spacing      |

## Shape

Subtle radius for a medieval, angular feel — no pills and no sharp edges:

| Brief   | Token                                   | Value  | Use                         |
| ------- | --------------------------------------- | ------ | --------------------------- |
| sm      | `--radius-small`                        | 2px    | Badges, inline tags         |
| DEFAULT | `--radius-control` / `--radius-surface` | 4px    | Buttons, cards, inputs      |
| md      | `--radius-modal`                        | 6px    | Modals, dropdown panels     |
| lg      | `--radius-panel`                        | 8px    | Inventory panels            |
| full    | `--radius-pill`                         | 9999px | Health orbs, status circles |

Border widths use the core `--border-width-default` (`1px`) and `--border-width-strong` (`2px`);
the large button's `1.5px` border in the brief is a component-level detail
(`border-width: 1.5px`), not a global token.

## Elevation

Elevation is a coloured gold glow, never a grey drop shadow. The core semantic scale now has four
offset levels plus the special `glow`; the brief maps onto it one-to-one, with the exact shadows
from the brief:

| Brief   | Token           | Value                              | Use                     |
| ------- | --------------- | ---------------------------------- | ----------------------- |
| sm      | `--shadow-sm`   | `0 1px 3px rgb(202 138 4 / 0.15)`  | Buttons, small items    |
| DEFAULT | `--shadow-md`   | `0 2px 8px rgb(202 138 4 / 0.20)`  | Cards, panels           |
| md      | `--shadow-lg`   | `0 4px 16px rgb(202 138 4 / 0.25)` | Elevated panels         |
| lg      | `--shadow-xl`   | `0 8px 32px rgb(202 138 4 / 0.30)` | Modals, treasure UI     |
| glow    | `--shadow-glow` | `0 0 20px rgb(202 138 4 / 0.40)`   | Active / selected items |

The glow is reserved for the active/selected state of an interactive element. Transitions fade
colour and shadow only, over the core `--motion-duration-normal` (`300ms`) — no movement, no
bounce; the brief asks for gravitas, not playfulness.

## Components (tokenized recipes)

This repository ships **token and theme packages, not a component library**. The brief's component
specifications are preserved here as portable CSS recipes that consume only semantic tokens, so a
React/Vue design-system package (or an app) can implement them verbatim without learning QuestUI
values. The recipes are the design contract for those components.

### Buttons

Variants:

```css
/* Primary — gold fill, ink text, bright gold border */
.quest-button--primary {
  color: var(--color-on-accent);
  background: var(--color-accent);
  border: var(--border-width-default) solid #daa520; /* brief's gold border */
  box-shadow: var(--shadow-sm);
}
.quest-button--primary:hover {
  background: var(--color-accent-hover);
}

/* Secondary — transparent, gold text and border, faint gold fill */
.quest-button--secondary {
  /* The brief's bright gold (#DAA520) is the accessible text-on-tint variant: --color-accent on the
     translucent gold fill only reaches ~4.28:1 over --color-surface-elevated. */
  color: #daa520;
  background: var(--color-accent-subtle);
  border: var(--border-width-default) solid var(--color-accent);
}

/* Ghost — no border, muted parchment text, elevated-surface hover */
.quest-button--ghost {
  color: var(--color-fg-muted);
  background: transparent;
  border: 0;
}
.quest-button--ghost:hover {
  background: var(--color-surface-elevated);
}

/* Destructive — deep-red fill, parchment text, red border */
.quest-button--destructive {
  color: var(--color-on-danger);
  background: var(--color-danger-solid);
  border: var(--border-width-default) solid #b91c1c; /* brief's destructive border */
}
.quest-button--destructive:hover {
  background: #7f1d1d; /* brief's destructive hover fill */
}
```

The literal hex values above are the brief's component-only colours (`#DAA520`, `#B91C1C`,
`#7F1D1D`) that are not semantic roles. They are used for borders, destructive fills and the
accessible gold **text-on-tint** variant, where `--color-accent` would drop below AA on the elevated
surface. In a component package they belong to its component tokens; this theme-only repository
documents them as literals because no component layer is shipped here. All other properties use
semantic tokens.

Sizes (padding / font size / height / border width):

| Size | Padding     | Font                 | Height | Border |
| ---- | ----------- | -------------------- | ------ | ------ |
| sm   | `6px 14px`  | `13px` (`0.8125rem`) | 32px   | 1px    |
| md   | `8px 22px`  | `14px`               | 40px   | 1px    |
| lg   | `12px 30px` | `16px`               | 48px   | 1.5px  |

Buttons use Cinzel `--font-family-heading`; labels are `--font-weight-medium` or `--font-weight-strong`.
Disabled state: `opacity: 0.35`, `cursor: not-allowed`, no glow, and `border-color: #5C3D2E`
(`--color-border`).

### Cards

```css
.quest-card {
  background: var(--color-surface);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-surface);
  box-shadow: var(--shadow-md); /* BRIEF "DEFAULT" elevation: cards and panels */
  padding: var(--primitive-space-6); /* 24px */
}

.quest-card--elevated {
  background: var(--color-surface-elevated);
  border-color: var(--color-accent-border);
  box-shadow: var(--shadow-lg); /* BRIEF "md": elevated panels */
  transition: box-shadow var(--motion-duration-normal) var(--motion-easing-standard);
}
.quest-card--elevated:hover {
  box-shadow: var(--shadow-xl); /* BRIEF "lg": modal-like treasure UI */
}

/* Quest / item header accent */
.quest-card--header {
  border-top: 2px solid var(--color-accent);
}
```

### Inputs

```css
.quest-field-label {
  color: var(--color-fg);
  font-family: var(--font-family-heading);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--primitive-space-1); /* 6px in the brief; 4px is the nearest step */
}
.quest-field-help {
  color: var(--color-fg-muted);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-caption);
  margin-top: var(--primitive-space-1);
}
.quest-field-error {
  color: var(--color-danger);
  font-size: var(--font-size-caption);
  margin-top: var(--primitive-space-1);
}
.quest-input {
  height: 40px;
  padding: 8px 12px;
  color: var(--color-fg);
  background: var(--color-surface);
  border: var(--border-width-default) solid var(--color-border);
  border-radius: var(--radius-control);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-small);
}
.quest-input:hover {
  border-color: var(--color-accent);
}
.quest-input:focus-visible {
  border: var(--border-width-strong) solid var(--color-accent);
  box-shadow: 0 0 0 3px rgb(202 138 4 / 0.25);
  outline: none;
}
.quest-input[aria-invalid='true'] {
  border: var(--border-width-strong) solid var(--color-danger-solid);
  box-shadow: 0 0 0 3px rgb(153 27 27 / 0.25);
}
.quest-input:disabled {
  color: var(--color-fg-muted);
  background: var(--color-bg);
  border-color: var(--color-surface-elevated);
}
```

### Chips

```css
.quest-chip {
  padding: 4px 12px;
  border-radius: var(--radius-small);
  border: var(--border-width-default) solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-fg-muted);
  font-family: var(--font-family-heading);
  font-size: 0.6875rem; /* Cinzel 11px, per the brief */
  font-weight: var(--font-weight-body);
  letter-spacing: var(--font-letter-spacing-label);
  text-transform: uppercase;
}
.quest-chip--filter-active {
  background: var(--color-accent);
  border-color: transparent;
  color: var(--color-on-accent);
}
.quest-chip--success {
  background: var(--color-success-subtle);
  color: var(--color-success);
  border-color: transparent;
}
.quest-chip--warning {
  background: var(--color-warning-subtle);
  color: #daa520; /* bright gold text-on-tint: #CA8A04 is ~3.99:1 on this tint over elevated */
  border-color: transparent;
}
.quest-chip--error {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  border-color: transparent;
}
```

### Lists

```css
.quest-list {
  background: var(--color-surface);
  border-radius: var(--radius-surface);
}
.quest-list-row {
  min-height: 48px;
  padding: 8px 16px;
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-body);
  color: var(--color-fg);
}
.quest-list-row:hover {
  background: var(--color-surface-elevated);
}
.quest-list-row[aria-selected='true'] {
  background: rgb(202 138 4 / 0.05); /* #CA8A040D active tint */
}
.quest-list-row-description {
  color: var(--color-fg-muted);
  font-size: var(--font-size-small);
}
.quest-list-row-icon {
  width: 28px;
  margin-right: 12px;
}
```

### Checkboxes

```css
.quest-checkbox {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-small);
  border: 2px solid var(--color-border);
  background: var(--color-surface);
}
.quest-checkbox[aria-checked='true'],
.quest-checkbox[aria-checked='mixed'] {
  border: 0;
  background: var(--color-accent);
  color: var(--color-on-accent);
}
.quest-checkbox:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.quest-checkbox-label {
  margin-left: var(--primitive-space-2); /* 8px */
}
```

### Radio buttons

```css
.quest-radio {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-pill);
  border: 2px solid var(--color-border);
  background: var(--color-surface);
}
.quest-radio[aria-checked='true'] {
  border-color: var(--color-accent);
}
.quest-radio[aria-checked='true']::after {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
}
.quest-radio:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
```

### Tooltips

```css
.quest-tooltip {
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
`--motion-duration-normal`. The 6px arrow matches `--color-surface-elevated`.

### Component contrast (composited)

Tinted fills are translucent, so their text contrast depends on the surface underneath. The recipes
above are measured on every QuestUI surface — `--color-bg` (`#1A0F0A`), `--color-surface`
(`#2C1A10`) and `--color-surface-elevated` (`#3D2517`) — with the tint composited onto the surface.
The test suite asserts these ratios too.

| Recipe           | Text                      | Over `--color-bg` | Over `--color-surface` | Over `--color-surface-elevated` |
| ---------------- | ------------------------- | ----------------- | ---------------------- | ------------------------------- |
| Secondary button | `#DAA520` on accent tint  | 7.59:1            | 6.59:1                 | 5.61:1                          |
| Warning chip     | `#DAA520` on warning tint | 7.11:1            | 6.14:1                 | 5.24:1                          |
| Success chip     | `#22C55E` on success tint | 6.92:1            | 6.03:1                 | 5.16:1                          |
| Error chip       | `#F87171` on danger tint  | 6.43:1            | 5.69:1                 | 4.92:1                          |
| Info chip        | `#C084FC` on info tint    | 6.85:1            | 6.10:1                 | 5.30:1                          |

All values are ≥ 4.5:1. The opaque gold `#CA8A04` would only reach 4.28:1 on the secondary tint over
the elevated surface and 3.99:1 on the warning tint, which is why those two gold-on-tint recipes use
the brief's bright gold `#DAA520` as their text variant; `#CA8A04` remains the solid primary fill and
the page/interactive accent.

## Theme Activation

QuestUI declares `modes: ['dark']`, so `@ezhana/theme-builder` emits a **fixed-mode** stylesheet:
one rule carrying every override and `color-scheme: dark`, with a selector list that also covers both
attribute states at specificity 0,3,0 — `:not([data-color-mode])` when the attribute is absent and
`[data-color-mode]` when it is present. That keeps the theme ahead of the core mode/system rules
regardless of stylesheet order. No `data-color-mode` is required or consulted.

```html
<!-- QuestUI: always the QuestUI dark palette -->
<html data-theme="quest"></html>
```

In a multi-theme app, register it with the other themes and pass the per-theme mode map to the
runtime. `@ezhana/theme` clamps a light preference or a light OS preference to QuestUI's supported
`dark` mode, so the switcher can stay visible without producing a broken light QuestUI:

```ts
import { defaultThemeDefinition, type Mode } from '@ezhana/design-tokens'
import { theme as cerulean } from '@ezhana/design-theme-cerulean'
import { theme as ocean } from '@ezhana/design-theme-ocean'
import { theme as quest } from '@ezhana/design-theme-quest'
import { createThemeManager, defineThemeRegistry } from '@ezhana/theme'

export const registry = defineThemeRegistry([defaultThemeDefinition, ocean, cerulean, quest])
export type AppTheme = (typeof registry.themes)[number]

export const manager = createThemeManager<AppTheme, Mode>({
  themes: [...registry.themes],
  modes: [...registry.modes],
  themeModes: registry.themeModes, // quest → ['dark']
  defaultTheme: registry.defaultTheme,
})

manager.setTheme('quest')
manager.getState().resolvedMode // 'dark', even when the OS prefers light
```

`data-color-mode` is written only for explicit preferences and always holds a mode the active theme
supports; in `system` mode the attribute is removed and the fixed-mode theme stylesheet applies
unconditionally. The switcher UI can read `registry.themeModes` to disable unsupported mode options.

Loading the theme itself: `import '@ezhana/design-theme-quest/style'` (core stylesheet + Cinzel /
Spectral / Fira Code + overrides), or the split `@ezhana/design-tokens/css/tokens.css` +
`@ezhana/design-theme-quest/theme.css` entries.

## Implementation Notes

| Concern                                                                 | Location                                                              |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Theme identity, label, description, single supported mode, font entries | [`theme.config.mjs`](../theme.config.mjs)                             |
| QuestUI palette (gold, parchment, crimson, royal, browns, green)        | [`tokens/palette.json`](../tokens/palette.json) (`theme.color.quest`) |
| Semantic overrides (type scale, shape, warm palette, status, elevation) | [`tokens/theme.json`](../tokens/theme.json) (`base`, `dark`)          |
| Generated CSS overrides (fixed-mode selector) and standalone bundle     | `dist/css/theme.css`, `dist/css/standalone.css`                       |
| Generated bundler entry (core CSS + 8 font imports + overrides)         | `dist/style.js`                                                       |
| Generated metadata (`themeId`, `themeLabel`, `theme.modes = ['dark']`)  | `dist/js/index.js`, `dist/js/index.d.ts`                              |
| Resolved values for the supported mode (used by tests and tooling)      | `dist/json/theme.json`                                                |
| Generation + validation                                                 | `pnpm --filter @ezhana/design-theme-quest build`                      |
| Tests (selectors, contract, no leaked variables, WCAG AA)               | `pnpm --filter @ezhana/design-theme-quest test`                       |

Underlying capabilities added for this package (changed at the source, not patched around):

- **`@ezhana/design-tokens`** — semantic layers, status tints, info/solid-danger roles, full
  type/line-height scale, label tracking, modal/panel radii and two more elevation levels, with
  default values and contract contrast pairs for every color mode.
- **`@ezhana/theme-builder`** — `modes` in the theme config and fixed-mode CSS emission, so a theme
  may support a subset of the contract's color modes (here: dark only).
- **`@ezhana/theme`** — per-theme mode metadata (`themeModes`) and `resolvedMode` clamping, so a
  dark-only theme can be registered next to light+dark themes.

Adding QuestUI required **no application-specific theming code** beyond registering it in the app's
theme registry: the package ships its palette, overrides, metadata, fonts and bundler entry.

### Theme override contract satisfied by `quest`

| Semantic token                             | Value                    |
| ------------------------------------------ | ------------------------ |
| `color.accent`                             | `#CA8A04`                |
| `color.accent-hover`                       | `#B8780A`                |
| `color.on-accent`                          | `#1A0F0A`                |
| `color.accent-subtle`                      | `#CA8A0415`              |
| `color.accent-border`                      | `#CA8A0440`              |
| `color.focus-ring`                         | `#CA8A04`                |
| `font.family.sans` / `font.family.heading` | Spectral / Cinzel stacks |
| `radius.control`                           | `4px`                    |

Only this set is required. QuestUI additionally overrides the typography scale, shape scale, warm
surfaces/borders/text, the remaining status colours and the elevation scale — all existing semantic
tokens, no new names.

## Deviations from the Reference Brief (intentional)

1. **Dark-only.** The brief defines a single warm palette and no light surface scheme. Rather than
   inventing an unrelated light palette, QuestUI ships one fixed dark mode and the underlying
   builder/runtime gained first-class support for mode-subset themes.
2. **Danger and info are split into text and solid roles.** `#991B1B` and `#581C87` are preserved as
   the brief's fills (`danger-solid`, `info-solid`), while accessible text variants `#F87171` and
   `#C084FC` fill the semantic text roles. The alternative — using the brief's fills as text — would
   fail WCAG AA on the dark page.
3. **New semantic tokens instead of component tokens.** Surfaces, status tints and the full type
   scale were added to `@ezhana/design-tokens` because a theme may not invent token names. They are
   general roles usable by every theme, not QuestUI-private patches; the palette itself stays
   private to this package.
4. **Text is parchment, never white.** `#F5E6D3` is the default and strong text colour, matching the
   brief's rule and still reaching 15.35:1.
5. **Fonts are self-hosted through Fontsource** instead of a third-party CDN, so the template works
   offline and avoids a font-loading dependency.
6. **Component specifications are documented as tokenized recipes.** This repository's scope is
   tokens and themes; a component package can implement the recipes verbatim because they consume
   only semantic tokens (plus the brief's raw private colours where the brief names a literal).

## Usage Guidelines

**Do**

- Do use Cinzel for all headings and UI labels; Spectral for body copy and form prose; Fira Code for
  stats and numeric readouts.
- Do use `--color-accent` for primary actions and selection state, and reserve `--shadow-glow` for
  the active/selected item.
- Do build depth from the brown layer stack (`--color-bg` → `--color-surface` →
  `--color-surface-elevated`) instead of shadows or pure black.
- Do add the 2px gold top border (`--color-accent`) to quest and item headers.
- Do use royal purple (`--color-info` / `--color-info-solid`) sparingly, for legendary, rare or
  magical moments.
- Do keep chips and small labels uppercase and tracked with `--font-letter-spacing-label`.

**Don't**

- Don't introduce sans-serif fonts or a bright-white text colour; the serif stack and parchment are
  the theme.
- Don't use modern flat surfaces without borders; edges, borders and glows carry the craft.
- Don't animate layout or bounce; fade colour and glow over `--motion-duration-normal` (300ms).
- Don't use `#991B1B` / `#581C87` as body text; use the accessible `danger` / `info` roles or their
  solid fills.
- Don't consume `theme.color.quest.*` from product code — it is build-time material and is never
  emitted as a CSS custom property.
- Don't mix QuestUI radii with pill controls inside one control group; roundedness is a system
  decision.
