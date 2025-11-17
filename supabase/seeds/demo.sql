-- ============================================
-- SEED : Données de démo pour présentation client
-- ============================================
-- Ce script insère des données réalistes pour démonstration
-- Utilisez-le avec : supabase db seed demo
-- ============================================

-- Fonction helper pour obtenir un user_id de démo
-- On utilise le premier utilisateur admin trouvé, ou on crée un user_id de référence
DO $$
DECLARE
  demo_user_id UUID;
  demo_client_id_1 UUID;
  demo_client_id_2 UUID;
  demo_client_id_3 UUID;
  demo_project_id_1 UUID;
  demo_project_id_2 UUID;
  demo_project_id_3 UUID;
  demo_project_id_4 UUID;
  demo_quote_id_1 UUID;
  demo_quote_id_2 UUID;
  demo_quote_id_3 UUID;
BEGIN
  -- Récupérer le premier utilisateur admin (ou créer une référence)
  SELECT id INTO demo_user_id 
  FROM auth.users 
  WHERE email LIKE '%admin%' OR email LIKE '%demo%'
  LIMIT 1;
  
  -- Si aucun utilisateur admin, utiliser le premier utilisateur
  IF demo_user_id IS NULL THEN
    SELECT id INTO demo_user_id 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;
  END IF;
  
  -- Si toujours aucun utilisateur, sortir avec un message
  IF demo_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Aucun utilisateur trouvé. Veuillez créer un compte d''abord.';
    RETURN;
  END IF;
  
  RAISE NOTICE '📝 Utilisation de l''utilisateur ID: %', demo_user_id;
  
  -- ============================================
  -- 1. CLIENTS DE DÉMO
  -- ============================================
  
  -- Supprimer les anciens clients de démo
  DELETE FROM public.clients WHERE is_demo = true AND user_id = demo_user_id;
  
  -- Client 1 : Entreprise de construction
  INSERT INTO public.clients (user_id, name, email, phone, location, status, is_demo, created_at)
  VALUES (
    demo_user_id,
    'Entreprise Bernard & Fils',
    'contact@bernard-construction.fr',
    '+33 1 23 45 67 89',
    '15 Rue de la République, 75001 Paris',
    'actif',
    true,
    NOW() - INTERVAL '45 days'
  )
  RETURNING id INTO demo_client_id_1;
  
  -- Client 2 : Promoteur immobilier
  INSERT INTO public.clients (user_id, name, email, phone, location, status, is_demo, created_at)
  VALUES (
    demo_user_id,
    'Promotion Immobilière Dubois',
    'info@dubois-promotion.fr',
    '+33 1 98 76 54 32',
    '42 Avenue des Champs-Élysées, 75008 Paris',
    'VIP',
    true,
    NOW() - INTERVAL '30 days'
  )
  RETURNING id INTO demo_client_id_2;
  
  -- Client 3 : Particulier
  INSERT INTO public.clients (user_id, name, email, phone, location, status, is_demo, created_at)
  VALUES (
    demo_user_id,
    'M. et Mme Martin',
    'martin.famille@email.fr',
    '+33 6 12 34 56 78',
    '8 Impasse des Roses, 92100 Boulogne-Billancourt',
    'actif',
    true,
    NOW() - INTERVAL '15 days'
  )
  RETURNING id INTO demo_client_id_3;
  
  RAISE NOTICE '✅ Clients de démo créés';
  
  -- ============================================
  -- 2. PROJETS DE DÉMO
  -- ============================================
  
  -- Supprimer les anciens projets de démo
  DELETE FROM public.projects WHERE is_demo = true AND user_id = demo_user_id;
  
  -- Projet 1 : Rénovation complète (en cours)
  INSERT INTO public.projects (
    user_id, client_id, name, status, progress, budget, location,
    start_date, end_date, description, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    demo_client_id_1,
    'Rénovation complète appartement 75m²',
    'en_cours',
    65,
    125000.00,
    '12 Rue de Rivoli, 75004 Paris',
    CURRENT_DATE - INTERVAL '20 days',
    CURRENT_DATE + INTERVAL '15 days',
    'Rénovation complète d''un appartement : électricité, plomberie, carrelage, peinture. Travaux de menuiserie et installation cuisine équipée.',
    true,
    NOW() - INTERVAL '25 days'
  )
  RETURNING id INTO demo_project_id_1;
  
  -- Projet 2 : Extension maison (planifié)
  INSERT INTO public.projects (
    user_id, client_id, name, status, progress, budget, location,
    start_date, end_date, description, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    demo_client_id_2,
    'Extension maison +20m² avec terrasse',
    'planifié',
    0,
    85000.00,
    '45 Chemin des Vignes, 92160 Antony',
    CURRENT_DATE + INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '60 days',
    'Extension de 20m² avec création d''une terrasse couverte. Fondations, charpente, couverture et finitions.',
    true,
    NOW() - INTERVAL '10 days'
  )
  RETURNING id INTO demo_project_id_2;
  
  -- Projet 3 : Rénovation salle de bain (terminé)
  INSERT INTO public.projects (
    user_id, client_id, name, status, progress, budget, location,
    start_date, end_date, description, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    demo_client_id_3,
    'Rénovation salle de bain complète',
    'terminé',
    100,
    18500.00,
    '8 Impasse des Roses, 92100 Boulogne-Billancourt',
    CURRENT_DATE - INTERVAL '45 days',
    CURRENT_DATE - INTERVAL '10 days',
    'Rénovation complète : carrelage, sanitaires, miroir, meuble vasque, douche italienne. Installation électrique et plomberie.',
    true,
    NOW() - INTERVAL '50 days'
  )
  RETURNING id INTO demo_project_id_3;
  
  -- Projet 4 : Construction garage (en attente)
  INSERT INTO public.projects (
    user_id, client_id, name, status, progress, budget, location,
    start_date, end_date, description, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    demo_client_id_1,
    'Construction garage individuel 25m²',
    'en_attente',
    0,
    32000.00,
    '15 Rue de la République, 75001 Paris',
    CURRENT_DATE + INTERVAL '20 days',
    CURRENT_DATE + INTERVAL '45 days',
    'Construction d''un garage individuel avec portail électrique. Fondations, murs, toiture et finitions.',
    true,
    NOW() - INTERVAL '3 days'
  )
  RETURNING id INTO demo_project_id_4;
  
  RAISE NOTICE '✅ Projets de démo créés';
  
  -- ============================================
  -- 3. DEVIS DE DÉMO
  -- ============================================
  
  -- Supprimer les anciens devis de démo
  DELETE FROM public.ai_quotes WHERE is_demo = true AND user_id = demo_user_id;
  
  -- Devis 1 : En attente de signature (3 jours)
  INSERT INTO public.ai_quotes (
    user_id, client_name, work_type, surface, estimated_cost, status,
    details, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    'Entreprise Bernard & Fils',
    'Rénovation complète',
    75,
    125000.00,
    'pending',
    '{"materials": ["Carrelage", "Peinture", "Électricité", "Plomberie"], "description": "Rénovation complète appartement"}',
    true,
    NOW() - INTERVAL '3 days'
  )
  RETURNING id INTO demo_quote_id_1;
  
  -- Devis 2 : Signé et accepté
  INSERT INTO public.ai_quotes (
    user_id, client_name, work_type, surface, estimated_cost, status,
    details, signed_at, signed_by, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    'M. et Mme Martin',
    'Rénovation salle de bain',
    8,
    18500.00,
    'signed',
    '{"materials": ["Carrelage", "Sanitaires", "Miroir"], "description": "Rénovation salle de bain"}',
    NOW() - INTERVAL '2 days',
    'M. Martin',
    true,
    NOW() - INTERVAL '5 days'
  )
  RETURNING id INTO demo_quote_id_2;
  
  -- Devis 3 : En attente (1 jour)
  INSERT INTO public.ai_quotes (
    user_id, client_name, work_type, surface, estimated_cost, status,
    details, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    'Promotion Immobilière Dubois',
    'Extension maison',
    20,
    85000.00,
    'pending',
    '{"materials": ["Béton", "Charpente", "Couverture"], "description": "Extension maison avec terrasse"}',
    true,
    NOW() - INTERVAL '1 day'
  )
  RETURNING id INTO demo_quote_id_3;
  
  RAISE NOTICE '✅ Devis de démo créés';
  
  -- ============================================
  -- 4. NOTIFICATIONS DE DÉMO
  -- ============================================
  
  -- Supprimer les anciennes notifications de démo
  DELETE FROM public.notifications WHERE is_demo = true AND user_id = demo_user_id;
  
  -- Notification 1 : Devis en attente depuis 3 jours
  INSERT INTO public.notifications (
    user_id, title, message, type, related_table, related_id, is_read, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    'Devis en attente',
    'Le devis pour "Rénovation complète appartement" est en attente de signature depuis 3 jours.',
    'warning',
    'ai_quotes',
    demo_quote_id_1,
    false,
    true,
    NOW() - INTERVAL '3 days'
  );
  
  -- Notification 2 : Chantier démarre bientôt
  INSERT INTO public.notifications (
    user_id, title, message, type, related_table, related_id, is_read, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    'Chantier à démarrer',
    'Le chantier "Extension maison +20m²" démarre dans 5 jours. Pensez à préparer le matériel.',
    'info',
    'projects',
    demo_project_id_2,
    false,
    true,
    NOW() - INTERVAL '1 day'
  );
  
  -- Notification 3 : Paiement reçu
  INSERT INTO public.notifications (
    user_id, title, message, type, related_table, related_id, is_read, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    'Paiement reçu',
    'Paiement de 18 500€ reçu pour le projet "Rénovation salle de bain complète".',
    'success',
    'projects',
    demo_project_id_3,
    true,
    true,
    NOW() - INTERVAL '2 days'
  );
  
  -- Notification 4 : Rappel devis
  INSERT INTO public.notifications (
    user_id, title, message, type, related_table, related_id, is_read, is_demo, created_at
  )
  VALUES (
    demo_user_id,
    'Rappel devis',
    'N''oubliez pas de relancer le client pour le devis "Extension maison" envoyé hier.',
    'reminder',
    'ai_quotes',
    demo_quote_id_3,
    false,
    true,
    NOW() - INTERVAL '6 hours'
  );
  
  RAISE NOTICE '✅ Notifications de démo créées';
  
  -- ============================================
  -- 5. EMPLOYÉS RH DE DÉMO (si table existe)
  -- ============================================
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    -- Supprimer les anciens employés de démo
    DELETE FROM public.employees WHERE is_demo = true;
    
    -- Employé 1 : Maçon
    INSERT INTO public.employees (
      user_id, first_name, last_name, email, phone, position, specialty, 
      hire_date, status, is_demo, created_at
    )
    VALUES (
      demo_user_id,
      'Jean',
      'Dupont',
      'jean.dupont@demo-btp.fr',
      '+33 6 11 22 33 44',
      'Ouvrier',
      'Maçonnerie',
      CURRENT_DATE - INTERVAL '180 days',
      'actif',
      true,
      NOW() - INTERVAL '180 days'
    );
    
    -- Employé 2 : Plombier
    INSERT INTO public.employees (
      user_id, first_name, last_name, email, phone, position, specialty,
      hire_date, status, is_demo, created_at
    )
    VALUES (
      demo_user_id,
      'Marie',
      'Lefebvre',
      'marie.lefebvre@demo-btp.fr',
      '+33 6 22 33 44 55',
      'Ouvrier',
      'Plomberie',
      CURRENT_DATE - INTERVAL '120 days',
      'actif',
      true,
      NOW() - INTERVAL '120 days'
    );
    
    -- Employé 3 : Électricien
    INSERT INTO public.employees (
      user_id, first_name, last_name, email, phone, position, specialty,
      hire_date, status, is_demo, created_at
    )
    VALUES (
      demo_user_id,
      'Pierre',
      'Moreau',
      'pierre.moreau@demo-btp.fr',
      '+33 6 33 44 55 66',
      'Ouvrier',
      'Électricité',
      CURRENT_DATE - INTERVAL '90 days',
      'actif',
      true,
      NOW() - INTERVAL '90 days'
    );
    
    RAISE NOTICE '✅ Employés de démo créés';
  END IF;
  
  -- ============================================
  -- 6. CANDIDATURES RH DE DÉMO (si table existe)
  -- ============================================
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidatures') THEN
    -- Supprimer les anciennes candidatures de démo
    DELETE FROM public.candidatures WHERE is_demo = true;
    
    -- Candidature 1 : En attente
    INSERT INTO public.candidatures (
      user_id, nom, prenom, email, telephone, poste, statut, is_demo, created_at
    )
    VALUES (
      demo_user_id,
      'Durand',
      'Sophie',
      'sophie.durand@email.fr',
      '+33 6 44 55 66 77',
      'Couvreur',
      'en_attente',
      true,
      NOW() - INTERVAL '5 days'
    );
    
    -- Candidature 2 : En entretien
    INSERT INTO public.candidatures (
      user_id, nom, prenom, email, telephone, poste, statut, is_demo, created_at
    )
    VALUES (
      demo_user_id,
      'Garcia',
      'Lucas',
      'lucas.garcia@email.fr',
      '+33 6 55 66 77 88',
      'Menuisier',
      'entretien',
      true,
      NOW() - INTERVAL '2 days'
    );
    
    RAISE NOTICE '✅ Candidatures de démo créées';
  END IF;
  
  -- ============================================
  -- 7. TÂCHES RH DE DÉMO (si table existe)
  -- ============================================
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'taches_rh') THEN
    -- Supprimer les anciennes tâches de démo
    DELETE FROM public.taches_rh WHERE is_demo = true;
    
    -- Tâche 1 : Urgente
    INSERT INTO public.taches_rh (
      user_id, titre, description, statut, priorite, echeance, is_demo, created_at
    )
    VALUES (
      demo_user_id,
      'Renouvellement contrat Jean Dupont',
      'Le contrat de Jean Dupont arrive à échéance dans 15 jours. Préparer le renouvellement.',
      'en_cours',
      'haute',
      CURRENT_DATE + INTERVAL '15 days',
      true,
      NOW() - INTERVAL '2 days'
    );
    
    -- Tâche 2 : En attente
    INSERT INTO public.taches_rh (
      user_id, titre, description, statut, priorite, echeance, is_demo, created_at
    )
    VALUES (
      demo_user_id,
      'Formation sécurité obligatoire',
      'Organiser la formation sécurité pour les nouveaux employés avant le 20 janvier.',
      'en_attente',
      'moyenne',
      CURRENT_DATE + INTERVAL '20 days',
      true,
      NOW() - INTERVAL '5 days'
    );
    
    RAISE NOTICE '✅ Tâches RH de démo créées';
  END IF;
  
  -- ============================================
  -- MISE À JOUR DES STATISTIQUES
  -- ============================================
  
  -- Mettre à jour ou créer les stats utilisateur
  INSERT INTO public.user_stats (
    user_id, total_projects, total_clients, total_revenue, 
    active_projects, completed_projects, total_profit
  )
  VALUES (
    demo_user_id, 4, 3, 228500.00, 2, 1, 45000.00
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_projects = 4,
    total_clients = 3,
    total_revenue = 228500.00,
    active_projects = 2,
    completed_projects = 1,
    total_profit = 45000.00,
    updated_at = NOW();
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ SEED DÉMO TERMINÉ AVEC SUCCÈS !';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Données créées :';
  RAISE NOTICE '   - 3 clients';
  RAISE NOTICE '   - 4 projets (en_cours, planifié, terminé, en_attente)';
  RAISE NOTICE '   - 3 devis (pending, signed, pending)';
  RAISE NOTICE '   - 4 notifications';
  RAISE NOTICE '   - Employés, candidatures, tâches RH (si tables existent)';
  RAISE NOTICE '';
  
END $$;

