import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  ssr: {
    noExternal: ['react-quill']
  },
  optimizeDeps: {
    include: ['react-quill']
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Proxying API requests to the backend on Render
      '/api': {
        target: 'http://localhost:5000',  // Updated production URL
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxying WebSocket connections for socket.io
      '/socket.io': {
        target: 'http://localhost:5000',  // Updated production URL
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
