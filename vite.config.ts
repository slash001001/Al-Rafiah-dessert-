import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Al-Rafiah-dessert-/' : '/',
  server: {
    open: true
  }
}));
