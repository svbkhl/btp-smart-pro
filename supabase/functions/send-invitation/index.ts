import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateRequest, sendInvitationSchema, validateAndNormalizeEmail } from "../_shared/validation.ts";
import { createErrorResponse, createSuccessResponse, createHttpResponse, ErrorCode, type ApiResponse } from "../_shared/errors.ts";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

/**
 * Cooldown anti-spam simple (en mémoire)
 * 
 * LIMITATION : Dans un environnement serverless, chaque invocation peut être sur une instance différente,
 * donc ce cooldown ne fonctionne que pour une instance donnée. Pour un cooldown distribué réel,
 * utilisez une table Supabase ou Redis pour stocker les timestamps.
 * 
 * Configuration via env var : COOLDOWN_SECONDS (défaut: 60 secondes)
 */
const COOLDOWN_SECONDS = parseInt(Deno.env.get("COOLDOWN_SECONDS") || "60", 10);
const emailCooldownMap = new Map<string, number>();

function checkCooldown(email: string): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const lastSent = emailCooldownMap.get(email.toLowerCase());
  
  if (!lastSent) {
    return { allowed: true };
  }
  
  const elapsedSeconds = Math.floor((now - lastSent) / 1000);
  const remainingSeconds = COOLDOWN_SECONDS - elapsedSeconds;
  
  if (remainingSeconds > 0) {
    return { allowed: false, remainingSeconds };
  }
  
  return { allowed: true };
}

function recordEmailSent(email: string): void {
  emailCooldownMap.set(email.toLowerCase(), Date.now());
  
  // Nettoyer les entrées anciennes (plus de 2x le cooldown) pour éviter la fuite mémoire
  const cutoff = Date.now() - (COOLDOWN_SECONDS * 2 * 1000);
  for (const [key, timestamp] of emailCooldownMap.entries()) {
    if (timestamp < cutoff) {
      emailCooldownMap.delete(key);
    }
  }
}

/**
 * Edge Function pour envoyer des invitations utilisateur
 * 
 * Règles métier :
 * 1. Si l'utilisateur N'EXISTE PAS → inviteUserByEmail (invitation)
 * 2. Si l'utilisateur EXISTE (email_exists) → generateLink type "magiclink" (connexion/activation)
 * 3. L'utilisateur reçoit TOUJOURS un email exploitable
 * 
 * 🔒 SÉCURITÉ REDIRECTION :
 * - localhost est INTERDIT en production (inaccessible depuis les emails)
 * - Variable d'environnement : APP_URL=https://btpsmartpro.com
 * - Fallback automatique : https://btpsmartpro.com/auth/callback
 * - Validation stricte à tous les niveaux (APP_URL, redirectUrl, handleExistingUser)
 * - Aucun lien localhost ne peut être généré
 */
serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  // Helper pour créer une réponse avec CORS
  const createCorsResponse = (response: ApiResponse, status?: number): Response => {
    const httpResponse = createHttpResponse(response, status);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      httpResponse.headers.set(key, value);
    });
    return httpResponse;
  };

  // Autoriser uniquement POST
  if (req.method !== "POST") {
    const errorResponse = createErrorResponse(
      "Method not allowed",
      ErrorCode.INVALID_INPUT
    );
    return createCorsResponse(errorResponse, 405);
  }

  try {
    // Parser et valider le body
    let parsedBody: unknown;
    try {
      parsedBody = await req.json();
    } catch {
      const errorResponse = createErrorResponse(
        "Invalid JSON body",
        ErrorCode.VALIDATION_ERROR
      );
      return createCorsResponse(errorResponse, 400);
    }

    // Valider avec Zod
    const validation = validateRequest(sendInvitationSchema, parsedBody);
    if (!validation.success) {
      const errorResponse = createErrorResponse(
        validation.error || "Validation failed",
        ErrorCode.VALIDATION_ERROR
      );
      return createCorsResponse(errorResponse, 400);
    }

    const emailToInvite = validateAndNormalizeEmail((validation.data as { email: string }).email);
    const requestedRole = (validation.data as { role?: 'owner' | 'admin' | 'member' }).role;
    const companyId = (validation.data as { companyId?: string }).companyId;
    
    // Vérifier le cooldown anti-spam
    const cooldownCheck = checkCooldown(emailToInvite);
    if (!cooldownCheck.allowed) {
      logger.warn("Cooldown active for email", { 
        requestId,
        email: emailToInvite,
        remainingSeconds: cooldownCheck.remainingSeconds
      });
      const errorResponse = createErrorResponse(
        `Veuillez patienter ${cooldownCheck.remainingSeconds} seconde(s) avant de renvoyer une invitation à cet email.`,
        ErrorCode.RATE_LIMIT_EXCEEDED,
        { remainingSeconds: cooldownCheck.remainingSeconds }
      );
      return createCorsResponse(errorResponse, 429);
    }
    
    // Mapper les rôles frontend vers les rôles backend
    const roleMapping: Record<'owner' | 'admin' | 'member', 'dirigeant' | 'administrateur' | 'salarie'> = {
      owner: 'dirigeant',
      admin: 'administrateur',
      member: 'salarie',
    };
    
    const dbRole = requestedRole ? roleMapping[requestedRole] : 'salarie'; // Par défaut: salarie
    
    logger.info("Processing invitation request", { 
      requestId, 
      email: emailToInvite,
      requestedRole,
      dbRole,
      companyId
    });

    // Initialize Supabase Admin - VALIDATION AU DÉMARRAGE
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      logger.error("Missing environment variables", undefined, { 
        requestId,
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey
      });
      const errorResponse = createErrorResponse(
        "Server configuration error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        ErrorCode.CONFIGURATION_ERROR
      );
      return createCorsResponse(errorResponse, 500);
    }

    // Valider le format de SUPABASE_URL
    try {
      new URL(supabaseUrl);
    } catch {
      logger.error("Invalid SUPABASE_URL format", undefined, { 
        requestId,
        supabaseUrl: supabaseUrl.substring(0, 50) + "..."
      });
      const errorResponse = createErrorResponse(
        "Server configuration error: Invalid SUPABASE_URL format",
        ErrorCode.CONFIGURATION_ERROR
      );
      return createCorsResponse(errorResponse, 500);
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    /**
     * Fonction helper pour valider et construire l'URL de redirection
     * 
     * RÈGLES STRICTES :
     * - localhost est INTERDIT en production (inaccessible depuis les emails)
     * - Tous les liens doivent pointer vers le domaine de production
     * - HTTPS requis en production
     * 
     * @param requestId - ID de la requête pour les logs
     * @returns URL de redirection validée (toujours https://btpsmartpro.com/auth/callback en production)
     */
    function getValidatedRedirectUrl(requestId: string): string {
      const APP_URL = Deno.env.get("APP_URL");
      const PRODUCTION_URL = "https://btpsmartpro.com";
      const CALLBACK_PATH = "/auth/callback";
      
      // Si APP_URL n'est pas configurée, utiliser production
      if (!APP_URL) {
        logger.warn("APP_URL not configured, using production URL", { 
          requestId,
          fallback: PRODUCTION_URL,
          note: "Configure APP_URL in Supabase Dashboard → Edge Functions → Secrets"
        });
        return `${PRODUCTION_URL}${CALLBACK_PATH}`;
      }
      
      const appUrlLower = APP_URL.toLowerCase().trim();
      
      // REFUSER catégoriquement localhost, 127.0.0.1, 0.0.0.0
      const isLocalhost = 
        appUrlLower.includes('localhost') || 
        appUrlLower.includes('127.0.0.1') || 
        appUrlLower.includes('0.0.0.0') ||
        appUrlLower.startsWith('http://localhost') ||
        appUrlLower.startsWith('https://localhost');
      
      if (isLocalhost) {
        logger.error("APP_URL contains localhost - FORBIDDEN in production", { 
          requestId,
          appUrl: APP_URL,
          reason: "localhost is inaccessible from email links in production",
          action: "Forcing production URL",
          fallback: PRODUCTION_URL
        });
        return `${PRODUCTION_URL}${CALLBACK_PATH}`;
      }
      
      // Valider le format de l'URL
      try {
        const urlObj = new URL(APP_URL);
        
        // Vérifier HTTPS en production
        if (urlObj.protocol !== 'https:') {
          logger.warn("APP_URL is not HTTPS, forcing production HTTPS", { 
            requestId,
            appUrl: APP_URL,
            protocol: urlObj.protocol,
            corrected: PRODUCTION_URL
          });
          return `${PRODUCTION_URL}${CALLBACK_PATH}`;
        }
        
        // URL valide → construire l'URL de callback
        const callbackUrl = `${APP_URL.replace(/\/$/, '')}${CALLBACK_PATH}`;
        
        // Validation finale : vérifier qu'il n'y a pas de localhost
        const callbackUrlLower = callbackUrl.toLowerCase();
        if (callbackUrlLower.includes('localhost') || callbackUrlLower.includes('127.0.0.1')) {
          logger.error("CRITICAL: callbackUrl contains localhost after construction", { 
            requestId,
            callbackUrl,
            action: "Forcing production URL"
          });
          return `${PRODUCTION_URL}${CALLBACK_PATH}`;
        }
        
        logger.info("Redirect URL validated successfully (NO LOCALHOST)", { 
          requestId, 
          redirectUrl: callbackUrl,
          source: APP_URL,
          protocol: urlObj.protocol,
          hostname: urlObj.hostname
        });
        
        return callbackUrl;
      } catch (urlError) {
        logger.error("APP_URL is invalid, using production URL", { 
          requestId,
          appUrl: APP_URL,
          error: urlError instanceof Error ? urlError.message : String(urlError),
          fallback: PRODUCTION_URL
        });
        return `${PRODUCTION_URL}${CALLBACK_PATH}`;
      }
    }
    
    // Obtenir l'URL de redirection validée (GARANTIE sans localhost)
    const redirectUrl = getValidatedRedirectUrl(requestId);

    // ÉTAPE 1 : Tenter d'inviter avec inviteUserByEmail
    // Cette méthode fonctionne uniquement pour les NOUVEAUX utilisateurs
    try {
      // Construire les options - redirectTo est optionnel
      const inviteOptions: { redirectTo?: string } = {};
      if (redirectUrl) {
        inviteOptions.redirectTo = redirectUrl;
      }

      logger.debug("Calling inviteUserByEmail", { 
        requestId,
        email: emailToInvite,
        hasRedirectTo: !!redirectUrl,
        redirectUrl: redirectUrl
      });

      const result = await supabase.auth.admin.inviteUserByEmail(
        emailToInvite,
        Object.keys(inviteOptions).length > 0 ? inviteOptions : undefined
      );

      // Si succès, l'utilisateur n'existait pas et l'invitation a été envoyée
      if (!result.error && result.data?.user) {
        const userId = result.data.user.id;
        
        // Assigner le rôle à l'utilisateur
        // IMPORTANT : Le trigger handle_new_user peut avoir déjà créé un rôle par défaut
        // On utilise upsert pour mettre à jour ou créer le rôle
        try {
          // D'abord, supprimer tous les rôles existants pour cet utilisateur
          // (au cas où la table aurait UNIQUE(user_id, role) et plusieurs rôles)
          const { error: deleteError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId);

          if (deleteError) {
            logger.warn("Failed to delete existing roles", deleteError, { 
              requestId,
              userId
            });
            // On continue quand même
          }

          // Insérer le nouveau rôle
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: dbRole,
            });

          if (roleError) {
            // Si erreur de contrainte unique, essayer upsert
            if (roleError.code === '23505' || roleError.message?.includes('unique')) {
              const { error: upsertError } = await supabase
                .from('user_roles')
                .upsert({
                  user_id: userId,
                  role: dbRole,
                }, {
                  onConflict: 'user_id'
                });

              if (upsertError) {
                logger.warn("Failed to assign role to user (upsert also failed)", upsertError, { 
                  requestId,
                  userId,
                  dbRole
                });
              } else {
                logger.info("Role assigned successfully via upsert", { 
                  requestId,
                  userId,
                  dbRole
                });
              }
            } else {
              logger.warn("Failed to assign role to user", roleError, { 
                requestId,
                userId,
                dbRole
              });
            }
            // On continue même si l'assignation de rôle échoue
          } else {
            logger.info("Role assigned successfully", { 
              requestId,
              userId,
              dbRole
            });
          }
        } catch (roleErr) {
          logger.warn("Exception assigning role", roleErr, { 
            requestId,
            userId,
            dbRole
          });
          // On continue même si l'assignation de rôle échoue
        }

        // Si companyId est fourni, lier l'utilisateur à l'entreprise
        if (companyId) {
          try {
            const { error: companyError } = await supabase
              .from('company_users')
              .upsert({
                company_id: companyId,
                user_id: userId,
                role: dbRole,
              }, {
                onConflict: 'company_id,user_id'
              });

            if (companyError) {
              logger.warn("Failed to link user to company", companyError, { 
                requestId,
                userId,
                companyId
              });
            } else {
              logger.info("User linked to company successfully", { 
                requestId,
                userId,
                companyId
              });
            }
          } catch (companyErr) {
            logger.warn("Exception linking user to company", companyErr, { 
              requestId,
              userId,
              companyId
            });
          }
        }

        // Enregistrer l'envoi dans le cooldown
        recordEmailSent(emailToInvite);
        
        logger.info("Invitation sent successfully to new user (Supabase auto-sends email)", { 
          requestId, 
          userId,
          email: emailToInvite,
          dbRole,
          method: "inviteUserByEmail"
        });
        const successResponse = createSuccessResponse({
          reason: "invitation_sent",
          message: "Invitation envoyée avec succès !",
          user: { 
            id: userId, 
            email: result.data.user.email 
          },
        });
        return createCorsResponse(successResponse);
      }

      // Si erreur, vérifier si c'est email_exists
      const error = result.error;
    if (error) {
        // Log détaillé de l'erreur avec sérialisation JSON
        const errorDetails = {
          message: error.message || 'No message',
          code: error.code || 'No code',
          status: error.status || 'No status',
          name: error.name || 'No name',
          serialized: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
        };
        
        const isEmailExists = 
          error.code === "email_exists" ||
          error.status === 422 ||
          (error.name === "AuthApiError" && error.status === 422) ||
          String(error.message || "").toLowerCase().includes("already been registered") ||
          String(error.message || "").toLowerCase().includes("already exists");

        if (isEmailExists) {
          // Utilisateur existe → utiliser generateLink type "magiclink" + Resend (PAS une erreur)
          logger.info("User already exists, generating magic link and sending via Resend", { 
            requestId, 
            email: emailToInvite,
            method: "generateLink-magiclink + Resend"
          });
          
          return await handleExistingUser(supabase, emailToInvite, redirectUrl, dbRole, companyId, requestId, createCorsResponse);
        }

        // Autre erreur de inviteUserByEmail (vraie erreur)
        logger.error("Error from inviteUserByEmail", error, { 
          requestId,
          email: emailToInvite,
          errorDetails
        });
        const errorMessage = error.message || "Erreur lors de l'invitation";
        const errorResponse = createErrorResponse(
          errorMessage,
          ErrorCode.INTERNAL_ERROR,
          {
            code: error.code,
            status: error.status
          }
        );
        return createCorsResponse(errorResponse, error.status || 500);
      }

      // Cas inattendu : pas d'erreur mais pas de user non plus
      logger.error("Unexpected result from inviteUserByEmail", undefined, { 
        requestId,
        hasData: !!result.data,
        hasUser: !!result.data?.user,
        hasError: !!result.error
      });
      const errorResponse = createErrorResponse(
        "Erreur inattendue lors de l'invitation",
        ErrorCode.INTERNAL_ERROR
      );
      return createCorsResponse(errorResponse, 500);

    } catch (inviteErr: any) {
      // inviteUserByEmail a lancé une exception (AuthApiError)
      // Log détaillé avec sérialisation JSON
      const exceptionDetails = {
        message: inviteErr?.message || 'No message',
        code: inviteErr?.code || 'No code',
        status: inviteErr?.status || 'No status',
        name: inviteErr?.name || 'No name',
        stack: inviteErr?.stack || 'No stack',
        serialized: JSON.stringify(inviteErr, Object.getOwnPropertyNames(inviteErr), 2),
      };

      // Vérifier si c'est une erreur email_exists
      const errMsg = String(inviteErr?.message || "").toLowerCase();
      const isEmailExists = 
        inviteErr?.code === "email_exists" ||
        (inviteErr?.name === "AuthApiError" && inviteErr?.status === 422) ||
        inviteErr?.status === 422 ||
        errMsg.includes("already been registered") ||
        errMsg.includes("already exists") ||
        errMsg.includes("email address has already been registered");

      if (isEmailExists) {
        // Utilisateur existe → utiliser generateLink type "magiclink" + Resend (PAS une erreur)
        logger.info("Exception indicates user exists, generating magic link and sending via Resend", { 
          requestId, 
          email: emailToInvite,
          method: "generateLink-magiclink + Resend"
        });
        
        return await handleExistingUser(supabase, emailToInvite, redirectUrl, dbRole, companyId, requestId, createCorsResponse);
      }

      // Autre exception (vraie erreur)
      logger.error("Exception from inviteUserByEmail", inviteErr, { 
        requestId,
        email: emailToInvite,
        exceptionDetails
      });
      const errorMessage = inviteErr?.message || "Erreur lors de l'invitation";
      const errorResponse = createErrorResponse(
        errorMessage,
        ErrorCode.INTERNAL_ERROR,
        {
          code: inviteErr?.code,
          status: inviteErr?.status,
          name: inviteErr?.name
        }
      );
      return createCorsResponse(errorResponse, inviteErr?.status || 500);
    }

  } catch (err: any) {
    // Erreur globale non capturée - Log avec sérialisation JSON
    const globalErrorDetails = {
      message: err?.message || 'No message',
      code: err?.code || 'No code',
      status: err?.status || 'No status',
      name: err?.name || 'No name',
      stack: err?.stack || 'No stack',
      serialized: JSON.stringify(err, Object.getOwnPropertyNames(err), 2),
    };

    logger.error("Unexpected error in send-invitation", err, { 
      requestId,
      globalErrorDetails
    });
    
    const errorResponse = createErrorResponse(
      err?.message || "Erreur interne",
      ErrorCode.INTERNAL_ERROR
    );
    return createCorsResponse(errorResponse, 500);
  }
});

/**
 * Envoie un email via Resend avec un lien d'invitation/magic link
 */
async function sendInvitationEmailViaResend(
  email: string,
  actionLink: string,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const RESEND_FROM_EMAIL_RAW = Deno.env.get("RESEND_FROM_EMAIL") || "contact@btpsmartpro.com";
  const FROM_NAME = Deno.env.get("FROM_NAME") || "BTP Smart Pro";

  if (!RESEND_API_KEY) {
    logger.error("RESEND_API_KEY not configured", undefined, { requestId, email });
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  // Parser RESEND_FROM_EMAIL
  const parseFromEmail = (fromEmailRaw: string): { name: string | null; email: string } => {
    const match = fromEmailRaw.match(/^"?(.+?)"?\s*<(.+?)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: null, email: fromEmailRaw.trim() };
  };

  const parsedFromEmail = parseFromEmail(RESEND_FROM_EMAIL_RAW);
  const fromEmail = parsedFromEmail.email;
  const fromName = parsedFromEmail.name || FROM_NAME;

  // Template HTML pour l'email d'invitation/magic link
  const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation - BTP Smart Pro</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Bienvenue sur BTP Smart Pro</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">Bonjour,</p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                Vous avez été invité à rejoindre BTP Smart Pro, votre plateforme de gestion complète pour les professionnels du BTP.
              </p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #333;">
                Cliquez sur le bouton ci-dessous pour créer votre compte ou vous connecter :
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${actionLink}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Créer mon compte / Me connecter
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #666;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999; word-break: break-all;">
                ${actionLink}
              </p>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #666;">
                Ce lien est valide pendant 24 heures. Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                <strong>BTP Smart Pro</strong><br>
                Votre partenaire pour la gestion de vos projets BTP
              </p>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #999;">
                Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const emailData = {
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
    to: [email],
    subject: "Invitation - BTP Smart Pro",
    html: emailHtml,
  };

  try {
    logger.debug("Sending invitation email via Resend", { requestId, email, fromEmail });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      const errorMsg = resendData.message || resendData.error?.message || "Failed to send email via Resend";
      logger.error("Resend API error", undefined, { 
        requestId, 
        email, 
        status: resendResponse.status,
        error: errorMsg,
        resendData 
      });
      return { success: false, error: errorMsg };
    }

    logger.info("Invitation email sent successfully via Resend", { 
      requestId, 
      email,
      resendId: resendData.id 
    });
    return { success: true };
  } catch (sendErr: any) {
    const errorDetails = {
      message: sendErr?.message || 'No message',
      name: sendErr?.name || 'No name',
      stack: sendErr?.stack || 'No stack',
      serialized: JSON.stringify(sendErr, Object.getOwnPropertyNames(sendErr), 2),
    };
    logger.error("Exception sending email via Resend", sendErr, { requestId, email, errorDetails });
    return { success: false, error: sendErr?.message || "Failed to send email" };
  }
}

/**
 * Gère le cas où l'utilisateur existe déjà
 * Utilise generateLink type "magiclink" pour permettre la connexion/activation
 * Envoie l'email via Resend (car generateLink ne déclenche pas automatiquement l'envoi)
 * 
 * IMPORTANT :
 * - Ce n'est PAS une erreur - l'utilisateur recevra un email de connexion
 * - redirectTo est OPTIONNEL - fonctionne même sans
 * - Ne vérifie JAMAIS si l'utilisateur existe avec getUserByEmail
 * - Met à jour le rôle si fourni
 * - Envoie TOUJOURS un email via Resend avec le magic link
 */
async function handleExistingUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  redirectUrl: string | undefined,
  dbRole: 'dirigeant' | 'administrateur' | 'salarie',
  companyId: string | undefined,
  requestId: string,
  createCorsResponse: (response: ApiResponse, status?: number) => Response
): Promise<Response> {
  const PRODUCTION_URL = "https://btpsmartpro.com";
  const CALLBACK_PATH = "/auth/callback";
  
  // Valider redirectUrl si fourni - REFUSER localhost catégoriquement
  if (redirectUrl !== undefined) {
    if (!redirectUrl || typeof redirectUrl !== 'string' || redirectUrl.trim() === '') {
      logger.warn("Empty redirectUrl provided, using production URL", { requestId });
      redirectUrl = `${PRODUCTION_URL}${CALLBACK_PATH}`;
    } else {
      const redirectUrlLower = redirectUrl.toLowerCase();
      
      // REFUSER localhost, 127.0.0.1, 0.0.0.0
      if (
        redirectUrlLower.includes('localhost') || 
        redirectUrlLower.includes('127.0.0.1') || 
        redirectUrlLower.includes('0.0.0.0')
      ) {
        logger.error("CRITICAL: redirectUrl contains localhost - FORBIDDEN", { 
          requestId,
          redirectUrl,
          reason: "localhost is inaccessible from email links",
          action: "Forcing production URL"
        });
        redirectUrl = `${PRODUCTION_URL}${CALLBACK_PATH}`;
      } else {
        // Vérifier que redirectUrl est une URL valide
        try {
          const urlObj = new URL(redirectUrl);
          
          // Vérifier HTTPS
          if (urlObj.protocol !== 'https:') {
            logger.warn("redirectUrl is not HTTPS, forcing production HTTPS", { 
              requestId,
              redirectUrl,
              protocol: urlObj.protocol
            });
            redirectUrl = `${PRODUCTION_URL}${CALLBACK_PATH}`;
          } else {
            logger.info("Valid redirectUrl for generateLink (NO LOCALHOST)", { 
              requestId, 
              redirectUrl,
              protocol: urlObj.protocol,
              hostname: urlObj.hostname
            });
          }
        } catch (urlError) {
          logger.warn("Invalid redirectUrl format, using production URL", { 
            requestId, 
            redirectUrl,
            error: urlError instanceof Error ? urlError.message : String(urlError),
            fallback: `${PRODUCTION_URL}${CALLBACK_PATH}`
          });
          redirectUrl = `${PRODUCTION_URL}${CALLBACK_PATH}`;
        }
      }
    }
  } else {
    // redirectUrl non fourni → utiliser production
    logger.info("No redirectUrl provided, using production URL", { requestId });
    redirectUrl = `${PRODUCTION_URL}${CALLBACK_PATH}`;
  }

    logger.info("Calling generateLink with type magiclink", { 
    requestId, 
    email, 
    hasRedirectTo: redirectUrl !== undefined,
    redirectUrl: redirectUrl || 'none (will use Supabase default)',
    note: redirectUrl ? 'Using custom redirect URL' : 'No redirect URL, Supabase will use Site URL from dashboard'
  });

  try {
    // Construire les options - redirectTo est optionnel
    // Utiliser type "magiclink" pour permettre la connexion/activation
    const generateLinkOptions: { type: 'magiclink'; email: string; options?: { redirectTo: string } } = {
      type: 'magiclink',
      email: email,
    };

    // Ajouter redirectTo seulement si valide
    if (redirectUrl) {
      generateLinkOptions.options = { redirectTo: redirectUrl };
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink(
      generateLinkOptions
    );

    if (linkError) {
      // Log détaillé avec sérialisation JSON complète
      const errorDetails = {
        message: linkError.message || 'No message',
        code: linkError.code || 'No code',
        status: linkError.status || 'No status',
        name: linkError.name || 'No name',
        serialized: JSON.stringify(linkError, Object.getOwnPropertyNames(linkError), 2),
      };
      
      // Log avec console.error pour forcer l'affichage
      console.error(`[ERROR] Error generating magic link - Full details:`, JSON.stringify(errorDetails, null, 2));
      
      logger.error("Error generating magic link", linkError, { 
        requestId,
        email,
        redirectUrl: redirectUrl || 'none',
        errorDetails
      });

      // Message d'erreur spécifique selon le type
      let errorMessage = "Erreur lors de la génération du lien de connexion";
      if (linkError.message) {
        errorMessage = linkError.message;
      } else if (linkError.code) {
        errorMessage = `Erreur ${linkError.code}: ${errorMessage}`;
      }

      const errorResponse = createErrorResponse(
        errorMessage,
        ErrorCode.INTERNAL_ERROR,
        {
          code: linkError.code,
          status: linkError.status,
          redirectUrl: redirectUrl || 'not provided'
        }
      );
      return createCorsResponse(errorResponse, linkError.status || 500);
    }

    if (!linkData) {
      logger.error("No link data returned from generateLink", undefined, { 
        requestId,
        email,
        redirectUrl: redirectUrl || 'none',
        error: "generateLink returned no data and no error"
      });
      const errorResponse = createErrorResponse(
        "Erreur lors de la génération du lien de connexion: aucune donnée retournée",
        ErrorCode.INTERNAL_ERROR
      );
      return createCorsResponse(errorResponse, 500);
    }

    // Vérifier que linkData contient bien les propriétés attendues
    if (!linkData.properties || !linkData.properties.action_link) {
      logger.error("Invalid link data structure from generateLink", undefined, { 
        requestId,
        email,
        redirectUrl: redirectUrl || 'none',
        linkDataKeys: Object.keys(linkData || {}),
        linkDataProperties: linkData.properties ? Object.keys(linkData.properties) : 'no properties',
        error: "linkData.properties.action_link is missing"
      });
      const errorResponse = createErrorResponse(
        "Erreur lors de la génération du lien de connexion: structure de données invalide",
        ErrorCode.INTERNAL_ERROR
      );
      return createCorsResponse(errorResponse, 500);
    }

    // Récupérer le lien d'action généré
    const actionLink = linkData.properties.action_link;
    
    if (!actionLink || typeof actionLink !== 'string') {
      logger.error("Invalid action_link from generateLink", undefined, { 
        requestId,
        email,
        actionLinkType: typeof actionLink,
        actionLinkValue: actionLink
      });
      const errorResponse = createErrorResponse(
        "Erreur lors de la génération du lien de connexion: lien invalide",
        ErrorCode.INTERNAL_ERROR
      );
      return createCorsResponse(errorResponse, 500);
    }

    logger.info("Magic link generated, sending email via Resend", { 
      requestId, 
      email,
      hasActionLink: !!actionLink,
      actionLinkPreview: actionLink ? `${actionLink.substring(0, 50)}...` : 'none',
      redirectUrl: redirectUrl || 'none',
      note: 'Email will contain magic link that redirects to the configured callback URL'
    });

    // Envoyer l'email via Resend avec le magic link
    const emailResult = await sendInvitationEmailViaResend(email, actionLink, requestId);
    
    if (!emailResult.success) {
      logger.error("Failed to send magic link email via Resend", undefined, { 
        requestId,
        email,
        error: emailResult.error
      });
      const errorResponse = createErrorResponse(
        `Erreur lors de l'envoi de l'email: ${emailResult.error || "Erreur inconnue"}`,
        ErrorCode.INTERNAL_ERROR
      );
      return createCorsResponse(errorResponse, 500);
    }

    // Mettre à jour le rôle de l'utilisateur existant si nécessaire
    try {
      // Récupérer l'utilisateur par email via listUsers
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const existingUser = usersList?.users?.find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingUser) {
        // Mettre à jour le rôle de l'utilisateur existant
        // Même logique que pour les nouveaux utilisateurs
        try {
          // Supprimer tous les rôles existants
          const { error: deleteError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', existingUser.id);

          if (deleteError) {
            logger.warn("Failed to delete existing roles", deleteError, { 
              requestId,
              userId: existingUser.id
            });
          }

          // Insérer le nouveau rôle
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: existingUser.id,
              role: dbRole,
            });

          if (roleError) {
            // Si erreur de contrainte unique, essayer upsert
            if (roleError.code === '23505' || roleError.message?.includes('unique')) {
              const { error: upsertError } = await supabase
                .from('user_roles')
                .upsert({
                  user_id: existingUser.id,
                  role: dbRole,
                }, {
                  onConflict: 'user_id'
                });

              if (upsertError) {
                logger.warn("Failed to update role for existing user (upsert also failed)", upsertError, { 
                  requestId,
                  userId: existingUser.id,
                  dbRole
                });
              } else {
                logger.info("Role updated for existing user via upsert", { 
                  requestId,
                  userId: existingUser.id,
                  dbRole
                });
              }
            } else {
              logger.warn("Failed to update role for existing user", roleError, { 
                requestId,
                userId: existingUser.id,
                dbRole
              });
            }
          } else {
            logger.info("Role updated for existing user", { 
              requestId,
              userId: existingUser.id,
              dbRole
            });
          }
        } catch (updateErr) {
          logger.warn("Exception updating role for existing user", updateErr, { 
            requestId,
            userId: existingUser.id,
            dbRole
          });
        }

        // Si companyId est fourni, lier l'utilisateur à l'entreprise
        if (companyId) {
          const { error: companyError } = await supabase
            .from('company_users')
            .upsert({
              company_id: companyId,
              user_id: existingUser.id,
              role: dbRole,
            }, {
              onConflict: 'company_id,user_id'
            });

          if (companyError) {
            logger.warn("Failed to link existing user to company", companyError, { 
              requestId,
              userId: existingUser.id,
              companyId
            });
          } else {
            logger.info("Existing user linked to company", { 
              requestId,
              userId: existingUser.id,
              companyId
            });
          }
        }
      }
    } catch (updateErr) {
      logger.warn("Exception updating role/company for existing user", updateErr, { 
        requestId,
        email
      });
      // On continue même si la mise à jour échoue
    }

    // Enregistrer l'envoi dans le cooldown
    recordEmailSent(email);
    
    logger.info("Magic link sent successfully via Resend", { 
      requestId, 
      email,
      redirectUrl: redirectUrl || 'none',
      method: "generateLink-magiclink + Resend"
    });
    
    const successResponse = createSuccessResponse({
      reason: "magic_link_sent",
      message: "Lien de connexion envoyé avec succès !",
    });
    return createCorsResponse(successResponse);

  } catch (linkErr: any) {
    // Log détaillé avec sérialisation JSON complète
    const exceptionDetails = {
      message: linkErr?.message || 'No message',
      code: linkErr?.code || 'No code',
      status: linkErr?.status || 'No status',
      name: linkErr?.name || 'No name',
      stack: linkErr?.stack || 'No stack',
      serialized: JSON.stringify(linkErr, Object.getOwnPropertyNames(linkErr), 2),
    };

    // Log avec console.error pour forcer l'affichage
    console.error(`[ERROR] Exception generating magic link - Full details:`, JSON.stringify(exceptionDetails, null, 2));

    logger.error("Exception generating magic link", linkErr, { 
      requestId,
      email,
      redirectUrl: redirectUrl || 'none',
      exceptionDetails
    });

    // Message d'erreur spécifique
    let errorMessage = "Erreur lors de la génération du lien de connexion";
    if (linkErr?.message) {
      errorMessage = linkErr.message;
    } else if (linkErr?.name) {
      errorMessage = `${linkErr.name}: ${errorMessage}`;
    }

    const errorResponse = createErrorResponse(
      errorMessage,
      ErrorCode.INTERNAL_ERROR,
      {
        code: linkErr?.code,
        status: linkErr?.status,
        name: linkErr?.name,
        redirectUrl: redirectUrl || 'not provided'
      }
    );
    return createCorsResponse(errorResponse, linkErr?.status || 500);
  }
}
