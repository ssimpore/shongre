# Administration de Shongre Emploi

L’écran `/admin/emploi` expose l’activation par marché, le schéma courant, les règles de conformité, la conservation, les offres, tarifs, quotas, options et l’état des dictionnaires. Toute modification passe par les routes administrateur et produit un audit.

## Mise en service d’un marché

1. Vérifier l’identité de la catégorie canonique `jobs` et ses alias.
2. Créer une version immuable des dictionnaires locaux : secteur, famille, profession, spécialisation, ancienneté, contrat, organisation, temps de travail, salaire, langue, formation et employeur.
3. Définir les champs obligatoires, durées, modes de candidature et règles d’employeur particulier.
4. Configurer l’offre gratuite avant toute offre payante.
5. Configurer prix en unités mineures, devise, taxes, quotas et droits; ne jamais modifier rétroactivement un devis payé.
6. Vérifier les étapes système obligatoires du pipeline et les libellés visibles candidat.
7. Charger et faire relire les textes réglementaires ainsi que l’assistant de langage interdit.
8. Activer le marché et surveiller publication, candidatures, signalements, imports et conversions.

## Modération et vérification

`self_declared` n’affiche pas de badge vérifié. Les niveaux domaine, document, manuel et fournisseur doivent conserver preuve, date et expiration. Un employeur suspendu, fermé, rejeté ou expiré ne peut ni publier ni exécuter d’action restreinte.

Les indicateurs de langage sont consultatifs : ils expliquent, proposent une formulation neutre et demandent une revue humaine. Ils ne rendent pas de décision juridique. Les signalements d’arnaque, liens, salaire anormal ou demande de paiement candidat sont traités via la modération et l’historique d’audit.

## Conservation

Les durées sont des configurations de marché versionnées. Une prolongation de vivier exige un consentement explicite et révocable. Les demandes d’accès, export et suppression sont enregistrées avant traitement. Une obligation légale peut retarder l’effacement, mais doit être expliquée et auditée.

## Imports

Chaque source possède un mapping, une référence opaque vers le coffre de secrets, un plafond de débit et un état. Toujours prévisualiser, puis confirmer avec une clé d’idempotence stable. Une nouvelle exécution met à jour ou expire l’offre source; elle ne crée pas une copie. Désactiver la source avant rotation d’un secret ou incident fournisseur.
