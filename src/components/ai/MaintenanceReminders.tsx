import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Plus, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const MaintenanceReminders = () => {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    equipmentType: "",
    installationDate: "",
    nextMaintenance: "",
    notes: "",
  });

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("maintenance_reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("next_maintenance", { ascending: true });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les rappels",
        variant: "destructive",
      });
      return;
    }

    setReminders(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("maintenance_reminders").insert({
      user_id: user.id,
      client_name: formData.clientName,
      equipment_type: formData.equipmentType,
      installation_date: formData.installationDate || null,
      next_maintenance: formData.nextMaintenance,
      notes: formData.notes,
      status: "pending",
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le rappel",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Rappel créé !",
      description: "Le rappel d'entretien a été ajouté.",
    });

    setFormData({
      clientName: "",
      equipmentType: "",
      installationDate: "",
      nextMaintenance: "",
      notes: "",
    });
    setShowForm(false);
    loadReminders();
  };

  const isOverdue = (date: string) => {
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Rappels d'entretien</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau rappel
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un rappel d'entretien</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nom du client</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) =>
                      setFormData({ ...formData, clientName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipmentType">Type d'équipement</Label>
                  <Input
                    id="equipmentType"
                    value={formData.equipmentType}
                    onChange={(e) =>
                      setFormData({ ...formData, equipmentType: e.target.value })
                    }
                    placeholder="Ex: Chaudière, Toiture"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="installationDate">Date d'installation</Label>
                  <Input
                    id="installationDate"
                    type="date"
                    value={formData.installationDate}
                    onChange={(e) =>
                      setFormData({ ...formData, installationDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextMaintenance">Prochain entretien</Label>
                  <Input
                    id="nextMaintenance"
                    type="date"
                    value={formData.nextMaintenance}
                    onChange={(e) =>
                      setFormData({ ...formData, nextMaintenance: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Informations complémentaires..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Créer le rappel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reminders.map((reminder) => (
          <Card key={reminder.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{reminder.client_name}</CardTitle>
                  <CardDescription>{reminder.equipment_type}</CardDescription>
                </div>
                <Bell
                  className={`h-5 w-5 ${
                    isOverdue(reminder.next_maintenance)
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(reminder.next_maintenance), "d MMMM yyyy", {
                    locale: fr,
                  })}
                </span>
                {isOverdue(reminder.next_maintenance) && (
                  <Badge variant="destructive">En retard</Badge>
                )}
              </div>
              {reminder.notes && (
                <p className="text-sm text-muted-foreground">{reminder.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}

        {reminders.length === 0 && !showForm && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun rappel d'entretien</p>
              <Button
                variant="link"
                onClick={() => setShowForm(true)}
                className="mt-2"
              >
                Créer votre premier rappel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
