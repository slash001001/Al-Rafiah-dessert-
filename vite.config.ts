import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative paths so the app works under GitHub Pages subpaths
  base: './',
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: '/index.html',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@levels': '/levels',
      '@game': '/game',
      '@src': '/src',
    },
  },
});
