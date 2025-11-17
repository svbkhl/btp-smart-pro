import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Écoute sur toutes les interfaces réseau
    port: 5173,
    strictPort: false, // Permet d'utiliser un autre port si 5173 est occupé
    open: false, // Ne pas ouvrir automatiquement le navigateur
    cors: true, // Active CORS pour Safari
    hmr: {
      protocol: "ws",
      host: "localhost",
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
