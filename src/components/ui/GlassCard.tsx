import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const GlassCard = ({ children, className, delay = 0, ...props }: GlassCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "bg-transparent backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-4 sm:p-6 shadow-lg",
        "hover:shadow-xl transition-shadow duration-200",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

