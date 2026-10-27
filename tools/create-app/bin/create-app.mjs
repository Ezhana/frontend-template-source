#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import process, { stdin, stdout } from 'node:process'
import { resolve } from 'node:path'

import { createApp } from '../lib/create.mjs'
import { recipes } from '../recipes/index.mjs'

const templateNames = Object.keys(recipes)

const usage = `Usage: create-app [template] [name] [options]

Creates an app under ./apps/<name> by default.

Templates: ${templateNames.join(', ')}

Options:
  --template <name>  Template name (alternative to the first positional argument)
  --name <name>      App directory name (alternative to the second positional argument)
  --target <path>    Explicit target directory (overrides apps/<name>)
  --root <path>      Workspace root used for the default apps/<name> path
  --no-install       Scaffold and overlay only; do not install dependencies
  --no-verify        Install dependencies but skip formatting/lint/build
  --keep-temp        Keep the staging directory when generation fails
  --list             List available templates
  -h, --help         Show this help

Examples:
  pnpm create:app
  pnpm create:app react my-app
  pnpm create:app vue my-app --no-verify
`

const parseArgs = (argv) => {
  const args = [...argv]
  const options = { install: true, verify: true, keepTemp: false }
  const positional = []
  while (args.length > 0) {
    const arg = args.shift()
    if (arg === '-h' || arg === '--help') {
      stdout.write(usage)
      process.exit(0)
    }
    if (arg === '--list') {
      options.list = true
    } else if (arg === '--template') {
      options.template = args.shift()
    } else if (arg === '--name') {
      options.name = args.shift()
    } else if (arg === '--target') {
      options.target = args.shift()
    } else if (arg === '--root') {
      options.root = args.shift()
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
      const answer = (await rl.question(`\nChoice [1]: `)).trim() || '1'
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

const run = async () => {
  const options = parseArgs(process.argv.slice(2))

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

run().catch((error) => {
  process.stderr.write(`\n${error.message}\n`)
  process.exitCode = 1
})
