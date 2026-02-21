import path from 'path';
import { readFileSync } from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Disable minification so "Cannot access 'X' before initialization" shows the real variable name.
      minify: false,
      rollupOptions: {
        output: {
          // Do NOT inline dynamic imports: keep lazy-loaded modules in separate chunks so they don't run at startup.
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) return undefined; // keep React in entry
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 2000,
    },
  };
});
