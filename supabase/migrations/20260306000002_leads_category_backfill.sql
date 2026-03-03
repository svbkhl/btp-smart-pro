-- Attribuer le vrai métier à partir du nom (inférence riche). Artisan BTP uniquement en dernier recours.
-- \m = début de mot (évite "selection" -> Électricité)

UPDATE public.leads
SET category = CASE
  WHEN name ~* '\m(plomb|sanitaire|canalisation|plomberie)' THEN 'Plomberie'
  WHEN name ~* '\m(elec|élec|electricité|electricite|électricien|electricien)' THEN 'Électricité'
  WHEN name ~* '\m(chauffage|chauffagiste|thermique|chaudière|chaudiere|gaz|clim)' THEN 'Chauffage'
  WHEN name ~* '\m(couvreur|couverture|toiture|toit|zingueur)' THEN 'Couverture'
  WHEN name ~* '\m(menuisier|menuiserie|bois)' THEN 'Menuiserie'
  WHEN name ~* '\m(peintre|peinture)' THEN 'Peinture'
  WHEN name ~* '\m(rénov|renov|renovation)' THEN 'Rénovation'
  WHEN name ~* '\m(maçon|macon|maçonnerie|maconnerie|carreleur|carrelage)' THEN 'Maçonnerie'
  WHEN name ~* '\m(photovoltaique|photovoltaïque|solaire|panneau)' THEN 'Photovoltaïque'
  WHEN name ~* '\m(terrassier|terrassement|excavat|démolition|demolition)' THEN 'Terrassement'
  WHEN name ~* '\m(multi|multiservice|bâtiment|batiment|construction|travaux|artisan)' THEN 'Multi-services'
  WHEN name ~* '\m(sarl|sas|eurl|entreprise|btp|bâtiment|batiment)' THEN 'Artisan BTP'
  ELSE 'Artisan BTP'
END
WHERE category IS NULL OR TRIM(category) = '';
