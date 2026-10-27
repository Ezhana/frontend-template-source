#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readSourceVersions } from './lib/source-versions.mjs'

const sourceRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const versions = await readSourceVersions(sourceRoot)
const target = join(sourceRoot, 'tools/create-app/versions.json')
await writeFile(target, `${JSON.stringify(versions, null, 2)}\n`)
process.stdout.write(`Updated ${target}\n`)
