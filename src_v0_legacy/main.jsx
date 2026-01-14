// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // StrictMode disabled to prevent double-render issues with node creation
  // <StrictMode>
  <App />
  // </StrictMode>,
)
