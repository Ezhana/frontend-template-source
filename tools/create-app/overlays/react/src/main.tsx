import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@ezhana/design-tokens/css/tokens.css'
import '@ezhana/design-theme-ocean/style'
import '@ezhana/design-theme-cerulean/style'
import './index.css'
import './theme/theme.css'
import ThemeRoot from './ThemeRoot'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeRoot />
  </StrictMode>,
)
