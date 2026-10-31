// Internal Prettier base. Keep it in sync with the standalone mirrors in
// tools/create-app/templates/prettier.config.mjs and template/prettier.config.mjs (ADR 0004).
export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
}
