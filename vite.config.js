import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // Important for Electron - use relative paths
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
      // Proxying API requests to the backend
      '/api': {
        target: process.env.NODE_ENV === 'production'
          ? 'https://senderappbackend.onrender.com' // Electron - local backend
          : 'https://senderappbackend.onrender.com', // Dev - local backend
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
        target: process.env.NODE_ENV === 'production'
          ? 'https://senderappbackend.onrender.com' // Electron - local backend
          : 'https://senderappbackend.onrender.com', // Dev - local backend
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable for production builds
    // Optimize for Electron
    rollupOptions: {
      output: {
        // Prevent code splitting to ensure everything loads correctly
        manualChunks: undefined,
        inlineDynamicImports: false,
      },
    },
  },
  define: {
    // Define environment variables for the app
    '__ELECTRON__': JSON.stringify(true),
    '__DEV__': JSON.stringify(process.env.NODE_ENV === 'development'),
  },
})
