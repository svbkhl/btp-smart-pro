-- Table pour la bibliothèque de phrases réutilisables
CREATE TABLE IF NOT EXISTS text_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('introduction', 'description', 'conditions', 'conclusion', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_text_snippets_company_id ON text_snippets(company_id);
CREATE INDEX idx_text_snippets_category ON text_snippets(company_id, category);
CREATE INDEX idx_text_snippets_usage_count ON text_snippets(company_id, usage_count DESC);

-- RLS Policies
ALTER TABLE text_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_company_text_snippets" ON text_snippets
  FOR SELECT USING (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "insert_own_company_text_snippets" ON text_snippets
  FOR INSERT WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "update_own_company_text_snippets" ON text_snippets
  FOR UPDATE USING (company_id = (auth.jwt()->>'company_id')::uuid)
  WITH CHECK (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE POLICY "delete_own_company_text_snippets" ON text_snippets
  FOR DELETE USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_text_snippets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_text_snippets_updated_at
  BEFORE UPDATE ON text_snippets
  FOR EACH ROW
  EXECUTE FUNCTION update_text_snippets_updated_at();

-- Trigger pour forcer company_id depuis le JWT
CREATE OR REPLACE FUNCTION enforce_text_snippets_company_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id := (auth.jwt()->>'company_id')::uuid;
  
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id missing in JWT';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_text_snippets_company_id_trigger
  BEFORE INSERT ON text_snippets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_text_snippets_company_id();

-- Fonction RPC pour incrémenter l'utilisation d'un snippet
CREATE OR REPLACE FUNCTION increment_snippet_usage(snippet_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE text_snippets
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = snippet_id
    AND company_id = (auth.jwt()->>'company_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
