import { Permission } from "../types";
import { CAPABILITIES } from "@shongre/contracts/access-control";
import { labelIdentifier } from "../utilities/identifier-label";

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
    | "Éducation & Formation"
    | "Auto & Véhicules"
    | "Immobilier"
    | "Emploi & Recrutement"
    | "CRM & Ventes"
    | "Marketing & Communication"
    | "Administration Système";
  description: string;
  isSensitive?: boolean;
}

const DESCRIBED_PERMISSIONS: PermissionDefinition[] = [
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
    description:
      "Gérer profil professionnel, CV, candidatures, alertes et consentements.",
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
    description:
      "Administrer les offres, équipes, branches et paramètres employeur autorisés.",
  },
  {
    id: "employment.application.manage.own",
    name: "Gérer les candidatures autorisées",
    category: "Emploi & Recrutement",
    description:
      "Affecter, faire progresser et planifier les candidatures de son périmètre.",
  },
  {
    id: "employment.import.own",
    name: "Importer ses offres d’emploi",
    category: "Emploi & Recrutement",
    description:
      "Prévisualiser et synchroniser les sources autorisées par la formule.",
  },
  {
    id: "employment.admin.manage",
    name: "Administrer Shongre Emploi",
    category: "Emploi & Recrutement",
    description:
      "Configurer taxonomie, offres, conformité, modération et rétention Emploi.",
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
    description:
      "Administrer biens, agences, équipe, abonnement et visibilité.",
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
    description:
      "Configurer marchés, champs, offres, conformité et modération Immo.",
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
    description:
      "Créer, reprendre et publier ses propres annonces automobiles.",
  },
  {
    id: "auto.dealer.manage.own",
    name: "Gérer sa concession",
    category: "Auto & Véhicules",
    description:
      "Administrer stock, sites, équipe, abonnement et vitrine automobile.",
  },
  {
    id: "auto.lead.manage.own",
    name: "Gérer ses demandes Auto",
    category: "Auto & Véhicules",
    description:
      "Qualifier, affecter et suivre les demandes adressées à sa concession.",
  },
  {
    id: "auto.inventory.import.own",
    name: "Importer son stock Auto",
    category: "Auto & Véhicules",
    description:
      "Créer des travaux d’import de stock autorisés par la formule.",
  },
  {
    id: "auto.admin.manage",
    name: "Administrer Shongre Auto",
    category: "Auto & Véhicules",
    description:
      "Configurer marchés, schémas, types, formules, sécurité et modération Auto.",
    isSensitive: true,
  },

  // Shongre Education (stable course.* capability IDs)
  {
    id: "course.read",
    name: "Consulter Shongre Education",
    category: "Éducation & Formation",
    description:
      "Rechercher les professeurs et consulter leurs offres publiques.",
  },
  {
    id: "course.request.create",
    name: "Créer une demande de cours",
    category: "Éducation & Formation",
    description:
      "Décrire un besoin élève et recevoir des propositions pertinentes.",
  },
  {
    id: "course.profile.manage.own",
    name: "Gérer son profil professeur",
    category: "Éducation & Formation",
    description:
      "Créer et mettre à jour son profil professeur et ses disponibilités.",
  },
  {
    id: "course.offer.manage.own",
    name: "Gérer ses cours",
    category: "Éducation & Formation",
    description: "Créer, modifier, publier et suspendre ses offres de cours.",
  },
  {
    id: "course.lead.read.own",
    name: "Consulter ses demandes qualifiées",
    category: "Éducation & Formation",
    description: "Lire les demandes routées vers son profil ou son organisme.",
  },
  {
    id: "course.lead.respond.own",
    name: "Répondre à ses demandes qualifiées",
    category: "Éducation & Formation",
    description: "Accepter, refuser ou contester une demande reçue.",
  },
  {
    id: "course.organization.manage.own",
    name: "Gérer son organisme de cours",
    category: "Éducation & Formation",
    description:
      "Administrer équipe, rôles, lieux et boîte de réception de son organisme.",
  },
  {
    id: "course.booking.create",
    name: "Réserver un cours",
    category: "Éducation & Formation",
    description:
      "Créer une réservation lorsque la Phase 2 est activée sur le marché.",
  },
  {
    id: "course.admin.manage",
    name: "Administrer Shongre Education",
    category: "Éducation & Formation",
    description:
      "Configurer taxonomie, formules, routage, sécurité et activation par marché.",
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
      "Initier un achat avec paiement en ligne via le prestataire configuré.",
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
      "Visualiser les flux de paiement, commissions Shongre et transactions globales.",
    isSensitive: true,
  },
  {
    id: "finance.account.read.own",
    name: "Consulter ses propres finances",
    category: "Transactions & Paiements",
    description:
      "Consulter uniquement ses dépenses, revenus vendeur, remboursements, paiements et factures.",
  },
  {
    id: "finance.organization.read.own",
    name: "Consulter les finances de son organisation",
    category: "Transactions & Paiements",
    description:
      "Consulter les données financières d’une organisation avec une adhésion et un périmètre finance autorisés.",
    isSensitive: true,
  },
  {
    id: "finance.platform.read",
    name: "Consulter les revenus de la plateforme",
    category: "Transactions & Paiements",
    description:
      "Consulter les agrégats globaux de revenus, GMV, encaissements, taxes et dettes vendeurs.",
    isSensitive: true,
  },
  {
    id: "finance.transactions.read",
    name: "Consulter le registre des transactions financières",
    category: "Transactions & Paiements",
    description:
      "Rechercher les transactions et examiner leurs écritures comptables équilibrées.",
    isSensitive: true,
  },
  {
    id: "finance.reconciliation.manage",
    name: "Gérer le rapprochement financier",
    category: "Transactions & Paiements",
    description:
      "Examiner et résoudre les écarts entre paiements, factures, fournisseurs et grand livre.",
    isSensitive: true,
  },
  {
    id: "finance.payouts.manage",
    name: "Gérer les virements vendeurs",
    category: "Transactions & Paiements",
    description:
      "Examiner, approuver et suivre les virements dus aux vendeurs autorisés.",
    isSensitive: true,
  },
  {
    id: "finance.adjustments.create",
    name: "Créer un ajustement financier",
    category: "Transactions & Paiements",
    description:
      "Créer une écriture corrective auditée sans modifier l’historique comptable publié.",
    isSensitive: true,
  },
  {
    id: "finance.exports.read",
    name: "Exporter les données financières",
    category: "Transactions & Paiements",
    description:
      "Télécharger les transactions autorisées avec montants en unités monétaires mineures.",
    isSensitive: true,
  },
  {
    id: "invoice.read",
    name: "Consulter les factures",
    category: "Transactions & Paiements",
    description:
      "Consulter les factures de l’organisation dans les marchés autorisés.",
  },
  {
    id: "invoice.create",
    name: "Créer et modifier les factures",
    category: "Transactions & Paiements",
    description:
      "Créer des brouillons et modifier les factures avant leur finalisation.",
  },
  {
    id: "invoice.finalize",
    name: "Finaliser les factures",
    category: "Transactions & Paiements",
    description:
      "Valider définitivement une facture et lui attribuer sa numérotation légale.",
    isSensitive: true,
  },
  {
    id: "invoice.transmit",
    name: "Transmettre les factures",
    category: "Transactions & Paiements",
    description:
      "Envoyer les factures finalisées par les canaux autorisés pour l’organisation.",
    isSensitive: true,
  },
  {
    id: "invoice.export",
    name: "Exporter les factures",
    category: "Transactions & Paiements",
    description:
      "Télécharger les documents de facturation et les données comptables autorisées.",
  },
  {
    id: "invoice.party.manage",
    name: "Gérer les clients et fournisseurs de facturation",
    category: "Transactions & Paiements",
    description:
      "Créer et mettre à jour les coordonnées de facturation des tiers de l’organisation.",
  },
  {
    id: "invoice.received.manage",
    name: "Gérer les factures reçues",
    category: "Transactions & Paiements",
    description:
      "Importer, qualifier et suivre les factures fournisseurs reçues par l’organisation.",
  },
  {
    id: "invoicing.tenant.manage",
    name: "Configurer Shongre Facturation",
    category: "Transactions & Paiements",
    description:
      "Gérer les paramètres légaux, fiscaux et de numérotation de l’organisation.",
    isSensitive: true,
  },
  {
    id: "invoicing.audit.read",
    name: "Consulter l’audit de facturation",
    category: "Transactions & Paiements",
    description:
      "Examiner l’historique protégé des opérations et transmissions de facturation.",
    isSensitive: true,
  },
  {
    id: "support.invoicing.inspect",
    name: "Assister sur la facturation",
    category: "Transactions & Paiements",
    description:
      "Inspecter les données de facturation strictement nécessaires au support autorisé.",
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
      "Déclencher un versement vendeur ou un remboursement en cas de litige.",
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
      "Définir les tarifs des forfaits Pro et des options de visibilité.",
    isSensitive: true,
  },
  {
    id: "monetization.pricing.update",
    name: "Mettre à jour les frais de service",
    category: "Marchés & Configuration",
    description:
      "Ajuster les frais de protection et les paliers de sécurité hors commission.",
    isSensitive: true,
  },
  {
    id: "commissions.read",
    name: "Consulter les commissions",
    category: "Transactions & Paiements",
    description: "Lire les politiques et l’explication d’un calcul appliqué.",
    isSensitive: true,
  },
  {
    id: "commissions.simulate",
    name: "Simuler une commission",
    category: "Transactions & Paiements",
    description:
      "Utiliser le calculateur de production sans créer de transaction.",
    isSensitive: true,
  },
  {
    id: "commissions.manage",
    name: "Préparer les politiques de commission",
    category: "Marchés & Configuration",
    description: "Créer, cloner et soumettre des brouillons versionnés.",
    isSensitive: true,
  },
  {
    id: "commissions.publish",
    name: "Approuver et publier les commissions",
    category: "Marchés & Configuration",
    description:
      "Valider une politique financière selon le contrôle maker-checker.",
    isSensitive: true,
  },
  {
    id: "commissions.override_account",
    name: "Déroger par compte ou organisation",
    category: "Marchés & Configuration",
    description: "Créer un accord commercial nominatif prioritaire et audité.",
    isSensitive: true,
  },
  {
    id: "commissions.promotions.manage",
    name: "Gérer les promotions sur commission",
    category: "Marchés & Configuration",
    description:
      "Relier une remise de commission au catalogue de campagnes existant.",
    isSensitive: true,
  },
  {
    id: "commissions.analytics.read",
    name: "Consulter l’analytique des commissions",
    category: "Transactions & Paiements",
    description:
      "Comparer GMV, remises, remboursements et taux de prise effectif.",
    isSensitive: true,
  },
  {
    id: "finance.commission_revenue.read",
    name: "Consulter le revenu de commission",
    category: "Transactions & Paiements",
    description: "Lire le revenu net de commission séparément du GMV.",
    isSensitive: true,
  },
  {
    id: "monetization.plans.read",
    name: "Consulter les forfaits professionnels",
    category: "Marchés & Configuration",
    description:
      "Lire les familles de forfaits génériques et verticaux publiées.",
    isSensitive: true,
  },
  {
    id: "monetization.plans.manage",
    name: "Gérer les forfaits professionnels",
    category: "Marchés & Configuration",
    description:
      "Créer et modifier les brouillons de forfaits et leurs transitions.",
    isSensitive: true,
  },
  {
    id: "monetization.pricing.manage",
    name: "Gérer les prix des forfaits",
    category: "Marchés & Configuration",
    description:
      "Configurer les prix mensuels, annuels et leurs dates d’effet.",
    isSensitive: true,
  },
  {
    id: "monetization.promotions.read",
    name: "Consulter les campagnes promotionnelles",
    category: "Marchés & Configuration",
    description: "Lire les coupons, campagnes et règles de cumul.",
    isSensitive: true,
  },
  {
    id: "monetization.promotions.manage",
    name: "Gérer les campagnes promotionnelles",
    category: "Marchés & Configuration",
    description: "Créer, planifier et arrêter les campagnes promotionnelles.",
    isSensitive: true,
  },
  {
    id: "monetization.trials.manage",
    name: "Gérer les essais professionnels",
    category: "Marchés & Configuration",
    description:
      "Configurer l’éligibilité, la durée et la conversion des essais.",
    isSensitive: true,
  },
  {
    id: "monetization.subscriptions.read",
    name: "Consulter les abonnements professionnels",
    category: "Marchés & Configuration",
    description: "Lire les abonnements, essais et changements programmés.",
    isSensitive: true,
  },
  {
    id: "monetization.subscriptions.manage",
    name: "Administrer les abonnements professionnels",
    category: "Marchés & Configuration",
    description: "Piloter les changements et incidents d’abonnement autorisés.",
    isSensitive: true,
  },
  {
    id: "monetization.complimentary_grants.request",
    name: "Demander un forfait offert",
    category: "Marchés & Configuration",
    description:
      "Soumettre une période commerciale motivée à l’approbation du propriétaire.",
    isSensitive: true,
  },
  {
    id: "monetization.complimentary_grants.create",
    name: "Accorder un forfait offert",
    category: "Marchés & Configuration",
    description:
      "Accorder une période commerciale tracée après approbation indépendante.",
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
      "Gestion des versements, remboursements, factures fournisseurs et taxes.",
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

  // Monétisation & commandes
  {
    id: "monetization.orders.read",
    name: "Consulter les commandes de monétisation",
    category: "Transactions & Paiements",
    description:
      "Consulter les commandes liées aux formules, options payantes et crédits de visibilité.",
    isSensitive: true,
  },

  // Assistance & conformité
  {
    id: "support.case.read",
    name: "Consulter les dossiers d’assistance",
    category: "Utilisateurs & Équipe",
    description:
      "Lire les demandes d’assistance et leur historique dans son périmètre autorisé.",
    isSensitive: true,
  },
  {
    id: "support.case.manage",
    name: "Gérer les dossiers d’assistance",
    category: "Utilisateurs & Équipe",
    description:
      "Affecter, traiter et clôturer les demandes d’assistance autorisées.",
    isSensitive: true,
  },
  {
    id: "compliance.review",
    name: "Examiner les contrôles de conformité",
    category: "Modération & Signalements",
    description:
      "Consulter et instruire les contrôles de conformité nécessitant une décision humaine.",
    isSensitive: true,
  },
  {
    id: "compliance.sensitive.read",
    name: "Consulter les données de conformité restreintes",
    category: "Modération & Signalements",
    description:
      "Consulter uniquement les données sensibles nécessaires à une mission de conformité autorisée.",
    isSensitive: true,
  },
  {
    id: "compliance.policy.read",
    name: "Consulter le registre des règles de conformité",
    category: "Marchés & Configuration",
    description:
      "Lire les règles versionnées, leur gouvernance, leurs sources et leurs dates d’effet.",
    isSensitive: true,
  },
  {
    id: "compliance.policy.manage",
    name: "Administrer les règles de conformité",
    category: "Marchés & Configuration",
    description:
      "Planifier une règle versionnée avec un motif, une source et une trace de changement.",
    isSensitive: true,
  },
  {
    id: "compliance.retention.manage",
    name: "Administrer la conservation des données de conformité",
    category: "Marchés & Configuration",
    description:
      "Configurer les durées et actions de fin de conservation sous gouvernance juridique.",
    isSensitive: true,
  },
  {
    id: "compliance.audit.read",
    name: "Consulter l’audit de conformité",
    category: "Modération & Signalements",
    description:
      "Lire les transitions, décisions et versions de politique sans exposer les justificatifs bruts.",
    isSensitive: true,
  },
  {
    id: "compliance.restrict_account",
    name: "Restreindre un compte pour conformité",
    category: "Modération & Signalements",
    description:
      "Limiter les capacités d’un compte lorsqu’une exigence de conformité le justifie.",
    isSensitive: true,
  },

  // Fournisseurs & intégrations
  {
    id: "provider.read",
    name: "Consulter les fournisseurs et intégrations",
    category: "Administration Système",
    description:
      "Accéder au catalogue des fournisseurs externes et à leur état opérationnel.",
    isSensitive: true,
  },
  {
    id: "provider.manage",
    name: "Gérer les fournisseurs et intégrations",
    category: "Administration Système",
    description:
      "Activer, désactiver et administrer les fournisseurs externes autorisés.",
    isSensitive: true,
  },
  {
    id: "provider.configuration.read",
    name: "Consulter la configuration des fournisseurs",
    category: "Administration Système",
    description:
      "Lire les paramètres non secrets et les surcharges de marché des fournisseurs.",
    isSensitive: true,
  },
  {
    id: "provider.configuration.manage",
    name: "Modifier la configuration des fournisseurs",
    category: "Administration Système",
    description:
      "Modifier les paramètres et les surcharges de marché des fournisseurs.",
    isSensitive: true,
  },
  {
    id: "provider.routing.manage",
    name: "Gérer le routage et les fournisseurs de secours",
    category: "Administration Système",
    description:
      "Définir les priorités, bascules et solutions de secours par capacité.",
    isSensitive: true,
  },
  {
    id: "provider.credentials.status.read",
    name: "Consulter l’état des identifiants fournisseurs",
    category: "Administration Système",
    description:
      "Vérifier si les identifiants sont configurés sans accéder à leur valeur secrète.",
    isSensitive: true,
  },
  {
    id: "provider.credentials.manage",
    name: "Gérer les identifiants fournisseurs",
    category: "Administration Système",
    description:
      "Créer, renouveler ou révoquer les identifiants secrets des fournisseurs.",
    isSensitive: true,
  },
  {
    id: "provider.health.read",
    name: "Consulter la santé des fournisseurs",
    category: "Administration Système",
    description:
      "Consulter les indicateurs de disponibilité et de latence des intégrations.",
    isSensitive: true,
  },
  {
    id: "provider.test",
    name: "Tester une intégration fournisseur",
    category: "Administration Système",
    description:
      "Exécuter un diagnostic contrôlé de connectivité et de configuration.",
    isSensitive: true,
  },

  // Gouvernance de l’administration
  {
    id: "admin.configuration.manage",
    name: "Gérer la configuration de l’administration",
    category: "Administration Système",
    description:
      "Modifier les paramètres globaux du workspace d’administration.",
    isSensitive: true,
  },
  {
    id: "admin.staff.manage",
    name: "Gérer les membres de l’équipe interne",
    category: "Administration Système",
    description:
      "Inviter, suspendre et administrer les comptes du personnel Shongre.",
    isSensitive: true,
  },
  {
    id: "admin.permissions.manage",
    name: "Gérer les permissions de l’administration",
    category: "Administration Système",
    description:
      "Configurer les droits du personnel et les périmètres d’accès internes.",
    isSensitive: true,
  },

  // CRM
  {
    id: "crm.access",
    name: "Accéder au CRM",
    category: "Boutique & Vitrine",
    description: "Ouvrir le workspace CRM et ses tableaux de bord autorisés.",
    isSensitive: true,
  },
  {
    id: "crm.contact.read",
    name: "Consulter les contacts CRM",
    category: "Boutique & Vitrine",
    description:
      "Lire les contacts et leurs informations commerciales autorisées.",
    isSensitive: true,
  },
  {
    id: "crm.contact.manage",
    name: "Gérer les contacts CRM",
    category: "Boutique & Vitrine",
    description: "Créer, modifier et qualifier les contacts commerciaux.",
    isSensitive: true,
  },
  {
    id: "crm.company.read",
    name: "Consulter les entreprises CRM",
    category: "Boutique & Vitrine",
    description: "Lire les fiches entreprises et leur historique commercial.",
    isSensitive: true,
  },
  {
    id: "crm.company.manage",
    name: "Gérer les entreprises CRM",
    category: "Boutique & Vitrine",
    description: "Créer, modifier et qualifier les fiches entreprises.",
    isSensitive: true,
  },
  {
    id: "crm.opportunity.read",
    name: "Consulter les opportunités CRM",
    category: "Boutique & Vitrine",
    description: "Lire les opportunités et leur progression commerciale.",
    isSensitive: true,
  },
  {
    id: "crm.opportunity.manage",
    name: "Gérer les opportunités CRM",
    category: "Boutique & Vitrine",
    description:
      "Créer, affecter et faire progresser les opportunités commerciales.",
    isSensitive: true,
  },
  {
    id: "crm.ai_prospecting.use",
    name: "Utiliser la prospection assistée par IA",
    category: "Boutique & Vitrine",
    description:
      "Lancer les outils de recherche et de qualification assistés par IA dans le CRM.",
    isSensitive: true,
  },

  // Règles commerciales
  {
    id: "commercial_rules.read",
    name: "Consulter les règles commerciales",
    category: "Marchés & Configuration",
    description: "Lire les règles de prix, d’éligibilité et de monétisation.",
    isSensitive: true,
  },
  {
    id: "commercial_rules.edit",
    name: "Modifier les règles commerciales",
    category: "Marchés & Configuration",
    description: "Créer et modifier les brouillons de règles commerciales.",
    isSensitive: true,
  },
  {
    id: "commercial_rules.approve",
    name: "Approuver les règles commerciales",
    category: "Marchés & Configuration",
    description:
      "Valider les règles commerciales avant leur mise en production.",
    isSensitive: true,
  },
  {
    id: "commercial_rules.publish",
    name: "Publier les règles commerciales",
    category: "Marchés & Configuration",
    description:
      "Activer une version approuvée des règles commerciales sur les marchés ciblés.",
    isSensitive: true,
  },
  {
    id: "analytics.platform.read",
    name: "Consulter les analytics plateforme",
    category: "Administration Système",
    description:
      "Consulter les indicateurs agrégés d’activité, de conversion et de liquidité de la plateforme.",
    isSensitive: true,
  },
  {
    id: "analytics.marketing.read",
    name: "Consulter les analytics marketing",
    category: "Marketing & Communication",
    description:
      "Consulter les acquisitions, campagnes, recherches et performances SEO agrégées.",
    isSensitive: true,
  },
  {
    id: "analytics.finance.read",
    name: "Consulter les analytics financières",
    category: "Transactions & Paiements",
    description:
      "Consulter les revenus, remboursements, abonnements et rapprochements financiers agrégés.",
    isSensitive: true,
  },
  {
    id: "analytics.technical.read",
    name: "Consulter la santé des analytics",
    category: "Administration Système",
    description:
      "Consulter l’état des fournisseurs, synchronisations, files et échecs techniques sans révéler de secret.",
    isSensitive: true,
  },
];

const describedById = new Map(
  DESCRIBED_PERMISSIONS.map((definition) => [definition.id, definition]),
);

function fallbackCategory(
  capability: Permission,
): PermissionDefinition["category"] {
  if (capability.startsWith("crm.")) return "CRM & Ventes";
  if (capability.startsWith("marketing.")) return "Marketing & Communication";
  if (capability.startsWith("provider.")) return "Administration Système";
  if (capability.startsWith("support.")) return "Utilisateurs & Équipe";
  if (capability.startsWith("compliance.")) return "Modération & Signalements";
  if (capability.startsWith("commercial_rules."))
    return "Marchés & Configuration";
  return "Administration Système";
}

const INTERNAL_RESOURCE_LABELS: Record<string, string> = {
  "crm.prospecting": "la prospection commerciale",
  "crm.prospecting.lists": "les listes de prospects",
  "crm.prospecting.campaigns": "les campagnes de prospection",
  "crm.prospecting.analytics": "les analyses de prospection",
  "crm.prospecting.profiles": "les profils de ciblage",
  "crm.prospecting.outreach": "les prises de contact sortantes",
  "crm.prospecting.sources": "les sources de prospection",
  "crm.prospecting.compliance": "la conformité de la prospection",
  "crm.dashboard": "le tableau de bord CRM",
  "crm.accounts": "les comptes CRM",
  "crm.contacts": "les contacts CRM",
  "crm.pipelines": "les pipelines CRM",
  "crm.opportunities": "les opportunités CRM",
  "crm.tasks": "les tâches CRM",
  "crm.activities": "les activités CRM",
  "crm.analytics": "les analyses CRM",
  "crm.automation": "les automatisations CRM",
  "crm.email": "les e-mails CRM",
  "crm.email.templates": "les modèles d’e-mails CRM",
  "crm.ai": "les outils IA du CRM",
  "crm.configuration": "la configuration CRM",
  "crm.products": "les produits CRM",
  "crm.quotes": "les devis CRM",
  "crm.custom_fields": "les champs personnalisés CRM",
  "marketing.dashboard": "le tableau de bord Marketing",
  "marketing.profiles": "les profils Marketing",
  "marketing.lists": "les listes Marketing",
  "marketing.segments": "les segments Marketing",
  "marketing.campaigns": "les campagnes Marketing",
  "marketing.templates": "les modèles Marketing",
  "marketing.automation": "les parcours automatisés Marketing",
  "marketing.analytics": "les analyses Marketing",
  "marketing.senders": "les identités d’expédition Marketing",
  "marketing.domains": "les domaines d’envoi Marketing",
  "marketing.compliance": "la conformité Marketing",
  "marketing.settings": "les paramètres Marketing",
};

const INTERNAL_ACTION_LABELS: Record<string, string> = {
  read: "Consulter",
  create: "Créer",
  update: "Modifier",
  delete: "Supprimer",
  export: "Exporter",
  manage: "Gérer",
  transition: "Faire progresser",
  complete: "Terminer",
  send: "Envoyer",
  use: "Utiliser",
  approve: "Approuver",
  pause: "Suspendre",
  cancel: "Annuler",
  discover: "Découvrir des entreprises avec",
  import: "Importer des prospects avec",
  enrich: "Enrichir les prospects avec",
  score: "Évaluer les prospects avec",
  merge: "Fusionner les doublons dans",
  convert_shongre: "Convertir vers Shongre depuis",
  internal_first_party: "Utiliser les données first-party autorisées dans",
};

function internalPlatformPermission(
  capability: Permission,
): PermissionDefinition | null {
  if (!capability.startsWith("crm.") && !capability.startsWith("marketing.")) {
    return null;
  }

  const segments = capability.split(".");
  const action = segments.at(-1) ?? "manage";
  const resourceKey = segments.slice(0, -1).join(".");
  const resource = INTERNAL_RESOURCE_LABELS[resourceKey];
  const actionLabel = INTERNAL_ACTION_LABELS[action];
  if (!resource || !actionLabel) return null;

  return {
    id: capability,
    name: `${actionLabel} ${resource}`,
    category: fallbackCategory(capability),
    description: `${actionLabel} ${resource} dans le périmètre explicitement accordé.`,
    isSensitive: true,
  };
}

/**
 * Presentation metadata follows the canonical capability registry. A newly
 * added capability can never silently disappear from the staff matrix merely
 * because its translated description has not been written yet.
 */
export const ALL_PERMISSIONS: PermissionDefinition[] = CAPABILITIES.map(
  (capability) =>
    describedById.get(capability) ??
    internalPlatformPermission(capability) ?? {
      id: capability,
      name: labelIdentifier(capability),
      category: fallbackCategory(capability),
      description: "Capacité explicite de la politique d'accès Shongre.",
      isSensitive: true,
    },
);

const permissionDefinitionsById = new Map(
  ALL_PERMISSIONS.map((definition) => [definition.id, definition]),
);

export function getPermissionDisplayName(permission: string): string {
  return (
    permissionDefinitionsById.get(permission as Permission)?.name ??
    labelIdentifier(permission)
  );
}
