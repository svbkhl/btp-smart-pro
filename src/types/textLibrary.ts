// Types pour la bibliothèque de phrases réutilisables

export interface TextSnippet {
  id: string;
  user_id: string;
  company_id: string;
  category: 'introduction' | 'description' | 'conditions' | 'conclusion' | 'custom';
  title: string;
  content: string;
  usage_count: number; // Nombre de fois utilisé
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  // Tags pour recherche intelligente
  tags?: string[];
}

export interface CreateTextSnippetData {
  category: TextSnippet['category'];
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateTextSnippetData extends Partial<CreateTextSnippetData> {
  id: string;
}

export interface TextSuggestion {
  snippet: TextSnippet;
  relevance: number; // 0-1, score de pertinence
  reason: string; // Pourquoi cette suggestion
}
