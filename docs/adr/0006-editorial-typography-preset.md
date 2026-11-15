# ADR 0006: Editorial typography as a scoped CSS preset

- **Status:** Accepted
- **Date:** 2026-11-13
- **Scope:** new `@ezhana/typography-editorial`, consumer docs, the Astro consumer verification
  fixture
- **Related:** [ADR 0005](0005-css-first-theme-presets.md) (CSS-first presets and semantic tokens)

## Context

The design system already ships tokens and themes, but it has no presentation layer for rendered
long-form content. A blog, notes app or documentation page that consumes Ezhana still has to write
its own heading scale, paragraph rhythm, list markers, blockquote, code, table and figure styles.
That work is repetitive and usually ends up as a global `body`/`h1`/`p` stylesheet, which is exactly
the kind of CSS a design system should centralize.

The reference for this layer is the Astro Blog Starter stylesheet, itself based on Bear Blog's
default CSS. It has a clear, restrained editorial direction: a `20px`/`1.7` body, a `1.25` modular
heading scale with `1.2` leading, generous prose spacing, simple lists, accent blockquotes, subtle
code surfaces, full-width tables and fluid images with `8px` radii. It is a visual reference, not a
design system contract: its colors, font loading, global selectors and `all: unset` code reset are
not acceptable in Ezhana.

The design question is therefore not "how do we copy the reference?" but "what is the smallest
public surface that applies this presentation to content without taking over the page?"

## Decision

### 1. One opt-in HTML scope

Every rule is scoped to `.ez-editorial`:

```html
<article class="ez-editorial">…</article>
```

The preset never styles `body`, `main`, `html`, `:root` or bare elements, and it never requires a
`.prose` class. Page layout, the reading measure and the page background remain the application's
responsibility.

### 2. CSS only, one canonical entry

The package publishes exactly one stylesheet entry:

```css
@import '@ezhana/typography-editorial/style.css';
```

There is no JavaScript entry, no framework adapter, no CSS-in-JS, no Tailwind dependency, no reset
and no font loading. `style.css` is both the source and the published artifact; a copy-to-`dist`
build step would add a failure mode without changing the output. The array of supported elements is
deliberately narrow: headings, paragraphs and emphasis, links and focus, lists, blockquotes, inline
code and generic code-block containers, tables, images/figures, rules and responsive sizing.

### 3. Semantic tokens only

The preset declares no palette and no typography tokens. It reads the semantic variables emitted by
`@ezhana/design-tokens` and overridden by the active theme:

- text/headings/captions: `--color-fg`, `--color-fg-strong`, `--color-fg-muted`;
- links, blockquote rule and focus: `--color-accent`, `--color-accent-hover`,
  `--color-focus-ring`;
- code surfaces: `--color-bg-subtle`;
- rules: `--color-border`;
- type roles: `--font-family-sans`, `--font-family-heading`, `--font-family-mono`,
  `--font-weight-body`, `--font-weight-bold`, `--font-line-height-caption`;
- focus width: `--border-width-strong`.

No new core token is introduced. A missing role is not papered over with a hard-coded color; the
declarations use safe fallbacks (`inherit`, `currentColor`, `transparent`) so the preset degrades
without embedding a second brand palette.

### 4. Six package-scoped settings

Editorial tuning is intentionally small and local:

```text
--ez-editorial-font-size
--ez-editorial-line-height
--ez-editorial-heading-scale
--ez-editorial-heading-line-height
--ez-editorial-paragraph-spacing
--ez-editorial-block-spacing
```

These are preset settings, not design tokens. The `1.25` heading scale is expressed with
multiplication in `calc()`, so changing one number rescales `h1`–`h5` while `h6` remains the body
size.

### 5. Unlayered on purpose

The stylesheet is not emitted into `@layer design-tokens` or a package-specific layer. A reset such
as Tailwind Preflight must not win over the list markers, margins and heading sizes this preset
restores. Layered author styles lose to unlayered author styles regardless of order, while the
`.ez-editorial` scope prevents the unlayered rules from leaking. Application CSS can still override
the preset through the six settings, higher specificity or later source order.

### 6. Highlighter-safe code blocks

`pre` and `code` are generic containers. The preset does not use `all: unset`, style `pre > *`,
assume `.astro-code`/`.shiki`/`.token`, or declare `--shiki-*`. Syntax highlighters keep ownership
of their token colors and line wrappers.

### 7. Verify as a real packed consumer

The package has a contract test suite for scope, token names, scale, coverage, Preflight resilience,
highlighter safety and accessibility. The existing `pnpm test:consumer` harness also packs the
tarball, installs it into the Astro fixture alongside the Cerulean theme, imports both stylesheets
and verifies the built CSS contains the scope, settings and responsive breakpoint.

## Consequences

### Positive

- Content typography becomes a shared, tested preset instead of per-app global CSS.
- The preset follows every theme and color mode automatically because it consumes semantic tokens.
- The public API is one import, one class and six variables; there is no runtime or adapter to
  maintain.
- Restoring list markers and rhythm survives Tailwind Preflight and other layered resets.
- Syntax highlighting stays an optional consumer concern.

### Negative / trade-offs

- The preset assumes a theme or the core stylesheet is loaded; without semantic variables it falls
  back to inherited text and transparent surfaces rather than a designed palette.
- The unlayered choice means application CSS must use the documented settings or appropriate
  specificity to win; it is intentionally not isolated behind a layer.
- Tables cannot get both a full-width table layout and true scroll wrapping without a DOM wrapper.
  The preset keeps full width at normal widths, wraps long cell content, and switches to a scroll
  container at `720px` and below.
- A heading-only change still requires a package release; the six settings cover common editorial
  tuning but not every possible style.

### Neutral

- The reference values are expressed independently; no reference source is copied.
- The package is versioned and published like the other `@ezhana/*` presets, but has no runtime
  dependency on `@ezhana/design-tokens`. The core package is a devDependency for the contract test
  only; the token names are a runtime CSS contract.
- The preset is optional. It is not injected into generated apps and does not change the theme
  packages.

## Amendment: fluid heading ladder and component escape hatch (2026-11-15)

Three seams surfaced once the preset was used on real article pages.

1. The unitless `--ez-editorial-heading-scale` cannot express a fluid heading size. Putting a
   length-valued `clamp()` into `calc(1em * …)` squares the length, so the documented single scale
   could only produce fixed-step sizes.
2. Only the body changed at `720px`; heading ratios stayed fixed. That contradicts
   [DESIGN.md §9](../packages/typography-editorial/docs/DESIGN.md#9-responsive-behavior), which
   requires readable heading proportions on small screens, and it is the root cause of the
   oversized top of the ladder on narrow viewports.
3. Element rules reached into any component rendered inside the article. A reusable component with
   its own `<h2>` was restyled as an article section, which is appropriate on one page and wrong as
   a general contract.

### 1. Headings use a per-level fluid `clamp()`

Each of `h1`–`h5` now clamps between two unitless modular ladders:

```css
font-size: clamp(calc(1em * compact^n), calc(1em * compact^n + viewport-term), calc(1em * full^n));
```

The viewport term is _added_, never multiplied, so a fluid heading never produces a length squared.
`--ez-editorial-heading-scale` remains the full ratio (`1.25`) and the new
`--ez-editorial-heading-scale-compact` (`1.15`) is the compact ratio. `h6` stays at the body size.
The reference table still describes the wide-viewport ceiling.

### 2. The heading ladder does not ride the body breakpoint

The interpolation is continuous, so headings no longer wait for the body's `720px` step. The compact
ratio is the heading ladder's own narrow-viewport parameter. Titles remain proportional to body
text (`em` bounds) and to user font scaling; the compact setting keeps the hierarchy readable when
the viewport is narrow.

### 3. `.not-prose` opts a subtree out of every element rule

Every element selector carries a zero-specificity guard:

```css
.ez-editorial h2:where(:not(.not-prose):not(.not-prose *)) {
  …;
}
```

The guard excludes both the marked element and its descendants, and `:where()` keeps specificity at
the original value, so application CSS that overrode the preset before still does. The class follows
the familiar Tailwind Typography spelling. The escape hatch removes editorial presentation only:
the subtree keeps inheriting ambient font, size, color and leading, and the component owns its
typography from there.

### Consequences of the amendment

- The public customization surface grows from six to seven settings: the full and compact heading
  ratios are tuned together, and the compact ratio should not exceed the full one.
- Heading sizes on small screens intentionally differ from the reference table's fixed ratios; that
  is the fix for the readability requirement, not a regression.
- The package contract test now asserts the clamp structure (floor, added viewport term, ceiling),
  the absence of `calc(1em * clamp(…))`, continuous heading sizing outside media queries, and the
  escape hatch on every element selector.
- Components integrate through one class and no wrapper element is generated by the preset.
