import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        timeout: 60000,
        proxyTimeout: 60000,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // Suppress expected errors: ECONNRESET (client disconnected mid-stream)
            // and ECONNREFUSED (server not yet started). These are not fatal.
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return;
            console.error('[proxy error]', err.message);
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return;
            console.error('[socket proxy error]', err.message);
          });
        },
      },
    },

  },
});
