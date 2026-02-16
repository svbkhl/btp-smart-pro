/**
 * Section pour affecter des employés à un chantier (owner uniquement)
 * Quand un employé est affecté, il verra le chantier dans "Mes chantiers" sans les prix
 */

import { useState } from "react";
import { Users, UserPlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees } from "@/hooks/useEmployees";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/components/ui/use-toast";
import { GlassCard } from "@/components/ui/GlassCard";
import { format } from "date-fns";

const JOURS: Record<number, string> = {
  0: "dimanche",
  1: "lundi",
  2: "mardi",
  3: "mercredi",
  4: "jeudi",
  5: "vendredi",
  6: "samedi",
};

interface ProjectAssignEmployeesProps {
  projectId: string;
}

export function ProjectAssignEmployees({ projectId }: ProjectAssignEmployeesProps) {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["project-assignments", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_assignments")
        .select("id, employee_id, date, heures")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const assignedEmployeeIds = new Set(
    assignments.map((a: any) => a.employee_id)
  );
  const availableEmployees = employees.filter(
    (e) => !assignedEmployeeIds.has(e.id)
  );

  const handleAssign = async () => {
    if (!selectedEmployeeId || !companyId) return;
    setIsAdding(true);
    try {
      const today = new Date();
      const jour = JOURS[today.getDay()] || "lundi";
      const dateStr = format(today, "yyyy-MM-dd");

      const { error } = await supabase.from("employee_assignments").insert({
        employee_id: selectedEmployeeId,
        project_id: projectId,
        company_id: companyId,
        jour,
        date: dateStr,
        heures: 8,
        heure_debut: "08:00",
        heure_fin: "17:00",
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["project-assignments", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedEmployeeId("");
      toast({
        title: "Employé affecté",
        description: "L'employé verra ce chantier dans Mes chantiers.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'affecter l'employé",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("employee_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["project-assignments", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Affectation supprimée",
        description: "L'employé ne verra plus ce chantier.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de retirer l'affectation",
        variant: "destructive",
      });
    }
  };

  return (
    <GlassCard delay={0.85} className="p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Employés affectés
      </h3>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement...
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun employé affecté. Affectez des employés pour qu'ils voient ce chantier dans leurs chantiers.
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a: any) => {
                const emp = employees.find((e) => e.id === a.employee_id);
                const name = emp ? [emp.prenom, emp.nom].filter(Boolean).join(" ") || emp.email : "Employé";
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 dark:bg-white/5 border border-white/10"
                  >
                    <span className="text-sm font-medium">{name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(a.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {availableEmployees.length > 0 && (
            <div className="flex gap-2 pt-2">
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {[emp.prenom, emp.nom].filter(Boolean).join(" ") || emp.email || emp.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={!selectedEmployeeId || isAdding}
                className="shrink-0"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Affecter
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
