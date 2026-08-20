import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/audio-browser-lab/' : '/',
  define: {
    __APP_COMMIT_SHA__: JSON.stringify(process.env.GITHUB_SHA || ''),
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: new URL('index.html', import.meta.url).pathname,
        devlog: new URL('devlog/index.html', import.meta.url).pathname,
        docs: new URL('docs/index.html', import.meta.url).pathname,
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
})
