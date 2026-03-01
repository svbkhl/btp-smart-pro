-- Classement des closers basé sur les conversions (closes)
-- Une "close" = entreprise créée par le closer avec subscription_status = 'active'
--              ET trial_end < NOW() (essai terminé → paiement effectif)

CREATE OR REPLACE FUNCTION public.get_closer_leaderboard()
RETURNS TABLE (
  closer_email    text,
  closer_name     text,
  total_closes    bigint,
  monthly_closes  bigint,
  trials_active   bigint,
  rank            bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH closer_stats AS (
    SELECT
      ce.email AS closer_email,
      COALESCE(
        au.raw_user_meta_data->>'full_name',
        NULLIF(
          TRIM(
            COALESCE(au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'prenom', '') ||
            ' ' ||
            COALESCE(au.raw_user_meta_data->>'nom', au.raw_user_meta_data->>'last_name', '')
          ),
          ''
        ),
        ce.email
      ) AS closer_name,

      -- Total closes : subscription active et trial terminé
      COUNT(CASE
        WHEN c.subscription_status = 'active'
          AND (c.trial_end IS NULL OR c.trial_end < NOW())
        THEN 1
      END) AS total_closes,

      -- Closes du mois en cours
      COUNT(CASE
        WHEN c.subscription_status = 'active'
          AND (c.trial_end IS NULL OR c.trial_end < NOW())
          AND DATE_TRUNC('month', c.updated_at) = DATE_TRUNC('month', NOW())
        THEN 1
      END) AS monthly_closes,

      -- Entreprises en trial actif (prospects chauds)
      COUNT(CASE
        WHEN c.subscription_status = 'trialing'
          AND (c.trial_end IS NULL OR c.trial_end > NOW())
        THEN 1
      END) AS trials_active

    FROM public.closer_emails ce
    LEFT JOIN auth.users au ON LOWER(au.email) = LOWER(ce.email)
    LEFT JOIN public.companies c ON c.owner_id = au.id
    GROUP BY ce.email, au.raw_user_meta_data
  )
  SELECT
    closer_email,
    closer_name,
    total_closes,
    monthly_closes,
    trials_active,
    RANK() OVER (ORDER BY monthly_closes DESC, total_closes DESC) AS rank
  FROM closer_stats
  ORDER BY monthly_closes DESC, total_closes DESC;
$$;

-- Accessible par tous les closers et admins
GRANT EXECUTE ON FUNCTION public.get_closer_leaderboard() TO authenticated;
