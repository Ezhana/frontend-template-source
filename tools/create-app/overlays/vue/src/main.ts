import '@ezhana/design-tokens/style.css'
import '@ezhana/design-theme-ocean/fonts.css'
import '@ezhana/design-theme-ocean/theme.css'
import '@ezhana/design-theme-cerulean/fonts.css'
import '@ezhana/design-theme-cerulean/theme.css'
import './assets/main.css'
import './theme/theme.css'

import { createApp } from 'vue'

import ThemeRoot from './ThemeRoot.vue'

createApp(ThemeRoot).mount('#app')
