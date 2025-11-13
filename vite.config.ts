import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@rendering': path.resolve(__dirname, './src/rendering'),
      '@shaders': path.resolve(__dirname, './src/shaders'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@data': path.resolve(__dirname, './src/data'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
  },
});
