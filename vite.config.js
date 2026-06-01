import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Iot_carrito_aws_frontend/', // Base URL obligatoria para GitHub Pages
  server: {
    proxy: {
      '/api': {
        target: 'http://50.16.92.186:5001',
        changeOrigin: true,
      }
    }
  }
})
