export const recipes = {
  react: {
    label: 'React + TypeScript',
    scaffoldPackage: 'create-vite@9.3.3',
    scaffoldArgs: ['--template', 'react-ts', '--no-interactive', '--no-immediate', '--no-eslint'],
    mainEntry: 'src/main.tsx',
    styleEntry: 'src/index.css',
    appEntry: 'src/App.tsx',
    overlay: 'overlays/react',
    configureFiles: {
      eslint: 'eslint-react.config.mjs',
    },
    eslintDependencies: {
      '@eslint-react/eslint-plugin': '5.20.0',
      'eslint-plugin-react-hooks': '7.1.1',
      'typescript-eslint': '8.70.0',
    },
  },
  vue: {
    label: 'Vue + TypeScript',
    scaffoldPackage: 'create-vue@3.24.0',
    scaffoldArgs: ['--ts', '--force'],
    mainEntry: 'src/main.ts',
    styleEntry: 'src/assets/main.css',
    appEntry: 'src/App.vue',
    overlay: 'overlays/vue',
    configureFiles: {
      eslint: 'eslint-vue.config.mjs',
    },
    eslintDependencies: {
      'eslint-plugin-vue': '~10.11.0',
      'typescript-eslint': '8.70.0',
      'vue-eslint-parser': '10.4.1',
    },
  },
}
