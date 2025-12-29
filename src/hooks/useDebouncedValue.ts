import { useState, useEffect } from 'react';

/**
 * Hook pour debouncer une valeur
 * Utile pour les champs de recherche, évite les re-calculs à chaque frappe
 * 
 * @param value - La valeur à debouncer
 * @param delay - Le délai en millisecondes (défaut: 300ms)
 * @returns La valeur debouncée
 * 
 * @example
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebouncedValue(search, 300);
 * 
 * // debouncedSearch ne change que 300ms après la dernière frappe
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Créer un timer qui mettra à jour la valeur après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si value change avant la fin du délai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}


















