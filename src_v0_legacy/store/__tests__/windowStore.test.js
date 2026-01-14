import { describe, it, expect, beforeEach } from 'vitest'
import { useWindowStore } from '../windowStore'

describe('windowStore', () => {
    beforeEach(() => {
        // Reset store before each test
        useWindowStore.setState({
            windows: {},
            focusedWindowId: null
        })
    })

    it('starts with empty windows', () => {
        const state = useWindowStore.getState()
        expect(state.windows).toEqual({})
        expect(state.focusedWindowId).toBeNull()
    })

    it('opens a window correctly', () => {
        const { openWindow } = useWindowStore.getState()

        openWindow('test-window', {
            title: 'Test Window',
            glyph: '✓',
            data: { test: true }
        })

        const state = useWindowStore.getState()
        expect(state.windows['test-window']).toBeDefined()
        expect(state.windows['test-window'].isOpen).toBe(true)
        expect(state.windows['test-window'].title).toBe('Test Window')
    })

    it('closes a window correctly', () => {
        const { openWindow, closeWindow } = useWindowStore.getState()

        openWindow('test-window', { title: 'Test' })
        closeWindow('test-window')

        const state = useWindowStore.getState()
        expect(state.windows['test-window'].isOpen).toBe(false)
    })

    it('updates window position correctly', () => {
        const { openWindow, updateWindowPosition } = useWindowStore.getState()

        openWindow('test-window', { title: 'Test' })
        updateWindowPosition('test-window', { x: 100, y: 200 })

        const state = useWindowStore.getState()
        expect(state.windows['test-window'].position).toEqual({ x: 100, y: 200 })
    })

    it('focuses a window correctly', () => {
        const { openWindow, focusWindow } = useWindowStore.getState()

        openWindow('window-1', { title: 'Window 1' })
        openWindow('window-2', { title: 'Window 2' })

        focusWindow('window-2')

        const state = useWindowStore.getState()
        expect(state.activeWindowId).toBe('window-2')
    })

    it('minimizes a window correctly', () => {
        const { openWindow, minimizeWindow } = useWindowStore.getState()

        openWindow('test-window', { title: 'Test' })
        minimizeWindow('test-window')

        const state = useWindowStore.getState()
        expect(state.windows['test-window'].isMinimized).toBe(true)
    })
})
