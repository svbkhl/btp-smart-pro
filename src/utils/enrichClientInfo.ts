import { supabase } from "@/integrations/supabase/client";

/**
 * Infos client utilisées par les renderers PDF (devis + factures).
 * Tous les champs sont optionnels sauf le nom.
 */
export interface PdfClientInfo {
  name: string;
  civility?: string;
  firstName?: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: string;
}

interface ClientDbRow {
  name: string | null;
  titre: string | null;
  prenom: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
}

const CLIENT_COLUMNS = "name, titre, prenom, email, phone, location";

// La table `clients` n'est pas présente dans les types Supabase générés :
// on passe par un builder non typé (mêmes requêtes que useClients).
const clientsTable = () => (supabase as any).from("clients");

/**
 * Complète les infos client manquantes (civilité, prénom, email, téléphone,
 * adresse) en allant chercher la fiche client en base.
 *
 * - Lookup par `clientId` si fourni, sinon par nom exact (fiche la plus récente).
 * - Les valeurs déjà présentes dans `info` sont TOUJOURS prioritaires :
 *   on ne fait que remplir les trous.
 * - Fail-safe : toute erreur (RLS sur page publique, réseau, client supprimé)
 *   renvoie `info` inchangé — la génération du PDF ne doit jamais échouer ici.
 */
export async function enrichClientInfoFromDb(
  info: PdfClientInfo,
  clientId?: string | null
): Promise<PdfClientInfo> {
  try {
    let row: ClientDbRow | null = null;

    if (clientId) {
      const { data } = await clientsTable()
        .select(CLIENT_COLUMNS)
        .eq("id", clientId)
        .maybeSingle();
      row = (data as ClientDbRow | null) ?? null;
    }

    if (!row && info.name?.trim()) {
      const { data } = await clientsTable()
        .select(CLIENT_COLUMNS)
        .eq("name", info.name.trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      row = (data as ClientDbRow | null) ?? null;
    }

    if (!row) return info;

    return {
      ...info,
      name: info.name || row.name || "",
      civility: info.civility || row.titre || undefined,
      firstName: info.firstName || row.prenom || undefined,
      email: info.email || row.email || undefined,
      phone: info.phone || row.phone || undefined,
      address: info.address || row.location || undefined,
      location: info.location || row.location || undefined,
    };
  } catch {
    return info;
  }
}
