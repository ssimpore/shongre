/**
 * SHONGRE CANONICAL PROVIDER CAPABILITIES REGISTRY
 * Authoritative descriptions, category taxonomy, and feature dependencies.
 */

import type {
  ProviderAuditEvent,
  ProviderCapability,
  ProviderCategory,
} from "./provider.types";

export interface CategoryMetadata {
  id: ProviderCategory;
  name: string;
  shortLabel: string;
  description: string;
  iconName: string;
  badgeClass: string;
  isCore: boolean;
}

export interface CapabilityMetadata {
  id: ProviderCapability;
  category: ProviderCategory;
  name: string;
  description: string;
  usedByFeatures: string[];
  isRedundancyRecommended: boolean;
}

export const PROVIDER_AUDIT_ACTION_LABELS: Record<
  ProviderAuditEvent["action"],
  string
> = {
  configured: "Configuration mise à jour",
  enabled: "Fournisseur activé",
  disabled: "Fournisseur désactivé",
  priority_changed: "Priorité de routage modifiée",
  environment_changed: "Environnement modifié",
  credentials_updated: "Identifiants mis à jour",
  market_override_set: "Surcharge de marché appliquée",
  market_override_reset: "Surcharge de marché réinitialisée",
  health_simulated: "Test de santé exécuté",
};

export const PROVIDER_CATEGORIES: Record<ProviderCategory, CategoryMetadata> = {
  PAYMENT: {
    id: "PAYMENT",
    name: "Paiements & Séquestre",
    shortLabel: "Paiements",
    description:
      "Encaissement par carte, portefeuilles électroniques, autorisations et séquestre sécurisé.",
    iconName: "CreditCard",
    badgeClass: "bg-success-surface text-success border-success-border",
    isCore: true,
  },
  PAYOUT: {
    id: "PAYOUT",
    name: "Versements Vendeurs (Payouts)",
    shortLabel: "Versements",
    description:
      "Virements bancaires automatisés et transferts instantanés vers les vendeurs.",
    iconName: "Coins",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
    isCore: true,
  },
  DELIVERY: {
    id: "DELIVERY",
    name: "Livraison & Transporteurs",
    shortLabel: "Livraison",
    description:
      "Points relais, livraison à domicile, express, volumineux, devis et suivi de colis.",
    iconName: "Truck",
    badgeClass: "bg-info-surface text-info border-info-border",
    isCore: true,
  },
  AUTHENTICATION: {
    id: "AUTHENTICATION",
    name: "Authentification & SSO",
    shortLabel: "Auth & SSO",
    description:
      "Connexion sociale Google / Apple, mot de passe sécurisé et validation 2FA/MFA.",
    iconName: "KeyRound",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    isCore: true,
  },
  EMAIL: {
    id: "EMAIL",
    name: "Emails Transactionnels & Marketing",
    shortLabel: "Email",
    description:
      "Envoi d'emails de confirmation, alertes sécurisées et campagnes de newsletter.",
    iconName: "Mail",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    isCore: true,
  },
  SMS: {
    id: "SMS",
    name: "SMS & Codes OTP",
    shortLabel: "SMS OTP",
    description:
      "Envoi de codes de validation SMS et notifications critiques par message.",
    iconName: "Smartphone",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    isCore: false,
  },
  PUSH: {
    id: "PUSH",
    name: "Notifications Push Web & Mobile",
    shortLabel: "Push",
    description:
      "Alertes en temps réel sur navigateur et applications mobiles (FCM).",
    iconName: "Bell",
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200",
    isCore: false,
  },
  AI: {
    id: "AI",
    name: "Intelligence Artificielle",
    shortLabel: "IA Générative",
    description:
      "Assistance à la rédaction d'annonces, scoring anti-fraude, et recherche de prospects CRM.",
    iconName: "Sparkles",
    badgeClass: "bg-warning-surface text-warning border-warning-border",
    isCore: true,
  },
  SEARCH: {
    id: "SEARCH",
    name: "Moteurs de Recherche",
    shortLabel: "Recherche",
    description:
      "Recherche plein texte sur la marketplace et prospection web externe pour le CRM.",
    iconName: "Search",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    isCore: true,
  },
  MAPS: {
    id: "MAPS",
    name: "Cartographie & Rendu",
    shortLabel: "Cartes",
    description:
      "Affichage des fonds de carte interactifs et tuiles géographiques.",
    iconName: "Map",
    badgeClass: "bg-lime-50 text-lime-700 border-lime-200",
    isCore: true,
  },
  GEOCODING: {
    id: "GEOCODING",
    name: "Géocodage & Autocomplétion",
    shortLabel: "Géocodage",
    description:
      "Résolution des adresses postales, autocomplétion des villes et calcul des distances.",
    iconName: "MapPin",
    badgeClass: "bg-success-surface text-success border-success-border",
    isCore: true,
  },
  IDENTITY_VERIFICATION: {
    id: "IDENTITY_VERIFICATION",
    name: "Vérification d'Identité (KYC)",
    shortLabel: "KYC Identité",
    description:
      "Contrôle automatisé des pièces d'identité et prévention de l'usurpation.",
    iconName: "UserCheck",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
    isCore: false,
  },
  BUSINESS_VERIFICATION: {
    id: "BUSINESS_VERIFICATION",
    name: "Vérification Entreprises (KYB / SIRET)",
    shortLabel: "KYB Entreprise",
    description:
      "Interrogation des registres officiels d'entreprises (INSEE, SIRENE, TVA VIES).",
    iconName: "Building2",
    badgeClass: "bg-info-surface text-info border-info-border",
    isCore: true,
  },
  STORAGE: {
    id: "STORAGE",
    name: "Stockage Fichiers & Médias",
    shortLabel: "Stockage",
    description:
      "Stockage objet d'images de publications, pièces jointes de litiges et factures.",
    iconName: "HardDrive",
    badgeClass: "bg-stone-100 text-stone-700 border-stone-200",
    isCore: true,
  },
  CDN: {
    id: "CDN",
    name: "Réseau de Distribution (CDN)",
    shortLabel: "CDN & Cache",
    description:
      "Accélération globale de la distribution des assets et réduction de la latence.",
    iconName: "Zap",
    badgeClass: "bg-warning-surface text-warning border-warning-border",
    isCore: false,
  },
  IMAGE_PROCESSING: {
    id: "IMAGE_PROCESSING",
    name: "Optimisation & Redimensionnement d'Images",
    shortLabel: "Images",
    description:
      "Compression WebP/AVIF, génération automatique de miniatures et filigranes.",
    iconName: "Image",
    badgeClass: "bg-primary-light text-primary border-primary-border",
    isCore: false,
  },
  ANALYTICS: {
    id: "ANALYTICS",
    name: "Mesure d'Audience & Analytique",
    shortLabel: "Analytique",
    description:
      "Mesure de trafic respectueuse de la vie privée (conforme RGPD / sans cookies tiers).",
    iconName: "BarChart3",
    badgeClass: "bg-teal-50 text-teal-800 border-teal-300",
    isCore: false,
  },
  ERROR_MONITORING: {
    id: "ERROR_MONITORING",
    name: "Surveillance des Erreurs & Performance",
    shortLabel: "Monitoring",
    description:
      "Détection en temps réel des exceptions frontend et métriques Core Web Vitals.",
    iconName: "Activity",
    badgeClass: "bg-danger-surface text-danger border-danger-border",
    isCore: false,
  },
  FRAUD_RISK: {
    id: "FRAUD_RISK",
    name: "Score de Risque & Anti-Fraude",
    shortLabel: "Anti-Fraude",
    description:
      "Détection des comportements frauduleux et analyse des risques de transaction.",
    iconName: "ShieldAlert",
    badgeClass: "bg-warning-surface text-warning border-warning-border",
    isCore: false,
  },
  CAPTCHA: {
    id: "CAPTCHA",
    name: "Protection Anti-Bot (CAPTCHA)",
    shortLabel: "CAPTCHA",
    description:
      "Protection invisible contre le spam et les bots sur les formulaires sensibles.",
    iconName: "ShieldCheck",
    badgeClass: "bg-neutral-100 text-neutral-800 border-neutral-300",
    isCore: false,
  },
  CRM: {
    id: "CRM",
    name: "Enrichissement CRM Externe",
    shortLabel: "CRM",
    description:
      "Synchronisation et enrichissement de données entreprises externes.",
    iconName: "Briefcase",
    badgeClass: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    isCore: false,
  },
  INVOICING: {
    id: "INVOICING",
    name: "Facturation & Factur-X",
    shortLabel: "Facturation",
    description:
      "Génération de factures Pro et conformité facturation électronique.",
    iconName: "FileText",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    isCore: false,
  },
};

export const PROVIDER_CAPABILITIES: Record<
  ProviderCapability,
  CapabilityMetadata
> = {
  // Payment
  "payment.card": {
    id: "payment.card",
    category: "PAYMENT",
    name: "Paiement par Carte Bancaire",
    description:
      "Encaissement sécurisé CB, Visa, Mastercard avec protocole 3D Secure v2.",
    usedByFeatures: [
      "Achat direct",
      "Réservation avec séquestre",
      "Abonnements Pro",
      "Options de boost",
    ],
    isRedundancyRecommended: true,
  },
  "payment.wallet": {
    id: "payment.wallet",
    category: "PAYMENT",
    name: "Portefeuilles Électroniques (Apple Pay / Google Pay)",
    description:
      "Paiement en 1 clic via Apple Pay et Google Pay sur mobile et web.",
    usedByFeatures: ["Achat direct mobile", "Boosts express"],
    isRedundancyRecommended: false,
  },
  "payment.sepa": {
    id: "payment.sepa",
    category: "PAYMENT",
    name: "Prélèvement / Virement SEPA",
    description:
      "Paiement direct par compte bancaire SEPA pour montants élevés.",
    usedByFeatures: ["Abonnements Pro annuels", "Grosses transactions"],
    isRedundancyRecommended: false,
  },
  "payment.escrow": {
    id: "payment.escrow",
    category: "PAYMENT",
    name: "Séquestre & Cantonnement de Fonds",
    description:
      "Conservation sécurisée des fonds sur compte de cantonnement jusqu'à la remise conforme.",
    usedByFeatures: ["Protection acheteur", "Réservation sécurisée"],
    isRedundancyRecommended: true,
  },
  "payment.refund": {
    id: "payment.refund",
    category: "PAYMENT",
    name: "Remboursements Automatisés",
    description:
      "Déclenchement des remboursements totaux ou partiels en cas d'annulation ou litige.",
    usedByFeatures: ["Gestion des litiges", "Refus de commande par le vendeur"],
    isRedundancyRecommended: true,
  },
  "payout.transfer": {
    id: "payout.transfer",
    category: "PAYOUT",
    name: "Virement Standard vers Vendeur",
    description:
      "Virement SEPA régulier sous 24 à 48h une fois la transaction finalisée.",
    usedByFeatures: ["Portefeuille vendeur", "Espace Pro"],
    isRedundancyRecommended: false,
  },
  "payout.instant": {
    id: "payout.instant",
    category: "PAYOUT",
    name: "Virement Instantané",
    description:
      "Crédit immédiat des fonds sur le compte bancaire du vendeur en moins de 10 secondes.",
    usedByFeatures: ["Option virement instantané"],
    isRedundancyRecommended: false,
  },

  // Delivery
  "delivery.relay_point": {
    id: "delivery.relay_point",
    category: "DELIVERY",
    name: "Livraison en Point Relais & Lockers",
    description:
      "Dépôt et retrait en commerce partenaire ou casier automatique.",
    usedByFeatures: ["Tunnel de commande", "Expédition vendeur"],
    isRedundancyRecommended: true,
  },
  "delivery.home_delivery": {
    id: "delivery.home_delivery",
    category: "DELIVERY",
    name: "Livraison Standard à Domicile",
    description:
      "Acheminement postal ou transporteur jusqu'au domicile de l'acheteur.",
    usedByFeatures: ["Tunnel de commande", "Expédition colis"],
    isRedundancyRecommended: true,
  },
  "delivery.express": {
    id: "delivery.express",
    category: "DELIVERY",
    name: "Livraison Express 24H",
    description: "Livraison prioritaire garantie le lendemain ouvré.",
    usedByFeatures: ["Tunnel de commande express"],
    isRedundancyRecommended: false,
  },
  "delivery.bulky": {
    id: "delivery.bulky",
    category: "DELIVERY",
    name: "Transport d'Objets Volumineux & Meubles",
    description:
      "Covoiturage de colis et transporteurs spécialisés pour meubles et pièces lourdes.",
    usedByFeatures: ["Catégories Mobilier & Équipement Pro"],
    isRedundancyRecommended: false,
  },
  "delivery.quote": {
    id: "delivery.quote",
    category: "DELIVERY",
    name: "Calcul Dynamique des Frais de Port",
    description:
      "Estimation temps réel des tarifs d'envoi selon gabarit et destination.",
    usedByFeatures: ["Fiche annonce", "Panier d'achat"],
    isRedundancyRecommended: false,
  },
  "delivery.tracking": {
    id: "delivery.tracking",
    category: "DELIVERY",
    name: "Suivi de Colis en Temps Réel",
    description:
      "Synchronisation des statuts d'acheminement et notifications d'étapes.",
    usedByFeatures: ["Suivi de commande acheteur & vendeur"],
    isRedundancyRecommended: false,
  },
  "delivery.label": {
    id: "delivery.label",
    category: "DELIVERY",
    name: "Génération d'Étiquettes d'Envoi",
    description:
      "Création instantanée des bordereaux d'expédition PDF prépayés.",
    usedByFeatures: ["Espace vendeur", "Impression d'étiquettes"],
    isRedundancyRecommended: false,
  },

  // Authentication
  "auth.oauth_google": {
    id: "auth.oauth_google",
    category: "AUTHENTICATION",
    name: "Connexion Google (OAuth 2.0)",
    description: "Authentification simplifiée avec un compte Google.",
    usedByFeatures: ["Page de connexion", "Page d'inscription"],
    isRedundancyRecommended: false,
  },
  "auth.oauth_apple": {
    id: "auth.oauth_apple",
    category: "AUTHENTICATION",
    name: "Connexion Apple (Sign in with Apple)",
    description: "Authentification confidentielle avec un identifiant Apple.",
    usedByFeatures: ["Page de connexion", "Page d'inscription iOS/Web"],
    isRedundancyRecommended: false,
  },
  "auth.email_password": {
    id: "auth.email_password",
    category: "AUTHENTICATION",
    name: "Authentification Email / Mot de Passe",
    description:
      "Gestion des comptes locaux Shongre avec hachage sécurisé et réinitialisation.",
    usedByFeatures: ["Authentification principale"],
    isRedundancyRecommended: false,
  },
  "auth.mfa_totp": {
    id: "auth.mfa_totp",
    category: "AUTHENTICATION",
    name: "Double Authentification 2FA (TOTP)",
    description:
      "Code temporaire 6 chiffres via application d'authentification (Google Auth, Authy).",
    usedByFeatures: ["Sécurité des comptes", "Comptes Pro"],
    isRedundancyRecommended: false,
  },
  "auth.session": {
    id: "auth.session",
    category: "AUTHENTICATION",
    name: "Gestion des Sessions & Jetons",
    description:
      "Génération et révocation des sessions sécurisées côté serveur.",
    usedByFeatures: ["Sécurité globale"],
    isRedundancyRecommended: false,
  },

  // Communications
  "email.transactional": {
    id: "email.transactional",
    category: "EMAIL",
    name: "Emails Transactionnels",
    description:
      "Envoi des confirmations d'achat, codes PIN, alertes litiges et réinitialisations de mot de passe.",
    usedByFeatures: ["Transactions", "Authentification", "Notifications"],
    isRedundancyRecommended: true,
  },
  "email.marketing": {
    id: "email.marketing",
    category: "EMAIL",
    name: "Emails Marketing & Newsletters",
    description:
      "Envoi des newsletters thématiques, digests hebdomadaires et communications promotionnelles.",
    usedByFeatures: ["Newsletter Shongre", "Campagnes CRM"],
    isRedundancyRecommended: false,
  },
  "sms.otp": {
    id: "sms.otp",
    category: "SMS",
    name: "SMS OTP & Validation de Téléphone",
    description:
      "Envoi des codes de vérification de numéro de téléphone mobile.",
    usedByFeatures: ["Vérification profil", "Remise sécurisée"],
    isRedundancyRecommended: false,
  },
  "sms.transactional": {
    id: "sms.transactional",
    category: "SMS",
    name: "SMS d'Alerte Transactionnelle",
    description:
      "Alertes SMS pour remise en main propre imminente ou confirmation d'achat.",
    usedByFeatures: ["Notifications critiques"],
    isRedundancyRecommended: false,
  },
  "push.web": {
    id: "push.web",
    category: "PUSH",
    name: "Notifications Push Web Navigateur",
    description:
      "Notifications PWA / navigateur pour nouveaux messages et offres.",
    usedByFeatures: ["Messagerie instantanée", "Alertes recherches"],
    isRedundancyRecommended: false,
  },
  "push.mobile": {
    id: "push.mobile",
    category: "PUSH",
    name: "Notifications Push Mobiles (iOS / Android)",
    description: "Notifications push natives via Firebase Cloud Messaging.",
    usedByFeatures: ["Applications mobiles"],
    isRedundancyRecommended: false,
  },

  // AI & Search
  "ai.listing_assistance": {
    id: "ai.listing_assistance",
    category: "AI",
    name: "Génération & Optimisation d'Annonces IA",
    description:
      "Génération de titres percutants, descriptions structurées et estimation tarifaire.",
    usedByFeatures: ["Assistant de publication", "Espace Vendeur Pro"],
    isRedundancyRecommended: true,
  },
  "ai.safety_audit": {
    id: "ai.safety_audit",
    category: "AI",
    name: "Audit de Conformité & Anti-Fraude IA",
    description:
      "Analyse automatique des annonces pour détecter contrefaçons, escroqueries et items prohibés.",
    usedByFeatures: ["Modération des annonces", "Sécurité de la plateforme"],
    isRedundancyRecommended: true,
  },
  "ai.prospect_research": {
    id: "ai.prospect_research",
    category: "AI",
    name: "Prospection Marchande IA (CRM)",
    description:
      "Découverte de prospects professionnels via recherche web et synthèse de pertinence.",
    usedByFeatures: ["CRM & Prospection IA"],
    isRedundancyRecommended: false,
  },
  "ai.company_enrichment": {
    id: "ai.company_enrichment",
    category: "AI",
    name: "Enrichissement Entreprise IA",
    description:
      "Extraction automatique d'informations d'entreprises (effectif, secteur, catalogue).",
    usedByFeatures: ["Fiche Entreprise CRM"],
    isRedundancyRecommended: false,
  },
  "search.marketplace": {
    id: "search.marketplace",
    category: "SEARCH",
    name: "Moteur de Recherche Annonces & Marketplace",
    description:
      "Indexation rapide, recherche tolérante aux fautes, facettes et filtres de recherche.",
    usedByFeatures: ["Page de recherche", "Suggestions d'autocomplétion"],
    isRedundancyRecommended: false,
  },
  "search.public_web": {
    id: "search.public_web",
    category: "SEARCH",
    name: "Recherche Web Publique pour Prospection",
    description:
      "Interrogation du web public pour alimenter les recherches d'entreprises cibles.",
    usedByFeatures: ["Prospection IA CRM"],
    isRedundancyRecommended: false,
  },

  // Maps
  "maps.display": {
    id: "maps.display",
    category: "MAPS",
    name: "Rendu Cartographique Interactif",
    description:
      "Affichage des fonds de carte et marqueurs de localisation géographique.",
    usedByFeatures: [
      "Fiche annonce",
      "Recherche géographique",
      "Sélecteur de territoire",
    ],
    isRedundancyRecommended: false,
  },
  "maps.geocode": {
    id: "maps.geocode",
    category: "GEOCODING",
    name: "Géocodage Direct (Adresse → Coordonnées)",
    description:
      "Conversion d'une adresse ou code postal en latitude et longitude.",
    usedByFeatures: ["Publication d'annonce", "Filtre de distance"],
    isRedundancyRecommended: true,
  },
  "maps.reverse_geocode": {
    id: "maps.reverse_geocode",
    category: "GEOCODING",
    name: "Géocodage Inverse (Coordonnées → Ville)",
    description:
      "Détermination de la commune et code postal à partir d'un point GPS.",
    usedByFeatures: ["Géolocalisation automatique"],
    isRedundancyRecommended: false,
  },
  "maps.autocomplete": {
    id: "maps.autocomplete",
    category: "GEOCODING",
    name: "Autocomplétion des Adresses Postales",
    description:
      "Suggestions d'adresses en temps réel pendant la saisie utilisateur.",
    usedByFeatures: [
      "Formulaires d'adresse de livraison",
      "Saisie de localisation",
    ],
    isRedundancyRecommended: true,
  },

  // Verification
  "verification.identity": {
    id: "verification.identity",
    category: "IDENTITY_VERIFICATION",
    name: "Vérification d'Identité (KYC)",
    description:
      "Analyse biométrique et contrôle d'authenticité des passeports et CNI.",
    usedByFeatures: ["Validation compte vendeur", "Plafonds de vente"],
    isRedundancyRecommended: false,
  },
  "verification.business": {
    id: "verification.business",
    category: "BUSINESS_VERIFICATION",
    name: "Vérification Entreprise (SIRET / SIREN / KBIS)",
    description:
      "Vérification de l'immatriculation légale et de l'état d'activité des pros.",
    usedByFeatures: ["Inscription Pro", "Validation Vitrine Pro"],
    isRedundancyRecommended: true,
  },
  "verification.vat": {
    id: "verification.vat",
    category: "BUSINESS_VERIFICATION",
    name: "Validation Numéro de TVA Intracommunautaire",
    description:
      "Interrogation de la base VIES pour valider l'assujettissement TVA européen.",
    usedByFeatures: ["Facturation Pro"],
    isRedundancyRecommended: false,
  },

  // Storage
  "storage.media": {
    id: "storage.media",
    category: "STORAGE",
    name: "Stockage Médias & Photos d'Annonces",
    description:
      "Hébergement haute disponibilité des photographies et galeries d'annonces.",
    usedByFeatures: ["Galerie photos", "Bannières de boutiques Pro"],
    isRedundancyRecommended: true,
  },
  "storage.document": {
    id: "storage.document",
    category: "STORAGE",
    name: "Stockage Documents Privés & Factures",
    description:
      "Stockage sécurisé à accès restreint pour pièces d'identité et factures PDF.",
    usedByFeatures: ["Documents KYC", "Factures d'achat"],
    isRedundancyRecommended: false,
  },
  "cdn.delivery": {
    id: "cdn.delivery",
    category: "CDN",
    name: "Distribution Rapide par CDN",
    description:
      "Mise en cache et diffusion ultra-rapide des assets statiques.",
    usedByFeatures: ["Performance globale"],
    isRedundancyRecommended: false,
  },
  "image.optimization": {
    id: "image.optimization",
    category: "IMAGE_PROCESSING",
    name: "Optimisation Automatique des Images",
    description: "Conversion WebP à la volée et redimensionnement responsive.",
    usedByFeatures: ["Cartes d'annonces", "Vignettes mobiles"],
    isRedundancyRecommended: false,
  },

  // Analytics & Monitoring
  "analytics.product": {
    id: "analytics.product",
    category: "ANALYTICS",
    name: "Analytique Produit Respectueuse de la Vie Privée",
    description:
      "Comptabilisation des vues d'annonces et métriques de conversion sans cookies.",
    usedByFeatures: ["Statistiques vendeurs Pro", "Tableau de bord admin"],
    isRedundancyRecommended: false,
  },
  "monitoring.error_tracking": {
    id: "monitoring.error_tracking",
    category: "ERROR_MONITORING",
    name: "Capture d'Erreurs & Monitoring de Stabilité",
    description:
      "Détection et diagnostic des erreurs d'exécution du client web.",
    usedByFeatures: ["Observabilité technique"],
    isRedundancyRecommended: false,
  },

  // Invoicing
  "invoicing.subscription": {
    id: "invoicing.subscription",
    category: "INVOICING",
    name: "Facturation Récurrente des Abonnements Pro",
    description:
      "Émission mensuelle ou annuelle des factures d'abonnements aux forfaits Pro.",
    usedByFeatures: ["Forfaits Pro Shongre"],
    isRedundancyRecommended: false,
  },
  "invoicing.electronic": {
    id: "invoicing.electronic",
    category: "INVOICING",
    name: "Facturation Électronique Conforme (Factur-X / Chorus Pro)",
    description:
      "Génération de factures structurées XML/PDF conformes à la réglementation B2B.",
    usedByFeatures: ["Conformité fiscale France / Europe"],
    isRedundancyRecommended: false,
  },

  // Security
  "security.captcha": {
    id: "security.captcha",
    category: "CAPTCHA",
    name: "Protection Anti-Bot (CAPTCHA Invisible)",
    description:
      "Vérification non intrusive pour bloquer les attaques automatisées.",
    usedByFeatures: ["Formulaires de contact", "Inscription"],
    isRedundancyRecommended: false,
  },
  "security.fraud_risk": {
    id: "security.fraud_risk",
    category: "FRAUD_RISK",
    name: "Analyse Prédictive du Risque de Fraude",
    description:
      "Évaluation du score de risque des comptes et des transactions en ligne.",
    usedByFeatures: ["Paiement sécurisé", "Modération des transactions"],
    isRedundancyRecommended: false,
  },
};

export function getAllCapabilities(): CapabilityMetadata[] {
  return Object.values(PROVIDER_CAPABILITIES);
}

export function getCapabilitiesByCategory(
  category: ProviderCategory,
): CapabilityMetadata[] {
  return Object.values(PROVIDER_CAPABILITIES).filter(
    (c) => c.category === category,
  );
}

export function getCategoryMetadata(
  category: ProviderCategory,
): CategoryMetadata {
  return (
    PROVIDER_CATEGORIES[category] || {
      id: category,
      name: category,
      shortLabel: category,
      description: "",
      iconName: "Cpu",
      badgeClass: "bg-stone-100 text-stone-700 border-stone-200",
      isCore: false,
    }
  );
}

export function getCapabilityMetadata(
  capability: ProviderCapability,
): CapabilityMetadata {
  return (
    PROVIDER_CAPABILITIES[capability] || {
      id: capability,
      category: "PAYMENT",
      name: capability,
      description: "",
      usedByFeatures: [],
      isRedundancyRecommended: false,
    }
  );
}
