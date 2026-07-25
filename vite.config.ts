import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  // Default base is "/" for local dev. GitHub Pages deploy overrides via
  // `npm run build -- --base /fri3d-web-flasher/` in .github/workflows/deploy-pages.yml.
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "favicon-96x96.png",
        "apple-touch-icon.png",
        "web-app-manifest-192x192.png",
        "web-app-manifest-512x512.png",
      ],
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
      },
    }),
  ],
});
