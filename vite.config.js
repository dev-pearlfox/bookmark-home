import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Unit tests cover pure logic only (no DOM), so the plain Node
    // environment is enough — and fast.
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
