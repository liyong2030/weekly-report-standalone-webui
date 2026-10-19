import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [vue(), viteSingleFile()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5180,
    host: "127.0.0.1",
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/auth": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
  },
});
