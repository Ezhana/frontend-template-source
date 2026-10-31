import { spawn } from 'node:child_process'
import { cp, readFile, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { recipes } from '../recipes/index.mjs'

const toolRoot = dirname(dirname(fileURLToPath(import.meta.url)))

export const FEATURES = {
  eslint: {
    label: 'ESLint base config',
    description: 'Write eslint.config.mjs and add the ESLint dependencies.',
  },
  prettier: {
    label: 'Prettier base config',
    description: 'Write prettier.config.mjs/.prettierignore and add Prettier.',
  },
}

export const normalizeFeatures = (features = {}) => {
  for (const key of Object.keys(features)) {
    if (!(key in FEATURES)) throw new Error(`Unknown feature "${key}".`)
  }
  return {
    eslint: Boolean(features.eslint),
    prettier: Boolean(features.prettier),
  }
}

export const hasFeatures = (features) => features.eslint || features.prettier

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

export const readVersionManifest = async () => {
  const manifest = await readJson(join(toolRoot, 'versions.json'))
  const versions = new Map(Object.entries(manifest.packages ?? {}))
  const catalog = manifest.catalog ?? {}

  for (const name of [
    'eslint',
    'prettier',
    'typescript',
    '@eslint/js',
    'eslint-config-prettier',
    'globals',
  ]) {
    if (!catalog[name]) throw new Error(`versions.json is missing the "${name}" catalog version.`)
  }

  return { versions, catalog }
}

const run = (command, args, cwd, label) =>
  new Promise((resolvePromise, reject) => {
    process.stdout.write(`\n> ${label ?? `${command} ${args.join(' ')}`}\n`)
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, CI: '1' },
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`${label ?? command} exited with code ${code}`))
    })
  })

const detectFramework = (manifest, target) => {
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
  const hasReact = Boolean(dependencies.react)
  const hasVue = Boolean(dependencies.vue)

  if (hasReact && !hasVue) return 'react'
  if (hasVue && !hasReact) return 'vue'

  throw new Error(`Could not determine the framework for ${target}. Pass --template <react|vue>.`)
}

const catalogVersion = (catalog, name) => {
  const version = catalog[name]
  if (!version) throw new Error(`versions.json is missing the "${name}" catalog version.`)
  return version
}

const eslintSpecs = (recipe, catalog) => [
  `eslint@${catalogVersion(catalog, 'eslint')}`,
  `@eslint/js@${catalogVersion(catalog, '@eslint/js')}`,
  `eslint-config-prettier@${catalogVersion(catalog, 'eslint-config-prettier')}`,
  `globals@${catalogVersion(catalog, 'globals')}`,
  // typescript-eslint needs a compatible TypeScript; the official scaffold may ship a newer major.
  `typescript@${catalogVersion(catalog, 'typescript')}`,
  ...Object.entries(recipe.eslintDependencies).map(([name, version]) => `${name}@${version}`),
]

const prettierSpecs = (catalog) => [`prettier@${catalogVersion(catalog, 'prettier')}`]

/**
 * Write the selected standalone configs into an existing app and add their dependencies.
 *
 * This intentionally does not inspect, remove, or rewrite existing configuration, dependencies or
 * scripts. It overwrites the files it owns and otherwise leaves the app alone.
 */
export const configureApp = async ({ target, template, features, install = true }) => {
  const selected = normalizeFeatures(features)
  if (!hasFeatures(selected)) {
    throw new Error(
      `No configuration features selected. Choose at least one of: ${Object.keys(FEATURES).join(', ')}.`,
    )
  }

  const targetPath = resolve(target)
  let manifest
  try {
    manifest = await readJson(join(targetPath, 'package.json'))
  } catch {
    throw new Error(`No package.json found in ${targetPath}. Point configure at an app directory.`)
  }

  const framework = template ?? detectFramework(manifest, targetPath)
  const recipe = recipes[framework]
  if (!recipe) {
    throw new Error(
      `Unknown template "${framework}". Available templates: ${Object.keys(recipes).join(', ')}.`,
    )
  }

  const { catalog } = await readVersionManifest()
  const files = []
  const specs = []

  if (selected.eslint) {
    await cp(
      join(toolRoot, 'templates', recipe.configureFiles.eslint),
      join(targetPath, 'eslint.config.mjs'),
      {
        force: true,
      },
    )
    files.push('eslint.config.mjs')
    specs.push(...eslintSpecs(recipe, catalog))
  }

  if (selected.prettier) {
    await cp(
      join(toolRoot, 'templates/prettier.config.mjs'),
      join(targetPath, 'prettier.config.mjs'),
      {
        force: true,
      },
    )
    await cp(join(toolRoot, 'templates/prettierignore'), join(targetPath, '.prettierignore'), {
      force: true,
    })
    files.push('prettier.config.mjs', '.prettierignore')
    specs.push(...prettierSpecs(catalog))
  }

  if (install) {
    await run('pnpm', ['add', '-D', ...specs], targetPath, 'Adding lint/format dependencies')
    // pnpm may materialise a minimumReleaseAge policy file for a standalone install; an app is
    // not a workspace root.
    await rm(join(targetPath, 'pnpm-workspace.yaml'), { force: true })
  }

  process.stdout.write(`\n${framework} app: wrote ${files.join(', ')}\n`)
  if (!install) {
    process.stdout.write(
      `\nDependencies were not added. Run:\n\n  cd ${targetPath}\n  pnpm add -D ${specs.join(' ')}\n`,
    )
  }
  process.stdout.write('\npackage.json scripts were not changed.\n')
  if (selected.eslint) {
    process.stdout.write(
      'Run `pnpm exec eslint .` or adjust your scripts yourself if you want `pnpm lint` to use it.\n',
    )
  }

  return { framework, files, specs }
}
