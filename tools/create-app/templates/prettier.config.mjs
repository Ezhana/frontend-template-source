// Editable Prettier base for this app. It is self-contained on purpose: it does not import any
// @ezhana config package. Mirrors packages/prettier-config and template/prettier.config.mjs; keep the
// three copies in sync (ADR 0004).
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
