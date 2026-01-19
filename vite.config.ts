import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
// Note: Vite charge automatiquement les fichiers .env s'ils existent
// Sur Vercel, les variables d'environnement sont fournies via le processus
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
  // Vite charge automatiquement les variables d'environnement
  // Si .env n'existe pas, il utilise les variables du processus (Vercel)
  envPrefix: 'VITE_',
});

