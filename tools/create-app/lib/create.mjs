import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'
import process from 'node:process'

import { configureApp, hasFeatures, normalizeFeatures, readVersionManifest } from './configure.mjs'
import { frameworks } from './registry.mjs'

const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb']

const GLOBAL_CSS_CANDIDATES = [
  'src/styles/global.css',
  'src/styles/globals.css',
  'src/styles/main.css',
  'src/style/global.css',
  'src/global.css',
  'global.css',
  'src/app/globals.css',
  'app/globals.css',
  'styles/globals.css',
  'src/assets/main.css',
  'src/app.css',
  'src/routes/layout.css',
  'assets/css/main.css',
  'app/assets/css/main.css',
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

const run = (command, args, cwd, { label, interactive = false } = {}) =>
  new Promise((resolve, reject) => {
    process.stdout.write(`\n> ${label ?? `${command} ${args.join(' ')}`}\n`)
    const env = { ...process.env }
    if (interactive) delete env.CI
    else env.CI = '1'

    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env,
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${label ?? command} exited with code ${code}`))
    })
  })

const scaffold = async (framework, stagingDir, defaults) => {
  const flags = defaults ? framework.defaultFlags : framework.interactiveFlags
  const args = framework.args('app', flags)
  await run('pnpm', ['dlx', framework.package, ...args], stagingDir, {
    label: `Scaffolding ${framework.label} app`,
    interactive: !defaults,
  })

  const appDir = join(stagingDir, 'app')
  if (!(await exists(appDir))) {
    throw new Error('External generator did not create the app directory.')
  }
  return appDir
}

const prepareApp = async (appDir, meta) => {
  for (const file of LOCKFILES) await rm(join(appDir, file), { force: true })
  await rm(join(appDir, 'pnpm-workspace.yaml'), { force: true })
  await rm(join(appDir, 'node_modules'), { recursive: true, force: true })
  await rm(join(appDir, '.git'), { recursive: true, force: true })

  const manifestPath = join(appDir, 'package.json')
  const manifest = await readJson(manifestPath)
  manifest.name = meta.packageName
  manifest.private = true
  manifest.version = manifest.version ?? '0.1.0'
  await writeJson(manifestPath, manifest)
}

const removeAppWorkspaceFile = async (appDir) => {
  await rm(join(appDir, 'pnpm-workspace.yaml'), { force: true })
}

const findGlobalCss = async (appDir) => {
  for (const candidate of GLOBAL_CSS_CANDIDATES) {
    if (await exists(join(appDir, candidate))) return candidate
  }
  return null
}

const packageNameFromSpec = (spec) => {
  if (spec.startsWith('@')) {
    const versionAt = spec.indexOf('@', 1)
    return versionAt === -1 ? spec : spec.slice(0, versionAt)
  }
  const versionAt = spec.lastIndexOf('@')
  return versionAt <= 0 ? spec : spec.slice(0, versionAt)
}

const resolveTheme = (theme, versions) => {
  if (theme.startsWith('@') || theme.includes('/')) {
    const packageName = packageNameFromSpec(theme)
    return { package: packageName, spec: theme, stylesheet: `${packageName}/style.css` }
  }

  const packageName = `@ezhana/design-theme-${theme}`
  const version = versions.get(packageName)
  if (!version) {
    throw new Error(
      `Unknown theme "${theme}". Available themes: ${[...versions.keys()]
        .filter((name) => name.startsWith('@ezhana/design-theme-'))
        .map((name) => name.replace('@ezhana/design-theme-', ''))
        .join(', ')}.`,
    )
  }
  return {
    package: packageName,
    spec: `${packageName}@^${version}`,
    stylesheet: `${packageName}/style.css`,
  }
}

const injectTheme = async (appDir, resolved) => {
  const cssFile = await findGlobalCss(appDir)
  if (!cssFile) {
    process.stderr.write(
      `\nSkipping theme "${resolved.package}": no global CSS found. Tried:\n` +
        GLOBAL_CSS_CANDIDATES.map((candidate) => `  - ${candidate}`).join('\n') +
        '\n',
    )
    return null
  }

  const cssPath = join(appDir, cssFile)
  const css = await readFile(cssPath, 'utf8')
  if (css.includes('@ezhana/')) {
    process.stderr.write(
      `\nSkipping theme "${resolved.package}": ${cssFile} already imports an Ezhana theme.\n`,
    )
    return null
  }

  await writeFile(cssPath, `@import '${resolved.stylesheet}';\n\n${css}`)
  process.stdout.write(`\nInjected ${resolved.package} into ${cssFile}.\n`)
  return resolved
}

const installAppDependencies = async (appDir) => {
  await run('pnpm', ['install', '--no-frozen-lockfile'], appDir, {
    label: 'Installing generated app dependencies',
  })
  await removeAppWorkspaceFile(appDir)
}

const installThemeDependencies = async (appDir, spec) => {
  await run('pnpm', ['add', spec], appDir, { label: 'Installing theme dependency' })
  await removeAppWorkspaceFile(appDir)
}

const verify = async (appDir, features) => {
  if (features.eslint) {
    await run('pnpm', ['exec', 'eslint', '.'], appDir, { label: 'Linting generated app' })
  } else {
    const manifest = await readJson(join(appDir, 'package.json'))
    if (manifest.scripts?.lint) {
      await run('pnpm', ['lint'], appDir, { label: 'Linting generated app' })
    }
  }
  await run('pnpm', ['build'], appDir, { label: 'Building generated app' })
}

export const createApp = async ({
  framework,
  target,
  defaults = false,
  install: shouldInstall = true,
  verify: shouldVerify = true,
  theme = null,
  keepTemp = false,
  features = {},
}) => {
  const recipe = frameworks[framework]
  if (!recipe) {
    throw new Error(
      `Unknown framework "${framework}". Available frameworks: ${Object.keys(frameworks).join(', ')}.`,
    )
  }

  const selected = normalizeFeatures(features)
  const versions = theme ? (await readVersionManifest()).versions : null
  const themeSpec = theme ? resolveTheme(theme, versions) : null
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
  const meta = {
    packageName: slugify(title),
    title,
  }

  let movedTarget = false
  try {
    process.stdout.write(`Creating ${recipe.label} app in ${targetPath}\n`)
    if (!defaults) process.stdout.write('The official scaffolder will prompt for its options.\n')

    await scaffold(recipe, stagingDir, defaults)
    await prepareApp(appDir, meta)

    await rename(appDir, targetPath)
    movedTarget = true

    let themeResult = null
    if (themeSpec) themeResult = await injectTheme(targetPath, themeSpec)

    if (shouldInstall) {
      if (themeResult) await installThemeDependencies(targetPath, themeResult.spec)
      else await installAppDependencies(targetPath)

      if (hasFeatures(selected)) {
        await configureApp({
          target: targetPath,
          framework,
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
      if (themeResult) {
        process.stdout.write(
          `\nDependencies were not added. Run:\n\n  cd ${targetPath}\n  pnpm add ${themeResult.spec}\n`,
        )
      } else {
        process.stdout.write(
          `\nDependencies were not added. Run:\n\n  cd ${targetPath}\n  pnpm install\n`,
        )
      }
      if (hasFeatures(selected)) {
        await configureApp({
          target: targetPath,
          framework,
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
