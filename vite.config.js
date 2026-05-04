import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts')) return 'charts'
          if (id.includes('pdfjs-dist')) return 'pdf-vendor'
          if (id.includes('epubjs')) return 'epub-vendor'
          if (id.includes('tesseract.js')) return 'ocr-vendor'
          if (id.includes('@tauri-apps') || id.includes('tauri-plugin-sql-api')) return 'tauri-vendor'
          if (id.includes('framer-motion')) return 'motion-vendor'
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('react-router-dom') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
