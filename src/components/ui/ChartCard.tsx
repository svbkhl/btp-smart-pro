import { motion } from "framer-motion";
import { ReactNode, memo } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  action?: ReactNode;
}

/**
 * Composant ChartCard - Carte pour afficher des graphiques
 * Style cohérent avec animations
 * Optimisé avec React.memo
 */
const ChartCardComponent = ({
  title,
  description,
  children,
  className,
  delay = 0,
  action,
}: ChartCardProps) => {
  return (
    <GlassCard delay={delay} className={cn("p-6", className)}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {action && <div>{action}</div>}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, delay: delay + 0.2 }}
      >
        {children}
      </motion.div>
    </GlassCard>
  );
};

// Export avec React.memo pour optimiser les performances
export const ChartCard = memo(ChartCardComponent);



