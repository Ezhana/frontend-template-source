# @ezhana/typography-editorial

CSS-only editorial typography for rendered long-form content: articles, essays, notes and
documentation-style prose. One stylesheet, one scope class, no JavaScript, no reset, no Tailwind and
no framework integration.

```html
<article class="ez-editorial">
  <!-- rendered Markdown or article content -->
</article>
```

The preset owns the typographic presentation of the content inside `.ez-editorial`: the reading
scale, paragraph and block rhythm, heading hierarchy, lists, links and focus indication,
blockquotes, inline code and code-block containers, tables, images/figures and horizontal rules. It
does not own page layout, the reading column, the palette, fonts, theme switching, Markdown parsing,
syntax highlighting, UI components or JavaScript behavior.

The authoritative design specification is [`docs/DESIGN.md`](./docs/DESIGN.md).

## Installation

```sh
pnpm add @ezhana/typography-editorial
```

The package has no runtime dependencies and publishes one canonical stylesheet entry.

```css
@import '@ezhana/typography-editorial/style.css';
```

### Theme prerequisite

The preset contains no brand palette and no font files. It reads the active Ezhana theme's semantic
custom properties, so load a theme (or the core stylesheet) in the same document, before or after
the typography import — the token values are inherited and do not depend on order.

```sh
pnpm add @ezhana/design-theme-cerulean
```

```css
/* src/styles/global.css */
@import '@ezhana/design-theme-cerulean/style.css';
@import '@ezhana/typography-editorial/style.css';
```

If no semantic variables are present, the preset falls back to inherited text color and font, a
transparent code surface and a `currentColor` border. It never embeds a second palette.

## Usage

```html
<article class="ez-editorial">
  <h1>An editorial article</h1>
  <p>
    Body copy uses the theme's body font at a comfortable reading size with generous leading.
    <a href="#notes">Links</a> use the theme accent and keep an underline.
  </p>

  <blockquote>
    <p>Quotes use the accent border and a larger type size.</p>
  </blockquote>

  <pre><code>const example = 'code blocks are generic containers'</code></pre>

  <figure>
    <img src="/article/image.jpg" alt="A descriptive alternative" />
    <figcaption>Captions are quieter than body text.</figcaption>
  </figure>
</article>
```

The consuming application owns the reading column. A typical blog layout is:

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

That layout is guidance for the application; it is not part of this package.

## What it styles

| Content            | Behavior                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Body text          | `1.25rem` / `1.7` on desktop, `1.125rem` at `720px` and below; start-aligned (left in LTR), never justified |
| Headings `h1`–`h6` | A `1.25` modular scale with `1.2` leading, strong foreground and a compact `0.5rem` bottom margin           |
| Paragraphs         | A deliberate `1.5em` bottom rhythm (the reference's prose variant uses `2em`)                               |
| Emphasis           | `strong`/`b` use the theme's bold weight                                                                    |
| Links              | Theme accent with an underline; hover uses `--color-accent-hover`; keyboard focus draws a ring              |
| Lists              | Visible `disc`/`decimal` markers, `1.5em` indentation, nested lists and modest item separation              |
| Blockquotes        | A `4px` accent inline-start rule, `1.25rem` padding and `1.333em` text; no background or shadow             |
| Inline code        | Subtle `--color-bg-subtle` surface, `2px` radius, monospace role                                            |
| Code blocks        | Generic `pre` container with `1.5em` padding, `8px` radius and horizontal overflow                          |
| Tables             | Full width, simple row rules, strong header text; long cell content wraps and narrow viewports scroll       |
| Images and figures | Fluid images (`max-width: 100%`, automatic height, `8px` radius) with muted captions                        |
| Horizontal rules   | A `1px` semantic border with generous, restrained vertical spacing                                          |

## Customization

The preset exposes six package-scoped CSS custom properties. They are preset settings, not global
design tokens, and can be overridden on `.ez-editorial` after the import.

| Property                             | Default                       | Purpose                                       |
| ------------------------------------ | ----------------------------- | --------------------------------------------- |
| `--ez-editorial-font-size`           | `1.25rem` (`1.125rem` ≤720px) | Body reading size                             |
| `--ez-editorial-line-height`         | `1.7`                         | Body leading                                  |
| `--ez-editorial-heading-scale`       | `1.25`                        | Modular scale used by `h1`–`h5`               |
| `--ez-editorial-heading-line-height` | `1.2`                         | Heading leading                               |
| `--ez-editorial-paragraph-spacing`   | `1.5em`                       | Space below paragraphs                        |
| `--ez-editorial-block-spacing`       | `2em`                         | Space below lists, quotes, code, tables, etc. |

```css
.ez-editorial {
  --ez-editorial-font-size: 1.125rem;
  --ez-editorial-paragraph-spacing: 2em; /* the reference prose rhythm */
  --ez-editorial-heading-scale: 1.2;
}
```

`--ez-editorial-heading-scale` multiplies the body size five times for `h1`, four for `h2`, down to
once for `h5`; `h6` stays at the body size. Changing it rescales the whole hierarchy consistently.

## Theme integration

Colors and type roles are mapped to the semantic variables actually emitted by
`@ezhana/design-tokens` and every official theme package. No variable name is guessed, and the
preset declares none of them itself.

| Editorial role           | Semantic token                                                      |
| ------------------------ | ------------------------------------------------------------------- |
| Body text                | `--color-fg`, weight `--font-weight-body`                           |
| Headings                 | `--color-fg-strong`                                                 |
| Captions and muted text  | `--color-fg-muted`                                                  |
| Links                    | `--color-accent`, hover `--color-accent-hover`                      |
| Blockquote rule          | `--color-accent`                                                    |
| Inline code/code surface | `--color-bg-subtle`, text `--color-fg-strong`                       |
| Table rules and `hr`     | `--color-border`, hairline `--border-width-default`                 |
| Keyboard focus           | `--color-focus-ring`, width `--border-width-strong`                 |
| Body/heading/mono fonts  | `--font-family-sans`, `--font-family-heading`, `--font-family-mono` |
| Bold emphasis            | `--font-weight-bold`                                                |
| Caption leading          | `--font-line-height-caption`                                        |

Because every value is read at use time, the preset follows the active theme and color mode with no
theme switching of its own. Cerulean, Ocean, Onyx, Quest and Obsidian all work without a package
change. Dark-only themes apply their single palette; the preset adds no light/dark rules.

## Tailwind and resets

The stylesheet is deliberately **unlayered**. A reset inside a cascade layer — Tailwind Preflight,
for example — must not win over the list markers, margins and heading sizes this preset restores.
Because every selector is scoped to `.ez-editorial`, that choice cannot leak into the rest of the
page.

The preset does not import or depend on Tailwind and does not ship a reset. It works with or without
Preflight, and with the application's own CSS after it if that CSS needs to win.

## Code blocks and syntax highlighting

The `pre` and `code` rules are generic containers: padding, radius, subtle surface, monospace role
and horizontal overflow. The preset:

- supports plain `<pre><code>` renderers;
- does not use `all: unset`, and only resets the inline-code decoration for `pre code` itself;
- does not style line wrappers or token elements, so Shiki, Prism, Highlight.js and Expressive Code
  can layer their own colors and classes;
- does not set `.astro-code`, `.shiki`, `.token` or `--shiki-*`;
- does not ship a syntax palette.

## Accessibility

- Links keep an underline in addition to color; keyboard focus uses a visible `:focus-visible`
  outline from the theme's focus token.
- List markers are restored, never suppressed without an accessible alternative.
- Body sizes use `rem` and `em`, so browser zoom and user font scaling are respected.
- Body text is start-aligned, not justified, with no global letter-spacing changes.
- Blockquote rules and list indentation use logical properties, so they follow the writing direction.
- Images are never cropped with `object-fit: cover`.
- Contrast comes from the active theme. The preset uses only semantic text/surface pairs the core
  contract keeps at WCAG AA (`fg` on `bg`, `fg-muted` on `bg`, `fg-strong` on `bg-subtle`, accent on
  `bg`).

Scope is opt-in: the preset never styles `body`, `main`, `h1` or any element outside `.ez-editorial`.

## Development

```sh
pnpm --filter @ezhana/typography-editorial test
```

The test suite checks the single-entry package contract, selector scoping, token-name validity
against the generated `@ezhana/design-tokens` contract, the `1.25` scale and reading rhythm,
element coverage, Preflight resilience, syntax-highlighter safety and the absence of hard-coded
colors, layout ownership or theme switching.

`style.css` is the source and the published artifact. There is no build step, JavaScript entry or
generated CSS.

## Acknowledgements

The design follows the specification in [`docs/DESIGN.md`](./docs/DESIGN.md), which derives its
visual direction from the Astro Blog Starter stylesheet. That stylesheet identifies itself as based
on Bear Blog's default CSS, both distributed under the MIT License. This package's CSS is
independently written against the specification; no reference source is copied.

## License

MIT
