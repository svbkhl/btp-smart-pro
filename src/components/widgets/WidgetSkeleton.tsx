import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";

interface WidgetSkeletonProps {
  className?: string;
}

/**
 * Skeleton de chargement pour les widgets
 * Style cohérent avec le design glassmorphism
 */
export const WidgetSkeleton = ({ className }: WidgetSkeletonProps) => {
  return (
    <GlassCard className={`p-6 ${className || ""}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32 bg-white/10 dark:bg-white/5" />
          <Skeleton className="h-8 w-8 rounded-lg bg-white/10 dark:bg-white/5" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-24 bg-white/10 dark:bg-white/5" />
          <Skeleton className="h-4 w-40 bg-white/10 dark:bg-white/5" />
        </div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-12 w-full rounded-lg bg-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      </div>
    </GlassCard>
  );
};

