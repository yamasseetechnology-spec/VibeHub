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
  esbuild: {
    pure: ['console.log'], // Strip console.log in production build
  },
  server: {
    open: true
  }
});
