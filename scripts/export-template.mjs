#!/usr/bin/env node
/**
 * Export the consumer-facing template repository from this development monorepo.
 *
 * The exported template is a workspace starter with an empty `apps/` and a bundled standalone
 * `tools/create-app`; users choose React or Vue with `pnpm create:app`. Every `@ezhana/*`
 * dependency resolved by the generator points at the published npm version.
 *
 * Usage:
 *   node scripts/export-template.mjs [--out <dir>] [--install]
 *
 * --install runs `pnpm install --lockfile-only` in the generated directory so the exported
 * repository has a pnpm-lock.yaml. Run it after the @ezhana/* versions in package.json have been
 * published to npm.
 */
import { spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { readSourceVersions } from './lib/source-versions.mjs'

const sourceRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const skeletonDir = join(sourceRoot, 'template')
const defaultOut = join(sourceRoot, 'dist-template', 'frontend-template')

const ROOT_FILES = [
  '.editorconfig',
  '.env.example',
  '.gitattributes',
  '.gitignore',
  '.prettierignore',
  'LICENSE',
  'lint-staged.config.mjs',
  'pnpm-workspace.yaml',
  'prettier.config.mjs',
]

const parseArgs = () => {
  const args = process.argv.slice(2)
  let outDir = defaultOut
  let install = false
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--out') {
      const value = args[index + 1]
      if (!value) throw new Error('--out requires a directory')
      outDir = value
      index += 1
    } else if (arg === '--install') {
      install = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  return { outDir, install }
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

const exists = async (path) => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** Collect versions of every package under packages/ so template deps can be pinned. */
const readPublishedVersions = async () => {
  const packagesDir = join(sourceRoot, 'packages')
  const entries = await readdir(packagesDir, { withFileTypes: true })
  const versions = new Map()
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const manifestPath = join(packagesDir, entry.name, 'package.json')
    if (!(await exists(manifestPath))) continue
    const manifest = await readJson(manifestPath)
    if (manifest.name) versions.set(manifest.name, manifest.version)
  }
  return versions
}

const createRootManifest = async (outDir) => {
  const sourceRootManifest = await readJson(join(sourceRoot, 'package.json'))
  const versions = await readPublishedVersions()

  const required = ['@ezhana/eslint-config-base', '@ezhana/prettier-config']
  for (const name of required) {
    if (!versions.get(name)) throw new Error(`Cannot resolve published version for ${name}.`)
  }

  const manifest = {
    name: 'frontend-template',
    private: true,
    description: 'Frontend monorepo starter; choose React or Vue with pnpm create:app.',
    scripts: {
      lint: 'eslint . && pnpm -r --filter "./apps/*" --if-present lint',
      'lint:fix': 'eslint . --fix && pnpm -r --filter "./apps/*" --if-present lint:fix',
      format: 'prettier . --write',
      'format:check': 'prettier . --check',
      'build:packages': 'pnpm -r --filter "./packages/*" --if-present build',
      'build:apps': 'pnpm -r --filter "./apps/*" --if-present build',
      build: 'pnpm build:packages && pnpm build:apps',
      dev: 'pnpm -r --filter "./apps/*" --parallel --if-present dev',
      'create:app': 'node ./tools/create-app/bin/create-app.mjs',
      check: 'pnpm format:check && pnpm lint && pnpm build',
      prepare: 'simple-git-hooks',
    },
    author: sourceRootManifest.author,
    license: sourceRootManifest.license,
    packageManager: sourceRootManifest.packageManager,
    engines: sourceRootManifest.engines,
    'simple-git-hooks': sourceRootManifest['simple-git-hooks'],
    devDependencies: {
      '@ezhana/eslint-config-base': `^${versions.get('@ezhana/eslint-config-base')}`,
      '@ezhana/prettier-config': `^${versions.get('@ezhana/prettier-config')}`,
      eslint: 'catalog:',
      'lint-staged': sourceRootManifest.devDependencies['lint-staged'],
      prettier: 'catalog:',
      'simple-git-hooks': sourceRootManifest.devDependencies['simple-git-hooks'],
      typescript: 'catalog:',
    },
  }

  await writeJson(join(outDir, 'package.json'), manifest)
}

const copyRootFiles = async (outDir) => {
  for (const file of ROOT_FILES) {
    const from = join(sourceRoot, file)
    if (!(await exists(from))) continue
    let content = await readFile(from, 'utf8')
    // The source repo ignores generated output; the generated repo does not need that entry.
    content = content.replace(/^dist-template\/\n?/m, '')
    if (file === 'pnpm-workspace.yaml') {
      // This exclusion list only exists for source-repo dependency policy; the template does not
      // need it and should stay focused on the workspaces + catalog.
      content = content.replace(/\nminimumReleaseAgeExclude:\n(?:[ ]{2}- .*\n)+/g, '\n')
      // The source repo no longer contains apps/; the generated template does.
      if (!content.includes("'apps/*'")) {
        content = content.replace('packages:\n', "packages:\n  - 'apps/*'\n")
      }
    }
    if (file === '.prettierignore' && !content.includes('pnpm-workspace.yaml')) {
      // pnpm can rewrite this file with generated supply-chain policy; do not fail CI on its
      // formatting.
      content += '\npnpm-workspace.yaml\n'
    }
    await writeFile(join(outDir, file), content)
  }

  const vscodeDir = join(sourceRoot, '.vscode')
  if (await exists(vscodeDir)) {
    await cp(vscodeDir, join(outDir, '.vscode'), { recursive: true })
  }
}

const validateOutput = async (outDir) => {
  const problems = []
  const rootManifest = await readJson(join(outDir, 'package.json'))
  if (JSON.stringify(rootManifest).includes('workspace:')) {
    problems.push('package.json still contains a workspace: dependency')
  }
  if (rootManifest.scripts?.['create:app'] !== 'node ./tools/create-app/bin/create-app.mjs') {
    problems.push('root create:app script is missing')
  }

  for (const file of [
    'packages/README.md',
    'apps/README.md',
    'tools/create-app/bin/create-app.mjs',
    'tools/create-app/versions.json',
  ]) {
    if (!(await exists(join(outDir, file)))) problems.push(`${file} is missing`)
  }

  const appEntries = await readdir(join(outDir, 'apps'), { withFileTypes: true })
  if (appEntries.some((entry) => entry.isDirectory())) {
    problems.push('generated template must not contain default apps')
  }

  if (problems.length > 0)
    throw new Error(`Generated template is invalid:\n- ${problems.join('\n- ')}`)
}

const copyCreateApp = async (outDir) => {
  const from = join(sourceRoot, 'tools/create-app')
  const to = join(outDir, 'tools/create-app')
  await cp(from, to, {
    recursive: true,
    filter: (source) => {
      const rel = relative(from, source)
      if (!rel) return true
      return !rel
        .split('/')
        .some((segment) => segment === 'node_modules' || segment.startsWith('.create-app-'))
    },
  })
  const versions = await readSourceVersions(sourceRoot)
  await writeJson(join(to, 'versions.json'), versions)
}

const formatOutput = (outDir) => {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'prettier',
      '--config',
      join(sourceRoot, 'prettier.config.mjs'),
      '--ignore-path',
      join(sourceRoot, '.prettierignore'),
      '--write',
      outDir,
    ],
    {
      cwd: sourceRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  )
  if (result.status !== 0)
    throw new Error('Prettier failed while formatting the generated template.')
}

const installLockfile = (outDir) => {
  const result = spawnSync('pnpm', ['install', '--lockfile-only', '--ignore-scripts'], {
    cwd: outDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    throw new Error(
      'pnpm install --lockfile-only failed. Publish the @ezhana/* package versions first, ' +
        'then rerun the export with --install.',
    )
  }
}

const main = async () => {
  const { outDir, install } = parseArgs()
  const resolvedOut = outDir.startsWith('/') ? outDir : join(sourceRoot, outDir)

  await rm(resolvedOut, { recursive: true, force: true })
  await mkdir(resolvedOut, { recursive: true })

  await cp(skeletonDir, resolvedOut, { recursive: true })
  await copyRootFiles(resolvedOut)
  await copyCreateApp(resolvedOut)
  await createRootManifest(resolvedOut)
  await validateOutput(resolvedOut)

  if (install) installLockfile(resolvedOut)
  formatOutput(resolvedOut)

  process.stdout.write(
    `Template exported to ${relative(sourceRoot, resolvedOut) || resolvedOut}\n` +
      '  apps: empty (create with pnpm create:app)\n' +
      '  packages: optional placeholder (README only; users add their own workspaces here)\n' +
      (install
        ? '  pnpm-lock.yaml generated\n'
        : '  note: rerun with --install to generate pnpm-lock.yaml\n'),
  )
}

main().catch((error) => {
  process.stderr.write(`\nTemplate export failed:\n${error.message}\n`)
  process.exitCode = 1
})
