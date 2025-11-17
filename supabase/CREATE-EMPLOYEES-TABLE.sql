-- ============================================
-- TABLE: employees
-- ============================================
-- Stores employee information linked to auth users
-- ============================================

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  poste TEXT NOT NULL,
  specialites TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Policies pour employees
-- Les employés peuvent voir leurs propres informations
CREATE POLICY "Employees can view their own data"
  ON public.employees
  FOR SELECT
  USING (auth.uid() = user_id);

-- Les dirigeants peuvent voir tous les employés
CREATE POLICY "Dirigeants can view all employees"
  ON public.employees
  FOR SELECT
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- Les dirigeants peuvent créer des employés
CREATE POLICY "Dirigeants can create employees"
  ON public.employees
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- Les dirigeants peuvent modifier les employés
CREATE POLICY "Dirigeants can update employees"
  ON public.employees
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- Les employés peuvent modifier leurs propres informations (limitées)
CREATE POLICY "Employees can update their own data"
  ON public.employees
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);

-- ============================================
-- TABLE: employee_assignments
-- ============================================
-- Stores employee assignments to projects/chantiers
-- ============================================

CREATE TABLE IF NOT EXISTS public.employee_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  jour TEXT NOT NULL CHECK (jour IN ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche')),
  heures NUMERIC DEFAULT 0 CHECK (heures >= 0 AND heures <= 24),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, project_id, jour, date)
);

-- Enable RLS
ALTER TABLE public.employee_assignments ENABLE ROW LEVEL SECURITY;

-- Policies pour employee_assignments
-- Les employés peuvent voir leurs propres affectations
CREATE POLICY "Employees can view their own assignments"
  ON public.employee_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_assignments.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Les dirigeants peuvent voir toutes les affectations
CREATE POLICY "Dirigeants can view all assignments"
  ON public.employee_assignments
  FOR SELECT
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- Les dirigeants peuvent créer des affectations
CREATE POLICY "Dirigeants can create assignments"
  ON public.employee_assignments
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- Les dirigeants peuvent modifier les affectations
CREATE POLICY "Dirigeants can update assignments"
  ON public.employee_assignments
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'dirigeant'::app_role));

-- Les employés peuvent modifier leurs propres heures
CREATE POLICY "Employees can update their own hours"
  ON public.employee_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_assignments.employee_id
      AND employees.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_assignments.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_assignments_employee_id ON public.employee_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_project_id ON public.employee_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_date ON public.employee_assignments(date);

