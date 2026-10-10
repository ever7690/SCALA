import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public-runtime',
  server: { host: '127.0.0.1' },
  build: { target: 'es2022', chunkSizeWarningLimit: 800 },
});
