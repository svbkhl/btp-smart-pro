# ⚡ ACTION IMMÉDIATE - Résoudre l'Erreur generate-quote

## 🎯 Ce qu'il faut faire MAINTENANT

### 1️⃣ Exécuter le Script SQL (2 minutes)

1. **Ouvrir Supabase Dashboard**
   - https://supabase.com/dashboard
   - Sélectionner votre projet

2. **SQL Editor → New query**

3. **Copier-coller ce script :**
   - Ouvrir `supabase/RÉSOUDRE-ERREUR-GENERATE-QUOTE.sql`
   - Copier tout le contenu
   - Coller dans SQL Editor
   - Cliquer sur **Run**

4. **Vérifier le résultat**
   - Vous devriez voir `✅ Table ai_quotes existe`
   - Vous devriez voir `✅ Policies RLS configurées`

### 2️⃣ Vérifier les Secrets (1 minute)

1. **Settings → Edge Functions → Secrets**

2. **Vérifier que `OPENAI_API_KEY` existe**
   - Si elle n'existe pas : **Add new secret**
   - Name: `OPENAI_API_KEY`
   - Value: Votre clé API OpenAI (commence par `sk-`)

### 3️⃣ Redéployer la Fonction (2 minutes)

#### Option A : Via CLI
```bash
supabase functions deploy generate-quote
```

#### Option B : Via Dashboard
1. **Edge Functions → generate-quote**
2. **Copier le contenu de `supabase/functions/generate-quote/index.ts`**
3. **Coller dans l'éditeur**
4. **Deploy**

### 4️⃣ Tester (1 minute)

1. **Dashboard → Edge Functions → generate-quote → Invoke**
2. **Utiliser ce payload :**
```json
{
  "clientName": "Test",
  "surface": 100,
  "workType": "Rénovation",
  "materials": ["Tuiles"]
}
```
3. **Cliquer sur Invoke**
4. **Vérifier le résultat**

### 5️⃣ Tester dans l'Application (1 minute)

1. **Ouvrir l'application**
2. **Ouvrir la console (F12)**
3. **IA → Devis IA**
4. **Remplir le formulaire et générer**
5. **Regarder la console pour les logs**

## ✅ Checklist

- [ ] Script SQL exécuté avec succès
- [ ] Table `ai_quotes` créée
- [ ] RLS policies configurées
- [ ] Secret `OPENAI_API_KEY` configuré
- [ ] Edge Function redéployée
- [ ] Test depuis Dashboard réussi
- [ ] Test depuis application réussi

## 🐛 Si ça ne marche toujours pas

1. **Copier les logs d'erreur** (console + Supabase)
2. **Vérifier que la table existe** (SQL: `SELECT * FROM ai_quotes LIMIT 1;`)
3. **Vérifier que les secrets sont configurés** (Dashboard)
4. **Vérifier que la fonction est déployée** (Dashboard)

## 📞 Informations à Fournir

Si l'erreur persiste, fournissez :
- ✅ Message d'erreur exact
- ✅ Logs de la console (F12)
- ✅ Logs de Supabase (Edge Functions → generate-quote → Logs)
- ✅ Résultat du script SQL
- ✅ Résultat de la vérification des secrets

---

**⏱️ Temps estimé : 7 minutes**

**📋 Guide complet : `RÉSOUDRE-ERREUR-ÉTAPE-PAR-ÉTAPE.md`**

