import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Optional self-signed cert for testing on phones over the local network.
// Create with the openssl command in README.md; .cert/ is git-ignored.
const devHttps = existsSync('.cert/key.pem') && existsSync('.cert/cert.pem')
  ? { key: readFileSync('.cert/key.pem'), cert: readFileSync('.cert/cert.pem') }
  : undefined;
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Less Phone, More Life',
        short_name: 'Less Phone',
        description: 'One small real-life challenge a day. Do it, write it, grow.',
        theme_color: '#f4efe4',
        background_color: '#f4efe4',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,wasm}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    https: devHttps,
    // Lets phones reach the dev server through an HTTPS tunnel (cloudflared or ngrok).
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'],
  },
  test: {
    environment: 'node',
  },
});
