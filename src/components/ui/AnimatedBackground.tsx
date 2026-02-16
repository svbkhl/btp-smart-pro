import { motion } from "framer-motion";
import { memo } from "react";

/**
 * Composant AnimatedBackground - Arrière-plan animé pleine page
 * Dégradé du bas vers le haut + blobs animés
 * Optimisé pour la performance GPU avec will-change et transform
 */
export const AnimatedBackground = memo(() => {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0 min-h-screen min-w-full"
      style={{ 
        contain: 'layout style paint',
        willChange: 'transform',
        transform: 'translateZ(0)'
      }}
    >
      {/* Dégradé : du bas vers le milieu seulement - léger */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 h-1/2 min-w-full bg-gradient-to-t from-primary/20 via-purple-600/12 via-accent/10 to-transparent"
        animate={{
          opacity: [0.9, 1, 0.9],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        aria-hidden
      />
      
      {/* Blobs animés superposés */}
      {/* Blob 1 - Bleu/Cyan (milieu gauche) */}
      <motion.div
        className="absolute bottom-1/3 left-1/4 w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-blue-500/12 to-cyan-500/12 rounded-full blur-3xl"
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
      
      {/* Blob 2 - Violet/Rose (bas droite) */}
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-purple-500/12 to-pink-500/12 rounded-full blur-3xl"
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
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-72 md:w-96 md:h-96 bg-gradient-to-br from-primary/15 to-accent/15 rounded-full blur-3xl"
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
      
      {/* Blob 4 - AI Color (bas droite) */}
      <motion.div
        className="absolute bottom-1/3 right-1/3 w-48 h-48 md:w-60 md:h-60 bg-gradient-to-br from-[hsl(320_80%_60%)]/10 to-[hsl(320_80%_50%)]/10 rounded-full blur-3xl"
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
      
      {/* Blob 5 - Accent/Cyan (bas gauche) */}
      <motion.div
        className="absolute bottom-1/4 left-1/4 w-56 h-56 md:w-72 md:h-72 bg-gradient-to-br from-accent/12 to-cyan-500/12 rounded-full blur-3xl"
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
      
      {/* Blob 6 - Violet (bas droite) */}
      <motion.div
        className="absolute bottom-1/3 right-0 w-56 h-56 md:w-72 md:h-72 bg-gradient-to-br from-purple-600/12 to-primary/10 rounded-full blur-3xl"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
        animate={{
          x: [0, -40, 25, 0],
          y: [0, -35, 45, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 21,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />
      {/* L'ancien grid pattern a été retiré pour correspondre au style de la homepage */}
    </div>
  );
});

AnimatedBackground.displayName = "AnimatedBackground";
