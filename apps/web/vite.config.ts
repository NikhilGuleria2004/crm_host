import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@crm/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@crm/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@crm/config': path.resolve(__dirname, '../../packages/config/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
