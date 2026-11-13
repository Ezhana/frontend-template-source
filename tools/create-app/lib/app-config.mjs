import { spawn } from 'node:child_process'
import { readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { frameworks } from './registry.mjs'

const toolRoot = dirname(dirname(fileURLToPath(import.meta.url)))

export const FEATURES = {
  eslint: {
    label: 'ESLint config',
    description: 'Write eslint.config.mjs and add the shared ESLint config package.',
  },
  prettier: {
    label: 'Prettier config',
    description: 'Write prettier.config.mjs/.prettierignore and add the shared Prettier config.',
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

const exists = async (path) => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export const readVersionManifest = async () => {
  const manifest = await readJson(join(toolRoot, 'versions.json'))
  const versions = new Map(Object.entries(manifest.packages ?? {}))
  const catalog = manifest.catalog ?? {}

  for (const name of ['eslint', 'prettier', 'typescript']) {
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

const catalogVersion = (catalog, name) => {
  const version = catalog[name]
  if (!version) throw new Error(`versions.json is missing the "${name}" catalog version.`)
  return version
}

const eslintSpecs = (framework, catalog) => {
  const specs = [
    `eslint@${catalogVersion(catalog, 'eslint')}`,
    `typescript@${catalogVersion(catalog, 'typescript')}`,
    `${framework.eslintConfig}@workspace:*`,
  ]

  // eslint-plugin-astro resolves the TypeScript parser from the app directory.
  if (framework.eslintConfig === '@ezhana/eslint-config-astro') {
    specs.push(`typescript-eslint@${catalogVersion(catalog, 'typescript-eslint')}`)
  }

  return specs
}

const prettierSpecs = (framework, catalog) => [
  `prettier@${catalogVersion(catalog, 'prettier')}`,
  '@ezhana/prettier-config@workspace:*',
  ...framework.prettierPlugins.map((plugin) => `${plugin}@${catalogVersion(catalog, plugin)}`),
]

const findWorkspaceRoot = async (start) => {
  let dir = start
  while (true) {
    if (await exists(join(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

const readWorkspacePackageNames = async (workspaceRoot) => {
  let patterns = []
  try {
    const workspace = await readFile(join(workspaceRoot, 'pnpm-workspace.yaml'), 'utf8')
    const section = workspace.match(/^packages:\n((?: {2}- .*\n?)+)/m)?.[1] ?? ''
    for (const line of section.split('\n')) {
      const match = line.match(/^ {2}- ['"]?([^'"\s]+)['"]?\s*$/)
      if (match) patterns.push(match[1])
    }
  } catch {
    patterns = []
  }

  const names = new Set()
  const addManifest = async (dir) => {
    try {
      const manifest = await readJson(join(dir, 'package.json'))
      if (manifest.name) names.add(manifest.name)
    } catch {
      // A workspace entry without a manifest is not a package.
    }
  }

  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      const base = join(workspaceRoot, pattern.slice(0, -2))
      let entries
      try {
        entries = await readdir(base, { withFileTypes: true })
      } catch {
        continue
      }
      for (const entry of entries) {
        if (entry.isDirectory()) await addManifest(join(base, entry.name))
      }
    } else if (!pattern.includes('*')) {
      await addManifest(join(workspaceRoot, pattern))
    }
  }

  return names
}

const requiredConfigPackages = (features, framework) => {
  const names = []
  if (features.eslint) names.push(framework.eslintConfig)
  if (features.prettier) names.push('@ezhana/prettier-config')
  return names
}

const assertWorkspaceConfigPackages = async (targetPath, features, framework) => {
  const workspaceRoot = await findWorkspaceRoot(targetPath)
  if (!workspaceRoot) {
    throw new Error(
      `Could not find a pnpm workspace above ${targetPath}. Lint/format configuration composes ` +
        'the @ezhana config packages shipped in packages/; run inside the frontend-template ' +
        'workspace.',
    )
  }

  const names = await readWorkspacePackageNames(workspaceRoot)
  const missing = requiredConfigPackages(features, framework).filter((name) => !names.has(name))
  if (missing.length > 0) {
    throw new Error(
      `The workspace at ${workspaceRoot} is missing ${missing.join(', ')}. The frontend-template ` +
        'workspace ships these packages under packages/; run inside it instead of a standalone ' +
        'app directory.',
    )
  }

  return workspaceRoot
}

const eslintConfigContent = (framework) =>
  `// ESLint config for this app. The shared rule set lives in ${framework.eslintConfig} — edit
// that package to change rules for every app, or add app-specific overrides to the array below.
import config from '${framework.eslintConfig}'
import { defineConfig } from 'eslint/config'

export default defineConfig([...config])
`

const prettierConfigContent = (framework) => {
  if (framework.prettierPlugins.length === 0) {
    return `// Prettier config for this app. The shared options live in packages/prettier-config.
export { default } from '@ezhana/prettier-config'
`
  }

  const plugins = framework.prettierPlugins.map((plugin) => `'${plugin}'`).join(', ')
  return `// Prettier config for this app. The shared options live in packages/prettier-config.
import config from '@ezhana/prettier-config'

export default {
  ...config,
  plugins: [${plugins}],
}
`
}

export const applyConfig = async ({ target, framework, features, install = true }) => {
  const selected = normalizeFeatures(features)
  if (!hasFeatures(selected)) {
    throw new Error(
      `No configuration features selected. Choose at least one of: ${Object.keys(FEATURES).join(', ')}.`,
    )
  }

  const targetPath = resolve(target)
  const recipe = frameworks[framework]
  if (!recipe) {
    throw new Error(
      `Unknown framework "${framework}". Available frameworks: ${Object.keys(frameworks).join(', ')}.`,
    )
  }

  const { catalog } = await readVersionManifest()
  const workspaceRoot = await assertWorkspaceConfigPackages(targetPath, selected, recipe)
  const files = []
  const specs = []

  if (selected.eslint) {
    await writeFile(join(targetPath, 'eslint.config.mjs'), eslintConfigContent(recipe))
    files.push('eslint.config.mjs')
    specs.push(...eslintSpecs(recipe, catalog))
  }

  if (selected.prettier) {
    await writeFile(join(targetPath, 'prettier.config.mjs'), prettierConfigContent(recipe))
    await writeFile(
      join(targetPath, '.prettierignore'),
      await readFile(join(toolRoot, 'templates/prettierignore'), 'utf8'),
    )
    files.push('prettier.config.mjs', '.prettierignore')
    specs.push(...prettierSpecs(recipe, catalog))
  }

  if (install) {
    await run('pnpm', ['add', '-D', ...specs], targetPath, 'Adding lint/format dependencies')
    await rm(join(targetPath, 'pnpm-workspace.yaml'), { force: true })
  }

  process.stdout.write(`\n${recipe.label} app: wrote ${files.join(', ')}\n`)
  if (!install) {
    process.stdout.write(
      `\nDependencies were not added. Run:\n\n  cd ${targetPath}\n  pnpm add -D ${specs.join(' ')}\n`,
    )
  }
  process.stdout.write(
    '\nThe rules live in packages/eslint-config-* and packages/prettier-config; edit them there.\n',
  )
  process.stdout.write('package.json scripts were not changed.\n')
  if (selected.eslint) {
    process.stdout.write(
      'Run `pnpm exec eslint .` or adjust your scripts yourself if you want `pnpm lint` to use it.\n',
    )
  }

  return { framework, files, specs, workspaceRoot }
}
