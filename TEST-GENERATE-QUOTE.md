# 🧪 Test de l'Edge Function generate-quote

## 📋 Test 1 : Vérifier la Table

**Dans Supabase SQL Editor, exécutez :**

```sql
-- Vérifier que la table existe
SELECT 
  EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_quotes'
  ) AS table_exists,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_quotes') AS policy_count;
```

**Résultat attendu :**
- `table_exists`: `true`
- `policy_count`: `4`

## 📋 Test 2 : Vérifier les Secrets

**Via Supabase CLI (si installé) :**
```bash
supabase secrets list
```

**Ou dans le Dashboard :**
1. Settings → Edge Functions → Secrets
2. Vérifier que `OPENAI_API_KEY` existe

## 📋 Test 3 : Tester la Fonction Directement

**Dans Supabase Dashboard :**
1. Edge Functions → generate-quote → Invoke
2. Utiliser ce payload :

```json
{
  "clientName": "Test Client",
  "surface": 100,
  "workType": "Rénovation toiture",
  "materials": ["Tuiles", "Isolation"],
  "region": "Paris"
}
```

3. **Copier la réponse complète**

## 📋 Test 4 : Tester depuis l'Application

1. Aller dans l'application → IA → Devis IA
2. Remplir le formulaire :
   - Client : "Test Client"
   - Type de travaux : "Rénovation toiture"
   - Surface : 100
   - Matériaux : Tuiles, Isolation
3. Cliquer sur "Générer le devis"
4. **Ouvrir la console du navigateur (F12)** pour voir les logs
5. **Noter l'erreur exacte** si elle se produit

## 📋 Test 5 : Vérifier les Logs

**Dans Supabase Dashboard :**
1. Edge Functions → generate-quote → Logs
2. Chercher les logs récents
3. **Copier les logs d'erreur**

## 🔍 Ce qu'il faut vérifier

1. ✅ La table `ai_quotes` existe
2. ✅ Les RLS policies sont configurées (4 policies)
3. ✅ Le secret `OPENAI_API_KEY` est configuré
4. ✅ La fonction est déployée
5. ✅ Les logs montrent des erreurs spécifiques

## 🐛 Si l'erreur persiste

1. **Copier le message d'erreur exact** des logs
2. **Copier le payload utilisé**
3. **Vérifier que la table existe** (Test 1)
4. **Vérifier que les secrets sont configurés** (Test 2)
5. **Tester directement depuis le Dashboard** (Test 3)
6. **Tester depuis l'application avec la console ouverte** (Test 4)

## 📝 Informations à Fournir

Si l'erreur persiste, fournissez :

1. **Message d'erreur exact** (depuis les logs ou la console)
2. **Payload utilisé**
3. **Résultat du Test 1** (table existe ? policies ?)
4. **Résultat du Test 2** (secret configuré ?)
5. **Résultat du Test 3** (test direct depuis Dashboard)
6. **Logs de la console du navigateur** (Test 4)

