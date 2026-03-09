import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  base: '/vibehub/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: './index.html'
    }
  },
  server: {
    open: true
  }
});
