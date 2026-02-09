import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
// Sur Vercel, les variables d'environnement sont fournies via process.env
// et n'ont pas besoin d'un fichier .env physique
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4000,
    host: true,
    strictPort: true, // Le port ne changera JAMAIS, erreur si occupé
  },
  // Préfixe pour les variables d'environnement accessibles côté client
  envPrefix: 'VITE_',
  // Charger .env et .env.local en dev ; sur Vercel les variables sont injectées au build
  envDir: process.env.VERCEL ? undefined : '.',
});

