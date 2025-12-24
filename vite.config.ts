import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // GH Pages serves from /Al-Rafiah-dessert-/
  base: command === "build" ? "/Al-Rafiah-dessert-/" : "/",
}));
