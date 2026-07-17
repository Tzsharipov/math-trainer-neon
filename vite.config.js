import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync } from 'fs'
export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        admin: resolve(__dirname, 'admin.html'),
        settings: resolve(__dirname, 'settings.html'),
        basics: resolve(__dirname, 'basics.html'),
        multiplication: resolve(__dirname, 'multiplication.html'),
        division: resolve(__dirname, 'division.html'),
      },
    },
  },
  server: {
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true
    }
  },
  plugins: [{
    closeBundle() {
      copyFileSync('netlify.toml', 'dist/netlify.toml')
    }
  }]
})