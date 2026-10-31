#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import { resolve } from 'node:path'
import process, { stdin, stdout } from 'node:process'

import { configureApp, hasFeatures, normalizeFeatures } from '../lib/configure.mjs'
import { createApp } from '../lib/create.mjs'
import { recipes } from '../recipes/index.mjs'

const templateNames = Object.keys(recipes)

const usage = `Usage: create-app [template] [name] [options]
       create-app configure [target] [options]

Create a React or Vue app under ./apps/<name> by default.
Configuration files are not written unless a feature flag is given; run "configure" later for an
existing app.

Templates: ${templateNames.join(', ')}

Create options:
  --template <name>  Template name (alternative to the first positional argument)
  --name <name>      App directory name (alternative to the second positional argument)
  --target <path>    Explicit target directory (overrides apps/<name>)
  --root <path>      Workspace root used for the default apps/<name> path
  --eslint           Write eslint.config.mjs and add the shared ESLint config package
  --prettier         Write prettier.config.mjs/.prettierignore and add the shared Prettier config
  --no-install       Scaffold and overlay only; do not add dependencies or verify
  --no-verify        Add dependencies but skip lint/build verification
  --keep-temp        Keep the staging directory when generation fails
  --list             List available templates
  -h, --help         Show this help

Configure options:
  --target <path>    App directory (default: current directory)
  --template <name>  Framework override: ${templateNames.join(', ')}
  --eslint           Write eslint.config.mjs and add the shared ESLint config package
  --prettier         Write prettier.config.mjs/.prettierignore and add the shared Prettier config
  --no-install       Write config files only; print the pnpm add command
  -h, --help         Show configure help

Examples:
  pnpm create:app
  pnpm create:app react my-app
  pnpm create:app react my-app --eslint --prettier
  pnpm create:app configure apps/my-app --eslint --prettier
  pnpm create:app vue my-app --no-verify
`

const parseCreateArgs = (argv) => {
  const args = [...argv]
  const options = {
    install: true,
    verify: true,
    keepTemp: false,
    features: { eslint: false, prettier: false },
  }
  const positional = []
  while (args.length > 0) {
    const arg = args.shift()
    if (arg === '-h' || arg === '--help') {
      options.help = true
    } else if (arg === '--list') {
      options.list = true
    } else if (arg === '--template') {
      options.template = args.shift()
    } else if (arg === '--name') {
      options.name = args.shift()
    } else if (arg === '--target') {
      options.target = args.shift()
    } else if (arg === '--root') {
      options.root = args.shift()
    } else if (arg === '--eslint') {
      options.features.eslint = true
    } else if (arg === '--prettier') {
      options.features.prettier = true
    } else if (arg === '--no-install') {
      options.install = false
      options.verify = false
    } else if (arg === '--no-verify') {
      options.verify = false
    } else if (arg === '--keep-temp') {
      options.keepTemp = true
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}\n\n${usage}`)
    } else {
      positional.push(arg)
    }
  }
  options.template = options.template ?? positional.shift()
  options.name = options.name ?? positional.shift()
  if (positional.length > 0) throw new Error(`Unexpected arguments: ${positional.join(' ')}`)
  return options
}

const parseConfigureArgs = (argv) => {
  const args = [...argv]
  const options = {
    install: true,
    features: { eslint: false, prettier: false },
  }
  const positional = []
  while (args.length > 0) {
    const arg = args.shift()
    if (arg === '-h' || arg === '--help') {
      options.help = true
    } else if (arg === '--target') {
      options.target = args.shift()
    } else if (arg === '--template') {
      options.template = args.shift()
    } else if (arg === '--eslint') {
      options.features.eslint = true
    } else if (arg === '--prettier') {
      options.features.prettier = true
    } else if (arg === '--no-install') {
      options.install = false
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}\n\n${usage}`)
    } else {
      positional.push(arg)
    }
  }

  if (options.target && positional.length > 0) {
    throw new Error('Pass the app directory either positionally or with --target, not both.')
  }
  if (positional.length > 1) {
    throw new Error(`Unexpected arguments: ${positional.slice(1).join(' ')}`)
  }

  options.target = options.target ?? positional[0] ?? '.'
  return options
}

const validateName = (name) => {
  if (!name) throw new Error('App name is required.')
  if (name === '.' || name === '..' || name.includes('/') || name.includes('\\')) {
    throw new Error(`Invalid app name "${name}". Use a directory name without path separators.`)
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
    throw new Error(
      `Invalid app name "${name}". Use letters, numbers, dots, underscores or dashes, starting with a letter or number.`,
    )
  }
}

const promptForMissing = async (options) => {
  if (stdin.isTTY !== true) {
    throw new Error(
      'Missing arguments and stdin is not a TTY. Pass a template and app name, for example:\n\n' +
        '  pnpm create:app react my-app\n',
    )
  }

  const rl = createInterface({ input: stdin, output: stdout, terminal: true })
  try {
    if (!options.template) {
      stdout.write('\nSelect a framework:\n')
      templateNames.forEach((name, index) => {
        stdout.write(`  ${index + 1}) ${recipes[name].label}\n`)
      })
      const answer = (await rl.question('\nChoice [1]: ')).trim() || '1'
      const index = Number(answer)
      if (!Number.isInteger(index) || index < 1 || index > templateNames.length) {
        throw new Error(`Invalid choice "${answer}".`)
      }
      options.template = templateNames[index - 1]
    }
    if (!options.name) {
      const answer = (await rl.question('\nApp name [my-app]: ')).trim() || 'my-app'
      options.name = answer
    }
  } finally {
    rl.close()
  }
}

const runCreate = async (argv) => {
  const options = parseCreateArgs(argv)

  if (options.help) {
    stdout.write(usage)
    return
  }

  if (options.list) {
    for (const [name, recipe] of Object.entries(recipes)) {
      stdout.write(`${name}\t${recipe.label}\n`)
    }
    return
  }

  if (!options.template || (!options.name && !options.target)) {
    await promptForMissing(options)
  }

  if (!options.template || !recipes[options.template]) {
    throw new Error(
      `Unknown template "${options.template ?? ''}". Available templates: ${templateNames.join(', ')}.`,
    )
  }

  let target
  if (options.target) {
    target = resolve(options.target)
  } else {
    validateName(options.name)
    const root = options.root ? resolve(options.root) : process.cwd()
    target = resolve(root, 'apps', options.name)
  }

  await createApp({ ...options, target })
}

const runConfigure = async (argv) => {
  const options = parseConfigureArgs(argv)

  if (options.help) {
    stdout.write(usage)
    return
  }

  const selected = normalizeFeatures(options.features)
  if (!hasFeatures(selected)) {
    throw new Error(
      'No configuration features selected. Pass --eslint and/or --prettier.\n\n' + usage,
    )
  }

  if (options.template && !recipes[options.template]) {
    throw new Error(
      `Unknown template "${options.template}". Available templates: ${templateNames.join(', ')}.`,
    )
  }

  await configureApp({
    target: resolve(options.target),
    template: options.template,
    features: selected,
    install: options.install,
  })
}

const run = async () => {
  const argv = process.argv.slice(2)
  if (argv[0] === 'configure') {
    await runConfigure(argv.slice(1))
    return
  }
  await runCreate(argv)
}

run().catch((error) => {
  process.stderr.write(`\n${error.message}\n`)
  process.exitCode = 1
})
