import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ReactNode, memo } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";

interface KPIBlockProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
  delay?: number;
  gradient?: "blue" | "purple" | "green" | "orange" | "pink";
  color?: string;
}

/**
 * Composant KPIBlock - Bloc de métrique clé avec animation
 * Affiche une valeur avec icône, tendance et description
 * Optimisé avec React.memo pour éviter les re-renderings inutiles
 */
const KPIBlockComponent = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
  delay = 0,
  gradient = "blue",
}: KPIBlockProps) => {
  const gradientClasses = {
    blue: "from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20",
    purple: "from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20",
    green: "from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20",
    orange: "from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20",
    pink: "from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20",
  };

  const iconGradientClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    green: "text-green-600 dark:text-green-400",
    orange: "text-orange-600 dark:text-orange-400",
    pink: "text-pink-600 dark:text-pink-400",
  };

  return (
    <GlassCard delay={delay} className={cn("p-6", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15, delay: delay + 0.2 }}
            className="flex items-baseline gap-2"
          >
            <h3 className="text-3xl font-bold text-foreground">
              {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
            </h3>
            {trend && (
              <span
                className={cn(
                  "text-sm font-medium flex items-center gap-1",
                  trend.isPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
            )}
          </motion.div>
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        <div
          className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
            gradientClasses[gradient]
          )}
        >
          <Icon className={cn("w-6 h-6", iconGradientClasses[gradient])} />
        </div>
      </div>
    </GlassCard>
  );
};

// Export avec React.memo pour optimiser les performances
export const KPIBlock = memo(KPIBlockComponent);



