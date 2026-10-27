#!/usr/bin/env node
/**
 * Export the consumer-facing template repository from this development monorepo.
 *
 * Apps are generated with the same external-scaffolder pipeline as `pnpm create:app`; this repository
 * no longer keeps full sample apps. The exported template keeps `apps/` (both frameworks), an
 * optional `packages/` placeholder for the user's own packages, and resolves every `@ezhana/*`
 * dependency to the published npm version.
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

import { createApp } from '../tools/create-app/lib/create.mjs'

const sourceRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const skeletonDir = join(sourceRoot, 'template')
const defaultOut = join(sourceRoot, 'dist-template', 'frontend-template')

const APPS = [
  { template: 'react', directory: 'apps/react-vite' },
  { template: 'vue', directory: 'apps/vue-vite' },
]

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
    description: 'Frontend monorepo template with React and Vue apps and shared packages.',
    scripts: {
      lint: 'eslint . && pnpm --dir apps/react-vite lint && pnpm --dir apps/vue-vite lint',
      'lint:fix':
        'eslint . --fix && pnpm --dir apps/react-vite lint:fix && pnpm --dir apps/vue-vite lint:fix',
      format: 'prettier . --write',
      'format:check': 'prettier . --check',
      'build:packages': 'pnpm -r --filter "./packages/*" --if-present build',
      'build:apps': 'pnpm --dir apps/react-vite build && pnpm --dir apps/vue-vite build',
      build: 'pnpm build:packages && pnpm build:apps',
      'dev:react': 'pnpm --dir apps/react-vite dev',
      'dev:vue': 'pnpm --dir apps/vue-vite dev',
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
    await writeFile(join(outDir, file), content)
  }

  const vscodeDir = join(sourceRoot, '.vscode')
  if (await exists(vscodeDir)) {
    await cp(vscodeDir, join(outDir, '.vscode'), { recursive: true })
  }
}

const validateOutput = async (outDir) => {
  const problems = []
  const manifests = [
    join(outDir, 'package.json'),
    ...APPS.map((app) => join(outDir, app.directory, 'package.json')),
  ]
  for (const manifestPath of manifests) {
    const manifest = await readJson(manifestPath)
    const text = JSON.stringify(manifest)
    if (text.includes('workspace:')) {
      problems.push(`${relative(outDir, manifestPath)} still contains a workspace: dependency`)
    }
  }

  for (const app of APPS) {
    const manifest = await readJson(join(outDir, app.directory, 'package.json'))
    if (manifest.scripts?.predev || manifest.scripts?.prebuild) {
      problems.push(`${app.directory} still runs a local token build in predev/prebuild`)
    }
  }

  if (!(await exists(join(outDir, 'packages/README.md')))) {
    problems.push('packages/README.md placeholder is missing')
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

  for (const app of APPS) {
    await createApp({
      template: app.template,
      target: join(resolvedOut, app.directory),
      install: false,
      verify: false,
    })
  }

  await createRootManifest(resolvedOut)
  await validateOutput(resolvedOut)
  formatOutput(resolvedOut)

  if (install) installLockfile(resolvedOut)

  process.stdout.write(
    `Template exported to ${relative(sourceRoot, resolvedOut) || resolvedOut}\n` +
      `  apps: ${APPS.map((app) => app.directory).join(', ')} (generated)\n` +
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
