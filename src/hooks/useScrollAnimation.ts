import { useEffect, useRef, useState } from 'react';

/**
 * Hook pour animer les éléments au scroll
 * @param threshold - Seuil de visibilité (0 à 1)
 * @param rootMargin - Marge autour du root pour déclencher l'animation
 * @returns [ref, isVisible] - Référence à attacher à l'élément et état de visibilité
 */
export const useScrollAnimation = (
  threshold: number = 0.1,
  rootMargin: string = '0px'
) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Une fois visible, on peut arrêter d'observer
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin]);

  return [ref, isVisible] as const;
};

