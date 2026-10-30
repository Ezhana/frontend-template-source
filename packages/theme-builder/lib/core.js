/**
 * Locate and read the core `@ezhana/design-tokens` artifacts a theme is built against.
 *
 * Resolution starts at the theme package, not at this package: a theme package declares
 * `@ezhana/design-tokens` itself, so `require.resolve` from the theme's directory yields the exact
 * version the theme was developed against. This is what allows several themes (and several
 * versions of the core package) to coexist in one workspace.
 */
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/** Contract versions this builder understands. */
const SUPPORTED_CONTRACT_VERSIONS = [1]

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

/**
 * @param {string} cwd Theme package directory.
 * @returns {Promise<{ contract: object, values: object, cssPath: string, packageJsonPath: string }>}
 */
export const loadCoreTokens = async (cwd) => {
  const require = createRequire(join(cwd, 'package.json'))

  let packageJsonPath
  try {
    packageJsonPath = require.resolve('@ezhana/design-tokens/package.json')
  } catch (error) {
    throw new Error(
      `Could not resolve @ezhana/design-tokens from "${cwd}". ` +
        'Add it to the theme package dependencies and install dependencies.\n' +
        `Cause: ${error.message}`,
      { cause: error },
    )
  }

  let contractPath
  let valuesPath
  let cssPath
  try {
    contractPath = require.resolve('@ezhana/design-tokens/contract')
    valuesPath = require.resolve('@ezhana/design-tokens/json')
    cssPath = require.resolve('@ezhana/design-tokens/css/tokens.css')
  } catch (error) {
    throw new Error(
      `@ezhana/design-tokens is installed (${dirname(packageJsonPath)}) but its generated ` +
        'artifacts are missing. Build it first, for example ' +
        '`pnpm --filter @ezhana/design-tokens build` in the source repository.\n' +
        `Cause: ${error.message}`,
      { cause: error },
    )
  }

  const [contract, values] = await Promise.all([readJson(contractPath), readJson(valuesPath)])

  if (!SUPPORTED_CONTRACT_VERSIONS.includes(contract.version)) {
    throw new Error(
      `@ezhana/design-tokens contract version ${contract.version} is not supported by this ` +
        `@ezhana/theme-builder (supported: ${SUPPORTED_CONTRACT_VERSIONS.join(', ')}). ` +
        'Upgrade @ezhana/theme-builder.',
    )
  }

  return { contract, values, cssPath, packageJsonPath }
}
