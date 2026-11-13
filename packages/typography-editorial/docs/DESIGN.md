# Ezhana Typography Editorial — Design Specification

## 1. Purpose

`@ezhana/typography-editorial` is a CSS-only editorial typography preset for long-form content: blog posts, articles, essays, notes, and documentation-like prose.

Its visual direction is **minimal editorial typography**. The content is the primary visual element. Hierarchy comes from readable type sizes, deliberate line-height, restrained spacing, and a narrow reading measure rather than cards, shadows, decorative borders, or complex layouts.

This specification is derived from the Astro Blog Starter stylesheet supplied for this project. That stylesheet identifies itself as based on Bear Blog's default CSS. It is not a universal or normative Astro design system.

Reference:

- Bear Blog default stylesheet: <https://github.com/HermanMartinus/bearblog/blob/297026a877bc2ab2b3bdfbd6b9f7961c350917dd/templates/styles/blog/default.css>
- The reference stylesheet is distributed under the MIT License. If implementation reuses or adapts its source code rather than independently expressing the design, retain the required copyright and license notices.

## 2. Design principles

1. **Content first** — typography and reading rhythm take priority over decoration.
2. **Restrained hierarchy** — use size, weight, and spacing; avoid excessive color and ornament.
3. **Comfortable measure** — constrain long-form text to a readable line length.
4. **Generous body leading** — body text should feel calm and easy to scan.
5. **Compact headings** — headings use tighter line-height than paragraphs.
6. **Semantic color** — foreground, accent, surface, border, and muted colors come from the active Ezhana theme.
7. **Theme independence** — the editorial preset must work with Cerulean and other compatible Ezhana themes without embedding a brand palette.
8. **Framework independence** — the stylesheet must not depend on Astro, Tailwind, React, Vue, or a particular Markdown renderer.
9. **Opt-in scope** — typography styles apply only inside an explicit editorial content root, not globally to `body`, `main`, or every HTML element.
10. **No runtime** — the package ships CSS only; it does not need JavaScript, DOM initialization, or a theme manager.

## 3. Scope and responsibility

### Included

The preset defines the typographic presentation of rendered long-form content:

- body text within the editorial root
- heading hierarchy (`h1`–`h6`)
- paragraphs and emphasis
- links and focus indication
- unordered and ordered lists
- blockquotes
- inline code and code blocks
- tables
- images and figures
- horizontal rules
- responsive type sizing and spacing

### Excluded

The preset does not define:

- global page background or global body styles
- site header, footer, navigation, sidebar, or page grid
- article page layout or metadata placement
- the site-wide reading container width
- brand colors or a theme palette
- font files or font loading
- syntax highlighting engines or syntax token palettes
- UI components such as buttons, cards, forms, or navigation
- theme switching, persistence, or JavaScript behavior
- Tailwind utility classes

The consuming application owns page layout. A blog may use a reading column around `720px` / `45rem`, but that width is a layout recommendation, not a responsibility of this typography package.

## 4. Content root and public CSS scope

All rules must be scoped to one documented root class:

```html
<article class="ez-editorial">
  <!-- rendered Markdown or article content -->
</article>
```

Use `.ez-editorial` as the public scope unless repository conventions require a different globally unique Ezhana prefix. Do not style unscoped `body`, `main`, `h1`, `p`, `pre`, or other global selectors.

The preset must not require a `.prose` class, which is commonly associated with Tailwind Typography and other libraries.

## 5. Layout guidance (consumer responsibility)

The reference layout uses a centered, single-column reading area approximately `720px` wide, with horizontal safety padding and generous vertical space.

Recommended consumer layout:

```css
.article-layout {
  width: min(45rem, calc(100% - 2rem));
  margin-inline: auto;
  padding-block: 3rem;
}

@media (max-width: 720px) {
  .article-layout {
    padding-block: 1.5rem;
  }
}
```

This is guidance for the blog's page layout. Do not include `.article-layout` or the `main` width rule in `@ezhana/typography-editorial`.

## 6. Typography system

The reference stylesheet uses a body size of `20px` on larger screens and `18px` at viewport widths up to `720px`. Body line-height is `1.7`.

Headings use a compact line-height of `1.2`. Their sizes follow an approximately `1.25` modular scale:

| Element | Reference scale | At 20px body size | At 18px body size |
| ------- | --------------: | ----------------: | ----------------: |
| `h1`    |       `3.052em` |         `61.04px` |         `54.94px` |
| `h2`    |       `2.441em` |         `48.82px` |         `43.94px` |
| `h3`    |       `1.953em` |         `39.06px` |         `35.15px` |
| `h4`    |       `1.563em` |         `31.26px` |         `28.13px` |
| `h5`    |        `1.25em` |            `25px` |          `22.5px` |
| `h6`    |           `1em` |            `20px` |            `18px` |

The values above describe the supplied reference stylesheet. Preserve their visual relationship. The implementation may express the scale with CSS custom properties, `em`, `rem`, or `clamp()` provided the result remains faithful and responsive.

### Font family

The reference uses an Atkinson font custom property. The Ezhana preset must not bundle or force Atkinson. It should use the existing Ezhana semantic font-family token when one exists in the actual published token API. If the current token package has no matching public token, use an inherited font stack rather than inventing a global token or shipping a font.

Monospace content should use the existing Ezhana monospace font token if available; otherwise inherit a conventional monospace stack.

### Heading treatment

- Headings use a strong but not excessively heavy weight.
- Heading line-height is approximately `1.2`.
- The reference uses a bottom margin of `0.5rem` and no explicit top margin.
- Preserve a clear descending hierarchy from `h1` to `h6`.
- Do not add decorative heading bars, counters, gradients, or accent backgrounds.

### Paragraph rhythm

- Default paragraph bottom margin: approximately `1em`.
- The reference applies `2em` paragraph spacing in a `.prose` context.
- In this package, the editorial root itself is the long-form prose context. Use a deliberate, consistent paragraph rhythm inspired by the `2em` variant, while avoiding excessive gaps in dense technical writing. If a modifier is introduced, keep the default close to the reference and document the modifier clearly.

## 7. Semantic element specifications

### Body text and emphasis

- Left-aligned text.
- Body line-height around `1.7`.
- Bold emphasis uses a weight around `700`, provided the selected font supports it.
- Avoid justified text.
- Avoid globally increasing letter spacing.

### Links

- Use the active theme's semantic accent color.
- Hover should preserve a clear accent treatment; it need not introduce a second brand color.
- Provide a visible `:focus-visible` indicator using an existing semantic focus token when available.
- Do not hard-code the Bear Blog blue values.

### Lists

The reference CSS does not define list styling. The package must nevertheless provide predictable Markdown list rendering, including when Tailwind Preflight removes browser list markers and margins.

Use restrained, conventional list presentation:

- restore visible markers for `ul` and `ol`
- use sensible inline-start indentation
- preserve nested list hierarchy
- provide modest separation between list items
- avoid custom icons, pills, or decorative list cards

Any values introduced for lists should be treated as package-level editorial defaults, not new global Design Tokens.

### Blockquotes

The reference uses:

- a left border around `4px`
- left padding around `20px`
- a larger text size around `1.333em`
- no decorative background

Use the active theme's semantic accent-border or accent token for the border and a semantic foreground/muted token for text. Do not use the Bear Blog palette.

### Inline code

The reference uses:

- horizontal and vertical padding equivalent to `2px 5px`
- a subtle surface background
- a small corner radius around `2px`

Use the active theme's semantic subtle-surface and foreground tokens. Use the monospace font role. Keep inline-code styling distinct from code-block styling.

### Code blocks

The reference uses approximately:

- `1.5em` padding
- `8px` corner radius
- horizontal overflow when necessary

The preset must style the code-block container without implementing syntax highlighting.

Requirements:

- support plain `<pre><code>` output
- avoid resetting every descendant with `all: unset`
- do not hard-code syntax token colors
- do not import Shiki, Prism, Highlight.js, or Expressive Code
- do not assume Shiki's `.astro-code` class exists
- do not override a syntax highlighter's token colors or its light/dark CSS variables
- allow the consumer to layer a highlighter-specific integration separately

If a renderer emits nested wrappers or line elements, the generic code-block styles must not break them.

### Tables

The reference sets tables to full width and otherwise keeps them visually simple.

Use a restrained table treatment:

- full available width
- readable cell alignment and padding
- semantic border color for subtle separation where needed
- no heavy outer frame, alternating saturated fills, or decorative card treatment
- preserve horizontal scrolling on narrow screens through an appropriate wrapper or safe overflow behavior

Do not add a global table layout rule outside the editorial root.

### Images and figures

The reference uses responsive images with:

- `max-width: 100%`
- automatic height
- corner radius around `8px`

Images must not overflow the editorial content root. Do not apply `object-fit: cover` globally because that can crop article imagery. Captions should be visually quieter than body text and use an existing muted semantic token if available.

### Horizontal rules

Use a simple `1px` separator with the active theme's semantic border color. Keep surrounding vertical spacing generous but restrained.

## 8. Color and theme integration

The original Bear Blog color values are reference-only and must not be copied into the Ezhana package.

All color decisions must use the actual semantic CSS variables exported by the current Ezhana token/theme packages. Before implementation, inspect the current published package exports and CSS output to discover the exact variable names.

Map semantic roles, not guessed names:

| Editorial role         | Required semantic meaning |
| ---------------------- | ------------------------- |
| Main text              | Default foreground        |
| Heading text           | Strong foreground         |
| Muted text / captions  | Muted foreground          |
| Link                   | Accent foreground         |
| Blockquote rule        | Accent border or accent   |
| Inline code background | Subtle surface            |
| Code block surface     | Subtle or raised surface  |
| Table separators / HR  | Border                    |
| Keyboard focus         | Focus ring                |

Do not assume names such as `--color-fg-strong`, `--color-accent-hover`, or `--radius-small` exist. Use only names verified from the actual package. If a semantic role is missing, document the gap and choose a safe fallback that does not introduce a second brand palette. Do not silently add component-specific tokens to Core.

The package must not implement its own light/dark switching. It should automatically follow whichever semantic values the active Ezhana theme exposes.

## 9. Responsive behavior

The reference changes body text from `20px` to `18px` at `720px` and reduces the main layout's vertical padding on smaller screens.

For the typography package:

- keep the body-size transition at approximately `720px`, unless a fluid implementation better preserves the same visual result
- maintain readable heading proportions on small screens
- prevent long code lines and tables from forcing the page wider
- keep images fluid
- avoid introducing separate mobile-only visual language

The package must not set page or viewport widths; the consumer owns the reading container.

## 10. Accessibility and rendering resilience

- Preserve semantic HTML; style elements rather than replacing them.
- Do not remove list markers without restoring an accessible visual marker.
- Ensure links and focus states remain distinguishable.
- Maintain sufficient text contrast through the active theme's semantic tokens.
- Do not rely on color alone to convey meaning.
- Do not use `all: unset` on code elements or Markdown descendants.
- Avoid selectors that assume a specific Markdown renderer's DOM structure unless isolated in an optional integration.
- Respect user font scaling and browser zoom.

## 11. Customization contract

Expose a small, documented set of package-scoped CSS custom properties only where they provide meaningful editorial customization, for example body size, line-height, heading scale, and content rhythm.

Use an Ezhana-specific prefix for these local properties. They are typography preset settings, not global Design Tokens.

Do not expose every margin, border, or font property as a public variable. Keep the customization surface small and stable.

## 12. Acceptance criteria

The implementation is faithful to this design when:

1. A plain Markdown article is calm, readable, and content-focused.
2. The type hierarchy follows the reference's approximately 1.25 scale.
3. Body line-height is spacious and headings remain compact.
4. The design works on desktop and mobile without changing its visual identity.
5. Links, quotes, inline code, code blocks, tables, images, and lists are styled consistently.
6. Colors follow the active Ezhana theme without hard-coded brand colors.
7. It works with and without Tailwind Preflight.
8. It does not require Astro or any JavaScript runtime.
9. It does not interfere with Shiki or another syntax highlighter.
10. All styles are opt-in through the editorial root class.
