import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const FONT_VERSION = '^5.3.0'

/**
 * Read the versions that the standalone create-app tool needs to patch generated apps.
 * This is source-repository-only; the exported tool carries the resulting versions.json.
 */
export const readSourceVersions = async (sourceRoot) => {
  const packagesDir = join(sourceRoot, 'packages')
  const packages = {}
  for (const entry of await readdir(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const manifestPath = join(packagesDir, entry.name, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (manifest.name && manifest.version) packages[manifest.name] = manifest.version
  }

  const workspace = await readFile(join(sourceRoot, 'pnpm-workspace.yaml'), 'utf8')
  const catalogSection = workspace.match(/^catalog:\n((?: {2}.+\n)+)/m)?.[1] ?? ''
  const catalog = {}
  for (const line of catalogSection.split('\n')) {
    const match = line.match(/^ {2}([^:]+):\s*(.+)$/)
    if (match) catalog[match[1].trim()] = match[2].trim()
  }

  return { packages, catalog, font: FONT_VERSION }
}
