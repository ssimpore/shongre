import { Permission } from "../types";

export interface PermissionDefinition {
  id: Permission;
  name: string;
  category:
    | "Profil & Compte"
    | "Annonces"
    | "Messagerie"
    | "Transactions & Paiements"
    | "Boutique & Vitrine"
    | "Modération & Signalements"
    | "Utilisateurs & Équipe"
    | "Marchés & Configuration"
    | "Cours & Formation"
    | "Auto & Véhicules"
    | "Immobilier"
    | "Emploi & Recrutement"
    | "Administration Système";
  description: string;
  isSensitive?: boolean;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Shongre Emploi
  {
    id: "employment.read",
    name: "Consulter Shongre Emploi",
    category: "Emploi & Recrutement",
    description: "Rechercher et consulter les offres d’emploi publiques.",
  },
  {
    id: "employment.candidate.manage.own",
    name: "Gérer son espace candidat",
    category: "Emploi & Recrutement",
    description: "Gérer profil professionnel, CV, candidatures, alertes et consentements.",
  },
  {
    id: "employment.job.manage.own",
    name: "Publier ses offres d’emploi",
    category: "Emploi & Recrutement",
    description: "Créer, reprendre et soumettre ses propres offres éligibles.",
  },
  {
    id: "employment.recruiter.manage.own",
    name: "Gérer son espace recruteur",
    category: "Emploi & Recrutement",
    description: "Administrer les offres, équipes, branches et paramètres employeur autorisés.",
  },
  {
    id: "employment.application.manage.own",
    name: "Gérer les candidatures autorisées",
    category: "Emploi & Recrutement",
    description: "Affecter, faire progresser et planifier les candidatures de son périmètre.",
  },
  {
    id: "employment.import.own",
    name: "Importer ses offres d’emploi",
    category: "Emploi & Recrutement",
    description: "Prévisualiser et synchroniser les sources autorisées par la formule.",
  },
  {
    id: "employment.admin.manage",
    name: "Administrer Shongre Emploi",
    category: "Emploi & Recrutement",
    description: "Configurer taxonomie, offres, conformité, modération et rétention Emploi.",
    isSensitive: true,
  },

  // Shongre Immo
  {
    id: "immo.read",
    name: "Consulter Shongre Immo",
    category: "Immobilier",
    description: "Rechercher et consulter les biens immobiliers publics.",
  },
  {
    id: "immo.property.manage.own",
    name: "Gérer ses biens immobiliers",
    category: "Immobilier",
    description: "Créer, reprendre et publier ses propres biens.",
  },
  {
    id: "immo.agency.manage.own",
    name: "Gérer son agence",
    category: "Immobilier",
    description: "Administrer biens, agences, équipe, abonnement et visibilité.",
  },
  {
    id: "immo.lead.manage.own",
    name: "Gérer ses leads Immo",
    category: "Immobilier",
    description: "Qualifier, affecter et suivre les contacts et visites.",
  },
  {
    id: "immo.inventory.import.own",
    name: "Importer ses biens",
    category: "Immobilier",
    description: "Créer des imports CSV, XML ou API autorisés par la formule.",
  },
  {
    id: "immo.admin.manage",
    name: "Administrer Shongre Immo",
    category: "Immobilier",
    description: "Configurer marchés, champs, offres, conformité et modération Immo.",
    isSensitive: true,
  },

  // Shongre Auto
  {
    id: "auto.read",
    name: "Consulter Shongre Auto",
    category: "Auto & Véhicules",
    description: "Rechercher, comparer et consulter les véhicules publics.",
  },
  {
    id: "auto.vehicle.manage.own",
    name: "Gérer ses véhicules",
    category: "Auto & Véhicules",
    description: "Créer, reprendre et publier ses propres annonces automobiles.",
  },
  {
    id: "auto.dealer.manage.own",
    name: "Gérer sa concession",
    category: "Auto & Véhicules",
    description: "Administrer stock, sites, équipe, abonnement et vitrine automobile.",
  },
  {
    id: "auto.lead.manage.own",
    name: "Gérer ses demandes Auto",
    category: "Auto & Véhicules",
    description: "Qualifier, affecter et suivre les demandes adressées à sa concession.",
  },
  {
    id: "auto.inventory.import.own",
    name: "Importer son stock Auto",
    category: "Auto & Véhicules",
    description: "Créer des travaux d’import de stock autorisés par la formule.",
  },
  {
    id: "auto.admin.manage",
    name: "Administrer Shongre Auto",
    category: "Auto & Véhicules",
    description: "Configurer marchés, schémas, types, formules, sécurité et modération Auto.",
    isSensitive: true,
  },

  // Shongre Cours
  {
    id: "course.read",
    name: "Consulter Shongre Cours",
    category: "Cours & Formation",
    description: "Rechercher les professeurs et consulter leurs offres publiques.",
  },
  {
    id: "course.request.create",
    name: "Créer une demande de cours",
    category: "Cours & Formation",
    description: "Décrire un besoin élève et recevoir des propositions pertinentes.",
  },
  {
    id: "course.profile.manage.own",
    name: "Gérer son profil professeur",
    category: "Cours & Formation",
    description: "Créer et mettre à jour son profil professeur et ses disponibilités.",
  },
  {
    id: "course.offer.manage.own",
    name: "Gérer ses cours",
    category: "Cours & Formation",
    description: "Créer, modifier, publier et suspendre ses offres de cours.",
  },
  {
    id: "course.lead.read.own",
    name: "Consulter ses demandes qualifiées",
    category: "Cours & Formation",
    description: "Lire les demandes routées vers son profil ou son organisme.",
  },
  {
    id: "course.lead.respond.own",
    name: "Répondre à ses demandes qualifiées",
    category: "Cours & Formation",
    description: "Accepter, refuser ou contester une demande reçue.",
  },
  {
    id: "course.organization.manage.own",
    name: "Gérer son organisme de cours",
    category: "Cours & Formation",
    description: "Administrer équipe, rôles, lieux et boîte de réception de son organisme.",
  },
  {
    id: "course.booking.create",
    name: "Réserver un cours",
    category: "Cours & Formation",
    description: "Créer une réservation lorsque la Phase 2 est activée sur le marché.",
  },
  {
    id: "course.admin.manage",
    name: "Administrer Shongre Cours",
    category: "Cours & Formation",
    description: "Configurer taxonomie, formules, routage, sécurité et activation par marché.",
    isSensitive: true,
  },

  // Profil & Compte
  {
    id: "profile.read",
    name: "Consulter un profil public",
    category: "Profil & Compte",
    description:
      "Accéder aux informations publiques d'un membre (nom, avis, réputation, ancienneté).",
  },
  {
    id: "profile.update.own",
    name: "Modifier son propre profil",
    category: "Profil & Compte",
    description:
      "Mettre à jour ses coordonnées personnelles, son avatar, sa biographie et ses préférences.",
  },
  {
    id: "seller.profile.read",
    name: "Consulter la page vendeur",
    category: "Profil & Compte",
    description:
      "Consulter la fiche vendeur ou la vitrine publique d'un utilisateur.",
  },
  {
    id: "seller.profile.update.own",
    name: "Gérer sa vitrine vendeur",
    category: "Profil & Compte",
    description:
      "Personnaliser sa vitrine vendeur ou boutique professionnelle (horaires, adresse, bannière).",
  },

  // Annonces
  {
    id: "listing.read",
    name: "Consulter les annonces actives",
    category: "Annonces",
    description:
      "Rechercher, filtrer et lire les détails des annonces en ligne.",
  },
  {
    id: "listing.create",
    name: "Déposer une annonce",
    category: "Annonces",
    description:
      "Créer et publier une nouvelle annonce sur la place de marché.",
  },
  {
    id: "listing.update.own",
    name: "Modifier ses propres annonces",
    category: "Annonces",
    description:
      "Éditer le titre, le prix, la description, les photos et les options de livraison de ses annonces.",
  },
  {
    id: "listing.delete.own",
    name: "Supprimer ses propres annonces",
    category: "Annonces",
    description: "Archiver ou supprimer définitivement ses propres annonces.",
  },
  {
    id: "listing.publish",
    name: "Mettre en ligne une annonce",
    category: "Annonces",
    description: "Passer une annonce du statut brouillon à actif.",
  },
  {
    id: "listing.mark_reserved",
    name: "Réserver une annonce",
    category: "Annonces",
    description:
      "Marquer son annonce comme réservée suite à un accord de vente ou paiement.",
  },
  {
    id: "listing.mark_sold",
    name: "Marquer comme vendue",
    category: "Annonces",
    description: "Clôturer la vente d'une annonce réalisée.",
  },
  {
    id: "listing.promote",
    name: "Booster / Promouvoir une annonce",
    category: "Annonces",
    description:
      "Souscrire à des options payantes de mise en avant (Urgent, Remontée en tête, En vedette).",
  },
  {
    id: "listing.moderate",
    name: "Modérer les annonces",
    category: "Annonces",
    description:
      "Suspendre, masquer, approuver ou modifier les annonces signalées ou non conformes.",
    isSensitive: true,
  },
  {
    id: "listing.feature",
    name: "Mettre en avant sur la page d'accueil",
    category: "Annonces",
    description:
      "Sélectionner des annonces éditoriales ou promotionnelles pour la une du site.",
    isSensitive: true,
  },
  {
    id: "listing.bulk_import",
    name: "Import / Export catalogue en masse",
    category: "Annonces",
    description:
      "Synchroniser des stocks ou catalogues via CSV, XML ou connecteur marchand.",
  },

  // Messagerie
  {
    id: "message.read.own",
    name: "Lire ses messages et conversations",
    category: "Messagerie",
    description:
      "Accéder aux fils de discussion privés dans lesquels le membre est engagé.",
  },
  {
    id: "message.send",
    name: "Envoyer des messages et offres",
    category: "Messagerie",
    description:
      "Envoyer un message texte, négocier un prix ou faire une proposition d'achat.",
  },
  {
    id: "message.block",
    name: "Bloquer / Débloquer des utilisateurs",
    category: "Messagerie",
    description:
      "Empêcher un utilisateur indésirable de vous contacter ou d'interagir.",
  },
  {
    id: "conversation.manage.own",
    name: "Gérer ses conversations",
    category: "Messagerie",
    description: "Archiver ou supprimer ses conversations.",
  },
  {
    id: "conversation.audit.privileged",
    name: "Auditer les conversations sensibles",
    category: "Messagerie",
    description:
      "Accéder aux échanges signalés pour modération ou résolution de litige conformément aux CGU.",
    isSensitive: true,
  },

  // Favoris & Recherches
  {
    id: "favorite.manage.own",
    name: "Gérer ses favoris",
    category: "Profil & Compte",
    description:
      "Ajouter ou retirer des annonces et boutiques de sa liste de favoris.",
  },
  {
    id: "saved_search.manage.own",
    name: "Gérer ses recherches sauvegardées",
    category: "Profil & Compte",
    description:
      "Enregistrer des critères de recherche et activer les alertes e-mail/push.",
  },

  // Transactions & Paiements
  {
    id: "order.create",
    name: "Acheter un article via paiement sécurisé",
    category: "Transactions & Paiements",
    description:
      "Initier un achat avec séquestre et protection acheteur Shongre.",
  },
  {
    id: "order.read.own",
    name: "Consulter ses commandes et ventes",
    category: "Transactions & Paiements",
    description:
      "Suivre l'état d'avancement, l'expédition et la réception de ses transactions.",
  },
  {
    id: "order.manage.seller",
    name: "Traiter une vente reçue",
    category: "Transactions & Paiements",
    description:
      "Accepter une commande, générer le bordereau d'envoi et confirmer l'expédition.",
  },
  {
    id: "order.refund",
    name: "Effectuer / autoriser un remboursement",
    category: "Transactions & Paiements",
    description:
      "Rembourser un acheteur suite à annulation, rétractation ou litige.",
    isSensitive: true,
  },
  {
    id: "transaction.audit.finance",
    name: "Auditer l'ensemble des flux financiers",
    category: "Transactions & Paiements",
    description:
      "Visualiser les flux de séquestre, commissions Shongre et transactions globales.",
    isSensitive: true,
  },
  {
    id: "payment.initiate",
    name: "Initier un paiement",
    category: "Transactions & Paiements",
    description:
      "Déclencher un règlement par carte bancaire, virement ou portefeuille.",
  },
  {
    id: "payment.refund",
    name: "Exécuter un virement ou déblocage de fonds",
    category: "Transactions & Paiements",
    description:
      "Débloquer les fonds au vendeur ou reverser le séquestre en cas de litige.",
    isSensitive: true,
  },

  // Avis & Réputation
  {
    id: "review.create",
    name: "Déposer un avis vérifié",
    category: "Profil & Compte",
    description:
      "Évaluer une transaction terminée avec notation sur 5 étoiles et commentaire.",
  },
  {
    id: "review.update.own",
    name: "Modifier son avis déposé",
    category: "Profil & Compte",
    description: "Mettre à jour un avis rédigé dans les délais autorisés.",
  },
  {
    id: "review.moderate",
    name: "Modérer les avis contestés",
    category: "Modération & Signalements",
    description: "Supprimer ou masquer un avis frauduleux ou diffamatoire.",
    isSensitive: true,
  },

  // Boutique & Vitrine
  {
    id: "store.manage.own",
    name: "Gérer sa boutique professionnelle",
    category: "Boutique & Vitrine",
    description:
      "Paramétrer les informations de son enseigne, logo, horaires, SIRET et zones de chalandise.",
  },
  {
    id: "store.analytics.read.own",
    name: "Consulter ses statistiques d'audience",
    category: "Boutique & Vitrine",
    description:
      "Accéder aux métriques de conversion, vues, favoris et rentabilité commerciale.",
  },
  {
    id: "store.customization.manage",
    name: "Personnalisation graphique avancée",
    category: "Boutique & Vitrine",
    description:
      "Bannières personnalisées, carrousels de sélection, mise en page spécifique.",
  },

  // Abonnements & Monétisation
  {
    id: "subscription.manage.own",
    name: "Gérer son abonnement professionnel",
    category: "Boutique & Vitrine",
    description:
      "Changer de forfait Pro, gérer sa facturation et télécharger ses factures.",
  },
  {
    id: "subscription.upgrade",
    name: "Souscrire à un forfait Pro supérieur",
    category: "Boutique & Vitrine",
    description:
      "Augmenter ses quotas d'annonces et débloquer des fonctionnalités premium.",
  },
  {
    id: "monetization.manage",
    name: "Gérer la grille tarifaire de la plateforme",
    category: "Marchés & Configuration",
    description:
      "Définir les tarifs des forfaits Pro, des options de boost et des commissions.",
    isSensitive: true,
  },
  {
    id: "monetization.pricing.update",
    name: "Mettre à jour les taux de commission & frais de protection",
    category: "Marchés & Configuration",
    description:
      "Ajuster les pourcentages de frais de service et les paliers de sécurité.",
    isSensitive: true,
  },

  // Utilisateurs & Équipe
  {
    id: "user.read",
    name: "Consulter l'annuaire des utilisateurs",
    category: "Utilisateurs & Équipe",
    description:
      "Rechercher et afficher les fiches complètes des membres de la plateforme.",
    isSensitive: true,
  },
  {
    id: "user.manage",
    name: "Gérer les comptes utilisateurs",
    category: "Utilisateurs & Équipe",
    description:
      "Modifier les informations d'un compte, réinitialiser des accès ou assister le titulaire.",
    isSensitive: true,
  },
  {
    id: "user.suspend",
    name: "Suspendre / Bannir un utilisateur",
    category: "Modération & Signalements",
    description:
      "Restreindre l'accès d'un membre pour manquement aux règles de sécurité ou fraude.",
    isSensitive: true,
  },
  {
    id: "user.reactivate",
    name: "Réactiver un compte suspendu",
    category: "Modération & Signalements",
    description:
      "Lever une suspension suite à régularisation ou recours validé.",
    isSensitive: true,
  },
  {
    id: "user.verify",
    name: "Valider les pièces d'identité et documents SIRET/KBIS",
    category: "Utilisateurs & Équipe",
    description:
      "Examiner les justificatifs d'identité et d'immatriculation pour attribuer les badges vérifiés.",
    isSensitive: true,
  },

  // Staff Sub-Access
  {
    id: "staff.support.access",
    name: "Accès espace Support client",
    category: "Utilisateurs & Équipe",
    description:
      "Accéder aux outils d'assistance, tickets et historique des requêtes utilisateurs.",
    isSensitive: true,
  },
  {
    id: "staff.operations.access",
    name: "Accès espace Opérations & Logistique",
    category: "Utilisateurs & Équipe",
    description:
      "Superviser les expéditions bloquées, relais et transporteurs partenaires.",
    isSensitive: true,
  },
  {
    id: "staff.finance.access",
    name: "Accès espace Comptabilité & Finances",
    category: "Transactions & Paiements",
    description:
      "Gestion des déblocages de séquestres, factures fournisseurs et taxes.",
    isSensitive: true,
  },
  {
    id: "staff.commercial.access",
    name: "Accès espace Commercial & Partenariats",
    category: "Boutique & Vitrine",
    description:
      "Prospection, onboarding des grands comptes et accords marchands.",
    isSensitive: true,
  },

  // Modération & Signalements
  {
    id: "report.create",
    name: "Signaler un contenu ou un profil suspect",
    category: "Modération & Signalements",
    description:
      "Transmettre un signalement d'annonce frauduleuse ou de comportement abusif.",
  },
  {
    id: "report.review",
    name: "Examiner la file de signalements",
    category: "Modération & Signalements",
    description: "Traiter les signalements déposés par la communauté sous 24h.",
    isSensitive: true,
  },
  {
    id: "moderation.review",
    name: "Accéder à la console de modération",
    category: "Modération & Signalements",
    description:
      "Visualiser la liste globale des contenus en attente ou signalés.",
    isSensitive: true,
  },
  {
    id: "moderation.action",
    name: "Appliquer des sanctions de modération",
    category: "Modération & Signalements",
    description:
      "Masquer, supprimer des annonces, envoyer des avertissements formels.",
    isSensitive: true,
  },

  // Marchés & Taxonomie
  {
    id: "market.manage",
    name: "Gérer les marchés et pays desservis",
    category: "Marchés & Configuration",
    description:
      "Configurer les pays (France, Belgique, Suisse, etc.), langues et devises.",
    isSensitive: true,
  },
  {
    id: "market.configure",
    name: "Paramétrer les zones géographiques locales",
    category: "Marchés & Configuration",
    description: "Gérer les régions, départements et villes prioritaires.",
    isSensitive: true,
  },
  {
    id: "taxonomy.manage",
    name: "Gérer les catégories et attributs",
    category: "Marchés & Configuration",
    description:
      "Créer, modifier ou réordonner les catégories, sous-catégories et schémas d'attributs.",
    isSensitive: true,
  },

  // Administration Globale
  {
    id: "admin.access",
    name: "Accès au panneau d'administration Shongre",
    category: "Administration Système",
    description:
      "Accéder au workspace d'administration et aux tableaux de bord internes.",
    isSensitive: true,
  },
  {
    id: "role.manage",
    name: "Gérer les rôles et attributions du personnel",
    category: "Administration Système",
    description:
      "Attribuer ou révoquer des rôles internes (Modérateur, Support, Admin).",
    isSensitive: true,
  },
  {
    id: "permission.manage",
    name: "Configurer la matrice globale des permissions",
    category: "Administration Système",
    description:
      "Ajuster les permissions par défaut de chaque rôle de la plateforme.",
    isSensitive: true,
  },
  {
    id: "audit.read",
    name: "Consulter le registre d'audit de sécurité",
    category: "Administration Système",
    description:
      "Visualiser les journaux d'événements critiques (changements de rôles, suspensions, etc.).",
    isSensitive: true,
  },
];
