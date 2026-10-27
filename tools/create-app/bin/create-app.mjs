#!/usr/bin/env node
import process from 'node:process'

import { createApp } from '../lib/create.mjs'
import { recipes } from '../recipes/index.mjs'

const usage = `Usage: create-app <template> <target> [options]

Templates: ${Object.keys(recipes).join(', ')}

Options:
  --template <name>  Template name (alternative to the first positional argument)
  --no-install       Scaffold and overlay only; do not install dependencies
  --no-verify        Install dependencies but skip formatting/lint/build
  --keep-temp        Keep the staging directory when generation fails
  -h, --help         Show this help
`

const parseArgs = (argv) => {
  const args = [...argv]
  const options = { install: true, verify: true, keepTemp: false }
  const positional = []
  while (args.length > 0) {
    const arg = args.shift()
    if (arg === '-h' || arg === '--help') {
      process.stdout.write(usage)
      process.exit(0)
    }
    if (arg === '--template') {
      options.template = args.shift()
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
  options.target = positional.shift()
  if (positional.length > 0) throw new Error(`Unexpected arguments: ${positional.join(' ')}`)
  if (!options.template || !options.target) throw new Error(`Missing arguments.\n\n${usage}`)
  return options
}

try {
  const options = parseArgs(process.argv.slice(2))
  await createApp(options)
} catch (error) {
  process.stderr.write(`\n${error.message}\n`)
  process.exitCode = 1
}
