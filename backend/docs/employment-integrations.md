# Intégrations externes Emploi

Le domaine fournit les contrats et points d’extension sans faire dépendre le mode démo de services externes.

- **ATS et sites carrière** : CSV, XML et API/JSON passent par une source, un mapping, un aperçu, une clé d’idempotence et un journal. Les connecteurs fournisseurs, la signature des appels entrants et la rotation des secrets doivent être configurés côté serveur avant activation.
- **Géocodage** : la recherche par rayon exploite des coordonnées normalisées. Le fournisseur qui transforme une adresse en coordonnées reste à sélectionner par marché; aucune adresse privée ne doit être envoyée sans base légale.
- **Calendrier** : le modèle gère fuseau, créneau, mode, rappels et lien privé. Les adaptateurs Google/Microsoft et leurs consentements OAuth restent à brancher.
- **Documents** : les métadonnées et chemins privés sont prêts. Le stockage objet, les URL signées à courte durée et l’analyse antivirus doivent être configurés avant d’accepter des fichiers réels.
- **Paiement** : le catalogue partagé et les webhooks Stripe existants sont réutilisés lorsque `PAYMENT_PROVIDER=stripe`; `demo` reste la valeur locale. Les remboursements suivent les règles d’éligibilité du moteur de monétisation.
- **SSO** : les offres réseau exposent le droit prévu, mais le fournisseur d’identité et le provisioning d’organisation dépendent du déploiement client.

Les variables d’exemple `EMPLOYMENT_*_PROVIDER` désignent le choix serveur. Aucun secret ne doit être préfixé par `NEXT_PUBLIC_`, `VITE_` ou `EXPO_PUBLIC_`.
