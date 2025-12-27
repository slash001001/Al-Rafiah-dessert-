import { defineConfig } from "vite";
import path from "path";

export default defineConfig(({ command }) => ({
  // GH Pages serves from /Al-Rafiah-dessert-/
  base: command === "build" ? "/Al-Rafiah-dessert-/" : "/",
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "index-dev.html"),
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
        manualChunks: {
          vendor: ["phaser"]
        }
      }
    }
  }
}));
