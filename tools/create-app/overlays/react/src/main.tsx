import '@ezhana/design-tokens/style.css'
import '@ezhana/design-theme-ocean/fonts.css'
import '@ezhana/design-theme-ocean/theme.css'
import '@ezhana/design-theme-cerulean/fonts.css'
import '@ezhana/design-theme-cerulean/theme.css'
import './index.css'
import './theme/theme.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import ThemeRoot from './ThemeRoot'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeRoot />
  </StrictMode>,
)
