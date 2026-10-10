import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public-runtime',
  server: { host: '127.0.0.1' },
  build: { target: 'chrome80', chunkSizeWarningLimit: 800 },
});
