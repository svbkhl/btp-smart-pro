# 🔍 Chercher les Logs APRÈS "Réponse Google reçue: { status: 200 }"

## 📊 Ce Que Nous Savons

D'après les logs précédents :
- ✅ Google répond avec **status 200 OK**
- ✅ L'échange de token **fonctionne**
- ❌ L'erreur 400 vient **APRÈS** l'échange de token

---

## 🔍 Logs à Chercher (Dans l'Ordre)

### 1. Après "📥 [exchange_code] Réponse Google reçue: { status: 200 }"

Cherchez ces logs qui doivent venir **immédiatement après** :

```
✅ [exchange_code] Token exchange réussi !
✅ [exchange_code] Tokens reçus: {...}
🔄 [exchange_code] Récupération des infos utilisateur Google...
📥 [exchange_code] Réponse userinfo: {...}
✅ [exchange_code] User info reçue: {...}
🔄 [exchange_code] Récupération de l'entreprise: c3a33fdd-...
✅ [exchange_code] Entreprise trouvée: ...
🔄 [exchange_code] Création du calendrier Google: ...
📥 [exchange_code] Réponse création calendrier: {...}
✅ [exchange_code] Calendrier créé: {...}
🔄 [exchange_code] Vérification connexion existante...
💾 [exchange_code] Données à sauvegarder: {...}
🔄 [exchange_code] Création nouvelle connexion...
```

### 2. Logs d'Erreur à Chercher

Si une étape échoue, vous verrez :

```
❌ [exchange_code] Erreur lors du parsing des tokens: ...
❌ [exchange_code] Erreur lors de la récupération userinfo: ...
❌ [exchange_code] Erreur lors de la récupération de l'entreprise: ...
❌ [exchange_code] Erreur création calendrier Google: ...
❌ [exchange_code] ERREUR BASE DE DONNÉES
```

---

## 📋 Action Immédiate

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
2. **Filtrez par** : `google-calendar-oauth-entreprise-pkce`
3. **Cherchez** le log : `📥 [exchange_code] Réponse Google reçue: { status: 200 }`
4. **Regardez TOUS les logs qui viennent APRÈS** ce log
5. **Copiez-collez ici** tous les logs qui contiennent `❌` ou qui montrent une erreur

---

## 💡 Hypothèses

L'erreur peut venir de :

1. **Parsing des tokens** : Le JSON de Google est mal formé
2. **Récupération userinfo** : Google refuse l'accès aux infos utilisateur
3. **Récupération entreprise** : L'entreprise n'existe pas ou erreur RLS
4. **Création calendrier** : Google refuse la création du calendrier
5. **Sauvegarde BDD** : Erreur lors de l'insertion dans `google_calendar_connections`

---

## 🎯 Ce Qu'il Faut Me Partager

**Copiez-collez ici** :
- Tous les logs qui viennent **APRÈS** "📥 [exchange_code] Réponse Google reçue: { status: 200 }"
- Surtout ceux qui contiennent `❌`
- Les logs `💾 [exchange_code] Données à sauvegarder:` et `❌ [exchange_code] ERREUR BASE DE DONNÉES` (si présents)

---

## 🔧 Si Vous Ne Voyez Pas de Logs Après "status: 200"

Cela signifie que l'Edge Function s'arrête avant d'atteindre les logs suivants. Vérifiez :
1. **Les logs d'erreur non gérée** : `❌ [ERROR] Unhandled error:`
2. **Les logs de shutdown** : `Shutdown` avec `EarlyDrop`
