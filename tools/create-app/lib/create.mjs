import { spawn } from 'node:child_process'
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { recipes } from '../recipes/index.mjs'

const toolRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const LINTER_FORMATTER_DEPENDENCY =
  /^(eslint($|-|\/)|@eslint\/|@typescript-eslint\/|@vue\/eslint-|eslint-plugin-|eslint-config-|oxlint$|prettier$|globals$|typescript-eslint$)/

const GENERATED_CONFIG_FILES = [
  '.oxlintrc.json',
  'oxlint.json',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintrc.yaml',
  '.eslintignore',
  'prettier.config.js',
  'prettier.config.mjs',
  'prettier.config.cjs',
  'prettier.config.ts',
  '.prettierrc',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.json',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  '.prettierignore',
]

const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb']
const OBSOLETE_SCRIPTS = [
  'lint',
  'lint:fix',
  'lint:check',
  'format',
  'format:check',
  'format:fix',
  'build-only',
  'type-check',
]

const exists = async (path) => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

const readVersionManifest = async () => {
  const manifest = await readJson(join(toolRoot, 'versions.json'))
  const versions = new Map(Object.entries(manifest.packages ?? {}))
  const catalog = manifest.catalog ?? {}

  if (!catalog.eslint || !catalog.prettier || !catalog.typescript) {
    throw new Error('versions.json is missing catalog versions.')
  }
  return { versions, catalog }
}

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'app'

const run = (command, args, cwd, label) =>
  new Promise((resolve, reject) => {
    process.stdout.write(`\n> ${label ?? `${command} ${args.join(' ')}`}\n`)
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, CI: '1' },
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${label ?? command} exited with code ${code}`))
    })
  })

const scaffold = async (recipe, stagingDir) => {
  await run('pnpm', ['dlx', recipe.scaffoldPackage, 'app', ...recipe.scaffoldArgs], stagingDir)
  const appDir = join(stagingDir, 'app')
  if (!(await exists(appDir)))
    throw new Error('External generator did not create the app directory.')
  return appDir
}

const normalize = async (recipe, appDir, meta) => {
  const manifestPath = join(appDir, 'package.json')
  const manifest = await readJson(manifestPath)

  for (const file of GENERATED_CONFIG_FILES) {
    await rm(join(appDir, file), { recursive: true, force: true })
  }
  for (const file of LOCKFILES) await rm(join(appDir, file), { force: true })
  await rm(join(appDir, 'node_modules'), { recursive: true, force: true })
  await rm(join(appDir, '.git'), { recursive: true, force: true })

  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const group = manifest[field]
    if (!group) continue
    for (const name of Object.keys(group)) {
      if (LINTER_FORMATTER_DEPENDENCY.test(name)) delete group[name]
    }
  }
  delete manifest.eslintConfig
  delete manifest.prettier

  for (const script of OBSOLETE_SCRIPTS) delete manifest.scripts?.[script]
  for (const name of recipe.removeDependencies ?? []) {
    delete manifest.dependencies?.[name]
    delete manifest.devDependencies?.[name]
  }

  manifest.name = meta.packageName
  manifest.private = true
  manifest.version = manifest.version ?? '0.1.0'
  manifest.scripts = {
    ...manifest.scripts,
    lint: 'eslint .',
    'lint:fix': 'eslint . --fix',
    format: 'prettier . --write',
    'format:check': 'prettier . --check',
    build: recipe.buildScript,
  }

  manifest.dependencies = {
    ...manifest.dependencies,
    '@ezhana/design-tokens': meta.versions.get('@ezhana/design-tokens')
      ? `^${meta.versions.get('@ezhana/design-tokens')}`
      : undefined,
    '@ezhana/theme': meta.versions.get('@ezhana/theme')
      ? `^${meta.versions.get('@ezhana/theme')}`
      : undefined,
    '@ezhana/design-theme-ocean': meta.versions.get('@ezhana/design-theme-ocean')
      ? `^${meta.versions.get('@ezhana/design-theme-ocean')}`
      : undefined,
    '@ezhana/design-theme-cerulean': meta.versions.get('@ezhana/design-theme-cerulean')
      ? `^${meta.versions.get('@ezhana/design-theme-cerulean')}`
      : undefined,
  }
  manifest.devDependencies = {
    ...manifest.devDependencies,
    [recipe.eslintConfig]: `^${meta.versions.get(recipe.eslintConfig)}`,
    '@ezhana/prettier-config': `^${meta.versions.get('@ezhana/prettier-config')}`,
    eslint: meta.catalog.eslint,
    prettier: meta.catalog.prettier,
    typescript: meta.catalog.typescript,
  }

  for (const [name, version] of Object.entries(manifest.dependencies)) {
    if (version === undefined) throw new Error(`Missing published version for ${name}.`)
  }
  for (const [name, version] of Object.entries(manifest.devDependencies)) {
    if (version === undefined) throw new Error(`Missing published version for ${name}.`)
  }

  await writeJson(manifestPath, manifest)
}

const OVERLAY_RENAMES = [
  ['eslint.config.mjs.template', 'eslint.config.mjs'],
  ['prettier.config.mjs.template', 'prettier.config.mjs'],
]

const applyOverlay = async (recipe, appDir, meta) => {
  const overlayDir = join(toolRoot, recipe.overlay)
  await cp(overlayDir, appDir, { recursive: true, force: true })
  for (const [from, to] of OVERLAY_RENAMES) {
    const fromPath = join(appDir, from)
    if (await exists(fromPath)) await rename(fromPath, join(appDir, to))
  }

  for (const [label, file] of [
    ['main entry', recipe.mainEntry],
    ['app entry', recipe.appEntry],
    ['style entry', recipe.styleEntry],
  ]) {
    if (!(await exists(join(appDir, file)))) {
      throw new Error(
        `Expected ${label} "${file}" from ${recipe.scaffoldPackage}, but it was not generated. ` +
          'Update the recipe/overlay for the external scaffold version.',
      )
    }
  }

  const indexHtmlPath = join(appDir, 'index.html')
  let html = await readFile(indexHtmlPath, 'utf8')
  if (html.includes('ezhana-theme')) {
    throw new Error('index.html already contains the theme init script.')
  }
  const snippet = await readFile(join(toolRoot, 'snippets/theme-init.html'), 'utf8')
  html = html.replace('</head>', `${snippet}\n  </head>`)
  html = html.replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`)
  await writeFile(indexHtmlPath, html)
}

const removeAppWorkspaceFile = async (appDir) => {
  // pnpm 12 may materialise a minimumReleaseAgeExclude policy file for a standalone install; the
  // generated app is not a workspace root.
  await rm(join(appDir, 'pnpm-workspace.yaml'), { force: true })
}

const install = async (appDir) => {
  // CI=1 is set for the non-interactive external scaffolders; do not let pnpm infer a frozen
  // lockfile here, because apps/<name> is a new workspace importer.
  await run('pnpm', ['install', '--no-frozen-lockfile'], appDir, 'Installing dependencies')
  await removeAppWorkspaceFile(appDir)
}

const verify = async (appDir) => {
  await run('pnpm', ['exec', 'prettier', '--write', '.'], appDir, 'Formatting generated app')
  await run('pnpm', ['lint'], appDir, 'Linting generated app')
  await run('pnpm', ['build'], appDir, 'Building generated app')
}

export const createApp = async ({
  template,
  target,
  install: shouldInstall = true,
  verify: shouldVerify = true,
  keepTemp = false,
}) => {
  const recipe = recipes[template]
  if (!recipe) {
    throw new Error(
      `Unknown template "${template}". Available templates: ${Object.keys(recipes).join(', ')}.`,
    )
  }

  const targetPath = target
  if (await exists(targetPath)) {
    const entries = await readdir(targetPath)
    if (entries.length > 0) throw new Error(`Target directory is not empty: ${targetPath}`)
    await rm(targetPath, { recursive: true, force: true })
  }

  await mkdir(dirname(targetPath), { recursive: true })
  const stagingDir = await mkdtemp(join(dirname(targetPath), '.create-app-'))
  const appDir = join(stagingDir, 'app')
  const title = basename(targetPath)
  const { versions, catalog } = await readVersionManifest()
  const meta = {
    versions,
    catalog,
    packageName: slugify(title),
    title,
  }

  let movedTarget = false
  try {
    process.stdout.write(`Creating ${recipe.label} app in ${targetPath}\n`)
    await scaffold(recipe, stagingDir)
    await normalize(recipe, appDir, meta)
    await applyOverlay(recipe, appDir, meta)

    // Move before installing so that, inside a template workspace, the new app is part of
    // apps/* when pnpm resolves the workspace and installs its dependencies.
    await rename(appDir, targetPath)
    movedTarget = true

    if (shouldInstall) {
      await install(targetPath)
      if (shouldVerify) {
        await verify(targetPath)
        await removeAppWorkspaceFile(targetPath)
      }
    }

    process.stdout.write(
      `\nCreated ${recipe.label} app at ${targetPath}\n\n` +
        `  cd ${relative(process.cwd(), targetPath) || targetPath}\n` +
        '  pnpm dev\n',
    )
  } catch (error) {
    if (keepTemp) {
      process.stderr.write(`\nGeneration failed. Staging directory kept at: ${stagingDir}\n`)
    }
    // The app was moved into place before install/verify (the workspace needs it at apps/<name>).
    // Remove the half-generated app so the same command can be retried against an empty target.
    if (movedTarget && !keepTemp) {
      await rm(targetPath, { recursive: true, force: true })
      process.stderr.write(
        `Removed the incomplete app at ${targetPath} so the command can be retried.\n`,
      )
    }
    throw error
  } finally {
    if (!keepTemp) await rm(stagingDir, { recursive: true, force: true })
  }
}
