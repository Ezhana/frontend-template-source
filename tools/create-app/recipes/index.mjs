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
  },
}
