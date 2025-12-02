import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const GlassCard = ({ children, className, delay = 0 }: GlassCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "bg-white/5 dark:bg-black/10 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-xl p-6 shadow-lg",
        "hover:shadow-xl transition-shadow duration-200",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

