import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env.PORT || process.env.PORT || '3000', 10);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('leaflet')) {
                return 'vendor-leaflet';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-genai';
              }
              if (id.includes('lucide-react') || id.includes('canvas-confetti')) {
                return 'vendor-ui';
              }
              // React and the router change far less often than product code;
              // keeping them in their own chunk lets browsers reuse them across
              // deploys instead of re-downloading them inside the app bundle.
              if (
                id.includes('/react-dom/') ||
                id.includes('/react/') ||
                id.includes('/react-router') ||
                id.includes('/scheduler/')
              ) {
                return 'vendor-react';
              }
              return 'vendor';
            }

            // Large, side-effect-free datasets. They are pulled in eagerly by the
            // header (taxonomy) and the repositories (demo fixtures), so isolating
            // them keeps the app shell chunk readable and separately cacheable.
            if (id.includes('/domains/taxonomy/taxonomy.data')) {
              return 'data-taxonomy';
            }
            if (id.includes('/mocks/initialDemoData')) {
              return 'data-demo';
            }
          },
        },
      },
    },
  };
});
