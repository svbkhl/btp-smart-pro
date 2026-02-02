import { cn } from "@/lib/utils";

interface SidebarSkeletonProps {
  isOpen?: boolean;
}

export function SidebarSkeleton({ isOpen = true }: SidebarSkeletonProps) {
  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-background border-r border-border transition-all duration-300 z-40",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Header skeleton */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
          {isOpen && (
            <div className="flex-1">
              <div className="h-4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Menu items skeleton */}
      <div className="p-4 space-y-2">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg bg-muted/50 animate-pulse",
              !isOpen && "justify-center"
            )}
          >
            <div className="w-5 h-5 bg-muted rounded" />
            {isOpen && <div className="h-4 bg-muted rounded flex-1" />}
          </div>
        ))}
      </div>

      {/* Footer skeleton */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        <div className={cn("flex items-center gap-3", !isOpen && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          {isOpen && (
            <div className="flex-1">
              <div className="h-3 bg-muted rounded animate-pulse mb-1" />
              <div className="h-2 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
