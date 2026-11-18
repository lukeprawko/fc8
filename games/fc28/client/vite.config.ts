import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    base: './',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'https://fc28-backend.plugames640.workers.dev')
    },
    resolve: {
      alias: {
        '@games/shared': path.resolve(__dirname, '../../../packages/shared/src')
      }
    },
    build: {
      outDir: 'dist',
      // Bezwzględny brak sourcemap w produkcji (ochrona kodu)
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd, // Usuwanie logów konsoli w produkcji
          drop_debugger: true,
          pure_funcs: isProd ? ['console.log', 'console.debug', 'console.info'] : []
        },
        mangle: {
          toplevel: true, // Obfuskacja nazw zmiennych najwyższego poziomu
          properties: false
        },
        format: {
          comments: false, // Usunięcie wszystkich komentarzy z kodu klienta
          preamble: '/* Copyright (c) 2026 Nova Games / CyberFC 28. All Rights Reserved. Protected by CF28-ORIGIN-SEC-SIG. */'
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three']
          }
        }
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
          ws: true
        }
      }
    }
  };
});
