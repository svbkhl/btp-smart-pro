import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

const StatsCard = ({ title, value, icon: Icon, trend, trendUp }: StatsCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (
              <p className={cn(
                "text-sm font-medium",
                trendUp ? "text-primary" : "text-destructive"
              )}>
                {trend}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
