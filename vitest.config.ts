import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true, // Explicitly enable globals (this is true by default)
    environment: 'node', // Or 'jsdom' if your tests need a browser-like environment
  },
})