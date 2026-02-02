/**
 * Component: EmployeePermissionsDialog
 * Description: Dialog pour gérer les permissions individuelles d'un employé
 * Usage: Permet au patron de cocher les fonctionnalités accessibles à chaque employé
 */

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Loader2, 
  LayoutDashboard,
  Users, 
  FolderKanban, 
  Calendar,
  UserPlus,
  Sparkles,
  FileText,
  MessageSquare
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface EmployeePermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  companyId: string;
}

// Définition des permissions disponibles - Correspond à la navigation principale
const AVAILABLE_PERMISSIONS = [
  {
    key: "dashboard.access",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    description: "Accès au tableau de bord général"
  },
  {
    key: "clients.access",
    label: "Clients",
    icon: Users,
    description: "Voir et gérer les clients"
  },
  {
    key: "projects.access",
    label: "Chantiers",
    icon: FolderKanban,
    description: "Voir et gérer les chantiers"
  },
  {
    key: "planning.access",
    label: "Calendrier",
    icon: Calendar,
    description: "Accès au calendrier et planning personnel"
  },
  {
    key: "employees.access",
    label: "Employés",
    icon: UserPlus,
    description: "Voir et gérer les employés"
  },
  {
    key: "ai.access",
    label: "IA",
    icon: Sparkles,
    description: "Accès aux fonctionnalités d'intelligence artificielle"
  },
  {
    key: "billing.access",
    label: "Facturation",
    icon: FileText,
    description: "Gérer les devis et factures"
  },
  {
    key: "messaging.access",
    label: "Messagerie",
    icon: MessageSquare,
    description: "Accès à la messagerie interne"
  }
];

export function EmployeePermissionsDialog({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  companyId,
}: EmployeePermissionsDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  // Charger les permissions actuelles de l'employé
  useEffect(() => {
    if (isOpen && employeeId) {
      loadEmployeePermissions();
    }
  }, [isOpen, employeeId]);

  const loadEmployeePermissions = async () => {
    setLoading(true);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:177',message:'loadEmployeePermissions called',data:{employeeId,companyId,tableName:'user_permissions'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'initial'})}).catch(()=>{});
    // #endregion
    try {
      // Récupérer les permissions personnalisées
      const { data: userPerms, error: userPermsError } = await supabase
        .from("user_permissions")
        .select("permission_id, granted, permissions(key)")
        .eq("user_id", employeeId)
        .eq("company_id", companyId);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:189',message:'user_permissions query result',data:{userPermsCount:userPerms?.length,userPermsError:userPermsError?.message,errorCode:userPermsError?.code,errorHint:userPermsError?.hint},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'initial'})}).catch(()=>{});
      // #endregion

      if (userPermsError) throw userPermsError;

      // Construire le Set des permissions accordées
      const granted = new Set<string>();
      userPerms?.forEach((up: any) => {
        if (up.granted && up.permissions?.key) {
          granted.add(up.permissions.key);
        }
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:204',message:'Permissions loaded successfully',data:{grantedCount:granted.size,grantedPermissions:Array.from(granted)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'initial'})}).catch(()=>{});
      // #endregion

      setSelectedPermissions(granted);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:211',message:'Load permissions FAILED',data:{errorMessage:error?.message,errorCode:error?.code,errorHint:error?.hint},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'initial'})}).catch(()=>{});
      // #endregion
      console.error("Error loading employee permissions:", error);
      
      // Special handling for missing table error
      if (error?.code === 'PGRST205' && error?.message?.includes('user_permissions')) {
        toast.error(
          "⚠️ Configuration requise : La table 'user_permissions' n'existe pas. Veuillez exécuter les scripts SQL de migration dans Supabase Dashboard. Consultez GUIDE-INSTALLATION-PERMISSIONS-SIMPLE.md",
          { duration: 10000 }
        );
      } else {
        toast.error("Erreur lors du chargement des permissions");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (permissionKey: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionKey)) {
        newSet.delete(permissionKey);
      } else {
        newSet.add(permissionKey);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:218',message:'handleSave called',data:{employeeId,companyId,selectedPermissionsCount:selectedPermissions.size,selectedPermissions:Array.from(selectedPermissions)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'initial'})}).catch(()=>{});
    // #endregion
    try {
      // 1. Récupérer tous les IDs de permissions disponibles
      const { data: allPermissions, error: permsError } = await supabase
        .from("permissions")
        .select("id, key")
        .in("key", AVAILABLE_PERMISSIONS.map((p) => p.key));

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:228',message:'Permissions fetched from DB',data:{allPermissionsCount:allPermissions?.length,permsError:permsError?.message,permsErrorCode:permsError?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'initial'})}).catch(()=>{});
      // #endregion

      if (permsError) throw permsError;

      const permissionMap = new Map(allPermissions?.map((p: any) => [p.key, p.id]) || []);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:236',message:'Before DELETE user_permissions',data:{employeeId,companyId,permissionIdsToDelete:Array.from(permissionMap.values()),tableName:'user_permissions'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C',runId:'initial'})}).catch(()=>{});
      // #endregion

      // 2. Supprimer toutes les permissions personnalisées existantes pour cet employé
      const { error: deleteError } = await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", employeeId)
        .eq("company_id", companyId)
        .in("permission_id", Array.from(permissionMap.values()));

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:247',message:'After DELETE user_permissions',data:{deleteError:deleteError?.message,deleteErrorCode:deleteError?.code,deleteErrorHint:deleteError?.hint,deleteErrorDetails:deleteError?.details},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'initial'})}).catch(()=>{});
      // #endregion

      if (deleteError) throw deleteError;

      // 3. Insérer les nouvelles permissions sélectionnées
      if (selectedPermissions.size > 0) {
        const permissionsToInsert = Array.from(selectedPermissions)
          .map((key) => {
            const permissionId = permissionMap.get(key);
            if (!permissionId) return null;
            return {
              user_id: employeeId,
              company_id: companyId,
              permission_id: permissionId,
              granted: true,
            };
          })
          .filter(Boolean);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:268',message:'Before INSERT user_permissions',data:{permissionsToInsertCount:permissionsToInsert.length,tableName:'user_permissions'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D',runId:'initial'})}).catch(()=>{});
        // #endregion

        if (permissionsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("user_permissions")
            .insert(permissionsToInsert);

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:278',message:'After INSERT user_permissions',data:{insertError:insertError?.message,insertErrorCode:insertError?.code,insertErrorHint:insertError?.hint},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'initial'})}).catch(()=>{});
          // #endregion

          if (insertError) throw insertError;
        }
      }

      // 4. Invalider les caches
      await queryClient.invalidateQueries({ queryKey: ["user-permissions", employeeId] });
      await queryClient.invalidateQueries({ queryKey: ["company-users"] });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:291',message:'Save SUCCESS',data:{success:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E',runId:'initial'})}).catch(()=>{});
      // #endregion

      toast.success("Permissions mises à jour avec succès");
      onClose();
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d6bbbe4a-4bc0-448c-8c46-34c6f74033bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmployeePermissionsDialog.tsx:299',message:'Save FAILED',data:{errorMessage:error?.message,errorCode:error?.code,errorHint:error?.hint,errorDetails:error?.details,errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'initial'})}).catch(()=>{});
      // #endregion
      console.error("Error saving employee permissions:", error);
      
      // Special handling for missing table error
      if (error?.code === 'PGRST205' && error?.message?.includes('user_permissions')) {
        toast.error(
          "⚠️ Configuration requise : La table 'user_permissions' n'existe pas. Veuillez exécuter les scripts SQL de migration dans Supabase Dashboard. Consultez GUIDE-INSTALLATION-PERMISSIONS-SIMPLE.md",
          { duration: 10000 }
        );
      } else {
        toast.error("Erreur lors de la sauvegarde des permissions");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les permissions de {employeeName}</DialogTitle>
          <DialogDescription>
            Cochez les sections auxquelles cet employé aura accès
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Sélectionnez les modules de navigation accessibles à cet employé :
            </p>
            {AVAILABLE_PERMISSIONS.map((perm) => {
              const PermIcon = perm.icon;
              return (
                <div 
                  key={perm.key} 
                  className="flex items-start space-x-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={perm.key}
                    checked={selectedPermissions.has(perm.key)}
                    onCheckedChange={() => handleTogglePermission(perm.key)}
                    className="mt-1 border-2"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={perm.key}
                      className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                    >
                      {PermIcon && <PermIcon className="h-4 w-4" />}
                      {perm.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {perm.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
