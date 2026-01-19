# 📧 Configuration de l'Email de Réinitialisation de Mot de Passe BTP Smart Pro

## 🎯 Objectif
Personnaliser l'email de réinitialisation pour qu'il soit envoyé avec le branding **BTP Smart Pro** au lieu de Supabase.

---

## 📋 Étapes de Configuration

### 1. Accéder au Dashboard Supabase

1. Allez sur https://supabase.com
2. Connectez-vous à votre projet BTP Smart Pro
3. Allez dans **Authentication** > **Email Templates**

### 2. Personnaliser le Template "Reset Password"

1. Dans la liste des templates, trouvez **"Reset Password"**
2. Cliquez sur **"Edit"**

### 3. Personnaliser le Sujet

Remplacez le sujet par défaut par :
```
Réinitialisation de votre mot de passe - BTP Smart Pro
```

### 4. Personnaliser le Contenu HTML

Remplacez le contenu par le template suivant :

```html
<h2>Réinitialisation de votre mot de passe</h2>
<p>Bonjour,</p>
<p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte BTP Smart Pro.</p>
<p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
<p><a href="{{ .ConfirmationURL }}">Réinitialiser mon mot de passe</a></p>
<p>Ce lien expire dans 1 heure.</p>
<p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
<hr>
<p style="color: #666; font-size: 12px;">
  Cordialement,<br>
  L'équipe BTP Smart Pro<br>
  <a href="https://www.btpsmartpro.com">www.btpsmartpro.com</a>
</p>
```

### 5. Template HTML Complet avec Branding (Optionnel)

Pour un email plus professionnel avec le branding BTP Smart Pro :

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de votre mot de passe - BTP Smart Pro</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <div style="display: inline-block; width: 40px; height: 40px; background: white; border-radius: 8px; line-height: 40px; font-weight: bold; font-size: 24px; color: #667eea;">
      B
    </div>
    <h1 style="color: white; margin: 10px 0 0 0; font-size: 24px;">BTP Smart Pro</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-top: 0;">Réinitialisation de votre mot de passe</h2>
    
    <p>Bonjour,</p>
    
    <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte <strong>BTP Smart Pro</strong>.</p>
    
    <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Réinitialiser mon mot de passe
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Ou copiez-collez ce lien dans votre navigateur :<br>
      <span style="word-break: break-all; color: #667eea;">{{ .ConfirmationURL }}</span>
    </p>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>⚠️ Important :</strong> Ce lien expire dans <strong>1 heure</strong> pour votre sécurité.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Cordialement,<br>
      <strong style="color: #667eea;">L'équipe BTP Smart Pro</strong><br>
      <a href="https://www.btpsmartpro.com" style="color: #667eea; text-decoration: none;">www.btpsmartpro.com</a>
    </p>
  </div>
</body>
</html>
```

### 6. Enregistrer les Modifications

1. Cliquez sur **"Save"** pour enregistrer le template
2. Les modifications sont immédiatement actives

---

## ✅ Variables Disponibles dans les Templates

Supabase fournit les variables suivantes que vous pouvez utiliser :

- `{{ .ConfirmationURL }}` : Le lien de réinitialisation
- `{{ .Token }}` : Le token de réinitialisation (rarement utilisé directement)
- `{{ .TokenHash }}` : Hash du token (rarement utilisé)
- `{{ .RedirectTo }}` : URL de redirection après réinitialisation
- `{{ .Email }}` : Email de l'utilisateur

---

## 🧪 Tester l'Email

1. Allez sur votre application : https://www.btpsmartpro.com/auth
2. Cliquez sur **"Mot de passe oublié ?"**
3. Entrez votre email et soumettez
4. Vérifiez votre boîte de réception
5. L'email doit maintenant afficher le branding BTP Smart Pro

---

## 📝 Notes Importantes

- ⚠️ Les modifications sont **immédiatement actives** après sauvegarde
- ✅ Le template HTML doit être valide et bien formaté
- 🔒 Le lien `{{ .ConfirmationURL }}` est automatiquement généré par Supabase
- 🎨 Vous pouvez personnaliser les couleurs pour correspondre à votre charte graphique
- 📱 Assurez-vous que le template est responsive pour les appareils mobiles

---

## 🆘 En Cas de Problème

Si l'email n'apparaît pas personnalisé :

1. Vérifiez que vous avez bien cliqué sur **"Save"**
2. Videz le cache de votre navigateur
3. Testez avec un nouvel email de réinitialisation
4. Vérifiez les logs dans Supabase Dashboard > Authentication > Logs

---

**Date de création :** $(date +%Y-%m-%d)