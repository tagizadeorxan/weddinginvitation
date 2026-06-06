import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  root: ".",
  base: mode === "pages" ? "/weddinginvitation/" : "/",
  publicDir: "public",
  build: {
    outDir: mode === "pages" ? "../docs" : "dist",
    emptyOutDir: mode === "pages",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        checkout: resolve(__dirname, "checkout.html"),
        success: resolve(__dirname, "success.html"),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
}));
