/**
 * Dialog "Activité closer" : stats leads + leads par département (ex. "Leila, leads des départements 01, 69…").
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, User, Mail, BarChart3, MapPin } from "lucide-react";
import { useCloserActivity, DEPTS } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

const deptName = (code: string) => DEPTS.find((d) => d.code === code)?.name ?? code;

export function CloserActivityDialog({
  open,
  onOpenChange,
  closerEmail,
  closerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closerEmail: string | null;
  closerName: string;
}) {
  const { data, isLoading, error } = useCloserActivity(open ? closerEmail : null);
  const displayName = closerName || closerEmail?.split("@")[0] || "Closer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Activité — {displayName}
          </DialogTitle>
          <DialogDescription>
            {closerEmail && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                {closerEmail}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive py-4">
            Impossible de charger l&apos;activité.
          </p>
        )}

        {data && !isLoading && (
          <div className="space-y-6 pt-2">
            {/* Stats leads */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                <BarChart3 className="w-4 h-4" />
                Leads assignés
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StatCard label="Total" value={data.stats.total} />
                <StatCard label="Nouveaux" value={data.stats.new} className="text-blue-500" />
                <StatCard label="À rappeler" value={data.stats.to_callback} className="text-amber-500" />
                <StatCard label="Pas intéressé" value={data.stats.not_interested} className="text-orange-500" />
                <StatCard label="Qualifiés" value={data.stats.qualified} className="text-violet-500" />
                <StatCard label="Signés" value={data.stats.signed} className="text-emerald-500" />
              </div>
            </div>

            {/* Leads par département */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                <MapPin className="w-4 h-4" />
                Leads par département
              </h4>
              {data.by_dept.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Aucun lead assigné pour le moment.
                </p>
              ) : (
                <ul className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {data.by_dept.map(({ dept_code, count }) => (
                    <li
                      key={dept_code}
                      className="flex items-center justify-between px-4 py-2.5 bg-muted/30 text-sm"
                    >
                      <span className="font-medium">
                        {dept_code} — {deptName(dept_code)}
                      </span>
                      <span className="font-semibold text-primary">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
              {data.by_dept.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {displayName} a reçu des leads des départements listés ci-dessus.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 px-3 py-2 text-center",
        className
      )}
    >
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
