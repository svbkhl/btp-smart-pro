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
  build: {
    rollupOptions: {
      output: {
        // Grouper les libs vendor en chunks stables mis en cache par le navigateur.
        // Chaque chunk lazy de page ne contient plus que son propre code.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul')) return 'vendor-ui';
          if (id.includes('@supabase') || id.includes('supabase-js')) return 'vendor-supabase';
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
          if (id.includes('lucide')) return 'vendor-icons';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          if (id.includes('date-fns') || id.includes('dayjs')) return 'vendor-date';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          return 'vendor-misc';
        },
      },
    },
  },
});
