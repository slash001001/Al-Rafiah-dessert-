import { defineConfig } from "vite";
import path from "path";

export default defineConfig(({ command }) => ({
  // GH Pages serves from /Al-Rafiah-dessert-/
  base: command === "build" ? "/Al-Rafiah-dessert-/" : "/",
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "index-dev.html"),
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        manualChunks: {
          vendor: ["phaser"]
        }
      }
    }
  }
}));
