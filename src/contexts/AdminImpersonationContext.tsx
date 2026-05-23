import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
}

interface AdminImpersonationContextValue {
  isImpersonating: boolean;
  impersonatedCompanyId: string | null;
  impersonatedCompanyName: string | null;
  companies: Company[];
  isLoadingCompanies: boolean;
  fetchCompanies: () => Promise<void>;
  startImpersonation: (companyId: string, companyName: string) => void;
  stopImpersonation: () => void;
}

const STORAGE_KEY = 'admin_impersonation';

const AdminImpersonationContext = createContext<AdminImpersonationContextValue | undefined>(undefined);

export const AdminImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const [impersonatedCompanyId, setImpersonatedCompanyId] = useState<string | null>(null);
  const [impersonatedCompanyName, setImpersonatedCompanyName] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setImpersonatedCompanyId(parsed.companyId);
        setImpersonatedCompanyName(parsed.companyName);
      }
    } catch {}
  }, []);

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    setCompanies(data || []);
    setIsLoadingCompanies(false);
  }, []);

  const startImpersonation = useCallback((companyId: string, companyName: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ companyId, companyName }));
    window.location.reload();
  }, []);

  const stopImpersonation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }, []);

  return (
    <AdminImpersonationContext.Provider value={{
      isImpersonating: !!impersonatedCompanyId,
      impersonatedCompanyId,
      impersonatedCompanyName,
      companies,
      isLoadingCompanies,
      fetchCompanies,
      startImpersonation,
      stopImpersonation,
    }}>
      {children}
    </AdminImpersonationContext.Provider>
  );
};

export const useAdminImpersonation = (): AdminImpersonationContextValue => {
  const ctx = useContext(AdminImpersonationContext);
  if (!ctx) throw new Error('useAdminImpersonation must be used within AdminImpersonationProvider');
  return ctx;
};

/** Lit l'override admin directement depuis localStorage (sans hook, utilisable dans queryFn) */
export const getAdminImpersonationOverride = (): string | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored).companyId ?? null;
  } catch {
    return null;
  }
};
