import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useToggleEmployeeAccount,
  type Employee,
  type CreateEmployeeData,
} from "@/hooks/useEmployees";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Mail,
  Briefcase,
  Loader2,
  Shield,
  ShieldOff,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { safeAction } from "@/utils/safeAction";

const AdminEmployees = () => {
  const { data: employees, isLoading, isError } = useEmployees();
  
  // Utiliser des données par défaut si chargement ou erreur
  // Toujours afficher quelque chose pour éviter les chargements infinis
  const displayEmployees = employees || [];
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const toggleAccount = useToggleEmployeeAccount();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Formulaire de création
  const [formData, setFormData] = useState<CreateEmployeeData>({
    email: "",
    password: "",
    nom: "",
    prenom: "",
    poste: "",
    specialites: [],
  });

  const [currentSpecialite, setCurrentSpecialite] = useState("");

  // Filtrer les employés
  const filteredEmployees = displayEmployees.filter((emp) => {
    if (!emp) return false;
    const searchLower = searchQuery.toLowerCase();
    return (
      emp.nom?.toLowerCase().includes(searchLower) ||
      emp.prenom?.toLowerCase().includes(searchLower) ||
      emp.poste?.toLowerCase().includes(searchLower) ||
      emp.user?.email?.toLowerCase().includes(searchLower)
    );
  });

  // Gestion du formulaire
  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.nom || !formData.poste) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    await safeAction(
      async () => {
        await createEmployee.mutateAsync(formData);
        setIsCreateDialogOpen(false);
        setFormData({
          email: "",
          password: "",
          nom: "",
          prenom: "",
          poste: "",
          specialites: [],
        });
      },
      {
        successMessage: "Employé créé avec succès",
        errorMessage: "Erreur lors de la création de l'employé",
      }
    );
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      email: employee.user?.email || "",
      password: "", // Ne pas pré-remplir le mot de passe
      nom: employee.nom,
      prenom: employee.prenom || "",
      poste: employee.poste,
      specialites: employee.specialites || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedEmployee) return;

    await safeAction(
      async () => {
        await updateEmployee.mutateAsync({
          id: selectedEmployee.id,
          nom: formData.nom,
          prenom: formData.prenom,
          poste: formData.poste,
          specialites: formData.specialites,
        });
        setIsEditDialogOpen(false);
        setSelectedEmployee(null);
      },
      {
        successMessage: "Employé mis à jour avec succès",
        errorMessage: "Erreur lors de la mise à jour de l'employé",
      }
    );
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    await safeAction(
      async () => {
        await deleteEmployee.mutateAsync(selectedEmployee.id);
        setIsDeleteDialogOpen(false);
        setSelectedEmployee(null);
      },
      {
        successMessage: "Employé supprimé avec succès",
        errorMessage: "Erreur lors de la suppression de l'employé",
      }
    );
  };

  const handleToggleAccount = async (employee: Employee) => {
    if (!employee.user_id) return;
    // Pour l'instant, on ne peut pas vérifier si le compte est désactivé facilement
    // On suppose qu'on veut le désactiver
    await safeAction(
      async () => {
        await toggleAccount.mutateAsync({
          userId: employee.user_id!,
          disabled: true, // À améliorer : vérifier l'état actuel
        });
      },
      {
        successMessage: "Statut du compte mis à jour",
        errorMessage: "Erreur lors de la modification du statut du compte",
      }
    );
  };

  const addSpecialite = () => {
    if (currentSpecialite.trim() && !formData.specialites?.includes(currentSpecialite.trim())) {
      setFormData({
        ...formData,
        specialites: [...(formData.specialites || []), currentSpecialite.trim()],
      });
      setCurrentSpecialite("");
    }
  };

  const removeSpecialite = (spec: string) => {
    setFormData({
      ...formData,
      specialites: formData.specialites?.filter((s) => s !== spec) || [],
    });
  };

  // Ne pas bloquer l'affichage, afficher les données même si chargement
  // Les hooks retournent déjà des données mock en cas de timeout (3 secondes)
  // Cette approche évite les chargements infinis en affichant toujours du contenu

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Employés</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Créez et gérez les comptes de vos employés
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nouvel employé</span>
                  <span className="sm:hidden">Nouveau</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Créer un nouvel employé</DialogTitle>
                  <DialogDescription>
                    Créez un compte pour un nouvel employé. Il recevra un email avec ses identifiants.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="employe@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe temporaire *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        placeholder="Dupont"
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom</Label>
                      <Input
                        id="prenom"
                        placeholder="Jean"
                        value={formData.prenom}
                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="poste">Poste *</Label>
                    <Input
                      id="poste"
                      placeholder="Maçon, Électricien, etc."
                      value={formData.poste}
                      onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialites">Spécialités</Label>
                    <div className="flex gap-2">
                      <Input
                        id="specialites"
                        placeholder="Ajouter une spécialité"
                        value={currentSpecialite}
                        onChange={(e) => setCurrentSpecialite(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSpecialite();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={addSpecialite}>
                        Ajouter
                      </Button>
                    </div>
                    {formData.specialites && formData.specialites.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.specialites.map((spec) => (
                          <Badge key={spec} variant="secondary" className="gap-1">
                            {spec}
                            <button
                              type="button"
                              onClick={() => removeSpecialite(spec)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreate} disabled={createEmployee.isPending}>
                    {createEmployee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer l'employé
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher un employé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Employees List */}
          {isLoading && displayEmployees.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Chargement des employés...</p>
              </CardContent>
            </Card>
          ) : filteredEmployees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((employee) => (
                <Card key={employee.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {employee.prenom || ""} {employee.nom || "N/A"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {employee.user?.email || "N/A"}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{employee.poste || "-"}</span>
                    </div>
                    {employee.specialites && employee.specialites.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {employee.specialites.map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(employee)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "Aucun employé trouvé" : "Aucun employé enregistré"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Modifier l'employé</DialogTitle>
                <DialogDescription>
                  Modifiez les informations de l'employé. Le mot de passe ne peut pas être modifié ici.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-nom">Nom *</Label>
                    <Input
                      id="edit-nom"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-prenom">Prénom</Label>
                    <Input
                      id="edit-prenom"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-poste">Poste *</Label>
                  <Input
                    id="edit-poste"
                    value={formData.poste}
                    onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-specialites">Spécialités</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-specialites"
                      placeholder="Ajouter une spécialité"
                      value={currentSpecialite}
                      onChange={(e) => setCurrentSpecialite(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSpecialite();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addSpecialite}>
                      Ajouter
                    </Button>
                  </div>
                  {formData.specialites && formData.specialites.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.specialites.map((spec) => (
                        <Badge key={spec} variant="secondary" className="gap-1">
                          {spec}
                          <button
                            type="button"
                            onClick={() => removeSpecialite(spec)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleUpdate} disabled={updateEmployee.isPending}>
                  {updateEmployee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer l'employé</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer {selectedEmployee?.prenom} {selectedEmployee?.nom} ?
                  Cette action supprimera également son compte et ne peut pas être annulée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteEmployee.isPending}
                >
                  {deleteEmployee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default AdminEmployees;

