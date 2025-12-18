import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.js',
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/e2e/**',
            '**/playwright-report/**',
            '**/test-results/**',
            '**/playwright.config.*'
        ]
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})
