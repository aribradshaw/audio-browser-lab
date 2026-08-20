import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Devlog from './Devlog'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Devlog />
  </StrictMode>,
)
