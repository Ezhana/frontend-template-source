#!/usr/bin/env node
/**
 * Export the consumer-facing template repository from this development monorepo.
 *
 * The exported template is a workspace starter with an empty `apps/`; users choose a framework
 * with `pnpm create:app`. The command runs the published `create-ezhana-app` package, pinned as an
 * exact devDependency so the generated lockfile covers it — the generator is not vendored into the
 * template repository. The `@ezhana` lint/format config packages are published to npm and pinned as
 * regular semver devDependencies, exactly like the theme packages the generator installs.
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
]

// The generated template root composes these published packages as normal devDependencies. They are
// not copied into the template: the source repository below `packages/` is their only home.
const ROOT_CONFIG_PACKAGES = {
  '@ezhana/eslint-config-base': 'eslint-config-base',
  '@ezhana/prettier-config': 'prettier-config',
}

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

const readCreateAppVersion = async () => {
  const manifest = await readJson(join(sourceRoot, 'tools/create-app/package.json'))
  if (!manifest.version) {
    throw new Error('tools/create-app/package.json is missing a version.')
  }
  return manifest.version
}

const readPackageVersion = async (dir) => {
  const manifest = await readJson(join(sourceRoot, 'packages', dir, 'package.json'))
  if (!manifest.version) {
    throw new Error(`packages/${dir}/package.json is missing a version.`)
  }
  return manifest.version
}

const readRootConfigVersions = async () => {
  const versions = {}
  for (const [name, dir] of Object.entries(ROOT_CONFIG_PACKAGES)) {
    versions[name] = await readPackageVersion(dir)
  }
  return versions
}

const createRootManifest = async (outDir) => {
  const sourceRootManifest = await readJson(join(sourceRoot, 'package.json'))
  const createAppVersion = await readCreateAppVersion()
  const configVersions = await readRootConfigVersions()

  const manifest = {
    name: 'frontend-template',
    private: true,
    description: 'Frontend monorepo starter; choose a framework with pnpm create:app.',
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
      '@ezhana/eslint-config-base': `^${configVersions['@ezhana/eslint-config-base']}`,
      '@ezhana/prettier-config': `^${configVersions['@ezhana/prettier-config']}`,
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
      // The source repository links local @ezhana/* packages for matching semver ranges so
      // create:app can be tested before a release. The template ships no local config packages,
      // so remove the whole marked block and let the ranges resolve from npm.
      content = content.replace(
        /\n# BEGIN source-only workspace linking[\s\S]*?# END source-only workspace linking\n/,
        '\n',
      )
      content = content.replace(/\n+$/, '\n')
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
  const configVersions = await readRootConfigVersions()

  const checkNoWorkspaceDependencies = (label, manifest) => {
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    }
    for (const [name, spec] of Object.entries(dependencies)) {
      if (typeof spec === 'string' && spec.startsWith('workspace:')) {
        problems.push(
          `${label}: ${name} must be a published semver dependency, not workspace:; the template ships no config sources`,
        )
      }
    }
  }

  const rootManifest = await readJson(join(outDir, 'package.json'))
  const dependencies = { ...rootManifest.dependencies, ...rootManifest.devDependencies }
  checkNoWorkspaceDependencies('package.json', rootManifest)
  for (const [name, version] of Object.entries(configVersions)) {
    if (dependencies[name] !== `^${version}`) {
      problems.push(`root devDependencies must include ${name}@^${version}`)
    }
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

  // The config packages are npm dependencies now; any directory here would be a vendored copy.
  const packageEntries = await readdir(join(outDir, 'packages'), { withFileTypes: true })
  for (const entry of packageEntries) {
    if (entry.isDirectory()) {
      problems.push(
        `packages/${entry.name} must not be vendored; the shared config packages are npm dependencies`,
      )
    }
  }

  for (const [file, packageName] of [
    ['eslint.config.mjs', '@ezhana/eslint-config-base'],
    ['prettier.config.mjs', '@ezhana/prettier-config'],
  ]) {
    const path = join(outDir, file)
    if (!(await exists(path))) {
      problems.push(`${file} is missing`)
      continue
    }
    const content = await readFile(path, 'utf8')
    if (!content.includes(packageName)) {
      problems.push(`${file} must compose the published ${packageName} package`)
    }
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
  for (const file of [
    'package.json',
    'bin/create-app.mjs',
    'versions.json',
    'lib/registry.mjs',
    'templates/prettierignore',
  ]) {
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
  const configVersions = await readRootConfigVersions()
  await validateOutput(resolvedOut)

  if (install) installLockfile(resolvedOut, createAppVersion)
  formatOutput(resolvedOut)

  process.stdout.write(
    `Template exported to ${relative(sourceRoot, resolvedOut) || resolvedOut}\n` +
      '  apps: empty (create with pnpm create:app)\n' +
      '  packages: empty workspace package slots (no vendored configs)\n' +
      `  lint/format: @ezhana/eslint-config-base@^${configVersions['@ezhana/eslint-config-base']}, ` +
      `@ezhana/prettier-config@^${configVersions['@ezhana/prettier-config']} (npm devDependencies)\n` +
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
