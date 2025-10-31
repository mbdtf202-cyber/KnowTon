import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import App from './App.tsx'
import Web3Provider from './providers/Web3Provider'
import { registerServiceWorker } from './registerServiceWorker'
import { initPerformanceMonitoring } from './utils/performanceMonitoring'

// Initialize performance monitoring
initPerformanceMonitoring()

// Register service worker for PWA
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </StrictMode>,
)
