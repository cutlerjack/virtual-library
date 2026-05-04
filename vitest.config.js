import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'scripts/**/*.{test,spec}.{js,mjs}',
    ],
    exclude: [
      'node_modules',
      'dist',
      'src-tauri',
      '.tmp-bookshelf-ts-site',
      '**/.*',
    ],
    setupFiles: ['src/test/setupTests.js'],
  },
})
