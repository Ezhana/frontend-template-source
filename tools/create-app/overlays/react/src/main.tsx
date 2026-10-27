import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/public-sans'
import '@ezhana/design-tokens/css/tokens.css'
import './index.css'
import './theme/theme.css'
import ThemeRoot from './ThemeRoot'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeRoot />
  </StrictMode>,
)
