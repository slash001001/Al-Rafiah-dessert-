import { defineConfig } from 'vite';

export default defineConfig({
  // Use repo subpath for GitHub Pages
  base: '/Al-Rafiah-dessert-/',
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
