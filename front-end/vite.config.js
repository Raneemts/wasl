import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'https://wasl-production-05b9.up.railway.app/api'
  const apiOrigin = apiUrl.replace(/\/api\/?$/, '')

  const apiProxy = {
    '/api': {
      target: apiOrigin,
      changeOrigin: true,
      secure: true,
    },
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    server: {
      proxy: apiProxy,
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 4173,
      allowedHosts: true,
      proxy: apiProxy,
    },
  }
})