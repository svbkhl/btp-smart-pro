import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 sm:h-10 w-full rounded-lg sm:rounded-xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/10 backdrop-blur-md px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base ring-offset-background file:border-0 file:bg-transparent file:text-xs sm:file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-white/10 dark:focus-visible:bg-black/20 focus-visible:border-white/20 dark:focus-visible:border-white/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
