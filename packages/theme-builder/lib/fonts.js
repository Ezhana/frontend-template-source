/**
 * Resolve the font CSS entries a theme configures, copy their font files into `dist/fonts/` and
 * rewrite the `url()` references to point at those copies.
 *
 * Theme packages publish a complete, self-contained stylesheet: consumers must not have to install
 * `@fontsource` packages or teach their bundler to resolve a package's internal font URLs.
 */
import { access, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'

const URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g
const EXTERNAL_URL = /^(?:data:|https?:|\/\/|#)/i

const findPackageRoot = async (from) => {
  let current = from
  for (let depth = 0; depth < 12; depth += 1) {
    const manifest = join(current, 'package.json')
    try {
      await access(manifest)
      return current
    } catch {
      const parent = dirname(current)
      if (parent === current) return null
      current = parent
    }
  }
  return null
}

const packageSlug = async (root) => {
  if (root === null) return 'font'
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  return String(manifest.name ?? 'font')
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
}

const resolveEntry = (specifier, cwd) => {
  if (isAbsolute(specifier) || specifier.startsWith('.')) return resolve(cwd, specifier)
  const require = createRequire(join(cwd, 'package.json'))
  try {
    return require.resolve(specifier)
  } catch (error) {
    throw new Error(
      `The font entry "${specifier}" cannot be resolved from "${cwd}". ` +
        'Add the font package as a devDependency of the theme package.\n' +
        `Cause: ${error.message}`,
      { cause: error },
    )
  }
}

/**
 * @param {{ fonts: readonly string[], cwd: string }} input
 * @returns {Promise<{
 *   fontFaceCss: string,
 *   fontFiles: Map<string, string>,
 *   licenseFiles: Map<string, string>,
 * }>} map keys are absolute source paths, values are paths relative to `dist/`.
 */
export const inlineFonts = async ({ fonts, cwd }) => {
  const fontFiles = new Map()
  const licenseFiles = new Map()
  const usedNames = new Map()
  const seenEntries = new Set()
  const blocks = []

  for (const specifier of fonts) {
    const cssPath = resolveEntry(specifier, cwd)
    if (seenEntries.has(cssPath)) continue
    seenEntries.add(cssPath)

    const packageRoot = await findPackageRoot(dirname(cssPath))
    const slug = await packageSlug(packageRoot)
    const source = await readFile(cssPath, 'utf8')

    const rewritten = source.replace(URL_PATTERN, (match, _quote, reference) => {
      if (EXTERNAL_URL.test(reference)) return match

      const absolute = resolve(dirname(cssPath), reference)
      let target = fontFiles.get(absolute)
      if (target === undefined) {
        let name = basename(absolute)
        if (usedNames.has(name) && usedNames.get(name) !== absolute) {
          name = `${slug}-${basename(absolute)}`
        }
        usedNames.set(name, absolute)
        target = `fonts/${name}`
        fontFiles.set(absolute, target)
      }
      return `url("./${target}")`
    })

    blocks.push(`/* ${specifier} */\n${rewritten.trimEnd()}`)

    if (packageRoot !== null && !licenseFiles.has(packageRoot)) {
      const licensePath = join(packageRoot, 'LICENSE')
      try {
        await access(licensePath)
        licenseFiles.set(licensePath, `fonts/licenses/${slug}.txt`)
      } catch {
        // A font package without a LICENSE file is unusual; the build still succeeds.
      }
    }
  }

  return {
    fontFaceCss: blocks.join('\n\n'),
    fontFiles,
    licenseFiles,
  }
}
