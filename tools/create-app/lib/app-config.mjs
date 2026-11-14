import { spawn } from 'node:child_process'
import { readFile, rm, writeFile } from 'node:fs/promises'
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

const publishedVersion = (versions, name) => {
  const version = versions.get(name)
  if (!version) {
    throw new Error(
      `versions.json is missing the published version of "${name}". Run pnpm sync:create-app; ` +
        'the config package must be published before an app can depend on it.',
    )
  }
  return `^${version}`
}

const eslintSpecs = (framework, catalog, versions) => {
  const specs = [
    `eslint@${catalogVersion(catalog, 'eslint')}`,
    `typescript@${catalogVersion(catalog, 'typescript')}`,
    `${framework.eslintConfig}@${publishedVersion(versions, framework.eslintConfig)}`,
  ]

  // eslint-plugin-astro resolves the TypeScript parser from the app directory.
  if (framework.eslintConfig === '@ezhana/eslint-config-astro') {
    specs.push(`typescript-eslint@${catalogVersion(catalog, 'typescript-eslint')}`)
  }

  return specs
}

const prettierSpecs = (framework, catalog, versions) => [
  `prettier@${catalogVersion(catalog, 'prettier')}`,
  `@ezhana/prettier-config@${publishedVersion(versions, '@ezhana/prettier-config')}`,
  ...framework.prettierPlugins.map((plugin) => `${plugin}@${catalogVersion(catalog, plugin)}`),
]

const eslintConfigContent = (framework) =>
  `// ESLint config for this app. The shared rule set lives in the published
// ${framework.eslintConfig} package; update that dependency to get rule changes, or add
// app-specific overrides to the array below.
import config from '${framework.eslintConfig}'
import { defineConfig } from 'eslint/config'

export default defineConfig([...config])
`

// Turn a plugin package name into an import binding: prettier-plugin-astro -> astro,
// @prettier/plugin-xml -> xml.
const pluginBinding = (plugin) => {
  const base = plugin
    .replace(/^@[^/]+\//, '')
    .replace(/^prettier-plugin-/, '')
    .replace(/^plugin-/, '')
  return (
    base.replace(/[^a-zA-Z0-9]+(.)?/g, (_, char) => (char ? char.toUpperCase() : '')) || 'plugin'
  )
}

const prettierConfigContent = (framework) => {
  if (framework.prettierPlugins.length === 0) {
    return `// Prettier config for this app. The shared options live in the published
// @ezhana/prettier-config package; update that dependency to get option changes, or add
// app-specific overrides here.
export { default } from '@ezhana/prettier-config'
`
  }

  // Import plugins as modules instead of listing their names: Prettier resolves plugin *names*
  // against the process cwd, which is the workspace root when the root `format` script or
  // lint-staged runs, and the plugin is only installed in the app. A module import is resolved
  // relative to this file, so it works from any cwd.
  const imports = framework.prettierPlugins.map(
    (plugin) => `import * as ${pluginBinding(plugin)} from '${plugin}'`,
  )
  const plugins = framework.prettierPlugins.map(pluginBinding).join(', ')
  return `// Prettier config for this app. The shared options live in the published
// @ezhana/prettier-config package; update that dependency to get option changes, or add
// app-specific overrides here.
// The plugins are imported as modules on purpose: Prettier resolves plugin names against the
// process cwd, so names break when the root format script or lint-staged runs them from the
// workspace root. Module imports are resolved from this app's node_modules instead.
import config from '@ezhana/prettier-config'
${imports.join('\n')}

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

  const { catalog, versions } = await readVersionManifest()
  const files = []
  const specs = []

  if (selected.eslint) {
    await writeFile(join(targetPath, 'eslint.config.mjs'), eslintConfigContent(recipe))
    files.push('eslint.config.mjs')
    specs.push(...eslintSpecs(recipe, catalog, versions))
  }

  if (selected.prettier) {
    await writeFile(join(targetPath, 'prettier.config.mjs'), prettierConfigContent(recipe))
    await writeFile(
      join(targetPath, '.prettierignore'),
      await readFile(join(toolRoot, 'templates/prettierignore'), 'utf8'),
    )
    files.push('prettier.config.mjs', '.prettierignore')
    specs.push(...prettierSpecs(recipe, catalog, versions))
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
    '\nThe rules live in the published @ezhana/eslint-config-* and @ezhana/prettier-config packages; ' +
      'bump those dependencies to pick up rule changes.\n',
  )
  process.stdout.write('package.json scripts were not changed.\n')
  if (selected.eslint) {
    process.stdout.write(
      'Run `pnpm exec eslint .` or adjust your scripts yourself if you want `pnpm lint` to use it.\n',
    )
  }

  return { framework, files, specs }
}
