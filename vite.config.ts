import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charger les variables d'environnement de manière sécurisée
  // Ne pas échouer si .env n'existe pas (cas Vercel/production)
  let env = {};
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      env = loadEnv(mode, __dirname, '');
    }
  } catch (error) {
    // Ignorer les erreurs de lecture .env (normal en production Vercel)
    console.warn('⚠️ Could not load .env file (this is normal in production):', error instanceof Error ? error.message : error);
  }

  return {
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
    // Utiliser les variables d'environnement chargées ou celles du système
    envPrefix: 'VITE_',
  };
});

