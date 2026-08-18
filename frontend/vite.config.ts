import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

/**
 * Refuses to produce a production bundle whose data mode was never chosen.
 *
 * Demo mode serves local fixtures and its login accepts any password of six
 * characters or more for the seeded personas — deliberate, and fine for UI
 * work. But demo is also what an unset VITE_DATA_MODE falls back to, so a
 * release built without env configuration would quietly ship that login.
 *
 * This runs in Node while the build is being configured, so a misconfigured
 * release fails in CI. The equivalent check inside application code could only
 * throw in the visitor's browser, which trades a silent bad build for a blank
 * page.
 */
function assertDataModeChosen(env: Record<string, string>, command: string): void {
  if (command !== 'build') return;

  const mode = env.VITE_DATA_MODE;
  if (mode === 'api' || mode === 'demo') return;

  throw new Error(
    mode
      ? `[Config Error] Invalid VITE_DATA_MODE="${mode}". Allowed values are "demo" or "api".`
      : '[Config Error] VITE_DATA_MODE must be set explicitly to build. Use VITE_DATA_MODE=api to ' +
        'build against the backend, or VITE_DATA_MODE=demo to deliberately build the fixture-backed demo.'
  );
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '.'), '');
  const port = parseInt(env.PORT || process.env.PORT || '3000', 10);

  assertDataModeChosen(env, command);

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
