#!/usr/bin/env node
/**
 * Export the consumer-facing template repository from this development monorepo.
 *
 * The exported template is a workspace starter with an empty `apps/`; users choose React or Vue
 * with `pnpm create:app`. The command runs the published `create-ezhana-app` package, pinned as an
 * exact devDependency so the generated lockfile covers it — the generator is not vendored into the
 * template repository. Every `@ezhana/*` dependency resolved by the generator points at the
 * published npm version.
 *
 * Usage:
 *   node scripts/export-template.mjs [--out <dir>] [--install]
 *
 * --install runs `pnpm install --lockfile-only` in the generated directory so the exported
 * repository has a pnpm-lock.yaml. Run it after the @ezhana/* versions referenced by the template
 * and the create-ezhana-app version pinned in its devDependencies have been published to npm.
 */
import { spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

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

const readCreateAppVersion = async () => {
  const manifest = await readJson(join(sourceRoot, 'tools/create-app/package.json'))
  if (!manifest.version) {
    throw new Error('tools/create-app/package.json is missing a version.')
  }
  return manifest.version
}

const createRootManifest = async (outDir) => {
  const sourceRootManifest = await readJson(join(sourceRoot, 'package.json'))
  const versions = await readPublishedVersions()
  const createAppVersion = await readCreateAppVersion()

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
      'create:app': 'create-ezhana-app',
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
      'create-ezhana-app': createAppVersion,
      eslint: 'catalog:',
      'lint-staged': sourceRootManifest.devDependencies['lint-staged'],
      prettier: 'catalog:',
      'simple-git-hooks': sourceRootManifest.devDependencies['simple-git-hooks'],
      typescript: 'catalog:',
    },
  }

  await writeJson(join(outDir, 'package.json'), manifest)
  return createAppVersion
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
      // `tools/*` exists so the generator can be published from the source repo; the template
      // consumes the published package instead.
      content = content.replace(/^[ ]{2}- 'tools\/\*'\n/m, '')
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
  if (rootManifest.scripts?.['create:app'] !== 'create-ezhana-app') {
    problems.push('root create:app script must run the published create-ezhana-app package')
  }
  const createAppVersion = rootManifest.devDependencies?.['create-ezhana-app']
  if (
    typeof createAppVersion !== 'string' ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(createAppVersion)
  ) {
    problems.push('root create-ezhana-app devDependency must be an exact published version')
  }

  for (const file of ['packages/README.md', 'apps/README.md']) {
    if (!(await exists(join(outDir, file)))) problems.push(`${file} is missing`)
  }

  if (await exists(join(outDir, 'tools'))) {
    problems.push(
      'generated template must not vendor tools/; create:app uses the published package',
    )
  }
  const workspace = await readFile(join(outDir, 'pnpm-workspace.yaml'), 'utf8')
  if (workspace.includes("'tools/*'")) {
    problems.push('generated pnpm-workspace.yaml must not include the tools/* workspace glob')
  }

  const appEntries = await readdir(join(outDir, 'apps'), { withFileTypes: true })
  if (appEntries.some((entry) => entry.isDirectory())) {
    problems.push('generated template must not contain default apps')
  }

  if (problems.length > 0)
    throw new Error(`Generated template is invalid:\n- ${problems.join('\n- ')}`)
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

const installLockfile = (outDir, createAppVersion) => {
  const result = spawnSync('pnpm', ['install', '--lockfile-only', '--ignore-scripts'], {
    cwd: outDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    throw new Error(
      'pnpm install --lockfile-only failed. Publish the @ezhana/* package versions and ' +
        `create-ezhana-app@${createAppVersion} first, then rerun the export with --install.`,
    )
  }
}

const assertSourceToolIsPublishable = async () => {
  for (const file of ['package.json', 'bin/create-app.mjs', 'versions.json']) {
    if (!(await exists(join(sourceRoot, 'tools/create-app', file)))) {
      throw new Error(`tools/create-app/${file} is missing; the generator must stay publishable.`)
    }
  }
}

const main = async () => {
  const { outDir, install } = parseArgs()
  const resolvedOut = outDir.startsWith('/') ? outDir : join(sourceRoot, outDir)

  await assertSourceToolIsPublishable()

  await rm(resolvedOut, { recursive: true, force: true })
  await mkdir(resolvedOut, { recursive: true })

  await cp(skeletonDir, resolvedOut, { recursive: true })
  await copyRootFiles(resolvedOut)
  const createAppVersion = await createRootManifest(resolvedOut)
  await validateOutput(resolvedOut)

  if (install) installLockfile(resolvedOut, createAppVersion)
  formatOutput(resolvedOut)

  process.stdout.write(
    `Template exported to ${relative(sourceRoot, resolvedOut) || resolvedOut}\n` +
      '  apps: empty (create with pnpm create:app)\n' +
      '  packages: optional placeholder (README only; users add their own workspaces here)\n' +
      `  create:app: create-ezhana-app@${createAppVersion} (published package, pinned in devDependencies)\n` +
      (install
        ? '  pnpm-lock.yaml generated\n'
        : '  note: rerun with --install to generate pnpm-lock.yaml\n'),
  )
}

main().catch((error) => {
  process.stderr.write(`\nTemplate export failed:\n${error.message}\n`)
  process.exitCode = 1
})
