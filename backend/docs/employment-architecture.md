# Shongre Emploi — architecture technique

Shongre Emploi est une verticale du monolithe modulaire Shongre. La catégorie canonique reste `jobs`; son `listingFamily` et sa métadonnée `verticalType: employment` sélectionnent le schéma de publication spécialisé. Les annonces génériques historiques restent lisibles et aucun second arbre « Emploi » n’est créé.

## Flux d’exécution

Le frontend utilise `EmploymentServiceContract`. En mode courant, `DemoEmploymentService` fournit des réponses asynchrones, déterministes et isolées par persona. `HttpEmploymentService` conserve le même contrat pour l’API `/api/v1/employment/*`. Aucun composant n’accède à Supabase ni au backend directement.

Le backend place les règles dans `EmploymentService`, les accès dans `EmploymentRepository`, et les types publics dans `@shongre/contracts`. `DemoEmploymentRepository` permet les tests sans infrastructure. `PostgresEmploymentRepository` implémente la persistance Supabase/PostgreSQL.

## Modèle et confidentialité

La migration `00017_employment_vertical.sql` ajoute les employeurs, branches, profils, vérifications, membres, offres, lieux, salaires, compétences, candidatures, réponses de présélection, CV/documents, pipelines, affectations, notes, entretiens, événements, favoris, alertes, consentements, politiques de conservation, imports, synchronisations, abonnements, droits, signalements et audits.

Les offres publiques ne contiennent jamais de CV, document, réponse de présélection ou note recruteur. Les documents utilisent un chemin de stockage privé. Les politiques RLS séparent candidat, organisation, branche et administration. Les notes recruteur n’ont aucune politique de lecture candidat. Une candidature active est unique par candidat et par offre. Les synchronisations sont uniques par organisation, source et identifiant externe.

## Publication, recherche et classement

Le brouillon versionné `employment.job.fr.v1` est sauvegardé à chaque étape. Le service vérifie le marché, l’employeur, le quota, les doublons, la langue potentiellement discriminatoire et la méthode de candidature avant publication. Une duplication crée toujours un brouillon à revoir; elle ne republie jamais silencieusement.

Les filtres métiers sont normalisés. Les valeurs juridiques (contrat, fréquence salariale, champs requis) viennent du catalogue de marché. Les montants utilisent les unités mineures. Le rayon géographique est calculé côté base par coordonnées. Les placements payants restent identifiés et ne suppriment pas le contingent organique configuré.

## Autorisations

Les permissions HTTP sont explicites : candidat propriétaire, gestionnaire recruteur de l’employeur, import autorisé, administrateur Emploi. Le dépôt contrôle aussi l’appartenance employeur et les droits de branche. Un interviewer n’obtient pas les droits de facturation ni les candidatures sans affectation. Les transitions créent un événement avec état précédent, nouvel état, auteur, motif et notification éventuelle.

## Paiements

Les offres et options réutilisent le catalogue de monétisation et le fournisseur de paiement Shongre. L’option gratuite est active et présélectionnée; une option payante demande un choix explicite. Les devis et checkouts portent une clé d’idempotence. Les droits ne sont créés qu’après un événement fournisseur authentifié par le webhook partagé.

## Performance et exploitation

Les index couvrent publication active, profession, secteur, lieu, organisation du travail, contrat, rémunération, dates, employeur, état de candidature, affectation, alertes et sources d’import. Les exports candidat sont bornés à son identité. Les imports ont aperçu, validation, quota, limitation de débit, source et journal de synchronisation.

Ces enregistrements d’import et de synchronisation sont une fondation
opérationnelle, pas encore un produit d’ingestion complet : le stockage du
fichier, le parseur, le worker et la réconciliation externe ne sont pas livrés.
Les droits CSV/ATS/API et les options associées restent donc suspendus dans le
catalogue commercial jusqu’à livraison de cette chaîne.

Voir aussi `employment-migration-rollback.md` et `employment-integrations.md`.
