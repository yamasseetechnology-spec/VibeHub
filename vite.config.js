import { defineConfig } from 'vite';

export default defineConfig({
  base: '/vibehub/',
  build: {
    outDir: 'dist',
    target: 'es2020',
  }
});
