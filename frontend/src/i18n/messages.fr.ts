import type { DigitalMessageKey } from "./digital.catalogue.fr";

/**
 * The source catalogue. Every key the product uses is declared here first, and
 * `MessageKey` is derived from it — so a typo in a `t()` call is a type error
 * rather than a string that renders as itself in production.
 *
 * Conventions:
 *   - Keys are dot-namespaced by surface: `nav.*`, `footer.*`, `consent.*`.
 *   - `{placeholder}` marks an interpolated value.
 *   - A countable message declares `_one` / `_other` variants and is resolved
 *     through `Intl.PluralRules`, never through `count === 1`. French puts 0 in
 *     the singular and English puts it in the plural, which is exactly the kind
 *     of rule that must not be hand-written per call site.
 */
export const messagesFr = {
  // --- Generic actions and states -----------------------------------------
  "common.loading": "Chargement…",
  "common.retry": "Réessayer",
  "common.cancel": "Annuler",
  "common.save": "Enregistrer",
  "common.confirm": "Confirmer",
  "common.validate": "Valider",
  "common.requiredField": "Ce champ est obligatoire.",
  "common.minimumCharacters": "{count} caractères minimum.",
  "common.notifications": "Notifications",
  "a11y.skipToContent": "Aller au contenu principal",
  "common.close": "Fermer",
  "common.search": "Rechercher",
  "common.seeAll": "Voir tout",
  "listing.field.brand": "Marque",
  "listing.field.model": "Modèle",
  "listing.field.year": "Année",
  "listing.field.mileage": "Kilométrage",
  "listing.field.fuel": "Carburant",
  "listing.field.gearbox": "Boîte de vitesses",
  "listing.field.critair": "Vignette Crit’Air",
  "listings.pricing.itemPrice": "Prix de l’annonce",
  "listings.pricing.buyerProtection": "Protection acheteur",
  "listings.pricing.delivery": "Livraison",
  "listings.pricing.total": "Total",
  "listings.pricing.dependsOnFulfillment": "Selon le mode de remise",
  "listings.pricing.dependsOnChoice": "Selon l’option choisie",
  "listings.pricing.confirmedBeforePayment": "Confirmé avant paiement",
  "listings.listingDetailPage.acheterMaintenant": "Acheter maintenant",
  "common.back": "Retour",
  "common.error": "Une erreur est survenue",
  "common.listingCount_one": "{count} annonce",
  "common.listingCount_other": "{count} annonces",
  "common.resultCount_one": "{count} résultat",
  "common.resultCount_other": "{count} résultats",
  "common.reviewCount_one": "{count} avis",
  "common.reviewCount_other": "{count} avis",

  // --- Business verticals --------------------------------------------------
  "verticals.education.name": "Éducation",
  "verticals.education.brand": "Shongre Éducation",
  "verticals.education.workspace": "Espace Éducation",
  "verticals.education.training": "Éducation & Formation",
  "verticals.education.adminTitle": "Administration Shongre Éducation",
  "verticals.education.adminSections": "Sections Shongre Éducation",
  "verticals.education.searchTitle":
    "Trouver un professeur — Shongre Éducation",
  "verticals.education.requestTitle": "Décrire mon besoin — Shongre Éducation",
  "verticals.education.onboardingTitle":
    "Devenir professeur sur Shongre Éducation",
  "verticals.education.organizationTitle": "Organisme — Shongre Éducation",
  "verticals.education.unavailable": "Shongre Éducation est indisponible",
  "verticals.education.workspaceUnavailable": "Espace Éducation indisponible",
  "verticals.education.filters": "Filtres Éducation",
  "verticals.education.demoPersona":
    "7. Pro Éducation (Sophie · Collège Lumière)",
  "verticals.education.organizationWorkspace": "Organisme Éducation",
  "verticals.education.openWorkspace": "Ouvrir mon espace Éducation",
  "verticals.education.adminCategory": "Éducation",
  "verticals.education.adminDescription":
    "Pilotage du marché, de la taxonomie, des formules et de la sécurité Éducation.",
  "verticals.education.adminLoadError":
    "Impossible de charger la configuration Éducation.",
  "verticals.education.adminSaved":
    "Configuration Éducation enregistrée et auditée.",
  "verticals.education.catalogUnavailable":
    "Le catalogue Éducation est momentanément indisponible.",
  "verticals.education.returnToWorkspace": "Retour à mon espace Éducation",

  // --- Primary navigation ---------------------------------------------------
  "nav.home": "Accueil",
  "nav.search": "Recherche",
  "nav.messages": "Messages",
  "nav.account": "Compte",
  "nav.sell": "Vendre",
  "nav.favorites": "Favoris",
  "nav.notifications": "Notifications",
  "nav.categories": "Catégories",
  "nav.openMenu": "Ouvrir le menu",
  "nav.closeMenu": "Fermer le menu",
  "nav.mobileLabel": "Navigation mobile",
  "staffMarketplace.readOnly.title": "Navigation Staff — lecture seule.",
  "staffMarketplace.readOnly.description":
    "Vous pouvez parcourir la marketplace, mais toutes les actions client restent désactivées.",
  "staffMarketplace.readOnly.footerMutation":
    "Inscription désactivée pour cette identité Staff en lecture seule.",
  "staffMarketplace.demo.title": "Mode test Staff — données isolées.",
  "staffMarketplace.demo.description":
    "Les actions sont simulées et auditées ; aucune publication, aucun paiement, message, notification ou fournisseur réel n’est déclenché.",
  "staffMarketplace.openAdmin": "Ouvrir l’administration",
  "staffMarketplace.actionBlocked.title":
    "Action indisponible pour les comptes Staff",
  "staffMarketplace.actionBlocked.description":
    "Les comptes Staff peuvent parcourir la marketplace, mais ne peuvent pas effectuer cette action. Aucune opération n’a été lancée.",
  "solutions.header.chooseSolution": "Choisir une solution Shongre",
  "solutions.header.seeAll": "Voir toutes les solutions",
  "solutions.header.homeLabel": "Accueil Shongre Solutions",
  "solutions.header.navigationLabel": "Navigation Solutions",
  "solutions.header.solutions": "Solutions",
  "solutions.header.ecosystem": "Écosystème",
  "solutions.header.platform": "Plateforme Shongre",
  "solutions.header.account": "Mon compte",
  "solutions.header.accountShort": "Compte",
  "solutions.header.signIn": "Se connecter",
  "solutions.header.discover": "Découvrir les solutions",
  "solutions.header.openMenu": "Ouvrir le menu",
  "solutions.header.closeMenu": "Fermer le menu",
  "solutions.footer.informationLabel": "Informations Solutions",
  "solutions.footer.about": "À propos",
  "solutions.footer.documentation": "Documentation",
  "solutions.footer.security": "Sécurité",
  "solutions.footer.cookies": "Gestion des cookies",
  "solutions.catalog.metaTitle":
    "Shongre Solutions — Toutes vos applications professionnelles",
  "solutions.catalog.metaDescription":
    "Activez les solutions utiles à votre organisation et retrouvez chaque espace de travail avec un seul compte Shongre.",
  "solutions.catalog.heroTitle": "Les outils Shongre, réunis au même endroit.",
  "solutions.catalog.heroDescription":
    "Activez les solutions utiles à votre organisation et retrouvez chaque espace de travail sans multiplier les comptes.",
  "solutions.catalog.count_one": "{count} solution",
  "solutions.catalog.count_other": "{count} solutions",
  "solutions.catalog.marketLabel": "Marché du catalogue",
  "solutions.catalog.title": "Catalogue des solutions Shongre",
  "solutions.catalog.loading": "Chargement du catalogue",
  "solutions.catalog.errorTitle": "Catalogue indisponible",
  "solutions.catalog.errorDescription": "Le catalogue n’a pas pu être chargé.",
  "solutions.catalog.emptyTitle": "Aucune solution pour ce marché",
  "solutions.catalog.emptyDescription":
    "Le catalogue s’enrichit progressivement selon les pays et les langues disponibles.",
  "solutions.catalog.learnMore": "En savoir plus",
  "solutions.catalog.ecosystemTitle":
    "Un compte. Une organisation. Plusieurs solutions.",
  "solutions.catalog.securityTitle": "Sécurité et contrôle",
  "solutions.catalog.securityDescription":
    "Vos données sont protégées et vos accès maîtrisés.",
  "solutions.catalog.collaborationTitle": "Travail collaboratif",
  "solutions.catalog.collaborationDescription":
    "Invitez vos équipes et partagez les espaces de travail.",
  "solutions.catalog.evolutionTitle": "Des solutions qui évoluent",
  "solutions.catalog.evolutionDescription":
    "De nouvelles fonctionnalités rejoignent le même socle Shongre.",
  "solutions.detail.metaMissingTitle": "Solution introuvable — Shongre",
  "solutions.detail.metaTitle": "{name} — Shongre Solutions",
  "solutions.detail.metaMissingDescription":
    "Cette solution Shongre n’est pas disponible.",
  "solutions.detail.unavailableTitle": "Solution indisponible",
  "solutions.detail.loadError": "Le chargement de la solution a échoué.",
  "solutions.detail.notFoundTitle": "Solution introuvable",
  "solutions.detail.notFoundDescription":
    "Cette adresse ne correspond à aucune solution publique du catalogue.",
  "solutions.detail.backToAll": "Toutes les solutions",
  "solutions.detail.availableIn": "Disponible en {markets}",
  "solutions.detail.capabilitiesTitle": "Ce que vous pouvez faire",
  "solutions.detail.accessTitle": "Accès et disponibilité",
  "solutions.detail.audience": "Audience",
  "solutions.detail.markets": "Marchés",
  "solutions.detail.languages": "Langues",
  "solutions.detail.access": "Accès",
  "solutions.detail.publicAccess": "Accès public",
  "solutions.detail.informationLabel": "Information : {status}",
  "solutions.detail.betaTitle": "Version bêta",
  "solutions.detail.latestUpdate": "Dernière mise à jour — {date}",
  "solutions.detail.releaseNotes": "Consulter les notes de version",
  "solutions.lifecycle.draft.label": "Brouillon",
  "solutions.lifecycle.draft.description":
    "Visible uniquement dans la console.",
  "solutions.lifecycle.internal.label": "Interne",
  "solutions.lifecycle.internal.description": "Réservée aux équipes Shongre.",
  "solutions.lifecycle.comingSoon.label": "À venir",
  "solutions.lifecycle.comingSoon.description":
    "Présentation publique sans lancement.",
  "solutions.lifecycle.beta.label": "Bêta",
  "solutions.lifecycle.beta.description":
    "Accessible avec un périmètre de disponibilité explicite.",
  "solutions.lifecycle.available.label": "Disponible",
  "solutions.lifecycle.available.description": "La solution peut être lancée.",
  "solutions.lifecycle.maintenance.label": "Maintenance",
  "solutions.lifecycle.maintenance.description":
    "Visible, temporairement non lançable.",
  "solutions.lifecycle.deprecated.label": "En fin de vie",
  "solutions.lifecycle.deprecated.description":
    "Accessible avec une orientation de migration.",
  "solutions.lifecycle.retired.label": "Retirée",
  "solutions.lifecycle.retired.description":
    "Masquée du catalogue public et conservée en historique.",
  "solutions.launch.retired": "Solution retirée",
  "solutions.launch.restricted": "Accès restreint",
  "solutions.launch.notify": "Être informé",
  "solutions.launch.comingSoonMessage":
    "Cette solution sera disponible prochainement.",
  "solutions.launch.maintenance": "Maintenance en cours",
  "solutions.launch.maintenanceMessage":
    "Cette solution est momentanément indisponible.",
  "solutions.launch.marketUnavailable": "Indisponible dans ce marché",
  "solutions.launch.signIn": "Se connecter pour continuer",
  "solutions.launch.activate": "Activer cette solution",
  "solutions.launch.destinationUnavailable": "Destination indisponible",
  "solutions.launch.openProspects": "Ouvrir Prospects",
  "solutions.launch.openFacturation": "Découvrir Facturation",
  "solutions.launch.openMarketplace": "Ouvrir la Marketplace",
  "solutions.launch.openSolution": "Ouvrir la solution",
  "solutions.launch.deprecatedMessage":
    "Une solution de remplacement est recommandée.",
  "admin.solutions.order.title": "Ordre et visibilité",
  "admin.solutions.order.description":
    "Activez les solutions à présenter, puis utilisez les flèches pour définir l’ordre du catalogue public et du sélecteur Solutions. Le cycle de vie continue de contrôler la publication.",
  "admin.solutions.order.moveUp": "Monter {name}",
  "admin.solutions.order.moveDown": "Descendre {name}",
  "admin.solutions.order.saved": "Ordre des solutions enregistré.",
  "admin.solutions.order.error": "Impossible d’enregistrer l’ordre.",
  "admin.solutions.order.saveDraftFirst":
    "Enregistrez ou annulez les modifications en cours avant de réordonner.",
  "admin.solutions.visibility.label": "Visibilité publique de {name}",
  "admin.solutions.visibility.enabled": "Activée",
  "admin.solutions.visibility.hidden": "Masquée",
  "admin.solutions.visibility.saved": "Visibilité du catalogue mise à jour.",
  "admin.solutions.visibility.error":
    "Impossible de modifier la visibilité du catalogue.",
  "admin.solutions.transitionConfirmTitle": "Passer à « {lifecycle} » ?",
  "admin.solutions.created": "Création",
  "nav.categoryNavigation": "Navigation par catégorie",
  "nav.category.scrollPrevious": "Faire défiler les catégories vers la gauche",
  "nav.category.scrollNext": "Faire défiler les catégories vers la droite",
  "nav.category.active": "Catégorie active",
  "nav.category.immobilier": "Immobilier",
  "nav.category.vehicules": "Véhicules",
  "nav.category.materielPro": "Outils pro",
  "nav.category.emploi": "Emploi",
  "nav.category.mode": "Mode",
  "nav.category.maisonJardin": "Maison",
  "nav.category.famille": "Famille",
  "nav.category.electronique": "Électronique",
  "nav.category.loisirs": "Loisirs",
  "nav.category.autres": "Autres",
  "nav.category.cours": "Éducation",
  "nav.category.bonsPlans": "Promotions",
  "nav.unreadMessages_one": "{count} message non lu",
  "nav.unreadMessages_other": "{count} messages non lus",

  // --- Footer ---------------------------------------------------------------
  "footer.findTutor": "Trouver un professeur",
  "footer.offerCourses": "Proposer des cours",
  "footer.legalHeading": "Informations légales",
  "footer.terms": "CGU",
  "footer.privacy": "Politique de confidentialité",
  "footer.cookies": "Gestion des cookies",
  "footer.legalNotices": "Mentions légales",
  "footer.accessibility": "Accessibilité (WCAG 2.2 AA)",
  "footer.copyright": "© {year} Shongre SAS. Tous droits réservés.",
  "footer.sectionCategories": "Catégories phares",
  "footer.sectionProfessionals": "Espace professionnels",
  "footer.sectionHelp": "Aide & Confiance",
  "footer.proSolutions": "Solutions & Tarifs Pro",
  "footer.shongreProspects": "Shongre Prospects",
  "footer.shongreSolutions": "Toutes les solutions Shongre",
  "footer.shongreFacturation": "Shongre Facturation",
  "footer.helpCenter": "Centre d’aide & FAQ",
  "footer.newsletterHeading": "Newsletter Shongre",
  "footer.marketLabel": "Marché {market}",
  "footer.sectionCities": "Villes & Régions",
  "footer.createProAccount": "Créer un compte Pro",
  "footer.storeDirectory": "Annuaire des boutiques",
  "footer.boostGrid": "Grille des options & boosts",
  "footer.safetyTips": "Conseils de sécurité",
  "footer.contactSupport": "Contacter le support",
  "footer.currentDeals": "Promotions",
  "footer.comingSoon": "{name} — bientôt disponible",
  "footer.newsletterPitch":
    "Recevez notre sélection hebdomadaire d’annonces et de nouveautés.",
  "footer.marketContext": "Marché France",
  "footer.privacyControls": "Consentement modifiable",
  "footer.mobileAppsHeading": "Applications mobiles Shongre",
  "footer.appPitch": "Emportez Shongre partout avec vous.",
  "footer.downloadFrom": "Télécharger sur",
  "footer.comingToStore": "Bientôt sur",
  "footer.downloadApp": "Télécharger Shongre sur {store}",
  "footer.followHeading": "Suivez Shongre",
  "footer.followOn": "Suivre Shongre sur {network}",
  "footer.trust.escrowTitle": "Paiement via Stripe",
  "footer.trust.escrowBody":
    "Les paiements en ligne sont traités par notre prestataire ; leur statut est suivi dans votre commande.",
  "footer.trust.deliveryTitle": "Remise et expédition",
  "footer.trust.deliveryBody":
    "Remise en main propre ou expédition suivie selon les modalités indiquées dans la commande.",
  "footer.trust.verifiedTitle": "Statuts de confiance lisibles",
  "footer.trust.verifiedBody":
    "Les badges d’identité et d’entreprise ne sont affichés qu’après confirmation du prestataire concerné.",
  "footer.trust.supportTitle": "Centre d’aide et support",
  "footer.trust.supportBody":
    "Consultez le centre d’aide ou ouvrez une demande pour obtenir une assistance selon les horaires affichés.",

  // --- Language selector ----------------------------------------------------
  "language.choose": "Choisir la langue",
  "language.current": "Langue : {language}. Cliquez pour changer.",
  "language.regionalPreferencesCurrent":
    "Langue et préférences régionales : {language}",
  "language.preferences": "Préférences",

  // --- Cookie consent -------------------------------------------------------
  "consent.title": "Vos préférences de confidentialité",
  "consent.body":
    "Nous utilisons des cookies strictement nécessaires au fonctionnement du site. " +
    "Avec votre accord, nous y ajoutons la mesure d’audience et la personnalisation. " +
    "Vous pouvez changer d’avis à tout moment depuis « Gestion des cookies ».",
  "consent.learnMore": "En savoir plus",
  "consent.acceptAll": "Tout accepter",
  "consent.rejectAll": "Tout refuser",
  "consent.customise": "Personnaliser",
  "consent.panelTitle": "Gestion des cookies",
  "consent.panelDescription":
    "Choisissez finalité par finalité. Votre choix est conservé 6 mois.",
  "consent.saveChoices": "Enregistrer mes choix",
  "consent.alwaysOn": "Toujours actifs — indispensables au service.",
  "consent.category.necessary": "Strictement nécessaires",
  "consent.category.necessaryDescription":
    "Session, sécurité et mémorisation de vos préférences (marché, langue, localisation). " +
    "Sans eux, le site ne peut pas fonctionner.",
  "consent.category.analytics": "Mesure d’audience",
  "consent.category.analyticsDescription":
    "Statistiques de fréquentation anonymisées pour comprendre quelles pages sont utiles " +
    "et corriger ce qui ne l’est pas.",
  "consent.category.marketing": "Personnalisation & publicité",
  "consent.category.marketingDescription":
    "Recommandations d’annonces et mesure des campagnes. Refuser ne réduit pas " +
    "le nombre d’annonces affichées, seulement leur personnalisation.",

  // --- proDirectory ---
  "proDirectory.rechercherParNomDeBoutique":
    "Rechercher par nom de boutique ou par ville...",
  "proDirectory.rechercherUneBoutiqueProfessionnelle":
    "Rechercher une boutique professionnelle",
  "proDirectory.aucuneBoutiqueProfessionnelleTrouvee":
    "Aucune boutique professionnelle trouvée",

  // --- proDirectory ---
  "proDirectory.aucunCommercantOuArtisanNe":
    "Aucun commerçant ou artisan ne correspond à votre recherche par nom ou par ville.",
  "proDirectory.effacerLaRecherche": "Effacer la recherche",

  // --- shell.accountLayout ---
  "shell.accountLayout.navigationDuCompte": "Navigation du compte",
  "shell.accountLayout.comptePro": "Compte Pro",
  "shell.accountLayout.proBadge": "Pro",
  "shell.accountLayout.roleAdministrateur": "Administrateur",
  "shell.accountLayout.roleSuperAdministrateur": "Super administrateur",
  "shell.accountLayout.seDeconnecter": "Se déconnecter",

  // --- shell.focusedLayout ---
  "shell.focusedLayout.quitterEtRevenirAL": "Quitter et revenir à l'accueil",

  // --- shell.header ---
  "shell.header.fermerLeMenu": "Fermer le menu",
  "shell.header.fermerLeMenuMobile": "Fermer le menu mobile",
  "shell.header.compteProfessionnel": "Compte Professionnel",
  "shell.header.verifie": "Vérifié",

  // --- shell.locationPickerModal ---
  "shell.locationPickerModal.zoneGeographique": "Zone géographique",
  "shell.locationPickerModal.rayonDeRecherche": "Rayon de recherche",
  "shell.locationPickerModal.useCurrentLocation":
    "Utiliser ma position actuelle",
  "shell.locationPickerModal.preciseLocationPurpose":
    "Avec votre accord, Shongre utilisera votre position une seule fois pour proposer le pays et la ville les plus proches. Vos coordonnées précises ne sont pas enregistrées.",
  "shell.locationPickerModal.locationInProgress": "Localisation en cours…",
  "shell.locationPickerModal.locationDetected":
    "Position détectée près de {city}.",
  "shell.locationPickerModal.locationUnsupported":
    "La géolocalisation n’est pas disponible sur cet appareil.",
  "shell.locationPickerModal.locationPermissionDenied":
    "Autorisez l’accès à votre position dans le navigateur, puis réessayez.",
  "shell.locationPickerModal.locationUnavailable":
    "Votre position est momentanément indisponible. Réessayez ou saisissez une ville.",
  "shell.locationPickerModal.locationTimeout":
    "La localisation a pris trop de temps. Réessayez ou saisissez une ville.",
  "shell.locationPickerModal.locationOutsideMarket":
    "Votre position ne se trouve pas dans le marché {market}. Changez de pays ou saisissez une ville.",
  "shell.locationPickerModal.locationUnresolved":
    "Aucune ville prise en charge n’a été trouvée près de votre position.",

  // --- shell.preferencesModal ---
  "shell.preferencesModal.preferencesRegionales": "Préférences régionales",
  "shell.preferencesModal.personnalisezVotrePaysDeNavigation":
    "Personnalisez votre pays de navigation, votre devise d'affichage et votre langue",
  "shell.preferencesModal.marchePays": "Marché / Pays",
  "shell.preferencesModal.manualSelectionActive":
    "Votre choix manuel reste prioritaire sur la détection automatique.",
  "shell.preferencesModal.resetManualSelection":
    "Réactiver la suggestion automatique",
  "shell.preferencesModal.deviseAffichage": "Devise d'affichage",
  "shell.preferencesModal.currencyRatesLoading":
    "Chargement des taux de conversion…",
  "shell.preferencesModal.currencyConversionUnavailable":
    "La conversion est momentanément indisponible. Les montants restent affichés dans leur devise d’origine.",
  "shell.preferencesModal.currencyEstimateNotice":
    "Les montants convertis sont indicatifs et précédés du symbole ≈.",
  "shell.preferencesModal.bientot": "Bientôt",
  "shell.preferencesModal.langueDeLInterface": "Langue de l'interface",

  // --- shell.marketDetection ---
  "shell.marketDetection.recommendationTitle":
    "Vous semblez être en {country}. Accéder à Shongre {country} ?",
  "shell.marketDetection.recommendationBody":
    "Cette suggestion est une estimation et ne change rien sans votre confirmation.",
  "shell.marketDetection.lowConfidence":
    "Le signal peut être imprécis, notamment avec un VPN ou un proxy.",
  "shell.marketDetection.viewCountry": "Continuer vers {country}",
  "shell.marketDetection.chooseAnother": "Choisir un autre pays",
  "shell.marketDetection.ignore": "Ignorer",
  "shell.marketDetection.unknownTitle":
    "Nous n’avons pas pu estimer votre pays",
  "shell.marketDetection.failureTitle":
    "La suggestion de pays est momentanément indisponible",
  "shell.marketDetection.selectCountryBody":
    "La navigation publique reste disponible. Choisissez votre pays ou réessayez.",
  "shell.marketDetection.chooseCountry": "Choisir mon pays",
  "shell.marketDetection.confirmTitle": "Changer de pays ?",
  "shell.marketDetection.confirmCrossDomain":
    "Vous allez quitter ce domaine pour ouvrir le marché {country}. Le chemin courant et les paramètres de recherche sûrs seront conservés lorsque cette page existe dans ce marché.",
  "shell.marketDetection.confirmAction": "Ouvrir {country}",
  "shell.marketDetection.handoffFailed":
    "Le transfert sécurisé de votre session n’a pas abouti. Réessayez sans quitter cette page.",
  "shell.marketDetection.gatewayChooseCountry": "Choisissez votre pays",
  "shell.marketDetection.gatewaySuggestedCountry": "Pays suggéré : {country}",
  "shell.marketDetection.gatewayEstimate":
    "Cette estimation ne change rien sans votre confirmation.",
  "shell.marketDetection.gatewayContinue": "Continuer vers {country}",
  "shell.marketDetection.openingSoon": "À venir",
  "shell.marketDetection.unavailable": "Indisponible",
  "shell.marketDetection.countryOpeningSoon": "{country} — ouverture prochaine",

  // --- shell.errorBoundary ---
  "shell.errorBoundary.uneErreurInattendueEstSurvenue":
    "Une erreur inattendue est survenue",
  "shell.errorBoundary.applicationARencontreUnProbleme":
    "L'application a rencontré un problème temporaire d'affichage.",
  "shell.errorBoundary.retourAccueil": "Retour accueil",
  "shell.errorBoundary.actualiserLaPage": "Actualiser la page",

  // --- ui.badge ---
  "ui.badge.profilVerifie": "Profil vérifié",

  // --- ui.categoryFilterRail ---
  "ui.categoryFilterRail.faireDefilerLesCategoriesVers":
    "Faire défiler les catégories vers la gauche",
  "ui.categoryFilterRail.filtresParCategorie": "Filtres par catégorie",
  "ui.categoryFilterRail.afficherToutesLesAnnoncesActives":
    "Afficher toutes les annonces actives",
  "ui.categoryFilterRail.faireDefilerLesCategoriesVers2":
    "Faire défiler les catégories vers la droite",
  "ui.categoryFilterRail.toutesLesAnnonces": "Toutes les annonces",

  // --- ui.globalSearchBar ---
  "ui.globalSearchBar.rechercheGlobale": "Recherche globale",
  "ui.globalSearchBar.selectionnerUneCategorie": "Sélectionner une catégorie",
  "ui.globalSearchBar.rechercherUneCategorie": "Rechercher une catégorie…",
  "ui.globalSearchBar.rechercherUneAnnonce": "Rechercher une annonce",
  "ui.globalSearchBar.effacerLeTexte": "Effacer le texte",
  "ui.globalSearchBar.lancerLaRecherche": "Lancer la recherche",
  "ui.globalSearchBar.rechercheMobile": "Recherche mobile",
  "ui.globalSearchBar.rechercheEtFiltres": "Recherche et filtres",
  "ui.globalSearchBar.filtrerLesCategories": "Filtrer les catégories…",
  "ui.globalSearchBar.recherchePrincipaleDePetitesAnnonces":
    "Recherche principale de petites annonces",
  "ui.globalSearchBar.filtrerParCategorie": "Filtrer par catégorie",
  "ui.globalSearchBar.chercherUneCategorie": "Chercher une catégorie…",
  "ui.globalSearchBar.effacerLaRecherche": "Effacer la recherche",
  "ui.globalSearchBar.lancerLaRechercheDePetites":
    "Lancer la recherche de petites annonces",
  "ui.globalSearchBar.toutesLesCategories": "Toutes les catégories",
  "ui.globalSearchBar.categories": "Catégories",

  // --- ui.listingCard ---
  "ui.listingCard.annonceALaUne": "Annonce à la une",
  "ui.listingCard.noteAvis": "Note {rating} sur 5, {count} avis",
  "ui.listingCard.nombrePhotos": "{count} photos",
  "ui.listingCard.ajouterAuxFavoris": "Ajouter aux favoris",

  // --- ui.noResultsFound ---
  "ui.noResultsFound.conseilsPourTrouverVotreBonheur":
    "Conseils pour trouver votre bonheur :",
  "ui.noResultsFound.title": "Aucune annonce trouvée",
  "ui.noResultsFound.titleForQuery": "Aucun résultat pour « {query} »",
  "ui.noResultsFound.description":
    "Aucune annonce ne correspond aux filtres actuellement sélectionnés.",
  "ui.noResultsFound.descriptionForQuery":
    "Nous n’avons trouvé aucune annonce correspondant exactement à votre recherche.",
  "ui.noResultsFound.clearFilters": "Effacer les filtres",
  "ui.noResultsFound.createAlert": "Créer une alerte",
  "ui.noResultsFound.suggestionSpelling":
    "Vérifiez l’orthographe des mots-clés saisis",
  "ui.noResultsFound.suggestionLocation":
    "Élargissez le rayon géographique ou choisissez tout le marché {market}",
  "ui.noResultsFound.suggestionFilters":
    "Supprimez ou élargissez vos filtres de prix et de catégorie",
  "ui.noResultsFound.suggestionRestrictions":
    "Désactivez les critères restrictifs (livraison seule, bons plans)",

  // --- ui.searchAutocomplete ---
  "ui.searchAutocomplete.suggestionsDeRecherche": "Suggestions de recherche",
  "ui.searchAutocomplete.categoriesRayons": "Catégories & Rayons",
  "ui.searchAutocomplete.recherchesRecentes": "Recherches récentes",
  "ui.searchAutocomplete.recherchesLesPlusPopulaires":
    "Recherches les plus populaires",

  // --- ui.sellerCard ---
  "ui.sellerCard.pro": "Pro",
  "ui.sellerCard.verifie": "Vérifié",
  "ui.sellerCard.visiterLaBoutiqueOfficielleCatalogue":
    "Visiter la boutique officielle & catalogue",
  "ui.sellerCard.visiterLaBoutique": "Visiter la boutique",
  "ui.sellerCard.voirLeProfilAnnonces": "Voir le profil & annonces",
  "ui.sellerCard.voirLeProfil": "Voir le profil",
  "ui.sellerIdentity.openIndividual": "Voir le profil de {name}",
  "ui.sellerIdentity.openProfessional": "Visiter la boutique de {name}",
  "ui.sellerIdentity.avatar": "Avatar de {name}",

  // --- auth.forgotPasswordPage ---
  "auth.forgotPasswordPage.votreEmailExempleFr": "votre.email@exemple.fr",
  "auth.forgotPasswordPage.collezLeTokenRecuPar":
    "Collez le token reçu par email",
  "auth.forgotPasswordPage.nouveauMotDePasse": "Nouveau mot de passe",

  // --- auth.loginPage ---
  "auth.loginPage.ex123456Ou84921049": "Ex: 123456 ou 8492-1049",
  "auth.loginPage.votreEmailExempleFr": "votre.email@exemple.fr",
  "auth.loginPage.resterConnecteSurCetAppareil":
    "Rester connecté sur cet appareil",
  "auth.loginPage.acheteurVendeur": "Acheteur / Vendeur",
  "auth.loginPage.siretVitrineVerifiee": "SIRET & Vitrine vérifiée",
  "auth.social.or": "ou continuer avec",
  "auth.social.google": "Continuer avec Google",
  "auth.social.apple": "Continuer avec Apple",
  "auth.social.facebook": "Continuer avec Facebook",
  "auth.social.failed":
    "Cette méthode de connexion est temporairement indisponible.",
  "auth.social.privacy":
    "En continuant, vous acceptez les Conditions d’utilisation et reconnaissez la Politique de confidentialité.",
  "auth.callback.loading": "Validation sécurisée de votre connexion…",
  "auth.callback.success": "Connexion confirmée. Redirection…",
  "auth.callback.linked": "Compte connecté avec succès.",
  "auth.callback.cancelled":
    "La connexion a été annulée. Aucun changement n’a été effectué.",
  "auth.callback.linkRequired":
    "Un compte Shongre existe déjà. Connectez-vous à ce compte puis associez ce fournisseur depuis Connexion & sécurité.",
  "auth.callback.emailRequired":
    "Ce fournisseur n’a pas confirmé votre adresse email. Vérifiez-en une pour terminer votre inscription.",
  "auth.callback.title": "Connexion sécurisée",
  "auth.callback.subtitle":
    "Shongre vérifie la réponse du fournisseur de connexion",
  "auth.callback.emailLabel": "Adresse email à vérifier",
  "auth.callback.verifyEmail": "Vérifier cette adresse",
  "auth.callback.backToLogin": "Retour à la connexion",
  "auth.callback.signInExisting": "Se connecter au compte existant",
  "auth.security.title": "Connexion & sécurité",
  "auth.security.description":
    "Gérez vos méthodes de connexion et les appareils ayant accès à votre compte.",
  "auth.security.loading": "Chargement des réglages de sécurité…",
  "auth.security.confirmIdentity": "Confirmer votre identité",
  "auth.security.confirmDescription":
    "Cette confirmation protège l’association et la suppression de méthodes de connexion.",
  "auth.security.currentPassword": "Mot de passe actuel",
  "auth.security.confirm": "Confirmer",
  "auth.security.methods": "Méthodes de connexion",
  "auth.security.passwordProvider": "Email et mot de passe",
  "auth.security.connected": "Connecté",
  "auth.security.notConnected": "Non connecté",
  "auth.security.linkedOn": "Associé le",
  "auth.security.lastUsed": "Dernière utilisation",
  "auth.security.privateRelay": "Relais privé Apple",
  "auth.security.disconnect": "Déconnecter",
  "auth.security.connect": "Associer",
  "auth.security.unavailable": "Indisponible",
  "auth.security.changePassword": "Modifier le mot de passe",
  "auth.security.addPassword": "Ajouter un mot de passe",
  "auth.security.newPassword": "Nouveau mot de passe",
  "auth.security.savePassword": "Enregistrer le mot de passe",
  "auth.security.devices": "Appareils connectés",
  "auth.security.devicesDescription":
    "Révoquez immédiatement un appareil que vous ne reconnaissez pas.",
  "auth.security.refresh": "Actualiser",
  "auth.security.lastActivity": "Dernière activité",
  "auth.security.thisDevice": "Cet appareil",
  "auth.security.signOut": "Se déconnecter",
  "auth.security.revoke": "Révoquer",
  "auth.security.noSessions": "Aucune session active.",
  "auth.security.signOutOthers": "Déconnecter les autres appareils",
  "auth.security.secretsNotice":
    "Les jetons de fournisseur et les secrets OAuth ne sont jamais affichés dans cette page.",
  "auth.onboarding.title": "Comment utiliserez-vous Shongre ?",
  "auth.onboarding.description":
    "Votre méthode de connexion est prête. Ce choix adapte maintenant votre parcours sans modifier votre identité.",
  "auth.onboarding.continue": "Continuer",

  // --- auth.registerPages ---
  "auth.registerPages.creezVotreCompteGratuitEn":
    "Créez votre compte gratuit en 1 minute pour acheter et vendre en toute sérénité",
  "auth.registerPages.14RueDesAntiquaires": "14 rue des Antiquaires",
  "auth.registerPages.evolutionDeCompteSouple": "Évolution de compte souple :",
  "auth.registerPages.vendeurProfessionnel": "Vendeur Professionnel",
  "auth.registerPages.identiteDuGerant": "Identité du gérant",

  // --- auth.verifyEmailPage ---
  "auth.verifyEmailPage.verificationDAdresseEmail":
    "Vérification d'adresse email",
  "auth.verifyEmailPage.confirmezVotreAdresseEmailPour":
    "Confirmez votre adresse email pour sécuriser votre compte et activer toutes les fonctionnalités",
  "auth.verifyEmailPage.collezIciVotreJetonDe":
    "Collez ici votre jeton de validation",
  "auth.verifyEmailPage.renvoyerUnEmailDeValidation":
    "Renvoyer un email de validation",

  // --- auth.accountTypeSelector ---
  "auth.accountTypeSelector.depotDAnnoncesGratuitEt":
    "Dépôt d'annonces gratuit et instantané",
  "auth.accountTypeSelector.paiementSecuriseAvecSequestre":
    "Paiement en ligne sécurisé via Stripe",
  "auth.accountTypeSelector.messagerieInstantaneeDirecte":
    "Messagerie instantanée directe",
  "auth.accountTypeSelector.badgeOfficielVendeurProVerifie":
    "Badge officiel Vendeur Pro Vérifié",
  "auth.accountTypeSelector.vitrineDeBoutiquePersonnalisable":
    "Vitrine de boutique personnalisable",
  "auth.accountTypeSelector.facturationAutomatiqueAvecTva":
    "Facturation automatique avec TVA",

  // --- auth.authLayout ---
  "auth.authLayout.conformiteRgpdFranceUe":
    "Préférences de confidentialité intégrées",
  "auth.authLayout.protectionAcheteurVendeur": "Protection Acheteur & Vendeur",

  // --- auth.mFAModal ---
  "auth.mFAModal.copierLaCleSecrete": "Copier la clé secrète",
  "auth.mFAModal.copierLesCodesDeSecours": "Copier les codes de secours",

  // --- auth.passwordField ---
  "auth.passwordField.robustesseDuMotDePasse": "Robustesse du mot de passe :",
  "auth.passwordField.8CaracteresMinimum": "8 caractères minimum",
  "auth.passwordField.1CaractereSpecial": "1 caractère spécial",

  // --- auth.upgradeToProModal ---
  "auth.upgradeToProModal.exAtelierEbenisterieDupont":
    "Ex: Atelier Ébénisterie Dupont",
  "auth.upgradeToProModal.12RueDuCommerce75011":
    "12 rue du Commerce, 75011 Paris",
  "auth.upgradeToProModal.verificationLegale": "Vérification légale :",

  // --- categories.categoriesPage ---
  "categories.categoriesPage.filtrerUneCategorieSousCategorie":
    "Filtrer une catégorie, sous-catégorie...",
  "categories.categoriesPage.toutesLesCategories": "Toutes les catégories",
  "categories.categoriesPage.voirToutesLesAnnonces": "Voir toutes les annonces",
  "categories.categoriesPage.voirTout": "Voir tout",
  "categories.categoriesPage.aucuneCategorieTrouvee":
    "Aucune catégorie trouvée",

  // --- collections.collectionsPage ---
  "collections.collectionsPage.chercherUneThematique":
    "Chercher une thématique...",
  "collections.collectionsPage.annoncesDeLaCollection":
    "Annonces de la collection",
  "collections.collectionsPage.filtrerDansLaSelection":
    "Filtrer dans la sélection...",
  "collections.collectionsPage.toutesLesCollections": "Toutes les collections",
  "collections.collectionsPage.leMotDeLaRedaction": "Le mot de la rédaction",
  "collections.collectionsPage.aucuneCollectionTrouvee":
    "Aucune collection trouvée",
  "collections.collectionsPage.aucuneAnnonceTrouvee": "Aucune annonce trouvée",
  "collections.collectionsPage.decouvrirDAutresCollections":
    "Découvrir d’autres collections",
  "collections.collectionsPage.notFoundTitle": "Collection introuvable",
  "collections.collectionsPage.notFoundDescription":
    "Cette sélection n’existe pas ou n’est plus disponible dans ce marché.",
  "collections.collectionsPage.returnToCollections": "Retour aux collections",
  "collections.collectionsPage.loadErrorTitle":
    "Sélection momentanément indisponible",
  "collections.collectionsPage.loadErrorDescription":
    "Les annonces de cette collection n’ont pas pu être chargées. Réessayez dans un instant.",

  // --- favorites.favoritesPage ---
  "favorites.favoritesPage.aucunFavoriPourLeMoment":
    "Aucun favori pour le moment",
  "favorites.favoritesPage.cliquezSurLeCUr":
    "Cliquez sur le cœur d'une annonce pour la sauvegarder et la retrouver facilement ici.",

  // --- home.homePage ---
  "home.homePage.ceMarcheVientDOuvrir":
    "Ce marché vient d'ouvrir. Publiez la première annonce, ou changez de marché depuis l'en-tête pour explorer les autres pays.",
  "home.homePage.explorerLeCatalogue": "Explorer le catalogue",
  "home.homePage.toutesLesNouveautes": "Voir toutes les nouveautés",
  "home.homePage.voirTout": "Voir tout",
  "home.homePage.toutesLesOffres": "Toutes les offres",
  "home.homePage.tousLesProfessionnels": "Tous les professionnels",
  "home.trendingNow.kicker": "Ce qui bouge",
  "home.trendingNow.explorerTout": "Tout explorer",
  "home.trendingNow.topics": "Tendances du moment",
  "home.trendingNow.topicsAnnouncement_one": "{count} tendance mise à jour",
  "home.trendingNow.topicsAnnouncement_other": "{count} tendances mises à jour",
  "home.trendingNow.voirTout": "Voir tout",
  "home.trendingNow.annonces": "annonces",
  "home.trendingNow.topicPosition": "thématique {position}",

  // --- home.homeRecentSearches ---
  "home.homeRecentSearches.recherchesRecentes": "Recherches récentes",
  "home.homeRecentSearches.touteLaFrance": "Toute la France",
  "home.homeRecentSearches.supprimerCetteRecherche":
    "Supprimer cette recherche",

  // --- home.homeCollectionsSection ---
  "home.homeCollectionsSection.tendanceEnCeMoment": "Tendance en ce moment",
  "home.homeCollectionsSection.laPieceManquante": "La pièce manquante",
  "home.homeCollectionsSection.aVeloEnFamille": "À vélo en famille",
  "home.homeCollectionsSection.amenagezVotreExterieur":
    "Aménagez votre extérieur",
  "home.homeCollectionsSection.unPetitPlongeon": "Un petit plongeon ?",
  "home.homeCollectionsSection.deLAir": "De l'air !",
  "home.homeCollectionsSection.thematiquesCollections":
    "thématiques collections",
  "home.homeCollectionsSection.toutesLesCollections":
    "Voir toutes les collections",
  "home.homeCollectionsSection.voirTout": "Voir tout",
  "home.homeCollectionsSection.explorerLaCollection":
    "Explorer la collection {name}",

  // --- legal.legalPages ---
  "legal.legalPages.conditionsGeneralesDUtilisationCgu":
    "Conditions Générales d'Utilisation (CGU)",
  "legal.legalPages.derniereMiseAJourFevrier":
    "Dernière mise à jour : Février 2026",
  "legal.legalPages.1ObjetDeLaPlateforme": "1. Objet de la plateforme",
  "legal.legalPages.laPlateformeShongreEstUn":
    "La plateforme Shongre est un service de mise en relation entre acheteurs et vendeurs (particuliers et professionnels) pour la publication de petites annonces, la négociation et l'exécution sécurisée de transactions en France métropolitaine.",
  "legal.legalPages.2SequestreProtectionAcheteur":
    "2. Paiement en ligne et litiges",
  "legal.legalPages.lorsquUneTransactionEstEffectuee":
    "Les paiements en ligne sont traités par un prestataire de paiement indépendant. Les versements et remboursements dépendent du statut transmis par ce prestataire, des conditions de la commande et des règles applicables. Shongre n’est ni une banque ni un service de séquestre.",
  "legal.legalPages.3EngagementsDesProfessionnels":
    "3. Engagements des Professionnels",
  "legal.legalPages.lesVendeursProfessionnelsSEngagent":
    "Les vendeurs professionnels s'engagent à fournir un numéro SIRET valide, à respecter le droit de rétractation légal de 14 jours et à émettre des factures conformes aux exigences fiscales françaises.",
  "legal.legalPages.politiqueDeConfidentialiteRgpd":
    "Politique de Confidentialité & RGPD",
  "legal.legalPages.shongreAttacheLaPlusGrande":
    "Shongre attache la plus grande importance à la protection de vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD 2016/679) et à la loi Informatique et Libertés.",
  "legal.legalPages.principeDeMinimisation": "Principe de minimisation :",
  "legal.legalPages.mentionsLegales": "Mentions Légales",
  "legal.legalPages.editeur": "Éditeur :",
  "legal.legalPages.shongreSasAuCapitalDe":
    "Shongre SAS au capital de 50 000 € - RCS Paris 912 345 678",
  "legal.legalPages.siegeSocial": "Siège social :",
  "legal.legalPages.directeurDeLaPublication": "Directeur de la publication :",
  "legal.legalPages.antoineFabrePresident": "Antoine Fabre, Président",
  "legal.legalPages.hebergement": "Hébergement :",
  "legal.legalPages.serveursSecurisesSituesEnFrance":
    "Serveurs sécurisés situés en France métropolitaine.",
  "legal.legalPages.declarationDAccessibiliteWcag2":
    "Déclaration d'Accessibilité (WCAG 2.2 AA)",
  "legal.legalPages.shongreSEngageARendre":
    "Shongre s'engage à rendre sa plateforme accessible à tous les internautes, y compris les personnes en situation de handicap, conformément aux standards internationaux WCAG 2.2 niveau AA.",
  "legal.legalPages.navigationIntegraleAuClavierAvec":
    "Navigation intégrale au clavier avec focus visible",
  "legal.legalPages.contrastesTypographiquesSuperieursAuxRatios":
    "Contrastes typographiques supérieurs aux ratios 4.5:1",
  "legal.legalPages.labelsEtAttributsAriaSur":
    "Labels et attributs ARIA sur l'ensemble des contrôles interactifs",
  "legal.legalPages.conseilsDeSecuriteAntiFraude":
    "Conseils de Sécurité & Anti-Fraude",
  "legal.legalPages.refusezLesVirementsDirectsMandats":
    "Refusez les virements directs, mandats Western Union ou chèques sans garantie.",
  "legal.legalPages.utilisezLeSequestreShongre":
    "Utilisez le paiement en ligne proposé",
  "legal.legalPages.votreArgentEstProtegeJusqu":
    "Vérifiez toujours le statut de la commande et signalez rapidement tout problème depuis votre espace achats.",

  // --- listings.listingDetailPage ---
  "listings.listingDetailPage.annonceIntrouvableOuSupprimee":
    "Annonce introuvable ou supprimée",
  "listings.listingDetailPage.cetteAnnonceNEstPlus":
    "Cette annonce n'est plus accessible ou a été retirée par son vendeur. Des articles similaires sont peut-être disponibles.",
  "listings.listingDetailPage.partagerLAnnonce": "Partager l'annonce",
  "listings.listingDetailPage.signalerCetteAnnonce": "Signaler cette annonce",
  "listings.listingDetailPage.votreMessage": "Votre message",
  "listings.listingDetailPage.bonjourVotreArticleMInteresse":
    "Bonjour, votre article m'intéresse beaucoup. Est-il toujours disponible ?...",
  "listings.listingDetailPage.faireUneOffreDePrix": "Faire une offre de prix",
  "listings.listingDetailPage.montantDeVotreOffre":
    "Montant de votre offre (€)",
  "listings.listingDetailPage.aidezLEquipeDeModeration":
    "Aidez l'équipe de modération à préserver la sécurité sur Shongre",
  "listings.listingDetailPage.motifDuSignalement": "Motif du signalement",
  "listings.listingDetailPage.precisionsComplementaires":
    "Précisions complémentaires",
  "listings.listingDetailPage.expliquezCeQuiVousSemble":
    "Expliquez ce qui vous semble anormal...",
  "listings.listingDetailPage.annonceIntrouvable": "Annonce introuvable",
  "listings.listingDetailPage.vendeurPro": "Vendeur Pro",
  "listings.listingDetailPage.referenceAnnonce": "Référence annonce :",
  "listings.listingDetailPage.vousEtesLAuteurDe":
    "Vous êtes l'auteur de cette annonce",
  "listings.listingDetailPage.voirTout": "Voir tout",
  "listings.listingDetailPage.annoncesSimilaires": "Annonces similaires",

  // --- listings.listingMediaGallery ---
  "listings.listingMediaGallery.photoPrecedente": "Photo précédente",
  "listings.listingMediaGallery.photoSuivante": "Photo suivante",
  "listings.listingMediaGallery.photoPosition": "Photo {current} sur {total}",
  "listings.listingMediaGallery.galleryLabel": "Galerie de photos ({total})",
  "listings.listingMediaGallery.agrandirEnPleinEcran":
    "Agrandir en plein écran",
  "listings.listingMediaGallery.fermerLePleinEcran": "Fermer le plein écran",

  // --- listings.listingSafetyNotice ---
  "listings.listingSafetyNotice.garantieSecuriteShongre":
    "Garantie & Sécurité Shongre",
  "listings.listingSafetyNotice.paymentBody":
    "Le paiement est traité par le prestataire indiqué dans la commande. Vérifiez son statut avant toute remise et ouvrez un litige depuis la commande en cas de problème.",
  "listings.listingSafetyNotice.applicationTitle": "Candidature sécurisée",
  "listings.listingSafetyNotice.applicationBody":
    "Vérifiez l’identité de l’employeur et ne transmettez jamais de coordonnées bancaires ni de paiement pour candidater.",
  "listings.listingSafetyNotice.serviceTitle": "Échangez en toute sécurité",
  "listings.listingSafetyNotice.serviceBody":
    "Convenez du contenu, du tarif, de l’horaire et du lieu dans la messagerie avant le rendez-vous. Ne versez rien en dehors d’un parcours de paiement proposé par Shongre.",
  "listings.listingSafetyNotice.appointmentTitle": "Préparez le rendez-vous",
  "listings.listingSafetyNotice.appointmentBody":
    "Confirmez les conditions dans la messagerie, privilégiez un lieu adapté et vérifiez les informations importantes pendant le rendez-vous.",
  "listings.listingSafetyNotice.exchangeTitle": "Échange en personne",
  "listings.listingSafetyNotice.exchangeBody":
    "Décrivez précisément chaque objet dans la messagerie et vérifiez leur état dans un lieu public avant de conclure l’échange.",
  "listings.listingSafetyNotice.inPersonTitle": "Transaction en personne",
  "listings.listingSafetyNotice.inPersonBody":
    "Échangez dans la messagerie, choisissez un lieu public et vérifiez l’article avant de conclure la transaction.",
  "shell.header.restoringSession": "Restauration de votre session",
  "listings.listingDetailPage.remuneration": "Rémunération",
  "listings.listingDetailPage.tarifIndicatif": "Tarif indicatif",
  "listings.listingDetailPage.prixDuBien": "Prix du bien",
  "listings.listingDetailPage.prixDuVehicule": "Prix du véhicule",
  "listings.listingDetailPage.tarifDuCours": "Tarif du cours",
  "listings.listingDetailPage.tarif": "Tarif",
  "listings.listingDetailPage.valeurIndicative": "Valeur indicative",

  // --- listings.listingSellerTrustSection ---
  "listings.listingSellerTrustSection.vendeurPro": "Vendeur Pro",
  "listings.listingSellerTrustSection.verifie": "Vérifié",

  // --- messaging.messagingPage ---
  "messaging.messagingPage.cetUtilisateurNePourraPlus":
    "Cet utilisateur ne pourra plus vous envoyer de messages ni interagir avec vos annonces.",
  "messaging.messagingPage.signalerLaConversation": "Signaler la conversation",
  "messaging.messagingPage.aidezLEquipeDeModeration":
    "Aidez l'équipe de modération à garantir la sécurité sur Shongre.",
  "messaging.messagingPage.fermerLaVuePleinEcran": "Fermer la vue plein écran",
  "messaging.messagingPage.vuePleinEcran": "Vue plein écran",
  "messaging.messagingPage.aucunMessagePourLeMoment":
    "Aucun message pour le moment",
  "messaging.messagingPage.selectionnezUneConversation":
    "Sélectionnez une conversation",

  // --- messaging.conversationContextBar ---
  "messaging.conversationContextBar.reservee": "Réservée",

  // --- messaging.conversationHeader ---
  "messaging.conversationHeader.retourAuxConversations":
    "Retour aux conversations",
  "messaging.conversationHeader.identiteVerifiee": "Identité vérifiée",
  "messaging.conversationHeader.optionsDeLaConversation":
    "Options de la conversation",
  "messaging.conversationHeader.utilisateurBloque": "Utilisateur bloqué",
  "messaging.conversationHeader.voirLeProfilPublic": "Voir le profil public",
  "messaging.conversationHeader.debloquerLUtilisateur":
    "Débloquer l'utilisateur",
  "messaging.conversationHeader.signalerLaConversation":
    "Signaler la conversation",

  // --- messaging.conversationList ---
  "messaging.conversationList.rechercherParNomOuAnnonce":
    "Rechercher par nom ou annonce...",
  "messaging.conversationList.effacerLaRecherche": "Effacer la recherche",
  "messaging.conversationList.all": "Tous",
  "messaging.conversationList.unread": "Non lus",
  "messaging.conversationList.purchases": "Achats",
  "messaging.conversationList.sales": "Ventes",
  "messaging.conversationList.orders": "Commandes",
  "messaging.conversationList.aucuneConversationTrouvee":
    "Aucune conversation trouvée",

  // --- messaging.makeOfferModal ---
  "messaging.makeOfferModal.faireUneOffreDePrix": "Faire une offre de prix",
  "messaging.makeOfferModal.montantDeVotreOffre": "Montant de votre offre (€)",

  // --- messaging.messageComposer ---
  "messaging.messageComposer.apercuPieceJointe": "Aperçu pièce jointe",
  "messaging.messageComposer.supprimerLaPhoto": "Supprimer la photo",
  "messaging.messageComposer.joindreUnePhoto": "Joindre une photo",
  "messaging.messageComposer.ecrivezVotreMessageEntreePour":
    "Écrivez votre message…",
  "messaging.messageComposer.keyboardHint":
    "Entrée pour envoyer. Majuscule plus Entrée pour aller à la ligne.",
  "messaging.messageComposer.photoPreteAEtreEnvoyee":
    "Photo prête à être envoyée",
  "messaging.messageComposer.seraTransmiseAvecVotreMessage":
    "Sera transmise avec votre message",
  "messaging.messageComposer.ajouterUnePhotoALa":
    "Ajouter une photo à la conversation",
  "messaging.messageComposer.envoyer": "Envoyer",
  "messaging.messageComposer.demoAttachmentCondition": "Photo état",
  "messaging.messageComposer.demoAttachmentInvoice": "Facture / Garantie",
  "messaging.messageComposer.demoAttachmentAccessories": "Accessoires inclus",
  "messaging.messageComposer.quickReplyAvailable":
    "Bonjour, oui, l'article est disponible en stock.",
  "messaging.messageComposer.quickReplyShipping":
    "Bonjour, expédition possible sous 24h avec suivi.",
  "messaging.messageComposer.quickReplyPickup":
    "Bonjour, nous pouvons convenir d'un retrait en boutique.",
  "messaging.messageComposer.quickReplyInvoice":
    "Bonjour, facture avec TVA fournie sur demande.",

  // --- messaging.messageTimeline ---
  "messaging.messageTimeline.historiqueDeLaConversation":
    "Historique de la conversation",
  "messaging.messageTimeline.photoPartagee": "Photo partagée",
  "messaging.messageTimeline.debutDeLaConversation": "Début de la conversation",
  "messaging.messageTimeline.echec": "Échec",

  // --- messaging.pickupSchedulerModal ---
  "messaging.pickupSchedulerModal.planifierLaRemiseEnMain":
    "Planifier la remise en main propre",
  "messaging.pickupSchedulerModal.convenezDUnCreneauEt":
    "Convenez d'un créneau et d'un lieu sécurisé pour échanger l'article en toute confiance.",
  "messaging.pickupSchedulerModal.dateDuRendezVous": "Date du rendez-vous",
  "messaging.pickupSchedulerModal.creneauHoraire": "Créneau horaire",
  "messaging.pickupSchedulerModal.lieuDeRendezVousEspace":
    "Lieu de rendez-vous (espace public recommandé)",
  "messaging.pickupSchedulerModal.exDevantLeMetroPlace":
    "ex: Devant le métro, place publique...",
  "messaging.pickupSchedulerModal.matinee10h0012h00": "Matinée (10h00 - 12h00)",
  "messaging.pickupSchedulerModal.apresMidi14h0016h00":
    "Après-midi (14h00 - 16h00)",
  "messaging.pickupSchedulerModal.finDApresMidi16h00":
    "Fin d'après-midi (16h00 - 18h00)",
  "messaging.pickupSchedulerModal.soiree18h0020h00": "Soirée (18h00 - 20h00)",

  // --- newsletter.newsletterLandingPage ---
  "newsletter.newsletterLandingPage.laNewsletterShongre":
    "La Newsletter Shongre",
  "newsletter.newsletterLandingPage.100SansSpam": "100% Sans Spam",
  "newsletter.newsletterLandingPage.uneFrequenceRaisonneeDUn":
    "Une fréquence raisonnée d'un à deux emails par semaine maximum.",
  "newsletter.newsletterLandingPage.contenuEditorialSoigne":
    "Contenu éditorial soigné",
  "newsletter.newsletterLandingPage.desSelectionsManuellesPrepareesPar":
    "Des sélections manuelles préparées par nos équipes basées en France.",
  "newsletter.newsletterLandingPage.desinscriptionInstantanee":
    "Désinscription instantanée",
  "newsletter.newsletterLandingPage.unLienDeDesabonnementEn":
    "Un lien de désabonnement en 1 clic dans chaque email envoyé.",

  // --- newsletter.newsletterPreferencesPage ---
  "newsletter.newsletterPreferencesPage.vosThematiquesFavorites":
    "Vos thématiques favorites",

  // --- newsletter.newsletterUnsubscribePage ---
  "newsletter.newsletterUnsubscribePage.votreAdresseEmail":
    "Votre adresse email",
  "newsletter.newsletterUnsubscribePage.votreEmailExempleFr":
    "votre.email@exemple.fr",

  // --- newsletter.newsletterPreviewModal ---
  "newsletter.newsletterPreviewModal.simulationDeRenduResponsiveDe":
    "Simulation de rendu responsive de la campagne newsletter.",
  "newsletter.newsletterPreviewModal.velo": "Vélo",
  "newsletter.newsletterPreviewModal.preheader": "Préheader :",
  "newsletter.newsletterPreviewModal.veloGravelAluminium":
    "Vélo Gravel Aluminium",
  "newsletter.newsletterPreviewModal.gererMesPreferences":
    "Gérer mes préférences",
  "newsletter.newsletterPreviewModal.seDesabonnerEn1Clic":
    "Se désabonner en 1 clic",

  // --- newsletter.newsletterSignup ---
  "newsletter.newsletterSignup.votreEmailCom": "votre@email.com",
  "newsletter.newsletterSignup.votreAdresseEmail": "Votre adresse email",
  "newsletter.newsletterSignup.saisissezVotreAdresseEmail":
    "Saisissez votre adresse email",
  "newsletter.newsletterSignup.inscriptionConfirmee": "Inscription confirmée !",
  "newsletter.newsletterSignup.vousEtesBienInscrit": "Vous êtes bien inscrit !",
  "newsletter.newsletterSignup.laSelectionShongre": "La sélection Shongre",

  // --- notifications.notificationPreferencesPage ---
  "notifications.notificationPreferencesPage.chargementDeVosPreferencesDe":
    "Chargement de vos préférences de notification…",
  "notifications.notificationPreferencesPage.retourAuCentreDeNotifications":
    "Retour au centre de notifications",
  "notifications.notificationPreferencesPage.categorieDAlerte":
    "Catégorie d'alerte",
  "notifications.notificationPreferencesPage.surLApplication":
    "Sur l'application :",
  "notifications.notificationPreferencesPage.parEmail": "Par email :",
  "notifications.notificationPreferencesPage.surMobilePush":
    "Sur mobile (Push) :",

  // --- notifications.notificationsPage ---
  "notifications.notificationsPage.centreDeNotifications":
    "Centre de notifications",

  // --- notifications.notificationDemoToolbar ---
  "notifications.notificationDemoToolbar.simulateurDEvenementsTempsReel":
    "Simulateur d'événements temps-réel (Mode Démo)",

  // --- notifications.notificationPanel ---
  "notifications.notificationPanel.panneauDesNotifications":
    "Panneau des notifications",
  "notifications.notificationPanel.preferencesDeNotifications":
    "Préférences de notifications",
  "notifications.notificationPanel.toutLire": "Tout lire",
  "notifications.notificationPanel.aucuneNotificationPourLeMoment":
    "Aucune notification pour le moment",
  "notifications.notificationPanel.voirToutesLesNotifications":
    "Voir toutes les notifications",

  // --- profile.sellerPublicPage ---
  "profile.sellerPublicPage.sectionsDuProfilVendeur":
    "Sections du profil vendeur",

  // --- profile.proBusinessInfo ---
  "profile.proBusinessInfo.numeroSiret": "Numéro SIRET",
  "profile.proBusinessInfo.adresseDuSiegeBoutique":
    "Adresse du siège / boutique",
  "profile.proBusinessInfo.droitDeRetractation": "Droit de rétractation",
  "profile.proBusinessInfo.factureAvecTvaSurDemande":
    "Facture avec TVA sur demande",
  "profile.proBusinessInfo.garantieLegaleDeConformite2":
    "Garantie légale de conformité (2 ans)",
  "profile.proBusinessInfo.emballageProfessionnelRenforce":
    "Emballage professionnel renforcé",

  // --- profile.sellerCatalog ---
  "profile.sellerCatalog.effacerLaRecherche": "Effacer la recherche",
  "profile.sellerCatalog.aucunArticleNeCorrespondA":
    "Aucun article ne correspond à votre sélection",
  "profile.sellerCatalog.essayezDeModifierVotreMot":
    "Essayez de modifier votre mot-clé de recherche ou de réinitialiser vos filtres de catégorie et de prix.",
  "profile.sellerCatalog.reinitialiserLesFiltres": "Réinitialiser les filtres",
  "profile.sellerCatalog.fourchetteDePrix": "Fourchette de prix (€) :",

  // --- profile.sellerProfileHeader ---
  "profile.sellerProfileHeader.partagerCeProfil": "Partager ce profil",
  "profile.sellerProfileHeader.optionsSupplementaires":
    "Options supplémentaires",
  "profile.sellerProfileHeader.tauxDeReponse": "Taux de réponse",
  "profile.sellerProfileHeader.delaiMoyen": "Délai moyen",

  // --- profile.sellerReportModal ---
  "profile.sellerReportModal.signalerCeProfil": "Signaler ce profil",
  "profile.sellerReportModal.decrivezPrecisementLesFaitsConstates":
    "Décrivez précisément les faits constatés, liens d'annonces ou échanges...",

  // --- profile.sellerTrustIndicators ---
  "profile.sellerTrustIndicators.paiementSecurise": "Paiement sécurisé",
  "profile.sellerTrustIndicators.livraisonRetrait": "Livraison & Retrait",
  "profile.sellerTrustIndicators.reactiviteCertifiee": "Réactivité certifiée",

  // --- publishing.publishWizard ---
  "publishing.publishWizard.exCanapeDAngleIphone":
    "ex: Canapé d'angle, iPhone 15, Voitures, Vélos...",
  "publishing.publishWizard.titreDeLAnnonce": "Titre de l'annonce",
  "publishing.publishWizard.exCanapeScandinave3Places":
    "ex: Canapé scandinave 3 places tissu bouclette beige",
  "publishing.publishWizard.descriptionDetaillee": "Description détaillée",
  "publishing.publishWizard.vendsCanapeEnExcellentEtat":
    "Vends canapé en excellent état, très confortable. Facture d'achat fournie...",
  "publishing.publishWizard.faireUnDonGratuit0": "Faire un don gratuit (0 €)",
  "publishing.publishWizard.idealPourDesencombrerEtDonner":
    "Idéal pour désencombrer et donner une seconde vie à vos objets",
  "publishing.publishWizard.prixNegociable": "Prix négociable",
  "publishing.publishWizard.permetAuxAcheteursDeFaire":
    "Permet aux acheteurs de faire des offres de prix",
  "publishing.publishWizard.quantiteEnStock": "Quantité en stock",
  "publishing.publishWizard.referenceInterneSkuFacultatif":
    "Référence interne / SKU (facultatif)",
  "publishing.publishWizard.autoriserLeContactDirectEt":
    "Autoriser le contact direct et la messagerie",
  "publishing.publishWizard.autoriserLePaiementSecuriseDirect":
    "Autoriser le paiement sécurisé direct",
  "publishing.publishWizard.brouillonAutoSauvegarde":
    "Brouillon auto-sauvegardé",
  "publishing.publishWizard.categorieActiveValidee":
    "Catégorie active validée :",
  "publishing.publishWizard.criteresDetailles": "Critères détaillés",
  "publishing.publishWizard.selectionnerUneOption":
    "Sélectionner une option...",
  "publishing.publishWizard.exempleDemo": "Exemple démo",
  "publishing.publishWizard.gestionDesStocksReferenceProfessionnelle":
    "Gestion des stocks & Référence Professionnelle",
  "publishing.publishWizard.achatEnLigneDirectSans":
    "Achat en ligne direct (Sans réservation)",
  "publishing.publishWizard.reservationAvecAcompte": "Réservation avec acompte",
  "publishing.publishWizard.livraisonEnColisMondialRelay":
    "Livraison en colis (Mondial Relay, Colissimo)",
  "publishing.publishWizard.transportDeMeublesGrosColis":
    "Transport de meubles & Gros colis (Cocolis)",
  "publishing.publishWizard.optionsAvancees": "Options avancées",
  "publishing.publishWizard.garantieSecuriteTransfrontaliere":
    "Garantie & Sécurité Transfrontalière :",
  "publishing.publishWizard.categorie": "Catégorie",
  "publishing.publishWizard.marchesDeDiffusion": "Marchés de diffusion",
  "publishing.publishWizard.modesDeTransaction": "Modes de transaction",

  // --- savedsearches.savedSearchesPage ---
  "savedsearches.savedSearchesPage.aucuneRechercheSauvegardee":
    "Aucune recherche sauvegardée",
  "savedsearches.savedSearchesPage.lancezUneRecherchePuisCliquez":
    "Lancez une recherche puis cliquez sur 'Sauvegarder la recherche' pour être prévenu des nouvelles annonces.",

  // --- search.exploreMapView ---
  "search.searchPage.etat": "État",
  "search.resultsHeading": "Résultats de recherche",
  "search.exploreMapView.recadrerSurLesAnnonces": "Recadrer sur les annonces",
  "search.exploreMapView.changerLeStyleDeCarte": "Changer le style de carte",
  "search.exploreMapView.fermerLaPrevisualisation":
    "Fermer la prévisualisation",
  "search.exploreMapView.cliquezPourCentrer": "Cliquez pour centrer",

  // --- search.searchPage ---
  "search.searchPage.masquerLePanneauDeFiltres":
    "Masquer le panneau de filtres",
  "search.searchPage.livraisonDisponible": "Livraison disponible",
  "search.searchPage.paiementSecuriseEnLigne": "Paiement sécurisé en ligne",
  "search.searchPage.sauvegarderCetteRecherche": "Sauvegarder",
  "search.searchPage.effacerTousLesFiltres": "Effacer tous les filtres",
  "search.searchPage.filtresDeRecherche": "Filtres de recherche",
  "search.searchPage.resultatsDeRecherche": "Résultats de recherche",
  "search.searchPage.recherchePersonnalisee": "Recherche personnalisée",
  "search.searchPage.categories": "Catégories",
  "search.searchPage.sousCategories": "Sous-catégories",
  "search.searchPage.trierPar": "Trier par :",
  "search.searchPage.trierPar2": "Trier par",
  "search.searchPage.loadError":
    "Impossible de charger les annonces pour le moment. Vos filtres sont conservés.",

  // --- sellerworkspace.accountOverviewPage ---
  "sellerworkspace.accountOverviewPage.presentezVousBrievementAuxAutres":
    "Présentez-vous brièvement aux autres membres de la communauté...",
  "sellerworkspace.accountOverviewPage.comptePro": "Compte Pro",
  "sellerworkspace.accountOverviewPage.verifie": "Vérifié",
  "sellerworkspace.accountOverviewPage.numeroDeTelephone":
    "Numéro de téléphone",
  "sellerworkspace.accountOverviewPage.annoncesActives": "Annonces actives",
  "sellerworkspace.accountOverviewPage.annoncesSauvegardees":
    "Annonces sauvegardées",
  "sellerworkspace.accountOverviewPage.recusJustificatifs":
    "Reçus &amp; justificatifs",
  "sellerworkspace.accountOverviewPage.telephone": "Téléphone",

  // --- sellerworkspace.myListingsPage ---
  "sellerworkspace.myListingsPage.filtrerMesAnnoncesParStatut":
    "Filtrer mes annonces par statut",
  "sellerworkspace.myListingsPage.gererLesPaysDePublication":
    "Gérer les pays de publication",
  "sellerworkspace.myListingsPage.boosterLAnnonce": "Booster l'annonce",
  "sellerworkspace.myListingsPage.supprimerLAnnonce": "Supprimer l'annonce",

  // --- sellerworkspace.proDashboardPage ---
  "sellerworkspace.proDashboardPage.siretVerifie": "SIRET Vérifié",
  "sellerworkspace.proDashboardPage.tauxDeConversion": "Taux de conversion",
  "sellerworkspace.proDashboardPage.surLesFichesArticles":
    "Sur les fiches articles",
  "sellerworkspace.proDashboardPage.volumeDeVentesEstime":
    "Volume de ventes estimé",
  "sellerworkspace.proDashboardPage.ceMoisCi": "Ce mois-ci",

  // --- sellerworkspace.proStorefrontEditorPage ---
  "sellerworkspace.proStorefrontEditorPage.numeroSiret14Chiffres":
    "Numéro SIRET (14 chiffres)",
  "sellerworkspace.proStorefrontEditorPage.presentationDeLEntrepriseSavoir":
    "Présentation de l'entreprise & Savoir-faire",
  "sellerworkspace.proStorefrontEditorPage.telephoneCommercial":
    "Téléphone commercial",
  "sellerworkspace.proStorefrontEditorPage.voirMaVitrineEnDirect":
    "Voir ma vitrine en direct sur le site",

  // --- sellerworkspace.billingHistoryModal ---
  "sellerworkspace.billingHistoryModal.historiqueDeFacturationRecus":
    "Historique de facturation & Reçus",
  "sellerworkspace.billingHistoryModal.consultezEtTelechargezVosFactures":
    "Consultez et téléchargez vos factures, abonnements et options de visibilité",
  "sellerworkspace.billingHistoryModal.toutesLesFacturesShongreSas":
    "Toutes les factures Shongre SAS comportent la TVA française légale à 20%.",

  // --- sellerworkspace.bulkImportModal ---
  "sellerworkspace.bulkImportModal.importMassifDeCatalogueCsv":
    "Import massif de catalogue (CSV / Excel)",
  "sellerworkspace.bulkImportModal.importezSimultanementDesDizainesD":
    "Importez simultanément des dizaines d'annonces professionnelles avec prix, stocks et photos",
  "sellerworkspace.bulkImportModal.deposezVotreFichierCsvIci":
    "Déposez votre fichier CSV ici",

  // --- support.contactPage ---
  "support.contactPage.votreNomComplet": "Votre nom complet",
  "support.contactPage.votreAdresseEmail": "Votre adresse email",
  "support.contactPage.objetDeLaDemande": "Objet de la demande",
  "support.contactPage.objetDeVotreDemande": "Objet de votre demande",
  "support.contactPage.detaillezVotreSituation": "Détaillez votre situation",
  "support.contactPage.decrivezVotreProblemeLesDemarches":
    "Décrivez votre problème, les démarches déjà entreprises ou vos questions...",
  "support.contactPage.echangeDirectAvecLeVendeur":
    "Échange direct avec le vendeur",
  "support.contactPage.3RedigezVotreMessage": "3. Rédigez votre message",
  "support.contactPage.jpgPngOuPdfMax": "JPG, PNG ou PDF (max 10 Mo)",

  // --- support.helpCenterPage ---
  "support.helpCenterPage.rechercherUneQuestionExSequestre":
    "Rechercher une question (ex: paiement, virement, litige...)",
  "support.helpCenterPage.rechercherUneQuestionDansL":
    "Rechercher une question dans l'aide",
  "support.helpCenterPage.questionsFrequentes": "Questions fréquentes",
  "support.helpCenterPage.vousNAvezPasTrouve":
    "Vous n'avez pas trouvé votre réponse ?",

  // --- support.supportRequestDetailPage ---
  "support.supportRequestDetailPage.ecrivezVotreMessageOuVos":
    "Écrivez votre message ou vos précisions ici...",
  "support.supportRequestDetailPage.retourAMesDemandes":
    "Retour à mes demandes",
  "support.supportRequestDetailPage.marquerCommeResolu": "Marquer comme résolu",
  "support.supportRequestDetailPage.simulerReponseConseillerDemo":
    "Simuler réponse conseiller (Démo)",

  // --- support.supportContextCard ---
  "support.supportContextCard.ouvrirLAnnonce": "Ouvrir l'annonce",
  "support.supportContextCard.detacherLAnnonce": "Détacher l'annonce",
  "support.supportContextCard.voirLaCommande": "Voir la commande",
  "support.supportContextCard.detacherLaCommande": "Détacher la commande",

  // --- transactions.directPurchaseCheckoutModal ---
  "transactions.directPurchaseCheckoutModal.nomPrenom": "Nom & Prénom",
  "transactions.directPurchaseCheckoutModal.telephone": "Téléphone",
  "transactions.directPurchaseCheckoutModal.numeroDeCarte": "Numéro de carte",
  "transactions.directPurchaseCheckoutModal.quantite": "Quantité :",
  "transactions.directPurchaseCheckoutModal.1ChoisissezVotreModeDe":
    "1. Choisissez votre mode de réception",
  "transactions.directPurchaseCheckoutModal.adresseDeLivraison":
    "Adresse de livraison",
  "transactions.directPurchaseCheckoutModal.protectionAcheteurSequestre":
    "Paiement traité par un prestataire",
  "transactions.directPurchaseCheckoutModal.totalARegler": "Total à régler",
  "transactions.directPurchaseCheckoutModal.convertedEstimateNotice":
    "Les montants précédés de ≈ sont des estimations. Le débit final reste libellé en {currency}.",
  "transactions.directPurchaseCheckoutModal.2MoyenDePaiementSecurise":
    "2. Moyen de paiement sécurisé",
  "transactions.directPurchaseCheckoutModal.connexionChiffreeSsl256Bits":
    "Connexion chiffrée SSL 256 bits conforme PCI-DSS",
  "transactions.directPurchaseCheckoutModal.achatDirectConfirme":
    "Achat direct confirmé !",
  "transactions.directPurchaseCheckoutModal.codeSecretDeRemiseEn":
    "Code secret de remise en main propre",
  "transactions.directPurchaseCheckoutModal.expeditionEnCours":
    "Expédition en cours",

  // --- transactions.transactionsPage ---
  "transactions.transactionsPage.enAttenteConfirmationVendeur":
    "En attente confirmation vendeur",
  "transactions.transactionsPage.colisExpedie": "Colis expédié",
  "transactions.transactionsPage.livreEnAttenteValidation":
    "Livré - En attente validation",
  "transactions.transactionsPage.finaliseePayee": "Finalisée & Payée",
  "transactions.transactionsPage.annuleeRemboursee": "Annulée & Remboursée",
  "transactions.transactionsPage.garantieSequestreShongre":
    "Suivi du paiement :",
  "transactions.transactionsPage.paiementSousSequestre": "Paiement confirmé",
  "transactions.transactionsPage.validationVendeur": "Validation vendeur",
  "transactions.transactionsPage.fondsVerses": "Fonds versés",

  // --- transactions.disputeModal ---
  "transactions.disputeModal.signalerUnProblemeOuvrirUn":
    "Signaler un problème / Ouvrir un litige",
  "transactions.disputeModal.lesFondsSousSequestreResteront":
    "Le versement peut être suspendu pendant l’examen du dossier, selon le statut du prestataire de paiement et les conditions applicables.",
  "transactions.disputeModal.expliquezCeQuiSEst":
    "Expliquez ce qui s'est passé (état du colis, non-conformité, échange avec l'autre partie...)",
  "transactions.disputeModal.protectionAcheteurVendeurActive":
    "Protection Acheteur & Vendeur active",
  "transactions.disputeModal.ajouterDesPhotosOuJustificatifs":
    "Ajouter des photos ou justificatifs",
  "transactions.disputeModal.jpgPngOuPdfMax": "JPG, PNG ou PDF (max 10 Mo)",

  // --- transactions.leaveReviewModal ---
  "transactions.leaveReviewModal.partagezVotreExperienceAvecCet":
    "Partagez votre expérience avec cet utilisateur (rapidité, politesse, conformité du produit...)",

  // --- transactions.reservationCheckoutModal ---
  "transactions.reservationCheckoutModal.remiseEnMainPropreSecurisee":
    "Remise en main propre sécurisée, gratuit",
  "transactions.reservationCheckoutModal.exEnCentreVilleSamedi":
    "ex: En centre-ville, samedi après-midi",
  "transactions.reservationCheckoutModal.livraisonEnPointRelaisMondial":
    "Livraison en Point Relais Mondial Relay, 4,90 €",
  "transactions.reservationCheckoutModal.livraisonADomicileColissimo6":
    "Livraison à domicile Colissimo, 6,90 €",
  "transactions.reservationCheckoutModal.nomEtPrenom": "Nom et prénom",
  "transactions.reservationCheckoutModal.nEtNomDeRue": "N° et nom de rue",
  "transactions.reservationCheckoutModal.vendeur": "Vendeur :",
  "transactions.reservationCheckoutModal.choisissezVotreModeDObtention":
    "Choisissez votre mode d'obtention :",
  "transactions.reservationCheckoutModal.remiseEnMainPropreSecurisee2":
    "Remise en main propre sécurisée",
  "transactions.reservationCheckoutModal.votreNumeroDeTelephonePour":
    "Votre numéro de téléphone (pour fixer le RDV) :",
  "transactions.reservationCheckoutModal.disponibilitesOuLieuSouhaite":
    "Disponibilités ou lieu souhaité :",
  "transactions.reservationCheckoutModal.livraisonEnPointRelaisMondial2":
    "Livraison en Point Relais (Mondial Relay)",
  "transactions.reservationCheckoutModal.pointRelaisSelectionne":
    "Point Relais sélectionné :",
  "transactions.reservationCheckoutModal.tabacPresseDesHalles15":
    "Tabac Presse des Halles (15 rue République, 13001 Marseille)",
  "transactions.reservationCheckoutModal.epicerieBioDuVieuxPort":
    "Épicerie Bio du Vieux-Port (4 quai des Belges, 13001 Marseille)",
  "transactions.reservationCheckoutModal.livraisonADomicileColissimo":
    "Livraison à domicile (Colissimo)",
  "transactions.reservationCheckoutModal.nomDuDestinataire":
    "Nom du destinataire :",
  "transactions.reservationCheckoutModal.detailDesCoutsEtGaranties":
    "Détail des coûts et garanties :",
  "transactions.reservationCheckoutModal.paiement100ProtegeSousSequestre":
    "Paiement traité par notre prestataire",
  "transactions.reservationCheckoutModal.prixDeLArticle": "Prix de l'article :",
  "transactions.reservationCheckoutModal.totalARegler": "Total à régler :",
  "transactions.reservationCheckoutModal.choisissezVotreMoyenDePaiement":
    "Choisissez votre moyen de paiement :",
  "transactions.reservationCheckoutModal.titulaireDeLaCarte":
    "Titulaire de la carte",
  "transactions.reservationCheckoutModal.numeroDeCarte": "Numéro de carte",
  "transactions.reservationCheckoutModal.chiffrementSsl256BitsEt":
    "Chiffrement SSL 256 bits et authentification 3D Secure 2.0.",
  "transactions.reservationCheckoutModal.votreCodeSecretDeConfirmation":
    "Votre code secret de confirmation de remise",
  "transactions.reservationCheckoutModal.regleDeSecurite":
    "Règle de sécurité :",

  // --- transactions.sellerPayoutModal ---
  "transactions.sellerPayoutModal.transfererMesGainsVersMon":
    "Transférer mes gains vers mon compte bancaire",
  "transactions.sellerPayoutModal.selectionnezLeMontantEtLe":
    "Sélectionnez le montant et le délai de virement souhaité.",
  "transactions.sellerPayoutModal.virementStandardGratuit24A":
    "Virement standard, gratuit, 24 à 48h ouvrées",
  "transactions.sellerPayoutModal.virementInstantane090Credite":
    "Virement instantané, 0,90 €, crédité en moins de 10 minutes",
  "transactions.sellerPayoutModal.montantDuVirement": "Montant du virement (€)",
  "transactions.sellerPayoutModal.typeDeVirement": "Type de virement",
  "transactions.sellerPayoutModal.delaiSepaClassique24A":
    "Délai SEPA classique (24 à 48h ouvrées)",
  "transactions.sellerPayoutModal.crediteEnMoinsDe10":
    "Crédité en moins de 10 minutes sur votre IBAN",
  "transactions.sellerPayoutModal.montantPreleveDuSolde":
    "Montant prélevé du solde :",
  "transactions.sellerPayoutModal.montantNetVerseSurVotre":
    "Montant net versé sur votre compte :",
  "transactions.sellerPayoutModal.virementsExecutesViaMangopayEtablissement":
    "Virements exécutés par le prestataire de paiement configuré, selon le statut du compte vendeur.",

  // --- transactions.transactionDetailModal ---
  "transactions.transactionDetailModal.paiementGarantiParLeService":
    "Statut du paiement confirmé par le prestataire",
  "transactions.transactionDetailModal.exSamedi22AoutA":
    "ex: Samedi 22 août à 14h30",
  "transactions.transactionDetailModal.ex12RueDesRemparts":
    "ex: 12 rue des Remparts, Bordeaux",
  "transactions.transactionDetailModal.refuserLaReservation":
    "Refuser la réservation ?",
  "transactions.transactionDetailModal.confirmerLaReceptionConforme":
    "Confirmer la réception conforme ?",
  "transactions.transactionDetailModal.annulerVotreReservation":
    "Annuler votre réservation ?",
  "transactions.transactionDetailModal.actionRequiseAccepterOuRefuser":
    "Action requise : Accepter ou Refuser la réservation",
  "transactions.transactionDetailModal.codeSecretDeConfirmation":
    "Code secret de confirmation",
  "transactions.transactionDetailModal.uniquementApresAvoirVerifieLa":
    "uniquement après avoir vérifié la conformité de l'article",
  "transactions.transactionDetailModal.avezVousBienRecuL":
    "Avez-vous bien reçu l'article ?",
  "transactions.transactionDetailModal.rendezVousDeRemiseConvenu":
    "Rendez-vous de remise convenu",
  "transactions.transactionDetailModal.datePrevue": "Date prévue :",
  "transactions.transactionDetailModal.telephoneDeContact":
    "Téléphone de contact :",
  "transactions.transactionDetailModal.dateEtHeure": "Date et heure :",
  "transactions.transactionDetailModal.lieuDeRencontre": "Lieu de rencontre :",
  "transactions.transactionDetailModal.numeroDeTelephoneDirect":
    "Numéro de téléphone direct :",
  "transactions.transactionDetailModal.recapitulatifFinancier":
    "Récapitulatif financier :",
  "transactions.transactionDetailModal.fraisDePort": "Frais de port :",
  "transactions.transactionDetailModal.totalRegleParLAcheteur":
    "Total réglé par l'acheteur :",
  "transactions.transactionDetailModal.montantNetVerseAuVendeur":
    "Montant net versé au vendeur :",
  "transactions.transactionDetailModal.historiqueDuDossier":
    "Historique du dossier :",
  "transactions.transactionDetailModal.signalerUnProblemeLitige":
    "Signaler un problème / Litige",

  // --- verification.verificationCenterPage ---
  "verification.verificationCenterPage.checklistDesVerifications":
    "Checklist des vérifications",
  "verification.verificationCenterPage.motifDuRejet": "Motif du rejet :",
  "verification.verificationCenterPage.capacitesPermissionsDuCompte":
    "Capacités & Permissions du Compte",
  "verification.verificationCenterPage.journalDesEvenementsDeConformite":
    "Journal des Événements de Conformité",

  // --- verification.bankPayoutModal ---
  "verification.bankPayoutModal.exJeanDupontOuSarl":
    "Ex: Jean Dupont ou SARL Boutique",

  // --- verification.businessVerificationModal ---
  "verification.businessVerificationModal.14RueDeLArtisanat":
    "14 rue de l'Artisanat",
  "verification.businessVerificationModal.entrepriseIdentifieeDansLeRepertoire":
    "Entreprise identifiée dans le répertoire officiel SIRENE.",
  "verification.businessVerificationModal.presidentDirecteurGeneralGerant":
    "Président / Directeur Général / Gérant",
  "verification.businessVerificationModal.mandataireExpressementHabiliteDelegationDe":
    "Mandataire expressément habilité (délégation de pouvoir)",
  "verification.businessVerificationModal.documentObligatoireDelivreParLe":
    "Document obligatoire délivré par le Greffe du Tribunal",
  "verification.businessVerificationModal.pourAccelererLaValidationDes":
    "Pour accélérer la validation des virements de ventes",
  "verification.businessVerificationModal.modeDemonstrationShongre":
    "Mode Démonstration Shongre",

  // --- verification.identityVerificationModal ---
  "verification.identityVerificationModal.formatsAcceptesJpgPngPdf":
    "Formats acceptés : JPG, PNG, PDF (max 8 Mo)",
  "verification.identityVerificationModal.requisPourLaValidationOptique":
    "Requis pour la validation optique",
  "verification.identityVerificationModal.modeDemonstrationShongre":
    "Mode Démonstration Shongre",

  // --- verification.trustBadge ---
  "verification.trustBadge.identiteOfficielleVerifieeCniPasseport":
    "Identité officielle vérifiée (CNI / Passeport)",
  "verification.trustBadge.entrepriseCertifieeAuRegistreDu":
    "Entreprise certifiée au Registre du Commerce (RCS)",
  "verification.trustBadge.numeroDeTelephoneVerifiePar":
    "Numéro de téléphone vérifié par SMS",
  "verification.trustBadge.compteBancaireSepaValidePour":
    "Compte bancaire SEPA validé pour les virements",
  "verification.trustBadge.identiteVerifiee": "Identité vérifiée",
  "verification.trustBadge.proCertifieRcs": "Pro Certifié RCS",
  "verification.trustBadge.telephoneCertifie": "Téléphone certifié",
  "verification.trustBadge.ibanVerifie": "IBAN vérifié",
  "verification.trustBadge.compte2fa": "Compte 2FA",
  "verification.trustBadge.boutiqueProVerifiee": "Boutique Pro Vérifiée",
  "verification.trustBadge.vendeurDeConfiance": "Vendeur de Confiance",
  "verification.trustBadge.membreVerifie": "Membre Vérifié",
  "verification.trustBadge.compteDebutant": "Compte Débutant",

  // --- security.requirePermission ---
  "security.requirePermission.compteSuspendu": "Compte suspendu",

  // --- admin.adminAuditLogsPage ---
  "admin.adminAuditLogsPage.rechercherParActeurActionCible":
    "Rechercher par acteur, action, cible, détails...",
  "admin.adminAuditLogsPage.rechercherDansLeRegistreD":
    "Rechercher dans le registre d'audit",
  "admin.adminAuditLogsPage.filtrerLeJournalParType":
    "Filtrer le journal par type d'action",
  "admin.adminAuditLogsPage.voirLePayloadComplet": "Voir le payload complet",
  "admin.adminAuditLogsPage.reinitialiserLeRegistreDAudit":
    "Réinitialiser le registre d'audit ?",
  "admin.adminAuditLogsPage.conformiteRgpdSecuritePlateforme":
    "Conformité RGPD & Sécurité plateforme",
  "admin.adminAuditLogsPage.actionSysteme": "Action Système",
  "admin.adminAuditLogsPage.detailsMotif": "Détails & Motif",
  "admin.adminAuditLogsPage.detail": "Détail",
  "admin.adminAuditLogsPage.role": "Rôle",
  "admin.adminAuditLogsPage.details": "Détails :",
  "admin.adminAuditLogsPage.etatPrecedent": "État précédent :",
  "admin.adminAuditLogsPage.nouvelEtat": "Nouvel état :",

  // --- admin.adminLayout ---
  "admin.adminLayout.retourALaPlaceDe": "Retour à la place de marché",
  "admin.adminLayout.sectionsDeLaConsole": "Sections de la console",
  "admin.adminLayout.placeDeMarche": "Place de marché",
  "admin.adminLayout.statutDeSession": "Statut de session",
  "admin.adminLayout.sessionAuthentifieeRbac": "Session authentifiée RBAC",

  // --- admin.adminMarketsPage ---
  "admin.currencies.tab": "Devises et taux",
  "admin.currencies.title": "Gestion des devises",
  "admin.currencies.description":
    "Les conversions servent uniquement à l’affichage. Les montants financiers d’origine ne sont jamais modifiés.",
  "admin.currencies.definitions": "Référentiel des devises",
  "admin.currencies.rates": "Taux de conversion",
  "admin.currencies.marketDefaults": "Devises par marché",
  "admin.currencies.enabled": "Active",
  "admin.currencies.disabled": "Désactivée",
  "admin.currencies.code": "Code ISO 4217",
  "admin.currencies.name": "Nom public",
  "admin.currencies.symbol": "Symbole",
  "admin.currencies.minorDigits": "Décimales de la devise",
  "admin.currencies.currencyEnabled": "Devise disponible",
  "admin.currencies.rateEnabled": "Taux disponible",
  "admin.currencies.reason": "Motif auditable",
  "admin.currencies.base": "Devise source",
  "admin.currencies.quote": "Devise cible",
  "admin.currencies.numerator": "Numérateur exact",
  "admin.currencies.denominator": "Dénominateur exact",
  "admin.currencies.source": "Source du taux",
  "admin.currencies.asOf": "Date de valeur",
  "admin.currencies.expiresAt": "Expiration",
  "admin.currencies.market": "Marché",
  "admin.currencies.defaultCurrency": "Devise par défaut",
  "admin.currencies.displayCurrencies": "Devises d’affichage autorisées",
  "admin.currencies.requestMarketChange": "Soumettre la modification",
  "admin.currencies.currencySaved": "Devise enregistrée et auditée.",
  "admin.currencies.rateSaved": "Taux enregistré et audité.",
  "admin.currencies.rateMetadata":
    "{source} · valeur au {asOf} · configuration modifiée le {updatedAt}",
  "admin.currencies.rateExpiry": "Expire le {expiresAt}",
  "admin.currencies.marketChangeRequested":
    "Modification soumise à l’approbation d’un second administrateur.",
  "admin.currencies.loadError":
    "Le référentiel des devises n’a pas pu être chargé.",
  "admin.adminMarketsPage.supprimerLaSurchargeEtReactiver":
    "Restaurer la valeur validée propre à ce marché",
  "admin.adminMarketsPage.ajouterUnNouveauMarchePays":
    "Ajouter un nouveau Marché / Pays",
  "admin.adminMarketsPage.creezUnNouveauPaysQui":
    "Créez un marché avec une politique locale complète et sécurisée par défaut. Il restera désactivé jusqu'à la validation de ses règles, fournisseurs et contenus.",
  "admin.adminMarketsPage.exItPtDeUk": "ex: IT, PT, DE, UK",
  "admin.adminMarketsPage.exItItPtPt": "ex: it-IT, pt-PT, de-DE",
  "admin.adminMarketsPage.bientotDisponible": "Bientôt disponible",
  "admin.adminMarketsPage.archive": "Archivé",
  "admin.adminMarketsPage.franceFrEstLeMarche":
    "France (`FR`) est le marché initial par défaut",
  "admin.adminMarketsPage.ajouterUnMarche": "Ajouter un marché",
  "admin.adminMarketsPage.moteurDHeritageHierarchiqueEn":
    "Moteur d'héritage hiérarchique en cascade :",
  "admin.adminMarketsPage.marcheSourceCanonique100":
    "Politique du marché par défaut (100 % explicite)",
  "admin.adminMarketsPage.bientot": "Bientôt",
  "admin.adminMarketsPage.selectionnerUnMarche": "Sélectionner un marché :",
  "admin.adminMarketsPage.gestionDesCategoriesParMarche":
    "Gestion des catégories par marché :",
  "admin.adminMarketsPage.parametreRegle": "Paramètre / Règle",
  "admin.adminMarketsPage.statutDuMarche": "Statut du marché",
  "admin.adminMarketsPage.surcharge": "✏️ Surchargé",
  "admin.adminMarketsPage.tauxDeTvaStandard": "Taux de TVA Standard",
  "admin.adminMarketsPage.fraisProtectionAcheteur": "Frais Protection Acheteur",
  "admin.adminMarketsPage.reservationAvecSequestre":
    "Réservation avec paiement en ligne",
  "admin.adminMarketsPage.nomDuMarche": "Nom du Marché",
  "admin.adminMarketsPage.localeParDefaut": "Locale par Défaut",
  "admin.adminMarketsPage.bientotDisponibleVitrine":
    "Bientôt disponible (Vitrine)",
  "admin.adminMarketsPage.actifOperationnel": "Actif (Opérationnel)",
  "admin.adminMarketsPage.activeTrue": "Activé (true)",
  "admin.adminMarketsPage.desactiveFalse": "Désactivé (false)",
  "admin.adminMarketsPage.regleDePersistance": "Règle de persistance :",

  // --- admin.adminModerationPage ---
  "admin.adminModerationPage.supprimerCetteAnnonce": "Supprimer cette annonce",
  "admin.adminModerationPage.auditDeSecuriteIaGemini":
    "Audit de Sécurité IA Gemini",
  "admin.adminModerationPage.supprimerDefinitivementLAnnonce":
    "Supprimer définitivement l'annonce ?",
  "admin.adminModerationPage.suspendreLeCompteUtilisateur":
    "Suspendre le compte utilisateur",
  "admin.adminModerationPage.motifLegalEtContractuelDe":
    "Motif légal et contractuel de la suspension",
  "admin.adminModerationPage.exSignalementsMultiplesPourNon":
    "ex: Signalements multiples pour non-conformité ou tentative de fraude...",
  "admin.adminModerationPage.controleDesContenusEtProfils":
    "Contrôle des contenus et profils",
  "admin.adminModerationPage.laFileDeSignalementsCommunautaires":
    "La file de signalements communautaires est propre et à jour.",
  "admin.adminModerationPage.cliquezSurAuditIaPour":
    "Cliquez sur « Audit IA » pour analyser les risques",
  "admin.adminModerationPage.annonce": "Annonce",
  "admin.adminModerationPage.vendeur": "Vendeur",
  "admin.adminModerationPage.actionsDeModeration": "Actions de Modération",
  "admin.adminModerationPage.analyseDeConformiteEtDetection":
    "Analyse de conformité et détection de fraudes en cours...",
  "admin.adminModerationPage.scoreDeRisqueDetecte": "Score de Risque Détecté",
  "admin.adminModerationPage.syntheseDeLAgentIa": "Synthèse de l'agent IA :",
  "admin.adminModerationPage.elementsSignales": "Éléments signalés :",

  // --- admin.adminMonetizationPage ---
  "admin.adminMonetizationPage.gestionDesFormulesDAbonnement":
    "Gestion des formules d'abonnement Pro",
  "admin.adminMonetizationPage.personnalisationVitrineBanniereStory":
    "Personnalisation Vitrine (Bannière, Story)",

  // --- admin.adminNewsletterPage ---
  "admin.adminNewsletterPage.aucuneCampagneCreee": "Aucune campagne créée",
  "admin.adminNewsletterPage.creezUnePremiereCampagnePour":
    "Créez une première campagne pour envoyer une sélection d'annonces aux abonnés de la newsletter.",
  "admin.adminNewsletterPage.creerUneCampagneNewsletter":
    "Créer une campagne newsletter",
  "admin.adminNewsletterPage.redigezEtCiblezUneNouvelle":
    "Rédigez et ciblez une nouvelle édition de la sélection Shongre.",
  "admin.adminNewsletterPage.nomInterneDeLaCampagne":
    "Nom interne de la campagne",
  "admin.adminNewsletterPage.exSelectionVelosVintageSemaine":
    "ex: Sélection Vélos & Vintage Semaine 34",
  "admin.adminNewsletterPage.objetDeLEmail": "Objet de l'email",
  "admin.adminNewsletterPage.exLesMeilleuresAffairesVelo":
    "ex: 🚲 Les meilleures affaires vélo de la semaine",
  "admin.adminNewsletterPage.texteDApercuPreheader":
    "Texte d'aperçu (Préheader)",
  "admin.adminNewsletterPage.exJusquA40Sur":
    "ex: Jusqu'à -40% sur des vélos gravel vérifiés.",
  "admin.adminNewsletterPage.audienceCiblee": "Audience ciblée",
  "admin.adminNewsletterPage.audienceCibleeParLEnvoi":
    "Audience ciblée par l'envoi",
  "admin.adminNewsletterPage.thematique": "Thématique",
  "admin.adminNewsletterPage.thematiqueCibleeParLEnvoi":
    "Thématique ciblée par l'envoi",
  "admin.adminNewsletterPage.titreDAccrocheDansL":
    "Titre d'accroche dans l'email",
  "admin.adminNewsletterPage.texteDIntroductionEditorial":
    "Texte d'introduction éditorial",
  "admin.adminNewsletterPage.quelquesPhrasesPourContextualiserLa":
    "Quelques phrases pour contextualiser la sélection...",
  "admin.adminNewsletterPage.envoyee": "Envoyée",
  "admin.adminNewsletterPage.programmee": "Programmée",
  "admin.adminNewsletterPage.prete": "Prête",
  "admin.adminNewsletterPage.historiqueDesCampagnes":
    "Historique des campagnes",
  "admin.adminNewsletterPage.apercu": "Aperçu",

  // --- admin.adminOverviewPage ---
  "admin.adminOverviewPage.utilisateursEnregistres": "Utilisateurs enregistrés",
  "admin.adminOverviewPage.verificationsProEnAttente":
    "Vérifications Pro en attente",
  "admin.adminOverviewPage.catalogueDAnnonces": "Catalogue d'annonces",

  // --- admin.adminRolesMatrixPage ---
  "admin.adminRolesMatrixPage.filtrerUnePermissionExListing":
    "Filtrer une permission (ex. déposer une annonce, suspendre un compte)…",
  "admin.adminRolesMatrixPage.filtrerLesPermissionsParCategorie":
    "Filtrer les permissions par catégorie",
  "admin.adminRolesMatrixPage.matriceDesPermissionsParRole":
    "Matrice des permissions par rôle",
  "admin.adminRolesMatrixPage.permissionSensibleOuIrreversible":
    "Permission sensible ou irréversible",
  "admin.adminRolesMatrixPage.controleDAccesBaseSur":
    "Contrôle d'accès basé sur les rôles",
  "admin.adminRolesMatrixPage.votreIdentiteActive": "Votre identité active :",
  "admin.adminRolesMatrixPage.toutesLesCategories": "Toutes les catégories",
  "admin.adminRolesMatrixPage.annoncesCatalogues": "Annonces & Catalogues",
  "admin.adminRolesMatrixPage.moderationSignalements":
    "Modération & Signalements",
  "admin.adminRolesMatrixPage.administrationSysteme": "Administration Système",
  "admin.adminRolesMatrixPage.securiteAudit": "Sécurité & Audit",
  "admin.adminRolesMatrixPage.marchesTerritoires": "Marchés & Territoires",

  // --- admin.adminTaxonomyPage ---
  "admin.adminTaxonomyPage.taxonomieSynchronisee": "Taxonomie Synchronisée",
  "admin.taxonomyHeader.tabLabel": "Barre de catégories",
  "admin.taxonomyHeader.title": "Catégories de l’en-tête",
  "admin.taxonomyHeader.description":
    "Sélectionnez les catégories racines présentées dans l’en-tête de ce marché, activez-les ou désactivez-les et définissez leur ordre d’affichage.",
  "admin.taxonomyHeader.loading": "Chargement de la configuration…",
  "admin.taxonomyHeader.marketRequired":
    "Sélectionnez un marché avant de configurer son en-tête.",
  "admin.taxonomyHeader.unavailableTitle":
    "Configuration de l’en-tête indisponible",
  "admin.taxonomyHeader.loadError":
    "Impossible de charger la configuration de la barre de catégories.",
  "admin.taxonomyHeader.saveError":
    "Impossible d’enregistrer la configuration de la barre de catégories.",
  "admin.taxonomyHeader.saved":
    "La barre de catégories a été enregistrée et auditée.",
  "admin.taxonomyHeader.updatedAt": "Dernière modification : {date}",
  "admin.taxonomyHeader.save": "Enregistrer",
  "admin.taxonomyHeader.addLabel": "Ajouter une catégorie racine",
  "admin.taxonomyHeader.addPlaceholder": "Sélectionner une catégorie",
  "admin.taxonomyHeader.add": "Ajouter",
  "admin.taxonomyHeader.selectedTitle": "Catégories sélectionnées ({count})",
  "admin.taxonomyHeader.empty":
    "Aucune catégorie n’est sélectionnée. Les liens utilitaires restent disponibles.",
  "admin.taxonomyHeader.toggle": "Activer ou désactiver {name}",
  "admin.taxonomyHeader.moveUp": "Monter {name}",
  "admin.taxonomyHeader.moveDown": "Descendre {name}",
  "admin.taxonomyHeader.remove": "Retirer {name}",
  "admin.taxonomyHeader.saveTitle": "Enregistrer la configuration de l’en-tête",
  "admin.taxonomyHeader.reasonLabel": "Motif de la modification",
  "admin.taxonomyHeader.reasonPlaceholder":
    "Expliquez la sélection, l’activation ou le nouvel ordre…",

  // --- admin.adminUsersPage ---
  "admin.adminUsersPage.rechercherUnNomEmailEntreprise":
    "Rechercher un nom, email, entreprise, SIRET...",
  "admin.adminUsersPage.rechercherUnUtilisateur": "Rechercher un utilisateur",
  "admin.adminUsersPage.filtrerParTypeDeCompte": "Filtrer par type de compte",
  "admin.adminUsersPage.filtrerParRolePlateforme":
    "Filtrer par rôle plateforme",
  "admin.adminUsersPage.seConnecterEnTantQue":
    "Se connecter en tant que cet utilisateur",
  "admin.adminUsersPage.noteInterneDeVerificationDes":
    "Note interne de vérification des registres",
  "admin.adminUsersPage.suspendreUnCompteUtilisateur":
    "Suspendre un compte utilisateur",
  "admin.adminUsersPage.motifLegalDeLaMesure":
    "Motif légal de la mesure conservatoire",
  "admin.adminUsersPage.exInfractionAuxReglesDe":
    "ex: Infraction aux règles de sécurité ou tentative d'escroquerie...",
  "admin.adminUsersPage.reactiverLeCompte": "Réactiver le compte ?",
  "admin.adminUsersPage.gestionDesComptesVerificationsKbis":
    "Gestion des comptes & vérifications KBIS",
  "admin.adminUsersPage.tousLesTypesDeCompte": "Tous les types de compte",
  "admin.adminUsersPage.typeRole": "Type & Rôle",
  "admin.adminUsersPage.statutVerification": "Statut & Vérification",
  "admin.adminUsersPage.marcheVille": "Marché / Ville",

  // --- admin.adminVerificationsPage ---
  "admin.adminVerificationsPage.filesDAttenteDeVerification":
    "Files d'attente de vérification",
  "admin.adminVerificationsPage.motifDuRefusDeVerification":
    "Motif du refus de vérification",
  "admin.adminVerificationsPage.indiquezLaRaisonPreciseDu":
    "Indiquez la raison précise du refus",
  "admin.adminVerificationsPage.exDocumentFlouDateDe":
    "Ex: Document flou, date de validité expirée, SIRET radié...",
  "admin.adminVerificationsPage.fileDeModerationKycKyb":
    "File de modération KYC / KYB",
  "admin.adminVerificationsPage.dossiersDIdentiteEnFile":
    "Dossiers d'identité en file d'attente",
  "admin.adminVerificationsPage.piece": "Pièce :",
  "admin.adminVerificationsPage.comptesBancairesDeSequestreEnregistres":
    "Comptes bancaires de virement enregistrés",
  "admin.adminVerificationsPage.journalDAuditInalterableDes":
    "Journal d'audit inaltérable des vérifications",

  // --- admin.crmAiProspectingPage ---
  "admin.crmAiProspectingPage.decrivezLesProspectsQueVous":
    "Décrivez les prospects que vous recherchez (ex: Magasins de mobilier design à Paris)...",
  "admin.crmAiProspectingPage.prospectionB2bAssisteeParIa":
    "Prospection B2B Assistée par IA",
  "admin.crmAiProspectingPage.explorationDesRegistresDEntreprises":
    "Exploration des registres d'entreprises et extraction des signaux d'activité...",
  "admin.crmAiProspectingPage.compteShongreOuFicheCrm":
    "Compte Shongre ou fiche CRM existante détectée",
  "admin.crmAiProspectingPage.importe": "Importé",

  // --- admin.crmUniversalSearch ---
  "admin.crmUniversalSearch.label": "Recherche universelle CRM",
  "admin.crmUniversalSearch.clear": "Effacer la recherche CRM",
  "admin.crmUniversalSearch.loading": "Recherche en cours…",
  "admin.crmUniversalSearch.results": "Résultats CRM ({count})",
  "admin.crmUniversalSearch.noResults":
    "Aucun contact, entreprise ou opportunité ne correspond à cette recherche.",
  "admin.crmUniversalSearch.resultsList": "Résultats de la recherche CRM",

  // --- admin.crmCompaniesPage ---
  "admin.crmCompaniesPage.rechercherUneEntrepriseDomaineSecteur":
    "Rechercher une entreprise, domaine, secteur...",
  "admin.crmCompaniesPage.filtrerLesEntreprisesParCycle":
    "Filtrer les entreprises par cycle de vie",
  "admin.crmCompaniesPage.ajouterUneEntreprise": "Ajouter une entreprise",
  "admin.crmCompaniesPage.enregistrezUneNouvelleEntrepriseOu":
    "Enregistrez une nouvelle entreprise ou boutique Pro dans le CRM.",
  "admin.crmCompaniesPage.nomCommercialDeLEntreprise":
    "Nom commercial de l'entreprise",
  "admin.crmCompaniesPage.secteurDActivite": "Secteur d'activité",
  "admin.crmCompaniesPage.exMobilierDecoration": "ex: Mobilier & Décoration",
  "admin.crmCompaniesPage.villeRegion": "Ville / Région",

  // --- admin.crmCompanyDetailPage ---
  "admin.crmCompanyDetailPage.cetteEntrepriseNExistePlus":
    "Cette entreprise n'existe plus dans le CRM, ou a été fusionné avec une autre fiche.",
  "admin.crmCompanyDetailPage.cycleDeVieDeL": "Cycle de vie de l'entreprise",
  "admin.crmCompanyDetailPage.toutesLesEntreprises": "Toutes les entreprises",
  "admin.crmCompanyDetailPage.changerDeStatut": "Changer de statut :",
  "admin.crmCompanyDetailPage.syntheseCommercialeIa": "Synthèse commerciale IA",
  "admin.crmCompanyDetailPage.opportunitesAssociees": "Opportunités associées",
  "admin.crmCompanyDetailPage.aucuneOpportuniteOuverte":
    "Aucune opportunité ouverte.",
  "admin.crmCompanyDetailPage.aucunContactRattache": "Aucun contact rattaché.",

  // --- admin.crmContactDetailPage ---
  "admin.crmContactDetailPage.ceContactNExistePlus":
    "Ce contact n'existe plus dans le CRM, ou a été fusionné avec une autre fiche.",
  "admin.crmContactDetailPage.cycleDeVieDuContact": "Cycle de vie du contact",
  "admin.crmContactDetailPage.planifierUneTache": "Planifier une tâche",
  "admin.crmContactDetailPage.titreDeLaTache": "Titre de la tâche",
  "admin.crmContactDetailPage.exRappelerPourPlanifierLa":
    "ex: Rappeler pour planifier la démo",
  "admin.crmContactDetailPage.dateDEcheance": "Date d'échéance",
  "admin.crmContactDetailPage.tousLesContacts": "Tous les contacts",
  "admin.crmContactDetailPage.changerDeStatut": "Changer de statut :",
  "admin.crmContactDetailPage.comptePlateformeShongreRattache":
    "Compte Plateforme Shongre Rattaché",
  "admin.crmContactDetailPage.voirLaVitrinePublique":
    "Voir la vitrine publique",
  "admin.crmContactDetailPage.typeDeCompte": "Type de compte",
  "admin.crmContactDetailPage.noteVendeur": "Note vendeur",
  "admin.crmContactDetailPage.historiqueDesEchangesNotes":
    "Historique des échanges & Notes",
  "admin.crmContactDetailPage.tachesAssociees": "Tâches associées",
  "admin.crmContactDetailPage.aucuneTachePlanifiee": "Aucune tâche planifiée.",

  // --- admin.crmContactsPage ---
  "admin.crmContactsPage.rechercherParNomEmailEntreprise":
    "Rechercher par nom, email, entreprise...",
  "admin.crmContactsPage.filtrerLesContactsParCycle":
    "Filtrer les contacts par cycle de vie",
  "admin.crmContactsPage.aucunContactNeCorrespondAux":
    "Aucun contact ne correspond aux filtres",
  "admin.crmContactsPage.elargissezLaRechercheOuReinitialisez":
    "Élargissez la recherche ou réinitialisez les filtres pour retrouver l'ensemble du portefeuille.",
  "admin.crmContactsPage.creerUnContactCrm": "Créer un contact CRM",
  "admin.crmContactsPage.ajoutezUnInterlocuteurOuProspect":
    "Ajoutez un interlocuteur ou prospect à la base commerciale.",
  "admin.crmContactsPage.prenom": "Prénom",
  "admin.crmContactsPage.telephone": "Téléphone",
  "admin.crmContactsPage.exGerant": "ex: Gérant",
  "admin.crmContactsPage.exMaisonDecoParis": "ex: Maison Déco Paris",

  // --- admin.crmOverviewPage ---
  "admin.crmOverviewPage.voirLePipeline": "Voir le Pipeline",
  "admin.crmOverviewPage.opportunites": "Opportunités",
  "admin.crmOverviewPage.valeurDuPipeline": "Valeur du Pipeline",
  "admin.crmOverviewPage.tachesATraiter": "Tâches à traiter",
  "admin.crmOverviewPage.prospectionAssisteeParIa":
    "Prospection Assistée par IA",
  "admin.crmOverviewPage.tachesAFaire": "Tâches à faire",

  // --- admin.crmPipelinePage ---
  "admin.crmPipelinePage.etapePrecedente": "Étape précédente",
  "admin.crmPipelinePage.etapeSuivante": "Étape suivante",
  "admin.crmPipelinePage.creerUneOpportuniteCommerciale":
    "Créer une opportunité commerciale",
  "admin.crmPipelinePage.ajoutezUnDealAuPipeline":
    "Ajoutez un deal au pipeline de vente.",
  "admin.crmPipelinePage.titreDeLOpportunite": "Titre de l'opportunité",
  "admin.crmPipelinePage.exAdhesionForfaitProBusiness":
    "ex: Adhésion Forfait Pro Business",
  "admin.crmPipelinePage.entrepriseConcernee": "Entreprise concernée",
  "admin.crmPipelinePage.typeDOpportunite": "Type d'opportunité",
  "admin.crmPipelinePage.valeurEstimee": "Valeur estimée (€)",
  "admin.crmPipelinePage.nouvelleOpportunite": "Nouvelle opportunité",

  // --- admin.crmTasksPage ---
  "admin.crmTasksPage.aucuneTacheDansCetteVue": "Aucune tâche dans cette vue",
  "admin.crmTasksPage.lesRelancesPlanifieesApparaitrontIci":
    "Les relances planifiées apparaîtront ici. Changez de filtre pour consulter les autres échéances.",
  "admin.crmTasksPage.creerUneTache": "Créer une tâche",
  "admin.crmTasksPage.ajoutezUnRappelOuUne":
    "Ajoutez un rappel ou une action commerciale.",
  "admin.crmTasksPage.titreDeLaTache": "Titre de la tâche",
  "admin.crmTasksPage.exRelancerMarcPourSignature":
    "ex: Relancer Marc pour signature",
  "admin.crmTasksPage.compteOuContactAssocie": "Compte ou contact associé",
  "admin.crmTasksPage.dateDEcheance": "Date d'échéance",
  "admin.crmTasksPage.priorite": "Priorité",
  "admin.crmTasksPage.prioriteDeLaTache": "Priorité de la tâche",
  "admin.crmTasksPage.nouvelleTache": "Nouvelle tâche",

  // --- admin.activityTimeline ---
  "admin.activityTimeline.ajouterUneNoteCommercialeCompte":
    "Ajouter une note commerciale, compte-rendu d'appel ou remarque...",

  // --- admin.duplicateConflictModal ---
  "admin.duplicateConflictModal.entrepriseExistanteDetectee":
    "Entreprise existante détectée",
  "admin.duplicateConflictModal.uneCorrespondanceAEteTrouvee":
    "Une correspondance a été trouvée avec un compte déjà enregistré dans Shongre.",
  "admin.duplicateConflictModal.doublonPotentielIdentifie":
    "Doublon potentiel identifié",

  // --- admin.enrichmentDiffModal ---
  "admin.enrichmentDiffModal.examinezEtSelectionnezLesInformations":
    "Examinez et sélectionnez les informations publiques suggérées avant mise à jour.",
  "admin.enrichmentDiffModal.secteurDActivite": "Secteur d'activité",
  "admin.enrichmentDiffModal.syntheseCommercialeIa": "Synthèse commerciale IA",
  "admin.enrichmentDiffModal.100ValideHumain": "100% Validé humain",

  // --- admin.evidenceDrawer ---
  "admin.evidenceDrawer.title": "Sources et justification : {company}",
  "admin.evidenceDrawer.fitShongreEstime": "Fit Shongre estimé",
  "admin.evidenceDrawer.scoreCompatibilite": "Score de compatibilité Shongre",
  "admin.evidenceDrawer.pointsAttention": "Points d'attention",
  "admin.evidenceDrawer.sourcesPubliquesAnalysees_one":
    "{count} source publique analysée",
  "admin.evidenceDrawer.sourcesPubliquesAnalysees_other":
    "{count} sources publiques analysées",
  "admin.evidenceDrawer.url": "URL",
  "admin.evidenceDrawer.consulterLaSource": "Consulter la source",

  // --- admin.adminProviderDetailPage ---
  "admin.adminProviderDetailPage.cetIdentifiantDePrestataireN":
    "Cet identifiant de prestataire n'est pas répertorié dans le registre canonique Shongre. Il a peut-être été retiré ou renommé.",
  "admin.adminProviderDetailPage.retourAuCatalogueDesFournisseurs":
    "Retour au catalogue des fournisseurs",
  "admin.adminProviderDetailPage.capacitesFournies": "Capacités fournies :",
  "admin.adminProviderDetailPage.configurationCles": "Configuration & Clés",
  "admin.adminProviderDetailPage.marchesSurcharges": "Marchés & affectations",
  "admin.adminProviderDetailPage.santeTestsDemo": "Santé & Tests Démo",
  "admin.adminProviderDetailPage.utilisationDependances":
    "Utilisation & Dépendances",

  // --- admin.adminProvidersPage ---
  "admin.adminProvidersPage.matriceMultiMarches": "Matrice Multi-Marchés",
  "admin.adminProvidersPage.capacitesTestees": "Capacités testées :",

  // --- admin.providerCatalogTable ---
  "admin.providerCatalogTable.rechercherParNomCapaciteEx":
    "Rechercher par nom, capacité (ex: payment.card), code...",
  "admin.providerCatalogTable.operationnel": "Opérationnel",
  "admin.providerCatalogTable.degrade": "Dégradé",
  "admin.providerCatalogTable.toutesLesCategories": "Toutes les catégories",
  "admin.providerCatalogTable.tousLesStatuts": "Tous les statuts",
  "admin.providerCatalogTable.desactive": "Désactivé",
  "admin.providerCatalogTable.toutesLesSantes": "Toutes les santés",
  "admin.providerCatalogTable.capacitesPrisesEnCharge":
    "Capacités Prises en Charge",
  "admin.providerCatalogTable.statutSante": "Statut & Santé",
  "admin.providerCatalogTable.marchesSupportes": "Marchés Supportés",

  // --- admin.providerCapabilityLabel ---
  "admin.providerCapabilityLabel.codeCapacite": "Code capacité :",

  // --- admin.providerConfigurationForm ---
  "admin.providerConfigurationForm.etatDActivation": "État d'activation",
  "admin.providerConfigurationForm.sandboxEnvironnementDeTestPartenaire":
    "Sandbox (Environnement de test partenaire)",
  "admin.providerConfigurationForm.productionServeurSecurise":
    "Production (Serveur sécurisé)",
  "admin.providerConfigurationForm.prioriteDeRoutage": "Priorité de routage",
  "admin.providerConfigurationForm.securiteCertifiee": "Sécurité certifiée",
  "admin.providerConfigurationForm.aucunParametreRequisPourCette":
    "Aucun paramètre requis pour cette intégration.",
  "admin.providerConfigurationForm.statutDesIdentifiants":
    "Statut des identifiants :",
  "admin.providerConfigurationForm.cleConfigureeEtValidee":
    "✓ Clé configurée et validée",
  "admin.providerConfigurationForm.nonConfiguree": "⚠ Non configurée",
  "admin.providerConfigurationForm.cleRevoqueeOuInvalide":
    "✗ Clé révoquée ou invalide",
  "admin.providerConfigurationForm.cleExpiree": "⌛ Clé expirée",

  // --- admin.providerHealthSimulator ---
  "admin.providerHealthSimulator.operationnelHealthy": "Opérationnel (Healthy)",
  "admin.providerHealthSimulator.toutesLesRequetesAboutissent":
    "Toutes les requêtes aboutissent",
  "admin.providerHealthSimulator.degradeDegraded": "Dégradé (Degraded)",
  "admin.providerHealthSimulator.ralentissementsOuEchecsPartiels":
    "Ralentissements ou échecs partiels",
  "admin.providerHealthSimulator.basculeImmediateSurLeSecours":
    "Bascule immédiate sur le secours",
  "admin.providerHealthSimulator.succesNominalReponseValideHttps":
    "✓ Succès nominal (Réponse valide HTTPS 200)",
  "admin.providerHealthSimulator.identifiantsOuCleSecreteNon":
    "⚠ Identifiants ou clé secrète non configurés",
  "admin.providerHealthSimulator.depassementDeDelaiTimeoutHttp":
    "⌛ Dépassement de délai (Timeout HTTP 504)",
  "admin.providerHealthSimulator.parametresRejetesParLePartenaire":
    "✗ Paramètres rejetés par le partenaire (400)",

  // --- admin.providerMarketMatrix ---
  "admin.providerMarketMatrix.legende": "Légende :",
  "admin.providerMarketMatrix.referenceFranceActive": "Référence France active",
  "admin.providerMarketMatrix.heriteDeFrance": "Hérité de France",
  "admin.providerMarketMatrix.personnaliseSurcharge":
    "Personnalisé (Surchargé)",
  "admin.providerMarketMatrix.desactiveIndisponible":
    "Désactivé / Indisponible",
  "admin.providerMarketMatrix.fonctionnaliteCapacite":
    "Fonctionnalité / Capacité",

  // --- admin.providerMarketOverridesTab ---
  "admin.providerMarketOverridesTab.exTransporteurDedieZoneFrontaliere":
    "Ex: Transporteur dédié zone frontalière...",
  "admin.providerMarketOverridesTab.prioriteDeRoutage": "Priorité de routage :",
  "admin.providerMarketOverridesTab.activeDansCePays": "Activé dans ce pays",
  "admin.providerMarketOverridesTab.prioriteLocale": "Priorité locale",
  "admin.providerMarketOverridesTab.aucuneSurchargeDefinie":
    "Aucune affectation définie : le fournisseur est indisponible sur ce marché.",

  // --- admin.providerOverviewDashboard ---
  "admin.providerOverviewDashboard.aucuneModificationRecenteEnregistree":
    "Aucune modification récente enregistrée.",

  // --- admin.providerRoutingManager ---
  "admin.providerRoutingManager.operationnel": "Opérationnel",
  "admin.providerRoutingManager.pretPourBascule": "Prêt pour bascule",
  "admin.providerRoutingManager.marcheCible": "Marché cible :",
  "admin.providerRoutingManager.franceReference": "🇫🇷 France (Référence)",
  "admin.providerRoutingManager.aucunSecoursDefini": "Aucun secours défini",

  // --- admin.taxonomyAttributeRegistryTab ---
  "admin.taxonomyAttributeRegistryTab.rechercherParLibelleIdOu":
    "Rechercher par libellé, ID ou code d'attribut...",
  "admin.taxonomyAttributeRegistryTab.rechercherUnAttribut":
    "Rechercher un attribut",
  "admin.taxonomyAttributeRegistryTab.registreCentralDesAttributsCanoniques":
    "Registre Central des Attributs Canoniques",
  "admin.taxonomyAttributeRegistryTab.tousLesTypesDeDonnees":
    "Tous les types de données",
  "admin.taxonomyAttributeRegistryTab.nombreNumerique": "Nombre (Numérique)",
  "admin.taxonomyAttributeRegistryTab.menuDeroulantSelect":
    "Menu déroulant (Select)",
  "admin.taxonomyAttributeRegistryTab.booleenOuiNon": "Booléen (Oui/Non)",
  "admin.taxonomyAttributeRegistryTab.anneeMillesime": "Année (Millésime)",

  // --- admin.taxonomyAuditTab ---
  "admin.taxonomyAuditTab.filtrerLesLogsDAudit": "Filtrer les logs d'audit...",
  "admin.taxonomyAuditTab.journalDAuditTracabiliteDes":
    "Journal d'Audit & Traçabilité des Opérations",
  "admin.taxonomyAuditTab.operateur": "Opérateur",
  "admin.taxonomyAuditTab.details": "Détails",

  // --- admin.taxonomyDraftPublishTab ---
  "admin.taxonomyDraftPublishTab.publierLesModificationsDeTaxonomie":
    "Publier les modifications de taxonomie ?",
  "admin.taxonomyDraftPublishTab.annulerToutesLesModificationsEn":
    "Annuler toutes les modifications en cours ?",
  "admin.taxonomyDraftPublishTab.detailDesChangementsEtages":
    "Détail des changements étagés",
  "admin.taxonomyDraftPublishTab.historiqueDesVersionsPubliees":
    "Historique des Versions Publiées",
  "admin.taxonomyDraftPublishTab.publiePar": "Publié par",

  // --- admin.taxonomyHierarchyTree ---
  "admin.taxonomyHierarchyTree.monterDUnRang": "Monter d'un rang",
  "admin.taxonomyHierarchyTree.descendreDUnRang": "Descendre d'un rang",
  "admin.taxonomyHierarchyTree.ajouterUneSousRubrique":
    "Ajouter une sous-rubrique",
  "admin.taxonomyHierarchyTree.aucuneRubriqueNeCorrespondA":
    "Aucune rubrique ne correspond à vos filtres.",

  // --- admin.taxonomyImportExportTab ---
  "admin.taxonomyImportExportTab.contenuJsonDeTaxonomie":
    "Contenu JSON de taxonomie",
  "admin.taxonomyImportExportTab.reinitialiserLaTaxonomieDOrigine":
    "Réinitialiser la taxonomie d'origine ?",
  "admin.taxonomyImportExportTab.exporterLaTaxonomieCanoniqueJson":
    "Exporter la Taxonomie Canonique (JSON)",
  "admin.taxonomyImportExportTab.importerUneArborescenceExterne":
    "Importer une Arborescence Externe",

  // --- admin.taxonomyNodeEditor ---
  "admin.taxonomyNodeEditor.nomCompletDeLaCategorie":
    "Nom complet de la catégorie (Français)",
  "admin.taxonomyNodeEditor.exVoituresMaterielPro":
    "Ex: Voitures, Outils pro...",
  "admin.taxonomyNodeEditor.schemaDEtat": "Schéma d'état",
  "admin.taxonomyNodeEditor.descriptionCanoniqueEtEditorialeDe":
    "Description canonique et éditoriale de la catégorie...",
  "admin.taxonomyNodeEditor.couleurDAccentuationDeLa":
    "Couleur d'accentuation de la catégorie",
  "admin.taxonomyNodeEditor.ajouterUnSynonymeExSmartphone":
    "Ajouter un synonyme (ex: Smartphone, Portable, GSM...)",
  "admin.taxonomyNodeEditor.ajouterUnSynonyme": "Ajouter un synonyme",
  "admin.taxonomyNodeEditor.retirerCetElement": "Retirer cet élément",
  "admin.taxonomyNodeEditor.statutOperationnel": "Statut opérationnel",
  "admin.taxonomyNodeEditor.modeleDeTitreSeoMeta":
    "Modèle de Titre SEO (Meta Title)",
  "admin.taxonomyNodeEditor.modeleDeMetaDescription":
    "Modèle de Meta Description",
  "admin.taxonomyNodeEditor.selectionnezUneCategorieDansL":
    "Sélectionnez une catégorie dans l'arbre pour l'éditer.",
  "admin.taxonomyNodeEditor.deprecie": "Déprécié",
  "admin.taxonomyNodeEditor.renduStandardPageAnnonceH1":
    "Rendu standard (Page annonce, H1, SEO) :",
  "admin.taxonomyNodeEditor.produitStandardNeufTresBon":
    "Produit standard (Neuf, Très bon état...)",
  "admin.taxonomyNodeEditor.vehicule0KmExcellentControle":
    "Véhicule (0 km, Excellent, Contrôle technique...)",
  "admin.taxonomyNodeEditor.immobilierNeufVefaRenoveA":
    "Immobilier (Neuf/VEFA, Rénové, À rafraîchir...)",
  "admin.taxonomyNodeEditor.professionnelNeufGarantiReconditionne":
    "Professionnel (Neuf garanti, Reconditionné...)",
  "admin.taxonomyNodeEditor.serviceADomicileEnAtelier":
    "Service (À domicile, En atelier, À distance...)",
  "admin.taxonomyNodeEditor.actifEnLigneEtIndexable":
    "Actif (en ligne et indexable)",
  "admin.taxonomyNodeEditor.brouillonInvisibleAuxUtilisateurs":
    "Brouillon (invisible aux utilisateurs)",
  "admin.taxonomyNodeEditor.desactive": "Désactivé",
  "admin.taxonomyNodeEditor.deprecieArchivageProgressif":
    "Déprécié (archivage progressif)",
  "admin.taxonomyNodeEditor.nUdPubliableSelectionnableComme":
    "Nœud publiable (sélectionnable comme catégorie finale d'annonce)",
  "admin.taxonomyNodeEditor.deprecier": "Déprécier",
  "admin.taxonomyNodeEditor.choisirDansLeRegistre":
    "-- Choisir dans le Registre --",
  "admin.taxonomyNodeEditor.schemaDePublicationResoluEffectif":
    "Schéma de Publication Résolu (Effectif pour le vendeur)",
  "admin.taxonomyNodeEditor.primaryCta": "Action principale",
  "admin.taxonomyNodeEditor.moderationReviewMode": "Niveau de modération",
  "admin.taxonomyNodeEditor.standardDurationDays": "Durée standard (jours)",
  "admin.taxonomyNodeEditor.standardMediaAllowance": "Photos incluses",
  "admin.taxonomyNodeEditor.savePublicationConfiguration":
    "Enregistrer la configuration",
  "admin.taxonomyNodeEditor.cta.contactSeller": "Contacter le vendeur",
  "admin.taxonomyNodeEditor.cta.apply": "Postuler",
  "admin.taxonomyNodeEditor.cta.requestQuote": "Demander un devis",
  "admin.taxonomyNodeEditor.cta.requestVisit": "Demander une visite",
  "admin.taxonomyNodeEditor.cta.requestTestDrive": "Demander un essai",
  "admin.taxonomyNodeEditor.cta.requestLesson": "Demander un cours",
  "admin.taxonomyNodeEditor.cta.checkAvailability": "Vérifier la disponibilité",
  "admin.taxonomyNodeEditor.cta.proposeExchange": "Proposer un échange",
  "admin.taxonomyNodeEditor.review.standard": "Standard",
  "admin.taxonomyNodeEditor.review.enhanced": "Renforcée",
  "admin.taxonomyNodeEditor.review.manual": "Revue manuelle",
  "admin.taxonomyNodeEditor.optionsDEtat": "Options d'état :",
  "admin.taxonomyNodeEditor.venteAutorisee": "Vente autorisée :",
  "admin.taxonomyNodeEditor.sequestreCbActif": "Paiement CB en ligne actif :",
  "admin.taxonomyNodeEditor.frontiereDArchitecture":
    "Frontière d'architecture :",
  "admin.taxonomyNodeEditor.eligibiliteIntrinseque": "éligibilité intrinsèque",
  "admin.taxonomyNodeEditor.gestionnaireDePrestataires":
    "Gestionnaire de Prestataires",
  "admin.taxonomyNodeEditor.paiementSecuriseEnLigneSequestre":
    "Paiement en ligne sécurisé via prestataire",
  "admin.taxonomyNodeEditor.reservationAvecAcompteDeSequestre":
    "Réservation avec acompte en ligne",
  "admin.taxonomyNodeEditor.donGratuitAutorise": "Don gratuit autorisé",
  "admin.taxonomyNodeEditor.trocEchangeAutorise": "Troc / Échange autorisé",
  "admin.taxonomyNodeEditor.locationAutorisee": "Location autorisée",
  "admin.taxonomyNodeEditor.architectureMultiMarchesHeritageFrance":
    "Architecture Multi-Marchés & Héritage France :",
  "admin.taxonomyNodeEditor.autoriserLIndexationParLes":
    "Autoriser l'indexation par les moteurs de recherche (Robots: index, follow)",
  "admin.taxonomyNodeEditor.vendeurParticulier": "Vendeur Particulier",
  "admin.taxonomyNodeEditor.vendeurProfessionnel": "Vendeur Professionnel",
  "admin.taxonomyNodeEditor.marche": "Marché :",
  "admin.taxonomyNodeEditor.simulationDuFormulaireDePublication":
    "Simulation du Formulaire de Publication Réel",
  "admin.taxonomyNodeEditor.annoncesActivesAssociees":
    "Annonces actives associées :",
  "admin.taxonomyNodeEditor.sousCategoriesDependantes":
    "Sous-catégories dépendantes :",
  "admin.taxonomyNodeEditor.surchargesMarchesActives":
    "Surcharges marchés actives :",
  "admin.taxonomyNodeEditor.politiqueDIntegriteCanonique":
    "Politique d'intégrité canonique :",

  // --- admin.taxonomyTreeToolbar ---
  "admin.taxonomyTreeToolbar.rechercherParLibelleNomCourt":
    "Rechercher par libellé, nom court, alias, ID, slug...",
  "admin.taxonomyTreeToolbar.rechercherDansLArborescence":
    "Rechercher dans l'arborescence",
  "admin.taxonomyTreeToolbar.filtrerParNiveauDeTaxonomie":
    "Filtrer par niveau de taxonomie",
  "admin.taxonomyTreeToolbar.filtrerParStatutDeN": "Filtrer par statut de nœud",
  "admin.taxonomyTreeToolbar.tousLesNiveaux": "Tous les niveaux",
  "admin.taxonomyTreeToolbar.categoriesRacinesUnivers":
    "Catégories racines (Univers)",
  "admin.taxonomyTreeToolbar.sousCategories": "Sous-catégories",
  "admin.taxonomyTreeToolbar.tousLesStatuts": "Tous les statuts",
  "admin.taxonomyTreeToolbar.depreciesUniquement": "Dépréciés uniquement",

  // --- admin.taxonomyValidationTab ---
  "admin.taxonomyValidationTab.moteurDAuditValidationD":
    "Moteur d'Audit & Validation d'Intégrité",
  "admin.taxonomyValidationTab.etatGlobal": "État global",
  "admin.taxonomyValidationTab.aucuneAnomalieDetecteeDansCe":
    "Aucune anomalie détectée dans ce filtre.",
  "admin.taxonomyValidationTab.laTaxonomieRespecteToutesLes":
    "La taxonomie respecte toutes les règles de cohérence structurelle.",

  // --- admin.addNodeModal ---
  "admin.addNodeModal.cetteOperationAjouteUnNouveau":
    "Cette opération ajoute un nouveau nœud dans le référentiel canonique en mode brouillon.",
  "admin.addNodeModal.nomCompletCanoniqueFrancais":
    "Nom complet canonique (Français)",
  "admin.addNodeModal.exEquipementsDeProtectionIndividuelle":
    "Ex: Équipements de protection individuelle",
  "admin.addNodeModal.exEquipementsPro": "Ex: Équipements Pro",
  "admin.addNodeModal.descriptionInterneOuSeoPour":
    "Description interne ou SEO pour cette catégorie...",
  "admin.addNodeModal.schemaDEtat": "Schéma d'état",
  "admin.addNodeModal.apercuDuRenduUi": "Aperçu du rendu UI :",
  "admin.addNodeModal.renduStandardDetailleSeo":
    "Rendu standard (détaillé/SEO) :",
  "admin.addNodeModal.vehicule": "Véhicule",
  "admin.addNodeModal.nUdPubliableAutoriseLa":
    "Nœud publiable (autorise la création directe d'annonces)",

  // --- admin.attributeEditModal ---
  "admin.attributeEditModal.lesAttributsCanoniquesSontDefinis":
    "Les attributs canoniques sont définis de manière centralisée et réutilisés dans les différentes catégories.",
  "admin.attributeEditModal.libelleDeLAttributFrancais":
    "Libellé de l'attribut (Français)",
  "admin.attributeEditModal.exCapaciteDeStockage": "Ex: Capacité de stockage",
  "admin.attributeEditModal.typeDeDonnee": "Type de donnée",
  "admin.attributeEditModal.uniteDeMesureOptionnelle":
    "Unité de mesure (optionnelle)",
  "admin.attributeEditModal.groupeDePublication": "Groupe de publication",
  "admin.attributeEditModal.texteDAideOuPlaceholder":
    "Texte d'aide ou placeholder (vendeur)",
  "admin.attributeEditModal.exIndiquezLaCapaciteReelle":
    "Ex: Indiquez la capacité réelle de la batterie en kWh",
  "admin.attributeEditModal.libelleAfficheFrancais":
    "Libellé affiché (Français)",
  "admin.attributeEditModal.retirerCetteOption": "Retirer cette option",
  "admin.attributeEditModal.nombreNumerique": "Nombre (Numérique)",
  "admin.attributeEditModal.menuDeroulantSelectUnique":
    "Menu déroulant (Select unique)",
  "admin.attributeEditModal.booleenOuiNon": "Booléen (Oui / Non)",
  "admin.attributeEditModal.anneeMillesime": "Année (Millésime)",
  "admin.attributeEditModal.general": "Général",
  "admin.attributeEditModal.specificationsTechniques":
    "Spécifications techniques",
  "admin.attributeEditModal.mentionsLegalesNormes": "Mentions légales & Normes",

  // --- admin.deleteNodeModal ---
  "admin.deleteNodeModal.laSuppressionPermanenteEstStrictement":
    "La suppression permanente est strictement protégée pour préserver l'intégrité de la marketplace.",
  "admin.deleteNodeModal.suppressionBloqueeParLesRegles":
    "Suppression bloquée par les règles de sécurité :",
  "admin.deleteNodeModal.deprecier": "déprécier",
  "admin.deleteNodeModal.ceNUdEstEligible":
    "Ce nœud est éligible à la suppression :",

  // --- admin.deprecateNodeModal ---
  "admin.deprecateNodeModal.laDepreciationRetireCetteRubrique":
    "La dépréciation retire cette rubrique des nouvelles publications tout en préservant l'intégrité des annonces existantes.",
  "admin.deprecateNodeModal.categorieDeRemplacementSuccesseurLogique":
    "Catégorie de remplacement / Successeur logique (optionnel)",
  "admin.deprecateNodeModal.garantiesDeRetrocompatibilite":
    "Garanties de rétrocompatibilité :",
  "admin.deprecateNodeModal.lesAnnoncesExistantesPublieesSous":
    "Les annonces existantes publiées sous cette catégorie restent 100% consultables.",
  "admin.deprecateNodeModal.leWizardDePublicationNe":
    "Le wizard de publication ne proposera plus cette rubrique aux vendeurs.",
  "admin.deprecateNodeModal.siUnSuccesseurEstDefini":
    "Si un successeur est défini, les redirections de recherche s'appliqueront harmonieusement.",
  "admin.deprecateNodeModal.aucunSuccesseurDirectDepreciationSimple":
    "-- Aucun successeur direct (dépréciation simple) --",

  // --- admin.iconPickerModal ---
  "admin.iconPickerModal.selectionnerUneIconeCanonique":
    "Sélectionner une icône canonique",
  "admin.iconPickerModal.choisissezParmiLeRegistreDes":
    "Choisissez parmi le registre des icônes vectorielles standardisées Shongre.",
  "admin.iconPickerModal.rechercherUneIconeExCar":
    "Rechercher une icône (ex: Car, Home, Phone...)",

  // --- admin.moveNodeModal ---
  "admin.moveNodeModal.reorganisezLaHierarchieEnDeplacant":
    "Réorganisez la hiérarchie en déplaçant ce nœud et l'ensemble de ses sous-catégories.",
  "admin.moveNodeModal.choisirLeNouveauParentDe":
    "Choisir le nouveau parent de destination",
  "admin.moveNodeModal.impactStructurelDuDeplacement":
    "Impact structurel du déplacement :",
  "admin.moveNodeModal.racinePrincipaleNiveauCategorieRacine":
    "📂 Racine principale (Niveau Catégorie Racine)",

  // --- admin.taxonomyNodeEditor SEO templates ---
  "admin.taxonomyNodeEditor.exempleTitreSeo":
    "Ex: Petites annonces {category} d'occasion - Shongre",
  "admin.taxonomyNodeEditor.exempleDescriptionSeo":
    "Ex: Achetez et vendez vos articles {category} avec paiement en ligne sécurisé...",

  // --- shell.demoRoleSwitcher ---
  "shell.demoRoleSwitcher.modeDemo": "Mode Démo",
  "shell.demoRoleSwitcher.testerLesProfilsEtParcours":
    "Tester les {count} profils et parcours sans mot de passe :",
  "shell.demoRoleSwitcher.commercialLabel": "15. Commercial Shongre (Léa)",
  "shell.demoRoleSwitcher.commercialDescription":
    "Prospects, opportunités, relances et relation partenaires",
  "shell.demoRoleSwitcher.changerDeRolePourTester":
    "Changer de profil utilisateur pour tester",
  "shell.demoRoleSwitcher.sessionUpdated":
    "Session de démonstration actualisée",
  "shell.demoRoleSwitcher.sessionUnchanged": "Session inchangée",
  "shell.demoRoleSwitcher.guestActivated":
    "Vous naviguez maintenant comme visiteur non connecté.",
  "shell.demoRoleSwitcher.personaActivated":
    "Le profil {profile} est maintenant actif avec ses données et permissions.",
  "shell.demoRoleSwitcher.switchFailed":
    "Impossible de changer de profil. Réessayez.",
  "shell.demoRoleSwitcher.accesDirectAuxProfilsPublics":
    "Accès direct aux profils publics",
  "shell.demoRoleSwitcher.0AnnonceParticulier": "📦 0 annonce (Particulier)",
  "shell.demoRoleSwitcher.0AnnoncePro": "📦 0 annonce (Pro)",
  "shell.demoRoleSwitcher.profilSuspenduSecurite":
    "🚫 Profil Suspendu (Sécurité)",

  // --- shell.dataMode ---
  "shell.dataMode.modeLive": "Mode Live",
  "shell.dataMode.liveSummary": "Données fournies par l’API Shongre",
  "shell.dataMode.openSettings": "Configurer le mode des données",
  "shell.dataMode.settingsTitle": "Mode des données",
  "shell.dataMode.settingsDescription":
    "Choisissez la source utilisée par tous les services du frontend.",
  "shell.dataMode.demoTitle": "Démo",
  "shell.dataMode.demoDescription":
    "Adaptateurs locaux, déterministes et indépendants du backend.",
  "shell.dataMode.liveTitle": "Live",
  "shell.dataMode.liveDescription":
    "Adaptateurs HTTP connectés à l’API configurée.",
  "shell.dataMode.active": "Actif",
  "shell.dataMode.liveConfirmationTitle": "Confirmez l’activation du mode Live",
  "shell.dataMode.liveConfirmationDescription":
    "La session et les caches du frontend seront entièrement rechargés. Aucun repli automatique vers les données de démonstration ne sera effectué en cas d’erreur.",
  "shell.dataMode.liveNotConfigured":
    "Aucune URL d’API Live n’est configurée dans cette version.",
  "shell.dataMode.liveConfigurationError":
    "L’API Live n’est pas configurée dans cette version. Ajoutez NEXT_PUBLIC_API_URL puis rechargez l’application.",
  "shell.dataMode.liveUnavailableError":
    "L’API Live est configurée mais indisponible. Le mode actuel reste actif.",
  "shell.dataMode.liveUnavailableBootError":
    "L’API Live ne répond pas à son contrôle de disponibilité. Le mode Démo n’a pas été activé automatiquement.",
  "shell.dataMode.liveCheckingTitle": "Connexion au mode Live",
  "shell.dataMode.liveCheckingDescription":
    "Vérification de la disponibilité de l’API Shongre…",
  "shell.dataMode.liveUnavailableLabel": "Mode Live indisponible",
  "shell.dataMode.liveUnavailableTitle": "Impossible de contacter l’API Live",
  "shell.dataMode.noSilentFallback":
    "Aucun repli silencieux vers les données de démonstration n’a été effectué.",
  "shell.dataMode.confirmLive": "Confirmer et activer Live",
  "shell.dataMode.confirmDemo": "Activer le mode Démo",
  "shell.dataMode.switchUnexpectedError":
    "Impossible de changer de mode. Le mode actuel reste actif.",

  // --- shell.header ---
  "shell.header.tableauDeBordCompte": "Tableau de bord compte",
  "shell.header.deconnexion": "Déconnexion",
  "shell.header.connectezVousPourGererVos":
    "Connectez-vous pour gérer vos annonces et messages",
  "shell.header.explorerSurLaCarte": "Explorer sur la carte",
  "shell.header.bonsPlansPrixReduits": "Promotions",
  "shell.header.tableauDeBord": "Tableau de bord",
  "shell.header.mesAnnonces": "Mes annonces",
  "shell.header.accountMenu.availableAccess": "Accès disponibles",
  "shell.header.accountMenu.favorites": "Mes favoris",
  "shell.header.accountMenu.purchases": "Achats & Transactions",
  "shell.header.accountMenu.publicProfile": "Voir mon profil public",
  "shell.header.accountMenu.publicStorefront": "Voir ma vitrine boutique",
  "shell.header.accountMenu.proSolutions": "Solutions & Abonnements Pro",
  "shell.header.accountMenu.demoWorkspace": "Espace marketplace Démo",
  "shell.header.accountMenu.demoAuthorized": "Démo marketplace autorisée",
  "shell.header.accountMenu.status.pending": "Compte en attente",
  "shell.header.accountMenu.status.restricted": "Compte limité",
  "shell.header.accountMenu.status.suspended": "Compte suspendu",
  "shell.header.accountMenu.status.inactive": "Compte désactivé",

  // --- shell.locationPickerModal ---
  "shell.locationPickerModal.appliquerLaZone": "Appliquer la zone",

  // --- shell.preferencesModal ---
  "shell.preferencesModal.validerLesPreferences": "Valider les préférences",

  // --- ui.categoryFilterRail ---
  "ui.categoryFilterRail.sousCategories": "Sous-catégories :",

  // --- ui.dropdownMenu ---
  "ui.dropdownMenu.selectionne": "sélectionné",
  "ui.dropdownMenu.aucunResultatTrouve": "Aucun résultat trouvé",
  "ui.dropdownMenu.effacerLaRecherche": "Effacer la recherche",

  // --- ui.globalSearchBar ---
  "ui.globalSearchBar.toutesLesCategories2": "Toutes les catégories",

  // --- ui.listingCard ---
  "ui.listingCard.livraisonCourt": "Livraison",

  // --- ui.priceRangeSlider ---
  "ui.priceRangeSlider.reinitialiser": "Réinitialiser",

  // --- ui.searchAutocomplete ---
  "ui.searchAutocomplete.entree": "Entrée ↵",
  "ui.searchAutocomplete.effacerTout": "Effacer tout",

  // --- ui.statePanel ---
  "ui.statePanel.detailsTechniques": "Détails techniques",

  // --- ui.uIComponents ---
  "ui.uIComponents.negociable": "Négociable",

  // --- admin.adminAuditLogsPage ---
  "admin.adminAuditLogsPage.tracabiliteConformite": "Traçabilité & Conformité",
  "admin.adminAuditLogsPage.registreDAuditSecurite":
    "Registre d'Audit Sécurité",
  "admin.adminAuditLogsPage.enregistrementImmuableDesModificationsDe":
    "Enregistrement immuable des modifications de permissions, suspensions, modérations et opérations privilégiées.",
  "admin.adminAuditLogsPage.reinitialiser": "Réinitialiser",
  "admin.adminAuditLogsPage.aucunEvenementDAuditEnregistre":
    "Aucun événement d'audit enregistré correspondant.",

  // --- admin.adminMarketsPage ---
  "admin.adminMarketsPage.valeurCanoniqueFranceDefaut":
    "⭐ Valeur Canonique France (Défaut)",
  "admin.adminMarketsPage.heriteDeFrance": "🔄 Hérité de France 🇫🇷",
  "admin.adminMarketsPage.identiqueAFrance": "(Identique à France)",
  "admin.adminMarketsPage.reinitialiserSurFrance": "Réinitialiser sur France",
  "admin.adminMarketsPage.gestionMultiMarchesTerritoires":
    "Gestion Multi-Marchés & Territoires",
  "admin.adminMarketsPage.gerezLesPaysActivesDevises":
    "Gérez les pays activés, devises, passerelles, taxes, quotas et règles de conformité.",
  "admin.adminMarketsPage.chaqueParametreNonExplicitementConfigure":
    "Chaque paramètre non explicitement configuré pour la Belgique, l'Espagne ou la Suisse hérite automatiquement et dynamiquement de la configuration de référence française. Réinitialiser un paramètre supprime sa surcharge locale pour rétablir immédiatement la liaison dynamique avec la France.",
  "admin.adminMarketsPage.referenceCanonique": "Marché par défaut",
  "admin.adminMarketsPage.toutReinitialiserSurFrance":
    "Tout réinitialiser sur France",
  "admin.adminMarketsPage.vousEditezActuellementLa":
    "Vous éditez actuellement la",
  "admin.adminMarketsPage.creerAvecHeritageFrance":
    "Créer avec héritage France",
  "admin.adminMarketsPage.cetteValeurSeraEnregistreeEn":
    "Cette valeur sera enregistrée dans la politique explicite de ce marché. La restauration reprend uniquement la valeur validée du même marché.",
  "admin.adminMarketsPage.enregistrerLaSurcharge":
    "Enregistrer la valeur locale",

  // --- admin.adminModerationPage ---
  "admin.adminModerationPage.moderationSecurite": "Modération & Sécurité",
  "admin.adminModerationPage.fileDeModerationSignalements":
    "File de Modération & Signalements",
  "admin.adminModerationPage.surveillanceEnTempsReelDes":
    "Surveillance en temps réel des signalements utilisateurs, audit anti-fraude assisté par IA Gemini et contrôle des comptes restreints.",
  "admin.adminModerationPage.classerSansSuite": "Classer sans suite",
  "admin.adminModerationPage.suspendreLeProfil": "Suspendre le profil",
  "admin.adminModerationPage.leverLaSuspension": "Lever la suspension",
  "admin.adminModerationPage.masquerLAnnonce": "Masquer l'annonce",

  // --- admin.adminMonetizationPage ---
  "admin.adminMonetizationPage.revenusMonetisation": "Revenus & Monétisation",
  "admin.adminMonetizationPage.formulesProQuotasOptionsDe":
    "Formules Pro, Quotas & Options de Mise en Avant",
  "admin.adminMonetizationPage.configurezLesQuotasDAnnonces":
    "Configurez les quotas d'annonces actives, les commissions et les droits d'accès aux fonctionnalités exclusives pour les vendeurs professionnels.",
  "admin.adminMonetizationPage.quotaMaxDAnnoncesActives":
    "Quota max d'annonces actives",
  "admin.adminMonetizationPage.commissionSurVente": "Commission sur vente (%)",
  "admin.adminMonetizationPage.mettreAJour": "Mettre à jour",

  // --- admin.adminNewsletterPage ---
  "admin.adminNewsletterPage.editionDesSelectionsHebdomadairesCiblage":
    "Édition des sélections hebdomadaires, ciblage d'audience et simulation d'envois.",
  "admin.adminNewsletterPage.abonnesActifsFr": "Abonnés actifs (FR)",
  "admin.adminNewsletterPage.84CeMoisCi": "+8.4% ce mois-ci",
  "admin.adminNewsletterPage.tauxDOuvertureEstime": "Taux d'ouverture estimé",
  "admin.adminNewsletterPage.moyenneSurLes5Dernieres":
    "Moyenne sur les 5 dernières éditions",
  "admin.adminNewsletterPage.campagnesDiffusees": "Campagnes diffusées",
  "admin.adminNewsletterPage.editionsHebdomadairesEtFlash":
    "Éditions hebdomadaires et flash",

  // --- admin.adminOverviewPage ---
  "admin.adminOverviewPage.vousOperezAvecLeRole": "Vous opérez avec le rôle",
  "admin.adminOverviewPage.verifierMesPermissions": "Vérifier mes permissions",
  "admin.adminOverviewPage.conformiteEtSecurite": "Conformité et sécurité",
  "admin.adminOverviewPage.offresActivesEtArchivees":
    "Offres actives et archivées",
  "admin.adminOverviewPage.dossiersProfessionnelsAVerifier":
    "Dossiers Professionnels à Vérifier",
  "admin.adminOverviewPage.gerer": "Gérer",
  "admin.adminOverviewPage.toutesLesImmatriculationsKbisSoumises":
    "Toutes les immatriculations KBIS soumises ont été vérifiées.",
  "admin.adminOverviewPage.dernieresActionsDAuditSecurite":
    "Dernières Actions d'Audit Sécurité",
  "admin.adminOverviewPage.par": "Par:",

  // --- admin.adminRolesMatrixPage ---
  "admin.adminRolesMatrixPage.matriceInteractiveDesRolesPermissions":
    "Matrice Interactive des Rôles & Permissions",
  "admin.adminRolesMatrixPage.cartographieCompleteEtExhaustiveDes":
    "Cartographie complète et exhaustive des privilèges d'accès pour les 13 rôles de la plateforme Shongre. Chaque action sensible fait l'objet d'une vérification rigoureuse au niveau du repository et des contrôleurs.",
  "admin.adminRolesMatrixPage.permissionPerimetre": "Permission & Périmètre",
  "admin.adminRolesMatrixPage.aucunePermissionNeCorrespondA":
    "Aucune permission ne correspond à vos critères de recherche.",

  // --- admin.adminTaxonomyPage ---
  "admin.adminTaxonomyPage.gestionAdministrationDeLaTaxonomie":
    "Gestion & Administration de la Taxonomie",
  "admin.adminTaxonomyPage.referentielCanoniqueUniquePilotantL":
    "Référentiel canonique unique pilotant l'arborescence, les formulaires de publication, les facettes de recherche, les capacités de paiement et le multi-marchés.",
  "admin.adminTaxonomyPage.selectionnezUneCategorieDansL":
    "Sélectionnez une catégorie dans l'arbre pour afficher son éditeur.",

  // --- admin.adminUsersPage ---
  "admin.adminUsersPage.gouvernanceDesIdentites": "Gouvernance des Identités",
  "admin.adminUsersPage.annuaireDesUtilisateursVerifications":
    "Annuaire des Utilisateurs & Vérifications",
  "admin.adminUsersPage.consultezEtAdministrezLEnsemble":
    "Consultez et administrez l'ensemble des comptes (particuliers, professionnels et collaborateurs internes).",

  // --- admin.adminVerificationsPage ---
  "admin.adminVerificationsPage.conformiteLcbFt": "Conformité & LCB-FT",
  "admin.adminVerificationsPage.poleDeVerificationSecurite":
    "Pôle de Vérification & Sécurité",
  "admin.adminVerificationsPage.examinezLesPiecesDIdentite":
    "Examinez les pièces d'identité, extraits KBIS, et comptes bancaires soumis par les membres et boutiques professionnelles.",
  "admin.adminVerificationsPage.aucunDossierKycEnAttente":
    "Aucun dossier KYC en attente de vérification.",
  "admin.adminVerificationsPage.validerLIdentite": "Valider l'identité",
  "admin.adminVerificationsPage.aucunDossierKybEnAttente":
    "Aucun dossier KYB en attente de vérification.",
  "admin.adminVerificationsPage.verifiePourVirements": "Vérifié pour virements",

  // --- admin.crmAiProspectingPage ---
  "admin.crmAiProspectingPage.decouvrezDeFutursVendeursPro":
    "Découvrez de futurs vendeurs Pro à partir de sources publiques",
  "admin.crmAiProspectingPage.recherchezEnLangageNaturelDes":
    "Recherchez en langage naturel des entreprises, artisans et commerçants ayant un catalogue adapté à Shongre. Toutes les recommandations s'appuient sur des sources web publiques vérifiables.",
  "admin.crmAiProspectingPage.signauxDetectes": "Signaux détectés :",

  // --- admin.crmCompaniesPage ---
  "admin.crmCompaniesPage.repertoireDesBoutiquesProMarques":
    "Répertoire des boutiques Pro, marques et entreprises partenaires Shongre.",
  "admin.crmCompaniesPage.aucuneEntrepriseTrouvee":
    "Aucune entreprise trouvée.",
  "admin.crmCompaniesPage.vendeurProActif": "Vendeur Pro Actif",

  // --- admin.crmCompanyDetailPage ---
  "admin.crmCompanyDetailPage.retourAuxEntreprises": "Retour aux entreprises",
  "admin.crmCompanyDetailPage.vendeurProActif": "Vendeur Pro Actif",

  // --- admin.crmContactDetailPage ---
  "admin.crmContactDetailPage.retourAuxContacts": "Retour aux contacts",
  "admin.crmContactDetailPage.tache": "+ Tâche",

  // --- admin.crmContactsPage ---
  "admin.crmContactsPage.baseUnifieeDesAcheteursVendeurs":
    "Base unifiée des acheteurs, vendeurs Pro et prospects commerciaux Shongre.",
  "admin.crmContactsPage.reinitialiserLesFiltres": "Réinitialiser les filtres",
  "admin.crmContactsPage.compteShongreLie": "Compte Shongre lié",

  // --- admin.crmOverviewPage ---
  "admin.crmOverviewPage.tableauDeBordCrmPipeline":
    "Tableau de Bord CRM & Pipeline",
  "admin.crmOverviewPage.issusDeLaProspectionIa":
    "Issus de la prospection IA & Inbound",
  "admin.crmOverviewPage.enCoursDeNegociation": "En cours de négociation",
  "admin.crmOverviewPage.rappelsDemosPlanifiees": "Rappels & démos planifiées",
  "admin.crmOverviewPage.opportunitesCommercialesRecentes":
    "Opportunités Commerciales Récentes",
  "admin.crmOverviewPage.trouvezDeNouveauxVendeursProfessionnels":
    "Trouvez de nouveaux vendeurs professionnels qualifiés",
  "admin.crmOverviewPage.decrivezEnLangageNaturelLes":
    "Décrivez en langage naturel les entreprises cibles et découvrez automatiquement leur potentiel pour Shongre.",
  "admin.crmOverviewPage.lancerUneRechercheIa": "Lancer une recherche IA",
  "admin.crmOverviewPage.echeance": "Échéance :",

  // --- admin.crmPipelinePage ---
  "admin.crmPipelinePage.pipelineDesVentesForfaitsPro":
    "Pipeline des Ventes & Forfaits Pro",
  "admin.crmPipelinePage.suiviDesNegociationsAbonnementsPro":
    "Suivi des négociations, abonnements Pro et acquisitions de comptes clés.",
  "admin.crmPipelinePage.aucuneOpportunite": "Aucune opportunité",

  // --- admin.crmTasksPage ---
  "admin.crmTasksPage.tachesRelancesCommerciales":
    "Tâches & Relances Commerciales",
  "admin.crmTasksPage.suiviDesActionsAppelsDemos":
    "Suivi des actions, appels, démos et signatures à finaliser.",
  "admin.crmTasksPage.creerUneTache2": "Créer une tâche",
  "admin.crmTasksPage.voirToutesLesTaches": "Voir toutes les tâches",
  "admin.crmTasksPage.lieA": "Lié à :",

  // --- admin.activityTimeline ---
  "admin.activityTimeline.evenementsIa": "Événements IA",
  "admin.activityTimeline.etapesPipeline": "Étapes & Pipeline",
  "admin.activityTimeline.aucuneActiviteEnregistreePourCe":
    "Aucune activité enregistrée pour ce filtre.",
  "admin.activityTimeline.par": "Par :",

  // --- admin.duplicateConflictModal ---
  "admin.duplicateConflictModal.creerQuandMemeSepare":
    "Créer quand même séparé",
  "admin.duplicateConflictModal.associerLaRechercheAL":
    "Associer la recherche à l'existant",

  // --- admin.evidenceDrawer ---
  "admin.evidenceDrawer.pourquoiCetteEntrepriseCorrespond":
    "Pourquoi cette entreprise correspond",
  "admin.evidenceDrawer.cesInformationsSontIssuesExclusivement":
    "Ces informations sont issues exclusivement de sources professionnelles publiques. Elles sont soumises à la validation d'un opérateur avant toute prise de contact.",

  // --- admin.adminProviderDetailPage ---
  "admin.adminProviderDetailPage.retourAuxIntegrations":
    "Retour aux intégrations",
  "admin.adminProviderDetailPage.desactive": "Désactivé",
  "admin.adminProviderDetailPage.fonctionnalitesShongreDependantesDeCe":
    "Fonctionnalités Shongre Dépendantes de ce Prestataire",
  "admin.adminProviderDetailPage.fonctionnalitesDirectes":
    "Fonctionnalités directes :",

  // --- admin.adminProvidersPage ---
  "admin.adminProvidersPage.administrationSystemeIntegrations":
    "Administration Système & Intégrations",
  "admin.adminProvidersPage.fournisseursIntegrationsExternes":
    "Fournisseurs & Intégrations Externes",
  "admin.adminProvidersPage.gestionCentraliseeDeToutesLes":
    "Gestion centralisée de toutes les passerelles tierces (Paiements, Transporteurs, Auth, Emails, IA, Cartes, KYC/KYB) avec héritage France et mécanismes de bascule (failover).",
  "admin.adminProvidersPage.executezUnTestDeConnectivite":
    "Exécutez un test de connectivité et de validation des identifiants configurés pour ce prestataire.",
  "admin.adminProvidersPage.lancerLeTest": "Lancer le test",

  // --- admin.providerAuditLogsTab ---
  "admin.providerAuditLogsTab.journalDAuditTracabiliteDes":
    "Journal d'Audit & Traçabilité des Modifications",
  "admin.providerAuditLogsTab.aucunEvenementDAuditEnregistre":
    "Aucun événement d'audit enregistré pour cette intégration.",

  // --- admin.providerCatalogTable ---
  "admin.providerCatalogTable.affichageDe": "Affichage de",
  "admin.providerCatalogTable.reinitialiserLesFiltres":
    "Réinitialiser les filtres",
  "admin.providerCatalogTable.aucunFournisseurNeCorrespondAux":
    "Aucun fournisseur ne correspond aux critères de recherche.",
  "admin.providerCatalogTable.desactive2": "Désactivé",
  "admin.providerCatalogTable.tous": "Tous (*)",
  "admin.providerCatalogTable.gerer": "Gérer",

  // --- admin.providerConfigurationForm ---
  "admin.providerConfigurationForm.parametresGenerauxDActivationDeploiement":
    "Paramètres Généraux d'Activation & Déploiement",
  "admin.providerConfigurationForm.rendLePrestataireOperationnelPour":
    "Rend le prestataire opérationnel pour la plateforme",
  "admin.providerConfigurationForm.contexteDExecution": "Contexte d'exécution",
  "admin.providerConfigurationForm.parametresTechniquesClesDApi":
    "Paramètres Techniques & Clés d'API",
  "admin.providerConfigurationForm.lesClesSecretesSontGerees":
    "Les clés secrètes sont gérées côté serveur et ne sont jamais renvoyées en clair dans le navigateur.",
  "admin.providerConfigurationForm.protectionRenforceeLeSecretReel":
    "Protection renforcée : Le secret réel est injecté de manière confidentielle dans le coffre-fort de clés serveur (Vault / KMS).",
  "admin.providerConfigurationForm.enregistrerLaConfiguration":
    "Enregistrer la configuration",

  // --- admin.providerHealthSimulator ---
  "admin.providerHealthSimulator.etatDeSanteDisponibiliteEn":
    "État de Santé & Disponibilité en Temps Réel",
  "admin.providerHealthSimulator.controlezLEtatDeSante":
    "Contrôlez l'état de santé simulé pour tester la résilience et la bascule vers les prestataires de secours.",
  "admin.providerHealthSimulator.simulateurDeTestsDeterministesDiagnostic":
    "Simulateur de Tests Déterministes & Diagnostic API",
  "admin.providerHealthSimulator.scenarioDeTestAExecuter":
    "Scénario de test à exécuter :",
  "admin.providerHealthSimulator.executerLeTestDeDiagnostic":
    "Exécuter le test de diagnostic",

  // --- admin.providerImpactModal ---
  "admin.providerImpactModal.analyseDImpactOperationnel":
    "Analyse d'Impact Opérationnel",
  "admin.providerImpactModal.veuillezExaminerAttentivementLesRepercussions":
    "Veuillez examiner attentivement les répercussions sur les marchés territoriaux et les fonctionnalités en ligne.",
  "admin.providerImpactModal.marchesTerritoriauxAffectes":
    "Marchés Territoriaux Affectés",
  "admin.providerImpactModal.cesMarchesHeritentActuellementDe":
    "Ces marchés héritent actuellement de la France et adopteront automatiquement ce changement.",
  "admin.providerImpactModal.fonctionnalitesDeLaMarketplaceConcernees":
    "Fonctionnalités de la Marketplace Concernées",
  "admin.providerImpactModal.disponibiliteDUnPrestataireDe":
    "Disponibilité d'un prestataire de secours (Fallback)",
  "admin.providerImpactModal.secoursPret": "Secours Prêt",
  "admin.providerImpactModal.sansSecours": "Sans Secours",
  "admin.providerImpactModal.confirmerLaModification":
    "Confirmer la modification",

  // --- admin.providerMarketMatrix ---
  "admin.providerMarketMatrix.matriceDeCouvertureMultiMarches":
    "Matrice de couverture multi-marchés",
  "admin.providerMarketMatrix.laFranceEstLeMarche":
    "La France (🇫🇷) est le marché de référence. Les autres pays héritent automatiquement de la configuration sauf surcharge explicite.",
  "admin.providerMarketMatrix.ref": "DÉF.",
  "admin.providerMarketMatrix.referenceActive": "Référence active",
  "admin.providerMarketMatrix.nonConfigure": "Non configuré",
  "admin.providerMarketMatrix.heriteDeFr": "↳ Hérité de FR",
  "admin.providerMarketMatrix.personnalise": "★ Personnalisé",
  "admin.providerMarketMatrix.desactive": "Désactivé",

  // --- admin.providerMarketOverridesTab ---
  "admin.providerMarketOverridesTab.selectionnezLeMarcheAInspecter":
    "Sélectionnez le marché dont vous gérez l'affectation :",
  "admin.providerMarketOverridesTab.baseDHeritage": "Comparaison uniquement",
  "admin.providerMarketOverridesTab.touteModificationApporteeALa":
    "Toute modification apportée à la France est immédiatement répercutée sur les marchés sans surcharge.",
  "admin.providerMarketOverridesTab.configurationPersonnalisee":
    "★ Affectation explicite",
  "admin.providerMarketOverridesTab.heriteDeFrance": "↳ Hérité de France",
  "admin.providerMarketOverridesTab.noteDeConformiteOuMotif":
    "Note de conformité ou motif de l'affectation :",
  "admin.providerMarketOverridesTab.reinitialiserSurFrance":
    "Réinitialiser sur France",
  "admin.providerMarketOverridesTab.appliquerLaSurcharge":
    "Enregistrer l'affectation",

  // --- admin.providerOverviewDashboard ---
  "admin.providerOverviewDashboard.integrationsRepertoriees":
    "Intégrations Répertoriées",
  "admin.providerOverviewDashboard.santeOperationnelle": "Santé Opérationnelle",
  "admin.providerOverviewDashboard.heritageFranceActif":
    "Héritage France actif",
  "admin.providerOverviewDashboard.etatDesFonctionsCritiquesDe":
    "État des fonctions critiques du marché par défaut",
  "admin.providerOverviewDashboard.resolutionEnDirectDuPrestataire":
    "Résolution en direct du prestataire primaire et de l'état de fonctionnement effectif.",
  "admin.providerOverviewDashboard.matriceMultiMarches":
    "Matrice multi-marchés",
  "admin.providerOverviewDashboard.degrade": "Dégradé",
  "admin.providerOverviewDashboard.repartitionParDomaineCategorie":
    "Répartition par Domaine & Catégorie",
  "admin.providerOverviewDashboard.changementsRecents": "Changements Récents",

  // --- admin.providerRoutingManager ---
  "admin.providerRoutingManager.gestionnaireDeRoutagePrioritesSecours":
    "Gestionnaire de Routage, Priorités & Secours (Failover)",
  "admin.providerRoutingManager.configurezLesPrestatairesPrimairesEt":
    "Configurez les prestataires primaires et leurs mécanismes de bascule automatique en cas d'indisponibilité.",

  // --- admin.taxonomyAttributeRegistryTab ---
  "admin.taxonomyAttributeRegistryTab.moteurRecherche": "Moteur recherche",
  "admin.taxonomyAttributeRegistryTab.utilisePar": "Utilisé par",
  "admin.taxonomyAttributeRegistryTab.editer": "Éditer",

  // --- admin.taxonomyAuditTab ---
  "admin.taxonomyAuditTab.historiqueChronologiqueDeToutesLes":
    "Historique chronologique de toutes les créations, modifications, déplacements et dépréciations de rubriques.",
  "admin.taxonomyAuditTab.aucunEvenementDAuditTrouve":
    "Aucun événement d'audit trouvé.",

  // --- admin.taxonomyDraftPublishTab ---
  "admin.taxonomyDraftPublishTab.annulerLesModifications":
    "Annuler les modifications",
  "admin.taxonomyDraftPublishTab.publierLesModifications":
    "Publier les modifications",
  "admin.taxonomyDraftPublishTab.publicationBloqueeDesAnomaliesCritiques":
    "Publication bloquée : des anomalies critiques ont été détectées. Veuillez consulter l'onglet",

  // --- admin.taxonomyHierarchyTree ---
  "admin.taxonomyHierarchyTree.deprecie": "Déprécié",
  "admin.taxonomyHierarchyTree.modifiezVotreRechercheOuReinitialisez":
    "Modifiez votre recherche ou réinitialisez les critères.",

  // --- admin.taxonomyImportExportTab ---
  "admin.taxonomyImportExportTab.generezUnExportCompletEt":
    "Générez un export complet et structuré comprenant l'arborescence, les attributs, les surcharges de marchés et les capacités.",
  "admin.taxonomyImportExportTab.telechargerLExportJson":
    "Télécharger l'export JSON",
  "admin.taxonomyImportExportTab.collezLeSchemaJsonA":
    "Collez le schéma JSON à importer. Le moteur effectue une validation syntaxique et structurelle avant d'appliquer les changements.",
  "admin.taxonomyImportExportTab.reinitialiserSurLeBaselineCanonique":
    "Réinitialiser sur le baseline canonique",

  // --- admin.taxonomyNodeEditor ---
  "admin.taxonomyNodeEditor.deplacer": "Déplacer",
  "admin.taxonomyNodeEditor.deprecier2": "Déprécier",
  "admin.taxonomyNodeEditor.hierarchie": "Hiérarchie :",
  "admin.taxonomyNodeEditor.apercuDuRenduVisuel": "Aperçu du rendu visuel :",
  "admin.taxonomyNodeEditor.iconeVectorielle": "Icône vectorielle :",
  "admin.taxonomyNodeEditor.amelioreLesResultatsDuMoteur":
    "Améliore les résultats du moteur de recherche",
  "admin.taxonomyNodeEditor.cycleDeViePublication":
    "Cycle de vie & Publication",
  "admin.taxonomyNodeEditor.zoneDeDanger": "Zone de danger",
  "admin.taxonomyNodeEditor.laSuppressionEstDefinitiveEt":
    "La suppression est définitive et affecte toutes les annonces rattachées à cette rubrique. Préférez",
  "admin.taxonomyNodeEditor.supprimerCeNUd": "Supprimer ce nœud",
  "admin.taxonomyNodeEditor.reglesAutomatiquesDeLaTaxonomie":
    "(règles automatiques de la taxonomie)",
  "admin.taxonomyNodeEditor.aucunAttributHeriteDesCategories":
    "Aucun attribut hérité des catégories parentes.",
  "admin.taxonomyNodeEditor.herite": "Hérité",
  "admin.taxonomyNodeEditor.cesAttributsEnrichissentLeFormulaire":
    "Ces attributs enrichissent le formulaire de publication spécifiquement pour ce nœud.",
  "admin.taxonomyNodeEditor.aucunAttributLocalAssigneChoisissez":
    "Aucun attribut local assigné. Choisissez un attribut dans le registre central ci-dessus.",
  "admin.taxonomyNodeEditor.facettesDeFiltresDeriveesPour":
    "Facettes de filtres dérivées pour la page Recherche",
  "admin.taxonomyNodeEditor.laTaxonomieDefinitL": "La taxonomie définit l'",
  "admin.taxonomyNodeEditor.modesDeTransactionAutorises":
    "Modes de Transaction Autorisés",
  "admin.taxonomyNodeEditor.modesDeLivraisonRemiseEligibles":
    "Modes de Livraison & Remise Éligibles",
  "admin.taxonomyNodeEditor.laFrance": "La France (",
  "admin.taxonomyNodeEditor.apercuGoogleSearch": "Aperçu Google Search :",
  "admin.taxonomyNodeEditor.rapportDImpactRetrocompatibilite":
    "Rapport d'Impact & Rétrocompatibilité",

  // --- admin.taxonomyTreeToolbar ---
  "admin.taxonomyTreeToolbar.ajouterUneCategorie": "Ajouter une catégorie",
  "admin.taxonomyTreeToolbar.deplierTout": "Déplier tout",
  "admin.taxonomyTreeToolbar.replierTout": "Replier tout",

  // --- admin.taxonomyValidationTab ---
  "admin.taxonomyValidationTab.controleAutomatiqueDeStructureUnicite":
    "Contrôle automatique de structure, unicité des IDs et slugs, cohérence des capacités et attributs.",

  // --- admin.attributeEditModal ---
  "admin.attributeEditModal.ajouterUneOption": "Ajouter une option",
  "admin.attributeEditModal.aucuneOptionDefinieCliquezSur":
    'Aucune option définie. Cliquez sur "Ajouter une option".',

  // --- admin.deleteNodeModal ---
  "admin.deleteNodeModal.pourEviterDInvaliderDes":
    "Pour éviter d'invalider des annonces ou rompre des chemins SEO, il est fortement recommandé de",
  "admin.deleteNodeModal.aucuneAnnonceActiveNiSous":
    "Aucune annonce active ni sous-catégorie dépendante n'a été détectée. L'entité sera retirée du référentiel canonique.",
  "admin.deleteNodeModal.deprecierALaPlace": "Déprécier à la place",

  // --- admin.moveNodeModal ---
  "admin.moveNodeModal.lesCapacitesEtAttributsHerites":
    "Les capacités et attributs hérités seront réévalués selon le nouveau parent.",

  // --- auth.forgotPasswordPage ---
  "auth.forgotPasswordPage.environnementDeDemonstrationCliquezCi":
    "Environnement de démonstration — Cliquez ci-dessous pour procéder immédiatement à la réinitialisation :",
  "auth.forgotPasswordPage.accederAuFormulaireDeNouveau":
    "Accéder au formulaire de nouveau mot de passe",
  "auth.forgotPasswordPage.adresseEmailDeVotreCompte":
    "Adresse email de votre compte",
  "auth.forgotPasswordPage.envoyerLeLienDeReinitialisation":
    "Envoyer le lien de réinitialisation",
  "auth.forgotPasswordPage.jetonDeValidationToken":
    "Jeton de validation (Token)",
  "auth.forgotPasswordPage.confirmerLeNouveauMotDe":
    "Confirmer le nouveau mot de passe",
  "auth.forgotPasswordPage.mettreAJourMonMot": "Mettre à jour mon mot de passe",
  "auth.forgotPasswordPage.renvoyerUnNouvelEmail": "← Renvoyer un nouvel email",

  // --- auth.loginPage ---
  "auth.loginPage.codeDeSecurite2faOu":
    "Code de sécurité 2FA ou Code de secours",
  "auth.loginPage.pourLeTestVousPouvez":
    "Pour le test : vous pouvez utiliser le code",
  "auth.loginPage.validerEtContinuer": "Valider et continuer",
  "auth.loginPage.retourALEcranDe": "← Retour à l'écran de connexion",
  "auth.loginPage.motDePasse": "Mot de passe",
  "auth.loginPage.motDePasseOublie": "Mot de passe oublié ?",
  "auth.loginPage.connexionRapideDemo": "Connexion rapide Démo",
  "auth.loginPage.1ClicSansMotDe": "1-clic sans mot de passe",

  // --- auth.registerPages ---
  "auth.registerPages.creerVotreCompteShongre": "Créer votre compte Shongre",
  "auth.registerPages.rejoignezLaCommunauteDeCommerce":
    "Rejoignez la communauté de commerce circulaire sécurisé en France et en Europe.",
  "auth.registerPages.1SelectionnezVotreProfilD":
    "1. Sélectionnez votre profil d'activité",
  "auth.registerPages.nomEtPrenomOuPseudonyme": "Nom et prénom ou pseudonyme",
  "auth.registerPages.conditionsGeneralesDUtilisation":
    "Conditions Générales d'Utilisation",
  "auth.registerPages.politiqueDeConfidentialite":
    "Politique de Confidentialité",
  "auth.registerPages.jeSouhaiteRecevoirParEmail":
    "Je souhaite recevoir par email les bons plans, offres exclusives et actualités de la communauté (facultatif).",
  "auth.registerPages.creerMonCompteParticulier":
    "Créer mon compte Particulier",
  "auth.registerPages.ouvrirUnCompteProfessionnel":
    "Ouvrir un compte Professionnel",
  "auth.registerPages.accedezALaVitrineOfficielle":
    "Accédez à la vitrine officielle, au badge Pro Vérifié et à la facturation TVA automatisée.",
  "auth.registerPages.nomEtPrenomDuResponsable":
    "Nom et prénom du responsable / contact",
  "auth.registerPages.telephoneCommercial": "Téléphone commercial",
  "auth.registerPages.continuerVersLesInformationsEntreprise": "Continuer",
  "auth.registerPages.adresseDuSiegeSocialMagasin":
    "Adresse du siège social / magasin",
  "auth.registerPages.conditionsGeneralesDeVenteProfessionnelles":
    "Conditions Générales de Vente Professionnelles",

  // --- auth.verifyEmailPage ---
  "auth.verifyEmailPage.emailValideAvecSucces": "Email validé avec succès !",
  "auth.verifyEmailPage.votreCompteEstDesormaisSecurise":
    'Votre compte est désormais sécurisé et votre badge "Email Vérifié" est actif sur votre profil.',
  "auth.verifyEmailPage.accederAMonEspace": "Accéder à mon espace",
  "auth.verifyEmailPage.tokenDemo": "Token démo :",
  "auth.verifyEmailPage.jetonDeValidationOuCode":
    "Jeton de validation ou Code de vérification",

  // --- auth.accountTypeSelector ---
  "auth.accountTypeSelector.pourAcheterEnTouteSecurite":
    "Pour acheter en toute sécurité et vendre vos objets du quotidien sans frais d'inscription.",
  "auth.accountTypeSelector.pourLesEntreprisesArtisansBoutiques":
    "Pour les entreprises, artisans, boutiques et commerçants immatriculés.",

  // --- auth.mFAModal ---
  "auth.mFAModal.activerLaDoubleAuthentification2fa":
    "Activer la double authentification (2FA)",
  "auth.mFAModal.protegezVotreCompteEtVos":
    "Protégez votre compte et vos transactions avec une application d'authentification standard (Google Authenticator, Microsoft Authenticator, 1Password, etc.).",
  "auth.mFAModal.1ScannezCeQrCode":
    "1. Scannez ce QR Code avec votre application d'authentification",
  "auth.mFAModal.ouSaisissezLaCleManuellement":
    "Ou saisissez la clé manuellement :",
  "auth.mFAModal.2CodesDeSecoursA": "2. Codes de secours à usage unique",
  "auth.mFAModal.conservezCesCodesDansUn":
    "Conservez ces codes dans un endroit sûr. Ils vous permettront de vous reconnecter si vous perdez l'accès à votre téléphone.",
  "auth.mFAModal.3EntrezLeCodeA":
    "3. Entrez le code à 6 chiffres généré par votre application",
  "auth.mFAModal.verifierEtActiverLe2fa": "Vérifier et activer le 2FA",
  "auth.mFAModal.codeLength": "Saisissez le code à {count} chiffres.",
  "auth.mFAModal.activationError":
    "L’activation de la double authentification a échoué.",
  "auth.mFAModal.qrCodeAlt":
    "Code QR de configuration de la double authentification",
  "auth.mFAModal.copied": "Copiés",
  "auth.mFAModal.copyBackupCodes": "Copier les {count} codes",

  // --- auth.phoneVerificationModal ---
  "auth.phoneVerificationModal.verificationDuNumeroDeTelephone":
    "Vérification du numéro de téléphone",
  "auth.phoneVerificationModal.laVerificationTelephoniqueProtegeLes":
    "La vérification téléphonique protège les acheteurs et vendeurs lors des remises en main propre et renforce la confiance.",
  "auth.phoneVerificationModal.paysEtIndicatif": "Pays et indicatif",
  "auth.phoneVerificationModal.phoneNumber": "Numéro de téléphone",
  "auth.phoneVerificationModal.recevoirMonCodeParSms":
    "Recevoir mon code par SMS",
  "auth.phoneVerificationModal.saisissezLeCodeRecuPar":
    "Saisissez le code reçu par SMS (6 chiffres)",
  "auth.phoneVerificationModal.confirmerLeNumero": "Confirmer le numéro",
  "auth.phoneVerificationModal.changerDeNumero": "Changer de numéro",
  "auth.phoneVerificationModal.phoneRequired":
    "Renseignez votre numéro de téléphone.",
  "auth.phoneVerificationModal.sendError": "L’envoi du code par SMS a échoué.",
  "auth.phoneVerificationModal.codeLength":
    "Saisissez le code à {count} chiffres.",
  "auth.phoneVerificationModal.validateError":
    "La validation du code a échoué.",
  "auth.phoneVerificationModal.resendSuccess":
    "Un nouveau code a été envoyé par SMS.",
  "auth.phoneVerificationModal.demoCode": "Code SMS de test : {code}",
  "auth.phoneVerificationModal.resendCountdown": "Renvoyer ({count} s)",
  "auth.phoneVerificationModal.resend": "Renvoyer le code",

  // --- auth.upgradeToProModal ---
  "auth.upgradeToProModal.passerEnCompteProfessionnel":
    "Passer en compte Professionnel",
  "auth.upgradeToProModal.conservezToutesVosAnnoncesAvis":
    "Conservez toutes vos annonces, avis et messages existants tout en débloquant la vitrine personnalisée, le badge Pro Vérifié et les fonctionnalités de facturation.",
  "auth.upgradeToProModal.numeroDeTvaIntracommunautaire":
    "Numéro de TVA Intracommunautaire",
  "auth.upgradeToProModal.telephoneProfessionnel": "Téléphone professionnel",
  "auth.upgradeToProModal.adresseDuSiegeSocialBoutique":
    "Adresse du siège social / boutique",
  "auth.upgradeToProModal.confirmerLaMiseANiveau": "Confirmer la mise à niveau",

  // --- categories.categoriesPage ---
  "categories.categoriesPage.toutesNosCategories": "Toutes nos catégories",
  "categories.categoriesPage.explorezLEnsembleDesCategories":
    "Explorez l’ensemble des catégories et sous-catégories de Shongre. Trouvez les annonces qui vous intéressent près de chez vous ou dans votre marché.",
  "categories.categoriesPage.affichageDe": "Affichage de",
  "categories.categoriesPage.afficherToutesLesCategories":
    "Afficher toutes les catégories",
  "categories.categoriesPage.univers": "{count} univers",
  "categories.categoriesPage.univers_one": "{count} univers",
  "categories.categoriesPage.univers_other": "{count} univers",
  "categories.categoriesPage.rubriques": "{count} rubriques",
  "categories.categoriesPage.rubriques_one": "{count} rubrique",
  "categories.categoriesPage.rubriques_other": "{count} rubriques",
  "categories.categoriesPage.rubriquesSupplementaires": "+{count}",
  "categories.categoriesPage.explorerLaCategorie": "Explorer {category}",
  "categories.categoriesPage.pourLaRecherche": "pour « {query} »",
  "categories.categoriesPage.aucuneCategorieNeCorrespond":
    "Aucune catégorie ne correspond à « {query} ».",

  // --- collections.collectionsPage ---
  "collections.collectionsPage.toutesNosCollections": "Toutes nos collections",
  "collections.collectionsPage.decouvrezDesUniversThematiquesPenses":
    "Découvrez des univers thématiques pensés pour vous inspirer : bons plans, mobilier vintage, tech reconditionnée, mobilité douce, rentrée et créateurs de nos régions.",
  "collections.collectionsPage.voirToutesLesCollections":
    "Voir toutes les collections",
  "collections.collectionsPage.aucuneAnnonceNeCorrespondAux":
    "Aucune annonce ne correspond aux filtres actifs dans cette collection.",
  "collections.collectionsPage.reinitialiserLesFiltres":
    "Réinitialiser les filtres",

  // --- errors.notFoundPage ---
  "errors.notFoundPage.laPageQueVousRecherchez":
    "La page que vous recherchez n'existe pas ou a été déplacée.",
  "errors.notFoundPage.retourALAccueil": "Retour à l'accueil",
  "errors.notFoundPage.rechercherUneAnnonce": "Rechercher une annonce",

  // --- favorites.favoritesPage ---
  "favorites.favoritesPage.retrouvezLesAnnoncesQueVous":
    "Retrouvez les annonces que vous avez sauvegardées",
  "favorites.favoritesPage.viderLesFavoris": "Vider les favoris",
  "favorites.favoritesPage.annoncesSauvegardees": "Annonces sauvegardées",
  "favorites.favoritesPage.explorerLesAnnonces": "Explorer les annonces",

  // --- home.homePage ---
  "home.homePage.trouvezLaPerleRare": "Trouvez la perle rare,",
  "home.homePage.sansTracas": "sans tracas.",
  "home.homePage.achetezEtVendezEnToute":
    "Achetez et vendez avec un paiement suivi, des options de remise claires et des statuts vendeur explicites.",
  "home.homePage.garantiesShongre": "Garanties Shongre",
  "home.homePage.paiementsSecurises": "Paiements sécurisés",
  "home.homePage.livraisonIntegree": "Remise et expédition claires",
  "home.homePage.vendeursVerifies": "Statuts vendeur explicites",
  "home.homePage.trustSummary":
    "Paiement suivi · Remise claire · Statuts vendeur explicites",
  "home.homePage.annoncesRecentes": "Annonces récentes",
  "home.homePage.lesDernieresOffresPublieesPres":
    "Les dernières offres publiées près de chez vous",
  "home.homePage.reprendreOuVousEnEtiez": "Reprendre où vous en étiez",
  "home.homePage.meilleuresOffres": "Meilleures offres",
  "home.homePage.lesAnnoncesQueVousAvez":
    "Les annonces que vous avez consultées récemment",
  "home.homePage.desReductionsJusquA50":
    "Des réductions jusqu'à -50% sur des articles récents et vérifiés",
  "home.homePage.desProfessionnelsVerifiesAvecCatalogue":
    "Des professionnels vérifiés, avec catalogue et garanties",
  "home.homePage.vousEtesCommercantArtisanOu":
    "Vous êtes commerçant, artisan ou concessionnaire ?",
  "home.homePage.ouvrezVotreVitrineOfficielleEn":
    "Ouvrez votre vitrine officielle en quelques clics, bénéficiez du badge Pro certifié, de statistiques de rentabilité et importez vos catalogues en masse.",
  "home.homePage.decouvrirLesForfaitsPro": "Découvrir les forfaits Pro",
  "home.homePage.creerMonComptePro": "Créer mon compte Pro",
  "home.homepageTrending.viewAllListings": "Voir toutes les annonces",
  "home.discovery.tabsLabel": "Sélections d’annonces",
  "home.homepageTrending.emptyTitle": "Aucune tendance disponible",
  "home.homepageTrending.emptyDescription":
    "Ce marché ne dispose pas encore d’assez d’annonces actives pour proposer des tendances utiles.",
  "home.homepageTrending.browseCategories": "Parcourir les catégories",
  "home.homepageTrending.errorTitle": "Tendances temporairement indisponibles",
  "home.homepageTrending.errorDescription":
    "Les autres sections restent accessibles. Vous pouvez réessayer ce chargement.",
  "home.homepageDeals.viewAll": "Voir toutes les offres",
  "home.homepageDeals.errorTitle": "Offres temporairement indisponibles",
  "home.homepageDeals.errorDescription":
    "Impossible de charger les offres actives de ce marché pour le moment.",
  "home.homepageDeals.emptyTitle": "Aucune offre active",
  "home.homepageDeals.emptyDescription":
    "L’aperçu administrateur affiche cet état, mais la section reste masquée publiquement.",
  "home.homepageRecent.emptyTitle":
    "Aucune annonce sur le marché {market} pour l’instant",

  // --- home.heroBoostedScroll ---
  "home.heroBoostedScroll.carouselLabel": "Annonces vedettes",
  "home.heroBoostedScroll.previous": "Annonce précédente",
  "home.heroBoostedScroll.next": "Annonce suivante",
  "home.heroBoostedScroll.pause": "Mettre le carrousel en pause",
  "home.heroBoostedScroll.play": "Relancer le carrousel",
  "home.heroBoostedScroll.annoncesControlees": "Annonces contrôlées",
  "home.heroBoostedScroll.securiteFiabiliteEtQualiteAssurees":
    "Sécurité, fiabilité et qualité assurées.",
  "home.heroBoostedScroll.enSavoirPlus": "En savoir plus",
  "home.heroBoostedScroll.livraison": "Livraison",

  // --- home.homeCollectionsSection ---
  "home.homeCollectionsSection.nosCollectionsDuMoment":
    "Explorer par collection",
  "home.homeCollectionsSection.desSelectionsThematiquesPrepareesPour":
    "Des sélections thématiques préparées pour dénicher des pépites uniques, durables et vérifiées.",

  // --- legal.legalPages ---
  "legal.legalPages.offresVerifieesAPrixReduits":
    "Offres vérifiées à prix réduits",
  "legal.legalPages.articlesDontLePrixA":
    "Articles dont le prix a été baissé récemment par leur vendeur",
  "legal.legalPages.annoncesEnPromotion": "Annonces en promotion",
  "legal.legalPages.paginationLabel": "Pagination des annonces en promotion",
  "legal.legalPages.previousPage": "Précédent",
  "legal.legalPages.nextPage": "Suivant",
  "legal.legalPages.pageStatus": "Page {current} sur {total}",

  // --- listings.listingDetailPage ---
  "listings.listingDetailPage.explorerLesAnnoncesSimilaires":
    "Explorer les annonces similaires",
  "listings.listingDetailPage.retourALAccueil": "Retour à l'accueil",
  "listings.listingDetailPage.aLaUne": "À la une",
  "listings.listingDetailPage.signalerOuDemanderDeL":
    "Signaler ou demander de l'aide sur cette annonce",
  "listings.listingDetailPage.prixDeLArticle": "Prix de l'article",
  "listings.listingDetailPage.protectionAcheteurIncluseCalculeeAu":
    "Protection Acheteur incluse, calculée au paiement",
  "listings.listingDetailPage.modifierMonAnnonce": "Modifier mon annonce",
  "listings.listingDetailPage.gererMesAnnoncesStats": "Gérer mes annonces",
  "listings.listingDetailPage.reserverLArticle": "Réserver l'article",
  "listings.listingDetailPage.offreDePrix": "Offre de prix",
  "listings.listingDetailPage.offreDePrixCourt": "Offre",
  "listings.listingDetailPage.message": "Message",
  "listings.listingDetailPage.selectionDArticlesRecommandesSelon":
    "Sélection d'articles recommandés selon vos critères",
  "listings.listingDetailPage.envoyerLeMessage": "Envoyer le message",
  "listings.listingDetailPage.envoyerLeSignalement": "Envoyer le signalement",
  "listings.listingDetailPage.reserver": "Réserver",

  // --- listings.listingFulfillmentSummary ---
  "listings.listingFulfillmentSummary.remiseExpedition": "Remise & Expédition",
  "listings.listingFulfillmentSummary.choixDefinitifALaCommande":
    "Choix définitif à la commande",
  "listings.listingFulfillmentSummary.livraisonEnColisAvecSuivi":
    "Livraison en colis avec suivi",
  "listings.listingFulfillmentSummary.mondialRelayPointRelaisLocker":
    "Transporteur convenu avec le vendeur et numéro de suivi renseigné dans la commande",
  "listings.listingFulfillmentSummary.aPartirDe399": "Selon les modalités",
  "listings.listingFulfillmentSummary.transportDeMeublesGrosColis":
    "Transport de meubles & Gros colis",
  "listings.listingFulfillmentSummary.livraisonParTransporteurSpecialiseCocolis":
    "Transporteur spécialisé convenu avec le vendeur avant expédition",
  "listings.listingFulfillmentSummary.surDevisTransport": "Sur devis transport",
  "listings.listingFulfillmentSummary.retraitDirectDansLeMagasin":
    "Retrait direct dans le magasin du vendeur Pro",

  // --- listings.listingSafetyNotice ---
  "listings.listingSafetyNotice.sequestreGaranti":
    "Paiement géré par le prestataire",
  "listings.listingSafetyNotice.paiementChiffre3dSecure":
    "Paiement chiffré 3D-Secure",

  // --- listings.listingSellerTrustSection ---
  "listings.listingSellerTrustSection.aProposDuVendeur": "À propos du vendeur",

  // --- messaging.messagingPage ---
  "messaging.messagingPage.vosEchangesAvecLesAcheteurs":
    "Vos échanges avec les acheteurs et les vendeurs apparaîtront ici, avec le paiement sécurisé et le suivi de commande.",
  "messaging.messagingPage.parcourirLesAnnonces": "Parcourir les annonces",
  "messaging.messagingPage.choisissezUneConversationDansLa":
    "Choisissez une conversation dans la liste de gauche pour échanger avec vos acheteurs et vendeurs en toute sécurité.",
  "messaging.messagingPage.etesVousSurDeVouloir":
    "Êtes-vous sûr de vouloir bloquer cet utilisateur ? Vous pourrez le débloquer à tout moment depuis les options de la conversation.",
  "messaging.messagingPage.confirmerLeBlocage": "Confirmer le blocage",
  "messaging.messagingPage.votreSignalementSeraExamineEn":
    "Votre signalement sera examiné en priorité par notre équipe de modération. En cas d'urgence ou de tentative d'escroquerie, nous prendrons des mesures immédiates.",
  "messaging.messagingPage.envoyerLeSignalement": "Envoyer le signalement",
  "messaging.messagingPage.pieceJointeEnPleinEcran":
    "Pièce jointe en plein écran",

  // --- messaging.conversationContextBar ---
  "messaging.conversationContextBar.suiviDeCommande": "Suivi de commande",
  "messaging.conversationContextBar.faireUneOffre": "Faire une offre",
  "messaging.conversationContextBar.fixerRendezVous": "Fixer rendez-vous",

  // --- messaging.conversationHeader ---
  "messaging.conversationHeader.simulerReponse": "Simuler réponse",

  // --- messaging.messageTimeline ---
  "messaging.messageTimeline.posezVosQuestionsAuVendeur":
    "Posez vos questions au vendeur ou convenez d'un point de rencontre.",
  "messaging.messageTimeline.reessayer": "Réessayer",

  // --- messaging.pickupSchedulerModal ---
  "messaging.pickupSchedulerModal.confirmerLeRendezVous":
    "Confirmer le rendez-vous",

  // --- newsletter.newsletterConfirmPage ---
  "newsletter.newsletterConfirmPage.abonnementConfirme":
    "Abonnement confirmé !",
  "newsletter.newsletterConfirmPage.vousRecevrezChaqueSemaineLes":
    "Vous recevrez chaque semaine les meilleures pépites et bons plans. Vous pouvez modifier vos préférences ou vous désabonner à tout moment.",
  "newsletter.newsletterConfirmPage.explorerLesAnnonces":
    "Explorer les annonces",
  "newsletter.newsletterConfirmPage.gererMesThematiques":
    "Gérer mes thématiques",

  // --- newsletter.newsletterLandingPage ---
  "newsletter.newsletterLandingPage.neManquezPlusAucunePepite":
    "Ne manquez plus aucune pépite ni bonne affaire",
  "newsletter.newsletterLandingPage.chaqueSemaineRecevezDansVotre":
    "Chaque semaine, recevez dans votre boîte mail une sélection d'articles uniques, les baisses de prix vérifiées et des conseils pour acheter et vendre en toute confiance.",
  "newsletter.newsletterLandingPage.ceQueVousTrouverezDans":
    "Ce que vous trouverez dans nos éditions",
  "newsletter.newsletterLandingPage.vousGardezLeControleTotal":
    "Vous gardez le contrôle total sur vos préférences et pouvez vous désabonner en 1 clic.",

  // --- newsletter.newsletterPreferencesPage ---
  "newsletter.newsletterPreferencesPage.newsletterPreferencesMarketing":
    "Newsletter & Préférences Marketing",
  "newsletter.newsletterPreferencesPage.gerezVosAbonnementsAuxSelections":
    "Gérez vos abonnements aux sélections hebdomadaires, bons plans et actualités Shongre.",
  "newsletter.newsletterPreferencesPage.seDesabonner": "Se désabonner",
  "newsletter.newsletterPreferencesPage.seReabonner": "Se réabonner",
  "newsletter.newsletterPreferencesPage.cochezLesThematiquesQuiVous":
    "Cochez les thématiques qui vous intéressent pour personnaliser vos prochaines éditions.",
  "newsletter.newsletterPreferencesPage.communicationsObligatoiresDeService":
    "Communications obligatoires de service",
  "newsletter.newsletterPreferencesPage.memeSiVousEtesDesabonne":
    "Même si vous êtes désabonné de la newsletter, vous continuerez à recevoir les emails essentiels relatifs à la sécurité de votre compte, à vos paiements et au suivi de vos commandes.",

  // --- newsletter.newsletterUnsubscribePage ---
  "newsletter.newsletterUnsubscribePage.desabonnementNewsletter":
    "Désabonnement Newsletter",
  "newsletter.newsletterUnsubscribePage.vousPouvezVousDesabonnerEn":
    "Vous pouvez vous désabonner en 1 clic de l'ensemble de nos sélections et bons plans.",
  "newsletter.newsletterUnsubscribePage.desabonnementPrisEnCompte":
    "Désabonnement pris en compte",
  "newsletter.newsletterUnsubscribePage.vousContinuerezARecevoirLes":
    "Vous continuerez à recevoir les notifications nécessaires relatives à la sécurité de votre compte et à vos transactions en cours.",
  "newsletter.newsletterUnsubscribePage.jeMeSuisTrompeMe":
    "Je me suis trompé, me réabonner",
  "newsletter.newsletterUnsubscribePage.retourALAccueil": "Retour à l'accueil",

  // --- newsletter.newsletterPreviewModal ---
  "newsletter.newsletterPreviewModal.laSelectionDeLaSemaine":
    "La sélection de la semaine",
  "newsletter.newsletterPreviewModal.fermerLApercu": "Fermer l'aperçu",

  // --- newsletter.newsletterSignup ---
  "newsletter.newsletterSignup.vousRecevrezNosSelectionsEt":
    "Vous recevrez nos sélections et bons plans. Vous pourrez vous désabonner en 1 clic à tout moment.",
  "newsletter.newsletterSignup.recevezNosMeilleuresPepitesBons":
    "Recevez nos meilleures pépites & bons plans",
  "newsletter.newsletterSignup.chaqueSemaineUneSelectionExclusive":
    "Chaque semaine, une sélection exclusive d'annonces vérifiées, de baisses de prix et de conseils pour vos achats et ventes.",
  "newsletter.newsletterSignup.jAccepteDeRecevoirLa":
    "J'accepte de recevoir la newsletter Shongre. Désinscription possible à tout moment en 1 clic.",

  // --- notifications.notificationPreferencesPage ---
  "notifications.notificationPreferencesPage.preferencesDeNotifications":
    "Préférences de notifications",
  "notifications.notificationPreferencesPage.choisissezPrecisementLesAlertesQue":
    "Choisissez précisément les alertes que vous souhaitez recevoir sur chaque canal.",

  // --- notifications.notificationsPage ---
  "notifications.notificationsPage.misesAJourEnDirect":
    "Mises à jour en direct concernant vos annonces, messages, commandes et sécurité.",
  "notifications.notificationsPage.toutMarquerCommeLu": "Tout marquer comme lu",
  "notifications.notificationsPage.preferences": "Préférences",
  "notifications.notificationsPage.vosAlertesConcernantLesBaisses":
    "Vos alertes concernant les baisses de prix, rendez-vous et messages s'afficheront ici.",

  // --- notifications.notificationDemoToolbar ---
  "notifications.notificationDemoToolbar.cliquezSurUnScenarioPour":
    "Cliquez sur un scénario pour injecter instantanément une notification réelle et tester l'affichage, les badges et les liens profonds.",

  // --- notifications.notificationPanel ---
  "notifications.notificationPanel.vosAlertesMessagesEtTransactions":
    "Vos alertes, messages et transactions apparaîtront ici.",

  // --- pro.proDirectoryPage ---
  "pro.proDirectoryPage.trouvezDesCommercantsEtArtisans":
    "Trouvez des commerçants et artisans de confiance",
  "pro.proDirectoryPage.toutesLesEntreprisesReferenceesPossedent":
    "Toutes les entreprises référencées possèdent un numéro SIRET vérifié et proposent des garanties professionnelles.",

  // --- profile.sellerPublicPage ---
  "profile.sellerPublicPage.lUtilisateurOuLaBoutique":
    "L'utilisateur ou la boutique demandée n'existe pas ou le lien est erroné.",
  "profile.sellerPublicPage.retourALAccueil": "Retour à l'accueil",
  "profile.sellerPublicPage.rechercherDesAnnonces": "Rechercher des annonces",
  "profile.sellerPublicPage.ceCompteVendeurAEte":
    "Ce compte vendeur a été restreint ou suspendu par nos équipes de modération pour des raisons de conformité et de sécurité. Ses annonces ne sont plus visibles.",
  "profile.sellerPublicPage.retournerAuxAnnonces": "Retourner aux annonces",

  // --- profile.proBusinessInfo ---
  "profile.proBusinessInfo.mentionsLegalesInformationsEntreprise":
    "Mentions légales & Informations entreprise",
  "profile.proBusinessInfo.venteExclusiveEnLigneAvec":
    "Vente exclusive en ligne avec expédition sécurisée.",
  "profile.proBusinessInfo.zonesDeLivraisonCouvertes":
    "Zones de livraison couvertes :",
  "profile.proBusinessInfo.servicesInclusParCeVendeur":
    "Services inclus par ce vendeur pro :",

  // --- profile.sellerCatalog ---
  "profile.sellerCatalog.publierUnePremiereAnnonce":
    "Publier une première annonce",
  "profile.sellerCatalog.explorerLesAnnoncesDuMarche":
    "Explorer les annonces du marché",
  "profile.sellerCatalog.effacerLesPrix": "Effacer les prix",
  "profile.sellerCatalog.sousCategories": "Sous-catégories :",
  "profile.sellerCatalog.reinitialiserLesFiltres2": "Réinitialiser les filtres",
  "profile.sellerCatalog.catalogueDuVendeur": "Catalogue du vendeur",

  // --- profile.sellerProfileHeader ---
  "profile.sellerProfileHeader.verifie": "Vérifié",
  "profile.sellerProfileHeader.gererMesAnnonces": "Gérer mes annonces",
  "profile.sellerProfileHeader.partagerCeProfil2": "Partager ce profil",
  "profile.sellerProfileHeader.signalerCeProfil": "Signaler ce profil",

  // --- profile.sellerReportModal ---
  "profile.sellerReportModal.motifPrincipalDuSignalement":
    "Motif principal du signalement :",
  "profile.sellerReportModal.detailsComplementairesFacultatifMaisRecommande":
    "Détails complémentaires (facultatif mais recommandé) :",
  "profile.sellerReportModal.envoyerLeSignalement": "Envoyer le signalement",

  // --- profile.sellerReviewsTab ---
  "profile.sellerReviewsTab.avisCertifiesSuiteAUne":
    "Avis certifiés suite à une transaction réalisée sur Shongre.",
  "profile.sellerReviewsTab.affichageDesAvisAvecLa":
    "Affichage des avis avec la note de",
  "profile.sellerReviewsTab.afficherTousLesAvis": "Afficher tous les avis",
  "profile.sellerReviewsTab.achatVerifie": "Achat vérifié",

  // --- profile.sellerTrustIndicators ---
  "profile.sellerTrustIndicators.garantiesSignauxDeConfiance":
    "Garanties & Signaux de confiance",
  "profile.sellerTrustIndicators.remiseEnMainPropreOu":
    "Remise en main propre ou envoi avec numéro de suivi",

  // --- onboarding preparation ---
  "onboarding.preparation.loading": "Préparation de votre brouillon…",
  "onboarding.preparation.autosave":
    "Votre progression sera enregistrée automatiquement.",
  "onboarding.preparation.resumeReady":
    "Votre brouillon est prêt à être repris.",
  "onboarding.preparation.back": "Revoir la préparation",
  "onboarding.preparation.account.eyebrow": "Votre compte",
  "onboarding.preparation.account.title":
    "Avant de choisir votre type de compte",
  "onboarding.preparation.account.description":
    "Quelques repères suffisent pour choisir le parcours adapté à votre usage de Shongre.",
  "onboarding.preparation.account.checklistTitle": "À prendre en compte",
  "onboarding.preparation.account.usageTitle": "Votre usage principal",
  "onboarding.preparation.account.usageDescription":
    "Choisissez Particulier pour un usage personnel, ou Professionnel pour vendre au nom d’une activité.",
  "onboarding.preparation.account.businessTitle":
    "Vos informations professionnelles",
  "onboarding.preparation.account.businessDescription":
    "Si vous choisissez Professionnel, préparez le nom et les coordonnées de votre organisation.",
  "onboarding.preparation.account.contactTitle": "Vos coordonnées",
  "onboarding.preparation.account.contactDescription":
    "Une adresse e-mail et un numéro de téléphone pourront être demandés progressivement.",
  "onboarding.preparation.account.start": "Choisir mon type de compte",
  "onboarding.preparation.account.duration": "Moins d’une minute",
  "onboarding.preparation.account.status":
    "La vérification complète ne sera demandée que lorsqu’elle sera nécessaire.",
  "onboarding.preparation.invoicing.eyebrow": "Shongre Facturation",
  "onboarding.preparation.invoicing.title": "Avant de configurer Facturation",
  "onboarding.preparation.invoicing.description":
    "Préparez les informations utiles pour créer des factures cohérentes avec votre organisation et votre marché.",
  "onboarding.preparation.invoicing.checklistTitle": "À garder sous la main",
  "onboarding.preparation.invoicing.entityTitle": "Votre entité légale",
  "onboarding.preparation.invoicing.entityDescription":
    "Prévoyez la raison sociale, l’adresse, le pays et les identifiants applicables.",
  "onboarding.preparation.invoicing.billingTitle": "Vos règles de facturation",
  "onboarding.preparation.invoicing.billingDescription":
    "Rassemblez les coordonnées de facturation, la devise et les mentions nécessaires.",
  "onboarding.preparation.invoicing.teamTitle": "Votre équipe",
  "onboarding.preparation.invoicing.teamDescription":
    "Identifiez les personnes autorisées à créer, valider ou consulter les factures.",
  "onboarding.preparation.invoicing.start": "Configurer mon espace",
  "onboarding.preparation.invoicing.resume": "Continuer la configuration",
  "onboarding.preparation.invoicing.duration": "Environ 4 minutes",
  "onboarding.preparation.invoicing.status":
    "Aucune annonce ni donnée marketplace n’est nécessaire.",
  "onboarding.preparation.auto.eyebrow": "Shongre Auto",
  "onboarding.preparation.auto.title": "Avant de publier votre véhicule",
  "onboarding.preparation.auto.description":
    "Préparez les informations qui permettent d’identifier, décrire et valoriser votre véhicule avec précision.",
  "onboarding.preparation.auto.checklistTitle": "À garder sous la main",
  "onboarding.preparation.auto.identityTitle": "Carte grise ou VIN",
  "onboarding.preparation.auto.identityDescription":
    "Utilisez les informations officielles pour la marque, le modèle et la première mise en circulation.",
  "onboarding.preparation.auto.historyTitle": "Historique et entretien",
  "onboarding.preparation.auto.historyDescription":
    "Notez le kilométrage, les entretiens réalisés, les réparations et les éventuels accidents.",
  "onboarding.preparation.auto.photosTitle": "Photos du véhicule",
  "onboarding.preparation.auto.photosDescription":
    "Prévoyez des vues extérieures, intérieures et des détails utiles, en bonne lumière.",
  "onboarding.preparation.auto.start": "Commencer l’annonce véhicule",
  "onboarding.preparation.auto.resume": "Reprendre l’annonce véhicule",
  "onboarding.preparation.auto.duration": "Environ 7 minutes",
  "onboarding.preparation.immo.eyebrow": "Shongre Immo",
  "onboarding.preparation.immo.title": "Avant de publier votre bien",
  "onboarding.preparation.immo.description":
    "Rassemblez les informations essentielles pour présenter le bien clairement et respecter les obligations de votre marché.",
  "onboarding.preparation.immo.checklistTitle": "À garder sous la main",
  "onboarding.preparation.immo.locationTitle": "Adresse et caractéristiques",
  "onboarding.preparation.immo.locationDescription":
    "Préparez la localisation, les surfaces, le nombre de pièces et les équipements du bien.",
  "onboarding.preparation.immo.legalTitle":
    "Diagnostics et informations légales",
  "onboarding.preparation.immo.legalDescription":
    "Gardez les classes DPE et GES ainsi que les informations de copropriété disponibles.",
  "onboarding.preparation.immo.photosTitle": "Photos et prix",
  "onboarding.preparation.immo.photosDescription":
    "Choisissez des photos lumineuses et définissez le prix, le loyer et les charges applicables.",
  "onboarding.preparation.immo.start": "Commencer l’annonce immobilière",
  "onboarding.preparation.immo.resume": "Reprendre l’annonce immobilière",
  "onboarding.preparation.immo.duration": "Environ 8 minutes",
  "onboarding.preparation.employment.eyebrow": "Shongre Emploi",
  "onboarding.preparation.employment.title": "Avant de rédiger votre offre",
  "onboarding.preparation.employment.description":
    "Préparez une offre précise, accessible et conforme pour aider les candidats à se projeter rapidement.",
  "onboarding.preparation.employment.checklistTitle": "À garder sous la main",
  "onboarding.preparation.employment.roleTitle": "Poste et contrat",
  "onboarding.preparation.employment.roleDescription":
    "Clarifiez l’intitulé, les missions, le type de contrat et les compétences réellement nécessaires.",
  "onboarding.preparation.employment.salaryTitle": "Rémunération et lieu",
  "onboarding.preparation.employment.salaryDescription":
    "Prévoyez la fourchette salariale, le lieu, le télétravail et la date de début souhaitée.",
  "onboarding.preparation.employment.applicationTitle":
    "Processus de candidature",
  "onboarding.preparation.employment.applicationDescription":
    "Définissez comment candidater, les étapes de recrutement et les questions utiles.",
  "onboarding.preparation.employment.start": "Commencer l’offre d’emploi",
  "onboarding.preparation.employment.resume": "Reprendre l’offre d’emploi",
  "onboarding.preparation.employment.duration": "Environ 6 minutes",
  "onboarding.preparation.education.eyebrow": "Shongre Éducation",
  "onboarding.preparation.education.title":
    "Avant de créer votre activité de cours",
  "onboarding.preparation.education.description":
    "Préparez les éléments qui aideront les élèves à comprendre votre expertise, votre méthode et vos disponibilités.",
  "onboarding.preparation.education.checklistTitle": "À garder sous la main",
  "onboarding.preparation.education.expertiseTitle": "Vos matières et niveaux",
  "onboarding.preparation.education.expertiseDescription":
    "Listez les matières enseignées, les niveaux accompagnés et votre expérience.",
  "onboarding.preparation.education.availabilityTitle":
    "Vos tarifs et créneaux",
  "onboarding.preparation.education.availabilityDescription":
    "Prévoyez votre tarif horaire, vos créneaux habituels et les formats proposés.",
  "onboarding.preparation.education.presentationTitle":
    "Une présentation claire",
  "onboarding.preparation.education.presentationDescription":
    "Résumez votre approche pédagogique et ce que les élèves peuvent attendre de vos cours.",
  "onboarding.preparation.education.start": "Préparer mon profil enseignant",
  "onboarding.preparation.education.resume": "Reprendre mon profil enseignant",
  "onboarding.preparation.education.duration": "Environ 5 minutes",

  // --- publishing.publishWizard ---
  "publishing.preparation.title": "Avant de commencer",
  "publishing.preparation.description":
    "Préparez ces quelques éléments pour créer une annonce claire et complète. Vous pourrez tout vérifier avant la publication.",
  "publishing.preparation.checklistTitle": "À garder sous la main",
  "publishing.preparation.photosTitle": "Des photos nettes",
  "publishing.preparation.photosDescription":
    "Photographiez l’article sous plusieurs angles, dans un endroit bien éclairé.",
  "publishing.preparation.detailsTitle": "Les détails utiles",
  "publishing.preparation.detailsDescription":
    "Notez la marque, le modèle, les dimensions, l’état et les éventuels défauts.",
  "publishing.preparation.handoverTitle": "Votre prix et la remise",
  "publishing.preparation.handoverDescription":
    "Prévoyez votre prix, la localisation et vos préférences de livraison ou de remise en main propre.",
  "publishing.preparation.start": "Commencer mon annonce",
  "publishing.preparation.resume": "Reprendre mon annonce",
  "publishing.preparation.duration": "Environ 5 minutes",
  "publishing.preparation.loadingDraft": "Chargement de votre brouillon…",
  "publishing.preparation.savedDraftReady":
    "Votre brouillon existant est prêt à être repris.",
  "publishing.preparation.autosave":
    "Votre brouillon sera sauvegardé automatiquement.",
  "publishing.preparation.skipNextTime":
    "Ne plus afficher cette préparation sur cet appareil",
  "publishing.publishWizard.votreAnnonce": "Votre annonce",
  "publishing.publishWizard.deposerUneAnnonceSurShongre":
    "Déposer une annonce sur Shongre",
  "publishing.publishWizard.queSouhaitezVousPublier":
    "Que souhaitez-vous publier ?",
  "publishing.publishWizard.selectionnezLIntentionEtLa":
    "Sélectionnez l'intention et la catégorie exacte dans la taxonomie Shongre.",
  "publishing.publishWizard.typeDAnnonceIntention":
    "Type d'annonce (Intention)",
  "publishing.publishWizard.intentHelp":
    "Choisissez d’abord l’objectif de votre annonce. Les catégories et règles proposées s’adapteront à ce choix.",
  "publishing.publishWizard.categoryTitle": "Dans quelle catégorie ?",
  "publishing.publishWizard.categoryHelp":
    "Parcourez chaque niveau disponible. Les caractéristiques apparaîtront dès que le chemin est suffisamment précis.",
  "publishing.publishWizard.taxonomyLoading":
    "Chargement des catégories disponibles…",
  "publishing.publishWizard.taxonomyEmpty":
    "Aucune catégorie publiable n’est disponible pour ce marché et ce profil.",
  "publishing.publishWizard.taxonomyError":
    "Les catégories n’ont pas pu être chargées. Votre brouillon est conservé.",
  "publishing.publishWizard.marketUnavailable":
    "Ce marché ne permet pas encore de créer une annonce.",
  "publishing.publishWizard.categoryLevel": "Niveau {count}",
  "publishing.publishWizard.chooseCategoryLevel":
    "Choisir une catégorie au niveau {count}",
  "publishing.publishWizard.categoryPathConfirmed":
    "Chemin de catégorie validé",
  "publishing.publishWizard.continueCategoryPath":
    "Choisissez le niveau suivant pour préciser votre annonce.",
  "publishing.publishWizard.automaticUpdate_one":
    "Une réponse incompatible a été retirée après votre modification.",
  "publishing.publishWizard.automaticUpdate_other":
    "{count} réponses incompatibles ont été retirées après votre modification.",
  "publishing.publishWizard.dynamicFieldsLoading":
    "Chargement des caractéristiques de cette annonce…",
  "publishing.publishWizard.dynamicFieldsError":
    "Le formulaire de cette catégorie est indisponible. Votre brouillon est conservé.",
  "publishing.publishWizard.dynamicFieldsEmpty":
    "Cette catégorie ne demande aucune caractéristique supplémentaire.",
  "publishing.publishWizard.fieldLoading": "Chargement de {label}…",
  "publishing.publishWizard.fieldLoadError":
    "Le champ {label} n’a pas pu être chargé.",
  "publishing.publishWizard.fieldNoOptions":
    "Aucune option disponible pour {label}.",
  "publishing.publishWizard.secureUploadHint":
    "Ce document utilise le flux de téléversement privé sécurisé.",
  "publishing.publishWizard.dateStart": "Date de début",
  "publishing.publishWizard.dateEnd": "Date de fin",
  "publishing.publishWizard.requiredDynamicField":
    "Ce champ obligatoire doit être renseigné.",
  "publishing.publishWizard.invalidDynamicField":
    "Cette réponse n’est plus compatible avec vos choix.",
  "publishing.publishWizard.rechercherUneCategorieOuUn":
    "Rechercher une catégorie ou un type de bien",
  "publishing.publishWizard.ouParcourezLesUnivers": "Ou parcourez les univers",
  "publishing.publishWizard.etatDuBienProduit": "État du bien / produit",
  "publishing.publishWizard.photosDeVotreAnnonce": "Photos de votre annonce",
  "publishing.publishWizard.lesAnnoncesAvecAuMoins":
    "Les annonces avec au moins 3 photos génèrent 5x plus de contacts. La première photo sert de couverture.",
  "publishing.publishWizard.titreDescriptionDetaillee":
    "Titre & Description détaillée",
  "publishing.publishWizard.redigezUnTitreClairOu":
    "Rédigez un titre clair ou utilisez l'assistant IA Gemini.",
  "publishing.publishWizard.assistantIaRedactionGemini":
    "Assistant IA Rédaction Gemini",
  "publishing.publishWizard.generezUneDescriptionOptimiseePour":
    "Générez une description optimisée pour le SEO et le taux de conversion",
  "publishing.publishWizard.genererAvecLIa": "Générer avec l'IA",
  "publishing.publishWizard.prixDeVenteStock": "Prix de vente & Stock",
  "publishing.publishWizard.commentSouhaitezVousVendre":
    "Comment souhaitez-vous vendre ?",
  "publishing.publishWizard.activezLesOptionsDeTransaction":
    "Activez les options de transaction autorisées pour cette catégorie.",
  "publishing.publishWizard.lesAcheteursPeuventVousPoser":
    "Les acheteurs peuvent vous poser des questions via la messagerie Shongre.",
  "publishing.publishWizard.sequestreGaranti": "Paiement via prestataire",
  "publishing.publishWizard.lAcheteurPeutPayerImmediatement":
    "L'acheteur peut payer par carte bancaire. Le versement dépend de l’activation de votre compte et du statut de la commande.",
  "publishing.publishWizard.permetALAcheteurDe":
    "Permet à l'acheteur de bloquer l'article pendant le temps de convenir d'un rendez-vous.",
  "publishing.publishWizard.modesDeRemiseExpedition":
    "Modes de remise & Expédition",
  "publishing.publishWizard.determinezCommentLesAcheteursPeuvent":
    "Déterminez comment les acheteurs peuvent récupérer l'article.",
  "publishing.publishWizard.gratuitAvecValidationParCode":
    "Gratuit, avec validation par code secret PIN à 6 chiffres lors du rendez-vous.",
  "publishing.publishWizard.etiquettePrepayeeGenereeAutomatiquementL":
    "Étiquette prépayée générée automatiquement. L'acheteur règle les frais de port.",
  "publishing.publishWizard.gabaritDuColisPoidsEstime":
    "Gabarit du colis (Poids estimé)",
  "publishing.publishWizard.idealPourCanapesTablesElectromenager":
    "Idéal pour canapés, tables, électroménager lourd avec transporteur spécialisé.",
  "publishing.publishWizard.localisationDuBien": "Localisation du bien",
  "publishing.publishWizard.parRespectPourVotreVie":
    "Par respect pour votre vie privée, seule la ville et le code postal sont affichés publiquement.",
  "publishing.publishWizard.marchesEtPaysDeDiffusion":
    "Marchés et pays de diffusion",
  "publishing.publishWizard.diffusezVotreAnnonceSimultanementSur":
    "Diffusez votre annonce simultanément sur plusieurs marchés Shongre pour maximiser sa visibilité.",
  "publishing.publishWizard.tousLesMarches": "Tous les marchés",
  "publishing.publishWizard.marcheDOriginePrincipal":
    "Marché d'origine (Principal)",
  "publishing.publishWizard.categorieEligible": "✓ Catégorie éligible",
  "publishing.publishWizard.categorieRestreinte": "✕ Catégorie restreinte",
  "publishing.publishWizard.livraison": "Livraison",
  "publishing.publishWizard.sequestre": "Paiement",
  "publishing.publishWizard.toutesLesTransactionsMultiMarches":
    "La disponibilité du paiement, la devise et les règles applicables dépendent de chaque marché. Les conditions exactes sont affichées avant la publication et le paiement.",
  "publishing.publishWizard.optionsDeVisibiliteBoostFacultatif":
    "Options de visibilité & Boost (Facultatif)",
  "publishing.publishWizard.multipliezVosVuesEnPositionnant":
    "Multipliez vos vues en positionnant votre annonce en tête des résultats sur tous vos marchés sélectionnés.",
  "publishing.publishWizard.paidOptionsUnavailable":
    "Les options payantes sont temporairement indisponibles. La publication standard gratuite reste disponible.",
  "publishing.publishWizard.standardIncludes":
    "Inclut {photos} photos, la messagerie et la gestion de l'annonce pendant {days} jours.",
  "publishing.publishWizard.free": "Gratuit",
  "publishing.publishWizard.loadingOptionalOffers":
    "Chargement des options facultatives…",
  "publishing.publishWizard.recapitulatifDeVotreAnnonce":
    "Récapitulatif de votre annonce",
  "publishing.publishWizard.relisezVotreAnnonceVousPourrez":
    "Relisez votre annonce. Vous pourrez la modifier à tout moment après publication.",
  "publishing.publishWizard.apercuDansLesResultatsDe":
    "Aperçu dans les résultats de recherche",
  "publishing.publishWizard.precedent": "Précédent",
  "publishing.publishWizard.publierMonAnnonceMaintenant":
    "Publier mon annonce maintenant",

  // --- savedsearches.savedSearchesPage ---
  "savedsearches.savedSearchesPage.recevezDesAlertesInstantaneesDes":
    "Recevez des alertes instantanées dès qu'une nouvelle annonce correspond à vos critères",
  "savedsearches.savedSearchesPage.voirLesAnnonces": "Voir les annonces",
  "savedsearches.savedSearchesPage.lancerUneRecherche": "Lancer une recherche",

  // --- search.exploreMapView ---
  "search.exploreMapView.touteLaFrance": "Toute la France",
  "search.exploreMapView.verifie": "Vérifié",
  "search.exploreMapView.voirLAnnonce": "Voir l'annonce",

  // --- search.searchPage ---
  "search.searchPage.livraisonDisponible2": "Livraison disponible",
  "search.searchPage.effacerTout": "Effacer tout",
  "search.searchPage.categories2": "Catégories",
  "search.searchPage.sousCategorie": "Sous-catégorie",
  "search.searchPage.typeDeVendeur": "Type de vendeur",
  "search.searchPage.filtresSpecifiques": "Filtres spécifiques",
  "search.searchPage.categorie": "Catégorie",
  "search.searchPage.criteresSpecifiques": "Critères spécifiques",

  // --- sellerworkspace.accountOverviewPage ---
  "sellerworkspace.accountOverviewPage.gerezVosAnnoncesVosVentes":
    "Gérez vos annonces, vos ventes, vos messages et vos favoris en toute simplicité.",
  "sellerworkspace.accountOverviewPage.deposerUneAnnonce":
    "Déposer une annonce",
  "sellerworkspace.accountOverviewPage.niveauxDeSecuriteVerificationsDu":
    "Niveaux de sécurité",
  "sellerworkspace.accountOverviewPage.centreDeVerificationKycKyb":
    "(KYC / KYB / IBAN) →",
  "sellerworkspace.accountOverviewPage.nonVerifie": "Non vérifié",
  "sellerworkspace.accountOverviewPage.desactive": "Désactivé",
  "sellerworkspace.accountOverviewPage.protectionRenforceeGoogleMicrosoftAuth":
    "Protection renforcée Google/Microsoft Auth",
  "sellerworkspace.accountOverviewPage.coordonneesInformationsDuProfil":
    "Coordonnées & Informations du profil",
  "sellerworkspace.accountOverviewPage.visiblesSurVosAnnoncesEt":
    "Visibles sur vos annonces et lors des remises en main propre",
  "sellerworkspace.accountOverviewPage.nomEtPrenomPseudonyme":
    "Nom et prénom / Pseudonyme",
  "sellerworkspace.accountOverviewPage.numeroDeTelephone2":
    "Numéro de téléphone",
  "sellerworkspace.accountOverviewPage.biographiePresentation":
    "Biographie / Présentation",
  "sellerworkspace.accountOverviewPage.enregistrerLesModifications":
    "Enregistrer les modifications",
  "sellerworkspace.accountOverviewPage.toutesMesAnnonces":
    "Toutes mes annonces →",
  "sellerworkspace.accountOverviewPage.vousNAvezPasEncore":
    "Vous n'avez pas encore publié d'annonce.",
  "sellerworkspace.accountOverviewPage.passezALaVitesseSuperieure":
    "Passez à la vitesse supérieure",
  "sellerworkspace.accountOverviewPage.vousVendezRegulierementEnTant":
    "Vous vendez régulièrement en tant que professionnel ?",
  "sellerworkspace.accountOverviewPage.profitezDUneBoutiqueDediee":
    "Profitez d'une boutique dédiée avec votre logo, du badge Pro vérifié et de remises sur les boosts.",
  "sellerworkspace.accountOverviewPage.passerEnComptePro":
    "Passer en Compte Pro",

  // --- sellerworkspace.myListingsPage ---
  "sellerworkspace.myListingsPage.gestionDeMesAnnonces":
    "Gestion de mes annonces",
  "sellerworkspace.myListingsPage.suivezLesVuesActivezDes":
    "Suivez les vues, activez des boosts de visibilité et gérez vos stocks",
  "sellerworkspace.myListingsPage.deposerUneAnnonce": "Déposer une annonce",
  "sellerworkspace.myListingsPage.choisissezUneOptionDeVisibilite":
    "Choisissez une option de visibilité pour accélérer votre vente :",
  "sellerworkspace.myListingsPage.selectionnezLesPaysEuropeensDans":
    "Sélectionnez les pays européens dans lesquels votre annonce sera visible et achetable :",
  "sellerworkspace.myListingsPage.enregistrerLesMarches":
    "Enregistrer les marchés",

  // --- sellerworkspace.proDashboardPage ---
  "sellerworkspace.proDashboardPage.tableauDeBordVendeurPro":
    "Tableau de bord Vendeur Pro",
  "sellerworkspace.proDashboardPage.suiviDesPerformancesDeVotre":
    "Suivi des performances de votre catalogue commercial et conversion clients",
  "sellerworkspace.proDashboardPage.facturesRecus": "Factures & Reçus",
  "sellerworkspace.proDashboardPage.evolutionDeLAudience7":
    "Évolution de l'audience (7 derniers jours)",
  "sellerworkspace.proDashboardPage.articlesPharesDeVotreBoutique":
    "Articles phares de votre boutique",

  // --- sellerworkspace.proPlansPage ---
  "sellerworkspace.proPlansPage.developpezVosVentesAvecNos":
    "Développez vos ventes avec nos forfaits sur mesure",
  "sellerworkspace.proPlansPage.sansEngagementActivezVotreVitrine":
    "Sans engagement. Activez votre vitrine personnalisée, importez votre inventaire en masse et bénéficiez de remises exclusives sur les options de visibilité.",
  "sellerworkspace.proPlansPage.lePlusPopulaire": "Le plus populaire",
  "sellerworkspace.proPlansPage.optionsDeMiseEnAvant":
    "Options de mise en avant à la carte",
  "sellerworkspace.proPlansPage.aActiverSurNImporte":
    "À activer sur n'importe quelle annonce pour accélérer la vente",

  // --- sellerworkspace.proStorefrontEditorPage ---
  "sellerworkspace.proStorefrontEditorPage.cesInformationsSontAfficheesSur":
    "Ces informations sont affichées sur votre page boutique officielle et sur chacune de vos annonces.",
  "sellerworkspace.proStorefrontEditorPage.banniereLogoDeLaBoutique":
    "Bannière & Logo de la boutique",
  "sellerworkspace.proStorefrontEditorPage.enregistrerLesModifications":
    "Enregistrer les modifications",

  // --- sellerworkspace.billingHistoryModal ---
  "sellerworkspace.billingHistoryModal.payee": "Payée",
  "sellerworkspace.billingHistoryModal.recu": "Reçu",
  "sellerworkspace.billingHistoryModal.aucuneFactureNeCorrespondA":
    "Aucune facture ne correspond à ce filtre.",

  // --- sellerworkspace.bulkImportModal ---
  "sellerworkspace.bulkImportModal.modeleCsvVierge": "Modèle CSV vierge",
  "sellerworkspace.bulkImportModal.chargerUnExemple4Articles":
    "Charger un exemple (4 articles)",
  "sellerworkspace.bulkImportModal.parcourirUnFichierCsv":
    "Parcourir un fichier CSV...",
  "sellerworkspace.bulkImportModal.utilisezNotreModeleAvecSeparateur":
    "Utilisez notre modèle avec séparateur point-virgule (;) contenant colonnes Titre, Catégorie, Prix, État et Stock.",
  "sellerworkspace.bulkImportModal.csvDownloaded":
    "Le modèle CSV a été téléchargé.",
  "sellerworkspace.bulkImportModal.csvParseError":
    "Impossible d'analyser ce fichier CSV.",
  "sellerworkspace.bulkImportModal.importSuccess":
    "{count} annonce(s) importée(s) et publiée(s) avec succès.",
  "sellerworkspace.bulkImportModal.importError":
    "Erreur lors de l'import des annonces.",
  "sellerworkspace.bulkImportModal.validationTitleRequired":
    "Titre obligatoire",
  "sellerworkspace.bulkImportModal.validationTitleTooShort":
    "Titre trop court (5 caractères minimum)",
  "sellerworkspace.bulkImportModal.validationPriceInvalid": "Prix invalide",
  "sellerworkspace.bulkImportModal.rowsDetected":
    "{total} lignes détectées ({valid} valides)",
  "sellerworkspace.bulkImportModal.invalidRows": "{count} ligne(s) invalide(s)",
  "sellerworkspace.bulkImportModal.quantity": "Qté : {count}",
  "sellerworkspace.bulkImportModal.valid": "Valide",
  "sellerworkspace.bulkImportModal.cancel": "Annuler",
  "sellerworkspace.bulkImportModal.importAndPublish":
    "Importer et publier {count} annonce(s)",

  // --- support.contactPage ---
  "support.contactPage.votreDemandeABienEte":
    "Votre demande a bien été enregistrée par notre équipe de support client Shongre.",
  "support.contactPage.numeroDeDossier": "Numéro de dossier",
  "support.contactPage.retourALAccueil": "Retour à l'accueil",
  "support.contactPage.envoyerUneAutreDemande": "Envoyer une autre demande",
  "support.contactPage.contacterLeSupportShongre":
    "Contacter le support Shongre",
  "support.contactPage.selectionnezLeMotifDeVotre":
    "Sélectionnez le motif de votre demande pour être orienté vers le service compétent.",
  "support.contactPage.1QuelEstLeSujet":
    "1. Quel est le sujet de votre demande ?",
  "support.contactPage.2PrecisezVotreSituation": "2. Précisez votre situation",
  "support.contactPage.besoinDOuvrirUnLitige":
    "Besoin d'ouvrir un litige sur une commande en cours ?",
  "support.contactPage.pourGelerLesFondsSous":
    "Pour signaler une non-réception ou un article non conforme, ouvrez un litige depuis la transaction. Un remboursement éventuel dépendra de l’examen du dossier, du statut du paiement et des conditions applicables.",
  "support.contactPage.accederAMesAchatsPour":
    "Accéder à mes achats pour ouvrir le litige",
  "support.contactPage.leSupportShongreNIntervient":
    "Le support Shongre n'intervient pas pour les questions sur l'article (disponibilité, négociations de prix). Contactez directement le vendeur via la messagerie sécurisée.",
  "support.contactPage.ouvrirLaMessagerie": "Ouvrir la messagerie",
  "support.contactPage.piecesJointesOuCapturesD":
    "Pièces jointes ou captures d'écran (facultatif)",
  "support.contactPage.ajouterUneCaptureOuUn":
    "Ajouter une capture ou un justificatif (Simulation démo)",

  // --- support.helpCenterPage ---
  "support.helpCenterPage.commentPouvonsNousVousAider":
    "Comment pouvons-nous vous aider ?",
  "support.helpCenterPage.retrouvezLesReponsesAuxQuestions":
    "Retrouvez les réponses aux questions fréquentes sur le paiement, la livraison, la publication et votre compte.",
  "support.helpCenterPage.aucunArticleNeCorrespondA":
    "Aucun article ne correspond à votre recherche. Vous pouvez contacter notre équipe ci-dessous.",
  "support.helpCenterPage.notreEquipeDeSupportClient":
    "Consultez le centre d’aide ou ouvrez une demande pour vos commandes, annonces et questions. Les délais dépendent des horaires de support affichés.",

  // --- support.supportRequestDetailPage ---
  "support.supportRequestDetailPage.retourAMesDemandes2":
    "Retour à mes demandes",
  "support.supportRequestDetailPage.ouvrirUneNouvelleDemande":
    "ouvrir une nouvelle demande",
  "support.supportRequestDetailPage.repondreANotreEquipe":
    "Répondre à notre équipe",

  // --- support.supportRequestsPage ---
  "support.supportRequestsPage.suivezLEtatDeVos":
    "Suivez l'état de vos dossiers et échangez directement avec le service client Shongre.",
  "support.supportRequestsPage.siVousRencontrezUneDifficulte":
    "Si vous rencontrez une difficulté avec une transaction, une annonce ou votre compte, notre équipe est à votre disposition.",
  "support.supportRequestsPage.contacterLeSupport": "Contacter le support",

  // --- support.supportContextCard ---
  "support.supportContextCard.annonceLiee": "Annonce liée",
  "support.supportContextCard.commandeSequestreLie": "Commande / Paiement lié",

  // --- transactions.directPurchaseCheckoutModal ---
  "transactions.directPurchaseCheckoutModal.selectionnezParmiLesOptionsReellement":
    "Sélectionnez parmi les options réellement disponibles pour cet article.",
  "transactions.directPurchaseCheckoutModal.fondsConservesSousSequestreBancaire":
    "Paiement traité par le prestataire et suivi dans le statut de la commande.",
  "transactions.directPurchaseCheckoutModal.paiementEnLigneTemporairementIndisponible":
    "Paiement en ligne temporairement indisponible",
  "transactions.directPurchaseCheckoutModal.leSystemeDeSequestreEn":
    "Le paiement en ligne est momentanément indisponible sur ce marché. Vous pouvez contacter le vendeur pour organiser une remise en main propre.",
  "transactions.directPurchaseCheckoutModal.referenceCommande":
    "Référence commande :",
  "transactions.directPurchaseCheckoutModal.communiquezCeCodeAuVendeur":
    "Communiquez ce code au vendeur lors du rendez-vous uniquement après avoir vérifié le produit.",

  // --- transactions.transactionsPage ---
  "transactions.transactionsPage.transactionsReservationsSequestre":
    "Transactions, réservations et paiements",
  "transactions.transactionsPage.gerezVosReservationsVosRemises":
    "Gérez vos réservations, vos remises en main propre et le suivi des paiements",
  "transactions.transactionsPage.gererLeDossier": "Gérer le dossier",

  // --- transactions.disputeModal ---
  "transactions.disputeModal.enOuvrantCeDossierAucun":
    "En ouvrant ce dossier, aucun versement ne sera exécuté tant que la situation n'est pas clarifiée entre les deux parties ou arbitrée par nos équipes.",
  "transactions.disputeModal.motifPrincipalDuLitige":
    "Motif principal du litige",
  "transactions.disputeModal.descriptionDetailleeDesFaits":
    "Description détaillée des faits",

  // --- transactions.leaveReviewModal ---
  "transactions.leaveReviewModal.ceQueVousAvezParticulierement":
    "Ce que vous avez particulièrement apprécié :",
  "transactions.leaveReviewModal.commentaireDetailleFacultatif":
    "Commentaire détaillé (facultatif)",

  // --- transactions.reservationCheckoutModal ---
  "transactions.reservationCheckoutModal.detailsCouts": "Détails & Coûts",
  "transactions.reservationCheckoutModal.paiementSequestre":
    "Paiement en ligne",
  "transactions.reservationCheckoutModal.rendezVousDirectAvecValidation":
    "Rendez-vous direct avec validation par code secret à 6 chiffres.",
  "transactions.reservationCheckoutModal.retraitChezUnCommercantPartenaire":
    "Retrait chez un commerçant partenaire avec suivi en temps réel (3-4 jours).",
  "transactions.reservationCheckoutModal.directementDansVotreBoiteAux":
    "Directement dans votre boîte aux lettres ou avec signature (48h).",
  "transactions.reservationCheckoutModal.continuerVersLeRecapitulatif":
    "Continuer vers le récapitulatif",
  "transactions.reservationCheckoutModal.lArgentNeSeraVerse":
    "Shongre demande le transfert vendeur après confirmation de la remise. Tout remboursement reste soumis au statut de la commande, à la confirmation du prestataire et aux conditions applicables.",
  "transactions.reservationCheckoutModal.passerAuPaiementSecurise":
    "Passer au paiement sécurisé",
  "transactions.reservationCheckoutModal.referenceDossier":
    "Référence dossier :",
  "transactions.reservationCheckoutModal.accederAuSuiviDeMa":
    "Accéder au suivi de ma réservation",

  // --- transactions.sellerPayoutModal ---
  "transactions.sellerPayoutModal.toutTransferer": "Tout transférer",

  // --- transactions.transactionDetailModal ---
  "transactions.transactionDetailModal.articleReserve": "Article réservé",
  "transactions.transactionDetailModal.refuserEtRembourser":
    "Refuser et rembourser",
  "transactions.transactionDetailModal.securiteMainPropre":
    "Sécurité main propre",
  "transactions.transactionDetailModal.donnezCeCodeSecretA":
    "Donnez ce code secret à 6 chiffres au vendeur lors du rendez-vous,",
  "transactions.transactionDetailModal.demandezALAcheteurSon":
    "Demandez à l'acheteur son code de confirmation à 6 chiffres lors de la remise pour débloquer immédiatement vos fonds :",
  "transactions.transactionDetailModal.validerLaRemise": "Valider la remise",
  "transactions.transactionDetailModal.renseignerLeNumeroDeSuivi":
    "Renseigner le numéro de suivi du colis :",
  "transactions.transactionDetailModal.siLeColisEstArrive":
    "Si le colis est arrivé et que l'objet est conforme à la description, validez la réception pour débloquer les fonds au vendeur.",
  "transactions.transactionDetailModal.jAiBienRecuL":
    "J'ai bien reçu l'article conforme",
  "transactions.transactionDetailModal.enregistrerLeRendezVous":
    "Enregistrer le rendez-vous",
  "transactions.transactionDetailModal.annulerMaReservation":
    "Annuler ma réservation",
  "transactions.transactionDetailModal.laisserUneEvaluation":
    "Laisser une évaluation",

  // --- verification.verificationCenterPage ---
  "verification.verificationCenterPage.verifie": "Vérifié",
  "verification.verificationCenterPage.refuse": "Refusé",
  "verification.verificationCenterPage.nonCommence": "Non commencé",
  "verification.verificationCenterPage.centreDeConfianceSecurite":
    "Centre de Confiance & Sécurité",
  "verification.verificationCenterPage.shongreUtiliseUnModeleDe":
    "Shongre utilise un modèle de confiance progressif. Validez vos étapes au fur et à mesure pour débloquer des plafonds plus élevés et rassurer la communauté.",
  "verification.verificationCenterPage.indiceDeConfiance":
    "Indice de Confiance",
  "verification.verificationCenterPage.modeDemonstrationSimulerUnProfil":
    "Mode Démonstration : Simuler un profil utilisateur",
  "verification.verificationCenterPage.checklistDesVerifications2":
    "Checklist des vérifications",
  "verification.verificationCenterPage.completezChaqueDimensionPourRenforcer":
    "Complétez chaque dimension pour renforcer la confiance des acheteurs et lever les limites de votre compte.",
  "verification.verificationCenterPage.debloquezChaquePalierPourAcceder":
    "Débloquez chaque palier pour accéder aux plafonds et fonctionnalités réservées.",
  "verification.verificationCenterPage.debloque": "Débloqué",
  "verification.verificationCenterPage.verrouille": "Verrouillé",
  "verification.verificationCenterPage.historiqueInalterableDesChangementsD":
    "Historique inaltérable des changements d'état et validations de conformité.",
  "verification.verificationCenterPage.aucuneActionEnregistreePourLe":
    "Aucune action enregistrée pour le moment.",

  // --- verification.bankPayoutModal ---
  "verification.bankPayoutModal.coordonneesBancairesDeVirement":
    "Coordonnées bancaires de virement",
  "verification.bankPayoutModal.sequestreSecuriseVirementsDeVentes":
    "Virements de ventes sécurisés",
  "verification.bankPayoutModal.nomDuTitulaireDuCompte":
    "Nom du titulaire du compte",
  "verification.bankPayoutModal.leNomDoitCorrespondreA":
    "Le nom doit correspondre à votre pièce d'identité ou à la raison sociale de votre entreprise.",
  "verification.bankPayoutModal.numeroIbanZoneSepa": "Numéro IBAN (Zone SEPA)",
  "verification.bankPayoutModal.etablissementBancaire":
    "Établissement bancaire",

  // --- verification.businessVerificationModal ---
  "verification.businessVerificationModal.verificationEntrepriseKybKbis":
    "Vérification Entreprise (KYB / KBIS)",
  "verification.businessVerificationModal.verifier": "Vérifier",
  "verification.businessVerificationModal.saisissezVotreSiretPourRemplir":
    "Saisissez votre SIRET pour remplir automatiquement les données officielles INSEE / SIRENE.",
  "verification.businessVerificationModal.adresseDuSiegeSocial":
    "Adresse du siège social",
  "verification.businessVerificationModal.representantLegal":
    "Représentant légal",
  "verification.businessVerificationModal.indiquezLIdentiteDuMandataire":
    "Indiquez l'identité du mandataire social ou du dirigeant habilité à engager l'entreprise sur Shongre.",
  "verification.businessVerificationModal.nomCompletDuRepresentantLegal":
    "Nom complet du représentant légal",
  "verification.businessVerificationModal.fonctionQualiteAuSeinDe":
    "Fonction / Qualité au sein de l'entreprise",
  "verification.businessVerificationModal.televersezLesDocumentsOfficielsAttestant":
    "Téléversez les documents officiels attestant de l'existence juridique et des coordonnées de paiement de votre structure.",
  "verification.businessVerificationModal.declarationDeConformite":
    "Déclaration de conformité",
  "verification.businessVerificationModal.declarationDesBeneficiairesEffectifsRbe":
    "Déclaration des Bénéficiaires Effectifs (RBE / LCB-FT)",
  "verification.businessVerificationModal.enApplicationDeLaDirective":
    "En application de la directive européenne anti-blanchiment et du Code Monétaire et Financier, je certifie que les informations d'immatriculation et les bénéficiaires effectifs déclarés sont sincères et conformes à la réalité.",
  "verification.businessVerificationModal.jeCertifieSurLHonneur":
    "Je certifie sur l'honneur l'exactitude des pièces fournies et accepte la vérification de conformité Shongre.",
  "verification.businessVerificationModal.validationInstantaneeParSimulationDu":
    "Validation instantanée par simulation du registre RCS",

  // --- verification.identityVerificationModal ---
  "verification.identityVerificationModal.verificationDIdentiteOfficielleKyc":
    "Vérification d'identité officielle (KYC)",
  "verification.identityVerificationModal.typeDePieceDIdentite":
    "Type de pièce d'identité officielle",
  "verification.identityVerificationModal.prenomS": "Prénom(s)",
  "verification.identityVerificationModal.nomDeFamille": "Nom de famille",
  "verification.identityVerificationModal.dateDeNaissance": "Date de naissance",
  "verification.identityVerificationModal.paysEmetteur": "Pays émetteur",
  "verification.identityVerificationModal.continuerVersLesDocuments":
    "Continuer vers les documents",
  "verification.identityVerificationModal.televersezUnePhotoNetteEt":
    "Téléversez une photo nette et non tronquée de votre document original. Les 4 coins doivent être visibles sans reflet.",
  "verification.identityVerificationModal.numeroDuDocumentFacultatifLu":
    "Numéro du document (facultatif / lu par OCR)",
  "verification.identityVerificationModal.verificationBiometrique":
    "Vérification biométrique",
  "verification.identityVerificationModal.unRapideControleDePresence":
    "Un rapide contrôle de présence vérifie que vous êtes bien le titulaire légitime de la pièce d'identité fournie.",
  "verification.identityVerificationModal.regardezLObjectifSansLunettes":
    "Regardez l'objectif sans lunettes de soleil ni couvre-chef.",
  "verification.identityVerificationModal.validationInstantaneeParSimulationOcr":
    "Validation instantanée par simulation OCR / Liveness",

  // --- security.requireAuth ---
  "security.requireAuth.cettePageEstReserveeAux":
    "Cette page est réservée aux membres inscrits sur Shongre. Connectez-vous ou créez un compte gratuitement en 1 minute.",
  "security.requireAuth.creerUnCompte": "Créer un compte",

  // --- security.requirePermission ---
  "security.requirePermission.vousDevezEtreConnectePour":
    "Vous devez être connecté pour accéder à cette section.",
  "security.requirePermission.creerUnCompte": "Créer un compte",
  "security.requirePermission.contacterLeSupportDeSecurite":
    "Contacter le support de sécurité",
  "security.requirePermission.decouvrirLesOffresPro":
    "Découvrir les offres Pro",
  "security.requirePermission.retourAMonCompte": "Retour à mon compte",
  "security.requirePermission.retourALAccueil": "Retour à l'accueil",

  // --- publishCta ---
  "publishCta.accountSuspended": "Compte suspendu",
  "publishCta.accountInactive": "Compte inactif",
  "publishCta.suspendedShort": "Suspendu",
  "publishCta.inactiveShort": "Inactif",
  "publishCta.postListing": "Déposer une annonce",
  "publishCta.postListingShort": "Déposer",
  "publishCta.postVehicle": "Publier un véhicule",
  "publishCta.postProperty": "Publier un bien",
  "publishCta.postJob": "Publier une offre",
  "publishCta.manageCourses": "Gérer les cours",
  "publishCta.manageShort": "Gérer",
  "publishCta.becomeSeller": "Devenir vendeur",
  "publishCta.becomeSellerShort": "Vendre",
  "publishCta.internalConsole": "Ouvrir la console interne",
  "publishCta.internalConsoleShort": "Console",

  // --- home.trust ---

  /* --- Page metadata ---------------------------------------------------
     Document title and meta description for each routed page. Kept in the
     catalogue like any other visible copy: the title is read aloud on every
     route change and is the label of the browser tab. */
  "meta.favorites.title": "Mes annonces favorites",
  "meta.favorites.description":
    "Retrouvez les annonces que vous avez mises de côté sur Shongre.",
  "meta.savedSearches.title": "Mes recherches sauvegardées",
  "meta.savedSearches.description":
    "Gérez vos recherches enregistrées et vos alertes Shongre.",
  "meta.messaging.title": "Messagerie",
  "meta.messaging.description":
    "Vos échanges avec les acheteurs et les vendeurs, offres et suivi de commande.",
  "meta.notifications.title": "Centre de notifications",
  "meta.notifications.description":
    "Alertes de recherche, baisses de prix et suivi de vos offres.",
  "meta.notificationPreferences.title": "Préférences de notifications",
  "meta.notificationPreferences.description":
    "Choisissez les alertes que vous recevez sur chaque canal.",
  "meta.transactions.title": "Transactions, réservations et paiements",
  "meta.transactions.description":
    "Suivez vos achats, vos ventes et la libération des fonds.",
  "meta.verificationCenter.title": "Sécurité & vérification du compte",
  "meta.verificationCenter.description":
    "Email, téléphone, identité, entreprise et coordonnées bancaires.",
  "meta.supportRequests.title": "Aide & assistance",
  "meta.supportRequests.description":
    "Vos demandes de support Shongre et leur avancement.",
  "meta.supportRequestDetail.title": "Détail de la demande de support",
  "meta.supportRequestDetail.description":
    "Suivi de votre échange avec le support Shongre.",
  "meta.accountOverview.title": "Mon compte",
  "meta.accountOverview.description":
    "Vue d'ensemble de votre compte, vérifications et coordonnées.",
  "meta.myListings.title": "Gestion de mes annonces",
  "meta.myListings.description":
    "Suivez les vues, activez des boosts de visibilité et gérez vos stocks.",
  "meta.proDashboard.title": "Tableau de bord vendeur Pro",
  "meta.proDashboard.description":
    "Performances de votre catalogue commercial et conversion clients.",
  "meta.proStorefrontEditor.title": "Personnaliser ma vitrine professionnelle",
  "meta.proStorefrontEditor.description":
    "Bannière, présentation et mise en avant de votre boutique Pro.",
  "meta.publishWizard.title": "Déposer une annonce",
  "meta.publishWizard.description":
    "Publiez une annonce sur Shongre en trois étapes : catégorie, description et remise.",
  "meta.newsletterPreferences.title": "Préférences newsletter",
  "meta.newsletterPreferences.description":
    "Gérez vos abonnements aux sélections et bons plans Shongre.",
  "meta.newsletterConfirm.title": "Confirmation d'abonnement",
  "meta.newsletterConfirm.description":
    "Confirmez votre inscription à la newsletter Shongre.",
  "meta.newsletterUnsubscribe.title": "Désabonnement newsletter",
  "meta.newsletterUnsubscribe.description":
    "Gérez ou arrêtez votre abonnement à la newsletter Shongre.",
  "meta.adminOverview.title": "Console d'administration",
  "meta.adminOverview.description":
    "Vue d'ensemble de la gouvernance plateforme.",
  "meta.adminModeration.title": "Modération & signalements",
  "meta.adminModeration.description":
    "File de modération des annonces et des signalements.",
  "meta.adminUsers.title": "Annuaire des utilisateurs & vérifications",
  "meta.adminUsers.description":
    "Administration des comptes particuliers, professionnels et internes.",
  "meta.adminVerifications.title": "Pôle de vérification & sécurité",
  "meta.adminVerifications.description":
    "Dossiers KYC, KYB et coordonnées bancaires en attente.",
  "meta.adminMarkets.title": "Gestion multi-marchés & territoires",
  "meta.adminMarkets.description":
    "Configuration des marchés, devises et locales.",
  "meta.adminTaxonomy.title": "Administration de la taxonomie",
  "meta.adminTaxonomy.description":
    "Catégories, sous-catégories et attributs de la place de marché.",
  "meta.adminMonetization.title": "Formules Pro, quotas & mise en avant",
  "meta.adminMonetization.description":
    "Configuration des forfaits professionnels et des options payantes.",
  "meta.adminRolesMatrix.title": "Matrice des rôles & permissions",
  "meta.adminRolesMatrix.description":
    "Référentiel des rôles plateforme et de leurs permissions.",
  "meta.adminAuditLogs.title": "Registre d'audit sécurité",
  "meta.adminAuditLogs.description":
    "Journal des actions sensibles réalisées sur la plateforme.",
  "meta.adminNewsletter.title": "Campagnes & newsletters",
  "meta.adminNewsletter.description":
    "Historique et préparation des campagnes marketing.",
  "meta.adminProviders.title": "Fournisseurs & intégrations externes",
  "meta.adminProviders.description":
    "Catalogue des intégrations, routage et secours.",
  "meta.adminProviderDetail.title": "Configuration d'un fournisseur",
  "meta.adminProviderDetail.description":
    "Clés d'accès, marchés, santé et journal d'audit du fournisseur.",
  "meta.crmOverview.title": "Tableau de bord CRM & pipeline",
  "meta.crmOverview.description":
    "Prospects, opportunités et tâches commerciales.",
  "meta.crmContacts.title": "Contacts & interlocuteurs",
  "meta.crmContacts.description":
    "Répertoire des contacts commerciaux Shongre.",
  "meta.crmContactDetail.title": "Fiche contact",
  "meta.crmContactDetail.description":
    "Historique et opportunités liés à ce contact.",
  "meta.crmCompanies.title": "Entreprises & vendeurs B2B",
  "meta.crmCompanies.description":
    "Répertoire des entreprises suivies par le commerce.",
  "meta.crmCompanyDetail.title": "Fiche entreprise",
  "meta.crmCompanyDetail.description":
    "Contacts, opportunités et activité de cette entreprise.",
  "meta.crmPipeline.title": "Pipeline des ventes & forfaits Pro",
  "meta.crmPipeline.description":
    "Suivi des négociations et des abonnements professionnels.",
  "meta.crmAiProspecting.title": "Shongre Prospects — CRM commercial",
  "meta.crmAiProspecting.description":
    "Découverte d’entreprises, qualification des opportunités et suivi commercial dans un seul espace.",
  "meta.crmTasks.title": "Tâches & relances commerciales",
  "meta.crmTasks.description": "Rappels, démos et relances planifiées.",

  /* --- Accessible names carrying their target ---------------------------
     Repeated icon controls (tree rows, kanban cards, log rows) previously had
     only a `title`, which is not surfaced on touch and repeated verbatim for
     every row. These name the row they act on. */
  "admin.taxonomyHierarchyTree.replierNode": "Replier {name}",
  "admin.taxonomyHierarchyTree.deplierNode": "Déplier {name}",
  "admin.taxonomyHierarchyTree.monterNode": "Monter {name} d'un rang",
  "admin.taxonomyHierarchyTree.descendreNode": "Descendre {name} d'un rang",
  "admin.taxonomyHierarchyTree.ajouterSousRubriqueNode":
    "Ajouter une sous-rubrique à {name}",
  "admin.crmPipelinePage.etapePrecedenteOpp":
    "Déplacer « {name} » à l'étape précédente",
  "admin.crmPipelinePage.etapeSuivanteOpp":
    "Déplacer « {name} » à l'étape suivante",
  "admin.adminAuditLogsPage.voirLePayloadDe":
    "Voir le détail de l’événement « {action} »",

  /* Accessible names for controls that previously had only a placeholder. */
  "messaging.messageComposer.votreMessage": "Votre message",
  "messaging.makeOfferModal.displayedPriceDescription":
    "Prix affiché : {price}. Le vendeur pourra accepter ou refuser votre proposition.",
  "messaging.makeOfferModal.cancel": "Annuler",
  "messaging.makeOfferModal.submitOffer": "Transmettre l'offre",
  "messaging.messagingPage.sendFailed": "Échec de l'envoi du message.",
  "messaging.messagingPage.offerSent":
    "Offre de {price} transmise au vendeur !",
  "messaging.messagingPage.offerAccepted": "Offre acceptée à {price} !",
  "messaging.messagingPage.offerAcceptedGeneric": "Offre acceptée !",
  "messaging.messagingPage.offerDeclined": "Offre déclinée.",
  "ui.priceRangeSlider.allPrices": "Tous les prix",
  "ui.priceRangeSlider.upTo": "Jusqu'à {price}",
  "ui.priceRangeSlider.from": "À partir de {price}",
  "ui.priceRangeSlider.minimumPrice": "Prix minimum",
  "ui.priceRangeSlider.maximumPrice": "Prix maximum",
  "ui.priceRangeSlider.noMinimum": "Aucun minimum",
  "ui.priceRangeSlider.noMaximum": "Aucun maximum",
  "search.searchPage.minimumShort": "min",
  "search.searchPage.maximumShort": "max",
  "search.searchPage.priceInCurrency": "Prix ({currency})",
  "search.searchPage.budgetInCurrency": "Budget ({currency})",
  "transactions.sellerPayoutModal.amountMustBePositive":
    "Veuillez saisir un montant supérieur à 0 {currency}.",
  "profile.sellerCatalog.prixMinimum": "Prix minimum en euros",
  "profile.sellerCatalog.prixMaximum": "Prix maximum en euros",
  "publishing.publishWizard.rechercherUneCategorie":
    "Rechercher une catégorie ou un type de bien",
  "admin.taxonomyNodeEditor.copierLIdStable":
    "Copier l'identifiant stable {id}",
  "messaging.conversationList.filtres": "filtres de conversations",
  "common.scrollRailLeft": "Faire défiler les {label} vers la gauche",
  "common.scrollRailRight": "Faire défiler les {label} vers la droite",
  "admin.crmPipelinePage.colonnesDuPipeline": "colonnes du pipeline",
  "messaging.conversationList.messagerie": "Messagerie",

  /* Counted, so French keeps 0 in the singular and other locales get their
     own few/many categories instead of a hand-rolled `> 1 ? 's' : ''`. */
  "admin.adminUsersPage.utilisateursTrouves_one": "{count} utilisateur trouvé",
  "admin.adminUsersPage.utilisateursTrouves_other":
    "{count} utilisateurs trouvés",
  "proDirectory.boutiquesDisponibles_one": "{count} boutique disponible",
  "proDirectory.boutiquesDisponibles_other": "{count} boutiques disponibles",
  "notifications.notificationPreferencesPage.canalPourAlerte":
    "{channel} — {alert}",
  "notifications.notificationPreferencesPage.canalApplication":
    "Sur l'application",
  "notifications.notificationPreferencesPage.canalEmail": "Par email",
  "notifications.notificationPreferencesPage.canalPush": "Sur mobile (push)",
  "common.removeFilter": "Retirer le filtre {name}",
  "admin.accountType.individual": "Compte particulier",
  "admin.accountType.professional": "Compte professionnel",
  "admin.accountType.internal": "Collaborateur interne",
  "admin.accountType.staff": "Collaborateur interne",
  "admin.staff.filterLabel": "Filtrer par statut Staff",
  "admin.staff.filterAll": "Tous les statuts Staff",
  "admin.staff.status.none": "Aucun accès Staff",
  "admin.staff.status.active": "Staff actif",
  "admin.staff.status.suspended": "Staff suspendu",
  "admin.staff.status.revoked": "Staff révoqué",
  "admin.staff.grantAction": "Accorder Staff",
  "admin.staff.manageAction": "Gérer Staff",
  "admin.staff.modalTitle": "Accès Staff sécurisé",
  "admin.staff.modalDescription":
    "Définissez l’accès employé de {name}. Le type de compte particulier ou professionnel reste inchangé.",
  "admin.staff.roleLabel": "Rôle Staff",
  "admin.staff.statusLabel": "Statut Staff",
  "admin.staff.reasonLabel": "Motif auditable",
  "admin.staff.reasonHint":
    "10 caractères minimum. N’incluez aucune donnée sensible ni aucun secret.",
  "admin.staff.reasonMinimum": "Saisissez un motif d’au moins 10 caractères.",
  "admin.staff.confirmAction": "Enregistrer l’accès Staff",
  "admin.staff.updateSuccess": "L’accès Staff a été mis à jour.",
  "admin.staff.updateError": "L’accès Staff n’a pas pu être mis à jour.",
  "identityBadge.staff.active": "Équipe Shongre",
  "identityBadge.staff.activeWithRole": "Équipe Shongre — {role}",
  "identityBadge.staff.activeAria": "Membre actif de l’équipe Shongre",
  "identityBadge.staff.activeAriaWithRole":
    "Membre actif de l’équipe Shongre — {role}",
  "identityBadge.staff.suspended": "Staff suspendu",
  "identityBadge.staff.revoked": "Staff révoqué",
  "identityBadge.verification.individual": "Identité vérifiée",
  "identityBadge.verification.professional": "Professionnel vérifié",
  "admin.capabilities.modalTitle": "Gérer les permissions de {name}",
  "admin.capabilities.description":
    "Consultez les permissions héritées et définissez uniquement les surcharges directes. Les permissions Staff restent inactives sans adhésion Staff active.",
  "admin.capabilities.loading": "Chargement des permissions…",
  "admin.capabilities.loadError": "Les permissions n’ont pas pu être chargées.",
  "admin.capabilities.empty": "Aucune permission canonique n’est disponible.",
  "admin.capabilities.searchLabel": "Rechercher une permission",
  "admin.capabilities.searchPlaceholder": "Nom, identifiant ou catégorie",
  "admin.capabilities.searchEmpty":
    "Aucune permission ne correspond à la recherche.",
  "admin.capabilities.source.account": "Héritée du compte",
  "admin.capabilities.source.staffRole": "Héritée du rôle Staff",
  "admin.capabilities.effective": "Effective",
  "admin.capabilities.ineffective": "Ineffective",
  "admin.capabilities.ineffective.directly_revoked": "Révoquée directement.",
  "admin.capabilities.ineffective.inactive_staff":
    "Inactive sans adhésion Staff active.",
  "admin.capabilities.ineffective.staff_separation":
    "Indisponible pour toute identité Staff.",
  "admin.capabilities.ineffective.account_status":
    "Inactive à cause du statut du compte.",
  "admin.capabilities.ineffective.not_granted": "Non accordée.",
  "admin.capabilities.mode.none": "Aucune surcharge",
  "admin.capabilities.mode.grant": "Accorder directement",
  "admin.capabilities.mode.revoke": "Révoquer directement",
  "admin.capabilities.scopeNotice":
    "Ces modifications ne changent ni le type de compte ni l’adhésion, le rôle ou le statut Staff.",
  "admin.capabilities.reasonLabel": "Motif de la modification",
  "admin.capabilities.reasonHint":
    "10 à 1 000 caractères. N’incluez aucune donnée sensible.",
  "admin.capabilities.reasonError":
    "Saisissez un motif significatif de 10 à 1 000 caractères.",
  "admin.capabilities.noChanges":
    "Aucune modification de permission à enregistrer.",
  "admin.capabilities.confirmationError":
    "Confirmez la modification à risque élevé avant de continuer.",
  "admin.capabilities.highRiskConfirmation":
    "Je confirme avoir vérifié l’impact de ces permissions sensibles et la déconnexion des sessions de la personne concernée.",
  "admin.capabilities.updateSuccess":
    "Les permissions ont été mises à jour et les sessions existantes ont été révoquées.",
  "admin.capabilities.updateError":
    "Les permissions n’ont pas pu être mises à jour.",
  "admin.capabilities.saveAction": "Enregistrer les permissions",
  "admin.capabilities.manageAction": "Gérer les permissions",
  "shell.demoRoleSwitcher.roleHorsPersonasDemo":
    "Rôle plateforme hors des personas de démonstration",
  "sellerworkspace.proDashboardPage.pasEncoreDeDonnees":
    "Pas encore de données",
  "sellerworkspace.proDashboardPage.totalVuesUniques":
    "Total : {count} vues uniques",
  "errors.notFoundPage.explorerLesCategories": "Explorer les catégories",
  "errors.notFoundPage.toutesLesCategories": "Toutes les catégories",
  // --- Shongre Emploi -----------------------------------------------------
  "employment.nav.candidate": "Espace candidat",
  "employment.nav.recruiter": "Espace recruteur",
  "employment.search.eyebrow": "Shongre Emploi",
  "employment.search.title": "Un emploi qui correspond à votre projet",
  "employment.search.subtitle":
    "Les candidatures, alertes standards et échanges éligibles restent gratuits pour les candidats.",
  "employment.search.queryPlaceholder": "Métier, compétence, entreprise",
  "employment.search.locationPlaceholder": "Ville ou télétravail",
  "employment.search.queryLabel": "Métier ou compétence",
  "employment.search.locationLabel": "Ville ou zone",
  "employment.action.publish": "Publier une offre",
  "employment.action.apply": "Postuler gratuitement",
  "employment.trust.noCandidateFee":
    "Aucun paiement n’est requis pour postuler.",
  "employment.trust.verifiedEmployer": "Employeur vérifié",
  "employment.trust.sponsoredTransparency":
    "Les placements payants sont identifiés et n’empêchent jamais l’accès aux offres gratuites.",
  "employment.search.filters": "Affiner les offres",
  "employment.search.results": "Résultats d’emploi",
  "employment.search.recentlyViewed": "Offres consultées récemment",
  "employment.search.createAlert": "Créer une alerte gratuite",
  "employment.search.empty": "Aucune offre ne correspond à ces filtres",
  "employment.workspace.candidateTitle": "Mon espace candidat",
  "employment.workspace.recruiterTitle": "Espace recruteur",
  "employment.workspace.applications": "Candidatures",
  "employment.workspace.interviews": "Entretiens",
  "employment.workspace.messages": "Messages",
  "employment.workspace.privacy": "Confidentialité et consentements",
  "employment.workspace.jobs": "Offres d’emploi",
  "employment.workspace.pipeline": "Pipeline de recrutement",
  "employment.workspace.imports": "Imports",
  "employment.workspace.team": "Équipe",
  "employment.application.received": "Reçue",
  "employment.application.review": "En cours d’examen",
  "employment.application.shortlisted": "Présélectionnée",
  "employment.application.interview": "Entretien",
  "employment.application.offer": "Proposition",
  "employment.application.hired": "Recrutée",
  "employment.application.rejected": "Non retenue",
  "employment.application.withdrawn": "Retirée",
  "employment.interview.proposed": "Proposé",
  "employment.interview.confirmed": "Confirmé",
  "employment.interview.rescheduled": "Replanifié",
  "employment.interview.cancelled": "Annulé",
  "employment.publish.title": "Publier une offre d’emploi",
  "employment.publish.freeOption": "Publication standard gratuite",
  "employment.publish.paidOptional": "Visibilité payante facultative",
  "employment.publish.noForcedPlan":
    "Aucun abonnement n’est requis pour une publication standard éligible.",
  "employment.privacy.applicationConsent":
    "J’accepte de transmettre cette candidature à l’employeur pour les besoins du recrutement.",
  "employment.privacy.talentPoolConsent":
    "Autoriser les recruteurs vérifiés à trouver mon profil",
  "employment.import.preview": "Prévisualiser l’import",
  "employment.import.confirm": "Confirmer l’import",
  "employment.import.idempotent":
    "Une synchronisation répétée met à jour l’offre source sans créer de doublon.",
  "admin.discovery.title": "Recherche et découverte",
  "admin.discovery.tab": "Découverte",
  "admin.discovery.description":
    "Les abonnements, dépenses publicitaires et types de vendeur sont exclus du score organique. Toute visibilité payante reste un placement séparé et identifié.",
  "admin.discovery.loading": "Chargement de la politique de découverte…",
  "admin.discovery.unavailableTitle": "Politique de découverte indisponible",
  "admin.discovery.unavailable": "La configuration n’a pas pu être chargée.",
  "admin.discovery.saveError": "Enregistrement impossible.",
  "admin.discovery.reasonPrompt": "Motif obligatoire (8 caractères minimum)",
  "admin.discovery.publishReason": "Activation de la politique de découverte",
  "admin.discovery.draftReason": "Préparation de la politique de découverte",
  "admin.discovery.publishedNotice": "Politique {version} activée et auditée.",
  "admin.discovery.draftNotice":
    "Brouillon {version} créé sans modifier la politique active.",
  "admin.discovery.saveDraft": "Enregistrer un brouillon",
  "admin.discovery.publish": "Publier",
  "admin.discovery.metricsTitle": "Observabilité sur 30 jours",
  "admin.discovery.weightsTitle": "Poids organiques",
  "admin.discovery.total": "Total {total}",
  "admin.discovery.sponsoredTitle": "Insertion sponsorisée contrôlée",
  "admin.discovery.positions": "Positions",
  "admin.discovery.maxPerPage": "Maximum par page",
  "admin.discovery.maxShare": "Part maximale",
  "admin.discovery.minimumRelevance": "Pertinence minimale",
  "admin.discovery.weight.relevance": "Pertinence texte",
  "admin.discovery.weight.category": "Catégorie",
  "admin.discovery.weight.location": "Localisation",
  "admin.discovery.weight.quality": "Qualité",
  "admin.discovery.weight.freshness": "Fraîcheur réelle",
  "admin.discovery.weight.trust": "Confiance",
  "admin.discovery.weight.price": "Plausibilité prix",
  "admin.discovery.weight.personalization": "Personnalisation",
  "admin.discovery.metric.searches": "Recherches",
  "admin.discovery.metric.noResults": "Sans résultat",
  "admin.discovery.metric.sponsored": "Placements sponsorisés",
  "admin.discovery.metric.duplicates": "Doublons écartés",
  "admin.discovery.metric.diversity": "Diversifications",
  "admin.discovery.metric.latency": "Latence moyenne (ms)",
  "admin.adminMarketsPage.resetAllTitle":
    "Restaurer la politique locale validée",
  "admin.adminMarketsPage.resetAllMessage":
    "La configuration complète de {market} sera restaurée depuis son propre jeu de données validé. Aucun paramètre de {baseline} ne sera copié.",
  "admin.adminMarketsPage.resetAllConfirm": "Restaurer",
  "admin.adminMarketsPage.localPolicyEditor": "Politique locale ({market})",
  "admin.adminMarketsPage.independentPolicyTitle":
    "Configuration indépendante par marché",
  "admin.adminMarketsPage.independentPolicyDescription":
    "Chaque marché porte une politique complète. Le marché par défaut sert uniquement de comparaison et ses changements ne se propagent jamais aux autres pays.",
  "admin.adminMarketsPage.restoreReviewedPolicy":
    "Restaurer la politique validée",
  "admin.adminMarketsPage.defaultMarketNoticeTitle":
    "Marché initial par défaut",
  "admin.adminMarketsPage.defaultMarketNoticeDescription":
    "Vous éditez la politique explicite de {market}. Cette configuration ne se propage à aucun autre marché.",
  "admin.monetization.transitionTitle": "Valider une transition du catalogue",
  "admin.monetization.transitionReason": "Motif de la transition",
  "admin.monetization.transitionReasonDefault":
    "Validation du catalogue commercial",
  "monetization.marketRequired":
    "Sélectionnez un pays avant d’accéder aux offres payantes.",
  "admin.monetization.governanceTab": "Gouvernance",
  "admin.monetization.governanceTitle": "Migration, coûts et synchronisation",
  "admin.monetization.governanceDescription":
    "Contrôles de publication pour les migrations de forfaits, protections de prix, coûts directs et références prestataires. Un statut incomplet bloque la mise en production.",
  "admin.monetization.migrationMappings": "Migrations de forfaits",
  "admin.monetization.priceProtections": "Protections de prix",
  "admin.monetization.economics": "Coûts et marges",
  "admin.monetization.providerMappings": "Références prestataires",
  "admin.monetization.publicationBlockers": "{count} blocage(s) de publication",
  "admin.monetization.noPublicationBlocker": "Aucun blocage détecté",
  "admin.monetization.sourcePlan": "Offre source",
  "admin.monetization.targetPlan": "Offre cible",
  "admin.monetization.customerTreatment": "Traitement client",
  "admin.monetization.shadowQuote": "Devis fantôme",
  "admin.monetization.campaignsAndPriceLocks": "Campagnes et blocages de prix",
  "admin.monetization.providerReadiness": "Readiness prestataire",
  "invoicing.product.nav.features": "Fonctionnalités",
  "invoicing.product.nav.safety": "Contrôles",
  "invoicing.product.nav.markets": "Multi-marché",
  "invoicing.product.metaTitle":
    "Shongre Facturation — Facturation structurée multi-marché",
  "invoicing.product.eyebrow": "Shongre Facturation",
  "invoicing.product.title":
    "Facturez clairement. Gardez le contrôle à chaque étape.",
  "invoicing.product.description":
    "Centralisez vos clients, brouillons, factures et avoirs dans un espace conçu pour plusieurs marchés, avec des totaux exacts et une finalisation protégée.",
  "invoicing.product.primaryCta": "Ouvrir l’espace de démonstration",
  "invoicing.product.secondaryCta": "Découvrir le parcours",
  "invoicing.product.openApp": "Ouvrir Shongre Facturation",
  "invoicing.product.activatePro": "Découvrir l’accès Facturation Pro",
  "invoicing.product.createWorkspace": "Créer mon espace Facturation",
  "invoicing.product.demoNotice":
    "Données locales déterministes · Aucun transport électronique activé",
  "invoicing.product.previewAria":
    "Ouvrir l’espace de démonstration Shongre Facturation",
  "invoicing.product.previewTitle": "Facturation",
  "invoicing.product.previewOrganization": "Organisation",
  "invoicing.product.previewNumber": "Numéro",
  "invoicing.product.previewCustomer": "Client",
  "invoicing.product.previewAmount": "Montant",
  "invoicing.product.previewFinalized": "Finalisée",
  "invoicing.product.previewConfiguration": "Configuration requise",
  "invoicing.product.previewSubtotal": "Sous-total HT",
  "invoicing.product.previewTax": "Taxe",
  "invoicing.product.previewMarket": "Marché",
  "invoicing.product.previewMarketValue": "France · EUR",
  "invoicing.product.previewDocument": "Document lisible",
  "invoicing.product.previewDocumentNotice":
    "Dérivé texte de démonstration — ce fichier n’est pas un original juridique.",
  "invoicing.product.trustTitle": "Fondations de Shongre Facturation",
  "invoicing.product.trustExact": "Totaux calculés exactement",
  "invoicing.product.trustMarkets": "Contexte multi-marché",
  "invoicing.product.trustFinalization": "Finalisation protégée",
  "invoicing.product.trustDemo": "Démo sans transmission",
  "invoicing.product.workflowTitle":
    "De votre organisation à une facture finalisée.",
  "invoicing.product.workflowBody":
    "Chaque étape conserve son propre rôle : configuration, création, finalisation et suivi ne sont jamais confondus.",
  "invoicing.product.stepConfigureTitle": "Configurer",
  "invoicing.product.stepConfigureBody":
    "Choisissez l’entité juridique, le marché, la devise, la langue et le fuseau.",
  "invoicing.product.stepCreateTitle": "Créer",
  "invoicing.product.stepCreateBody":
    "Ajoutez le client et les lignes avec quantités, prix et traitement fiscal explicites.",
  "invoicing.product.stepFinalizeTitle": "Finaliser",
  "invoicing.product.stepFinalizeBody":
    "Attribuez un numéro et produisez un instantané immuable en une seule opération.",
  "invoicing.product.stepFollowTitle": "Suivre",
  "invoicing.product.stepFollowBody":
    "Consultez séparément les états commercial, paiement, export et transport.",
  "invoicing.product.finalizationTitle":
    "Une finalisation qui ne réécrit pas l’histoire.",
  "invoicing.product.finalizationBody":
    "La facture finalisée conserve les informations de l’émetteur, du destinataire et de ses lignes. Toute correction passe par un document lié.",
  "invoicing.product.finalizationNumber":
    "Numéro attribué dans une série dédiée au marché et à l’entité",
  "invoicing.product.finalizationSnapshot":
    "Instantané et empreinte conservés avec le document",
  "invoicing.product.finalizationDocument":
    "Avoir relié à la facture d’origine sans modifier celle-ci",
  "invoicing.product.marketsTitle":
    "Le marché fait partie du document, pas du décor.",
  "invoicing.product.marketsBody":
    "Pays, devise, langue et fuseau sont contrôlés ensemble. Un contexte incomplet ou incohérent bloque l’opération au lieu de revenir silencieusement à la France.",
  "invoicing.product.marketsDisclaimer":
    "Le socle générique est démontré pour ces contextes actifs ; cela ne constitue pas une attestation de conformité fiscale ou électronique locale.",
  "invoicing.product.marketFrance": "France",
  "invoicing.product.marketBelgium": "Belgique",
  "invoicing.product.marketSwitzerland": "Suisse",
  "invoicing.product.guardrailsTitle":
    "Les limites de production restent visibles.",
  "invoicing.product.guardrailsBody":
    "Shongre Facturation distingue ce qui fonctionne en démonstration de ce qui exige encore une configuration, une revue ou une certification externe.",
  "invoicing.product.guardrailNoTransmission":
    "Aucune transmission légale simulée comme réussie",
  "invoicing.product.guardrailNoFallback":
    "Aucun repli silencieux vers un autre marché",
  "invoicing.product.guardrailIsolation":
    "Données isolées par organisation et entité",
  "invoicing.product.finalCtaTitle":
    "Préparez votre première facture dans un espace sans dépendance backend.",
  "invoicing.product.finalCtaBody":
    "Explorez le parcours avec des données déterministes, sans connecter de fournisseur ni transmettre de document.",
  "invoicing.product.explorePro": "Explorer Shongre Pro",
  "invoicing.product.controlTitle": "Des états séparés et explicites",
  "invoicing.product.controlBody":
    "Cycle commercial, paiement, export comptable et transport électronique ne sont jamais confondus.",
  "invoicing.product.marketTitle": "Le marché fait partie du document",
  "invoicing.product.marketBody":
    "Pays, devise, langue et fuseau sont validés ensemble, sans repli silencieux sur la France.",
  "invoicing.product.immutabilityTitle": "Finalisation protégée",
  "invoicing.product.immutabilityBody":
    "La numérotation, l’instantané et le document lisible sont produits par une seule opération idempotente.",
  "invoicing.workspace.title": "Facturation",
  "invoicing.workspace.description": "Factures de vente de votre organisation",
  "invoicing.workspace.demo": "Mode démonstration",
  "invoicing.workspace.newInvoice": "Nouvelle facture",
  "invoicing.workspace.configurationTitle":
    "Configuration de production requise",
  "invoicing.workspace.configurationBody":
    "Le transport électronique n’est pas actif. Les brouillons et la finalisation locale restent disponibles dans ce scénario de démonstration.",
  "invoicing.workspace.navigation": "Navigation de la facturation",
  "invoicing.workspace.overview": "Vue d’ensemble",
  "invoicing.workspace.invoices": "Factures",
  "invoicing.workspace.customers": "Clients",
  "invoicing.workspace.legalEntities": "Entités juridiques",
  "invoicing.workspace.settings": "Paramètres",
  "invoicing.workspace.market": "Marché actif",
  "invoicing.workspace.organization": "Organisation active",
  "invoicing.workspace.drafts": "brouillons",
  "invoicing.workspace.finalized": "finalisée",
  "invoicing.workspace.outstanding": "à encaisser",
  "invoicing.workspace.transport": "Transport",
  "invoicing.workspace.configurationRequired": "configuration requise",
  "invoicing.workspace.readiness": "Préparation à l’émission",
  "invoicing.workspace.recent": "Factures récentes",
  "invoicing.workspace.number": "Numéro",
  "invoicing.workspace.customer": "Client",
  "invoicing.workspace.issueDate": "Émission",
  "invoicing.workspace.dueDate": "Échéance",
  "invoicing.workspace.total": "Total",
  "invoicing.workspace.status": "Statut",
  "invoicing.workspace.draft": "Brouillon",
  "invoicing.workspace.finalizedStatus": "Finalisée",
  "invoicing.workspace.creditedStatus": "Créditée",
  "invoicing.workspace.unpaid": "Non payée",
  "invoicing.workspace.noInvoices": "Aucune facture pour ce marché.",
  "invoicing.workspace.draftPanel": "Brouillon de facture",
  "invoicing.workspace.recipient": "Destinataire",
  "invoicing.workspace.descriptionField": "Description",
  "invoicing.workspace.quantity": "Quantité",
  "invoicing.workspace.unit": "Unité",
  "invoicing.workspace.unitPrice": "Prix unitaire HT",
  "invoicing.workspace.taxRate": "TVA",
  "invoicing.workspace.subtotal": "Sous-total HT",
  "invoicing.workspace.tax": "Taxe",
  "invoicing.workspace.totalIncludingTax": "Total TTC",
  "invoicing.workspace.saveDraft": "Enregistrer le brouillon",
  "invoicing.workspace.finalize": "Finaliser la facture",
  "invoicing.workspace.finalizeWarning":
    "La finalisation attribue un numéro et rend les champs juridiques immuables.",
  "invoicing.workspace.saved": "Brouillon enregistré.",
  "invoicing.workspace.finalizedMessage": "Facture finalisée localement.",
  "invoicing.workspace.loadError":
    "L’espace de facturation n’a pas pu être chargé.",
  "invoicing.workspace.saveError": "Le brouillon n’a pas pu être enregistré.",
  "invoicing.workspace.finalizeError": "La facture n’a pas pu être finalisée.",
  "invoicing.workspace.viewDocument": "Voir le document",
  "invoicing.workspace.downloadDocument": "Télécharger",
  "invoicing.workspace.humanDerivative":
    "Dérivé texte lisible — ce fichier n’est pas un original juridique.",
  "invoicing.workspace.documentError":
    "Le document lisible n’a pas pu être chargé.",
  "invoicing.workspace.loading": "Chargement de la facturation…",
  "invoicing.onboarding.bootstrapTitle":
    "Reprendre les informations de l’organisation",
  "invoicing.onboarding.bootstrapBody":
    "Créez l’émetteur de facture à partir de la raison sociale, de l’adresse et de l’identifiant déjà enregistrés dans Shongre. Vous pourrez ensuite les vérifier dans les paramètres.",
  "invoicing.onboarding.bootstrapAction": "Configurer l’émetteur",
  "invoicing.onboarding.bootstrapError":
    "Impossible de reprendre les informations de l’organisation.",
  // --- CRM: forecast categories -------------------------------------------
  // The API returns `pipeline | best_case | commit | closed | omitted`. These
  // are enum keys, not copy: rendering them raw (or mapping only `commit` and
  // calling everything else "Pipeline", as the pipeline board did) shows the
  // operator a backend token and mislabels three of the five states.
  "crm.forecast.pipeline": "Prévisionnel",
  "crm.forecast.bestCase": "Meilleur scénario",
  "crm.forecast.commit": "Engagé",
  "crm.forecast.closed": "Clôturé",
  "crm.forecast.omitted": "Exclu du prévisionnel",

  // The same applies to `source`: eight enum members reached three detail
  // panels as raw tokens ("ai_research", "shongre_adapter", "external_api").
  "crm.source.manual": "Saisie manuelle",
  "crm.source.import": "Import de fichier",
  "crm.source.inbound": "Demande entrante",
  "crm.source.referral": "Recommandation",
  "crm.source.event": "Événement",
  "crm.source.aiResearch": "Recherche assistée par IA",
  "crm.source.shongreAdapter": "Marketplace Shongre",
  "crm.source.externalApi": "API externe",

  "common.loadingMap": "Chargement de la carte",
  "courses.tutorWorkspace.offersTableLabel": "Tableau des cours publiés",
  "courses.tutorWorkspace.availabilityTableLabel":
    "Tableau des disponibilités hebdomadaires",

  "crm.opportunity.stageStepperLabel": "Étapes du pipeline",

  "admin.immo.marketsTableLabel": "Tableau des marchés immobiliers",
  "admin.immo.visibilityOptionsTableLabel": "Tableau des options de visibilité",
  "admin.immo.listingsTableLabel": "Tableau des annonces immobilières",
  "immo.propertyDetail.individualAdvertiser": "Particulier",
  "immo.propertyDetail.professionalAdvertiser": "Professionnel",

  "admin.solutions.catalogTableLabel": "Tableau du catalogue de solutions",
  "admin.monetization.firstTableLabel": "Tableau des grilles de commission",
  "admin.monetization.secondTableLabel": "Tableau des paliers de commission",
  "admin.employment.tableLabel": "Tableau des offres d’emploi",
  "employment.recruiter.tableLabel": "Tableau des candidatures",
  "pro.plans.comparisonTableLabel": "Tableau comparatif des forfaits Pro",
  "pro.plans.subscriptionUnavailable.title": "Souscription indisponible",
  "pro.plans.subscriptionUnavailable.description":
    "Un compte Professionnel actif autorisé à gérer ses abonnements est requis. Les tarifs restent consultables.",
  "pro.plans.preview.badge": "Brouillon v{version}",
  "pro.plans.preview.title": "Aperçu du catalogue cible",
  "pro.plans.preview.description":
    "Les offres Pro Starter, Pro Growth et Pro Performance sont présentées depuis la version commerciale cible. Aucune souscription ni option payante ne peut être lancée avant sa publication.",
  "pro.plans.preview.founding":
    "Founding Professional : {trialDays} jours offerts, {maximumVerticals} verticale maximum et prix bloqué {lockMonths} mois au démarrage payant.",
  "pro.plans.preview.catalogLabel": "Aperçu v{version} · marché {market}",
  "pro.plans.preview.verticalDescription":
    "Socle Pro commun avec module {vertical} attachable après validation opérationnelle.",
  "pro.plans.preview.unavailable": "Disponible après publication",
  "admin.auto.tableLabel": "Tableau des annonces automobiles",
  "auto.publish.stepperLabel": "Étapes de publication du véhicule",
  "auto.compare.tableLabel": "Tableau comparatif des véhicules",

  "crm.taskPriority.low": "Basse",
  "crm.taskPriority.medium": "Moyenne",
  "crm.taskPriority.high": "Haute",
  "crm.taskPriority.urgent": "Urgente",

  // --- Admin and CRM migration ---
  "admin.adminAnalyticsPage.pilotageProduitAcquisitionSeoRechercheEtMonetisation":
    "Pilotage produit, acquisition, SEO, recherche et monétisation.",
  "admin.adminAnalyticsPage.accesLimite": "Accès limité",
  "admin.adminAnalyticsPage.aucunPerimetreAnalyticsNEstAttribueAVotreRole":
    "Aucun périmètre analytics n’est attribué à votre rôle.",
  "admin.adminAnalyticsPage.analyticsSeoObservabilite":
    "Analytics, SEO & observabilité",
  "admin.adminAnalyticsPage.indicateursInternesFiablesSegmentesParMarcheLesRevenusSontRapproches":
    "Indicateurs internes fiables, segmentés par marché. Les revenus sont rapprochés du grand livre financier.",
  "admin.adminAnalyticsPage.periode": "Période",
  "admin.adminAnalyticsPage.personnalisee": "Personnalisée",
  "admin.adminAnalyticsPage.dimensionsAvancees": "Dimensions avancées",
  "admin.adminAnalyticsPage.identifiantCategorie": "Identifiant catégorie",
  "admin.adminAnalyticsPage.perimetresAnalytics": "Périmètres analytics",
  "admin.adminAnalyticsPage.chargementDesIndicateurs":
    "Chargement des indicateurs",
  "admin.adminAnalyticsPage.donneesIndisponibles": "Données indisponibles",
  "admin.adminAnalyticsPage.selectionnezUnMarchePourUnRapprochementCompletDansSaDevise":
    "Sélectionnez un marché pour un rapprochement complet dans sa devise. La vue « Tous les marchés » ne fusionne jamais des devises différentes.",
  "admin.adminAnalyticsPage.activiteProduit": "Activité produit",
  "admin.adminAnalyticsPage.acquisitionParCanal": "Acquisition par canal",
  "admin.adminAnalyticsPage.demandesDeRechercheSousServies":
    "Demandes de recherche sous-servies",
  "admin.adminAnalyticsPage.requete": "Requête",
  "admin.adminAnalyticsPage.visibiliteOrganique": "Visibilité organique",
  "admin.adminAnalyticsPage.requetesOrganiquesSearchConsole":
    "Requêtes organiques Search Console",
  "admin.adminAnalyticsPage.echecs": "Échecs :",
  "admin.adminAuditLogsPage.toutesLesActionsDAudit":
    "Toutes les actions d'audit (",
  "admin.adminAuditLogsPage.dateEtHeure": "Date et heure",
  "admin.adminAuditLogsPage.detailDeLEvenementDAudit":
    "Détail de l’événement d’audit",
  "admin.adminAuditLogsPage.donneesTechniques": "Données techniques",
  "admin.adminCommissionPanel.reglesVersionnees": "Règles versionnées",
  "admin.adminCommissionPanel.defautSur": "Défaut sûr :",
  "admin.adminCommissionPanel.aucuneCommissionNEstPreleveeSansPolitiqueActiveContexteEligible":
    "aucune commission n’est prélevée sans politique active, contexte éligible et événement d’acquisition atteint. Une simple annonce publiée ne déclenche jamais de commission.",
  "admin.adminCommissionPanel.soumettreAApprobation": "Soumettre à approbation",
  "admin.adminCommissionPanel.simulateurDeCommission":
    "Simulateur de commission",
  "admin.adminCommissionPanel.utiliseExactementLeMemeResolveurQueLeCheckoutEtLa":
    "Utilise exactement le même résolveur que le checkout et la comptabilisation serveur.",
  "admin.adminCommissionPanel.typeVendeur": "Type vendeur",
  "admin.adminCommissionPanel.categorieIdentifiant": "Catégorie (identifiant)",
  "admin.adminCommissionPanel.resultat": "Résultat",
  "admin.adminCommissionPanel.renseignezLeContextePourVoirLaPolitiqueLeCalculEt":
    "Renseignez le contexte pour voir la politique, le calcul et sa justification.",
  "admin.adminCommissionPanel.precedence": "· précédence",
  "admin.adminCommissionPanel.politiquesDuCataloguePublie":
    "Politiques du catalogue publié",
  "admin.adminCommissionPanel.porteeHeritage": "Portée / héritage",
  "admin.adminCommissionPanel.desactiverViaBrouillon":
    "Désactiver via brouillon",
  "admin.adminCommissionPolicyEditor.laModificationCreeUneNouvelleVersionSoumiseAuWorkflowMaker":
    "La modification crée une nouvelle version soumise au workflow maker-checker.",
  "admin.adminCommissionPolicyEditor.typeDePolitique": "Type de politique",
  "admin.adminCommissionPolicyEditor.commissionDeBase": "Commission de base",
  "admin.adminCommissionPolicyEditor.deploiementBps": "Déploiement (bps)",
  "admin.adminCommissionPolicyEditor.niveauDeDerogation":
    "Niveau de dérogation",
  "admin.adminCommissionPolicyEditor.defautDuMarche": "Défaut du marché",
  "admin.adminCommissionPolicyEditor.categorieListePossible":
    "Catégorie (liste possible)",
  "admin.adminCommissionPolicyEditor.typeDeTransaction": "Type de transaction",
  "admin.adminCommissionPolicyEditor.valeursDePortee": "Valeurs de portée",
  "admin.adminCommissionPolicyEditor.modele": "Modèle",
  "admin.adminCommissionPolicyEditor.forfaitCategorie": "Forfait catégorie",
  "admin.adminCommissionPolicyEditor.auMoinsLeSeuil": "Au moins le seuil",
  "admin.adminCommissionPolicyEditor.strictementAuDessus":
    "Strictement au-dessus",
  "admin.adminCommissionPolicyEditor.sousLeSeuil": "Sous le seuil",
  "admin.adminCommissionPolicyEditor.modeDesPaliers": "Mode des paliers",
  "admin.adminCommissionPolicyEditor.baseDesPaliers": "Base des paliers",
  "admin.adminCommissionPolicyEditor.montantDeLaTransaction":
    "Montant de la transaction",
  "admin.adminCommissionPolicyEditor.volumeCumule": "Volume cumulé",
  "admin.adminCommissionPolicyEditor.periodeDeVolume": "Période de volume",
  "admin.adminCommissionPolicyEditor.annee": "Année",
  "admin.adminCommissionPolicyEditor.dureeDeVie": "Durée de vie",
  "admin.adminCommissionPolicyEditor.apresRemise": "Après remise",
  "admin.adminCommissionPolicyEditor.encaissePlateforme": "Encaissé plateforme",
  "admin.adminCommissionPolicyEditor.evenementDAcquisition":
    "Événement d’acquisition",
  "admin.adminCommissionPolicyEditor.paiementReussi": "Paiement réussi",
  "admin.adminCommissionPolicyEditor.commandeTerminee": "Commande terminée",
  "admin.adminCommissionPolicyEditor.serviceTermine": "Service terminé",
  "admin.adminCommissionPolicyEditor.virementLibere": "Virement libéré",
  "admin.adminCommissionPolicyEditor.leadQualifie": "Lead qualifié",
  "admin.adminCommissionPolicyEditor.reservationTerminee":
    "Réservation terminée",
  "admin.adminCommissionPolicyEditor.politiqueDeRemboursement":
    "Politique de remboursement",
  "admin.adminCommissionPolicyEditor.commissionConservee":
    "Commission conservée",
  "admin.adminCommissionPolicyEditor.taxeAjoutee": "Taxe ajoutée",
  "admin.adminCommissionPolicyEditor.exoneree": "Exonérée",
  "admin.adminCommissionPolicyEditor.exonerationTotale": "Exonération totale",
  "admin.adminCommissionPolicyEditor.tauxNegocie": "Taux négocié",
  "admin.adminCommissionPolicyEditor.montantNegocie": "Montant négocié",
  "admin.adminCommissionPolicyEditor.debutEffectif": "Début effectif",
  "admin.adminCommissionPolicyEditor.creerLeBrouillon": "Créer le brouillon",
  "admin.adminFeatureFlagsPage.fonctionnalitesConsoleShongre":
    "Fonctionnalités — Console Shongre",
  "admin.adminFeatureFlagsPage.pilotageAuditeDesActivationsProgressivesShongre":
    "Pilotage audité des activations progressives Shongre.",
  "admin.adminFeatureFlagsPage.fonctionnalitesEtDeploiementsProgressifs":
    "Fonctionnalités et déploiements progressifs",
  "admin.adminFeatureFlagsPage.lesValeursAbsentesExpireesOuIndisponiblesRestentDesactiveesChaqueModification":
    "Les valeurs absentes, expirées ou indisponibles restent désactivées. Chaque modification exige un propriétaire et un motif d’audit.",
  "admin.adminFeatureFlagsPage.regleS": "règle(s)",
  "admin.adminFeatureFlagsPage.miseAJour": "Mise à jour",
  "admin.adminFeatureFlagsPage.modificationsAuditees": "Modifications auditées",
  "admin.adminFeatureFlagsPage.equipeProprietaire": "Équipe propriétaire",
  "admin.adminFeatureFlagsPage.cycleDeVie": "Cycle de vie",
  "admin.adminFeatureFlagsPage.archivee": "Archivée",
  "admin.adminFeatureFlagsPage.activeParDefaut": "Active par défaut",
  "admin.adminFeatureFlagsPage.pourquoiCeChangementEstIlNecessaire":
    "Pourquoi ce changement est-il nécessaire ?",
  "admin.adminFeatureFlagsPage.reglesCiblees": "Règles ciblées",
  "admin.adminFeatureFlagsPage.aucuneRegleLaValeurParDefautSApplique":
    "Aucune règle : la valeur par défaut s’applique.",
  "admin.adminFeatureFlagsPage.priorite": "% · priorité",
  "admin.adminFeatureFlagsPage.nouvelleRegle": "Nouvelle règle",
  "admin.adminFeatureFlagsPage.deploiement": "Déploiement (%)",
  "admin.adminFeatureFlagsPage.valeurActiveePourLaCohorte":
    "Valeur activée pour la cohorte",
  "admin.adminFeatureFlagsPage.motifDeLaRegle": "Motif de la règle",
  "admin.adminFeatureFlagsPage.objectifEtValidationAttendueDuDeploiement":
    "Objectif et validation attendue du déploiement",
  "admin.adminFeatureFlagsPage.ajouterLaRegle": "Ajouter la règle",
  "admin.adminFeatureFlagsPage.aucuneFonctionnaliteSelectionnee":
    "Aucune fonctionnalité sélectionnée.",
  "admin.adminFinancePage.financeDeLaPlateforme": "Finance de la plateforme",
  "admin.adminFinancePage.revenusTransactionsEtRapprochementFinancierShongre":
    "Revenus, transactions et rapprochement financier Shongre.",
  "admin.adminFinancePage.chargementDesFinances": "Chargement des finances",
  "admin.adminFinancePage.lesAgregatsFinanciersNOntPasPuEtreCharges":
    "Les agrégats financiers n’ont pas pu être chargés.",
  "admin.adminFinancePage.registreFinancierImmuableRevenusReconnusEtControleDesEcartsFournisseurs":
    "Registre financier immuable, revenus reconnus et contrôle des écarts fournisseurs.",
  "admin.adminFinancePage.rechercherUneTransaction":
    "Rechercher une transaction",
  "admin.adminLayout.crmPipelineVentes": "CRM & Pipeline Ventes",
  "admin.adminLayout.conformiteKycKyb": "Conformité KYC / KYB",
  "admin.adminLayout.fournisseursIntegrations": "Fournisseurs & Intégrations",
  "admin.adminLayout.monetisationForfaitsPro": "Monétisation & Forfaits Pro",
  "admin.adminLayout.matriceRolesPermissions": "Matrice Rôles & Permissions",
  "admin.adminMarketsPage.betaPublique": "Bêta publique",
  "admin.adminMarketsPage.betaPrivee": "Bêta privée",
  "admin.adminMarketsPage.marcheParDefaut": "Marché par défaut :",
  "admin.adminMarketsPage.restaurerLaValeurLocaleValidee":
    "Restaurer la valeur locale validée",
  "admin.adminMarketsPage.registreMultiMarches": "Registre multi-marchés",
  "admin.adminMarketsPage.chaqueMarchePossedeUnePolitiqueCompleteEtExpliciteLaFrance":
    "Chaque marché possède une politique complète et explicite. La France reste le marché initial par défaut, sans propager ses valeurs aux autres pays.",
  "admin.adminMarketsPage.configureLocalement": "% configuré localement",
  "admin.adminMarketsPage.aucunHeritageInterMarche":
    "Aucun héritage inter-marché",
  "admin.adminMarketsPage.configurationDe": "Configuration de",
  "admin.adminMarketsPage.taxonomieCategories": "Taxonomie & Catégories",
  "admin.adminMarketsPage.annonces": "Annonces",
  "admin.adminMarketsPage.reservation": "Réservation",
  "admin.adminMarketsPage.fiscaliteTva": "Fiscalité & TVA",
  "admin.adminMarketsPage.monetisation": "Monétisation",
  "admin.adminMarketsPage.modifierLeRoutage": "Modifier le routage",
  "admin.adminMarketsPage.laTaxonomieEstPartageeMaisSaDisponibiliteEstConfigureeExplicitement":
    "La taxonomie est partagée, mais sa disponibilité est configurée explicitement par marché. Activez ou désactivez des catégories ou sous-catégories pour",
  "admin.adminMarketsPage.sousCategories": "Sous-catégories (",
  "admin.adminMarketsPage.surcharge2": "✏️ Surchargé (",
  "admin.adminMarketsPage.leModeDeDomaineEtLePrefixeSontUniquesLes":
    "Le mode de domaine et le préfixe sont uniques. Les noms d’hôte concrets viennent exclusivement de la configuration du déploiement.",
  "admin.adminMarketsPage.modeDeDomaineCanonique": "Mode de domaine canonique",
  "admin.adminMarketsPage.prefixePublic": "Préfixe public",
  "admin.adminMarketsPage.visibleSurLePortailInternational":
    "Visible sur le portail international",
  "admin.adminMarketsPage.expliquezLeChangementEtSonImpactOperationnel":
    "Expliquez le changement et son impact opérationnel.",
  "admin.adminMarketsPage.soumettrePourApprobation":
    "Soumettre pour approbation",
  "admin.adminMarketsPage.creerLeBrouillonSecurise":
    "Créer le brouillon sécurisé",
  "admin.adminMarketsPage.nouvelleValeurPour": "Nouvelle Valeur pour",
  "admin.adminModerationPage.signalementsRecus": "Signalements Reçus (",
  "admin.adminModerationPage.controleAuditIaAnnonces":
    "Contrôle & Audit IA Annonces (",
  "admin.adminModerationPage.aucunSignalementEnAttente":
    "Aucun signalement en attente",
  "admin.adminModerationPage.dossiersDeModeration": "Dossiers de modération",
  "admin.adminModerationPage.historiqueCanoniqueDesSignalementsEtDecisionsAppliquees":
    "Historique canonique des signalements et décisions appliquées.",
  "admin.adminModerationPage.aucunDossierEnregistre":
    "Aucun dossier enregistré.",
  "admin.adminModerationPage.recoursAExaminer": "Recours à examiner",
  "admin.adminModerationPage.leBackendInterditQuUnModerateurReviseSaPropreDecision":
    "Le backend interdit qu’un modérateur révise sa propre décision.",
  "admin.adminModerationPage.aucunRecoursEnregistre":
    "Aucun recours enregistré.",
  "admin.adminModerationPage.decision": "Décision :",
  "admin.adminModerationPage.annulerLaDecision": "Annuler la décision",
  "admin.adminModerationPage.catalogueDAnnoncesShongre":
    "Catalogue d'annonces Shongre (",
  "admin.adminModerationPage.auTotal": "au total)",
  "admin.adminModerationPage.motifLegal": "Motif légal :",
  "admin.adminModerationPage.vendeur2": "• Vendeur :",
  "admin.adminModerationPage.deciderLeRecours": "Décider le recours",
  "admin.adminModerationPage.motifIndependantEtVerifiable":
    "Motif indépendant et vérifiable",
  "admin.adminModerationPage.expliquezLesElementsExaminesEtLaJustificationDeLaDecision":
    "Expliquez les éléments examinés et la justification de la décision.",
  "admin.adminMonetizationPage.reglesBusinessEtMonetisation":
    "Règles business et monétisation",
  "admin.adminMonetizationPage.administrationVersionneeDuCatalogueCommercialShongre":
    "Administration versionnée du catalogue commercial Shongre.",
  "admin.adminMonetizationPage.chargementDuCatalogueCommercial":
    "Chargement du catalogue commercial…",
  "admin.adminMonetizationPage.businessMonetisation": "Business & Monétisation",
  "admin.adminMonetizationPage.uneSourceVersionneePourLesOffresPrixQuotasReglesTaxes":
    "Une source versionnée pour les offres, prix, quotas, règles, taxes, commissions et promotions.",
  "admin.adminMonetizationPage.versionPubliee": "Version publiée",
  "admin.adminMonetizationPage.creerUnBrouillon": "Créer un brouillon",
  "admin.adminMonetizationPage.changementsPlanifies": "Changements planifiés",
  "admin.adminMonetizationPage.reglesActives": "Règles actives",
  "admin.adminMonetizationPage.sectionsDeMonetisation":
    "Sections de monétisation",
  "admin.adminMonetizationPage.rechercherUneOffre": "Rechercher une offre",
  "admin.adminMonetizationPage.rechercherUnProduitUnCode":
    "Rechercher un produit, un code…",
  "admin.adminMonetizationPage.toutesLesAudiences": "Toutes les audiences",
  "admin.adminMonetizationPage.toutesLesVerticales": "Toutes les verticales",
  "admin.adminMonetizationPage.aucuneOffreNeCorrespondAuxFiltres":
    "Aucune offre ne correspond aux filtres.",
  "admin.adminMonetizationPage.identifiantsStablesCategoriesEtCapacitesPubliesViaLeWorkflowVersionne":
    "Identifiants stables, catégories et capacités publiés via le workflow versionné.",
  "admin.adminMonetizationPage.aucuneCategorieSpecialisee":
    "Aucune catégorie spécialisée",
  "admin.adminMonetizationPage.priorite": "· priorité",
  "admin.adminMonetizationPage.campagnesEtCoupons": "Campagnes et coupons",
  "admin.adminMonetizationPage.lesChangementsSontAjoutesAUnBrouillonSoumisAuWorkflow":
    "Les changements sont ajoutés à un brouillon soumis au workflow d’approbation.",
  "admin.adminMonetizationPage.duree": "Durée",
  "admin.adminMonetizationPage.demanderUnAccesOffert":
    "Demander un accès offert",
  "admin.adminMonetizationPage.laDemandeNeCreeAucunFauxPaiementEtAttendUne":
    "La demande ne crée aucun faux paiement et attend une approbation distincte.",
  "admin.adminMonetizationPage.compteBeneficiaire": "Compte bénéficiaire",
  "admin.adminMonetizationPage.identifiantUtilisateurOuOrganisation":
    "Identifiant utilisateur ou organisation",
  "admin.adminMonetizationPage.selectionnerUnForfait":
    "Sélectionner un forfait",
  "admin.adminMonetizationPage.debut": "Début",
  "admin.adminMonetizationPage.campagneOuReference": "Campagne ou référence",
  "admin.adminMonetizationPage.decisionFinale": "Décision finale",
  "admin.adminMonetizationPage.reserveeAuRoleProprietaireLeDemandeurNePeutPasApprouver":
    "Réservée au rôle propriétaire. Le demandeur ne peut pas approuver sa propre demande.",
  "admin.adminMonetizationPage.identifiantDeDemande": "Identifiant de demande",
  "admin.adminMonetizationPage.decision": "Décision",
  "admin.adminMonetizationPage.motifDeDecision": "Motif de décision",
  "admin.adminMonetizationPage.enregistrerLaDecision":
    "Enregistrer la décision",
  "admin.adminMonetizationPage.droitsMaterialises": "Droits matérialisés",
  "admin.adminMonetizationPage.paiementsReussis": "Paiements réussis",
  "admin.adminMonetizationPage.abonnementsParCompte": "Abonnements par compte",
  "admin.adminMonetizationPage.aucunAbonnementAAfficher":
    "Aucun abonnement à afficher.",
  "admin.adminMonetizationPage.reference": "Référence",
  "admin.adminMonetizationPage.aucunMouvementFinancierAAfficher":
    "Aucun mouvement financier à afficher.",
  "admin.adminMonetizationPage.commandesRecentes": "Commandes récentes",
  "admin.adminMonetizationPage.aucuneCommandeCentralisee":
    "Aucune commande centralisée.",
  "admin.adminMonetizationPage.auditRecent": "Audit récent",
  "admin.adminMonetizationPage.aucunEvenementDAudit":
    "Aucun événement d’audit.",
  "admin.adminMonetizationPage.regles": "règles",
  "admin.adminMonetizationPage.preparerLeRollback": "Préparer le rollback",
  "admin.adminMonetizationPage.simulationEtExplication":
    "Simulation et explication",
  "admin.adminMonetizationPage.pourquoiCeResultat": "Pourquoi ce résultat ?",
  "admin.adminMonetizationPage.simulezUnContexteSansPublierNiModifierLaConfiguration":
    "Simulez un contexte sans publier ni modifier la configuration.",
  "admin.adminMonetizationPage.generique": "Générique",
  "admin.adminMonetizationPage.specificite": "· spécificité",
  "admin.adminMonetizationPage.selection": "Sélection",
  "admin.adminMonetizationPage.transitionsConfigurees":
    "Transitions configurées",
  "admin.adminMonetizationPage.montee": "Montée :",
  "admin.adminMonetizationPage.consommateursAffectes": "Consommateurs affectés",
  "admin.adminMonetizationPage.modifierDansUnBrouillon":
    "Modifier dans un brouillon",
  "admin.adminMonetizationPage.tracabilite": "Traçabilité",
  "admin.adminMonetizationPage.chaquePublicationConserveLeMotifLeDiffLAuteurL":
    "Chaque publication conserve le motif, le diff, l’auteur, l’approbateur et le snapshot utilisé par les devis.",
  "admin.adminMonetizationPage.leChangementCreeUnBrouillonVersionneEtNeModifieJamais":
    "Le changement crée un brouillon versionné et ne modifie jamais directement le catalogue publié.",
  "admin.adminMonetizationPage.mobilite": "Mobilité",
  "admin.adminMonetizationPage.categoriesAssociees": "Catégories associées",
  "admin.adminMonetizationPage.capacites": "Capacités",
  "admin.adminMonetizationPage.desactivee": "Désactivée",
  "admin.adminMonetizationPage.motifDuChangement": "Motif du changement",
  "admin.adminMonetizationPage.exOuvertureControleeDeLaVerticaleApresValidationCommerciale":
    "Ex. Ouverture contrôlée de la verticale après validation commerciale…",
  "admin.adminMonetizationPage.creerUneCampagnePromotionnelle":
    "Créer une campagne promotionnelle",
  "admin.adminMonetizationPage.laCampagneEstEnregistreeDansUnBrouillonVersionneElleN":
    "La campagne est enregistrée dans un brouillon versionné ; elle n’est jamais activée directement.",
  "admin.adminMonetizationPage.nomDeCampagne": "Nom de campagne",
  "admin.adminMonetizationPage.typeDeRemise": "Type de remise",
  "admin.adminMonetizationPage.periodeGratuite": "Période gratuite",
  "admin.adminMonetizationPage.clientsEligibles": "Clients éligibles",
  "admin.adminMonetizationPage.tousLesClients": "Tous les clients",
  "admin.adminMonetizationPage.utilisationsParCompte":
    "Utilisations par compte",
  "admin.adminMonetizationPage.periodeGratuiteJours":
    "Période gratuite (jours)",
  "admin.adminMonetizationPage.periodesRemisees": "Périodes remisées",
  "admin.adminMonetizationPage.engagementMinimalPeriodes":
    "Engagement minimal (périodes)",
  "admin.adminMonetizationPage.couponDuPrestataire": "Coupon du prestataire",
  "admin.adminMonetizationPage.laCampagneResteInactiveJusquAPublicationDuBrouillonSon":
    "La campagne reste inactive jusqu’à publication du brouillon. Son type, son éligibilité, son cumul et ses plafonds sont appliqués par le même moteur lors du devis et du checkout.",
  "admin.adminMonetizationPage.ajouterAuBrouillon": "Ajouter au brouillon",
  "admin.adminNewsletterPage.audiencesCampagnesModelesConformiteEtDelivrabiliteMarketing":
    "Audiences, campagnes, modèles, conformité et délivrabilité Marketing.",
  "admin.adminNewsletterPage.decouvrirLaSelection": "Découvrir la sélection",
  "admin.adminNewsletterPage.meDesabonnerEnUnClic": "Me désabonner en un clic",
  "admin.adminNewsletterPage.modeles": "Modèles",
  "admin.adminNewsletterPage.conformite": "Conformité",
  "admin.adminNewsletterPage.providerPlatformPartagee":
    "Provider Platform partagée",
  "admin.adminNewsletterPage.audiencesCrmEtMarketingCampagnesVersionneesConsentementDelivrabiliteEtAnalyse":
    "Audiences CRM et marketing, campagnes versionnées, consentement, délivrabilité et analyse depuis un domaine multi-tenant unique.",
  "admin.adminNewsletterPage.lesExclusionsLegalesEtOperationnellesSontEvalueesCoteService":
    "Les exclusions légales et opérationnelles sont évaluées côté service.",
  "admin.adminNewsletterPage.eligibles": "éligibles ·",
  "admin.adminNewsletterPage.selectionnes": "sélectionnés",
  "admin.adminNewsletterPage.creerUneCampagne": "Créer une campagne",
  "admin.adminNewsletterPage.leBrouillonResteraModifiableJusquAuSnapshotDEnvoi":
    "Le brouillon restera modifiable jusqu’au snapshot d’envoi.",
  "admin.adminNewsletterPage.selectionProSeptembre":
    "Sélection Pro · septembre",
  "admin.adminNewsletterPage.objetDeLEmail2": "Objet de l’email",
  "admin.adminNewsletterPage.lesNouveautesChoisiesPourVous":
    "Les nouveautés choisies pour vous",
  "admin.adminNewsletterPage.texteDApercu": "Texte d’aperçu",
  "admin.adminNewsletterPage.laSelectionDeLaSemaineEnUnCoupDOeil":
    "La sélection de la semaine en un coup d’œil",
  "admin.adminNewsletterPage.audienceDeLaCampagne": "Audience de la campagne",
  "admin.adminNewsletterPage.choisirUneListeOuUnSegment":
    "Choisir une liste ou un segment",
  "admin.adminNewsletterPage.cetteSemaineSurShongre":
    "Cette semaine sur Shongre",
  "admin.adminNewsletterPage.presentezLInformationEssentielleEnQuelquesPhrases":
    "Présentez l’information essentielle en quelques phrases.",
  "admin.adminNewsletterPage.leBlocPreferencesEtLeDesabonnementSontAjoutesAutomatiquementLes":
    "Le bloc préférences et le désabonnement sont ajoutés automatiquement. Les suppressions restent prioritaires sur l’audience.",
  "admin.adminOverviewPage.surLePerimetreTerritorial":
    "sur le périmètre territorial",
  "admin.adminOverviewPage.traiterLesSignalements":
    "Traiter les signalements (",
  "admin.adminOverviewPage.indicateursDeLaConsole": "Indicateurs de la console",
  "admin.adminOverviewPage.partitionnesParRole": "partitionnés par rôle",
  "admin.adminOverviewPage.filesOperationnelles": "Files opérationnelles",
  "admin.adminOverviewPage.aucunDossierEnAttente": "Aucun dossier en attente",
  "admin.adminPlanDraftModal.configurerLOffreDansUnBrouillon":
    "Configurer l’offre dans un brouillon",
  "admin.adminPlanDraftModal.prixQuotasFonctionnalitesEtEssaiSontVersionnesEnsembleLaVersion":
    "Prix, quotas, fonctionnalités et essai sont versionnés ensemble. La version publiée reste inchangée jusqu’à approbation.",
  "admin.adminPlanDraftModal.apercuAvantPublication":
    "Aperçu avant publication",
  "admin.adminPlanDraftModal.lesFonctionnalitesIncompletesOuEnMaintenanceSontExcluesDeCet":
    "Les fonctionnalités incomplètes ou en maintenance sont exclues de cet aperçu et ne seront pas accordées.",
  "admin.adminPlanDraftModal.presentationEtDisponibilite":
    "Présentation et disponibilité",
  "admin.adminPlanDraftModal.actifApresPublication": "Actif après publication",
  "admin.adminPlanDraftModal.offreRecommandee": "Offre recommandée",
  "admin.adminPlanDraftModal.categoriesCiblees": "Catégories ciblées",
  "admin.adminPlanDraftModal.tvaPointsDeBase": "TVA (points de base)",
  "admin.adminPlanDraftModal.debutDuPrix": "Début du prix",
  "admin.adminPlanDraftModal.finDuPrix": "Fin du prix",
  "admin.adminPlanDraftModal.quotasEtFonctionnalites":
    "Quotas et fonctionnalités",
  "admin.adminPlanDraftModal.cesValeursAlimententLaComparaisonLUsageEtLesControles":
    "Ces valeurs alimentent la comparaison, l’usage et les contrôles serveur.",
  "admin.adminPlanDraftModal.disponibilite": "Disponibilité",
  "admin.adminPlanDraftModal.active": "Activé",
  "admin.adminPlanDraftModal.beta": "Bêta",
  "admin.adminPlanDraftModal.booleen": "Booléen",
  "admin.adminPlanDraftModal.credit": "Crédit",
  "admin.adminPlanDraftModal.permissionCiblee": "Permission ciblée",
  "admin.adminPlanDraftModal.dependances": "Dépendances",
  "admin.adminPlanDraftModal.essaiEtTransitions": "Essai et transitions",
  "admin.adminPlanDraftModal.essaiActive": "Essai activé",
  "admin.adminPlanDraftModal.dureeJours": "Durée (jours)",
  "admin.adminPlanDraftModal.moyenDePaiementRequis": "Moyen de paiement requis",
  "admin.adminPlanDraftModal.marchesEligibles": "Marchés éligibles",
  "admin.adminPlanDraftModal.audiencesEligibles": "Audiences éligibles",
  "admin.adminPlanDraftModal.debutDeCampagneDEssai":
    "Début de campagne d’essai",
  "admin.adminPlanDraftModal.finDeCampagneDEssai": "Fin de campagne d’essai",
  "admin.adminPlanDraftModal.monteesAutorisees": "Montées autorisées",
  "admin.adminPlanDraftModal.baissesAutorisees": "Baisses autorisées",
  "admin.adminPlanDraftModal.activationPlanifiee": "Activation planifiée",
  "admin.adminRolesMatrixPage.spectreDElevationDesPrivileges":
    "Spectre d'Élévation des Privilèges (",
  "admin.adminRolesMatrixPage.rolesDefinis": "Rôles Définis)",
  "admin.adminRolesMatrixPage.categorie": "Catégorie :",
  "admin.adminSolutionsPage.catalogueDesSolutionsConsoleShongre":
    "Catalogue des solutions — Console Shongre",
  "admin.adminSolutionsPage.gouvernanceDuCycleDeVieEtDesDestinationsDesApplications":
    "Gouvernance du cycle de vie et des destinations des applications Shongre.",
  "admin.adminSolutionsPage.catalogueDesSolutions": "Catalogue des solutions",
  "admin.adminSolutionsPage.pilotezLaVisibiliteLesDestinationsEtLeCycleDeVie":
    "Pilotez la visibilité, les destinations et le cycle de vie des applications Shongre.",
  "admin.adminSolutionsPage.resumeDuCatalogue": "Résumé du catalogue",
  "admin.adminSolutionsPage.toutesLesSolutions": "Toutes les solutions",
  "admin.adminSolutionsPage.rechercherUneSolution": "Rechercher une solution",
  "admin.adminSolutionsPage.filtrerParCycleDeVie": "Filtrer par cycle de vie",
  "admin.adminSolutionsPage.marches": "Marchés",
  "admin.adminSolutionsPage.icone": "Icône",
  "admin.adminSolutionsPage.disponibleAPartirDu": "Disponible à partir du",
  "admin.adminSolutionsPage.disponibleJusquAu": "Disponible jusqu’au",
  "admin.adminSolutionsPage.solutionDeRemplacement": "Solution de remplacement",
  "admin.adminSolutionsPage.descriptionComplete": "Description complète",
  "admin.adminSolutionsPage.messageDeMaintenance": "Message de maintenance",
  "admin.adminSolutionsPage.lesNomsDHoteSontResolusParLaConfigurationD":
    "Les noms d’hôte sont résolus par la configuration d’exécution. Ils ne sont pas modifiables ici.",
  "admin.adminSolutionsPage.cheminDeLancement": "Chemin de lancement",
  "admin.adminSolutionsPage.derniereNoteDeVersionFacultatif":
    "Dernière note de version (facultatif)",
  "admin.adminSolutionsPage.titreDeLaNote": "Titre de la note",
  "admin.adminSolutionsPage.dateDePublication": "Date de publication",
  "admin.adminSolutionsPage.contenuDeLaNote": "Contenu de la note",
  "admin.adminSolutionsPage.retirerCetteNote": "Retirer cette note",
  "admin.adminSolutionsPage.faireEvoluerLeCycleDeVie":
    "Faire évoluer le cycle de vie",
  "admin.adminSolutionsPage.nouveauCycleDeVie": "Nouveau cycle de vie",
  "admin.adminSolutionsPage.motifOperationnel10CaracteresMinimum":
    "Motif opérationnel (10 caractères minimum)",
  "admin.adminSolutionsPage.appliquerLaTransition": "Appliquer la transition",
  "admin.adminSolutionsPage.aucuneTransitionEnregistree":
    "Aucune transition enregistrée.",
  "admin.adminSupportPage.fileOperationnelleDesDemandesDAssistanceShongre":
    "File opérationnelle des demandes d’assistance Shongre.",
  "admin.adminSupportPage.slaDepasse": "SLA dépassé",
  "admin.adminSupportPage.nonAffectes": "Non affectés",
  "admin.adminSupportPage.operationsSupport": "Opérations Support",
  "admin.adminSupportPage.affectationReponsesClientNotesInternesEtSuiviDesEngagementsDe":
    "Affectation, réponses client, notes internes et suivi des engagements de service.",
  "admin.adminSupportPage.filtrerParStatut": "Filtrer par statut",
  "admin.adminSupportPage.aucunDossierDansCetteFile":
    "Aucun dossier dans cette file",
  "admin.adminSupportPage.selectionnezUnDossier": "Sélectionnez un dossier.",
  "admin.adminTaxonomyPage.brouillonSAPublier": "brouillon(s) à publier",
  "admin.adminTaxonomyPage.arborescenceNoeuds": "Arborescence & Nœuds",
  "admin.adminTaxonomyPage.registreDesAttributs": "Registre des Attributs",
  "admin.adminTaxonomyPage.schemaV4Migration": "Schéma v4 & Migration",
  "admin.adminTaxonomyPage.validationQualite": "Validation & Qualité",
  "admin.adminTrendingPage.tendancesDeLaPageDAccueil":
    "Tendances de la page d’accueil",
  "admin.adminTrendingPage.piloterLaSectionEnCeMomentSurShongre":
    "Piloter la section En ce moment sur Shongre.",
  "admin.adminTrendingPage.decouverteEditoriale": "Découverte éditoriale",
  "admin.adminTrendingPage.enCeMomentSurShongre": "En ce moment sur Shongre",
  "admin.adminTrendingPage.lesThemesSontCalculesAPartirDeLActiviteDu":
    "Les thèmes sont calculés à partir de l’activité du marché puis ajustés ici. Les données de classement restent internes à la console.",
  "admin.adminTrendingPage.reglesDAffichage": "Règles d’affichage",
  "admin.adminTrendingPage.modeDeSelection": "Mode de sélection",
  "admin.adminTrendingPage.annoncesParSousSection": "Annonces par sous-section",
  "admin.adminTrendingPage.maximumDeSousSections": "Maximum de sous-sections",
  "admin.adminTrendingPage.minimumDActivite": "Minimum d’activité",
  "admin.adminTrendingPage.periodeJours": "Période (jours)",
  "admin.adminTrendingPage.categoriesExcluesSlugsSeparesParDesVirgules":
    "Catégories exclues (slugs séparés par des virgules)",
  "admin.adminTrendingPage.apercuDuMarche": "Aperçu du marché",
  "admin.adminTrendingPage.sousSectionsAffichees": "sous-sections affichées",
  "admin.adminTrendingPage.annoncesTendance": "annonces · tendance",
  "admin.adminTrendingPage.epingle": "Épinglé",
  "admin.adminTrendingPage.editionEditorialeAvancee":
    "Édition éditoriale avancée",
  "admin.adminTrendingPage.titrePersonnalise": "Titre personnalisé",
  "admin.adminTrendingPage.scoreDeBoost01": "Score de boost (0–1)",
  "admin.adminTrendingPage.sousTitrePersonnalise": "Sous-titre personnalisé",
  "admin.adminTrendingPage.urlDeLImage": "URL de l’image",
  "admin.adminTrendingPage.debutProgramme": "Début programmé",
  "admin.adminTrendingPage.finProgrammee": "Fin programmée",
  "admin.adminTrendingPage.aucunThemeNeRemplitLesCriteresActuels":
    "Aucun thème ne remplit les critères actuels.",
  "admin.adminTrendingPage.overridesSansCode": "overrides sans code",
  "admin.adminUsersPage.tousLesRoles": "Tous les rôles (",
  "admin.adminUsersPage.exExamenTermineEtMesuresCorrectivesConfirmees":
    "Ex. Examen terminé et mesures correctives confirmées",
  "admin.adminVerificationsPage.conformiteProgressiveAdministrationShongre":
    "Conformité progressive | Administration Shongre",
  "admin.adminVerificationsPage.revueManuellePolitiquesEtAuditDeConformite":
    "Revue manuelle, politiques et audit de conformité.",
  "admin.adminVerificationsPage.accesConformiteRestreint":
    "Accès conformité restreint",
  "admin.adminVerificationsPage.verificationsReglesEtRevueHumaine":
    "Vérifications, règles et revue humaine",
  "admin.adminVerificationsPage.lesAgentsVoientLesStatutsNecessairesALeurMissionLes":
    "Les agents voient les statuts nécessaires à leur mission. Les documents, numéros fiscaux, coordonnées bancaires et scores de risque ne sont pas exposés dans cette file générale.",
  "admin.adminVerificationsPage.sectionsDeConformite": "Sections de conformité",
  "admin.adminVerificationsPage.registreDesRegles": "Registre des règles",
  "admin.adminVerificationsPage.dossiersNecessitantUneDecision":
    "Dossiers nécessitant une décision",
  "admin.adminVerificationsPage.touteDecisionExigeUnMotifEtResteTracable":
    "Toute décision exige un motif et reste traçable.",
  "admin.adminVerificationsPage.aucunDossierEnAttente":
    "Aucun dossier en attente.",
  "admin.adminVerificationsPage.registreVersionne": "Registre versionné",
  "admin.adminVerificationsPage.lesModificationsJuridiquesSontPlanifieesSourceesEtAuditeesCoteServeur":
    "Les modifications juridiques sont planifiées, sourcées et auditées côté serveur.",
  "admin.adminVerificationsPage.evenementsDeConformite":
    "Événements de conformité",
  "admin.adminVerificationsPage.lesValeursSensiblesEtReponsesBrutesDesPrestatairesSontExclues":
    "Les valeurs sensibles et réponses brutes des prestataires sont exclues.",
  "admin.adminVerificationsPage.referenceUtilisateur":
    "· Référence utilisateur :",
  "admin.adminVerificationsPage.decisionMotivee": "Décision motivée",
  "admin.adminVerificationsPage.decrivezLesElementsControlesEtLaJustificationDeLaDecision":
    "Décrivez les éléments contrôlés et la justification de la décision.",
  "admin.employmentAdminPage.configurationConformiteCatalogueEtOperationsDuVerticalShongreEmploi":
    "Configuration, conformité, catalogue et opérations du vertical Shongre Emploi.",
  "admin.employmentAdminPage.schemaV": "Schéma v",
  "admin.employmentAdminPage.pilotageDuMarche": "Pilotage du marché",
  "admin.employmentAdminPage.sansDupliquerLaCategorieCanoniqueEmploi":
    ", sans dupliquer la catégorie canonique « Emploi ».",
  "admin.employmentAdminPage.configurationDuMarche": "Configuration du marché",
  "admin.employmentAdminPage.dureeDePublicationJours":
    "Durée de publication (jours)",
  "admin.employmentAdminPage.retentionDesBrouillonsJours":
    "Rétention des brouillons (jours)",
  "admin.employmentAdminPage.retentionDesCandidaturesJours":
    "Rétention des candidatures (jours)",
  "admin.employmentAdminPage.delaiAvantNouvelleCandidatureJours":
    "Délai avant nouvelle candidature (jours)",
  "admin.employmentAdminPage.langageARevoir": "Langage à revoir",
  "admin.employmentAdminPage.principesDeConformite": "Principes de conformité",
  "admin.employmentAdminPage.donneesCandidatsPriveesEtRlsParDefaut":
    "Données candidats privées et RLS par défaut",
  "admin.employmentAdminPage.aucuneDecisionJuridiqueAutomatique":
    "Aucune décision juridique automatique",
  "admin.employmentAdminPage.aucunAttributSensibleDansLeClassement":
    "Aucun attribut sensible dans le classement",
  "admin.employmentAdminPage.aucunPaiementDemandeAuxCandidats":
    "Aucun paiement demandé aux candidats",
  "admin.employmentAdminPage.retentionEtConsentementsVersionnes":
    "Rétention et consentements versionnés",
  "admin.employmentAdminPage.catalogueDesOffresEmployeur":
    "Catalogue des offres employeur",
  "admin.employmentAdminPage.valeursActivesCouvrantSecteursFamillesMetiersCompetencesContratsRythmesDiplomes":
    "valeurs actives couvrant secteurs, familles, métiers, compétences, contrats, rythmes, diplômes et langues.",
  "admin.financeRevenueTrendChart.evolutionDesRevenus": "Évolution des revenus",
  "admin.financeRevenueTrendChart.revenusReconnusHorsTvaEtFondsVendeurs":
    "Revenus reconnus, hors TVA et fonds vendeurs.",
  "admin.financeRevenueTrendChart.legendeDuGraphique": "Légende du graphique",
  "admin.financeRevenueTrendChart.aucuneDonneeDeRevenusDisponiblePourCettePeriode":
    "Aucune donnée de revenus disponible pour cette période.",
  "admin.financeRevenueTrendChart.donneesDuGraphiqueDEvolutionDesRevenus":
    "Données du graphique d’évolution des revenus",
  "admin.homepageConfigurationPanel.chargementDeLaPageDAccueil":
    "Chargement de la page d’accueil…",
  "admin.homepageConfigurationPanel.configurationCentralisee":
    "Configuration centralisée",
  "admin.homepageConfigurationPanel.revision": "· révision",
  "admin.homepageConfigurationPanel.nombreMaximalDElements":
    "Nombre maximal d’éléments",
  "admin.homepageConfigurationPanel.visibleSurMobile": "Visible sur mobile",
  "admin.homepageConfigurationPanel.visibleSurDesktop": "Visible sur desktop",
  "admin.homepageConfigurationPanel.reglesDEligibiliteDesOffres":
    "Règles d’éligibilité des offres",
  "admin.homepageConfigurationPanel.inclureLesVendeursProfessionnels":
    "Inclure les vendeurs professionnels",
  "admin.homepageConfigurationPanel.marchesAutorisesCodesSeparesParDesVirgules":
    "Marchés autorisés (codes séparés par des virgules)",
  "admin.homepageConfigurationPanel.branchesTaxonomiquesAutoriseesSlugsSeparesParDesVirgules":
    "Branches taxonomiques autorisées (slugs séparés par des virgules)",
  "admin.homepageConfigurationPanel.annoncesManuellesEpingleesIdentifiantsSeparesParDesVirgules":
    "Annonces manuelles/épinglées (identifiants séparés par des virgules)",
  "admin.homepageConfigurationPanel.annoncesAMasquerIdentifiantsSeparesParDesVirgules":
    "Annonces à masquer (identifiants séparés par des virgules)",
  "admin.homepageConfigurationPanel.programmationDesOverridesDAnnonces":
    "Programmation des overrides d’annonces",
  "admin.homepageConfigurationPanel.apercuDeLaPageComplete":
    "Aperçu de la page complète",
  "admin.homepageConfigurationPanel.resolutionReelleDuBrouillonPour":
    "Résolution réelle du brouillon pour",
  "admin.homepageConfigurationPanel.viewportDePrevisualisation":
    "Viewport de prévisualisation",
  "admin.homepageConfigurationPanel.lancezLApercuPourResoudreLeContenu":
    "Lancez l’aperçu pour résoudre le contenu.",
  "admin.homepageConfigurationPanel.motifDeModificationPublication":
    "Motif de modification / publication",
  "admin.homepageConfigurationPanel.expliquezLeChangementPourLHistoriqueDAudit":
    "Expliquez le changement pour l’historique d’audit.",
  "admin.homepageConfigurationPanel.lesVersionsPublieesSontHistoriseesAvecLActeurLeMarche":
    "Les versions publiées sont historisées avec l’acteur, le marché, la langue et le motif. La publication n’invente ni remise ni disponibilité : les offres sont recalculées depuis les données éligibles.",
  "admin.crmAutomationsPage.workflowsEtSequencesCrm":
    "Workflows et séquences CRM.",
  "admin.crmAutomationsPage.workflowsEvenementielsEtSequencesCommercialesAvecGardeFous":
    "Workflows événementiels et séquences commerciales avec garde-fous.",
  "admin.crmAutomationsPage.activezDAbordUnWorkerDAutomatisationBackend":
    "Activez d’abord un worker d’automatisation backend",
  "admin.crmAutomationsPage.moteurNonActiveDansCetEnvironnement":
    "Moteur non activé dans cet environnement",
  "admin.crmAutomationsPage.leModelePersistantLIsolationTenantLesExecutionsIdempotentesEt":
    "Le modèle persistant, l’isolation tenant, les exécutions idempotentes et la file de reprise sont provisionnés. Aucun workflow n’est exécutable tant qu’un worker CRM explicite et ses fournisseurs autorisés ne sont pas actifs. Cette interface ne simule pas une exécution de production.",
  "admin.crmAutomationsPage.reglesDActivation": "Règles d’activation",
  "admin.crmAutomationsPage.consommationDeLaQueueAvecRetriesBornesEtDeadLetter":
    "Consommation de la queue avec retries bornés et dead-letter.",
  "admin.crmAutomationsPage.aucunEmailOuAppelSansConnexionAutorisee":
    "Aucun email ou appel sans connexion autorisée.",
  "admin.crmAutomationsPage.arretSurOptOutRefusOuStatutNePasContacter":
    "Arrêt sur opt-out, refus ou statut ne pas contacter.",
  "admin.crmAutomationsPage.lesActionsARisqueRestentSoumisesAApprobation":
    "Les actions à risque restent soumises à approbation.",
  "admin.crmCompaniesPage.rechercherUneEntreprise": "Rechercher une entreprise",
  "admin.crmCompaniesPage.nomDomaineOuSecteur": "Nom, domaine ou secteur…",
  "admin.crmCompaniesPage.vueEnregistree": "Vue enregistrée",
  "admin.crmCompaniesPage.supprimerLaVueSelectionnee":
    "Supprimer la vue sélectionnée",
  "admin.crmCompaniesPage.enregistrerLaVue": "Enregistrer la vue",
  "admin.crmCompaniesPage.aucuneEntrepriseDansCetteVue":
    "Aucune entreprise dans cette vue",
  "admin.crmCompaniesPage.modifiezLesFiltresOuCreezUneNouvelleFiche":
    "Modifiez les filtres ou créez une nouvelle fiche.",
  "admin.crmCompaniesPage.proprietaire": "Propriétaire",
  "admin.crmCompaniesPage.resultat": "résultat",
  "admin.crmCompaniesPage.isolationParTenantActive":
    "Isolation par tenant active",
  "admin.crmCompaniesPage.creerUneEntreprise": "Créer une entreprise",
  "admin.crmCompaniesPage.ajoutezUnCompteCrmGeneriqueSansCreerDOrganisationShongre":
    "Ajoutez un compte CRM générique, sans créer d’organisation Shongre.",
  "admin.crmCompaniesPage.nomDeLEntreprise": "Nom de l’entreprise",
  "admin.crmCompaniesPage.conservezLaRechercheEtLeCycleDeVieActuellementAffiches":
    "Conservez la recherche et le cycle de vie actuellement affichés.",
  "admin.crmCompaniesPage.nomDeLaVue": "Nom de la vue",
  "admin.crmCompaniesPage.visibilite": "Visibilité",
  "admin.crmCompaniesPage.visibiliteDeLaVue": "Visibilité de la vue",
  "admin.crmCompaniesPage.partageeAvecLeWorkspace":
    "Partagée avec le workspace",
  "admin.crmCompaniesPage.supprimerCetteVue": "Supprimer cette vue ?",
  "admin.crmCompanyDetailPage.vueCompleteDuCompteCrm":
    "Vue complète du compte CRM.",
  "admin.crmCompanyDetailPage.cycleDeVieDeLEntreprise":
    "Cycle de vie de l’entreprise",
  "admin.crmCompanyDetailPage.opportunitesOuvertes": "Opportunités ouvertes",
  "admin.crmCompanyDetailPage.pipeline": "Pipeline",
  "admin.crmCompanyDetailPage.lectureDesDomainesCanoniquesLeCrmNeModifieNiAnnonces":
    "Lecture des domaines canoniques ; le CRM ne modifie ni annonces ni facturation.",
  "admin.crmCompanyDetailPage.synchroniseLe": "Synchronisé le",
  "admin.crmCompanyDetailPage.aucuneOrganisationShongreLiee":
    "Aucune organisation Shongre liée",
  "admin.crmCompanyDetailPage.cetteFicheResteUnCompteCrmAutonomeUneReferenceExterne":
    "Cette fiche reste un compte CRM autonome. Une référence externe vérifiée est requise avant d’afficher des données marketplace.",
  "admin.crmCompanyDetailPage.telephone": "· Téléphone",
  "admin.crmCompanyDetailPage.publiees": "publiées",
  "admin.crmCompanyDetailPage.periodeJusquAu": "Période jusqu’au",
  "admin.crmCompanyDetailPage.pipelineAssocieACeCompte":
    "Pipeline associé à ce compte",
  "admin.crmCompanyDetailPage.aucuneOpportuniteAssociee":
    "Aucune opportunité associée.",
  "admin.crmCompanyDetailPage.activiteRecente": "Activité récente",
  "admin.crmCompanyDetailPage.notesEtInteractionsDuCompte":
    "Notes et interactions du compte",
  "admin.crmCompanyDetailPage.aucuneActiviteEnregistree":
    "Aucune activité enregistrée.",
  "admin.crmCompanyDetailPage.personnesLiees": "Personnes liées",
  "admin.crmCompanyDetailPage.aucunContactLie": "Aucun contact lié.",
  "admin.crmCompanyDetailPage.donneeDeclarativeAucuneGeolocalisationImplicite":
    "Donnée déclarative · aucune géolocalisation implicite",
  "admin.crmCompanyDetailPage.ajouterUneNoteEntreprise":
    "Ajouter une note entreprise",
  "admin.crmCompanyDetailPage.laNoteEstAjouteeALHistoriqueCrmDuCompte":
    "La note est ajoutée à l’historique CRM du compte.",
  "admin.crmCompanyDetailPage.gererLesTags": "Gérer les tags",
  "admin.crmCompanyDetailPage.lesTagsSontNormalisesDansLeCatalogueDuTenantEt":
    "Les tags sont normalisés dans le catalogue du tenant et utilisables dans les filtres CRM.",
  "admin.crmCompanyDetailPage.tagsSeparesParDesVirgules":
    "Tags séparés par des virgules",
  "admin.crmCompanyDetailPage.compteCleMobilierRelanceQ4":
    "Compte clé, Mobilier, Relance Q4",
  "admin.crmConfigurationPage.configurationDuTenantCrm":
    "Configuration du tenant CRM.",
  "admin.crmConfigurationPage.parametresPropresAuTenantLesSecretsFournisseursRestentDansLe":
    "Paramètres propres au tenant. Les secrets fournisseurs restent dans le backend et ne sont jamais exposés à cette interface.",
  "admin.crmContactDetailPage.vueCompleteDuContactCrm":
    "Vue complète du contact CRM.",
  "admin.crmContactDetailPage.tache2": "Tâche",
  "admin.crmContactDetailPage.pipelineOuvert": "Pipeline ouvert",
  "admin.crmContactDetailPage.tachesOuvertes": "Tâches ouvertes",
  "admin.crmContactDetailPage.interactionsImmuablesDuContact":
    "Interactions immuables du contact",
  "admin.crmContactDetailPage.opportunitesLiees": "Opportunités liées",
  "admin.crmContactDetailPage.influenceEtEngagementsEnCours":
    "Influence et engagements en cours",
  "admin.crmContactDetailPage.aucuneOpportuniteLiee":
    "Aucune opportunité liée.",
  "admin.crmContactDetailPage.donneesDuContact": "Données du contact",
  "admin.crmContactDetailPage.ajouterUneNote": "Ajouter une note",
  "admin.crmContactDetailPage.relancerPourConfirmerLeRendezVous":
    "Relancer pour confirmer le rendez-vous",
  "admin.crmContactsPage.personnesRolesEtConsentements":
    "Personnes, rôles et consentements ·",
  "admin.crmContactsPage.rechercherUnContact": "Rechercher un contact",
  "admin.crmContactsPage.nomEmailPosteOuEntreprise":
    "Nom, email, poste ou entreprise…",
  "admin.crmContactsPage.lesPreferencesDeContactSontAppliqueesAvantToutEnvoi":
    "Les préférences de contact sont appliquées avant tout envoi.",
  "admin.crmContactsPage.aucunContactTrouve": "Aucun contact trouvé",
  "admin.crmContactsPage.essayezUneAutreRechercheOuCreezUneFiche":
    "Essayez une autre recherche ou créez une fiche.",
  "admin.crmContactsPage.coordonnees": "Coordonnées",
  "admin.crmContactsPage.sansEntreprise": "Sans entreprise",
  "admin.crmContactsPage.deContact": "de contact",
  "admin.crmContactsPage.creerUnContact": "Créer un contact",
  "admin.crmContactsPage.laFicheResteDistincteDUnCompteUtilisateurShongre":
    "La fiche reste distincte d’un compte utilisateur Shongre.",
  "admin.crmContactsPage.entrepriseAssociee": "Entreprise associée",
  "admin.crmCustomFieldsPage.champsPersonnalisesCrmShongre":
    "Champs personnalisés CRM | Shongre",
  "admin.crmCustomFieldsPage.configurationDuModeleDeDonneesCrm":
    "Configuration du modèle de données CRM.",
  "admin.crmCustomFieldsPage.champsPersonnalises": "Champs personnalisés",
  "admin.crmCustomFieldsPage.etendezLeModeleSansModifierLesTablesOuLesComposants":
    "Étendez le modèle sans modifier les tables ou les composants.",
  "admin.crmCustomFieldsPage.entite": "Entité",
  "admin.crmCustomFieldsPage.aucunChampPersonnalise":
    "Aucun champ personnalisé",
  "admin.crmCustomFieldsPage.creerUnChamp": "Créer un champ",
  "admin.crmCustomFieldsPage.laCleDevientStableApresCreationEtSertAuxImports":
    "La clé devient stable après création et sert aux imports, vues et API.",
  "admin.crmCustomFieldsPage.cleApi": "Clé API",
  "admin.crmCustomFieldsPage.typeDeChamp": "Type de champ",
  "admin.crmCustomFieldsPage.optionsUneParLigne": "Options, une par ligne",
  "admin.crmOpportunityDetailPage.vueCommercialeCompleteDeLOpportunite":
    "Vue commerciale complète de l’opportunité.",
  "admin.crmOpportunityDetailPage.opportuniteIntrouvable":
    "Opportunité introuvable",
  "admin.crmOpportunityDetailPage.cloture": "Clôture",
  "admin.crmOpportunityDetailPage.deProbabilite": "% de probabilité",
  "admin.crmOpportunityDetailPage.gagnee": "Gagnée",
  "admin.crmOpportunityDetailPage.journalImmuableDesEchangesEtChangements":
    "Journal immuable des échanges et changements",
  "admin.crmOpportunityDetailPage.aucuneActivite": "Aucune activité",
  "admin.crmOpportunityDetailPage.lesAppelsEmailsNotesEtTransitionsApparaitrontIci":
    "Les appels, emails, notes et transitions apparaîtront ici.",
  "admin.crmOpportunityDetailPage.tachesLiees": "Tâches liées",
  "admin.crmOpportunityDetailPage.relancesEtProchainesEtapes":
    "Relances et prochaines étapes",
  "admin.crmOpportunityDetailPage.toutesLesTaches": "Toutes les tâches",
  "admin.crmOpportunityDetailPage.aucuneTacheAssociee":
    "Aucune tâche associée.",
  "admin.crmOpportunityDetailPage.propositionsChiffreesLieesALOpportunite":
    "Propositions chiffrées liées à l’opportunité",
  "admin.crmOpportunityDetailPage.aucunDevisAssocie": "Aucun devis associé.",
  "admin.crmOpportunityDetailPage.prochaineEtape": "Prochaine étape",
  "admin.crmOpportunityDetailPage.redigezUneRelanceOuResumezLHistoriqueAvecLeFournisseur":
    "Rédigez une relance ou résumez l’historique avec le fournisseur IA autorisé par votre tenant.",
  "admin.crmOpportunityDetailPage.aucunFournisseurIaPersonnelActifLeCrmResteEntierementFonctionnel":
    "Aucun fournisseur IA personnel actif. Le CRM reste entièrement fonctionnel sans IA.",
  "admin.crmOpportunityDetailPage.configurerLesFournisseurs":
    "Configurer les fournisseurs",
  "admin.crmOpportunityDetailPage.lEnvoiExigeUneConnexionMailboxOuEmailDeliveryExplicite":
    "L’envoi exige une connexion Mailbox ou Email Delivery explicite. Aucun fallback financé par Shongre.",
  "admin.crmOpportunityDetailPage.connecterUneMessagerie":
    "Connecter une messagerie",
  "admin.crmOpportunityDetailPage.laNoteSeraAjouteeALHistoriqueImmuableDeL":
    "La note sera ajoutée à l’historique immuable de l’opportunité.",
  "admin.crmOpportunityDetailPage.decisionsObjectionsEngagementsOuProchaineEtape":
    "Décisions, objections, engagements ou prochaine étape…",
  "admin.crmOpportunityDetailPage.creerUnDevis": "Créer un devis",
  "admin.crmOpportunityDetailPage.lesTotauxEtTaxesSontCalculesEnUnitesMonetairesMineures":
    "Les totaux et taxes sont calculés en unités monétaires mineures côté service.",
  "admin.crmOpportunityDetailPage.produitDuDevis": "Produit du devis",
  "admin.crmOpportunityDetailPage.selectionner": "Sélectionner…",
  "admin.crmOpportunityDetailPage.valableJusquAu": "Valable jusqu’au",
  "admin.crmOpportunityDetailPage.tvaDeDemonstration20LeBackendResteAutoritaireSurLes":
    "TVA de démonstration : 20 %. Le backend reste autoritaire sur les totaux.",
  "admin.crmOpportunityDetailPage.ceProduitNAPasDePrixActif":
    "Ce produit n’a pas de prix actif.",
  "admin.crmOpportunityDetailPage.contratDe": "Contrat de",
  "admin.crmOpportunityDetailPage.laClotureEstAuditeeEtPrepareLOnboardingSansModifier":
    "La clôture est auditée et prépare l’onboarding sans modifier la source de vérité Billing.",
  "admin.crmOpportunityDetailPage.motifDePerte": "Motif de perte",
  "admin.crmOpportunityDetailPage.calendrierReporte": "Calendrier reporté",
  "admin.crmOpportunityDetailPage.besoinNonConfirme": "Besoin non confirmé",
  "admin.crmOpportunityDetailPage.absenceDeReponse": "Absence de réponse",
  "admin.crmOpportunityDetailPage.precisions": "Précisions",
  "admin.crmOverviewPage.chargementDuTableauDeBordCrm":
    "Chargement du tableau de bord CRM",
  "admin.crmOverviewPage.tableauDeBordIndisponible":
    "Tableau de bord indisponible",
  "admin.crmOverviewPage.pipelinePondere": "Pipeline pondéré",
  "admin.crmOverviewPage.aTraiter": "À traiter",
  "admin.crmOverviewPage.donneesSynchronisees": "Données synchronisées",
  "admin.crmOverviewPage.pipelinePrevisionsTachesEtComptesClesReunisDansUnEspace":
    "Pipeline, prévisions, tâches et comptes clés réunis dans un espace tenant-isolé.",
  "admin.crmOverviewPage.prospectionAssistee": "Prospection assistée",
  "admin.crmOverviewPage.pipelineCommercial": "Pipeline commercial",
  "admin.crmOverviewPage.repartitionPondereeParEtape":
    "Répartition pondérée par étape",
  "admin.crmOverviewPage.ouvrirLePipeline": "Ouvrir le pipeline",
  "admin.crmOverviewPage.previsionCommit": "Prévision commit",
  "admin.crmOverviewPage.revenuGagne": "Revenu gagné",
  "admin.crmOverviewPage.priorites": "Priorités",
  "admin.crmOverviewPage.opportunitesASuivre": "Opportunités à suivre",
  "admin.crmOverviewPage.dossiersOuvertsTriesParDerniereActivite":
    "Dossiers ouverts, triés par dernière activité",
  "admin.crmOverviewPage.rechercherDansLesOpportunites":
    "Rechercher dans les opportunités",
  "admin.crmOverviewPage.opportunite": "Opportunité",
  "admin.crmOverviewPage.etape": "Étape",
  "admin.crmOverviewPage.probabilite": "Probabilité",
  "admin.crmOverviewPage.aucuneOpportuniteNeCorrespondACetteRecherche":
    "Aucune opportunité ne correspond à cette recherche.",
  "admin.crmOverviewPage.previsionDeterministeAucuneDonneeEnvoyeeAUnFournisseurIa":
    "Prévision déterministe · aucune donnée envoyée à un fournisseur IA",
  "admin.crmOverviewPage.afficherLePipelineComplet":
    "Afficher le pipeline complet",
  "admin.crmPipelinePage.chargementDuPipelineCrm": "Chargement du pipeline CRM",
  "admin.crmPipelinePage.opportunites": "opportunités ·",
  "admin.crmPipelinePage.pipelineActif": "Pipeline actif",
  "admin.crmPipelinePage.rechercherUneOpportunite":
    "Rechercher une opportunité",
  "admin.crmPipelinePage.rechercherUneOpportuniteOuUneEntreprise":
    "Rechercher une opportunité ou une entreprise…",
  "admin.crmPipelinePage.utilisezLesFlechesSurChaqueCartePourDeplacerSansGlisser":
    "Utilisez les flèches sur chaque carte pour déplacer sans glisser-déposer.",
  "admin.crmPipelinePage.colonnesDuPipelineCommercial":
    "Colonnes du pipeline commercial",
  "admin.crmPipelinePage.creerUneOpportunite": "Créer une opportunité",
  "admin.crmPipelinePage.nomDeLOpportunite": "Nom de l’opportunité",
  "admin.crmPipelinePage.cloturePrevue": "Clôture prévue",
  "admin.crmPipelinePage.cetteTransitionEstAuditeeEtMetAJourLesPrevisions":
    "Cette transition est auditée et met à jour les prévisions commerciales.",
  "admin.crmPipelinePage.aPlanifier": "À planifier",
  "admin.crmPipelinePage.pretADemarrer": "Prêt à démarrer",
  "admin.crmPipelinePage.contexteConcurrentOuProchaineFenetreDeContact":
    "Contexte, concurrent ou prochaine fenêtre de contact…",
  "admin.crmPipelineSettingsPage.configurationDesEtapesCrm":
    "Configuration des étapes CRM.",
  "admin.crmPipelineSettingsPage.nouvelleEtape": "Nouvelle étape",
  "admin.crmPipelineSettingsPage.pipelinesEtapes": "Pipelines & étapes",
  "admin.crmPipelineSettingsPage.nouveauPipeline": "Nouveau pipeline",
  "admin.crmPipelineSettingsPage.lesEtapesProbabilitesEtEtatsTerminauxSontConfiguresParTenant":
    "Les étapes, probabilités et états terminaux sont configurés par tenant, puis validés atomiquement côté backend.",
  "admin.crmPipelineSettingsPage.parDefaut": "Par défaut",
  "admin.crmPipelineSettingsPage.gagne": "Gagné",
  "admin.crmPipelineSettingsPage.lesMisesAJourUtilisentUnControleDeVersionUne":
    "Les mises à jour utilisent un contrôle de version. Une étape déjà utilisée ne peut pas être supprimée.",
  "admin.crmPipelineSettingsPage.definissezUnParcoursOrdonneAvecUneIssueGagneeEtUne":
    "Définissez un parcours ordonné avec une issue gagnée et une issue perdue.",
  "admin.crmPipelineSettingsPage.pipelineParDefaut": "Pipeline par défaut",
  "admin.crmPipelineSettingsPage.etapesOrdonnees": "Étapes ordonnées",
  "admin.crmPipelineSettingsPage.ajouterUneEtape": "Ajouter une étape",
  "admin.crmProductsPage.catalogueCommercialEtTarifsCrm":
    "Catalogue commercial et tarifs CRM.",
  "admin.crmProductsPage.uneSourceCommercialeIndependanteDeLaFacturationShongre":
    "Une source commerciale indépendante de la facturation Shongre.",
  "admin.crmProductsPage.rechercherUnProduit": "Rechercher un produit",
  "admin.crmProductsPage.nomOuSku": "Nom ou SKU…",
  "admin.crmProductsPage.aucunProduit": "Aucun produit",
  "admin.crmProductsPage.creezLePremierProduitDuCatalogueCommercial":
    "Créez le premier produit du catalogue commercial.",
  "admin.crmProductsPage.creerUnProduit": "Créer un produit",
  "admin.crmProductsPage.lePrixEstStockeEnUniteMonetaireMineureEtAssocie":
    "Le prix est stocké en unité monétaire mineure et associé au marché actif.",
  "admin.crmProductsPage.typeDeProduit": "Type de produit",
  "admin.crmProductsPage.intervalleDeFacturation": "Intervalle de facturation",
  "admin.crmProviderSettingsPage.connexionsFournisseursPartageesDuCrm":
    "Connexions fournisseurs partagées du CRM.",
  "admin.crmProviderSettingsPage.leCrmReutiliseLaPlateformeFournisseurShongreUneConnexionPersonnelle":
    "Le CRM réutilise la plateforme fournisseur Shongre. Une connexion personnelle autorisée prévaut sur celle du tenant, puis un éventuel fallback plateforme explicitement permis. Les credentials saisis sont envoyés au coffre backend, jamais persistés dans le navigateur ni retournés par l’API.",
  "admin.crmProviderSettingsPage.references": "Référencés",
  "admin.crmProviderSettingsPage.implementes": "Implémentés",
  "admin.crmProviderSettingsPage.operationnels": "Opérationnels",
  "admin.crmProviderSettingsPage.connexionsDuTenantEtConnexionsPersonnellesDuCompteCourantUniquement":
    "Connexions du tenant et connexions personnelles du compte courant uniquement.",
  "admin.crmProviderSettingsPage.credentialConfigure": "Credential configuré",
  "admin.crmProviderSettingsPage.registrePartage": "Registre partagé",
  "admin.crmProviderSettingsPage.capacitesDeclareesEtEtatRuntimeVerifiable":
    "Capacités déclarées et état runtime vérifiable.",
  "admin.crmProviderSettingsPage.santeRuntime": "Santé runtime",
  "admin.crmProviderSettingsPage.preparation": "Préparation",
  "admin.crmProviderSettingsPage.resolutionFailClosed":
    "Résolution fail-closed.",
  "admin.crmProviderSettingsPage.enModeApiUneCapaciteSansConnexionActiveEtAutorisee":
    "En mode API, une capacité sans connexion active et autorisée échoue explicitement ; elle n’utilise jamais le fournisseur démo ni des crédits Shongre silencieux.",
  "admin.crmProviderSettingsPage.laConnexionResteEnBrouillonTantQuUnAdapterEt":
    "La connexion reste en brouillon tant qu’un adapter et un test de validation ne l’ont pas activée.",
  "admin.crmProviderSettingsPage.nomDeLaConnexion": "Nom de la connexion",
  "admin.crmProviderSettingsPage.lAncienCredentialEstRevoqueAtomiquementLaConnexionRepasseEn":
    "L’ancien credential est révoqué atomiquement. La connexion repasse en brouillon jusqu’à validation.",
  "admin.crmReportsPage.indicateursCalculesDepuisLesOpportunitesEtTachesDuTenant":
    "Indicateurs calculés depuis les opportunités et tâches du tenant.",
  "admin.crmReportsPage.entonnoirParEtape": "Entonnoir par étape",
  "admin.crmReportsPage.pondere": "Pondéré :",
  "admin.crmReportsPage.execution": "Exécution",
  "admin.crmReportsPage.resultats": "Résultats",
  "admin.crmTasksPage.tachesCrmShongre": "Tâches CRM | Shongre",
  "admin.crmTasksPage.planificationEtSuiviDesRelancesCommerciales":
    "Planification et suivi des relances commerciales.",
  "admin.crmTasksPage.crmExecution": "CRM · Exécution",
  "admin.crmTasksPage.tachesRelances": "Tâches & relances",
  "admin.crmTasksPage.uneFileDActionPartageeRelieeAuxComptesEtOpportunites":
    "Une file d’action partagée, reliée aux comptes et opportunités.",
  "admin.crmTasksPage.aFaire": "À faire",
  "admin.crmTasksPage.terminees": "Terminées",
  "admin.crmTasksPage.filtrerLesTaches": "Filtrer les tâches",
  "admin.crmTasksPage.lesProchainesActionsCommercialesApparaitrontIci":
    "Les prochaines actions commerciales apparaîtront ici.",
  "admin.crmTasksPage.planifiezUneActionEtRattachezLaAuBonContexteCrm":
    "Planifiez une action et rattachez-la au bon contexte CRM.",
  "admin.crmTasksPage.relancerApresLaDemonstration":
    "Relancer après la démonstration",
  "admin.crmTasksPage.typeDeRelation": "Type de relation",
  "admin.crmTasksPage.aucune": "Aucune",
  "admin.crmTasksPage.elementLie": "Élément lié",
  "admin.adminProviderDetailPage.modifieLe": "Modifié le :",
  "admin.adminProviderDetailPage.actifPriorite": "Actif (Priorité",
  "admin.adminProviderDetailPage.capacitesCataloguees":
    "Capacités cataloguées :",
  "admin.adminProvidersPage.inventaireDeCodeConfigurationRuntimeEtPreuvesDeSanteSans":
    "Inventaire de code, configuration runtime et preuves de santé — sans confondre démo, implémentation et production.",
  "admin.adminProvidersPage.leControlPlaneBackendNEstPasJoignable":
    "Le control plane backend n’est pas joignable :",
  "admin.adminProvidersPage.catalogueDesIntegrations":
    "Catalogue des intégrations (",
  "admin.adminProvidersPage.leBackendExecuteUniquementUnProbeNonDestructifEnregistreEn":
    "Le backend exécute uniquement un probe non destructif enregistré. En mode démo, aucun fournisseur externe n’est contacté.",
  "admin.adminProvidersPage.capacitesAnnoncees": "Capacités annoncées :",
  "admin.providerAuditLogsTab.evenementS": "événement(s)",
  "admin.providerCatalogTable.filtrerParEtatDeSante":
    "Filtrer par état de santé",
  "admin.providerCatalogTable.integrationSSur": "intégration(s) sur",
  "admin.providerCatalogTable.capacitesViseesImplementees":
    "Capacités visées / implémentées",
  "admin.providerCatalogTable.demoUniquement": "Démo uniquement",
  "admin.providerCatalogTable.implementeNonVerifie": "Implémenté · non vérifié",
  "admin.providerCatalogTable.nonImplemente": "Non implémenté",
  "admin.providerConfigurationForm.autoriseUniquementLAdaptateurDisponibleDansCetEnvironnementNeProuve":
    "Autorise uniquement l’adaptateur disponible dans cet environnement ; ne prouve pas sa santé.",
  "admin.providerConfigurationForm.valeurNonExposeeLeBackendDeriveCeStatutDepuisLe":
    "Valeur non exposée. Le backend dérive ce statut depuis le gestionnaire de secrets ; il ne peut pas être déclaré « configuré » depuis ce formulaire.",
  "admin.providerHealthSimulator.santeFondeeSurDesPreuves":
    "Santé fondée sur des preuves",
  "admin.providerHealthSimulator.laSanteVientDUnProbeLiveOuDUn":
    "La santé vient d’un probe live ou d’un signal runtime. Elle ne peut pas être modifiée manuellement.",
  "admin.providerHealthSimulator.implementation": "Implémentation",
  "admin.providerHealthSimulator.capacitesImplementees":
    "Capacités implémentées",
  "admin.providerHealthSimulator.dernierePreuve": "Dernière preuve",
  "admin.providerHealthSimulator.testDIntegrationSur": "Test d’intégration sûr",
  "admin.providerHealthSimulator.executeUniquementUnProbeNonDestructifEnregistreCoteBackendAucun":
    "Exécute uniquement un probe non destructif enregistré côté backend. Aucun paiement, email ou webhook fictif n’est créé.",
  "admin.providerHealthSimulator.lancerLeDiagnostic": "Lancer le diagnostic",
  "admin.providerMarketMatrix.chaqueCelluleResulteDUneAffectationPropreAuMarcheUne":
    "Chaque cellule résulte d'une affectation propre au marché. Une cellule non configurée reste indisponible et ne reprend jamais le fournisseur d'un autre pays.",
  "admin.providerMarketMatrix.tousLesDomaines": "Tous les domaines (",
  "admin.providerMarketMatrix.preuveLiveVerifiee": "Preuve live vérifiée",
  "admin.providerMarketMatrix.affectationNonVerifiee":
    "Affectation non vérifiée",
  "admin.providerMarketMatrix.simulationDemo": "Simulation démo",
  "admin.providerMarketMatrix.aucunAdaptateur": "Aucun adaptateur",
  "admin.providerMarketOverridesTab.affecte": "Affecté",
  "admin.providerMarketOverridesTab.marcheParDefaut": "(marché par défaut)",
  "admin.providerMarketOverridesTab.valeursAfficheesUniquementATitreDeComparaisonEllesNeSe":
    "Valeurs affichées uniquement à titre de comparaison. Elles ne se propagent à aucun autre marché.",
  "admin.providerMarketOverridesTab.aucuneAffectation": "Aucune affectation",
  "admin.providerMarketOverridesTab.attentionLePrestataire":
    "Attention : Le prestataire",
  "admin.providerMarketOverridesTab.neSupportePasOfficiellementLePays":
    "ne supporte pas officiellement le pays",
  "admin.providerOverviewDashboard.avecAdaptateur": "avec adaptateur",
  "admin.providerOverviewDashboard.pretsPourProduction":
    "Prêts pour production",
  "admin.providerOverviewDashboard.categories": "catégories",
  "admin.providerRoutingManager.seulsLesAdaptateursCompatiblesConfiguresEtVerifiesPeuventDevenirPrimaire":
    "Seuls les adaptateurs compatibles, configurés et vérifiés peuvent devenir primaire ou secours.",
  "admin.providerRoutingManager.aucunFournisseurVerifie":
    "Aucun fournisseur vérifié",
  "admin.providerRoutingManager.aucunSecoursVerifie": "Aucun secours vérifié",
  "admin.taxonomyAttributeRegistryTab.gerezLeDictionnaireDes":
    "Gérez le dictionnaire des",
  "admin.taxonomyAttributeRegistryTab.attributsNormalisesPartagesEntreLesDifferentesCategories":
    "attributs normalisés partagés entre les différentes catégories.",
  "admin.taxonomyAttributeRegistryTab.filtrerParTypeDeDonnees":
    "Filtrer par type de données",
  "admin.taxonomyDraftPublishTab.brouillonsEnAttenteDePublication":
    "Brouillons en Attente de Publication (",
  "admin.taxonomyDraftPublishTab.archivee": "archivée",
  "admin.taxonomyNodeEditor.transactionsLivraison": "Transactions & Livraison",
  "admin.taxonomyNodeEditor.marchesHeritage": "Marchés & Héritage",
  "admin.taxonomyNodeEditor.apercusDirects": "Aperçus Directs",
  "admin.taxonomyNodeEditor.impactSecurite": "Impact & Sécurité",
  "admin.taxonomyNodeEditor.changerLIcone": "Changer l'icône (",
  "admin.taxonomyNodeEditor.aliasSynonymesDeRecherche":
    "Alias & Synonymes de recherche (",
  "admin.taxonomyNodeEditor.pourLaRetirerDesNouvellesPublicationsSansToucherAL":
    "pour la retirer des nouvelles publications sans toucher à l'existant.",
  "admin.taxonomyNodeEditor.attributsHeritesDesParents":
    "Attributs hérités des parents (",
  "admin.taxonomyNodeEditor.attributsSpecifiquesAssignes":
    "Attributs spécifiques assignés (",
  "admin.taxonomyNodeEditor.ajouterUnAttributDuRegistre":
    "Ajouter un attribut du registre",
  "admin.taxonomyNodeEditor.deLaCategorieExPeutOnVendreEnLigneEnvoyer":
    "de la catégorie (ex: peut-on vendre en ligne ? envoyer par colis ?). Les transporteurs réels (Mondial Relay, Colissimo) sont gérés dans le",
  "admin.taxonomyNodeEditor.expeditionParColisStandardRelaisDomicile":
    "Expédition par colis standard (Relais / Domicile)",
  "admin.taxonomyNodeEditor.telechargementNumeriqueAccesDirect":
    "Téléchargement numérique / Accès direct",
  "admin.taxonomyNodeEditor.prestationSurPlaceInterventionADomicile":
    "Prestation sur place / Intervention à domicile",
  "admin.taxonomyNodeEditor.architectureMultiMarchesEtHeritageCanonique":
    "Architecture multi-marchés et héritage canonique",
  "admin.taxonomyNodeEditor.constitueLaReferenceCanoniqueLesAutresMarchesHeritentAutomatiquementDe":
    "constitue la référence canonique. Les autres marchés héritent automatiquement de tous les paramètres non surchargés.",
  "admin.taxonomyNodeEditor.autoriserLePaiementSecuriseDirectPourLeMarche":
    "Autoriser le paiement sécurisé direct pour le marché",
  "admin.taxonomyNodeEditor.enregistrerLaSurcharge": "Enregistrer la surcharge",
  "admin.taxonomyNodeEditor.profilDePrevisualisation":
    "Profil de prévisualisation",
  "admin.taxonomyNodeEditor.estPermanentTouteModificationDeNomOuDePositionPreserve":
    "est permanent. Toute modification de nom ou de position préserve la validité des annonces sans risque de rupture.",
  "admin.taxonomyV4GovernanceTab.gouvernanceDuSchemaV4Genere":
    "Gouvernance du schéma v4 généré",
  "admin.taxonomyV4GovernanceTab.projectionPubliqueEnLectureSeuleLesReglesPriveesJuridiquesEt":
    "Projection publique en lecture seule. Les règles privées, juridiques et de risque restent exclusivement côté backend.",
  "admin.taxonomyV4GovernanceTab.ressourcesDeTaxonomieV4":
    "Ressources de taxonomie v4",
  "admin.taxonomyV4GovernanceTab.rechercherUnTypeDAnnonce":
    "Rechercher un type d’annonce",
  "admin.taxonomyV4GovernanceTab.marchesActifs": "Marchés actifs",
  "admin.taxonomyV4GovernanceTab.100ResultatsAffichesSur":
    "100 résultats affichés sur",
  "admin.taxonomyV4GovernanceTab.liensParentEnfantExplicitesPilotentLesSelecteursEnCascadeSans":
    "liens parent-enfant explicites pilotent les sélecteurs en cascade sans dupliquer les options.",
  "admin.taxonomyV4GovernanceTab.matriceResolue": "Matrice résolue",
  "admin.taxonomyV4GovernanceTab.liaisonsSourcesFiltreesDansCetteProjectionPourExclureLesChamps":
    "liaisons sources, filtrées dans cette projection pour exclure les champs privés.",
  "admin.taxonomyV4GovernanceTab.frBeEtChSontDisponiblesSelonChaqueEnregistrementSn":
    "FR, BE et CH sont disponibles selon chaque enregistrement. SN et BF restent « bientôt disponible », non publiables et non indexables.",
  "admin.taxonomyV4GovernanceTab.lEligibiliteParticulierProfessionnelEstPorteeParLesCategoriesTypes":
    "L’éligibilité particulier/professionnel est portée par les catégories, types d’annonce et attributs, puis résolue côté backend.",
  "admin.taxonomyV4GovernanceTab.sourceNormalisee": "… · source normalisée",
  "admin.taxonomyV4GovernanceTab.identitesV3Revues": "identités v3 revues ·",
  "admin.taxonomyV4GovernanceTab.annoncesDeDemonstrationConserveesAucunReferencementAmbigu":
    "annonces de démonstration conservées · aucun référencement ambigu.",
  "admin.taxonomyV4GovernanceTab.dryRunDesAnnoncesDeDemonstration":
    "Dry-run des annonces de démonstration",
  "admin.taxonomyValidationTab.reanalyser": "Réanalyser (",
  "admin.taxonomyValidationTab.tous": "Tous (",
  "admin.taxonomyValidationTab.actionSuggeree": "Action suggérée :",
  "admin.attributeEditModal.valeursPredefinies": "Valeurs prédéfinies (",
  "admin.deleteNodeModal.cetteCategoriePlutotQueDeLaSupprimer":
    "cette catégorie plutôt que de la supprimer.",
  "admin.moveNodeModal.sousCategoriesTypesEnfantsSerontDeplaces":
    "sous-catégories / types enfants seront déplacés.",
  "admin.moveNodeModal.annoncesActivesConserverontLeurLiaisonDIdStableSansRupture":
    "annonces actives conserveront leur liaison d'ID stable sans rupture.",

  // --- digital products shared by the application shell ------------------
  "digital.common.title": "Produits numériques",
  "digital.nav.purchases": "Achats numériques",
  "digital.nav.seller": "Vente numérique",
  "digital.nav.admin": "Produits numériques",
} as const;

/** The keys literally stored in a catalogue, plural variants included. */
export type CatalogueKey = keyof typeof messagesFr | DigitalMessageKey;

/**
 * The base key of a countable message.
 *
 * Callers pass `t('common.listingCount', { count })`, never the `_one` /
 * `_other` variant — choosing between those is the translation layer's job and
 * depends on the locale. Deriving the base from the declared `_one` forms keys
 * the call sites to the catalogue, so deleting a plural variant breaks the
 * callers at compile time instead of at render time.
 */
type PluralBaseKey<K extends string> = K extends `${infer Base}_one`
  ? Base
  : never;

/** What `t()` accepts: every stored key, plus the base of each countable one. */
export type MessageKey = CatalogueKey | PluralBaseKey<CatalogueKey>;

/**
 * A catalogue for another locale.
 *
 * Partial on purpose: a locale is allowed to ship incrementally, and anything
 * it has not translated falls back to French rather than rendering a raw key.
 */
export type MessageCatalogue = Partial<Record<CatalogueKey, string>>;
