import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Vérifier que l'élément root existe
const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial; text-align: center;">
      <h1 style="color: red;">Erreur : Élément #root introuvable</h1>
      <p>L'élément avec l'id "root" n'existe pas dans le fichier index.html</p>
    </div>
  `;
} else {
  try {
    createRoot(rootElement).render(<App />);
  } catch (error) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial; text-align: center;">
        <h1 style="color: red;">Erreur de démarrage</h1>
        <p>${error instanceof Error ? error.message : "Erreur inconnue"}</p>
        <p style="margin-top: 20px; color: #666;">Vérifiez la console pour plus de détails (F12)</p>
      </div>
    `;
  }
}
