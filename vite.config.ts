import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Al-Rafiah-dessert-/' : '/',
  server: { open: true },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'index-dev.html'),
      output: {
        manualChunks: {
          phaser: ['phaser']
        },
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
}));
