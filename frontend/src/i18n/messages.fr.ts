import type { DigitalMessageKey } from "./digital.catalogue.fr";
import type { DeliveryMessageKey } from "./delivery.catalogue.fr";
import type { AdminMessageKey } from "./admin.catalogue.fr";

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
  "reviews.loading": "Chargement des avis…",
  "reviews.loadError": "Les avis n’ont pas pu être chargés.",
  "reviews.report": "Signaler cet avis",
  "reviews.reportDescription":
    "Le signalement concernant {name} sera examiné par notre équipe de modération. Ne partagez aucune donnée sensible.",
  "reviews.form.title": "Votre avis sur cette transaction",
  "reviews.form.description":
    "Acheteur et vendeur peuvent chacun publier un avis après une commande terminée. Votre avis sera public : ne partagez aucune donnée personnelle.",
  "reviews.form.loading": "Vérification de votre droit à publier un avis…",
  "reviews.form.loadError":
    "Impossible de vérifier votre droit à publier un avis.",
  "reviews.form.notCompleted":
    "Un avis peut être publié une fois la commande terminée.",
  "reviews.form.saved": "Votre avis est enregistré.",
  "reviews.form.rating": "Note",
  "reviews.form.chooseRating": "Choisir une note",
  "reviews.form.score": "{rating} sur 5",
  "reviews.form.comment": "Votre expérience",
  "reviews.form.commentHint":
    "De 10 à 2 000 caractères. Décrivez votre expérience avec respect, sans données personnelles.",
  "reviews.form.submit": "Publier mon avis",
  "reviews.form.submitting": "Publication…",
  "reviews.form.submitError":
    "La publication n’a pas été confirmée. Vérifiez votre connexion puis réessayez.",
  "reviews.verified": "Transaction vérifiée",
  "reviews.summary_one": "Basé sur {count} avis",
  "reviews.summary_other": "Basé sur {count} avis",
  "reviews.verificationExplanation":
    "Le badge distingue les avis associés à une transaction terminée.",
  "reviews.ratingBreakdown": "{percentage} % des avis ont {rating} étoiles",
  "reviews.filtered": "Avis avec la note {rating} sur 5 ({count})",
  "reviews.noFiltered": "Aucun avis avec la note {rating} sur 5",
  "reviews.empty": "Pas encore d’avis",
  "reviews.emptyHint":
    "Les avis apparaîtront après les premières transactions terminées.",
  "reviews.filterHint":
    "Réinitialisez le filtre pour afficher les autres avis.",
  "reviews.listing": "Article : {title}",
  "reviews.dateUnavailable": "Date indisponible",
  // --- Generic actions and states -----------------------------------------
  "common.loading": "Chargement…",
  "common.home": "Accueil",
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
  "watch.nav": "Alertes suivies",
  "watch.meta.title": "Mes alertes suivies — Shongre",
  "watch.meta.description":
    "Gérez les baisses de prix, vendeurs suivis et recherches sauvegardées.",
  "watch.title": "Mes alertes suivies",
  "watch.description": "Alertes actives pour le marché {market}.",
  "watch.status.active": "Active",
  "watch.status.paused": "En pause",
  "watch.lastNotified": "dernière alerte",
  "watch.frequency.label": "Fréquence de l’alerte",
  "watch.frequency.immediate": "Immédiatement",
  "watch.frequency.daily": "Résumé quotidien",
  "watch.frequency.weekly": "Résumé hebdomadaire",
  "watch.type.listingPrice": "Baisse de prix",
  "watch.type.seller": "Vendeur suivi",
  "watch.type.savedSearch": "Recherche sauvegardée",
  "watch.channels.label": "Canaux de l’alerte",
  "watch.channel.inApp": "Dans Shongre",
  "watch.channel.email": "E-mail",
  "watch.channel.push": "Notification mobile",
  "watch.action.pause": "Mettre en pause",
  "watch.action.resume": "Réactiver",
  "watch.action.remove": "Supprimer l’alerte",
  "watch.feedback.updated": "Préférences d’alerte mises à jour.",
  "watch.feedback.removed": "Alerte supprimée.",
  "watch.feedback.channelRequired": "Conservez au moins un canal actif.",
  "watch.error.title": "Alertes indisponibles",
  "watch.error.loading": "Impossible de charger vos alertes.",
  "watch.error.updating": "Impossible de modifier cette alerte.",
  "watch.error.removing": "Impossible de supprimer cette alerte.",
  "watch.empty.title": "Aucune alerte active",
  "watch.empty.description":
    "Suivez une baisse de prix, un vendeur ou une recherche pour la retrouver ici.",
  "watch.empty.action": "Explorer les annonces",
  "watch.save.success": "Recherche enregistrée avec alertes activées.",
  "watch.save.title": "Recherche sauvegardée",
  "watch.save.error": "Impossible de créer cette alerte.",
  "watch.save.criteriaRequired":
    "Ajoutez au moins un mot-clé, une catégorie, une ville ou un prix.",
  "watch.save.queryTitle": "Recherche « {query} »",
  "watch.save.categoryTitle": "Catégorie {category}",
  "watch.save.customTitle": "Ma recherche personnalisée",
  "watch.auto.loginRequired":
    "Connectez-vous pour enregistrer cette alerte Auto.",
  "watch.auto.queryTitle": "Auto · {query}",
  "watch.auto.makeTitle": "Auto · {make}",
  "watch.auto.allVehicles": "Tous les véhicules",
  "watch.auto.success": "Alerte Auto enregistrée pour ces critères.",
  "watch.auto.error": "Impossible de créer cette alerte Auto.",
  "watch.immo.catalogLoading":
    "La configuration Immo est encore en cours de chargement.",
  "watch.immo.title": "{transaction} · {location}",
  "watch.immo.sale": "Achat",
  "watch.immo.rental": "Location",
  "watch.immo.defaultLocation": "Lyon et alentours",
  "watch.immo.success":
    "Alerte Immo créée. Vous pouvez la gérer depuis votre compte.",
  "watch.immo.error": "Impossible de créer cette alerte Immo.",
  "watch.savedSearch.removed": "Recherche sauvegardée et alerte supprimées.",
  "watch.savedSearch.removeError": "Impossible de supprimer cette recherche.",
  "watch.savedSearch.created": "Créée {date}",
  "watch.savedSearch.manage": "Gérer l’alerte",
  "watch.savedSearch.activate": "Activer une alerte",
  "watch.listing.priceAction": "Alerte prix",
  "watch.listing.priceActive": "Baisse de prix suivie",
  "watch.listing.sellerAction": "Suivre ce vendeur",
  "watch.listing.sellerActive": "Vendeur suivi",
  "watch.listing.created": "Alerte activée.",
  "watch.listing.removed": "Alerte désactivée.",
  "account.navigation.more": "Plus",
  "account.navigation.settingsSupport": "Réglages et assistance",
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
  "listings.pricing.fromAmount": "à partir de {amount}",
  "listings.pricing.deliveryFree": "Gratuite",
  "listings.pricing.deliveryHandover": "Remise en main propre",
  "listings.pricing.deliveryDigital": "Accès en ligne",
  "listings.pricing.dependsOnFulfillment": "Selon le mode de remise",
  "listings.pricing.dependsOnChoice": "Selon l’option choisie",
  "listings.pricing.confirmedBeforePayment": "Confirmé avant paiement",
  "listings.listingDetailPage.acheterMaintenant": "Acheter maintenant",
  "listings.listingDetailPage.acheterCompact": "Acheter",
  "listings.listingDetailPage.offreCompact": "Offre",
  "listings.listingDetailPage.modifierCompact": "Modifier",
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
  "solutions.catalog.countPending": "Catalogue en cours de chargement",
  "solutions.catalog.emptyAvailableIn":
    "Les solutions Shongre sont disponibles en {markets}. Le catalogue s’enrichit progressivement selon les pays et les langues.",
  "solutions.catalog.emptyReset": "Voir le catalogue {market}",
  "solutions.detail.breadcrumbLabel": "Fil d’Ariane",
  "solutions.detail.nextTitle": "Prêt à démarrer avec {name} ?",
  "solutions.detail.relatedTitle": "Autres solutions Shongre",
  "solutions.detail.accessOnRequest": "Sur activation",
  "solutions.detail.accessSignedIn": "Compte Shongre requis",
  "solutions.preview.new": "Nouveau",
  "solutions.preview.search": "Rechercher…",
  "solutions.preview.title.prospects": "Prospects",
  "solutions.preview.title.invoices": "Factures",
  "solutions.preview.title.marketplace": "Marketplace",
  "solutions.preview.title.dashboard": "Pilotage",
  "solutions.preview.title.application": "Application",
  "solutions.preview.listing.familyHome": "Maison familiale",
  "solutions.preview.listing.cargoBike": "Vélo cargo",
  "solutions.preview.category.realEstate": "Immobilier",
  "solutions.preview.category.mobility": "Mobilité",
  "solutions.preview.category.design": "Design",
  "solutions.preview.category.energy": "Énergie",
  "solutions.preview.category.software": "Logiciels",
  "solutions.preview.status.new": "Nouveau",
  "solutions.preview.status.featured": "À la une",
  "solutions.preview.status.contacted": "Contacté",
  "solutions.preview.status.followUp": "À relancer",
  "solutions.preview.status.issued": "Émise",
  "solutions.preview.status.paid": "Payée",
  "solutions.preview.metric.revenue": "Chiffre d’affaires",
  "solutions.preview.metric.dueDates": "Échéances",
  "solutions.preview.metric.newCustomers": "Nouveaux clients",
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
  "nav.category.unavailable": "Navigation indisponible",
  "nav.category.cours": "Éducation",
  "nav.unreadMessages_one": "{count} message non lu",
  "nav.unreadMessages_other": "{count} messages non lus",

  // --- Footer ---------------------------------------------------------------
  "footer.findTutor": "Trouver un professeur",
  "footer.about": "À propos",
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
  "footer.trustSummary":
    "Paiement suivi · Remise claire · Statuts vendeur explicites",
  "footer.trustLearnMore": "En savoir plus",
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
  "about.eyebrow": "Notre identité",
  "about.title": "À propos de SHONGRE.",
  "about.introduction":
    "SHONGRE. est une place de marché locale conçue pour rendre les échanges entre particuliers et professionnels plus simples et plus lisibles.",
  "about.missionTitle": "Notre mission",
  "about.missionBody":
    "Aider chacun à publier, découvrir et comparer des offres utiles dans son marché, avec un contexte local clair et des parcours adaptés à chaque catégorie.",
  "about.trustTitle": "La confiance par conception",
  "about.trustBody":
    "Les informations visibles, les statuts, les contrôles et les moyens de contact sont présentés sans promesse artificielle. Les règles de sécurité et de confidentialité restent accessibles depuis chaque page.",
  "about.marketsTitle": "Une plateforme multi-marché",
  "about.marketsBody":
    "Chaque pays dispose de son contexte de marché, de sa devise, de ses règles et de ses disponibilités. Une ouverture locale n’est annoncée comme active qu’après validation des prérequis correspondants.",
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
  "shell.accountLayout.roleAdministrateur": "Administrateur",
  "shell.accountLayout.roleSuperAdministrateur": "Super administrateur",
  "shell.accountLayout.seDeconnecter": "Se déconnecter",

  // --- shell.focusedLayout ---
  "shell.focusedLayout.quitterEtRevenirAL": "Quitter et revenir à l'accueil",

  // --- shell.header ---
  "shell.header.fermerLeMenu": "Fermer le menu",
  "shell.header.fermerLeMenuMobile": "Fermer le menu mobile",
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

  // --- ui.identityStatus ---
  "ui.identityStatus.pro.short": "Pro",
  "ui.identityStatus.pro.account": "Compte professionnel",
  "ui.identityStatus.pro.seller": "Vendeur professionnel",
  "ui.identityStatus.pro.store": "Boutique professionnelle",
  "ui.identityStatus.pro.organization": "Organisme",
  "ui.identityStatus.pro.siret": "SIRET pro",
  "ui.identityStatus.verification.generic": "Vérifié",
  "ui.identityStatus.verification.genericFeminine": "Vérifiée",
  "ui.identityStatus.verification.profile": "Profil vérifié",
  "ui.identityStatus.verification.identity": "Identité vérifiée",
  "ui.identityStatus.verification.professional": "Professionnel vérifié",
  "ui.identityStatus.verification.company": "Entreprise vérifiée",
  "ui.identityStatus.verification.organization": "Organisme vérifié",
  "ui.identityStatus.verification.employer": "Employeur vérifié",
  "ui.identityStatus.verification.agency": "Agence vérifiée",
  "ui.identityStatus.verification.siret": "SIRET vérifié",
  "ui.identityStatus.verification.email": "Email vérifié",
  "ui.identityStatus.verification.sms": "SMS vérifié",
  "ui.identityStatus.verification.byShongre": "Vérifié par Shongre",

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

  // --- ui.filterPanel ---
  "ui.filterPanel.filters": "Filtres",
  "ui.filterPanel.hide": "Masquer les filtres",
  "ui.filterPanel.show": "Afficher les filtres",
  "ui.filterPanel.open": "Ouvrir les filtres de recherche",
  "ui.searchControls.activeFilters": "Filtres actifs :",
  "ui.searchControls.zoneSelected": "Zone sélectionnée",
  "ui.searchControls.criterion": "{count} critère",
  "ui.searchControls.criteria": "{count} critères",
  "ui.searchResultsMap.regionLabel": "Carte des résultats",
  "ui.searchResultsMap.result": "{count} résultat géolocalisé",
  "ui.searchResultsMap.results": "{count} résultats géolocalisés",
  "ui.searchResultsMap.locationNote":
    "Positions publiques approximatives, sans adresse privée.",
  "ui.searchResultsMap.fitResults": "Recadrer",
  "ui.searchResultsMap.selectResult": "Afficher le résultat {number}",
  "ui.searchResultsMap.viewResult": "Voir le résultat",
  "ui.searchResultsMap.closePreview": "Fermer l’aperçu",
  "ui.searchResultsMap.emptyTitle": "Aucun résultat géolocalisable",
  "ui.searchResultsMap.emptyDescription":
    "Les résultats actuels ne disposent pas d’une localisation publique suffisante pour être affichés sur la carte.",

  // --- ui.listingCard ---
  "ui.listingCard.annonceALaUne": "Annonce à la une",
  "ui.listingCard.noteAvis": "Note {rating} sur 5, {count} avis",
  "ui.listingCard.nombrePhotos": "{count} photos",
  "ui.listingCard.ajouterAuxFavoris": "Ajouter aux favoris",
  "ui.listingCard.retirerDesFavoris": "Retirer des favoris",
  "ui.listingCard.favoriErreur":
    "Impossible de modifier les favoris pour le moment.",
  "ui.listingCard.favorisChargement": "Chargement des favoris",
  "ui.listingCard.favorisReessayer": "Réessayer le chargement des favoris",
  "ui.listingCard.favorisChargementErreur":
    "Impossible de charger les favoris pour le moment.",
  "ui.listingCard.favorisRecharges":
    "Vos favoris ont été rechargés. Vérifiez le cœur avant de réessayer.",
  "ui.listingCard.favorisRechargesAvantVider":
    "Vos favoris ont été rechargés. Vérifiez-les avant de les vider.",
  "ui.listingCard.favorisViderErreur":
    "Impossible de vider vos favoris pour le moment.",
  "ui.listingCard.boosted": "Boosté",
  "ui.listingCard.delivery": "Livraison",
  "ui.listingCard.digitalFulfillment": "Accès numérique",
  "ui.listingCard.free": "Gratuit",
  "ui.listingCard.negotiable": "Négociable",
  "ui.listingCard.onRequest": "Prix sur demande",
  "ui.listingCard.onlinePayment": "Paiement en ligne",
  "ui.listingCard.imageUnavailable": "Image indisponible",
  "ui.listingCard.photos": "{count} photos",
  "ui.listingCard.photos_one": "{count} photo",
  "ui.listingCard.photos_other": "{count} photos",
  "ui.listingCard.verifiedSeller": "Vendeur vérifié",
  "ui.listingCard.verifiedSellerShort": "Vérifié",

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
  "orders.returns.title": "Retour",
  "orders.returns.request": "Demander un retour",
  "orders.returns.failed": "L’action sur le retour a échoué. Réessayez.",
  "orders.returns.statutory": "rétractation légale",
  "orders.returns.statutoryNotice":
    "Une rétractation légale ne peut pas être refusée. Acceptez le retour, puis remboursez à réception de l’article.",
  "orders.returns.sellerNote": "Réponse du vendeur",
  "orders.returns.noteLabel": "Motif de la réponse",
  "orders.returns.approve": "Accepter le retour",
  "orders.returns.reject": "Refuser le retour",
  "orders.returns.carrier": "Transporteur",
  "orders.returns.tracking": "Numéro de suivi",
  "orders.returns.markShipped": "J’ai renvoyé l’article",
  "orders.returns.confirmReceived": "Article reçu, rembourser",
  "orders.returns.reasonLabel": "Motif du retour",
  "orders.returns.detailsLabel": "Détails",
  "orders.returns.detailsHint": "Au moins 10 caractères.",
  "orders.returns.reason.withdrawal":
    "Rétractation (achat auprès d’un professionnel)",
  "orders.returns.reason.damaged": "Article endommagé",
  "orders.returns.reason.not_as_described": "Article non conforme à l’annonce",
  "orders.returns.reason.wrong_item": "Mauvais article reçu",
  "orders.returns.reason.missing_parts": "Pièces ou accessoires manquants",
  "orders.returns.reason.other": "Autre motif",
  "orders.returns.status.requested": "Retour demandé",
  "orders.returns.status.approved": "Retour accepté",
  "orders.returns.status.rejected": "Retour refusé",
  "orders.returns.status.shipped": "Article renvoyé",
  "orders.returns.status.received": "Article reçu",
  "orders.returns.status.refunded": "Retour remboursé",
  "orders.returns.status.cancelled": "Retour annulé",
  "orders.returns.status.expired": "Délai de retour écoulé",
  "auth.security.exportTitle": "Vos données",
  "auth.security.exportDescription":
    "Téléchargez une copie lisible par une machine de tout ce que contient votre compte : profil, annonces, commandes, conversations, avis, favoris et alertes. Une copie par jour.",
  "auth.security.exportAction": "Télécharger mes données",
  "auth.security.exportReady": "Votre copie a été téléchargée.",
  "auth.security.exportFailed":
    "La copie de vos données n’a pas pu être générée. Réessayez.",
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
  "categories.categoriesPage.catalogueIndisponible":
    "Catégories momentanément indisponibles",
  "categories.categoriesPage.catalogueIndisponibleDescription":
    "Le catalogue n’a pas pu être chargé depuis l’API Shongre.",

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
  "favorites.favoritesPage.chargementImpossibleTitle": "Favoris indisponibles",
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
  "home.homeCollectionsSection.unavailable":
    "Les collections sont momentanément indisponibles",
  "home.homeCollectionsSection.retryDescription":
    "Réessayez pour charger les catégories et leurs annonces disponibles.",
  "home.homeCollectionsSection.listingCountOne": "{formattedCount} annonce",
  "home.homeCollectionsSection.listingCountMany": "{formattedCount} annonces",
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

  // --- home.homeUniverseExplorer ---
  "home.homeUniverseExplorer.title": "Explorez par univers",
  "home.homeUniverseExplorer.subtitle":
    "Trouvez rapidement ce qui vous intéresse",
  "home.homeUniverseExplorer.seeAll": "Voir tout",
  "home.homeUniverseExplorer.railLabel": "annonces {category}",
  "home.homeUniverseExplorer.emptyTitle": "Aucune annonce disponible",
  "home.homeUniverseExplorer.emptyDescription":
    "De nouvelles annonces seront bientôt proposées dans cet univers.",

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
  "listings.listingDetailPage.servicesAndInformation":
    "Services et informations",
  "listings.listingDetailPage.ratingSummary": "Note {rating} · {count} avis",

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
  "messaging.messageComposer.ecrivezVotreMessageEntreePour":
    "Écrivez votre message…",
  "messaging.messageComposer.keyboardHint":
    "Entrée pour envoyer. Majuscule plus Entrée pour aller à la ligne.",
  "messaging.messageComposer.envoyer": "Envoyer",

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
  "publishing.publishWizard.titleHint":
    "{count}/{max} caractères · Produit, marque et modèle. Placez les détails dans la description.",
  "publishing.publishWizard.titleTooLong":
    "Raccourcissez le titre à {max} caractères maximum avant de continuer.",
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
  "search.searchPage.queryHeading": "Recherche : {query}",
  "search.searchPage.allListings": "Toutes les annonces",
  "search.resultsHeading": "Résultats de recherche",
  "search.exploreMapView.recadrerSurLesAnnonces": "Recadrer sur les annonces",
  "search.exploreMapView.regionLabel": "Carte des annonces à explorer",
  "search.exploreMapView.fermerLaPrevisualisation":
    "Fermer la prévisualisation",
  "search.exploreMapView.cliquezPourCentrer": "Cliquez pour centrer",

  // --- search.searchPage ---
  "search.searchPage.masquerLePanneauDeFiltres":
    "Masquer le panneau de filtres",
  "search.searchPage.livraisonDisponible": "Livraison disponible",
  "search.searchPage.paiementSecuriseEnLigne": "Paiement sécurisé en ligne",
  "search.searchPage.sauvegarderCetteRecherche": "Sauvegarder cette recherche",
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
  "sellerworkspace.proDashboardPage.catalogueSampleViews":
    "Vues du catalogue analysé",
  "sellerworkspace.proDashboardPage.catalogueSampleDescription":
    "Vues cumulées des annonces analysées, hors évolution hebdomadaire.",
  "sellerworkspace.proDashboardPage.completedSalesThisMonth":
    "Ventes terminées ce mois-ci",
  "sellerworkspace.proDashboardPage.completedSalesScope":
    "Commandes terminées dont la dernière mise à jour est dans le mois courant (UTC). Hors frais et remboursements.",

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

  // --- verification.identityVerificationModal ---
  "verification.identityVerificationModal.formatsAcceptesJpgPngPdf":
    "Formats acceptés : JPG, PNG, PDF (max 8 Mo)",
  "verification.identityVerificationModal.requisPourLaValidationOptique":
    "Requis pour la validation optique",

  // --- verification.trustBadge ---
  "verification.trustBadge.identiteOfficielleVerifieeCniPasseport":
    "Identité officielle vérifiée (CNI / Passeport)",
  "verification.trustBadge.entrepriseCertifieeAuRegistreDu":
    "Entreprise certifiée au Registre du Commerce (RCS)",
  "verification.trustBadge.numeroDeTelephoneVerifiePar":
    "Numéro de téléphone vérifié par SMS",
  "verification.trustBadge.compteBancaireSepaValidePour":
    "Compte bancaire SEPA validé pour les virements",
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
  "shell.environment.collapseToolbar": "Réduire la barre d’environnement",
  "shell.environment.expandToolbar": "Développer la barre d’environnement",
  "shell.environment.label": "{environment}",
  "shell.environment.apiSummary": "Données fournies par l’API Shongre",

  // --- shell.header ---
  "shell.header.tableauDeBordCompte": "Tableau de bord compte",
  "shell.header.deconnexion": "Déconnexion",
  "shell.header.connectezVousPourGererVos":
    "Connectez-vous pour gérer vos annonces et messages",
  "shell.header.explorerSurLaCarte": "Explorer sur la carte",
  "shell.header.tableauDeBord": "Tableau de bord",
  "shell.header.mesAnnonces": "Mes annonces",
  "shell.header.accountMenu.availableAccess": "Accès disponibles",
  "shell.header.accountMenu.favorites": "Mes favoris",
  "shell.header.accountMenu.purchases": "Achats & Transactions",
  "shell.header.accountMenu.publicProfile": "Voir mon profil public",
  "shell.header.accountMenu.publicStorefront": "Voir ma vitrine boutique",
  "shell.header.accountMenu.proSolutions": "Solutions & Abonnements Pro",
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
  "categories.categoriesPage.explorer": "Explorer",
  "categories.categoriesPage.explorerLaCategorie": "Explorer {category}",
  "categories.categoriesPage.pourLaRecherche": "pour « {query} »",
  "categories.categoriesPage.aucuneCategorieNeCorrespond":
    "Aucune catégorie ne correspond à « {query} ».",

  // --- collections.collectionsPage ---
  "collections.collectionsPage.toutesNosCollections": "Toutes nos collections",
  "collections.collectionsPage.decouvrezDesUniversThematiquesPenses":
    "Explorez les catégories disponibles et retrouvez les annonces publiées sur votre marché.",
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
  "home.homePage.trustedMarketplace": "Plateforme de confiance",
  "home.homePage.garantiesShongre": "Garanties Shongre",
  "home.homePage.paiementsSecurises": "Paiements sécurisés",
  "home.homePage.livraisonIntegree": "Remise et expédition claires",
  "home.homePage.vendeursVerifies": "Statuts vendeur explicites",
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

  // --- listings.listingSafetyNotice ---
  "listings.listingSafetyNotice.sequestreGaranti":
    "Paiement géré par le prestataire",
  "listings.listingSafetyNotice.paiementChiffre3dSecure":
    "Paiement chiffré 3D-Secure",

  // --- listings.listingSellerTrustSection ---
  "listings.listingSellerTrustSection.aProposDuVendeur": "À propos du vendeur",
  "listings.listingSellerTrustSection.viewStore": "Voir la boutique",
  "listings.listingSellerTrustSection.viewProfile": "Voir le profil",
  "listings.listingSellerTrustSection.reviews": "({count} avis)",
  "listings.listingSellerTrustSection.responds": "Répond {responseTime}",
  "listings.listingSellerTrustSection.responseRate":
    "Taux de réponse : {rate}%",
  "listings.listingSellerTrustSection.recentBuyerReviews":
    "Derniers avis acheteurs",

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

  "profile.sellerCatalog.publierUnePremiereAnnonce":
    "Publier une première annonce",
  "profile.sellerCatalog.explorerLesAnnoncesDuMarche":
    "Explorer les annonces du marché",
  "profile.sellerCatalog.effacerLesPrix": "Effacer les prix",
  "profile.sellerCatalog.sousCategories": "Sous-catégories :",
  "profile.sellerCatalog.reinitialiserLesFiltres2": "Réinitialiser les filtres",
  "profile.sellerCatalog.catalogueDuVendeur": "Catalogue du vendeur",

  // --- profile.sellerProfileHeader ---
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
  "profile.sellerReviewsTab.afficherTousLesAvis": "Afficher tous les avis",

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
  "publishing.publishWizard.addressSearchLabel":
    "Rechercher une adresse, une ville ou un code postal",
  "publishing.publishWizard.addressSearchPlaceholder":
    "ex : 12 rue de la Paix, Paris ou 75002",
  "publishing.publishWizard.addressSearching": "Recherche en cours\u2026",
  "publishing.publishWizard.addressNoResults": "Aucun lieu trouvé.",
  "publishing.publishWizard.addressResultsAvailable":
    "{count} lieux proposés. Utilisez les flèches pour parcourir la liste.",
  "publishing.publishWizard.addressUnavailable":
    "La recherche d\u2019adresse est indisponible. Saisissez votre ville et votre code postal.",
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
  "search.exploreMapView.voirLAnnonce": "Voir l'annonce",

  // --- search.searchPage ---
  "search.searchPage.livraisonDisponible2": "Livraison disponible",
  "search.searchPage.effacerTout": "Effacer tout",
  "search.searchPage.categories2": "Catégories",
  "search.searchPage.localisation": "Localisation",
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
    "Suivi de votre catalogue commercial et de vos ventes terminées",
  "sellerworkspace.proDashboardPage.facturesRecus": "Factures & Reçus",
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
  "sellerworkspace.bulkImportModal.validationCategoryInvalid":
    "Choisissez une catégorie finale disponible.",
  "sellerworkspace.bulkImportModal.validationAttributesInvalid":
    "Les caractéristiques ou les photos JSON sont invalides.",
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
  "security.requirePermission.verificationRequiredTitle":
    "Vérification requise",
  "security.requirePermission.verificationRequiredMessage":
    "Vérifiez uniquement les informations nécessaires à cette action pour continuer.",
  "security.requirePermission.continueVerification":
    "Continuer la vérification",
  "security.requirePermission.professionalFeatureTitle":
    "Fonctionnalité professionnelle",
  "security.requirePermission.professionalFeatureMessage":
    "Votre compte ne dispose pas encore de l’offre commerciale nécessaire. Vos droits administratifs ne sont pas affectés par un changement d’offre.",
  "security.requirePermission.marketUnavailableTitle":
    "Indisponible sur ce marché",
  "security.requirePermission.marketUnavailableMessage":
    "Cette action n’est pas proposée dans le marché sélectionné ou ne fait pas partie de votre périmètre autorisé.",
  "security.requirePermission.staffSeparationTitle": "Accès Staff séparé",
  "security.requirePermission.staffSeparationMessage":
    "Les outils internes et les actions client utilisent des espaces distincts. Contactez un propriétaire si votre affectation doit évoluer.",
  "security.requirePermission.featureUnavailableTitle":
    "Fonctionnalité indisponible",
  "security.requirePermission.featureUnavailableMessage":
    "Cette fonctionnalité n’est pas activée pour votre contexte actuel.",

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
  "messaging.conversationList.filtres": "filtres de conversations",
  "common.scrollRailLeft": "Faire défiler les {label} vers la gauche",
  "common.scrollRailRight": "Faire défiler les {label} vers la droite",
  "messaging.conversationList.messagerie": "Messagerie",

  /* Counted, so French keeps 0 in the singular and other locales get their
     own few/many categories instead of a hand-rolled `> 1 ? 's' : ''`. */
  "proDirectory.boutiquesDisponibles_one": "{count} boutique disponible",
  "proDirectory.boutiquesDisponibles_other": "{count} boutiques disponibles",
  "notifications.notificationPreferencesPage.canalPourAlerte":
    "{channel} — {alert}",
  "notifications.notificationPreferencesPage.canalApplication":
    "Sur l'application",
  "notifications.notificationPreferencesPage.canalEmail": "Par email",
  "notifications.notificationPreferencesPage.canalPush": "Sur mobile (push)",
  "common.removeFilter": "Retirer le filtre {name}",
  "identityBadge.staff.active": "Équipe Shongre",
  "identityBadge.staff.activeWithRole": "Équipe Shongre — {role}",
  "identityBadge.staff.activeAria": "Membre actif de l’équipe Shongre",
  "identityBadge.staff.activeAriaWithRole":
    "Membre actif de l’équipe Shongre — {role}",
  "identityBadge.staff.suspended": "Staff suspendu",
  "identityBadge.staff.revoked": "Staff révoqué",
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
  "monetization.marketRequired":
    "Sélectionnez un pays avant d’accéder aux offres payantes.",
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
  "invoicing.product.secondaryCta": "Découvrir le parcours",
  "invoicing.product.openApp": "Ouvrir Shongre Facturation",
  "invoicing.product.activatePro": "Découvrir l’accès Facturation Pro",
  "invoicing.product.createWorkspace": "Créer mon espace Facturation",
  "invoicing.product.apiNotice":
    "Données fournies par l’API Shongre · Transport électronique uniquement si configuré",
  "invoicing.product.previewAria": "Ouvrir l’espace Shongre Facturation",
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
  "invoicing.product.previewDocument": "Document lisible",
  "invoicing.product.previewDocumentNotice":
    "Aperçu lisible — le document finalisé reste la référence.",
  "invoicing.product.trustTitle": "Fondations de Shongre Facturation",
  "invoicing.product.trustExact": "Totaux calculés exactement",
  "invoicing.product.trustMarkets": "Contexte multi-marché",
  "invoicing.product.trustFinalization": "Finalisation protégée",
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
    "Les marchés affichés viennent de la configuration API active ; cela ne constitue pas une attestation de conformité fiscale ou électronique locale.",
  "invoicing.product.guardrailsTitle":
    "Les limites de production restent visibles.",
  "invoicing.product.guardrailsBody":
    "Shongre Facturation distingue les capacités actives de celles qui exigent encore une configuration, une revue ou une certification externe.",
  "invoicing.product.guardrailNoTransmission":
    "Aucune transmission légale simulée comme réussie",
  "invoicing.product.guardrailNoFallback":
    "Aucun repli silencieux vers un autre marché",
  "invoicing.product.guardrailIsolation":
    "Données isolées par organisation et entité",
  "invoicing.product.finalCtaTitle":
    "Préparez votre première facture dans votre espace sécurisé.",
  "invoicing.product.finalCtaBody":
    "Utilisez le parcours configuré sans transmettre de document électronique tant que le prestataire requis n’est pas actif.",
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
  "invoicing.workspace.newInvoice": "Nouvelle facture",
  "invoicing.workspace.configurationTitle":
    "Configuration de production requise",
  "invoicing.workspace.configurationBody":
    "Le transport électronique n’est pas actif. Les brouillons et la finalisation locale restent disponibles dans cet espace.",
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

  "immo.propertyDetail.individualAdvertiser": "Particulier",
  "immo.propertyDetail.professionalAdvertiser": "Professionnel",
  "immo.propertyDetail.stickyHeaderLabel":
    "Résumé du bien et action principale",
  "immo.propertyDetail.sendRequest": "Envoyer la demande",
  "immo.propertyDetail.requestAppointment": "Demander ce créneau",
  "immo.propertyDetail.chooseFutureAppointment":
    "Choisissez une date de visite future.",

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
  "auto.publish.stepperLabel": "Étapes de publication du véhicule",
  "auto.compare.tableLabel": "Tableau comparatif des véhicules",

  "crm.taskPriority.low": "Basse",
  "crm.taskPriority.medium": "Moyenne",
  "crm.taskPriority.high": "Haute",
  "crm.taskPriority.urgent": "Urgente",

  // --- Admin and CRM migration ---
  "home.homePage.configurationUnavailableTitle":
    "La page d’accueil est momentanément indisponible",
  "home.homePage.configurationUnavailableDescription":
    "La configuration publiée n’a pas pu être chargée. Réessayez sans afficher de contenu incomplet.",
  "home.homePage.loadingConfiguration": "Chargement de la page d’accueil",
  "digital.common.title": "Produits numériques",
  "digital.common.noShipping": "Aucune livraison physique",
  "digital.nav.purchases": "Achats numériques",
  "digital.nav.seller": "Vente numérique",
  "digital.nav.admin": "Produits numériques",
  "sellerworkspace.proDashboardPage.actionQueueTitle": "À traiter",
  "sellerworkspace.proDashboardPage.actionQueueDescription":
    "Les actions prioritaires de votre activité, réunies au même endroit.",
  "sellerworkspace.proDashboardPage.answerContacts": "Consulter les messages",
  "sellerworkspace.proDashboardPage.contactsAwaiting": "messages non lus",
  "sellerworkspace.proDashboardPage.manageListings": "Gérer mes annonces",
  "sellerworkspace.proDashboardPage.manageListingsDescription":
    "Consultez les statuts de vos annonces et mettez votre catalogue à jour.",
  "sellerworkspace.proDashboardPage.actionQueueEmpty": "Aucun message non lu.",
  "delivery.nav": "Livraison & coursier",
  "delivery.courierWorkspace": "Espace coursier",
  /* Staff status is rendered by the shared Header on every route, so
     these three stay in the shell catalogue rather than the admin one. */
  "admin.staff.status.active": "Staff actif",
  "admin.staff.status.suspended": "Staff suspendu",
  "admin.staff.status.revoked": "Staff révoqué",
  // --- listings.characteristics ---
  "listings.characteristics.keyInformation": "Les informations clés",
  "listings.characteristics.amenities": "Équipements et services",
  "listings.characteristics.showMoreCriteria_one":
    "Voir le critère supplémentaire",
  "listings.characteristics.showMoreCriteria_other":
    "Voir les {count} critères supplémentaires",
  "listings.characteristics.hideMoreCriteria":
    "Masquer les critères supplémentaires",
  "listings.characteristics.showAllAmenities":
    "Voir tous les équipements et services",
  "listings.characteristics.hideAllAmenities":
    "Masquer les équipements et services",
  "listings.characteristics.unavailable":
    "Les caractéristiques ne sont pas disponibles pour le moment.",
  "listings.characteristics.location": "Localisation",
  "listings.characteristics.mapLabel":
    "Carte de la zone approximative : {place}",

  // --- listings.discovery ---
  "listings.discovery.fromThisSeller": "Les annonces de ce vendeur",
  "listings.discovery.fromThisPro": "Les annonces de ce pro",
  "listings.discovery.fromThisSellerSubtitle":
    "Les autres annonces publiées par ce vendeur.",
  "listings.discovery.seeMoreFromSeller": "Voir plus d’annonces",
  "listings.discovery.similar": "Annonces similaires",
  "listings.discovery.similarSubtitle":
    "Des annonces proches de celle-ci dans {category}.",
  "listings.discovery.similarSubtitleGeneric":
    "Des annonces proches de celle-ci.",
  "listings.discovery.seeAllInCategory": "Voir tout",
  "listings.discovery.fromThisEmployer": "Les autres offres de {employer}",
  "listings.discovery.fromThisEmployerSubtitle":
    "Les postes actuellement ouverts chez cet employeur.",
} as const;

/** The keys literally stored in a catalogue, plural variants included. */
export type CatalogueKey =
  | keyof typeof messagesFr
  | DigitalMessageKey
  | DeliveryMessageKey
  | AdminMessageKey;

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
