import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import BlueSlateConsole from '@/components/blue-slate-console'
import '@/app/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BlueSlateConsole />
  </StrictMode>,
)
