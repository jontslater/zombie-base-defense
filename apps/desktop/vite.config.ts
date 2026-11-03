import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: ".",
  publicDir: "../../assets",
  resolve: {
    alias: {
      "@zbd/sim": path.resolve(__dirname, "../../packages/sim/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: ["../.."],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
