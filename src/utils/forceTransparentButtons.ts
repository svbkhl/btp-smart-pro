/**
 * Script pour forcer la transparence sur tous les boutons de l'application
 * S'exécute après le rendu et surveille les nouveaux boutons créés
 */

let observerInstance: MutationObserver | null = null;
let styleObserverInstance: MutationObserver | null = null;
let intervalInstance: NodeJS.Timeout | null = null;

export const forceTransparentButtons = () => {
  const applyTransparency = (element: HTMLElement) => {
    if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
      // OVERRIDE TOTAL - Forcer la transparence via setProperty avec important
      element.style.setProperty('background-color', 'transparent', 'important');
      element.style.setProperty('background', 'transparent', 'important');
      element.style.setProperty('background-image', 'none', 'important');
      element.style.setProperty('border-color', 'transparent', 'important');
      element.style.setProperty('box-shadow', 'none', 'important');
      
      // Supprimer TOUTES les classes bg-* qui pourraient forcer un background
      const classes = element.className.split(' ').filter(Boolean);
      const filteredClasses = classes.filter(cls => {
        // Supprimer toutes les classes de background sauf bg-transparent
        if (cls.startsWith('bg-') && cls !== 'bg-transparent') {
          return false;
        }
        // Supprimer les classes de variantes colorées
        if (cls.includes('primary') && cls.includes('bg-')) return false;
        if (cls.includes('secondary') && cls.includes('bg-')) return false;
        if (cls.includes('filled') || cls.includes('solid')) return false;
        return true;
      });
      
      // Ajouter bg-transparent si pas déjà présent
      if (!filteredClasses.includes('bg-transparent')) {
        filteredClasses.push('bg-transparent');
      }
      
      element.className = filteredClasses.join(' ');
      
      // Forcer aussi sur les pseudo-éléments via CSS custom properties
      element.style.setProperty('--button-bg', 'transparent', 'important');
      element.style.setProperty('--button-bg-hover', 'rgba(255, 255, 255, 0.06)', 'important');
    }
  };

  // Appliquer à tous les boutons existants
  const allButtons = document.querySelectorAll('button, [role="button"]');
  allButtons.forEach(applyTransparency);

  // Observer les nouveaux boutons créés dynamiquement
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // Vérifier si c'est un bouton
          if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
            applyTransparency(element);
          }
          
          // Vérifier les boutons enfants
          const childButtons = element.querySelectorAll('button, [role="button"]');
          childButtons.forEach(applyTransparency);
        }
      });
    });
  });

  // Observer les changements d'attributs (style, class) - version améliorée
  if (!styleObserverInstance) {
    styleObserverInstance = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target) {
          const element = mutation.target as HTMLElement;
          if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
            applyTransparency(element);
          }
        }
      });
    });
  }

  // Démarrer l'observation du DOM
  if (!observerInstance) {
    observerInstance = observer;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  }

  // Observer les changements de style et de classe sur tous les boutons
  const observeButtonStyles = () => {
    const allButtonsForStyleObserver = document.querySelectorAll('button, [role="button"]');
    allButtonsForStyleObserver.forEach((button) => {
      if (styleObserverInstance) {
        try {
          styleObserverInstance.observe(button, {
            attributes: true,
            attributeFilter: ['style', 'class'],
          });
        } catch (e) {
          // Ignorer si déjà observé
        }
      }
    });
  };

  observeButtonStyles();

  // Réappliquer périodiquement pour être sûr (toutes les 500ms pour être plus réactif)
  if (intervalInstance) {
    clearInterval(intervalInstance);
  }
  intervalInstance = setInterval(() => {
    const buttons = document.querySelectorAll('button, [role="button"]');
    buttons.forEach(applyTransparency);
    // Réobserver les nouveaux boutons
    observeButtonStyles();
  }, 500);

  // Stocker les instances pour pouvoir les nettoyer
  observerInstance = observer;
  styleObserverInstance = styleObserverInstance || new MutationObserver(() => {});

  // Nettoyer au démontage (si nécessaire)
  return () => {
    if (observerInstance) {
      observerInstance.disconnect();
    }
    if (styleObserverInstance) {
      styleObserverInstance.disconnect();
    }
    if (intervalInstance) {
      clearInterval(intervalInstance);
    }
  };
};

