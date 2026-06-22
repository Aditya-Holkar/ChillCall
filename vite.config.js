import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    configureServer: [async (server) => {
      const { default: handler } = await import('./api/proxy.mjs')

      server.middlewares.use('/api/proxy', async (req, res) => {
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            req.body = body ? JSON.parse(body) : {}
          } catch {
            req.body = {}
          }
          const url = new URL(req.url, 'http://localhost')
          req.query = Object.fromEntries(url.searchParams)
          handler(req, res)
        })
      })
    }],
  },
})
