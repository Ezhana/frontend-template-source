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

import { configureApp, hasFeatures, normalizeFeatures, readVersionManifest } from './configure.mjs'
import { recipes } from '../recipes/index.mjs'

const toolRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb']
const THEME_PACKAGES = [
  '@ezhana/design-tokens',
  '@ezhana/theme',
  '@ezhana/design-theme-ocean',
  '@ezhana/design-theme-cerulean',
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

const prepareApp = async (appDir, meta) => {
  for (const file of LOCKFILES) await rm(join(appDir, file), { force: true })
  await rm(join(appDir, 'node_modules'), { recursive: true, force: true })
  await rm(join(appDir, '.git'), { recursive: true, force: true })

  const manifestPath = join(appDir, 'package.json')
  const manifest = await readJson(manifestPath)
  manifest.name = meta.packageName
  manifest.private = true
  manifest.version = manifest.version ?? '0.1.0'
  await writeJson(manifestPath, manifest)
}

const applyOverlay = async (recipe, appDir, meta) => {
  const overlayDir = join(toolRoot, recipe.overlay)
  await cp(overlayDir, appDir, { recursive: true, force: true })

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

const themeSpecs = (versions) =>
  THEME_PACKAGES.map((name) => {
    const version = versions.get(name)
    if (!version) throw new Error(`Missing published version for ${name}.`)
    return `${name}@^${version}`
  })

const installThemeDependencies = async (appDir, versions) => {
  await run('pnpm', ['add', ...themeSpecs(versions)], appDir, 'Installing theme dependencies')
  await removeAppWorkspaceFile(appDir)
}

const verify = async (appDir, features) => {
  if (features.eslint) {
    await run('pnpm', ['exec', 'eslint', '.'], appDir, 'Linting generated app')
  } else {
    const manifest = await readJson(join(appDir, 'package.json'))
    if (manifest.scripts?.lint) await run('pnpm', ['lint'], appDir, 'Linting generated app')
  }
  await run('pnpm', ['build'], appDir, 'Building generated app')
}

export const createApp = async ({
  template,
  target,
  install: shouldInstall = true,
  verify: shouldVerify = true,
  keepTemp = false,
  features = {},
}) => {
  const recipe = recipes[template]
  if (!recipe) {
    throw new Error(
      `Unknown template "${template}". Available templates: ${Object.keys(recipes).join(', ')}.`,
    )
  }

  const selected = normalizeFeatures(features)
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
  const { versions } = await readVersionManifest()
  const meta = {
    versions,
    packageName: slugify(title),
    title,
  }

  let movedTarget = false
  try {
    process.stdout.write(`Creating ${recipe.label} app in ${targetPath}\n`)
    await scaffold(recipe, stagingDir)
    await prepareApp(appDir, meta)
    await applyOverlay(recipe, appDir, meta)

    // Move before installing so that, inside a template workspace, the new app is part of
    // apps/* when pnpm resolves the workspace and installs its dependencies.
    await rename(appDir, targetPath)
    movedTarget = true

    if (shouldInstall) {
      await installThemeDependencies(targetPath, versions)
      if (hasFeatures(selected)) {
        await configureApp({
          target: targetPath,
          template,
          features: selected,
          install: true,
        })
        await removeAppWorkspaceFile(targetPath)
      }
      if (shouldVerify) {
        await verify(targetPath, selected)
        await removeAppWorkspaceFile(targetPath)
      }
    } else {
      process.stdout.write(
        `\nDependencies were not added. Run:\n\n  cd ${targetPath}\n` +
          `  pnpm add ${themeSpecs(versions).join(' ')}\n`,
      )
      if (hasFeatures(selected)) {
        await configureApp({
          target: targetPath,
          template,
          features: selected,
          install: false,
        })
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
