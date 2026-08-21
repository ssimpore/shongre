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
  "common.notifications": "Notifications",
  "a11y.skipToContent": "Aller au contenu principal",
  "common.close": "Fermer",
  "common.search": "Rechercher",
  "common.seeAll": "Voir tout",
  "common.back": "Retour",
  "common.error": "Une erreur est survenue",
  "common.listingCount_one": "{count} annonce",
  "common.listingCount_other": "{count} annonces",
  "common.resultCount_one": "{count} résultat",
  "common.resultCount_other": "{count} résultats",
  "common.reviewCount_one": "{count} avis",
  "common.reviewCount_other": "{count} avis",

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
  "nav.categoryNavigation": "Navigation par catégorie",
  "nav.category.immobilier": "Immobilier",
  "nav.category.vehicules": "Véhicules",
  "nav.category.materielPro": "Matériel pro",
  "nav.category.emploi": "Emploi",
  "nav.category.mode": "Mode",
  "nav.category.maisonJardin": "Maison & Jardin",
  "nav.category.famille": "Famille",
  "nav.category.electronique": "Électronique",
  "nav.category.loisirs": "Loisirs",
  "nav.category.autres": "Autres",
  "nav.category.bonsPlans": "Bons plans !",
  "nav.unreadMessages_one": "{count} message non lu",
  "nav.unreadMessages_other": "{count} messages non lus",

  // --- Footer ---------------------------------------------------------------
  "footer.legalHeading": "Informations légales",
  "footer.terms": "Conditions générales d’utilisation",
  "footer.privacy": "Politique de confidentialité",
  "footer.cookies": "Gestion des cookies",
  "footer.legalNotices": "Mentions légales",
  "footer.accessibility": "Accessibilité (WCAG 2.2 AA)",
  "footer.copyright": "© {year} Shongre SAS. Tous droits réservés.",
  "footer.sectionCategories": "Catégories phares",
  "footer.sectionCities": "Villes & Régions",
  "footer.createProAccount": "Créer un compte Pro",
  "footer.storeDirectory": "Annuaire des boutiques",
  "footer.boostGrid": "Grille des options & boosts",
  "footer.safetyTips": "Conseils de sécurité",
  "footer.contactSupport": "Contacter le support",
  "footer.currentDeals": "Bons plans du moment",
  "footer.comingSoon": "{name} — bientôt disponible",
  "footer.newsletterPitch":
    "Recevez notre sélection hebdomadaire d’annonces et réductions vérifiées.",
  "footer.hosted": "Hébergé",
  "footer.appPitch": "Emportez Shongre partout avec vous.",
  "footer.trust.escrowTitle": "Paiement 100% sécurisé",
  "footer.trust.escrowBody":
    "Vos paiements sont protégés jusqu’à la bonne réception de votre commande.",
  "footer.trust.deliveryTitle": "Livraison intégrée",
  "footer.trust.deliveryBody":
    "Envoi en point relais Mondial Relay, Colissimo ou remise en main propre sécurisée.",
  "footer.trust.verifiedTitle": "Vendeurs & SIRET vérifiés",
  "footer.trust.verifiedBody":
    "Identités contrôlées et entreprises enregistrées au registre du commerce français.",
  "footer.trust.supportTitle": "Support client 7j/7",
  "footer.trust.supportBody":
    "Une équipe dédiée basée en France pour vous assister et modérer les annonces.",

  // --- Language selector ----------------------------------------------------
  "language.choose": "Choisir la langue",
  "language.current": "Langue : {language}. Cliquez pour changer.",
  "language.preferences": "Préférences…",

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

  // --- shell.preferencesModal ---
  "shell.preferencesModal.preferencesRegionales": "Préférences régionales",
  "shell.preferencesModal.personnalisezVotrePaysDeNavigation":
    "Personnalisez votre pays de navigation, votre devise d'affichage et votre langue",
  "shell.preferencesModal.marchePays": "Marché / Pays",
  "shell.preferencesModal.langueDeLInterface": "Langue de l'interface",

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

  // --- ui.searchAutocomplete ---
  "ui.searchAutocomplete.suggestionsDeRecherche": "Suggestions de recherche",
  "ui.searchAutocomplete.categoriesRayons": "Catégories & Rayons",
  "ui.searchAutocomplete.recherchesRecentes": "Recherches récentes",
  "ui.searchAutocomplete.recherchesLesPlusPopulaires":
    "Recherches les plus populaires",

  // --- ui.sellerCard ---
  "ui.sellerCard.verifie": "Vérifié",
  "ui.sellerCard.visiterLaBoutiqueOfficielleCatalogue":
    "Visiter la boutique officielle & catalogue",
  "ui.sellerCard.visiterLaBoutique": "Visiter la boutique",
  "ui.sellerCard.voirLeProfilAnnonces": "Voir le profil & annonces",
  "ui.sellerCard.voirLeProfil": "Voir le profil",

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
    "Paiement sécurisé avec séquestre",
  "auth.accountTypeSelector.messagerieInstantaneeDirecte":
    "Messagerie instantanée directe",
  "auth.accountTypeSelector.badgeOfficielVendeurProVerifie":
    "Badge officiel Vendeur Pro Vérifié",
  "auth.accountTypeSelector.vitrineDeBoutiquePersonnalisable":
    "Vitrine de boutique personnalisable",
  "auth.accountTypeSelector.facturationAutomatiqueAvecTva":
    "Facturation automatique avec TVA",

  // --- auth.authLayout ---
  "auth.authLayout.conformiteRgpdFranceUe": "Conformité RGPD France & UE",
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

  // --- favorites.favoritesPage ---
  "favorites.favoritesPage.aucunFavoriPourLeMoment":
    "Aucun favori pour le moment",
  "favorites.favoritesPage.cliquezSurLeCUr":
    "Cliquez sur le cœur d'une annonce pour la sauvegarder et la retrouver facilement ici.",

  // --- home.homePage ---
  "home.homePage.ceMarcheVientDOuvrir":
    "Ce marché vient d'ouvrir. Publiez la première annonce, ou changez de marché depuis l'en-tête pour explorer les autres pays.",
  "home.homePage.explorerLeCatalogue": "Explorer le catalogue",
  "home.homePage.toutesLesNouveautes": "Toutes les nouveautés",
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

  // --- home.homeCategoryExplorer ---
  "home.homeCategoryExplorer.5CategoriesPrincipales":
    "5 catégories principales",
  "home.homeCategoryExplorer.toutesLesCategories": "Toutes les catégories",
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
  "home.homeCollectionsSection.toutesLesCollections": "Toutes les collections",
  "home.homeCollectionsSection.voirTout": "Voir tout",

  // --- legal.legalPages ---
  "legal.legalPages.conditionsGeneralesDUtilisationCgu":
    "Conditions Générales d'Utilisation (CGU)",
  "legal.legalPages.derniereMiseAJourFevrier":
    "Dernière mise à jour : Février 2026",
  "legal.legalPages.1ObjetDeLaPlateforme": "1. Objet de la plateforme",
  "legal.legalPages.laPlateformeShongreEstUn":
    "La plateforme Shongre est un service de mise en relation entre acheteurs et vendeurs (particuliers et professionnels) pour la publication de petites annonces, la négociation et l'exécution sécurisée de transactions en France métropolitaine.",
  "legal.legalPages.2SequestreProtectionAcheteur":
    "2. Séquestre & Protection Acheteur",
  "legal.legalPages.lorsquUneTransactionEstEffectuee":
    "Lorsqu'une transaction est effectuée via le système de paiement en ligne, les fonds sont conservés sur un compte séquestre français jusqu'à la confirmation de réception conforme par l'acheteur.",
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
    "Utilisez le séquestre Shongre",
  "legal.legalPages.votreArgentEstProtegeJusqu":
    "Votre argent est protégé jusqu'à ce que vous confirmiez la conformité du colis reçu.",

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
  "listings.listingMediaGallery.agrandirEnPleinEcran":
    "Agrandir en plein écran",
  "listings.listingMediaGallery.fermerLePleinEcran": "Fermer le plein écran",

  // --- listings.listingSafetyNotice ---
  "listings.listingSafetyNotice.garantieSecuriteShongre":
    "Garantie & Sécurité Shongre",

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
    "Écrivez votre message... (Entrée pour envoyer)",
  "messaging.messageComposer.photoPreteAEtreEnvoyee":
    "Photo prête à être envoyée",
  "messaging.messageComposer.seraTransmiseAvecVotreMessage":
    "Sera transmise avec votre message",
  "messaging.messageComposer.ajouterUnePhotoALa":
    "Ajouter une photo à la conversation",

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
  "search.searchPage.sauvegarderCetteRecherche": "Sauvegarder cette recherche",
  "search.searchPage.effacerTousLesFiltres": "Effacer tous les filtres",
  "search.searchPage.filtresDeRecherche": "Filtres de recherche",
  "search.searchPage.resultatsDeRecherche": "Résultats de recherche",
  "search.searchPage.recherchePersonnalisee": "Recherche personnalisée",
  "search.searchPage.categories": "Catégories",
  "search.searchPage.sousCategories": "Sous-catégories",
  "search.searchPage.trierPar": "Trier par :",
  "search.searchPage.trierPar2": "Trier par",

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
    "Rechercher une question (ex: séquestre, virement, litige...)",
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
    "Protection acheteur & Séquestre",
  "transactions.directPurchaseCheckoutModal.totalARegler": "Total à régler",
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
    "Garantie Séquestre Shongre :",
  "transactions.transactionsPage.paiementSousSequestre":
    "Paiement sous séquestre",
  "transactions.transactionsPage.validationVendeur": "Validation vendeur",
  "transactions.transactionsPage.fondsVerses": "Fonds versés",

  // --- transactions.disputeModal ---
  "transactions.disputeModal.signalerUnProblemeOuvrirUn":
    "Signaler un problème / Ouvrir un litige",
  "transactions.disputeModal.lesFondsSousSequestreResteront":
    "Les fonds sous séquestre resteront gelés jusqu'à résolution par le service client Shongre.",
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
    "Paiement 100% protégé sous séquestre",
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
    "Virements exécutés via Mangopay, établissement de monnaie électronique agréé ACPR.",

  // --- transactions.transactionDetailModal ---
  "transactions.transactionDetailModal.paiementGarantiParLeService":
    "Paiement garanti par le service de séquestre sécurisé Shongre",
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
    "Pour accélérer la validation des virements de séquestre",
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
    "Compte bancaire SEPA validé pour le séquestre",
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
  "admin.adminAuditLogsPage.role": "Rôle :",
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
  "admin.adminMarketsPage.supprimerLaSurchargeEtReactiver":
    "Supprimer la surcharge et réactiver l'héritage dynamique de France",
  "admin.adminMarketsPage.ajouterUnNouveauMarchePays":
    "Ajouter un nouveau Marché / Pays",
  "admin.adminMarketsPage.creezUnNouveauPaysQui":
    "Créez un nouveau pays qui héritera automatiquement de 100% de la configuration française de référence.",
  "admin.adminMarketsPage.exItPtDeUk": "ex: IT, PT, DE, UK",
  "admin.adminMarketsPage.exItItPtPt": "ex: it-IT, pt-PT, de-DE",
  "admin.adminMarketsPage.bientotDisponible": "Bientôt disponible",
  "admin.adminMarketsPage.archive": "Archivé",
  "admin.adminMarketsPage.franceFrEstLeMarche":
    "France (`FR`) est le marché de référence canonique",
  "admin.adminMarketsPage.ajouterUnMarche": "Ajouter un marché",
  "admin.adminMarketsPage.moteurDHeritageHierarchiqueEn":
    "Moteur d'héritage hiérarchique en cascade :",
  "admin.adminMarketsPage.marcheSourceCanonique100":
    "Marché Source Canonique (100%)",
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
    "Réservation avec Séquestre",
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
    "Filtrer une permission (ex: listing.create, user.suspend)...",
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
    "Comptes bancaires de séquestre enregistrés",
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
  "admin.evidenceDrawer.fitShongreEstime": "Fit Shongre estimé",
  "admin.evidenceDrawer.consulterLaSource": "Consulter la source",

  // --- admin.adminProviderDetailPage ---
  "admin.adminProviderDetailPage.cetIdentifiantDePrestataireN":
    "Cet identifiant de prestataire n'est pas répertorié dans le registre canonique Shongre. Il a peut-être été retiré ou renommé.",
  "admin.adminProviderDetailPage.retourAuCatalogueDesFournisseurs":
    "Retour au catalogue des fournisseurs",
  "admin.adminProviderDetailPage.capacitesFournies": "Capacités fournies :",
  "admin.adminProviderDetailPage.configurationCles": "Configuration & Clés",
  "admin.adminProviderDetailPage.marchesSurcharges": "Marchés & Surcharges",
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
    "Aucune surcharge définie.",

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
    "Ex: Voitures, Matériel Pro...",
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
  "admin.taxonomyNodeEditor.optionsDEtat": "Options d'état :",
  "admin.taxonomyNodeEditor.venteAutorisee": "Vente autorisée :",
  "admin.taxonomyNodeEditor.sequestreCbActif": "Séquestre CB actif :",
  "admin.taxonomyNodeEditor.frontiereDArchitecture":
    "Frontière d'architecture :",
  "admin.taxonomyNodeEditor.eligibiliteIntrinseque": "éligibilité intrinsèque",
  "admin.taxonomyNodeEditor.gestionnaireDePrestataires":
    "Gestionnaire de Prestataires",
  "admin.taxonomyNodeEditor.paiementSecuriseEnLigneSequestre":
    "Paiement sécurisé en ligne (Séquestre Shongre)",
  "admin.taxonomyNodeEditor.reservationAvecAcompteDeSequestre":
    "Réservation avec acompte de séquestre",
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
    "Ex: Achetez et vendez vos articles {category} en toute sécurité avec paiement séquestre Shongre...",

  // --- shell.demoRoleSwitcher ---
  "shell.demoRoleSwitcher.modeDemo": "Mode Démo",
  "shell.demoRoleSwitcher.testerLes6ProfilsEt":
    "Tester les 6 profils et parcours sans mot de passe :",
  "shell.demoRoleSwitcher.changerDeRolePourTester":
    "Changer de rôle pour tester",
  "shell.demoRoleSwitcher.accesDirectAuxProfilsPublics":
    "Accès direct aux profils publics",
  "shell.demoRoleSwitcher.0AnnonceParticulier": "📦 0 annonce (Particulier)",
  "shell.demoRoleSwitcher.0AnnoncePro": "📦 0 annonce (Pro)",
  "shell.demoRoleSwitcher.profilSuspenduSecurite":
    "🚫 Profil Suspendu (Sécurité)",

  // --- shell.header ---
  "shell.header.tableauDeBordCompte": "Tableau de bord compte",
  "shell.header.deconnexion": "Déconnexion",
  "shell.header.connectezVousPourGererVos":
    "Connectez-vous pour gérer vos annonces et messages",
  "shell.header.explorerSurLaCarte": "Explorer sur la carte",
  "shell.header.bonsPlansPrixReduits": "Bons plans & Prix réduits",
  "shell.header.tableauDeBord": "Tableau de bord",
  "shell.header.mesAnnonces": "Mes annonces",

  // --- shell.locationPickerModal ---
  "shell.locationPickerModal.appliquerLaZone": "Appliquer la zone",

  // --- shell.preferencesModal ---
  "shell.preferencesModal.validerLesPreferences": "Valider les préférences",

  // --- ui.categoryFilterRail ---
  "ui.categoryFilterRail.sousCategories": "Sous-catégories :",

  // --- ui.dropdownMenu ---
  "ui.dropdownMenu.selectionne": "sélectionné",
  "ui.dropdownMenu.aucunResultatTrouve": "Aucun résultat trouvé",

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
  "admin.adminMarketsPage.referenceCanonique": "Référence Canonique",
  "admin.adminMarketsPage.toutReinitialiserSurFrance":
    "Tout réinitialiser sur France",
  "admin.adminMarketsPage.vousEditezActuellementLa":
    "Vous éditez actuellement la",
  "admin.adminMarketsPage.creerAvecHeritageFrance":
    "Créer avec héritage France",
  "admin.adminMarketsPage.cetteValeurSeraEnregistreeEn":
    "Cette valeur sera enregistrée en tant que surcharge exclusive de ce marché. Vous pourrez à tout moment revenir à la valeur dynamique de France en cliquant sur « Réinitialiser ».",
  "admin.adminMarketsPage.enregistrerLaSurcharge": "Enregistrer la surcharge",

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
    "Référentiel canonique unique pilotant l'arborescence, les formulaires de publication, les facettes de recherche, les capacités de séquestre et le multi-marchés.",
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
    "Matrice de Couverture Multi-Marchés & Héritage France",
  "admin.providerMarketMatrix.laFranceEstLeMarche":
    "La France (🇫🇷) est le marché de référence. Les autres pays héritent automatiquement de la configuration sauf surcharge explicite.",
  "admin.providerMarketMatrix.ref": "RÉF",
  "admin.providerMarketMatrix.referenceActive": "Référence active",
  "admin.providerMarketMatrix.nonConfigure": "Non configuré",
  "admin.providerMarketMatrix.heriteDeFr": "↳ Hérité de FR",
  "admin.providerMarketMatrix.personnalise": "★ Personnalisé",
  "admin.providerMarketMatrix.desactive": "Désactivé",

  // --- admin.providerMarketOverridesTab ---
  "admin.providerMarketOverridesTab.selectionnezLeMarcheAInspecter":
    "Sélectionnez le marché à inspecter ou surcharger :",
  "admin.providerMarketOverridesTab.baseDHeritage": "Base d'Héritage",
  "admin.providerMarketOverridesTab.touteModificationApporteeALa":
    "Toute modification apportée à la France est immédiatement répercutée sur les marchés sans surcharge.",
  "admin.providerMarketOverridesTab.configurationPersonnalisee":
    "★ Configuration Personnalisée",
  "admin.providerMarketOverridesTab.heriteDeFrance": "↳ Hérité de France",
  "admin.providerMarketOverridesTab.noteDeConformiteOuMotif":
    "Note de conformité ou motif de surcharge :",
  "admin.providerMarketOverridesTab.reinitialiserSurFrance":
    "Réinitialiser sur France",
  "admin.providerMarketOverridesTab.appliquerLaSurcharge":
    "Appliquer la surcharge",

  // --- admin.providerOverviewDashboard ---
  "admin.providerOverviewDashboard.integrationsRepertoriees":
    "Intégrations Répertoriées",
  "admin.providerOverviewDashboard.santeOperationnelle": "Santé Opérationnelle",
  "admin.providerOverviewDashboard.heritageFranceActif":
    "Héritage France actif",
  "admin.providerOverviewDashboard.etatDesFonctionsCritiquesDe":
    "État des Fonctions Critiques de la Plateforme (France • Référence)",
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
  "auth.registerPages.continuerVersLesInformationsEntreprise":
    "Continuer",
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

  // --- auth.phoneVerificationModal ---
  "auth.phoneVerificationModal.verificationDuNumeroDeTelephone":
    "Vérification du numéro de téléphone",
  "auth.phoneVerificationModal.laVerificationTelephoniqueProtegeLes":
    "La vérification téléphonique protège les acheteurs et vendeurs lors des remises en main propre et renforce la confiance.",
  "auth.phoneVerificationModal.paysEtIndicatif": "Pays et indicatif",
  "auth.phoneVerificationModal.recevoirMonCodeParSms":
    "Recevoir mon code par SMS",
  "auth.phoneVerificationModal.saisissezLeCodeRecuPar":
    "Saisissez le code reçu par SMS (6 chiffres)",
  "auth.phoneVerificationModal.confirmerLeNumero": "Confirmer le numéro",
  "auth.phoneVerificationModal.changerDeNumero": "Changer de numéro",

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
    "Explorez l’ensemble des catégories et sous-catégories de Shongre. Trouvez instantanément les annonces vérifiées près de chez vous ou partout en France.",
  "categories.categoriesPage.affichageDe": "Affichage de",
  "categories.categoriesPage.afficherToutesLesCategories":
    "Afficher toutes les catégories",

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
    "Achetez et vendez en toute sérénité : paiements sécurisés, livraison intégrée et vendeurs vérifiés.",
  "home.homePage.garantiesShongre": "Garanties Shongre",
  "home.homePage.paiementsSecurises": "Paiements sécurisés",
  "home.homePage.livraisonIntegree": "Livraison intégrée",
  "home.homePage.vendeursVerifies": "Vendeurs vérifiés",
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

  // --- home.heroBoostedScroll ---
  "home.heroBoostedScroll.carouselLabel": "Annonces vedettes",
  "home.heroBoostedScroll.previous": "Annonce précédente",
  "home.heroBoostedScroll.next": "Annonce suivante",
  "home.heroBoostedScroll.annoncesControlees": "Annonces contrôlées",
  "home.heroBoostedScroll.securiteFiabiliteEtQualiteAssurees":
    "Sécurité, fiabilité et qualité assurées.",
  "home.heroBoostedScroll.enSavoirPlus": "En savoir plus",
  "home.heroBoostedScroll.livraison": "Livraison",

  // --- home.homeCategoryExplorer ---
  "home.homeCategoryExplorer.explorerParCategorie": "Explorer par catégorie",
  "home.homeCategoryExplorer.desMillionsDAnnoncesVerifiees":
    "Des millions d’annonces vérifiées classées avec précision selon vos projets et vos envies.",

  // --- home.homeCollectionsSection ---
  "home.homeCollectionsSection.nosCollectionsDuMoment":
    "Nos collections du moment",
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
  "listings.listingDetailPage.gererMesAnnoncesStats":
    "Gérer mes annonces & stats",
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
    "Mondial Relay (Point relais & Locker) ou Colissimo Domicile",
  "listings.listingFulfillmentSummary.aPartirDe399": "À partir de 3,99 €",
  "listings.listingFulfillmentSummary.transportDeMeublesGrosColis":
    "Transport de meubles & Gros colis",
  "listings.listingFulfillmentSummary.livraisonParTransporteurSpecialiseCocolis":
    "Livraison par transporteur spécialisé Cocolis",
  "listings.listingFulfillmentSummary.surDevisTransport": "Sur devis transport",
  "listings.listingFulfillmentSummary.retraitDirectDansLeMagasin":
    "Retrait direct dans le magasin du vendeur Pro",

  // --- listings.listingSafetyNotice ---
  "listings.listingSafetyNotice.sequestreGaranti": "Séquestre garanti",
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
    "Même si vous êtes désabonné de la newsletter, vous continuerez à recevoir les emails essentiels relatifs à la sécurité de votre compte, à vos paiements sous séquestre et au suivi de vos commandes.",

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

  // --- publishing.publishWizard ---
  "publishing.publishWizard.votreAnnonce": "Votre annonce",
  "publishing.publishWizard.deposerUneAnnonceSurShongre":
    "Déposer une annonce sur Shongre",
  "publishing.publishWizard.queSouhaitezVousPublier":
    "Que souhaitez-vous publier ?",
  "publishing.publishWizard.selectionnezLIntentionEtLa":
    "Sélectionnez l'intention et la catégorie exacte dans la taxonomie Shongre.",
  "publishing.publishWizard.typeDAnnonceIntention":
    "Type d'annonce (Intention)",
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
  "publishing.publishWizard.sequestreGaranti": "Séquestre Garanti",
  "publishing.publishWizard.lAcheteurPeutPayerImmediatement":
    "L'acheteur peut payer immédiatement par carte bancaire. Vos fonds sont sécurisés.",
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
  "publishing.publishWizard.sequestre": "Séquestre",
  "publishing.publishWizard.toutesLesTransactionsMultiMarches":
    "Toutes les transactions multi-marchés sont automatiquement couvertes par le séquestre Shongre. Les prix sont convertis en toute transparence et la TVA locale est appliquée en conformité avec la réglementation européenne et suisse.",
  "publishing.publishWizard.optionsDeVisibiliteBoostFacultatif":
    "Options de visibilité & Boost (Facultatif)",
  "publishing.publishWizard.multipliezVosVuesEnPositionnant":
    "Multipliez vos vues en positionnant votre annonce en tête des résultats sur tous vos marchés sélectionnés.",
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
    "Pour geler les fonds sous séquestre et être remboursé en cas de non-réception ou de colis non conforme, vous devez ouvrir un dossier de litige officiel directement depuis la transaction.",
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
    "Retrouvez les réponses aux questions fréquentes sur le séquestre, la livraison, la publication et votre compte.",
  "support.helpCenterPage.aucunArticleNeCorrespondA":
    "Aucun article ne correspond à votre recherche. Vous pouvez contacter notre équipe ci-dessous.",
  "support.helpCenterPage.notreEquipeDeSupportClient":
    "Notre équipe de support client basée en France vous assiste 7j/7 pour vos commandes, annonces et questions.",

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
  "support.supportContextCard.commandeSequestreLie": "Commande / Séquestre lié",

  // --- transactions.directPurchaseCheckoutModal ---
  "transactions.directPurchaseCheckoutModal.selectionnezParmiLesOptionsReellement":
    "Sélectionnez parmi les options réellement disponibles pour cet article.",
  "transactions.directPurchaseCheckoutModal.fondsConservesSousSequestreBancaire":
    "Fonds conservés sous séquestre bancaire jusqu'à confirmation de conformité.",
  "transactions.directPurchaseCheckoutModal.paiementEnLigneTemporairementIndisponible":
    "Paiement en ligne temporairement indisponible",
  "transactions.directPurchaseCheckoutModal.leSystemeDeSequestreEn":
    "Le système de séquestre en ligne est momentanément indisponible sur ce marché. Vous pouvez contacter le vendeur pour organiser une remise en main propre.",
  "transactions.directPurchaseCheckoutModal.referenceCommande":
    "Référence commande :",
  "transactions.directPurchaseCheckoutModal.communiquezCeCodeAuVendeur":
    "Communiquez ce code au vendeur lors du rendez-vous uniquement après avoir vérifié le produit.",

  // --- transactions.transactionsPage ---
  "transactions.transactionsPage.transactionsReservationsSequestre":
    "Transactions, Réservations & Séquestre",
  "transactions.transactionsPage.gerezVosReservationsVosRemises":
    "Gérez vos réservations, vos remises en main propre et le déblocage des fonds sécurisés",
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
    "Paiement Séquestre",
  "transactions.reservationCheckoutModal.rendezVousDirectAvecValidation":
    "Rendez-vous direct avec validation par code secret à 6 chiffres.",
  "transactions.reservationCheckoutModal.retraitChezUnCommercantPartenaire":
    "Retrait chez un commerçant partenaire avec suivi en temps réel (3-4 jours).",
  "transactions.reservationCheckoutModal.directementDansVotreBoiteAux":
    "Directement dans votre boîte aux lettres ou avec signature (48h).",
  "transactions.reservationCheckoutModal.continuerVersLeRecapitulatif":
    "Continuer vers le récapitulatif",
  "transactions.reservationCheckoutModal.lArgentNeSeraVerse":
    "L'argent ne sera versé au vendeur qu'après remise de l'article conforme. Si le vendeur décline ou si l'article est non conforme, vous êtes intégralement remboursé.",
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
    "Séquestre sécurisé & virements de ventes",
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
  "publishCta.becomeSeller": "Devenir vendeur",
  "publishCta.becomeSellerShort": "Vendre",

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
  "meta.transactions.title": "Transactions, réservations & séquestre",
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
  "meta.crmAiProspecting.title": "Prospection assistée par IA",
  "meta.crmAiProspecting.description":
    "Recherche de futurs vendeurs professionnels qualifiés.",
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
    "Voir le payload complet de « {action} »",

  /* Accessible names for controls that previously had only a placeholder. */
  "messaging.messageComposer.votreMessage": "Votre message",
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
  "shell.demoRoleSwitcher.roleHorsPersonasDemo":
    "Rôle plateforme hors des personas de démonstration",
  "sellerworkspace.proDashboardPage.pasEncoreDeDonnees":
    "Pas encore de données",
  "sellerworkspace.proDashboardPage.totalVuesUniques":
    "Total : {count} vues uniques",
  "errors.notFoundPage.explorerLesCategories": "Explorer les catégories",
  "errors.notFoundPage.toutesLesCategories": "Toutes les catégories",
} as const;

/** The keys literally stored in a catalogue, plural variants included. */
export type CatalogueKey = keyof typeof messagesFr;

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
