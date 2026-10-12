import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const projectRoot = import.meta.dirname;

/**
 * The API Gateway (http://localhost:8080) does not send CORS headers, so the
 * browser cannot call it cross-origin from the dev server. We proxy `/api`
 * through Vite instead, which keeps the backend completely untouched.
 *
 * `VITE_API_BASE_URL` therefore defaults to `/api` (same-origin, proxied).
 * Point it straight at http://localhost:8080 only if you add CORS to the gateway.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(projectRoot, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      /*
       * Notification WebSocket.
       *
       * Kept same-origin for the browser and forwarded to the gateway, which
       * proxies on to notification-service. `changeOrigin` rewrites Host but
       * leaves Origin intact, which matters: the gateway checks Origin against
       * its allow-list to block cross-site socket hijacking.
       */
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
