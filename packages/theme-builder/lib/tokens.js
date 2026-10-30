/**
 * DTCG token-tree helpers shared by the theme builder pipeline.
 *
 * These mirror the helpers in `@ezhana/design-tokens`'s build script, but the two packages
 * intentionally have separate copies: the core build emits primitives and semantics, while the
 * theme build resolves overrides, so sharing code would couple two independently released
 * packages for ~100 lines.
 */
import { readFile } from 'node:fs/promises'

export const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isToken = (node) =>
  isPlainObject(node) && (Object.hasOwn(node, '$value') || Object.hasOwn(node, 'value'))

/** Drop file-level metadata such as `$description` / `$extensions`. */
export const stripRootMeta = (tree) =>
  Object.fromEntries(Object.entries(tree).filter(([key]) => !key.startsWith('$')))

/** Return the dot-joined paths of every token leaf in a token tree. */
export const tokenPaths = (tree, prefix = []) => {
  const paths = []
  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith('$')) continue
    const path = [...prefix, key]
    if (isToken(value)) {
      paths.push(path.join('.'))
    } else if (isPlainObject(value)) {
      paths.push(...tokenPaths(value, path))
    }
  }
  return paths
}

/** Merge token trees recursively; token-vs-token collisions are errors. */
export const mergeTrees = (trees, label = 'token') => {
  const merge = (target, source) => {
    for (const [key, value] of Object.entries(source)) {
      if (isToken(value)) {
        if (target[key] !== undefined) {
          throw new Error(`Duplicate ${label} "${key}" found while merging token sources.`)
        }
        target[key] = value
      } else if (isPlainObject(value)) {
        if (isToken(target[key])) {
          throw new Error(
            `${label} "${key}" is declared both as a token and as a group; a token cannot also ` +
              'contain other tokens.',
          )
        }
        target[key] = merge(isPlainObject(target[key]) ? target[key] : {}, value)
      } else {
        target[key] = value
      }
    }
    return target
  }
  return trees.reduce((result, tree) => merge(result, tree), {})
}

/** Collect every `{reference}` used in token `$value` entries. */
export const collectReferences = (tree) => {
  const references = new Set()
  const visitValue = (value) => {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/\{([^{}]+)\}/g)) references.add(match[1].trim())
    } else if (Array.isArray(value)) {
      value.forEach(visitValue)
    } else if (isPlainObject(value)) {
      Object.values(value).forEach(visitValue)
    }
  }
  const visitNode = (node) => {
    if (isToken(node)) {
      visitValue(node.$value ?? node.value)
    } else if (isPlainObject(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (!key.startsWith('$')) visitNode(value)
      }
    }
  }
  visitNode(tree)
  return references
}

export const toKebabCase = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

export const cssVariableName = (tokenPath) => `--${tokenPath.split('.').map(toKebabCase).join('-')}`

/**
 * Expand a flat `{ "a.b.c": { value, type } }` map (as published in
 * `@ezhana/design-tokens/json`) into a DTCG token tree.
 */
export const expandFlatTokens = (flat) => {
  const tree = {}
  for (const [path, token] of Object.entries(flat)) {
    const keys = path.split('.')
    let node = tree
    for (const key of keys.slice(0, -1)) {
      node[key] ??= {}
      node = node[key]
    }
    node[keys.at(-1)] = { $value: token.value, $type: token.type }
  }
  return tree
}

export const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
