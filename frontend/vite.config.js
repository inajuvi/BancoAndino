import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /casos y /health se redirigen al backend para evitar problemas de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/casos': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
