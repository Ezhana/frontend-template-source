import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const stylesheetPath = join(packageRoot, 'style.css')
const readmePath = join(packageRoot, 'README.md')

const css = await readFile(stylesheetPath, 'utf8')
const readme = await readFile(readmePath, 'utf8')
const contract = JSON.parse(
  await readFile(new URL(import.meta.resolve('@ezhana/design-tokens/contract.json')), 'utf8'),
)

/* -------------------------------------------------------------------------- */
/* CSS parsing helpers                                                        */
/* -------------------------------------------------------------------------- */

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '')

const matchingBrace = (source, open) => {
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    else if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  throw new Error('Unbalanced braces in style.css')
}

/** Parse flat rules, keeping the enclosing at-rule preludes (media/supports) on each rule. */
const parseRules = (source) => {
  const rules = []

  const walk = (text, atRules) => {
    let index = 0
    while (index < text.length) {
      const open = text.indexOf('{', index)
      if (open === -1) break
      const prelude = text.slice(index, open).trim()
      const close = matchingBrace(text, open)
      const body = text.slice(open + 1, close)

      if (prelude.startsWith('@')) {
        walk(body, [...atRules, prelude])
      } else if (prelude.length > 0) {
        rules.push({
          selector: prelude,
          selectors: prelude.split(',').map((selector) => selector.trim()),
          declarations: parseDeclarations(body),
          atRules,
        })
      }
      index = close + 1
    }
  }

  walk(stripComments(source), [])
  return rules
}

function parseDeclarations(body) {
  const declarations = new Map()
  for (const part of body.split(';')) {
    const colon = part.indexOf(':')
    if (colon === -1) continue
    const name = part.slice(0, colon).trim()
    const value = part
      .slice(colon + 1)
      .trim()
      .replace(/\s+/g, ' ')
    if (name.length > 0 && value.length > 0) declarations.set(name, value)
  }
  return declarations
}

/**
 * Every element rule excludes the `.not-prose` escape hatch through this zero-specificity guard.
 * Tests pass unguarded selectors and let `ruleFor` add the guard, so assertions stay readable.
 */
const escapeGuard = ':where(:not(.not-prose):not(.not-prose *))'

const rules = parseRules(css)
const selectorSet = new Set(rules.flatMap((rule) => rule.selectors))
const ruleFor = (selector) =>
  rules.filter(
    (rule) =>
      rule.selectors.includes(selector) || rule.selectors.includes(`${selector}${escapeGuard}`),
  )
/** Merge the top-level declarations for a selector, with later rules winning. */
const declarationsFor = (selector) => {
  const matches = ruleFor(selector).filter((rule) => rule.atRules.length === 0)
  assert.ok(matches.length > 0, `Missing rule for selector "${selector}"`)
  const declarations = new Map()
  for (const rule of matches) {
    for (const [name, value] of rule.declarations) declarations.set(name, value)
  }
  return declarations
}
const hasSelector = (selector) => selectorSet.has(selector)

const declaredCustomProperties = new Set(
  rules.flatMap((rule) => [...rule.declarations.keys()].filter((name) => name.startsWith('--'))),
)

const kebab = (path) =>
  `--${path
    .split('.')
    .map((part) =>
      part
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase(),
    )
    .join('-')}`

const semanticVariables = new Set(
  [...contract.semanticTokens.base, ...Object.values(contract.semanticTokens.modes).flat()].map(
    kebab,
  ),
)

const referencedVariables = new Set(
  [...stripComments(css).matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1]),
)

const publicVariables = [
  '--ez-editorial-block-spacing',
  '--ez-editorial-font-size',
  '--ez-editorial-heading-line-height',
  '--ez-editorial-heading-scale',
  '--ez-editorial-heading-scale-compact',
  '--ez-editorial-line-height',
  '--ez-editorial-paragraph-spacing',
]

/* -------------------------------------------------------------------------- */
/* Package contract                                                           */
/* -------------------------------------------------------------------------- */

test('the package publishes one canonical CSS entry and no runtime', async () => {
  const pkg = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))

  assert.deepEqual(Object.keys(pkg.exports).sort(), ['./package.json', './style.css'])
  assert.equal(pkg.exports['./style.css'], './style.css')
  assert.ok(pkg.files.includes('style.css'), 'style.css must be published')
  assert.deepEqual(pkg.sideEffects, ['**/*.css'])
  assert.equal(pkg.dependencies, undefined, 'the preset must not install runtime dependencies')
  assert.equal(pkg.main, undefined)
  assert.equal(pkg.module, undefined)
  assert.equal(pkg.types, undefined)
  assert.ok(css.trim().length > 0, 'style.css must not be empty')
})

test('every selector is opt-in under .ez-editorial', () => {
  assert.ok(rules.length > 0, 'style.css contains no rules')

  for (const selector of selectorSet) {
    assert.ok(selector.startsWith('.ez-editorial'), `Unscoped selector found: "${selector}"`)
    const unguarded = selector.endsWith(escapeGuard)
      ? selector.slice(0, -escapeGuard.length)
      : selector
    for (const unscoped of [' body', ' html', ' main', ' :root', ' *']) {
      assert.ok(
        !unguarded.includes(unscoped),
        `Selector "${selector}" reaches outside the editorial root`,
      )
    }
  }

  assert.ok(hasSelector('.ez-editorial'), 'Missing the .ez-editorial root rule')
})

test('component subtrees can opt out of the editorial element rules', () => {
  for (const selector of selectorSet) {
    if (selector === '.ez-editorial') continue
    assert.ok(
      selector.endsWith(escapeGuard),
      `"${selector}" must exclude the .not-prose escape hatch`,
    )
  }

  assert.ok(hasSelector('.ez-editorial'), 'Missing the .ez-editorial root rule')
  assert.match(readme, /\.not-prose/, 'README.md does not document the escape hatch')
  assert.match(css, /:where\(:not\(\.not-prose\)/, 'The guard must stay at zero specificity')
})

test('the stylesheet contains no import, reset, layer or runtime hook', () => {
  const source = stripComments(css)

  assert.doesNotMatch(source, /@import\b/)
  assert.doesNotMatch(source, /@font-face\b/)
  assert.doesNotMatch(source, /@layer\b/)
  assert.doesNotMatch(source, /@tailwind\b/)
  assert.doesNotMatch(source, /@apply\b/)
  assert.doesNotMatch(source, /!important\b/)
  assert.doesNotMatch(source, /all:\s*unset\b/)
  assert.doesNotMatch(source, /\burl\(/)
  assert.doesNotMatch(source, /data-theme\b/)
  assert.doesNotMatch(source, /data-color-mode\b/)
  assert.doesNotMatch(source, /prefers-color-scheme\b/)
  assert.doesNotMatch(source, /article-layout\b/)
})

/* -------------------------------------------------------------------------- */
/* Token contract                                                             */
/* -------------------------------------------------------------------------- */

test('all custom properties are package-scoped and documented', () => {
  assert.deepEqual([...declaredCustomProperties].sort(), publicVariables)

  for (const name of publicVariables) {
    assert.match(readme, new RegExp(name), `README.md does not document ${name}`)
  }
})

test('var() references only verified core semantic tokens or local settings', () => {
  assert.ok(referencedVariables.size > 0, 'style.css references no custom properties')
  assert.deepEqual(
    [...referencedVariables].filter((name) => name.startsWith('--primitive-')),
    [],
    'editorial styles must not reference primitive tokens',
  )

  for (const name of referencedVariables) {
    if (name.startsWith('--ez-editorial-')) {
      assert.ok(declaredCustomProperties.has(name), `Undefined local setting ${name}`)
    } else {
      assert.ok(
        semanticVariables.has(name),
        `Unknown semantic token ${name}; verify it against @ezhana/design-tokens`,
      )
    }
  }
})

test('colors come from semantic tokens, never hard-coded values', () => {
  const source = stripComments(css)
  assert.doesNotMatch(source, /#[0-9a-f]{3,8}\b/i, 'Found a hard-coded hex color')
  assert.doesNotMatch(source, /\brgba?\(/i, 'Found a hard-coded rgb() color')
  assert.doesNotMatch(source, /\bhsla?\(/i, 'Found a hard-coded hsl() color')

  const colorProperties =
    /^(?:color|background|background-color|border|border-(?:top|right|bottom|left|inline-start|inline-end|block-start|block-end)|outline|outline-color|text-decoration-color|fill|stroke)$/

  for (const rule of rules) {
    for (const [name, value] of rule.declarations) {
      if (!colorProperties.test(name)) continue
      const allowedKeyword = /^(?:none|inherit|currentcolor|transparent|0|0 auto)$/i.test(value)
      assert.ok(
        value.includes('var(') || allowedKeyword,
        `"${rule.selector}" sets ${name} to a non-token value: ${value}`,
      )
    }
  }
})

/* -------------------------------------------------------------------------- */
/* Typography system                                                          */
/* -------------------------------------------------------------------------- */

test('body typography follows the reference reading rhythm', () => {
  const root = declarationsFor('.ez-editorial')

  assert.equal(root.get('--ez-editorial-font-size'), '1.25rem')
  assert.equal(root.get('--ez-editorial-line-height'), '1.7')
  assert.equal(root.get('--ez-editorial-heading-scale'), '1.25')
  assert.equal(root.get('--ez-editorial-heading-scale-compact'), '1.15')
  assert.equal(root.get('--ez-editorial-heading-line-height'), '1.2')
  assert.equal(root.get('--ez-editorial-paragraph-spacing'), '1.5em')
  assert.equal(root.get('--ez-editorial-block-spacing'), '2em')

  assert.equal(root.get('font-size'), 'var(--ez-editorial-font-size)')
  assert.equal(root.get('line-height'), 'var(--ez-editorial-line-height)')
  assert.equal(root.get('font-family'), 'var(--font-family-sans, inherit)')
  assert.equal(root.get('font-weight'), 'var(--font-weight-body, 400)')
  assert.equal(root.get('color'), 'var(--color-fg, inherit)')
  assert.equal(root.get('text-align'), 'start')
  assert.equal(root.get('overflow-wrap'), 'break-word')
})

test('headings use compact leading, strong foreground and a fluid ladder', () => {
  for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    const shared = declarationsFor(`.ez-editorial ${level}`)
    if (level === 'h1') {
      assert.equal(shared.get('margin'), '0 0 0.5rem')
      assert.equal(shared.get('color'), 'var(--color-fg-strong, inherit)')
      assert.equal(
        shared.get('font-family'),
        'var(--font-family-heading, var(--font-family-sans, inherit))',
      )
      assert.equal(shared.get('font-weight'), 'var(--font-weight-bold, 700)')
      assert.equal(shared.get('line-height'), 'var(--ez-editorial-heading-line-height)')
    }
  }

  for (const [level, power] of [
    ['h1', 5],
    ['h2', 4],
    ['h3', 3],
    ['h4', 2],
    ['h5', 1],
  ]) {
    const font = declarationsFor(`.ez-editorial ${level}`).get('font-size')
    assert.match(font, /^clamp\(\s*calc\(/, `${level} must clamp a computed size`)

    const uses = (pattern) => font.match(pattern)?.length ?? 0
    assert.equal(
      uses(/var\(--ez-editorial-heading-scale-compact\)/g),
      power * 2,
      `${level} must anchor its floor and preferred size on the compact ladder (${power}×2)`,
    )
    assert.equal(
      uses(/var\(--ez-editorial-heading-scale\)/g),
      power,
      `${level} must use the full ladder ${power} time(s) as its ceiling`,
    )
    assert.equal(
      uses(/\d+(?:\.\d+)?vw/g),
      1,
      `${level} must add exactly one viewport term to stay fluid`,
    )

    // The viewport term is added to a length, never multiplied by one; `1em * clamp(…vw…)`
    // would be a length squared. The three clamp() arguments are the floor, the fluid
    // preferred size and the ceiling, in that order.
    assert.match(font, /\+ \d+(?:\.\d+)?vw/)
    assert.doesNotMatch(font, /\*\s*\d+(?:\.\d+)?vw/)
    assert.doesNotMatch(font, /\d+(?:\.\d+)?vw\s*\*/)
    const [minimum, preferred, maximum] = font.split(',')
    assert.match(minimum, /--ez-editorial-heading-scale-compact\)/)
    assert.doesNotMatch(minimum, /vw/)
    assert.match(preferred, /--ez-editorial-heading-scale-compact\)/)
    assert.match(preferred, /vw/)
    assert.match(maximum, /var\(--ez-editorial-heading-scale\)/)
    assert.doesNotMatch(maximum, /compact|vw/)
  }

  assert.equal(declarationsFor('.ez-editorial h6').get('font-size'), '1em')
  assert.doesNotMatch(
    stripComments(css),
    /calc\(\s*1em\s*\*\s*clamp\(/,
    'A heading must not multiply the body length by a clamp that can yield a length',
  )
})

test('heading sizing is continuous and not stepped at the body breakpoint', () => {
  const mediaRules = rules.filter((rule) => rule.atRules.length > 0)
  assert.ok(mediaRules.length > 0, 'Expected the body/table media rules')

  for (const rule of mediaRules) {
    for (const selector of rule.selectors) {
      assert.doesNotMatch(
        selector,
        /[hH][1-6]/,
        `"${selector}" must not step heading sizes at a viewport breakpoint`,
      )
    }
  }
})

test('paragraph rhythm and trailing whitespace are deliberate', () => {
  assert.equal(
    declarationsFor('.ez-editorial p').get('margin'),
    '0 0 var(--ez-editorial-paragraph-spacing)',
  )
  assert.equal(declarationsFor('.ez-editorial > :last-child').get('margin-block-end'), '0')
})

test('the mobile reading size and table scroll switch at 720px', () => {
  const mobileRules = rules.filter((rule) =>
    rule.atRules.some((atRule) => atRule.includes('max-width: 720px')),
  )

  const mobileRoot = mobileRules.filter((rule) => rule.selectors.includes('.ez-editorial'))
  assert.equal(mobileRoot.length, 1, 'Expected one mobile .ez-editorial rule')
  assert.equal(mobileRoot[0].declarations.get('--ez-editorial-font-size'), '1.125rem')

  const mobileTable = mobileRules.filter((rule) =>
    rule.selectors.includes(`.ez-editorial table${escapeGuard}`),
  )
  assert.equal(mobileTable.length, 1, 'Expected one mobile table rule')
  assert.equal(mobileTable[0].declarations.get('display'), 'block')
  assert.equal(mobileTable[0].declarations.get('overflow-x'), 'auto')
})

/* -------------------------------------------------------------------------- */
/* Element coverage                                                           */
/* -------------------------------------------------------------------------- */

test('links keep a non-color affordance and a visible focus ring', () => {
  const link = declarationsFor('.ez-editorial a')
  assert.equal(link.get('color'), 'var(--color-accent, currentColor)')
  assert.match(link.get('text-decoration') ?? '', /underline/)
  assert.equal(link.get('text-underline-offset'), '0.15em')

  const hover = declarationsFor('.ez-editorial a:hover')
  assert.equal(hover.get('color'), 'var(--color-accent-hover, var(--color-accent, currentColor))')

  const focus = declarationsFor('.ez-editorial a:focus-visible')
  assert.match(focus.get('outline') ?? '', /var\(--color-focus-ring/)
  assert.equal(focus.get('outline-offset'), '2px')
})

test('lists restore markers, indentation and nested rhythm', () => {
  const lists = declarationsFor('.ez-editorial ul')
  assert.equal(lists.get('padding-inline-start'), '1.5em')
  assert.match(lists.get('margin') ?? '', /var\(--ez-editorial-block-spacing\)/)

  assert.equal(declarationsFor('.ez-editorial ul').get('list-style'), 'disc outside')
  assert.equal(declarationsFor('.ez-editorial ol').get('list-style'), 'decimal outside')
  assert.equal(declarationsFor('.ez-editorial li').get('margin-block'), '0.35em')
  assert.equal(declarationsFor('.ez-editorial li > ul').get('margin-block'), '0.35em 0')
  assert.equal(declarationsFor('.ez-editorial li > ol').get('margin-block'), '0.35em 0')
})

test('blockquotes use the accent rule without a decorative surface', () => {
  const quote = declarationsFor('.ez-editorial blockquote')
  assert.equal(quote.get('border-inline-start'), '4px solid var(--color-accent, currentColor)')
  assert.equal(quote.get('padding-inline-start'), '1.25rem')
  assert.equal(quote.get('font-size'), '1.333em')
  assert.equal(quote.get('color'), 'var(--color-fg, inherit)')
  assert.equal(quote.get('background'), undefined)
  assert.equal(quote.get('box-shadow'), undefined)
})

test('inline code and code blocks are distinct and highlighter-safe', () => {
  const code = declarationsFor('.ez-editorial code')
  assert.equal(code.get('padding'), '0.1em 0.25em')
  assert.equal(code.get('border-radius'), '2px')
  assert.equal(code.get('background'), 'var(--color-bg-subtle, transparent)')
  assert.equal(code.get('color'), 'var(--color-fg-strong, inherit)')
  assert.equal(code.get('font-family'), 'var(--font-family-mono, ui-monospace, monospace)')

  const pre = declarationsFor('.ez-editorial pre')
  assert.equal(pre.get('padding'), '1.5em')
  assert.equal(pre.get('border-radius'), '8px')
  assert.equal(pre.get('overflow-x'), 'auto')
  assert.equal(pre.get('color'), 'var(--color-fg-strong, inherit)')
  assert.equal(pre.get('font-family'), 'var(--font-family-mono, ui-monospace, monospace)')

  const preCode = declarationsFor('.ez-editorial pre code')
  assert.equal(preCode.get('padding'), '0')
  assert.equal(preCode.get('background'), 'none')
  assert.equal(preCode.get('font-family'), 'inherit')
  assert.equal(preCode.get('all'), undefined)

  const source = stripComments(css)
  assert.doesNotMatch(source, /\.shiki\b|\.astro-code\b|--shiki\b|\.token\b/)
  assert.doesNotMatch(source, /(?:pre|code)\s+\*/)
})

test('tables are simple, full width and scroll on narrow screens', () => {
  const table = declarationsFor('.ez-editorial table')
  assert.equal(table.get('width'), '100%')
  assert.equal(table.get('max-width'), '100%')
  assert.equal(table.get('border-collapse'), 'collapse')
  assert.equal(table.get('display'), undefined)
  assert.equal(table.get('overflow-x'), undefined)

  const cells = declarationsFor('.ez-editorial th')
  assert.equal(cells.get('padding'), '0.5em 0.75em')
  assert.equal(
    cells.get('border-bottom'),
    'var(--border-width-default, 1px) solid var(--color-border, currentColor)',
  )
  assert.equal(cells.get('overflow-wrap'), 'anywhere')
  assert.equal(cells.get('text-align'), 'start')

  assert.equal(
    declarationsFor('.ez-editorial th').get('font-weight'),
    'var(--font-weight-bold, 700)',
  )
  assert.equal(
    declarationsFor('.ez-editorial thead th').get('border-bottom-width'),
    'var(--border-width-strong, 2px)',
  )
  assert.equal(
    declarationsFor('.ez-editorial caption').get('color'),
    'var(--color-fg-muted, inherit)',
  )
})

test('images stay fluid without cropping; figures and captions are quiet', () => {
  const image = declarationsFor('.ez-editorial img')
  assert.equal(image.get('max-width'), '100%')
  assert.equal(image.get('height'), 'auto')
  assert.equal(image.get('border-radius'), '8px')
  assert.equal(image.get('object-fit'), undefined)

  assert.equal(
    declarationsFor('.ez-editorial figure').get('margin'),
    '0 0 var(--ez-editorial-block-spacing)',
  )
  const caption = declarationsFor('.ez-editorial figcaption')
  assert.equal(caption.get('color'), 'var(--color-fg-muted, inherit)')
  assert.equal(caption.get('font-size'), '0.875em')
  assert.equal(caption.get('line-height'), 'var(--font-line-height-caption, 1.4)')
})

test('horizontal rules use a semantic hairline and restrained spacing', () => {
  const rule = declarationsFor('.ez-editorial hr')
  assert.equal(rule.get('border'), '0')
  assert.equal(
    rule.get('border-top'),
    'var(--border-width-default, 1px) solid var(--color-border, currentColor)',
  )
  assert.equal(rule.get('margin'), 'var(--ez-editorial-block-spacing) 0')
})

/* -------------------------------------------------------------------------- */
/* Accessibility and layout boundaries                                        */
/* -------------------------------------------------------------------------- */

test('the preset keeps text readable and does not own page layout', () => {
  const source = stripComments(css)
  assert.doesNotMatch(source, /text-align:\s*justify/i)
  assert.doesNotMatch(source, /object-fit:\s*cover/i)
  assert.doesNotMatch(source, /letter-spacing\s*:/i)

  for (const declaration of [...source.matchAll(/font-size\s*:\s*([^;]+);/g)]) {
    assert.doesNotMatch(
      declaration[1],
      /\d+px\b/,
      `Font sizes must scale with the user: ${declaration[1]}`,
    )
  }

  const root = declarationsFor('.ez-editorial')
  assert.equal(root.get('width'), undefined)
  assert.equal(root.get('max-width'), undefined)
  assert.equal(root.get('margin-inline'), undefined)
  assert.equal(root.get('padding'), undefined)
})

test('the preset does not implement theme or mode switching', () => {
  const source = stripComments(css)
  assert.doesNotMatch(source, /\[data-theme/)
  assert.doesNotMatch(source, /\[data-color-mode/)
  assert.doesNotMatch(source, /prefers-color-scheme/)
  assert.doesNotMatch(source, /color-scheme\s*:/)
})
