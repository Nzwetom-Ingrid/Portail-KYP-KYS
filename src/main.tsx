import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PowerProvider from './PowerProvider.tsx'
import { LangProvider } from './i18n/i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
  <PowerProvider>
    <LangProvider>
      <App />
    </LangProvider>
  </PowerProvider>
  </StrictMode>,
)
