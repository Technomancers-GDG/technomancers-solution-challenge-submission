import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/driver-assets",
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "https://sim-backend-1029069183045.us-central1.run.app",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "wss://sim-backend-1029069183045.us-central1.run.app",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
