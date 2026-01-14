import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { loadOnboardingState, markPlaygroundCreated } from './core/state/onboardingState'
import { spaceManager } from './core/state/SpaceManager'

const rootElement = document.getElementById('root')
if (!rootElement) {
    throw new Error('Root element not found')
}

// Initialize Playground on first run
const onboardingState = loadOnboardingState();
if (!onboardingState.playgroundCreated) {
    spaceManager.ensureOnboardingSpaces();
    markPlaygroundCreated();
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
