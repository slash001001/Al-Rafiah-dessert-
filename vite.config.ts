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
    // Transpile to support older Safari (13) that lacks optional chaining/nullish coalescing
    target: ['es2018', 'safari13'],
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
