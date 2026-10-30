#!/usr/bin/env node
/**
 * CLI for `@ezhana/theme-builder`.
 *
 * Usage:
 *   theme-builder [build] [--config ./theme.config.mjs] [--cwd <dir>]
 *
 * The theme package's `build` script normally calls the programmatic API directly; the CLI exists
 * for ad-hoc builds and for package managers that prefer a binary.
 */
import process from 'node:process'

import { buildTheme } from '../index.js'

const USAGE = `Usage: theme-builder [build] [--config <path>] [--cwd <dir>]

  --config <path>  Theme config file. Defaults to ./theme.config.mjs
  --cwd <dir>      Base directory for --config. Defaults to the current directory
  -h, --help       Show this help
`

const parseArgs = (argv) => {
  const args = { config: 'theme.config.mjs', cwd: process.cwd() }
  const rest = [...argv]

  if (rest[0] === 'build') rest.shift()

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]
    if (arg === '-h' || arg === '--help') return { help: true }
    if (arg === '--config' || arg === '--cwd') {
      const value = rest[index + 1]
      if (!value) throw new Error(`${arg} requires a value.`)
      args[arg === '--config' ? 'config' : 'cwd'] = value
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(USAGE)
    return
  }

  const result = await buildTheme(args.config, { cwd: args.cwd })
  process.stdout.write(
    `Theme "${result.id}" (${result.label}) built in ${result.cwd}\n` +
      Object.entries(result.outputs)
        .map(([kind, path]) => `  ${kind}: ${path}`)
        .join('\n') +
      '\n',
  )
}

main().catch((error) => {
  process.stderr.write(`\nTheme build failed:\n${error.message}\n`)
  process.exitCode = 1
})
