import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts',
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/e2e/**',
            '**/playwright-report/**',
            '**/test-results/**',
            '**/playwright.config.*',
            '**/tests/**',
            '**/*.spec.js'
        ]
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})
