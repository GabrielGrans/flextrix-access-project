import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'

const proxy: Record<string, ProxyOptions> = {
  '/lab-api': {
    target: 'http://127.0.0.1:' + (process.env.FLEXTRIX_API_PORT || '8001'),
    rewrite: path => path.replace(/^\/lab-api(?=\/|$)/, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5174, proxy },
  preview: { port: 5174, proxy },
})
