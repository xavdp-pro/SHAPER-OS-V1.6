import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const hmrHost = process.env.VITE_HMR_HOST;
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || 443);

const proxyApi = {
  '/api': {
    target: 'http://127.0.0.1:7926',
    changeOrigin: true,
    ws: true,
  },
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icons/pwa-192.png', 'icons/pwa-512.png'],
      manifest: {
        name: 'KovZu',
        short_name: 'KovZu',
        description: 'Console multi-CLI KovZu — Cursor, Claude, voix',
        theme_color: '#0a0f1a',
        background_color: '#0a0f1a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/console',
        lang: 'fr',
        icons: [
          {
            src: 'icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      selfDestroying: true,
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 7923,
    strictPort: true,
    /** Évite cache Cloudflare / navigateur sur modules ESM en dev (HMR). */
    headers: {
      'Cache-Control': 'no-store',
      'Permissions-Policy': 'microphone=(self), camera=(self)',
    },
    allowedHosts: [
      'ia.szde.fr',
      '.szde.fr',
      'helm-v2.tools',
      'helm2.xavdp.pro',
      'agent-demo.xavdp.pro',
      'helm.xavdp.pro',
      '.xavdp.pro',
      'localhost',
      '127.0.0.1',
    ],
    /** Ne pas recharger le navigateur (mobile voix) sur docs / API / tests. */
    watch: {
      ignored: [
        '**/server/**',
        '**/data/**',
        '**/scripts/**',
        '**/mds/**',
        '**/.cursor/**',
        '**/rules/**',
        '**/timelines/**',
        '**/tmp/**',
        '**/*.md',
        '**/*.mdc',
        '**/*.test.js',
        '**/ecosystem.config.cjs',
        '**/ecosystem.prod.config.cjs',
        '**/.env*',
      ],
    },
    hmr: hmrHost
      ? { host: hmrHost, protocol: 'wss', clientPort: hmrClientPort }
      : { clientPort: 443 },
    proxy: process.env.VITE_STANDALONE === 'true' ? proxyApi : undefined,
  },
  preview: {
    host: '127.0.0.1',
    port: 7923,
    headers: {
      'Cache-Control': 'no-store',
      'Permissions-Policy': 'microphone=(self), camera=(self)',
    },
    allowedHosts: [
      'ia.szde.fr',
      '.szde.fr',
      'helm-v2.tools',
      'helm2.xavdp.pro',
      'agent-demo.xavdp.pro',
      'helm2.gbsinfo.org',
      'helm.xavdp.pro',
      '.xavdp.pro',
      '.gbsinfo.org',
      'localhost',
      '127.0.0.1',
    ],
    proxy: proxyApi,
  },
});
