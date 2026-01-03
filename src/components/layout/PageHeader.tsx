import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, action, className }: PageHeaderProps) => {
  return (
    <div className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};




















