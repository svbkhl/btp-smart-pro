import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30 hover:border-white/30 dark:hover:border-white/20 hover:shadow-lg hover:shadow-primary/20",
        destructive: "bg-white/10 dark:bg-black/20 border border-destructive/30 dark:border-destructive/20 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 hover:border-destructive/40 dark:hover:border-destructive/30 hover:shadow-lg hover:shadow-destructive/20",
        outline: "bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-black/30 hover:border-white/30 dark:hover:border-white/20 hover:shadow-lg",
        secondary: "bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 text-secondary-foreground hover:bg-white/20 dark:hover:bg-black/30 hover:border-white/30 dark:hover:border-white/20 hover:shadow-lg",
        ghost: "bg-transparent border border-transparent hover:bg-white/10 dark:hover:bg-black/20 hover:border-white/20 dark:hover:border-white/10",
        link: "bg-transparent border border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-xl",
        sm: "h-9 rounded-xl px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
