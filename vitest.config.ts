import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'], // Charger les variables d'environnement
    testTimeout: 30000, // 30 secondes par test
    hookTimeout: 60000, // 60 secondes pour beforeAll/afterAll
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
