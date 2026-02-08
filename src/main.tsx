import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './global.css'
import App from './App'
import { loadOnboardingState, markPlaygroundCreated } from './core/state/onboardingState'
import { spaceManager } from './core/state/SpaceManager'
import { glyphBuilderAdapter } from './core/storage/GlyphBuilderAdapter'

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

// Hydrate generated glyph registry from persisted builder outputs.
glyphBuilderAdapter.init();

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
