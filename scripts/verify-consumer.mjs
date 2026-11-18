#!/usr/bin/env node
/**
 * End-to-end consumer verification.
 *
 * Packs the publishable packages with `pnpm pack`, installs the tarballs into throwaway Astro
 * projects (never workspace symlinks), then verifies:
 *
 *   1. `pnpm install`, `pnpm dev` and `pnpm build` work with no Astro/Vite CSS workaround.
 *   2. The single-theme project only installs `@ezhana/design-theme-cerulean` and imports
 *      `@ezhana/design-theme-cerulean/style.css`.
 *   3. The built CSS contains the tokens, the fonts (as files) and the theme overrides.
 *   4. The CSS cascade resolves the right accent for all theme/mode/system combinations, including
 *      explicit light/dark against a dark/light OS preference.
 *   5. `theme.json` metadata, the generated CSS and the runtime metadata agree.
 *   6. A multi-theme project keeps the core tokens once and applies each theme independently.
 *
 * Usage: `pnpm test:consumer` (runs `pnpm build` first).
 */
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const fixtureDir = join(root, 'fixtures', 'astro-consumer')

const PACKAGES = {
  core: 'packages/design-tokens',
  cerulean: 'packages/design-theme-cerulean',
  ocean: 'packages/design-theme-ocean',
  typography: 'packages/typography-editorial',
}

let failures = 0
const ok = (message) => process.stdout.write(`  ok  ${message}\n`)
const fail = (message) => {
  failures += 1
  process.stdout.write(`  FAIL ${message}\n`)
}
const check = (condition, message) => (condition ? ok(message) : fail(message))

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

const run = (command, args, cwd) =>
  new Promise((resolvePromise, reject) => {
    process.stdout.write(`\n> ${command} ${args.join(' ')} (${relative(root, cwd) || '.'})\n`)
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, CI: '1', ASTRO_TELEMETRY_DISABLED: '1' },
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolvePromise(undefined)
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })

const packPackage = async (packageDir, destination) => {
  const manifest = await readJson(join(root, packageDir, 'package.json'))
  await run('pnpm', ['pack', '--pack-destination', destination], join(root, packageDir))
  const filename = `${manifest.name.replace(/^@/, '').replace('/', '-')}-${manifest.version}.tgz`
  return join(destination, filename)
}

const copyProject = async (source, destination) =>
  cp(source, destination, {
    recursive: true,
    filter: (path) => !/\/(node_modules|dist|\.astro|pnpm-lock\.yaml)$/.test(path),
  })

/** Copy the packed tarballs next to the project so `file:` specifiers stay portable. */
const stageTarballs = async (projectDir, keys) => {
  const packs = join(projectDir, 'packs')
  await mkdir(packs, { recursive: true })
  const staged = {}
  for (const key of keys) {
    const filename = tarballs[key].split('/').pop()
    await cp(tarballs[key], join(packs, filename))
    staged[key] = `file:./packs/${filename}`
  }
  return staged
}

const exists = async (path) => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const listFiles = async (dir, base = dir) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(path, base)))
    else files.push(relative(base, path))
  }
  return files
}

const readText = async (path) => readFile(path, 'utf8')

/* -------------------------------------------------------------------------- */
/* CSS parsing and cascade simulation                                          */
/* -------------------------------------------------------------------------- */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const matchingBrace = (css, open) => {
  let depth = 0
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    else if (css[index] === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  throw new Error('Unbalanced braces in CSS')
}

/** Parse a stylesheet into flat rules with selector lists, declarations, media and order. */
const parseCss = (source, { order = { value: 0 } } = {}) => {
  const css = stripComments(source)
  const rules = []

  const parseBlock = (text, media) => {
    let index = 0
    while (index < text.length) {
      const open = text.indexOf('{', index)
      if (open === -1) break
      const prelude = text.slice(index, open).split(';').pop().trim()
      const close = matchingBrace(text, open)
      const body = text.slice(open + 1, close)

      if (prelude.startsWith('@media')) {
        parseBlock(body, [...media, prelude.replace(/^@media\s*/, '').trim()])
      } else if (prelude.startsWith('@layer') || prelude.startsWith('@supports')) {
        parseBlock(body, media)
      } else if (!prelude.startsWith('@') && !prelude.startsWith('from') && prelude !== '') {
        const declarations = new Map()
        for (const part of body.split(';')) {
          const colon = part.indexOf(':')
          if (colon === -1) continue
          const name = part.slice(0, colon).trim()
          if (!name.startsWith('--')) continue
          declarations.set(name, part.slice(colon + 1).trim())
        }
        if (declarations.size > 0) {
          rules.push({
            selectors: prelude.split(',').map((selector) => selector.trim()),
            declarations,
            media,
            order: order.value++,
          })
        }
      }
      index = close + 1
    }
  }

  parseBlock(css, [])
  return rules
}

const specificity = (selector) => {
  const rootCount = (selector.match(/:root/g) ?? []).length
  const attributeCount = (selector.match(/\[[^\]]*\]/g) ?? []).length
  return rootCount + attributeCount
}

const matchesSelector = (selector, environment) => {
  let rest = selector.trim()
  if (rest.startsWith(':root')) rest = rest.slice(':root'.length)
  else if (rest.startsWith('html')) rest = rest.slice('html'.length)
  else return false

  const attributes = {
    'data-theme': environment.theme,
    'data-color-mode': environment.colorMode,
  }

  while (rest.length > 0) {
    const notMatch = rest.match(/^:not\(\[([a-z-]+)\]\)/)
    if (notMatch !== null) {
      if (attributes[notMatch[1]] !== null) return false
      rest = rest.slice(notMatch[0].length)
      continue
    }
    const attributed = rest.match(/^\[([a-z-]+)(?:="([^"]*)")?\]/)
    if (attributed === null) return false
    const [, name, value] = attributed
    const actual = attributes[name]
    if (value === undefined) {
      if (actual === null) return false
    } else if (actual !== value) {
      return false
    }
    rest = rest.slice(attributed[0].length)
  }

  return true
}

const mediaMatches = (media, environment) => {
  for (const query of media) {
    if (query.includes('prefers-color-scheme: dark') && environment.system !== 'dark') return false
    if (query.includes('prefers-color-scheme: light') && environment.system !== 'light')
      return false
  }
  return true
}

/** Effective value of a custom property for an environment (theme/colorMode/system). */
const effective = (rules, environment, name, seen = new Set()) => {
  if (seen.has(name)) return undefined
  let winner = null

  for (const rule of rules) {
    if (!mediaMatches(rule.media, environment)) continue
    const declarations = rule.declarations
    if (!declarations.has(name)) continue

    let matchedSpecificity = -1
    for (const selector of rule.selectors) {
      if (matchesSelector(selector, environment)) {
        matchedSpecificity = Math.max(matchedSpecificity, specificity(selector))
      }
    }
    if (matchedSpecificity === -1) continue

    if (
      winner === null ||
      matchedSpecificity > winner.specificity ||
      (matchedSpecificity === winner.specificity && rule.order >= winner.order)
    ) {
      winner = { value: declarations.get(name), specificity: matchedSpecificity, order: rule.order }
    }
  }

  if (winner === null) return undefined
  return resolveValue(rules, environment, winner.value, seen)
}

const resolveValue = (rules, environment, value, seen = new Set()) => {
  const nextSeen = new Set(seen)
  return value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (match, name) => {
    const resolved = effective(rules, environment, name, nextSeen)
    if (resolved === undefined) return match
    nextSeen.add(name)
    return resolveValue(rules, environment, resolved, nextSeen)
  })
}

const normalizeValue = (value) => String(value).trim().replace(/\s+/g, ' ').toLowerCase()

const environments = ({ theme, colorMode, system }) => ({
  theme: theme ?? null,
  colorMode: colorMode ?? null,
  system,
})

/* -------------------------------------------------------------------------- */
/* Phase 1: pack publishable packages                                          */
/* -------------------------------------------------------------------------- */

const packsDir = await mkdtemp(join(tmpdir(), 'ezhana-packs-'))
const tarballs = {}
for (const [key, packageDir] of Object.entries(PACKAGES)) {
  tarballs[key] = await packPackage(packageDir, packsDir)
  ok(`packed ${relative(root, join(root, packageDir))} -> ${relative(packsDir, tarballs[key])}`)
}

/* -------------------------------------------------------------------------- */
/* Phase 2: single-theme Astro consumer                                        */
/* -------------------------------------------------------------------------- */

const singleDir = await mkdtemp(join(tmpdir(), 'ezhana-astro-single-'))
await copyProject(fixtureDir, singleDir)

const singlePacks = await stageTarballs(singleDir, ['core', 'cerulean', 'typography'])
const singleManifest = await readJson(join(singleDir, 'package.json'))
singleManifest.dependencies['@ezhana/design-theme-cerulean'] = singlePacks.cerulean
singleManifest.dependencies['@ezhana/typography-editorial'] = singlePacks.typography
// The theme declares @ezhana/design-tokens as a normal dependency. The harness installs it from the
// locally packed tarball because the version being verified is not published yet.
singleManifest.pnpm = { overrides: { '@ezhana/design-tokens': singlePacks.core } }
await writeFile(join(singleDir, 'package.json'), `${JSON.stringify(singleManifest, null, 2)}\n`)

const declaredConsumerDeps = Object.keys(singleManifest.dependencies).sort()
check(
  declaredConsumerDeps.length === 3 &&
    declaredConsumerDeps[0] === '@ezhana/design-theme-cerulean' &&
    declaredConsumerDeps[1] === '@ezhana/typography-editorial' &&
    declaredConsumerDeps[2] === 'astro',
  `consumer installs the theme + typography preset (+ astro): ${declaredConsumerDeps.join(', ')}`,
)

const singleConfig = await readText(join(singleDir, 'astro.config.mjs'))
check(
  !/noExternal|vite:|ssr:/.test(singleConfig),
  'consumer astro.config.mjs has no CSS/Vite workaround',
)

const singleCSS = await readText(join(singleDir, 'src/styles/global.css'))
const cssImports = [...singleCSS.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
check(
  cssImports.length === 2 &&
    cssImports[0] === '@ezhana/design-theme-cerulean/style.css' &&
    cssImports[1] === '@ezhana/typography-editorial/style.css',
  `consumer imports the theme and typography style.css entries (${cssImports.join(', ')})`,
)

process.stdout.write('\nInstalling the packed packages into the Astro consumer...\n')
await run('pnpm', ['install', '--no-frozen-lockfile'], singleDir)

const installedTheme = join(singleDir, 'node_modules', '@ezhana', 'design-theme-cerulean')
const installedManifest = await readJson(join(installedTheme, 'package.json'))
check(
  !Object.hasOwn(installedManifest.dependencies ?? {}, '@fontsource-variable/public-sans'),
  'theme package does not require consumers to install font packages',
)
check(
  !(await exists(join(singleDir, 'node_modules', '@ezhana', 'theme'))),
  'consuming a theme does not install the optional runtime',
)
const installedFonts = await listFiles(join(installedTheme, 'dist', 'fonts')).catch(() => [])
check(
  installedFonts.some((file) => file.endsWith('.woff2')),
  'published theme tarball contains its font files',
)

process.stdout.write('\nBuilding the Astro consumer...\n')
await run('pnpm', ['build'], singleDir)

const singleDist = join(singleDir, 'dist')
const singleFiles = await listFiles(singleDist)
const htmlFiles = singleFiles.filter((file) => file.endsWith('.html'))
const cssFiles = singleFiles.filter((file) => file.endsWith('.css'))
check(htmlFiles.length >= 4, `Astro built ${htmlFiles.length} pages`)
check(cssFiles.length >= 1, 'Astro emitted a CSS asset')

const htmlByPage = {}
for (const file of htmlFiles) htmlByPage[file] = await readText(join(singleDist, file))
const page = (name) => {
  const route = name.replace(/\.html$/, '')
  const key = Object.keys(htmlByPage).find((file) => {
    const normalized = `/${file}`
    if (normalized === `/${name}`) return true
    if (route === 'index') return normalized === '/index.html'
    return normalized === `/${route}/index.html` || normalized.endsWith(`/${name}`)
  })
  return key === undefined ? '' : htmlByPage[key]
}
const htmlTag = (html) => html.match(/<html\b[^>]*>/)?.[0] ?? ''

check(
  /data-theme="cerulean"/.test(htmlTag(page('index.html'))),
  'system page sets data-theme="cerulean"',
)
check(
  /data-color-mode="dark"/.test(htmlTag(page('dark.html'))),
  'dark page sets data-color-mode="dark"',
)
check(
  /data-color-mode="light"/.test(htmlTag(page('light.html'))),
  'light page sets data-color-mode="light"',
)
check(
  !/data-color-mode=/.test(htmlTag(page('index.html'))),
  'system page has no data-color-mode attribute',
)
check(
  !/data-theme=/.test(htmlTag(page('default-theme.html'))),
  'core page has no data-theme attribute',
)
check(
  !/<script/.test(page('index.html')),
  'system-theme page ships no JavaScript (styling is CSS-only)',
)
check(
  /class="ez-editorial"/.test(page('index.html')),
  'editorial content uses the public .ez-editorial scope',
)

const bundledCss = (await Promise.all(cssFiles.map((file) => readText(join(singleDist, file)))))
  .join('\n')
  .replace(/\s+/g, ' ')
check(bundledCss.includes('--color-accent:'), 'built CSS contains semantic tokens')
check(bundledCss.includes('@font-face'), 'built CSS contains the self-hosted font faces')
check(bundledCss.includes('.ez-editorial'), 'built CSS contains the editorial scope')
check(
  bundledCss.includes('--ez-editorial-font-size'),
  'built CSS contains the editorial customization settings',
)
check(
  bundledCss.includes('--ez-editorial-heading-scale-compact'),
  'built CSS contains the compact heading ladder setting',
)
check(
  /clamp\(\s*calc\(\s*1em\s*\*\s*var\(--ez-editorial-heading-scale-compact\)/.test(bundledCss),
  'built CSS contains the fluid heading clamp ladder',
)
check(/\.not-prose\s*\*\)/.test(bundledCss), 'built CSS contains the editorial escape hatch')
check(
  // Lightning CSS may rewrite max-width to the range syntax during the Astro build.
  /@media\s*\((?:max-width:\s*720px|width\s*<=\s*720px)\)/.test(bundledCss),
  'built CSS contains the responsive typography breakpoint',
)
check(
  /data-theme=(?:"cerulean"|cerulean)/.test(bundledCss),
  'built CSS contains the theme selector',
)
check(
  /@media \(prefers-color-scheme:\s*dark\)/.test(bundledCss),
  'built CSS implements the system dark mode',
)
check(
  /\[data-color-mode=(?:"dark"|dark)\]/.test(bundledCss),
  'built CSS implements explicit dark mode',
)
check(
  /\[data-color-mode=(?:"light"|light)\]/.test(bundledCss),
  'built CSS implements explicit light mode',
)
check(
  (bundledCss.match(/--primitive-color-neutral-0:/g) ?? []).length === 1,
  'single-theme build includes the core token block exactly once',
)
const bundledFonts = singleFiles.filter((file) => file.endsWith('.woff2'))
check(bundledFonts.length >= 1, `Astro emitted ${bundledFonts.length} font files`)

/* Dev server smoke test ---------------------------------------------------- */

process.stdout.write('\nStarting the Astro dev server...\n')
const devPort = 4600 + Math.floor(Math.random() * 100)
const dev = spawn(
  'pnpm',
  ['exec', 'astro', 'dev', '--port', String(devPort), '--host', '127.0.0.1'],
  {
    cwd: singleDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: '1', ASTRO_TELEMETRY_DISABLED: '1' },
  },
)
let devOutput = ''
dev.stdout.on('data', (chunk) => {
  devOutput += String(chunk)
})
dev.stderr.on('data', (chunk) => {
  devOutput += String(chunk)
})

const stopDevServer = () =>
  new Promise((resolvePromise) => {
    const timer = setTimeout(() => {
      dev.kill('SIGKILL')
      resolvePromise()
    }, 5000)
    dev.once('exit', () => {
      clearTimeout(timer)
      resolvePromise()
    })
    dev.kill('SIGTERM')
  })

const waitForServer = async (url, timeoutMs = 90000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
    } catch {
      // Not listening yet.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500))
  }
  throw new Error(`Dev server did not answer at ${url}\n${devOutput}`)
}

try {
  const response = await waitForServer(`http://127.0.0.1:${devPort}/`)
  const html = await response.text()
  check(response.status === 200, 'dev server serves the index page')
  check(/data-theme="cerulean"/.test(html), 'dev-rendered HTML sets data-theme="cerulean"')
  const darkResponse = await fetch(`http://127.0.0.1:${devPort}/dark`)
  const darkHtml = await darkResponse.text()
  check(/data-color-mode="dark"/.test(darkHtml), 'dev server serves the dark page')
} finally {
  await stopDevServer()
}

/* -------------------------------------------------------------------------- */
/* Phase 3: cascade and metadata verification on the packed artifacts          */
/* -------------------------------------------------------------------------- */

const themeCss = await readText(join(installedTheme, 'dist', 'style.css'))
const themeOverridesCss = await readText(join(installedTheme, 'dist', 'theme.css'))
const themeJson = await readJson(join(installedTheme, 'dist', 'theme.json'))
const themeMetadata = await import(
  `${pathToFileURL(join(installedTheme, 'dist', 'index.js')).href}?verify=${Date.now()}`
)

check(themeMetadata.themeId === 'cerulean', 'runtime metadata exposes the theme id')
check(themeMetadata.themeLabel === 'Cerulean', 'runtime metadata exposes the theme label')
check(
  JSON.stringify([...themeMetadata.theme.modes]) === JSON.stringify(themeJson.modes),
  'runtime metadata and theme.json agree on the supported modes',
)

const expectedAccent = {
  light: themeJson.resolved.light['color.accent'].value,
  dark: themeJson.resolved.dark['color.accent'].value,
}

check(expectedAccent.light === '#0079a4', 'theme.json light accent is the Cerulean accent')
check(expectedAccent.dark === '#2cc9ff', 'theme.json dark accent is the Cerulean dark accent')

const rules = parseCss(themeCss)
const accentIn = (environment) => effective(rules, environments(environment), '--color-accent')
const fontIn = (environment) => effective(rules, environments(environment), '--font-family-sans')

const cases = [
  ['default Cerulean light', { theme: 'cerulean', system: 'light' }, expectedAccent.light],
  ['Cerulean dark', { theme: 'cerulean', colorMode: 'dark', system: 'light' }, expectedAccent.dark],
  ['system light', { theme: 'cerulean', system: 'light' }, expectedAccent.light],
  ['system dark', { theme: 'cerulean', system: 'dark' }, expectedAccent.dark],
  [
    'manual light over dark OS',
    { theme: 'cerulean', colorMode: 'light', system: 'dark' },
    expectedAccent.light,
  ],
  [
    'manual dark over light OS',
    { theme: 'cerulean', colorMode: 'dark', system: 'light' },
    expectedAccent.dark,
  ],
]

for (const [label, environment, expected] of cases) {
  const actual = accentIn(environment)
  check(
    normalizeValue(actual) === normalizeValue(expected),
    `cascade: ${label} accent = ${actual} (expected ${expected})`,
  )
}

const defaultAccent = effective(rules, environments({ system: 'dark' }), '--color-accent')
check(normalizeValue(defaultAccent) === '#c084fc', 'cascade: default theme dark accent (violet)')

check(
  /Public Sans/.test(fontIn({ theme: 'cerulean', system: 'light' }) ?? ''),
  'cascade: theme font family applies',
)

/* Metadata and CSS agreement for every override the theme makes. */
const modeEnvironments = {
  light: { theme: 'cerulean', system: 'light' },
  dark: { theme: 'cerulean', colorMode: 'dark', system: 'light' },
}
let overrideMismatches = 0
for (const [mode, environment] of Object.entries(modeEnvironments)) {
  for (const [path, entry] of Object.entries(themeJson.resolved[mode])) {
    if (!Object.hasOwn(themeJson.overrides[mode], path)) continue
    const cssVariable = `--${path
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()}`
    const actual = effective(rules, environments(environment), cssVariable)
    if (normalizeValue(actual) !== normalizeValue(entry.value)) {
      overrideMismatches += 1
      fail(`metadata/CSS mismatch for ${mode} ${cssVariable}: CSS=${actual} JSON=${entry.value}`)
    }
  }
}
check(overrideMismatches === 0, 'theme.json, theme CSS and the cascade agree for every override')

/* No duplicate or unintended CSS. */
const themeRuleCount = parseCss(themeOverridesCss).length
check(themeRuleCount > 0, `theme.css contains ${themeRuleCount} override rules`)
check(
  !/--primitive-/.test(stripComments(themeOverridesCss)),
  'theme.css does not redeclare primitive tokens',
)
check(
  !/@import\s/.test(stripComments(themeCss)),
  'complete style.css has no unresolved CSS imports',
)

/* -------------------------------------------------------------------------- */
/* Phase 4: multi-theme Astro consumer                                         */
/* -------------------------------------------------------------------------- */

const multiDir = await mkdtemp(join(tmpdir(), 'ezhana-astro-multi-'))
await mkdir(join(multiDir, 'src', 'pages'), { recursive: true })
await mkdir(join(multiDir, 'src', 'layouts'), { recursive: true })
await mkdir(join(multiDir, 'src', 'styles'), { recursive: true })

const multiPacks = await stageTarballs(multiDir, ['core', 'cerulean', 'ocean'])
await writeFile(
  join(multiDir, 'package.json'),
  `${JSON.stringify(
    {
      name: 'ezhana-astro-multi-theme-consumer',
      private: true,
      type: 'module',
      scripts: { build: 'astro build' },
      dependencies: {
        '@ezhana/design-tokens': multiPacks.core,
        '@ezhana/design-theme-cerulean': multiPacks.cerulean,
        '@ezhana/design-theme-ocean': multiPacks.ocean,
        astro: '7.4.11',
      },
      pnpm: { overrides: { '@ezhana/design-tokens': multiPacks.core } },
    },
    null,
    2,
  )}\n`,
)
await writeFile(
  join(multiDir, 'astro.config.mjs'),
  "import { defineConfig } from 'astro/config'\n\nexport default defineConfig({})\n",
)
await writeFile(
  join(multiDir, 'src', 'styles', 'global.css'),
  `@import '@ezhana/design-tokens/style.css';
@import '@ezhana/design-theme-cerulean/fonts.css';
@import '@ezhana/design-theme-cerulean/theme.css';
@import '@ezhana/design-theme-ocean/fonts.css';
@import '@ezhana/design-theme-ocean/theme.css';

body {
  background: var(--color-bg);
  color: var(--color-fg);
}
`,
)
await writeFile(
  join(multiDir, 'src', 'layouts', 'Layout.astro'),
  `---
import '../styles/global.css'

interface Props {
  theme: string
}

const { theme } = Astro.props
---

<!doctype html>
<html lang="en" data-theme={theme}>
  <head>
    <meta charset="utf-8" />
    <title>{theme}</title>
  </head>
  <body><slot /></body>
</html>
`,
)
for (const theme of ['cerulean', 'ocean']) {
  await writeFile(
    join(multiDir, 'src', 'pages', `${theme}.astro`),
    `---
import Layout from '../layouts/Layout.astro'
---

<Layout theme="${theme}">
  <main class="page">
    <h1>${theme}</h1>
    <p>Token probe: <code>var(--color-accent)</code></p>
  </main>
</Layout>
`,
  )
}

process.stdout.write('\nInstalling and building the multi-theme Astro consumer...\n')
await run('pnpm', ['install', '--no-frozen-lockfile'], multiDir)
await run('pnpm', ['build'], multiDir)

const multiDist = join(multiDir, 'dist')
const multiFiles = await listFiles(multiDist)
const multiCss = (
  await Promise.all(
    multiFiles
      .filter((file) => file.endsWith('.css'))
      .map((file) => readText(join(multiDist, file))),
  )
)
  .join('\n')
  .replace(/\s+/g, ' ')
check(
  /data-theme=(?:"cerulean"|cerulean)/.test(multiCss),
  'multi-theme build includes the Cerulean block',
)
check(/data-theme=(?:"ocean"|ocean)/.test(multiCss), 'multi-theme build includes the Ocean block')
const primitiveDeclarations = (multiCss.match(/--primitive-color-neutral-0:/g) ?? []).length
check(
  primitiveDeclarations === 1,
  `multi-theme build declares core tokens once (${primitiveDeclarations})`,
)

const multiRules = parseCss(
  [
    await readText(join(multiDir, 'node_modules', '@ezhana', 'design-tokens', 'dist', 'style.css')),
    await readText(
      join(multiDir, 'node_modules', '@ezhana', 'design-theme-cerulean', 'dist', 'theme.css'),
    ),
    await readText(
      join(multiDir, 'node_modules', '@ezhana', 'design-theme-ocean', 'dist', 'theme.css'),
    ),
  ].join('\n'),
)
const oceanJson = await readJson(
  join(multiDir, 'node_modules', '@ezhana', 'design-theme-ocean', 'dist', 'theme.json'),
)
for (const [theme, expected] of [
  ['cerulean', expectedAccent.light],
  ['ocean', oceanJson.resolved.light['color.accent'].value],
]) {
  const actual = effective(multiRules, environments({ theme, system: 'light' }), '--color-accent')
  check(
    normalizeValue(actual) === normalizeValue(expected),
    `multi-theme cascade: ${theme} accent = ${actual} (expected ${expected})`,
  )
}

/* -------------------------------------------------------------------------- */

await Promise.all(
  [packsDir, singleDir, multiDir].map((dir) => rm(dir, { recursive: true, force: true })),
)

process.stdout.write('\n')
if (failures > 0) {
  process.stderr.write(`Consumer verification failed: ${failures} check(s) failed.\n`)
  process.exitCode = 1
} else {
  process.stdout.write('Consumer verification passed.\n')
}
