import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],

    /**
     * Strip diagnostics from the shipped bundle.
     *
     * This matters more here than the equivalent ProGuard rule does for the
     * Java side: assets/public/*.js is plain, readable JavaScript inside the
     * APK, so every console call is both a live logcat leak and a comment
     * explaining the internals to anyone who unzips it. `debugger` goes too --
     * a stray one would trap anyone attaching devtools, and Capacitor leaves
     * WebView debugging enabled on debug builds.
     *
     * Errors thrown are unaffected; only the logging calls are removed.
     */
    esbuild: isProduction ? { drop: ['console', 'debugger'] } : undefined,

    build: {
      // No source maps in release: they would ship the original TypeScript,
      // including the anti-cheat thresholds, next to the bundle.
      sourcemap: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
