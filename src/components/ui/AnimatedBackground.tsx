import { motion } from "framer-motion";
import { memo } from "react";

/**
 * Composant AnimatedBackground - Arrière-plan animé avec formes flottantes
 * Style similaire à la homepage avec blobs animés et gradients
 * Optimisé pour la performance GPU avec will-change et transform
 * 
 * REMARQUE: Le grid pattern a été supprimé pour un look plus moderne et fluide
 */
export const AnimatedBackground = memo(() => {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      style={{ 
        contain: 'layout style paint',
        willChange: 'transform',
        transform: 'translateZ(0)'
      }}
    >
      {/* Gradient blobs animés - Style homepage avec mouvements fluides */}
      
      {/* Blob 1 - Bleu/Cyan (haut gauche) */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-72 h-72 md:w-96 md:h-96 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, 40, -30, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Blob 2 - Violet/Rose (milieu droite) */}
      <motion.div
        className="absolute top-1/2 right-1/4 w-80 h-80 md:w-96 md:h-96 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 60, -40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      
      {/* Blob 3 - Primary/Accent (bas centre) */}
      <motion.div
        className="absolute bottom-1/4 left-1/2 w-72 h-72 md:w-80 md:h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -50, 35, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
      
      {/* Blob 4 - AI Color (haut droite) - Plus petit pour plus de profondeur */}
      <motion.div
        className="absolute top-1/3 right-1/3 w-56 h-56 md:w-72 md:h-72 bg-gradient-to-br from-[hsl(320_80%_60%)]/15 to-[hsl(320_80%_50%)]/15 rounded-full blur-3xl"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
        animate={{
          x: [0, -25, 20, 0],
          y: [0, 35, -25, 0],
          scale: [1, 1.25, 0.85, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />
      
      {/* Blob 5 - Accent/Cyan (bas gauche) - Pour plus de profondeur */}
      <motion.div
        className="absolute bottom-1/3 left-1/3 w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-accent/15 to-cyan-500/15 rounded-full blur-3xl"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
        animate={{
          x: [0, 35, -25, 0],
          y: [0, -45, 30, 0],
          scale: [1, 1.18, 0.92, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 6,
        }}
      />
      
      {/* NOTE: Grid pattern supprimé pour un look plus moderne et fluide */}
      {/* L'ancien grid pattern a été retiré pour correspondre au style de la homepage */}
    </div>
  );
});

AnimatedBackground.displayName = "AnimatedBackground";
