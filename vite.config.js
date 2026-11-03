import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '.' is the project root; avoids relying on a global `process`.
  const env = loadEnv(mode, '.', '')

  // The dev-server proxy is optional. It is only enabled when
  // VITE_API_PROXY_TARGET is set (e.g. http://localhost:5001), so no backend
  // host is hard-coded in the repository.
  const proxy = env.VITE_API_PROXY_TARGET
    ? {
        '/api': {
          target: env.VITE_API_PROXY_TARGET,
          changeOrigin: true,
        },
      }
    : undefined

  // Base path:
  //   - '/' is the default and works for Vercel/Netlify and `pnpm preview`.
  //   - GitHub Pages serves the app from a sub-path, so the Pages workflow
  //     sets VITE_BASE=/Iot_carrito_aws_frontend/.
  const base = env.VITE_BASE || '/'

  return {
    plugins: [react()],
    base,
    server: { proxy },
  }
})
