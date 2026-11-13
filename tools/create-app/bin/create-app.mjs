#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import { resolve } from 'node:path'
import process, { stdin, stdout } from 'node:process'

import { createApp } from '../lib/create.mjs'
import { frameworks, frameworkNames } from '../lib/registry.mjs'

const usage = `Usage: create-app [framework] [name] [options]

Create a Next.js, Vue, Astro, Nuxt or SvelteKit app under ./apps/<name> by default.
The official scaffolder runs interactively by default; pass --defaults for its registry defaults.
Lint/format files are opt-in with --eslint / --prettier. Theme CSS is opt-in with --theme.

Frameworks: ${frameworkNames.join(', ')}

Create options:
  --framework <name>  Framework name (alternative to the first positional argument)
  --name <name>       App directory name (alternative to the second positional argument)
  --target <path>     Explicit target directory (overrides apps/<name>)
  --root <path>       Workspace root used for the default apps/<name> path
  --defaults          Run the official scaffolder with the registry default flags
  --eslint            Write eslint.config.mjs and add the shared ESLint config package
  --prettier          Write prettier.config.mjs/.prettierignore and add the shared Prettier config
  --theme <name>      Inject a theme stylesheet into the app's global CSS and add its package
  --no-install        Scaffold only; do not install dependencies or verify
  --no-verify         Install dependencies but skip lint/build verification
  --keep-temp         Keep the staging directory when generation fails
  --list              List available frameworks
  -h, --help          Show this help

Examples:
  pnpm create:app
  pnpm create:app next my-app
  pnpm create:app next my-app --defaults
  pnpm create:app vue my-app --defaults --eslint --prettier
  pnpm create:app next my-app --defaults --theme ocean
`

const parseCreateArgs = (argv) => {
  const args = [...argv]
  const options = {
    install: true,
    verify: true,
    defaults: false,
    keepTemp: false,
    theme: null,
    features: { eslint: false, prettier: false },
  }
  const positional = []
  while (args.length > 0) {
    const arg = args.shift()
    if (arg === '-h' || arg === '--help') {
      options.help = true
    } else if (arg === '--list') {
      options.list = true
    } else if (arg === '--framework') {
      options.framework = args.shift()
    } else if (arg === '--name') {
      options.name = args.shift()
    } else if (arg === '--target') {
      options.target = args.shift()
    } else if (arg === '--root') {
      options.root = args.shift()
    } else if (arg === '--defaults') {
      options.defaults = true
    } else if (arg === '--eslint') {
      options.features.eslint = true
    } else if (arg === '--prettier') {
      options.features.prettier = true
    } else if (arg === '--theme') {
      const value = args.shift()
      if (!value || value.startsWith('-')) throw new Error('--theme requires a value.')
      options.theme = value
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
  options.framework = options.framework ?? positional.shift()
  options.name = options.name ?? positional.shift()
  if (positional.length > 0) throw new Error(`Unexpected arguments: ${positional.join(' ')}`)
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

const validateFramework = (framework) => {
  if (!framework || !frameworks[framework]) {
    throw new Error(
      `Unknown framework "${framework ?? ''}". Available frameworks: ${frameworkNames.join(', ')}.`,
    )
  }
}

const promptForMissing = async (options) => {
  if (stdin.isTTY !== true) {
    throw new Error(
      'Missing arguments and stdin is not a TTY. Pass a framework and app name, for example:\n\n' +
        '  pnpm create:app next my-app --defaults\n',
    )
  }

  const rl = createInterface({ input: stdin, output: stdout, terminal: true })
  try {
    if (!options.framework) {
      stdout.write('\nSelect a framework:\n')
      frameworkNames.forEach((name, index) => {
        stdout.write(`  ${index + 1}) ${frameworks[name].label}\n`)
      })
      const answer = (await rl.question('\nChoice [1]: ')).trim() || '1'
      const index = Number(answer)
      if (!Number.isInteger(index) || index < 1 || index > frameworkNames.length) {
        throw new Error(`Invalid choice "${answer}".`)
      }
      options.framework = frameworkNames[index - 1]
    }
    if (!options.name && !options.target) {
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
    for (const [name, framework] of Object.entries(frameworks)) {
      stdout.write(`${name}\t${framework.label}\n`)
    }
    return
  }

  if (!options.defaults && stdin.isTTY !== true) {
    throw new Error(
      'The official scaffolder needs a TTY for interactive mode. Pass --defaults for ' +
        'non-interactive generation.\n',
    )
  }

  if (!options.framework || (!options.name && !options.target)) {
    await promptForMissing(options)
  }

  validateFramework(options.framework)

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

const run = async () => {
  const argv = process.argv.slice(2)
  if (argv[0] === 'configure') {
    throw new Error(
      'The configure subcommand was removed. Pass --eslint, --prettier or --theme when creating the app.',
    )
  }
  await runCreate(argv)
}

run().catch((error) => {
  process.stderr.write(`\n${error.message}\n`)
  process.exitCode = 1
})
