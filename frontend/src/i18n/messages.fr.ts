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
  'common.loading': 'Chargement…',
  'common.retry': 'Réessayer',
  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.close': 'Fermer',
  'common.search': 'Rechercher',
  'common.seeAll': 'Voir tout',
  'common.back': 'Retour',
  'common.error': 'Une erreur est survenue',
  'common.listingCount_one': '{count} annonce',
  'common.listingCount_other': '{count} annonces',
  'common.resultCount_one': '{count} résultat',
  'common.resultCount_other': '{count} résultats',
  'common.reviewCount_one': '{count} avis',
  'common.reviewCount_other': '{count} avis',

  // --- Primary navigation ---------------------------------------------------
  'nav.home': 'Accueil',
  'nav.search': 'Recherche',
  'nav.messages': 'Messages',
  'nav.account': 'Compte',
  'nav.sell': 'Vendre',
  'nav.favorites': 'Favoris',
  'nav.notifications': 'Notifications',
  'nav.categories': 'Catégories',
  'nav.openMenu': 'Ouvrir le menu',
  'nav.closeMenu': 'Fermer le menu',
  'nav.mobileLabel': 'Navigation mobile',
  'nav.unreadMessages_one': '{count} message non lu',
  'nav.unreadMessages_other': '{count} messages non lus',

  // --- Footer ---------------------------------------------------------------
  'footer.legalHeading': 'Informations légales',
  'footer.terms': 'Conditions générales d’utilisation',
  'footer.privacy': 'Politique de confidentialité',
  'footer.cookies': 'Gestion des cookies',
  'footer.legalNotices': 'Mentions légales',
  'footer.accessibility': 'Accessibilité (WCAG 2.2 AA)',
  'footer.copyright': '© {year} Shongre SAS. Tous droits réservés.',
  'footer.sectionCategories': 'Catégories phares',
  'footer.sectionCities': 'Villes & Régions',
  'footer.createProAccount': 'Créer un compte Pro',
  'footer.storeDirectory': 'Annuaire des boutiques',
  'footer.boostGrid': 'Grille des options & boosts',
  'footer.safetyTips': 'Conseils de sécurité',
  'footer.contactSupport': 'Contacter le support',
  'footer.currentDeals': 'Bons plans du moment',
  'footer.comingSoon': '{name} — bientôt disponible',
  'footer.newsletterPitch': "Recevez notre sélection hebdomadaire d’annonces et réductions vérifiées.",
  'footer.hosted': "Hébergé",
  'footer.appPitch': "Emportez Shongre partout avec vous.",
  'footer.trust.escrowTitle': "Paiement 100% sécurisé",
  'footer.trust.escrowBody': "Vos paiements sont protégés jusqu’à la bonne réception de votre commande.",
  'footer.trust.deliveryTitle': "Livraison intégrée",
  'footer.trust.deliveryBody': "Envoi en point relais Mondial Relay, Colissimo ou remise en main propre sécurisée.",
  'footer.trust.verifiedTitle': "Vendeurs & SIRET vérifiés",
  'footer.trust.verifiedBody': "Identités contrôlées et entreprises enregistrées au registre du commerce français.",
  'footer.trust.supportTitle': "Support client 7j/7",
  'footer.trust.supportBody': "Une équipe dédiée basée en France pour vous assister et modérer les annonces.",

  // --- Language selector ----------------------------------------------------
  'language.choose': 'Choisir la langue',
  'language.current': 'Langue : {language}. Cliquez pour changer.',
  'language.comingSoon': 'Bientôt',
  'language.preferences': 'Préférences…',

  // --- Cookie consent -------------------------------------------------------
  'consent.title': 'Vos préférences de confidentialité',
  'consent.body':
    'Nous utilisons des cookies strictement nécessaires au fonctionnement du site. ' +
    'Avec votre accord, nous y ajoutons la mesure d’audience et la personnalisation. ' +
    'Vous pouvez changer d’avis à tout moment depuis « Gestion des cookies ».',
  'consent.learnMore': 'En savoir plus',
  'consent.acceptAll': 'Tout accepter',
  'consent.rejectAll': 'Tout refuser',
  'consent.customise': 'Personnaliser',
  'consent.panelTitle': 'Gestion des cookies',
  'consent.panelDescription': 'Choisissez finalité par finalité. Votre choix est conservé 6 mois.',
  'consent.saveChoices': 'Enregistrer mes choix',
  'consent.alwaysOn': 'Toujours actifs — indispensables au service.',
  'consent.category.necessary': 'Strictement nécessaires',
  'consent.category.necessaryDescription':
    'Session, sécurité et mémorisation de vos préférences (marché, langue, localisation). ' +
    'Sans eux, le site ne peut pas fonctionner.',
  'consent.category.analytics': 'Mesure d’audience',
  'consent.category.analyticsDescription':
    'Statistiques de fréquentation anonymisées pour comprendre quelles pages sont utiles ' +
    'et corriger ce qui ne l’est pas.',
  'consent.category.marketing': 'Personnalisation & publicité',
  'consent.category.marketingDescription':
    'Recommandations d’annonces et mesure des campagnes. Refuser ne réduit pas ' +
    'le nombre d’annonces affichées, seulement leur personnalisation.',

  // --- proDirectory ---
  'proDirectory.rechercherParNomDeBoutique': "Rechercher par nom de boutique ou par ville...",
  'proDirectory.rechercherUneBoutiqueProfessionnelle': "Rechercher une boutique professionnelle",
  'proDirectory.aucuneBoutiqueProfessionnelleTrouvee': "Aucune boutique professionnelle trouvée",

  // --- proDirectory ---
  'proDirectory.aucunCommercantOuArtisanNe': "Aucun commerçant ou artisan ne correspond à votre recherche par nom ou par ville.",
  'proDirectory.effacerLaRecherche': "Effacer la recherche",

  // --- shell.accountLayout ---
  'shell.accountLayout.navigationDuCompte': "Navigation du compte",
  'shell.accountLayout.comptePro': "Compte Pro",
  'shell.accountLayout.seDeconnecter': "Se déconnecter",

  // --- shell.focusedLayout ---
  'shell.focusedLayout.quitterEtRevenirAL': "Quitter et revenir à l'accueil",

  // --- shell.header ---
  'shell.header.rechercherUneAnnonce': "Rechercher une annonce",
  'shell.header.fermerLeMenu': "Fermer le menu",
  'shell.header.compteProfessionnel': "Compte Professionnel",
  'shell.header.verifie': "Vérifié",

  // --- shell.locationPickerModal ---
  'shell.locationPickerModal.zoneGeographique': "Zone géographique",
  'shell.locationPickerModal.rayonDeRecherche': "Rayon de recherche",

  // --- shell.preferencesModal ---
  'shell.preferencesModal.preferencesRegionales': "Préférences régionales",
  'shell.preferencesModal.personnalisezVotrePaysDeNavigation': "Personnalisez votre pays de navigation, votre devise d'affichage et votre langue",
  'shell.preferencesModal.marchePays': "Marché / Pays",
  'shell.preferencesModal.langueDeLInterface': "Langue de l'interface",

  // --- shell.errorBoundary ---
  'shell.errorBoundary.uneErreurInattendueEstSurvenue': "Une erreur inattendue est survenue",
  'shell.errorBoundary.applicationARencontreUnProbleme': "L'application a rencontré un problème temporaire d'affichage.",
  'shell.errorBoundary.retourAccueil': "Retour accueil",
  'shell.errorBoundary.actualiserLaPage': "Actualiser la page",

  // --- ui.badge ---
  'ui.badge.profilVerifie': "Profil vérifié",

  // --- ui.categoryFilterRail ---
  'ui.categoryFilterRail.faireDefilerLesCategoriesVers': "Faire défiler les catégories vers la gauche",
  'ui.categoryFilterRail.filtresParCategorie': "Filtres par catégorie",
  'ui.categoryFilterRail.afficherToutesLesAnnoncesActives': "Afficher toutes les annonces actives",
  'ui.categoryFilterRail.faireDefilerLesCategoriesVers2': "Faire défiler les catégories vers la droite",
  'ui.categoryFilterRail.toutesLesAnnonces': "Toutes les annonces",

  // --- ui.globalSearchBar ---
  'ui.globalSearchBar.rechercheGlobale': "Recherche globale",
  'ui.globalSearchBar.selectionnerUneCategorie': "Sélectionner une catégorie",
  'ui.globalSearchBar.rechercherUneCategorie': "Rechercher une catégorie…",
  'ui.globalSearchBar.rechercherUneAnnonce': "Rechercher une annonce",
  'ui.globalSearchBar.effacerLeTexte': "Effacer le texte",
  'ui.globalSearchBar.lancerLaRecherche': "Lancer la recherche",
  'ui.globalSearchBar.rechercheMobile': "Recherche mobile",
  'ui.globalSearchBar.rechercheEtFiltres': "Recherche et filtres",
  'ui.globalSearchBar.filtrerLesCategories': "Filtrer les catégories…",
  'ui.globalSearchBar.recherchePrincipaleDePetitesAnnonces': "Recherche principale de petites annonces",
  'ui.globalSearchBar.filtrerParCategorie': "Filtrer par catégorie",
  'ui.globalSearchBar.chercherUneCategorie': "Chercher une catégorie…",
  'ui.globalSearchBar.effacerLaRecherche': "Effacer la recherche",
  'ui.globalSearchBar.lancerLaRechercheDePetites': "Lancer la recherche de petites annonces",
  'ui.globalSearchBar.toutesLesCategories': "Toutes les catégories",
  'ui.globalSearchBar.categories': "Catégories",

  // --- ui.listingCard ---
  'ui.listingCard.annonceALaUne': "Annonce à la une",

  // --- ui.marketSelector ---
  'ui.marketSelector.changerDePaysMarche': "Changer de pays / marché",
  'ui.marketSelector.preferencesRegionalesDAffichage': "Préférences régionales & d'affichage",
  'ui.marketSelector.personnalisezVotrePaysVotreLangue': "Personnalisez votre pays, votre langue d'affichage et votre devise préférée sur Shongre.",
  'ui.marketSelector.marcheTerritoire': "Marché & Territoire",
  'ui.marketSelector.preferencesLangueDevise': "Préférences (Langue, Devise...)",
  'ui.marketSelector.marcheTerritoireActif': "Marché / Territoire Actif",
  'ui.marketSelector.deviseDAffichageDesPrix': "Devise d'affichage des prix",

  // --- ui.noResultsFound ---
  'ui.noResultsFound.conseilsPourTrouverVotreBonheur': "Conseils pour trouver votre bonheur :",

  // --- ui.searchAutocomplete ---
  'ui.searchAutocomplete.suggestionsDeRecherche': "Suggestions de recherche",
  'ui.searchAutocomplete.categoriesRayons': "Catégories & Rayons",
  'ui.searchAutocomplete.recherchesRecentes': "Recherches récentes",
  'ui.searchAutocomplete.recherchesLesPlusPopulaires': "Recherches les plus populaires",

  // --- ui.sellerCard ---
  'ui.sellerCard.verifie': "Vérifié",
  'ui.sellerCard.visiterLaBoutiqueOfficielleCatalogue': "Visiter la boutique officielle & catalogue",
  'ui.sellerCard.visiterLaBoutique': "Visiter la boutique",
  'ui.sellerCard.voirLeProfilAnnonces': "Voir le profil & annonces",
  'ui.sellerCard.voirLeProfil': "Voir le profil",

  // --- auth.forgotPasswordPage ---
  'auth.forgotPasswordPage.votreEmailExempleFr': "votre.email@exemple.fr",
  'auth.forgotPasswordPage.collezLeTokenRecuPar': "Collez le token reçu par email",
  'auth.forgotPasswordPage.nouveauMotDePasse': "Nouveau mot de passe",

  // --- auth.loginPage ---
  'auth.loginPage.ex123456Ou84921049': "Ex: 123456 ou 8492-1049",
  'auth.loginPage.votreEmailExempleFr': "votre.email@exemple.fr",
  'auth.loginPage.resterConnecteSurCetAppareil': "Rester connecté sur cet appareil",
  'auth.loginPage.acheteurVendeur': "Acheteur / Vendeur",
  'auth.loginPage.siretVitrineVerifiee': "SIRET & Vitrine vérifiée",

  // --- auth.registerPages ---
  'auth.registerPages.creezVotreCompteGratuitEn': "Créez votre compte gratuit en 1 minute pour acheter et vendre en toute sérénité",
  'auth.registerPages.14RueDesAntiquaires': "14 rue des Antiquaires",
  'auth.registerPages.evolutionDeCompteSouple': "Évolution de compte souple :",
  'auth.registerPages.vendeurProfessionnel': "Vendeur Professionnel",
  'auth.registerPages.identiteDuGerant': "Identité du gérant",

  // --- auth.verifyEmailPage ---
  'auth.verifyEmailPage.verificationDAdresseEmail': "Vérification d'adresse email",
  'auth.verifyEmailPage.confirmezVotreAdresseEmailPour': "Confirmez votre adresse email pour sécuriser votre compte et activer toutes les fonctionnalités",
  'auth.verifyEmailPage.collezIciVotreJetonDe': "Collez ici votre jeton de validation",
  'auth.verifyEmailPage.renvoyerUnEmailDeValidation': "Renvoyer un email de validation",

  // --- auth.accountTypeSelector ---
  'auth.accountTypeSelector.depotDAnnoncesGratuitEt': "Dépôt d'annonces gratuit et instantané",
  'auth.accountTypeSelector.paiementSecuriseAvecSequestre': "Paiement sécurisé avec séquestre",
  'auth.accountTypeSelector.messagerieInstantaneeDirecte': "Messagerie instantanée directe",
  'auth.accountTypeSelector.badgeOfficielVendeurProVerifie': "Badge officiel Vendeur Pro Vérifié",
  'auth.accountTypeSelector.vitrineDeBoutiquePersonnalisable': "Vitrine de boutique personnalisable",
  'auth.accountTypeSelector.facturationAutomatiqueAvecTva': "Facturation automatique avec TVA",

  // --- auth.authLayout ---
  'auth.authLayout.conformiteRgpdFranceUe': "Conformité RGPD France & UE",
  'auth.authLayout.protectionAcheteurVendeur': "Protection Acheteur & Vendeur",

  // --- auth.mFAModal ---
  'auth.mFAModal.copierLaCleSecrete': "Copier la clé secrète",
  'auth.mFAModal.copierLesCodesDeSecours': "Copier les codes de secours",

  // --- auth.passwordField ---
  'auth.passwordField.robustesseDuMotDePasse': "Robustesse du mot de passe :",
  'auth.passwordField.8CaracteresMinimum': "8 caractères minimum",
  'auth.passwordField.1CaractereSpecial': "1 caractère spécial",

  // --- auth.upgradeToProModal ---
  'auth.upgradeToProModal.exAtelierEbenisterieDupont': "Ex: Atelier Ébénisterie Dupont",
  'auth.upgradeToProModal.12RueDuCommerce75011': "12 rue du Commerce, 75011 Paris",
  'auth.upgradeToProModal.verificationLegale': "Vérification légale :",

  // --- categories.categoriesPage ---
  'categories.categoriesPage.filtrerUneCategorieSousCategorie': "Filtrer une catégorie, sous-catégorie...",
  'categories.categoriesPage.toutesLesCategories': "Toutes les catégories",
  'categories.categoriesPage.voirToutesLesAnnonces': "Voir toutes les annonces",
  'categories.categoriesPage.voirTout': "Voir tout",
  'categories.categoriesPage.aucuneCategorieTrouvee': "Aucune catégorie trouvée",

  // --- collections.collectionsPage ---
  'collections.collectionsPage.chercherUneThematique': "Chercher une thématique...",
  'collections.collectionsPage.filtrerDansLaSelection': "Filtrer dans la sélection...",
  'collections.collectionsPage.toutesLesCollections': "Toutes les collections",
  'collections.collectionsPage.leMotDeLaRedaction': "Le mot de la rédaction",
  'collections.collectionsPage.aucuneCollectionTrouvee': "Aucune collection trouvée",
  'collections.collectionsPage.aucuneAnnonceTrouvee': "Aucune annonce trouvée",
  'collections.collectionsPage.decouvrirDAutresCollections': "Découvrir d’autres collections",

  // --- favorites.favoritesPage ---
  'favorites.favoritesPage.aucunFavoriPourLeMoment': "Aucun favori pour le moment",
  'favorites.favoritesPage.cliquezSurLeCUr': "Cliquez sur le cœur d'une annonce pour la sauvegarder et la retrouver facilement ici.",

  // --- home.homePage ---
  'home.homePage.ceMarcheVientDOuvrir': "Ce marché vient d'ouvrir. Publiez la première annonce, ou changez de marché depuis l'en-tête pour explorer les autres pays.",
  'home.homePage.leMarcheLocalFrancaisDe': "Le marché local français de confiance",
  'home.homePage.explorerLeCatalogue': "Explorer le catalogue",
  'home.homePage.toutesLesNouveautes': "Toutes les nouveautés",
  'home.homePage.voirTout': "Voir tout",
  'home.homePage.toutesLesOffres': "Toutes les offres",
  'home.homePage.tousLesProfessionnels': "Tous les professionnels",

  // --- home.homeCategoryExplorer ---
  'home.homeCategoryExplorer.5CategoriesPrincipales': "5 catégories principales",
  'home.homeCategoryExplorer.toutesLesCategories': "Toutes les catégories",
  'home.homeCategoryExplorer.voirTout': "Voir tout",

  // --- home.homeCollectionsSection ---
  'home.homeCollectionsSection.thematiquesCollections': "thématiques collections",
  'home.homeCollectionsSection.toutesLesCollections': "Toutes les collections",
  'home.homeCollectionsSection.voirTout': "Voir tout",

  // --- home.homeTrustStrip ---
  'home.homeTrustStrip.engagementsEtGarantiesShongre': "Engagements et garanties Shongre",

  // --- legal.legalPages ---
  'legal.legalPages.conditionsGeneralesDUtilisationCgu': "Conditions Générales d'Utilisation (CGU)",
  'legal.legalPages.derniereMiseAJourFevrier': "Dernière mise à jour : Février 2026",
  'legal.legalPages.1ObjetDeLaPlateforme': "1. Objet de la plateforme",
  'legal.legalPages.laPlateformeShongreEstUn': "La plateforme Shongre est un service de mise en relation entre acheteurs et vendeurs (particuliers et professionnels) pour la publication de petites annonces, la négociation et l'exécution sécurisée de transactions en France métropolitaine.",
  'legal.legalPages.2SequestreProtectionAcheteur': "2. Séquestre & Protection Acheteur",
  'legal.legalPages.lorsquUneTransactionEstEffectuee': "Lorsqu'une transaction est effectuée via le système de paiement en ligne, les fonds sont conservés sur un compte séquestre français jusqu'à la confirmation de réception conforme par l'acheteur.",
  'legal.legalPages.3EngagementsDesProfessionnels': "3. Engagements des Professionnels",
  'legal.legalPages.lesVendeursProfessionnelsSEngagent': "Les vendeurs professionnels s'engagent à fournir un numéro SIRET valide, à respecter le droit de rétractation légal de 14 jours et à émettre des factures conformes aux exigences fiscales françaises.",
  'legal.legalPages.politiqueDeConfidentialiteRgpd': "Politique de Confidentialité & RGPD",
  'legal.legalPages.shongreAttacheLaPlusGrande': "Shongre attache la plus grande importance à la protection de vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD 2016/679) et à la loi Informatique et Libertés.",
  'legal.legalPages.principeDeMinimisation': "Principe de minimisation :",
  'legal.legalPages.mentionsLegales': "Mentions Légales",
  'legal.legalPages.editeur': "Éditeur :",
  'legal.legalPages.shongreSasAuCapitalDe': "Shongre SAS au capital de 50 000 € - RCS Paris 912 345 678",
  'legal.legalPages.siegeSocial': "Siège social :",
  'legal.legalPages.directeurDeLaPublication': "Directeur de la publication :",
  'legal.legalPages.antoineFabrePresident': "Antoine Fabre, Président",
  'legal.legalPages.hebergement': "Hébergement :",
  'legal.legalPages.serveursSecurisesSituesEnFrance': "Serveurs sécurisés situés en France métropolitaine.",
  'legal.legalPages.declarationDAccessibiliteWcag2': "Déclaration d'Accessibilité (WCAG 2.2 AA)",
  'legal.legalPages.shongreSEngageARendre': "Shongre s'engage à rendre sa plateforme accessible à tous les internautes, y compris les personnes en situation de handicap, conformément aux standards internationaux WCAG 2.2 niveau AA.",
  'legal.legalPages.navigationIntegraleAuClavierAvec': "Navigation intégrale au clavier avec focus visible",
  'legal.legalPages.contrastesTypographiquesSuperieursAuxRatios': "Contrastes typographiques supérieurs aux ratios 4.5:1",
  'legal.legalPages.labelsEtAttributsAriaSur': "Labels et attributs ARIA sur l'ensemble des contrôles interactifs",
  'legal.legalPages.conseilsDeSecuriteAntiFraude': "Conseils de Sécurité & Anti-Fraude",
  'legal.legalPages.refusezLesVirementsDirectsMandats': "Refusez les virements directs, mandats Western Union ou chèques sans garantie.",
  'legal.legalPages.utilisezLeSequestreShongre': "Utilisez le séquestre Shongre",
  'legal.legalPages.votreArgentEstProtegeJusqu': "Votre argent est protégé jusqu'à ce que vous confirmiez la conformité du colis reçu.",

  // --- listings.listingDetailPage ---
  'listings.listingDetailPage.annonceIntrouvableOuSupprimee': "Annonce introuvable ou supprimée",
  'listings.listingDetailPage.cetteAnnonceNEstPlus': "Cette annonce n'est plus accessible ou a été retirée par son vendeur. Des articles similaires sont peut-être disponibles.",
  'listings.listingDetailPage.partagerLAnnonce': "Partager l'annonce",
  'listings.listingDetailPage.signalerCetteAnnonce': "Signaler cette annonce",
  'listings.listingDetailPage.votreMessage': "Votre message",
  'listings.listingDetailPage.bonjourVotreArticleMInteresse': "Bonjour, votre article m'intéresse beaucoup. Est-il toujours disponible ?...",
  'listings.listingDetailPage.faireUneOffreDePrix': "Faire une offre de prix",
  'listings.listingDetailPage.montantDeVotreOffre': "Montant de votre offre (€)",
  'listings.listingDetailPage.aidezLEquipeDeModeration': "Aidez l'équipe de modération à préserver la sécurité sur Shongre",
  'listings.listingDetailPage.motifDuSignalement': "Motif du signalement",
  'listings.listingDetailPage.precisionsComplementaires': "Précisions complémentaires",
  'listings.listingDetailPage.expliquezCeQuiVousSemble': "Expliquez ce qui vous semble anormal...",
  'listings.listingDetailPage.annonceIntrouvable': "Annonce introuvable",
  'listings.listingDetailPage.vendeurPro': "Vendeur Pro",
  'listings.listingDetailPage.referenceAnnonce': "Référence annonce :",
  'listings.listingDetailPage.vousEtesLAuteurDe': "Vous êtes l'auteur de cette annonce",
  'listings.listingDetailPage.voirTout': "Voir tout",

  // --- listings.listingMediaGallery ---
  'listings.listingMediaGallery.photoPrecedente': "Photo précédente",
  'listings.listingMediaGallery.agrandirEnPleinEcran': "Agrandir en plein écran",
  'listings.listingMediaGallery.fermerLePleinEcran': "Fermer le plein écran",

  // --- listings.listingSafetyNotice ---
  'listings.listingSafetyNotice.garantieSecuriteShongre': "Garantie & Sécurité Shongre",

  // --- listings.listingSellerTrustSection ---
  'listings.listingSellerTrustSection.vendeurPro': "Vendeur Pro",
  'listings.listingSellerTrustSection.verifie': "Vérifié",

  // --- messaging.messagingPage ---
  'messaging.messagingPage.cetUtilisateurNePourraPlus': "Cet utilisateur ne pourra plus vous envoyer de messages ni interagir avec vos annonces.",
  'messaging.messagingPage.signalerLaConversation': "Signaler la conversation",
  'messaging.messagingPage.aidezLEquipeDeModeration': "Aidez l'équipe de modération à garantir la sécurité sur Shongre.",
  'messaging.messagingPage.fermerLaVuePleinEcran': "Fermer la vue plein écran",
  'messaging.messagingPage.vuePleinEcran': "Vue plein écran",
  'messaging.messagingPage.aucunMessagePourLeMoment': "Aucun message pour le moment",
  'messaging.messagingPage.selectionnezUneConversation': "Sélectionnez une conversation",

  // --- messaging.conversationContextBar ---
  'messaging.conversationContextBar.reservee': "Réservée",

  // --- messaging.conversationHeader ---
  'messaging.conversationHeader.retourAuxConversations': "Retour aux conversations",
  'messaging.conversationHeader.identiteVerifiee': "Identité vérifiée",
  'messaging.conversationHeader.optionsDeLaConversation': "Options de la conversation",
  'messaging.conversationHeader.utilisateurBloque': "Utilisateur bloqué",
  'messaging.conversationHeader.voirLeProfilPublic': "Voir le profil public",
  'messaging.conversationHeader.debloquerLUtilisateur': "Débloquer l'utilisateur",
  'messaging.conversationHeader.signalerLaConversation': "Signaler la conversation",

  // --- messaging.conversationList ---
  'messaging.conversationList.rechercherParNomOuAnnonce': "Rechercher par nom ou annonce...",
  'messaging.conversationList.effacerLaRecherche': "Effacer la recherche",
  'messaging.conversationList.aucuneConversationTrouvee': "Aucune conversation trouvée",

  // --- messaging.makeOfferModal ---
  'messaging.makeOfferModal.faireUneOffreDePrix': "Faire une offre de prix",
  'messaging.makeOfferModal.montantDeVotreOffre': "Montant de votre offre (€)",

  // --- messaging.messageComposer ---
  'messaging.messageComposer.apercuPieceJointe': "Aperçu pièce jointe",
  'messaging.messageComposer.supprimerLaPhoto': "Supprimer la photo",
  'messaging.messageComposer.joindreUnePhoto': "Joindre une photo",
  'messaging.messageComposer.ecrivezVotreMessageEntreePour': "Écrivez votre message... (Entrée pour envoyer)",
  'messaging.messageComposer.photoPreteAEtreEnvoyee': "Photo prête à être envoyée",
  'messaging.messageComposer.seraTransmiseAvecVotreMessage': "Sera transmise avec votre message",
  'messaging.messageComposer.ajouterUnePhotoALa': "Ajouter une photo à la conversation",

  // --- messaging.messageTimeline ---
  'messaging.messageTimeline.historiqueDeLaConversation': "Historique de la conversation",
  'messaging.messageTimeline.photoPartagee': "Photo partagée",
  'messaging.messageTimeline.debutDeLaConversation': "Début de la conversation",
  'messaging.messageTimeline.echec': "Échec",

  // --- messaging.pickupSchedulerModal ---
  'messaging.pickupSchedulerModal.planifierLaRemiseEnMain': "Planifier la remise en main propre",
  'messaging.pickupSchedulerModal.convenezDUnCreneauEt': "Convenez d'un créneau et d'un lieu sécurisé pour échanger l'article en toute confiance.",
  'messaging.pickupSchedulerModal.dateDuRendezVous': "Date du rendez-vous",
  'messaging.pickupSchedulerModal.creneauHoraire': "Créneau horaire",
  'messaging.pickupSchedulerModal.lieuDeRendezVousEspace': "Lieu de rendez-vous (espace public recommandé)",
  'messaging.pickupSchedulerModal.exDevantLeMetroPlace': "ex: Devant le métro, place publique...",
  'messaging.pickupSchedulerModal.matinee10h0012h00': "Matinée (10h00 - 12h00)",
  'messaging.pickupSchedulerModal.apresMidi14h0016h00': "Après-midi (14h00 - 16h00)",
  'messaging.pickupSchedulerModal.finDApresMidi16h00': "Fin d'après-midi (16h00 - 18h00)",
  'messaging.pickupSchedulerModal.soiree18h0020h00': "Soirée (18h00 - 20h00)",

  // --- newsletter.newsletterLandingPage ---
  'newsletter.newsletterLandingPage.laNewsletterShongre': "La Newsletter Shongre",
  'newsletter.newsletterLandingPage.100SansSpam': "100% Sans Spam",
  'newsletter.newsletterLandingPage.uneFrequenceRaisonneeDUn': "Une fréquence raisonnée d'un à deux emails par semaine maximum.",
  'newsletter.newsletterLandingPage.contenuEditorialSoigne': "Contenu éditorial soigné",
  'newsletter.newsletterLandingPage.desSelectionsManuellesPrepareesPar': "Des sélections manuelles préparées par nos équipes basées en France.",
  'newsletter.newsletterLandingPage.desinscriptionInstantanee': "Désinscription instantanée",
  'newsletter.newsletterLandingPage.unLienDeDesabonnementEn': "Un lien de désabonnement en 1 clic dans chaque email envoyé.",

  // --- newsletter.newsletterPreferencesPage ---
  'newsletter.newsletterPreferencesPage.vosThematiquesFavorites': "Vos thématiques favorites",

  // --- newsletter.newsletterUnsubscribePage ---
  'newsletter.newsletterUnsubscribePage.votreAdresseEmail': "Votre adresse email",
  'newsletter.newsletterUnsubscribePage.votreEmailExempleFr': "votre.email@exemple.fr",

  // --- newsletter.newsletterPreviewModal ---
  'newsletter.newsletterPreviewModal.simulationDeRenduResponsiveDe': "Simulation de rendu responsive de la campagne newsletter.",
  'newsletter.newsletterPreviewModal.velo': "Vélo",
  'newsletter.newsletterPreviewModal.preheader': "Préheader :",
  'newsletter.newsletterPreviewModal.veloGravelAluminium': "Vélo Gravel Aluminium",
  'newsletter.newsletterPreviewModal.gererMesPreferences': "Gérer mes préférences",
  'newsletter.newsletterPreviewModal.seDesabonnerEn1Clic': "Se désabonner en 1 clic",

  // --- newsletter.newsletterSignup ---
  'newsletter.newsletterSignup.votreEmailCom': "votre@email.com",
  'newsletter.newsletterSignup.votreAdresseEmail': "Votre adresse email",
  'newsletter.newsletterSignup.saisissezVotreAdresseEmail': "Saisissez votre adresse email",
  'newsletter.newsletterSignup.inscriptionConfirmee': "Inscription confirmée !",
  'newsletter.newsletterSignup.vousEtesBienInscrit': "Vous êtes bien inscrit !",
  'newsletter.newsletterSignup.laSelectionShongre': "La sélection Shongre",

  // --- notifications.notificationPreferencesPage ---
  'notifications.notificationPreferencesPage.chargementDeVosPreferencesDe': "Chargement de vos préférences de notification…",
  'notifications.notificationPreferencesPage.retourAuCentreDeNotifications': "Retour au centre de notifications",
  'notifications.notificationPreferencesPage.categorieDAlerte': "Catégorie d'alerte",
  'notifications.notificationPreferencesPage.surLApplication': "Sur l'application :",
  'notifications.notificationPreferencesPage.parEmail': "Par email :",
  'notifications.notificationPreferencesPage.surMobilePush': "Sur mobile (Push) :",

  // --- notifications.notificationsPage ---
  'notifications.notificationsPage.centreDeNotifications': "Centre de notifications",

  // --- notifications.notificationDemoToolbar ---
  'notifications.notificationDemoToolbar.simulateurDEvenementsTempsReel': "Simulateur d'événements temps-réel (Mode Démo)",

  // --- notifications.notificationPanel ---
  'notifications.notificationPanel.panneauDesNotifications': "Panneau des notifications",
  'notifications.notificationPanel.preferencesDeNotifications': "Préférences de notifications",
  'notifications.notificationPanel.toutLire': "Tout lire",
  'notifications.notificationPanel.aucuneNotificationPourLeMoment': "Aucune notification pour le moment",
  'notifications.notificationPanel.voirToutesLesNotifications': "Voir toutes les notifications",

  // --- pro.proStorefrontPage ---
  'pro.proStorefrontPage.cetteBoutiqueNExistePlus': "Cette boutique n'existe plus ou son adresse a changé. Parcourez l'annuaire pour trouver un professionnel équivalent.",
  'pro.proStorefrontPage.rechercherDansCetteBoutique': "Rechercher dans cette boutique...",
  'pro.proStorefrontPage.vendeurProfessionnelAgree': "Vendeur Professionnel Agréé",
  'pro.proStorefrontPage.tauxDeReponse': "Taux de réponse",
  'pro.proStorefrontPage.delaiMoyen': "Délai moyen",

  // --- profile.sellerPublicPage ---
  'profile.sellerPublicPage.sectionsDuProfilVendeur': "Sections du profil vendeur",

  // --- profile.proBusinessInfo ---
  'profile.proBusinessInfo.numeroSiret': "Numéro SIRET",
  'profile.proBusinessInfo.adresseDuSiegeBoutique': "Adresse du siège / boutique",
  'profile.proBusinessInfo.droitDeRetractation': "Droit de rétractation",
  'profile.proBusinessInfo.factureAvecTvaSurDemande': "Facture avec TVA sur demande",
  'profile.proBusinessInfo.garantieLegaleDeConformite2': "Garantie légale de conformité (2 ans)",
  'profile.proBusinessInfo.emballageProfessionnelRenforce': "Emballage professionnel renforcé",

  // --- profile.sellerCatalog ---
  'profile.sellerCatalog.effacerLaRecherche': "Effacer la recherche",
  'profile.sellerCatalog.aucunArticleNeCorrespondA': "Aucun article ne correspond à votre sélection",
  'profile.sellerCatalog.essayezDeModifierVotreMot': "Essayez de modifier votre mot-clé de recherche ou de réinitialiser vos filtres de catégorie et de prix.",
  'profile.sellerCatalog.reinitialiserLesFiltres': "Réinitialiser les filtres",
  'profile.sellerCatalog.fourchetteDePrix': "Fourchette de prix (€) :",

  // --- profile.sellerProfileHeader ---
  'profile.sellerProfileHeader.partagerCeProfil': "Partager ce profil",
  'profile.sellerProfileHeader.optionsSupplementaires': "Options supplémentaires",
  'profile.sellerProfileHeader.tauxDeReponse': "Taux de réponse",
  'profile.sellerProfileHeader.delaiMoyen': "Délai moyen",

  // --- profile.sellerReportModal ---
  'profile.sellerReportModal.signalerCeProfil': "Signaler ce profil",
  'profile.sellerReportModal.decrivezPrecisementLesFaitsConstates': "Décrivez précisément les faits constatés, liens d'annonces ou échanges...",

  // --- profile.sellerTrustIndicators ---
  'profile.sellerTrustIndicators.paiementSecurise': "Paiement sécurisé",
  'profile.sellerTrustIndicators.livraisonRetrait': "Livraison & Retrait",
  'profile.sellerTrustIndicators.reactiviteCertifiee': "Réactivité certifiée",

  // --- publishing.publishWizard ---
  'publishing.publishWizard.exCanapeDAngleIphone': "ex: Canapé d'angle, iPhone 15, Voitures, Vélos...",
  'publishing.publishWizard.titreDeLAnnonce': "Titre de l'annonce",
  'publishing.publishWizard.exCanapeScandinave3Places': "ex: Canapé scandinave 3 places tissu bouclette beige",
  'publishing.publishWizard.descriptionDetaillee': "Description détaillée",
  'publishing.publishWizard.vendsCanapeEnExcellentEtat': "Vends canapé en excellent état, très confortable. Facture d'achat fournie...",
  'publishing.publishWizard.faireUnDonGratuit0': "Faire un don gratuit (0 €)",
  'publishing.publishWizard.idealPourDesencombrerEtDonner': "Idéal pour désencombrer et donner une seconde vie à vos objets",
  'publishing.publishWizard.prixNegociable': "Prix négociable",
  'publishing.publishWizard.permetAuxAcheteursDeFaire': "Permet aux acheteurs de faire des offres de prix",
  'publishing.publishWizard.quantiteEnStock': "Quantité en stock",
  'publishing.publishWizard.referenceInterneSkuFacultatif': "Référence interne / SKU (facultatif)",
  'publishing.publishWizard.autoriserLeContactDirectEt': "Autoriser le contact direct et la messagerie",
  'publishing.publishWizard.autoriserLePaiementSecuriseDirect': "Autoriser le paiement sécurisé direct",
  'publishing.publishWizard.brouillonAutoSauvegarde': "Brouillon auto-sauvegardé",
  'publishing.publishWizard.categorieActiveValidee': "Catégorie active validée :",
  'publishing.publishWizard.criteresDetailles': "Critères détaillés",
  'publishing.publishWizard.selectionnerUneOption': "Sélectionner une option...",
  'publishing.publishWizard.exempleDemo': "Exemple démo",
  'publishing.publishWizard.gestionDesStocksReferenceProfessionnelle': "Gestion des stocks & Référence Professionnelle",
  'publishing.publishWizard.achatEnLigneDirectSans': "Achat en ligne direct (Sans réservation)",
  'publishing.publishWizard.reservationAvecAcompte': "Réservation avec acompte",
  'publishing.publishWizard.livraisonEnColisMondialRelay': "Livraison en colis (Mondial Relay, Colissimo)",
  'publishing.publishWizard.transportDeMeublesGrosColis': "Transport de meubles & Gros colis (Cocolis)",
  'publishing.publishWizard.optionsAvancees': "Options avancées",
  'publishing.publishWizard.garantieSecuriteTransfrontaliere': "Garantie & Sécurité Transfrontalière :",
  'publishing.publishWizard.categorie': "Catégorie",
  'publishing.publishWizard.marchesDeDiffusion': "Marchés de diffusion",
  'publishing.publishWizard.modesDeTransaction': "Modes de transaction",

  // --- savedsearches.savedSearchesPage ---
  'savedsearches.savedSearchesPage.aucuneRechercheSauvegardee': "Aucune recherche sauvegardée",
  'savedsearches.savedSearchesPage.lancezUneRecherchePuisCliquez': "Lancez une recherche puis cliquez sur 'Sauvegarder la recherche' pour être prévenu des nouvelles annonces.",

  // --- search.exploreMapView ---
  'search.exploreMapView.recadrerSurLesAnnonces': "Recadrer sur les annonces",
  'search.exploreMapView.changerLeStyleDeCarte': "Changer le style de carte",
  'search.exploreMapView.fermerLaPrevisualisation': "Fermer la prévisualisation",
  'search.exploreMapView.cliquezPourCentrer': "Cliquez pour centrer",

  // --- search.searchPage ---
  'search.searchPage.masquerLePanneauDeFiltres': "Masquer le panneau de filtres",
  'search.searchPage.livraisonDisponible': "Livraison disponible",
  'search.searchPage.paiementSecuriseEnLigne': "Paiement sécurisé en ligne",
  'search.searchPage.sauvegarderCetteRecherche': "Sauvegarder cette recherche",
  'search.searchPage.effacerTousLesFiltres': "Effacer tous les filtres",
  'search.searchPage.filtresDeRecherche': "Filtres de recherche",
  'search.searchPage.categories': "Catégories",
  'search.searchPage.sousCategories': "Sous-catégories",
  'search.searchPage.trierPar': "Trier par :",
  'search.searchPage.trierPar2': "Trier par",

  // --- sellerworkspace.accountOverviewPage ---
  'sellerworkspace.accountOverviewPage.presentezVousBrievementAuxAutres': "Présentez-vous brièvement aux autres membres de la communauté...",
  'sellerworkspace.accountOverviewPage.comptePro': "Compte Pro",
  'sellerworkspace.accountOverviewPage.verifie': "Vérifié",
  'sellerworkspace.accountOverviewPage.numeroDeTelephone': "Numéro de téléphone",
  'sellerworkspace.accountOverviewPage.annoncesActives': "Annonces actives",
  'sellerworkspace.accountOverviewPage.annoncesSauvegardees': "Annonces sauvegardées",
  'sellerworkspace.accountOverviewPage.recusJustificatifs': "Reçus &amp; justificatifs",
  'sellerworkspace.accountOverviewPage.telephone': "Téléphone",

  // --- sellerworkspace.myListingsPage ---
  'sellerworkspace.myListingsPage.filtrerMesAnnoncesParStatut': "Filtrer mes annonces par statut",
  'sellerworkspace.myListingsPage.gererLesPaysDePublication': "Gérer les pays de publication",
  'sellerworkspace.myListingsPage.boosterLAnnonce': "Booster l'annonce",
  'sellerworkspace.myListingsPage.supprimerLAnnonce': "Supprimer l'annonce",

  // --- sellerworkspace.proDashboardPage ---
  'sellerworkspace.proDashboardPage.siretVerifie': "SIRET Vérifié",
  'sellerworkspace.proDashboardPage.tauxDeConversion': "Taux de conversion",
  'sellerworkspace.proDashboardPage.surLesFichesArticles': "Sur les fiches articles",
  'sellerworkspace.proDashboardPage.volumeDeVentesEstime': "Volume de ventes estimé",
  'sellerworkspace.proDashboardPage.ceMoisCi': "Ce mois-ci",

  // --- sellerworkspace.proStorefrontEditorPage ---
  'sellerworkspace.proStorefrontEditorPage.numeroSiret14Chiffres': "Numéro SIRET (14 chiffres)",
  'sellerworkspace.proStorefrontEditorPage.presentationDeLEntrepriseSavoir': "Présentation de l'entreprise & Savoir-faire",
  'sellerworkspace.proStorefrontEditorPage.telephoneCommercial': "Téléphone commercial",
  'sellerworkspace.proStorefrontEditorPage.voirMaVitrineEnDirect': "Voir ma vitrine en direct sur le site",

  // --- sellerworkspace.billingHistoryModal ---
  'sellerworkspace.billingHistoryModal.historiqueDeFacturationRecus': "Historique de facturation & Reçus",
  'sellerworkspace.billingHistoryModal.consultezEtTelechargezVosFactures': "Consultez et téléchargez vos factures, abonnements et options de visibilité",
  'sellerworkspace.billingHistoryModal.toutesLesFacturesShongreSas': "Toutes les factures Shongre SAS comportent la TVA française légale à 20%.",

  // --- sellerworkspace.bulkImportModal ---
  'sellerworkspace.bulkImportModal.importMassifDeCatalogueCsv': "Import massif de catalogue (CSV / Excel)",
  'sellerworkspace.bulkImportModal.importezSimultanementDesDizainesD': "Importez simultanément des dizaines d'annonces professionnelles avec prix, stocks et photos",
  'sellerworkspace.bulkImportModal.deposezVotreFichierCsvIci': "Déposez votre fichier CSV ici",

  // --- support.contactPage ---
  'support.contactPage.votreNomComplet': "Votre nom complet",
  'support.contactPage.votreAdresseEmail': "Votre adresse email",
  'support.contactPage.objetDeLaDemande': "Objet de la demande",
  'support.contactPage.objetDeVotreDemande': "Objet de votre demande",
  'support.contactPage.detaillezVotreSituation': "Détaillez votre situation",
  'support.contactPage.decrivezVotreProblemeLesDemarches': "Décrivez votre problème, les démarches déjà entreprises ou vos questions...",
  'support.contactPage.echangeDirectAvecLeVendeur': "Échange direct avec le vendeur",
  'support.contactPage.3RedigezVotreMessage': "3. Rédigez votre message",
  'support.contactPage.jpgPngOuPdfMax': "JPG, PNG ou PDF (max 10 Mo)",

  // --- support.helpCenterPage ---
  'support.helpCenterPage.rechercherUneQuestionExSequestre': "Rechercher une question (ex: séquestre, virement, litige...)",
  'support.helpCenterPage.rechercherUneQuestionDansL': "Rechercher une question dans l'aide",
  'support.helpCenterPage.questionsFrequentes': "Questions fréquentes",
  'support.helpCenterPage.vousNAvezPasTrouve': "Vous n'avez pas trouvé votre réponse ?",

  // --- support.supportRequestDetailPage ---
  'support.supportRequestDetailPage.ecrivezVotreMessageOuVos': "Écrivez votre message ou vos précisions ici...",
  'support.supportRequestDetailPage.retourAMesDemandes': "Retour à mes demandes",
  'support.supportRequestDetailPage.marquerCommeResolu': "Marquer comme résolu",
  'support.supportRequestDetailPage.simulerReponseConseillerDemo': "Simuler réponse conseiller (Démo)",

  // --- support.supportContextCard ---
  'support.supportContextCard.ouvrirLAnnonce': "Ouvrir l'annonce",
  'support.supportContextCard.detacherLAnnonce': "Détacher l'annonce",
  'support.supportContextCard.voirLaCommande': "Voir la commande",
  'support.supportContextCard.detacherLaCommande': "Détacher la commande",

  // --- transactions.directPurchaseCheckoutModal ---
  'transactions.directPurchaseCheckoutModal.nomPrenom': "Nom & Prénom",
  'transactions.directPurchaseCheckoutModal.telephone': "Téléphone",
  'transactions.directPurchaseCheckoutModal.numeroDeCarte': "Numéro de carte",
  'transactions.directPurchaseCheckoutModal.quantite': "Quantité :",
  'transactions.directPurchaseCheckoutModal.1ChoisissezVotreModeDe': "1. Choisissez votre mode de réception",
  'transactions.directPurchaseCheckoutModal.adresseDeLivraison': "Adresse de livraison",
  'transactions.directPurchaseCheckoutModal.protectionAcheteurSequestre': "Protection acheteur & Séquestre",
  'transactions.directPurchaseCheckoutModal.totalARegler': "Total à régler",
  'transactions.directPurchaseCheckoutModal.2MoyenDePaiementSecurise': "2. Moyen de paiement sécurisé",
  'transactions.directPurchaseCheckoutModal.connexionChiffreeSsl256Bits': "Connexion chiffrée SSL 256 bits conforme PCI-DSS",
  'transactions.directPurchaseCheckoutModal.achatDirectConfirme': "Achat direct confirmé !",
  'transactions.directPurchaseCheckoutModal.codeSecretDeRemiseEn': "Code secret de remise en main propre",
  'transactions.directPurchaseCheckoutModal.expeditionEnCours': "Expédition en cours",

  // --- transactions.transactionsPage ---
  'transactions.transactionsPage.enAttenteConfirmationVendeur': "En attente confirmation vendeur",
  'transactions.transactionsPage.colisExpedie': "Colis expédié",
  'transactions.transactionsPage.livreEnAttenteValidation': "Livré - En attente validation",
  'transactions.transactionsPage.finaliseePayee': "Finalisée & Payée",
  'transactions.transactionsPage.annuleeRemboursee': "Annulée & Remboursée",
  'transactions.transactionsPage.garantieSequestreShongre': "Garantie Séquestre Shongre :",
  'transactions.transactionsPage.paiementSousSequestre': "Paiement sous séquestre",
  'transactions.transactionsPage.validationVendeur': "Validation vendeur",
  'transactions.transactionsPage.fondsVerses': "Fonds versés",

  // --- transactions.disputeModal ---
  'transactions.disputeModal.signalerUnProblemeOuvrirUn': "Signaler un problème / Ouvrir un litige",
  'transactions.disputeModal.lesFondsSousSequestreResteront': "Les fonds sous séquestre resteront gelés jusqu'à résolution par le service client Shongre.",
  'transactions.disputeModal.expliquezCeQuiSEst': "Expliquez ce qui s'est passé (état du colis, non-conformité, échange avec l'autre partie...)",
  'transactions.disputeModal.protectionAcheteurVendeurActive': "Protection Acheteur & Vendeur active",
  'transactions.disputeModal.ajouterDesPhotosOuJustificatifs': "Ajouter des photos ou justificatifs",
  'transactions.disputeModal.jpgPngOuPdfMax': "JPG, PNG ou PDF (max 10 Mo)",

  // --- transactions.leaveReviewModal ---
  'transactions.leaveReviewModal.partagezVotreExperienceAvecCet': "Partagez votre expérience avec cet utilisateur (rapidité, politesse, conformité du produit...)",

  // --- transactions.reservationCheckoutModal ---
  'transactions.reservationCheckoutModal.remiseEnMainPropreSecurisee': "Remise en main propre sécurisée, gratuit",
  'transactions.reservationCheckoutModal.exEnCentreVilleSamedi': "ex: En centre-ville, samedi après-midi",
  'transactions.reservationCheckoutModal.livraisonEnPointRelaisMondial': "Livraison en Point Relais Mondial Relay, 4,90 €",
  'transactions.reservationCheckoutModal.livraisonADomicileColissimo6': "Livraison à domicile Colissimo, 6,90 €",
  'transactions.reservationCheckoutModal.nomEtPrenom': "Nom et prénom",
  'transactions.reservationCheckoutModal.nEtNomDeRue': "N° et nom de rue",
  'transactions.reservationCheckoutModal.vendeur': "Vendeur :",
  'transactions.reservationCheckoutModal.choisissezVotreModeDObtention': "Choisissez votre mode d'obtention :",
  'transactions.reservationCheckoutModal.remiseEnMainPropreSecurisee2': "Remise en main propre sécurisée",
  'transactions.reservationCheckoutModal.votreNumeroDeTelephonePour': "Votre numéro de téléphone (pour fixer le RDV) :",
  'transactions.reservationCheckoutModal.disponibilitesOuLieuSouhaite': "Disponibilités ou lieu souhaité :",
  'transactions.reservationCheckoutModal.livraisonEnPointRelaisMondial2': "Livraison en Point Relais (Mondial Relay)",
  'transactions.reservationCheckoutModal.pointRelaisSelectionne': "Point Relais sélectionné :",
  'transactions.reservationCheckoutModal.tabacPresseDesHalles15': "Tabac Presse des Halles (15 rue République, 13001 Marseille)",
  'transactions.reservationCheckoutModal.epicerieBioDuVieuxPort': "Épicerie Bio du Vieux-Port (4 quai des Belges, 13001 Marseille)",
  'transactions.reservationCheckoutModal.livraisonADomicileColissimo': "Livraison à domicile (Colissimo)",
  'transactions.reservationCheckoutModal.nomDuDestinataire': "Nom du destinataire :",
  'transactions.reservationCheckoutModal.detailDesCoutsEtGaranties': "Détail des coûts et garanties :",
  'transactions.reservationCheckoutModal.paiement100ProtegeSousSequestre': "Paiement 100% protégé sous séquestre",
  'transactions.reservationCheckoutModal.prixDeLArticle': "Prix de l'article :",
  'transactions.reservationCheckoutModal.totalARegler': "Total à régler :",
  'transactions.reservationCheckoutModal.choisissezVotreMoyenDePaiement': "Choisissez votre moyen de paiement :",
  'transactions.reservationCheckoutModal.titulaireDeLaCarte': "Titulaire de la carte",
  'transactions.reservationCheckoutModal.numeroDeCarte': "Numéro de carte",
  'transactions.reservationCheckoutModal.chiffrementSsl256BitsEt': "Chiffrement SSL 256 bits et authentification 3D Secure 2.0.",
  'transactions.reservationCheckoutModal.votreCodeSecretDeConfirmation': "Votre code secret de confirmation de remise",
  'transactions.reservationCheckoutModal.regleDeSecurite': "Règle de sécurité :",

  // --- transactions.sellerPayoutModal ---
  'transactions.sellerPayoutModal.transfererMesGainsVersMon': "Transférer mes gains vers mon compte bancaire",
  'transactions.sellerPayoutModal.selectionnezLeMontantEtLe': "Sélectionnez le montant et le délai de virement souhaité.",
  'transactions.sellerPayoutModal.virementStandardGratuit24A': "Virement standard, gratuit, 24 à 48h ouvrées",
  'transactions.sellerPayoutModal.virementInstantane090Credite': "Virement instantané, 0,90 €, crédité en moins de 10 minutes",
  'transactions.sellerPayoutModal.montantDuVirement': "Montant du virement (€)",
  'transactions.sellerPayoutModal.typeDeVirement': "Type de virement",
  'transactions.sellerPayoutModal.delaiSepaClassique24A': "Délai SEPA classique (24 à 48h ouvrées)",
  'transactions.sellerPayoutModal.crediteEnMoinsDe10': "Crédité en moins de 10 minutes sur votre IBAN",
  'transactions.sellerPayoutModal.montantPreleveDuSolde': "Montant prélevé du solde :",
  'transactions.sellerPayoutModal.montantNetVerseSurVotre': "Montant net versé sur votre compte :",
  'transactions.sellerPayoutModal.virementsExecutesViaMangopayEtablissement': "Virements exécutés via Mangopay, établissement de monnaie électronique agréé ACPR.",

  // --- transactions.transactionDetailModal ---
  'transactions.transactionDetailModal.paiementGarantiParLeService': "Paiement garanti par le service de séquestre sécurisé Shongre",
  'transactions.transactionDetailModal.exSamedi22AoutA': "ex: Samedi 22 août à 14h30",
  'transactions.transactionDetailModal.ex12RueDesRemparts': "ex: 12 rue des Remparts, Bordeaux",
  'transactions.transactionDetailModal.refuserLaReservation': "Refuser la réservation ?",
  'transactions.transactionDetailModal.confirmerLaReceptionConforme': "Confirmer la réception conforme ?",
  'transactions.transactionDetailModal.annulerVotreReservation': "Annuler votre réservation ?",
  'transactions.transactionDetailModal.actionRequiseAccepterOuRefuser': "Action requise : Accepter ou Refuser la réservation",
  'transactions.transactionDetailModal.codeSecretDeConfirmation': "Code secret de confirmation",
  'transactions.transactionDetailModal.uniquementApresAvoirVerifieLa': "uniquement après avoir vérifié la conformité de l'article",
  'transactions.transactionDetailModal.avezVousBienRecuL': "Avez-vous bien reçu l'article ?",
  'transactions.transactionDetailModal.rendezVousDeRemiseConvenu': "Rendez-vous de remise convenu",
  'transactions.transactionDetailModal.datePrevue': "Date prévue :",
  'transactions.transactionDetailModal.telephoneDeContact': "Téléphone de contact :",
  'transactions.transactionDetailModal.dateEtHeure': "Date et heure :",
  'transactions.transactionDetailModal.lieuDeRencontre': "Lieu de rencontre :",
  'transactions.transactionDetailModal.numeroDeTelephoneDirect': "Numéro de téléphone direct :",
  'transactions.transactionDetailModal.recapitulatifFinancier': "Récapitulatif financier :",
  'transactions.transactionDetailModal.fraisDePort': "Frais de port :",
  'transactions.transactionDetailModal.totalRegleParLAcheteur': "Total réglé par l'acheteur :",
  'transactions.transactionDetailModal.montantNetVerseAuVendeur': "Montant net versé au vendeur :",
  'transactions.transactionDetailModal.historiqueDuDossier': "Historique du dossier :",
  'transactions.transactionDetailModal.signalerUnProblemeLitige': "Signaler un problème / Litige",

  // --- verification.verificationCenterPage ---
  'verification.verificationCenterPage.checklistDesVerifications': "Checklist des vérifications",
  'verification.verificationCenterPage.motifDuRejet': "Motif du rejet :",
  'verification.verificationCenterPage.capacitesPermissionsDuCompte': "Capacités & Permissions du Compte",
  'verification.verificationCenterPage.journalDesEvenementsDeConformite': "Journal des Événements de Conformité",

  // --- verification.bankPayoutModal ---
  'verification.bankPayoutModal.exJeanDupontOuSarl': "Ex: Jean Dupont ou SARL Boutique",

  // --- verification.businessVerificationModal ---
  'verification.businessVerificationModal.14RueDeLArtisanat': "14 rue de l'Artisanat",
  'verification.businessVerificationModal.entrepriseIdentifieeDansLeRepertoire': "Entreprise identifiée dans le répertoire officiel SIRENE.",
  'verification.businessVerificationModal.presidentDirecteurGeneralGerant': "Président / Directeur Général / Gérant",
  'verification.businessVerificationModal.mandataireExpressementHabiliteDelegationDe': "Mandataire expressément habilité (délégation de pouvoir)",
  'verification.businessVerificationModal.documentObligatoireDelivreParLe': "Document obligatoire délivré par le Greffe du Tribunal",
  'verification.businessVerificationModal.pourAccelererLaValidationDes': "Pour accélérer la validation des virements de séquestre",
  'verification.businessVerificationModal.modeDemonstrationShongre': "Mode Démonstration Shongre",

  // --- verification.identityVerificationModal ---
  'verification.identityVerificationModal.formatsAcceptesJpgPngPdf': "Formats acceptés : JPG, PNG, PDF (max 8 Mo)",
  'verification.identityVerificationModal.requisPourLaValidationOptique': "Requis pour la validation optique",
  'verification.identityVerificationModal.modeDemonstrationShongre': "Mode Démonstration Shongre",

  // --- verification.trustBadge ---
  'verification.trustBadge.identiteOfficielleVerifieeCniPasseport': "Identité officielle vérifiée (CNI / Passeport)",
  'verification.trustBadge.entrepriseCertifieeAuRegistreDu': "Entreprise certifiée au Registre du Commerce (RCS)",
  'verification.trustBadge.numeroDeTelephoneVerifiePar': "Numéro de téléphone vérifié par SMS",
  'verification.trustBadge.compteBancaireSepaValidePour': "Compte bancaire SEPA validé pour le séquestre",
  'verification.trustBadge.identiteVerifiee': "Identité vérifiée",
  'verification.trustBadge.proCertifieRcs': "Pro Certifié RCS",
  'verification.trustBadge.telephoneCertifie': "Téléphone certifié",
  'verification.trustBadge.ibanVerifie': "IBAN vérifié",
  'verification.trustBadge.compte2fa': "Compte 2FA",
  'verification.trustBadge.boutiqueProVerifiee': "Boutique Pro Vérifiée",
  'verification.trustBadge.vendeurDeConfiance': "Vendeur de Confiance",
  'verification.trustBadge.membreVerifie': "Membre Vérifié",
  'verification.trustBadge.compteDebutant': "Compte Débutant",

  // --- security.accountStatusBanner ---
  'security.accountStatusBanner.compteRestreint': "Compte restreint :",
  'security.accountStatusBanner.verificationProEnCoursD': "Vérification Pro en cours d'examen :",
  'security.accountStatusBanner.votreCompteAAtteintSa': "Votre compte a atteint sa limite d'annonces actives pour le mois en cours.",

  // --- security.requirePermission ---
  'security.requirePermission.compteSuspendu': "Compte suspendu",

  // --- admin.adminAuditLogsPage ---
  'admin.adminAuditLogsPage.rechercherParActeurActionCible': "Rechercher par acteur, action, cible, détails...",
  'admin.adminAuditLogsPage.rechercherDansLeRegistreD': "Rechercher dans le registre d'audit",
  'admin.adminAuditLogsPage.filtrerLeJournalParType': "Filtrer le journal par type d'action",
  'admin.adminAuditLogsPage.voirLePayloadComplet': "Voir le payload complet",
  'admin.adminAuditLogsPage.reinitialiserLeRegistreDAudit': "Réinitialiser le registre d'audit ?",
  'admin.adminAuditLogsPage.conformiteRgpdSecuritePlateforme': "Conformité RGPD & Sécurité plateforme",
  'admin.adminAuditLogsPage.actionSysteme': "Action Système",
  'admin.adminAuditLogsPage.detailsMotif': "Détails & Motif",
  'admin.adminAuditLogsPage.detail': "Détail",
  'admin.adminAuditLogsPage.role': "Rôle :",
  'admin.adminAuditLogsPage.details': "Détails :",
  'admin.adminAuditLogsPage.etatPrecedent': "État précédent :",
  'admin.adminAuditLogsPage.nouvelEtat': "Nouvel état :",

  // --- admin.adminLayout ---
  'admin.adminLayout.retourALaPlaceDe': "Retour à la place de marché",
  'admin.adminLayout.sectionsDeLaConsole': "Sections de la console",
  'admin.adminLayout.placeDeMarche': "Place de marché",
  'admin.adminLayout.statutDeSession': "Statut de session",
  'admin.adminLayout.sessionAuthentifieeRbac': "Session authentifiée RBAC",

  // --- admin.adminMarketsPage ---
  'admin.adminMarketsPage.supprimerLaSurchargeEtReactiver': "Supprimer la surcharge et réactiver l'héritage dynamique de France",
  'admin.adminMarketsPage.ajouterUnNouveauMarchePays': "Ajouter un nouveau Marché / Pays",
  'admin.adminMarketsPage.creezUnNouveauPaysQui': "Créez un nouveau pays qui héritera automatiquement de 100% de la configuration française de référence.",
  'admin.adminMarketsPage.exItPtDeUk': "ex: IT, PT, DE, UK",
  'admin.adminMarketsPage.exItItPtPt': "ex: it-IT, pt-PT, de-DE",
  'admin.adminMarketsPage.bientotDisponible': "Bientôt disponible",
  'admin.adminMarketsPage.archive': "Archivé",
  'admin.adminMarketsPage.franceFrEstLeMarche': "France (`FR`) est le marché de référence canonique",
  'admin.adminMarketsPage.ajouterUnMarche': "Ajouter un marché",
  'admin.adminMarketsPage.moteurDHeritageHierarchiqueEn': "Moteur d'héritage hiérarchique en cascade :",
  'admin.adminMarketsPage.marcheSourceCanonique100': "Marché Source Canonique (100%)",
  'admin.adminMarketsPage.bientot': "Bientôt",
  'admin.adminMarketsPage.selectionnerUnMarche': "Sélectionner un marché :",
  'admin.adminMarketsPage.gestionDesCategoriesParMarche': "Gestion des catégories par marché :",
  'admin.adminMarketsPage.parametreRegle': "Paramètre / Règle",
  'admin.adminMarketsPage.statutDuMarche': "Statut du marché",
  'admin.adminMarketsPage.surcharge': "✏️ Surchargé",
  'admin.adminMarketsPage.tauxDeTvaStandard': "Taux de TVA Standard",
  'admin.adminMarketsPage.fraisProtectionAcheteur': "Frais Protection Acheteur",
  'admin.adminMarketsPage.reservationAvecSequestre': "Réservation avec Séquestre",
  'admin.adminMarketsPage.nomDuMarche': "Nom du Marché",
  'admin.adminMarketsPage.localeParDefaut': "Locale par Défaut",
  'admin.adminMarketsPage.bientotDisponibleVitrine': "Bientôt disponible (Vitrine)",
  'admin.adminMarketsPage.actifOperationnel': "Actif (Opérationnel)",
  'admin.adminMarketsPage.activeTrue': "Activé (true)",
  'admin.adminMarketsPage.desactiveFalse': "Désactivé (false)",
  'admin.adminMarketsPage.regleDePersistance': "Règle de persistance :",

  // --- admin.adminModerationPage ---
  'admin.adminModerationPage.supprimerCetteAnnonce': "Supprimer cette annonce",
  'admin.adminModerationPage.auditDeSecuriteIaGemini': "Audit de Sécurité IA Gemini",
  'admin.adminModerationPage.supprimerDefinitivementLAnnonce': "Supprimer définitivement l'annonce ?",
  'admin.adminModerationPage.suspendreLeCompteUtilisateur': "Suspendre le compte utilisateur",
  'admin.adminModerationPage.motifLegalEtContractuelDe': "Motif légal et contractuel de la suspension",
  'admin.adminModerationPage.exSignalementsMultiplesPourNon': "ex: Signalements multiples pour non-conformité ou tentative de fraude...",
  'admin.adminModerationPage.controleDesContenusEtProfils': "Contrôle des contenus et profils",
  'admin.adminModerationPage.laFileDeSignalementsCommunautaires': "La file de signalements communautaires est propre et à jour.",
  'admin.adminModerationPage.cliquezSurAuditIaPour': "Cliquez sur « Audit IA » pour analyser les risques",
  'admin.adminModerationPage.annonce': "Annonce",
  'admin.adminModerationPage.vendeur': "Vendeur",
  'admin.adminModerationPage.actionsDeModeration': "Actions de Modération",
  'admin.adminModerationPage.analyseDeConformiteEtDetection': "Analyse de conformité et détection de fraudes en cours...",
  'admin.adminModerationPage.scoreDeRisqueDetecte': "Score de Risque Détecté",
  'admin.adminModerationPage.syntheseDeLAgentIa': "Synthèse de l'agent IA :",
  'admin.adminModerationPage.elementsSignales': "Éléments signalés :",

  // --- admin.adminMonetizationPage ---
  'admin.adminMonetizationPage.gestionDesFormulesDAbonnement': "Gestion des formules d'abonnement Pro",
  'admin.adminMonetizationPage.personnalisationVitrineBanniereStory': "Personnalisation Vitrine (Bannière, Story)",

  // --- admin.adminNewsletterPage ---
  'admin.adminNewsletterPage.aucuneCampagneCreee': "Aucune campagne créée",
  'admin.adminNewsletterPage.creezUnePremiereCampagnePour': "Créez une première campagne pour envoyer une sélection d'annonces aux abonnés de la newsletter.",
  'admin.adminNewsletterPage.creerUneCampagneNewsletter': "Créer une campagne newsletter",
  'admin.adminNewsletterPage.redigezEtCiblezUneNouvelle': "Rédigez et ciblez une nouvelle édition de la sélection Shongre.",
  'admin.adminNewsletterPage.nomInterneDeLaCampagne': "Nom interne de la campagne",
  'admin.adminNewsletterPage.exSelectionVelosVintageSemaine': "ex: Sélection Vélos & Vintage Semaine 34",
  'admin.adminNewsletterPage.objetDeLEmail': "Objet de l'email",
  'admin.adminNewsletterPage.exLesMeilleuresAffairesVelo': "ex: 🚲 Les meilleures affaires vélo de la semaine",
  'admin.adminNewsletterPage.texteDApercuPreheader': "Texte d'aperçu (Préheader)",
  'admin.adminNewsletterPage.exJusquA40Sur': "ex: Jusqu'à -40% sur des vélos gravel vérifiés.",
  'admin.adminNewsletterPage.audienceCiblee': "Audience ciblée",
  'admin.adminNewsletterPage.audienceCibleeParLEnvoi': "Audience ciblée par l'envoi",
  'admin.adminNewsletterPage.thematique': "Thématique",
  'admin.adminNewsletterPage.thematiqueCibleeParLEnvoi': "Thématique ciblée par l'envoi",
  'admin.adminNewsletterPage.titreDAccrocheDansL': "Titre d'accroche dans l'email",
  'admin.adminNewsletterPage.texteDIntroductionEditorial': "Texte d'introduction éditorial",
  'admin.adminNewsletterPage.quelquesPhrasesPourContextualiserLa': "Quelques phrases pour contextualiser la sélection...",
  'admin.adminNewsletterPage.envoyee': "Envoyée",
  'admin.adminNewsletterPage.programmee': "Programmée",
  'admin.adminNewsletterPage.prete': "Prête",
  'admin.adminNewsletterPage.historiqueDesCampagnes': "Historique des campagnes",
  'admin.adminNewsletterPage.apercu': "Aperçu",

  // --- admin.adminOverviewPage ---
  'admin.adminOverviewPage.utilisateursEnregistres': "Utilisateurs enregistrés",
  'admin.adminOverviewPage.verificationsProEnAttente': "Vérifications Pro en attente",
  'admin.adminOverviewPage.catalogueDAnnonces': "Catalogue d'annonces",

  // --- admin.adminRolesMatrixPage ---
  'admin.adminRolesMatrixPage.filtrerUnePermissionExListing': "Filtrer une permission (ex: listing.create, user.suspend)...",
  'admin.adminRolesMatrixPage.filtrerLesPermissionsParCategorie': "Filtrer les permissions par catégorie",
  'admin.adminRolesMatrixPage.matriceDesPermissionsParRole': "Matrice des permissions par rôle",
  'admin.adminRolesMatrixPage.permissionSensibleOuIrreversible': "Permission sensible ou irréversible",
  'admin.adminRolesMatrixPage.controleDAccesBaseSur': "Contrôle d'accès basé sur les rôles",
  'admin.adminRolesMatrixPage.votreIdentiteActive': "Votre identité active :",
  'admin.adminRolesMatrixPage.toutesLesCategories': "Toutes les catégories",
  'admin.adminRolesMatrixPage.annoncesCatalogues': "Annonces & Catalogues",
  'admin.adminRolesMatrixPage.moderationSignalements': "Modération & Signalements",
  'admin.adminRolesMatrixPage.administrationSysteme': "Administration Système",
  'admin.adminRolesMatrixPage.securiteAudit': "Sécurité & Audit",
  'admin.adminRolesMatrixPage.marchesTerritoires': "Marchés & Territoires",

  // --- admin.adminTaxonomyPage ---
  'admin.adminTaxonomyPage.taxonomieSynchronisee': "Taxonomie Synchronisée",

  // --- admin.adminUsersPage ---
  'admin.adminUsersPage.rechercherUnNomEmailEntreprise': "Rechercher un nom, email, entreprise, SIRET...",
  'admin.adminUsersPage.rechercherUnUtilisateur': "Rechercher un utilisateur",
  'admin.adminUsersPage.filtrerParTypeDeCompte': "Filtrer par type de compte",
  'admin.adminUsersPage.filtrerParRolePlateforme': "Filtrer par rôle plateforme",
  'admin.adminUsersPage.seConnecterEnTantQue': "Se connecter en tant que cet utilisateur",
  'admin.adminUsersPage.noteInterneDeVerificationDes': "Note interne de vérification des registres",
  'admin.adminUsersPage.suspendreUnCompteUtilisateur': "Suspendre un compte utilisateur",
  'admin.adminUsersPage.motifLegalDeLaMesure': "Motif légal de la mesure conservatoire",
  'admin.adminUsersPage.exInfractionAuxReglesDe': "ex: Infraction aux règles de sécurité ou tentative d'escroquerie...",
  'admin.adminUsersPage.reactiverLeCompte': "Réactiver le compte ?",
  'admin.adminUsersPage.gestionDesComptesVerificationsKbis': "Gestion des comptes & vérifications KBIS",
  'admin.adminUsersPage.tousLesTypesDeCompte': "Tous les types de compte",
  'admin.adminUsersPage.typeRole': "Type & Rôle",
  'admin.adminUsersPage.statutVerification': "Statut & Vérification",
  'admin.adminUsersPage.marcheVille': "Marché / Ville",

  // --- admin.adminVerificationsPage ---
  'admin.adminVerificationsPage.filesDAttenteDeVerification': "Files d'attente de vérification",
  'admin.adminVerificationsPage.motifDuRefusDeVerification': "Motif du refus de vérification",
  'admin.adminVerificationsPage.indiquezLaRaisonPreciseDu': "Indiquez la raison précise du refus",
  'admin.adminVerificationsPage.exDocumentFlouDateDe': "Ex: Document flou, date de validité expirée, SIRET radié...",
  'admin.adminVerificationsPage.fileDeModerationKycKyb': "File de modération KYC / KYB",
  'admin.adminVerificationsPage.dossiersDIdentiteEnFile': "Dossiers d'identité en file d'attente",
  'admin.adminVerificationsPage.piece': "Pièce :",
  'admin.adminVerificationsPage.comptesBancairesDeSequestreEnregistres': "Comptes bancaires de séquestre enregistrés",
  'admin.adminVerificationsPage.journalDAuditInalterableDes': "Journal d'audit inaltérable des vérifications",

  // --- admin.crmAiProspectingPage ---
  'admin.crmAiProspectingPage.decrivezLesProspectsQueVous': "Décrivez les prospects que vous recherchez (ex: Magasins de mobilier design à Paris)...",
  'admin.crmAiProspectingPage.prospectionB2bAssisteeParIa': "Prospection B2B Assistée par IA",
  'admin.crmAiProspectingPage.explorationDesRegistresDEntreprises': "Exploration des registres d'entreprises et extraction des signaux d'activité...",
  'admin.crmAiProspectingPage.compteShongreOuFicheCrm': "Compte Shongre ou fiche CRM existante détectée",
  'admin.crmAiProspectingPage.importe': "Importé",

  // --- admin.crmCompaniesPage ---
  'admin.crmCompaniesPage.rechercherUneEntrepriseDomaineSecteur': "Rechercher une entreprise, domaine, secteur...",
  'admin.crmCompaniesPage.filtrerLesEntreprisesParCycle': "Filtrer les entreprises par cycle de vie",
  'admin.crmCompaniesPage.ajouterUneEntreprise': "Ajouter une entreprise",
  'admin.crmCompaniesPage.enregistrezUneNouvelleEntrepriseOu': "Enregistrez une nouvelle entreprise ou boutique Pro dans le CRM.",
  'admin.crmCompaniesPage.nomCommercialDeLEntreprise': "Nom commercial de l'entreprise",
  'admin.crmCompaniesPage.secteurDActivite': "Secteur d'activité",
  'admin.crmCompaniesPage.exMobilierDecoration': "ex: Mobilier & Décoration",
  'admin.crmCompaniesPage.villeRegion': "Ville / Région",

  // --- admin.crmCompanyDetailPage ---
  'admin.crmCompanyDetailPage.cetteEntrepriseNExistePlus': "Cette entreprise n'existe plus dans le CRM, ou a été fusionné avec une autre fiche.",
  'admin.crmCompanyDetailPage.cycleDeVieDeL': "Cycle de vie de l'entreprise",
  'admin.crmCompanyDetailPage.toutesLesEntreprises': "Toutes les entreprises",
  'admin.crmCompanyDetailPage.changerDeStatut': "Changer de statut :",
  'admin.crmCompanyDetailPage.syntheseCommercialeIa': "Synthèse commerciale IA",
  'admin.crmCompanyDetailPage.opportunitesAssociees': "Opportunités associées",
  'admin.crmCompanyDetailPage.aucuneOpportuniteOuverte': "Aucune opportunité ouverte.",
  'admin.crmCompanyDetailPage.aucunContactRattache': "Aucun contact rattaché.",

  // --- admin.crmContactDetailPage ---
  'admin.crmContactDetailPage.ceContactNExistePlus': "Ce contact n'existe plus dans le CRM, ou a été fusionné avec une autre fiche.",
  'admin.crmContactDetailPage.cycleDeVieDuContact': "Cycle de vie du contact",
  'admin.crmContactDetailPage.planifierUneTache': "Planifier une tâche",
  'admin.crmContactDetailPage.titreDeLaTache': "Titre de la tâche",
  'admin.crmContactDetailPage.exRappelerPourPlanifierLa': "ex: Rappeler pour planifier la démo",
  'admin.crmContactDetailPage.dateDEcheance': "Date d'échéance",
  'admin.crmContactDetailPage.tousLesContacts': "Tous les contacts",
  'admin.crmContactDetailPage.changerDeStatut': "Changer de statut :",
  'admin.crmContactDetailPage.comptePlateformeShongreRattache': "Compte Plateforme Shongre Rattaché",
  'admin.crmContactDetailPage.voirLaVitrinePublique': "Voir la vitrine publique",
  'admin.crmContactDetailPage.typeDeCompte': "Type de compte",
  'admin.crmContactDetailPage.noteVendeur': "Note vendeur",
  'admin.crmContactDetailPage.historiqueDesEchangesNotes': "Historique des échanges & Notes",
  'admin.crmContactDetailPage.tachesAssociees': "Tâches associées",
  'admin.crmContactDetailPage.aucuneTachePlanifiee': "Aucune tâche planifiée.",

  // --- admin.crmContactsPage ---
  'admin.crmContactsPage.rechercherParNomEmailEntreprise': "Rechercher par nom, email, entreprise...",
  'admin.crmContactsPage.filtrerLesContactsParCycle': "Filtrer les contacts par cycle de vie",
  'admin.crmContactsPage.aucunContactNeCorrespondAux': "Aucun contact ne correspond aux filtres",
  'admin.crmContactsPage.elargissezLaRechercheOuReinitialisez': "Élargissez la recherche ou réinitialisez les filtres pour retrouver l'ensemble du portefeuille.",
  'admin.crmContactsPage.creerUnContactCrm': "Créer un contact CRM",
  'admin.crmContactsPage.ajoutezUnInterlocuteurOuProspect': "Ajoutez un interlocuteur ou prospect à la base commerciale.",
  'admin.crmContactsPage.prenom': "Prénom",
  'admin.crmContactsPage.telephone': "Téléphone",
  'admin.crmContactsPage.exGerant': "ex: Gérant",
  'admin.crmContactsPage.exMaisonDecoParis': "ex: Maison Déco Paris",

  // --- admin.crmOverviewPage ---
  'admin.crmOverviewPage.voirLePipeline': "Voir le Pipeline",
  'admin.crmOverviewPage.opportunites': "Opportunités",
  'admin.crmOverviewPage.valeurDuPipeline': "Valeur du Pipeline",
  'admin.crmOverviewPage.tachesATraiter': "Tâches à traiter",
  'admin.crmOverviewPage.prospectionAssisteeParIa': "Prospection Assistée par IA",
  'admin.crmOverviewPage.tachesAFaire': "Tâches à faire",

  // --- admin.crmPipelinePage ---
  'admin.crmPipelinePage.etapePrecedente': "Étape précédente",
  'admin.crmPipelinePage.etapeSuivante': "Étape suivante",
  'admin.crmPipelinePage.creerUneOpportuniteCommerciale': "Créer une opportunité commerciale",
  'admin.crmPipelinePage.ajoutezUnDealAuPipeline': "Ajoutez un deal au pipeline de vente.",
  'admin.crmPipelinePage.titreDeLOpportunite': "Titre de l'opportunité",
  'admin.crmPipelinePage.exAdhesionForfaitProBusiness': "ex: Adhésion Forfait Pro Business",
  'admin.crmPipelinePage.entrepriseConcernee': "Entreprise concernée",
  'admin.crmPipelinePage.typeDOpportunite': "Type d'opportunité",
  'admin.crmPipelinePage.valeurEstimee': "Valeur estimée (€)",
  'admin.crmPipelinePage.nouvelleOpportunite': "Nouvelle opportunité",

  // --- admin.crmTasksPage ---
  'admin.crmTasksPage.aucuneTacheDansCetteVue': "Aucune tâche dans cette vue",
  'admin.crmTasksPage.lesRelancesPlanifieesApparaitrontIci': "Les relances planifiées apparaîtront ici. Changez de filtre pour consulter les autres échéances.",
  'admin.crmTasksPage.creerUneTache': "Créer une tâche",
  'admin.crmTasksPage.ajoutezUnRappelOuUne': "Ajoutez un rappel ou une action commerciale.",
  'admin.crmTasksPage.titreDeLaTache': "Titre de la tâche",
  'admin.crmTasksPage.exRelancerMarcPourSignature': "ex: Relancer Marc pour signature",
  'admin.crmTasksPage.compteOuContactAssocie': "Compte ou contact associé",
  'admin.crmTasksPage.dateDEcheance': "Date d'échéance",
  'admin.crmTasksPage.priorite': "Priorité",
  'admin.crmTasksPage.prioriteDeLaTache': "Priorité de la tâche",
  'admin.crmTasksPage.nouvelleTache': "Nouvelle tâche",

  // --- admin.activityTimeline ---
  'admin.activityTimeline.ajouterUneNoteCommercialeCompte': "Ajouter une note commerciale, compte-rendu d'appel ou remarque...",

  // --- admin.duplicateConflictModal ---
  'admin.duplicateConflictModal.entrepriseExistanteDetectee': "Entreprise existante détectée",
  'admin.duplicateConflictModal.uneCorrespondanceAEteTrouvee': "Une correspondance a été trouvée avec un compte déjà enregistré dans Shongre.",
  'admin.duplicateConflictModal.doublonPotentielIdentifie': "Doublon potentiel identifié",

  // --- admin.enrichmentDiffModal ---
  'admin.enrichmentDiffModal.examinezEtSelectionnezLesInformations': "Examinez et sélectionnez les informations publiques suggérées avant mise à jour.",
  'admin.enrichmentDiffModal.secteurDActivite': "Secteur d'activité",
  'admin.enrichmentDiffModal.syntheseCommercialeIa': "Synthèse commerciale IA",
  'admin.enrichmentDiffModal.100ValideHumain': "100% Validé humain",

  // --- admin.evidenceDrawer ---
  'admin.evidenceDrawer.fitShongreEstime': "Fit Shongre estimé",
  'admin.evidenceDrawer.consulterLaSource': "Consulter la source",

  // --- admin.adminProviderDetailPage ---
  'admin.adminProviderDetailPage.cetIdentifiantDePrestataireN': "Cet identifiant de prestataire n'est pas répertorié dans le registre canonique Shongre. Il a peut-être été retiré ou renommé.",
  'admin.adminProviderDetailPage.retourAuCatalogueDesFournisseurs': "Retour au catalogue des fournisseurs",
  'admin.adminProviderDetailPage.capacitesFournies': "Capacités fournies :",
  'admin.adminProviderDetailPage.configurationCles': "Configuration & Clés",
  'admin.adminProviderDetailPage.marchesSurcharges': "Marchés & Surcharges",
  'admin.adminProviderDetailPage.santeTestsDemo': "Santé & Tests Démo",
  'admin.adminProviderDetailPage.utilisationDependances': "Utilisation & Dépendances",

  // --- admin.adminProvidersPage ---
  'admin.adminProvidersPage.matriceMultiMarches': "Matrice Multi-Marchés",
  'admin.adminProvidersPage.capacitesTestees': "Capacités testées :",

  // --- admin.providerCatalogTable ---
  'admin.providerCatalogTable.rechercherParNomCapaciteEx': "Rechercher par nom, capacité (ex: payment.card), code...",
  'admin.providerCatalogTable.operationnel': "Opérationnel",
  'admin.providerCatalogTable.degrade': "Dégradé",
  'admin.providerCatalogTable.toutesLesCategories': "Toutes les catégories",
  'admin.providerCatalogTable.tousLesStatuts': "Tous les statuts",
  'admin.providerCatalogTable.desactive': "Désactivé",
  'admin.providerCatalogTable.toutesLesSantes': "Toutes les santés",
  'admin.providerCatalogTable.capacitesPrisesEnCharge': "Capacités Prises en Charge",
  'admin.providerCatalogTable.statutSante': "Statut & Santé",
  'admin.providerCatalogTable.marchesSupportes': "Marchés Supportés",

  // --- admin.providerConfigurationForm ---
  'admin.providerConfigurationForm.etatDActivation': "État d'activation",
  'admin.providerConfigurationForm.sandboxEnvironnementDeTestPartenaire': "Sandbox (Environnement de test partenaire)",
  'admin.providerConfigurationForm.productionServeurSecurise': "Production (Serveur sécurisé)",
  'admin.providerConfigurationForm.prioriteDeRoutage': "Priorité de routage",
  'admin.providerConfigurationForm.securiteCertifiee': "Sécurité certifiée",
  'admin.providerConfigurationForm.aucunParametreRequisPourCette': "Aucun paramètre requis pour cette intégration.",
  'admin.providerConfigurationForm.statutDesIdentifiants': "Statut des identifiants :",
  'admin.providerConfigurationForm.cleConfigureeEtValidee': "✓ Clé configurée et validée",
  'admin.providerConfigurationForm.nonConfiguree': "⚠ Non configurée",
  'admin.providerConfigurationForm.cleRevoqueeOuInvalide': "✗ Clé révoquée ou invalide",
  'admin.providerConfigurationForm.cleExpiree': "⌛ Clé expirée",

  // --- admin.providerHealthSimulator ---
  'admin.providerHealthSimulator.operationnelHealthy': "Opérationnel (Healthy)",
  'admin.providerHealthSimulator.toutesLesRequetesAboutissent': "Toutes les requêtes aboutissent",
  'admin.providerHealthSimulator.degradeDegraded': "Dégradé (Degraded)",
  'admin.providerHealthSimulator.ralentissementsOuEchecsPartiels': "Ralentissements ou échecs partiels",
  'admin.providerHealthSimulator.basculeImmediateSurLeSecours': "Bascule immédiate sur le secours",
  'admin.providerHealthSimulator.succesNominalReponseValideHttps': "✓ Succès nominal (Réponse valide HTTPS 200)",
  'admin.providerHealthSimulator.identifiantsOuCleSecreteNon': "⚠ Identifiants ou clé secrète non configurés",
  'admin.providerHealthSimulator.depassementDeDelaiTimeoutHttp': "⌛ Dépassement de délai (Timeout HTTP 504)",
  'admin.providerHealthSimulator.parametresRejetesParLePartenaire': "✗ Paramètres rejetés par le partenaire (400)",

  // --- admin.providerMarketMatrix ---
  'admin.providerMarketMatrix.legende': "Légende :",
  'admin.providerMarketMatrix.referenceFranceActive': "Référence France active",
  'admin.providerMarketMatrix.heriteDeFrance': "Hérité de France",
  'admin.providerMarketMatrix.personnaliseSurcharge': "Personnalisé (Surchargé)",
  'admin.providerMarketMatrix.desactiveIndisponible': "Désactivé / Indisponible",
  'admin.providerMarketMatrix.fonctionnaliteCapacite': "Fonctionnalité / Capacité",

  // --- admin.providerMarketOverridesTab ---
  'admin.providerMarketOverridesTab.exTransporteurDedieZoneFrontaliere': "Ex: Transporteur dédié zone frontalière...",
  'admin.providerMarketOverridesTab.prioriteDeRoutage': "Priorité de routage :",
  'admin.providerMarketOverridesTab.activeDansCePays': "Activé dans ce pays",
  'admin.providerMarketOverridesTab.prioriteLocale': "Priorité locale",
  'admin.providerMarketOverridesTab.aucuneSurchargeDefinie': "Aucune surcharge définie.",

  // --- admin.providerOverviewDashboard ---
  'admin.providerOverviewDashboard.aucuneModificationRecenteEnregistree': "Aucune modification récente enregistrée.",

  // --- admin.providerRoutingManager ---
  'admin.providerRoutingManager.operationnel': "Opérationnel",
  'admin.providerRoutingManager.pretPourBascule': "Prêt pour bascule",
  'admin.providerRoutingManager.marcheCible': "Marché cible :",
  'admin.providerRoutingManager.franceReference': "🇫🇷 France (Référence)",
  'admin.providerRoutingManager.aucunSecoursDefini': "Aucun secours défini",

  // --- admin.taxonomyAttributeRegistryTab ---
  'admin.taxonomyAttributeRegistryTab.rechercherParLibelleIdOu': "Rechercher par libellé, ID ou code d'attribut...",
  'admin.taxonomyAttributeRegistryTab.rechercherUnAttribut': "Rechercher un attribut",
  'admin.taxonomyAttributeRegistryTab.registreCentralDesAttributsCanoniques': "Registre Central des Attributs Canoniques",
  'admin.taxonomyAttributeRegistryTab.tousLesTypesDeDonnees': "Tous les types de données",
  'admin.taxonomyAttributeRegistryTab.nombreNumerique': "Nombre (Numérique)",
  'admin.taxonomyAttributeRegistryTab.menuDeroulantSelect': "Menu déroulant (Select)",
  'admin.taxonomyAttributeRegistryTab.booleenOuiNon': "Booléen (Oui/Non)",
  'admin.taxonomyAttributeRegistryTab.anneeMillesime': "Année (Millésime)",

  // --- admin.taxonomyAuditTab ---
  'admin.taxonomyAuditTab.filtrerLesLogsDAudit': "Filtrer les logs d'audit...",
  'admin.taxonomyAuditTab.journalDAuditTracabiliteDes': "Journal d'Audit & Traçabilité des Opérations",
  'admin.taxonomyAuditTab.operateur': "Opérateur",
  'admin.taxonomyAuditTab.details': "Détails",

  // --- admin.taxonomyDraftPublishTab ---
  'admin.taxonomyDraftPublishTab.publierLesModificationsDeTaxonomie': "Publier les modifications de taxonomie ?",
  'admin.taxonomyDraftPublishTab.annulerToutesLesModificationsEn': "Annuler toutes les modifications en cours ?",
  'admin.taxonomyDraftPublishTab.detailDesChangementsEtages': "Détail des changements étagés",
  'admin.taxonomyDraftPublishTab.historiqueDesVersionsPubliees': "Historique des Versions Publiées",
  'admin.taxonomyDraftPublishTab.publiePar': "Publié par",

  // --- admin.taxonomyHierarchyTree ---
  'admin.taxonomyHierarchyTree.monterDUnRang': "Monter d'un rang",
  'admin.taxonomyHierarchyTree.descendreDUnRang': "Descendre d'un rang",
  'admin.taxonomyHierarchyTree.ajouterUneSousRubrique': "Ajouter une sous-rubrique",
  'admin.taxonomyHierarchyTree.aucuneRubriqueNeCorrespondA': "Aucune rubrique ne correspond à vos filtres.",

  // --- admin.taxonomyImportExportTab ---
  'admin.taxonomyImportExportTab.contenuJsonDeTaxonomie': "Contenu JSON de taxonomie",
  'admin.taxonomyImportExportTab.reinitialiserLaTaxonomieDOrigine': "Réinitialiser la taxonomie d'origine ?",
  'admin.taxonomyImportExportTab.exporterLaTaxonomieCanoniqueJson': "Exporter la Taxonomie Canonique (JSON)",
  'admin.taxonomyImportExportTab.importerUneArborescenceExterne': "Importer une Arborescence Externe",

  // --- admin.taxonomyNodeEditor ---
  'admin.taxonomyNodeEditor.nomCompletDeLaCategorie': "Nom complet de la catégorie (Français)",
  'admin.taxonomyNodeEditor.exVoituresMaterielPro': "Ex: Voitures, Matériel Pro...",
  'admin.taxonomyNodeEditor.schemaDEtat': "Schéma d'état",
  'admin.taxonomyNodeEditor.descriptionCanoniqueEtEditorialeDe': "Description canonique et éditoriale de la catégorie...",
  'admin.taxonomyNodeEditor.couleurDAccentuationDeLa': "Couleur d'accentuation de la catégorie",
  'admin.taxonomyNodeEditor.ajouterUnSynonymeExSmartphone': "Ajouter un synonyme (ex: Smartphone, Portable, GSM...)",
  'admin.taxonomyNodeEditor.ajouterUnSynonyme': "Ajouter un synonyme",
  'admin.taxonomyNodeEditor.retirerCetElement': "Retirer cet élément",
  'admin.taxonomyNodeEditor.statutOperationnel': "Statut opérationnel",
  'admin.taxonomyNodeEditor.modeleDeTitreSeoMeta': "Modèle de Titre SEO (Meta Title)",
  'admin.taxonomyNodeEditor.modeleDeMetaDescription': "Modèle de Meta Description",
  'admin.taxonomyNodeEditor.selectionnezUneCategorieDansL': "Sélectionnez une catégorie dans l'arbre pour l'éditer.",
  'admin.taxonomyNodeEditor.deprecie': "Déprécié",
  'admin.taxonomyNodeEditor.renduStandardPageAnnonceH1': "Rendu standard (Page annonce, H1, SEO) :",
  'admin.taxonomyNodeEditor.produitStandardNeufTresBon': "Produit standard (Neuf, Très bon état...)",
  'admin.taxonomyNodeEditor.vehicule0KmExcellentControle': "Véhicule (0 km, Excellent, Contrôle technique...)",
  'admin.taxonomyNodeEditor.immobilierNeufVefaRenoveA': "Immobilier (Neuf/VEFA, Rénové, À rafraîchir...)",
  'admin.taxonomyNodeEditor.professionnelNeufGarantiReconditionne': "Professionnel (Neuf garanti, Reconditionné...)",
  'admin.taxonomyNodeEditor.serviceADomicileEnAtelier': "Service (À domicile, En atelier, À distance...)",
  'admin.taxonomyNodeEditor.actifEnLigneEtIndexable': "Actif (en ligne et indexable)",
  'admin.taxonomyNodeEditor.brouillonInvisibleAuxUtilisateurs': "Brouillon (invisible aux utilisateurs)",
  'admin.taxonomyNodeEditor.desactive': "Désactivé",
  'admin.taxonomyNodeEditor.deprecieArchivageProgressif': "Déprécié (archivage progressif)",
  'admin.taxonomyNodeEditor.nUdPubliableSelectionnableComme': "Nœud publiable (sélectionnable comme catégorie finale d'annonce)",
  'admin.taxonomyNodeEditor.deprecier': "Déprécier",
  'admin.taxonomyNodeEditor.choisirDansLeRegistre': "-- Choisir dans le Registre --",
  'admin.taxonomyNodeEditor.schemaDePublicationResoluEffectif': "Schéma de Publication Résolu (Effectif pour le vendeur)",
  'admin.taxonomyNodeEditor.optionsDEtat': "Options d'état :",
  'admin.taxonomyNodeEditor.venteAutorisee': "Vente autorisée :",
  'admin.taxonomyNodeEditor.sequestreCbActif': "Séquestre CB actif :",
  'admin.taxonomyNodeEditor.frontiereDArchitecture': "Frontière d'architecture :",
  'admin.taxonomyNodeEditor.eligibiliteIntrinseque': "éligibilité intrinsèque",
  'admin.taxonomyNodeEditor.gestionnaireDePrestataires': "Gestionnaire de Prestataires",
  'admin.taxonomyNodeEditor.paiementSecuriseEnLigneSequestre': "Paiement sécurisé en ligne (Séquestre Shongre)",
  'admin.taxonomyNodeEditor.reservationAvecAcompteDeSequestre': "Réservation avec acompte de séquestre",
  'admin.taxonomyNodeEditor.donGratuitAutorise': "Don gratuit autorisé",
  'admin.taxonomyNodeEditor.trocEchangeAutorise': "Troc / Échange autorisé",
  'admin.taxonomyNodeEditor.locationAutorisee': "Location autorisée",
  'admin.taxonomyNodeEditor.architectureMultiMarchesHeritageFrance': "Architecture Multi-Marchés & Héritage France :",
  'admin.taxonomyNodeEditor.autoriserLIndexationParLes': "Autoriser l'indexation par les moteurs de recherche (Robots: index, follow)",
  'admin.taxonomyNodeEditor.vendeurParticulier': "Vendeur Particulier",
  'admin.taxonomyNodeEditor.vendeurProfessionnel': "Vendeur Professionnel",
  'admin.taxonomyNodeEditor.marche': "Marché :",
  'admin.taxonomyNodeEditor.simulationDuFormulaireDePublication': "Simulation du Formulaire de Publication Réel",
  'admin.taxonomyNodeEditor.annoncesActivesAssociees': "Annonces actives associées :",
  'admin.taxonomyNodeEditor.sousCategoriesDependantes': "Sous-catégories dépendantes :",
  'admin.taxonomyNodeEditor.surchargesMarchesActives': "Surcharges marchés actives :",
  'admin.taxonomyNodeEditor.politiqueDIntegriteCanonique': "Politique d'intégrité canonique :",

  // --- admin.taxonomyTreeToolbar ---
  'admin.taxonomyTreeToolbar.rechercherParLibelleNomCourt': "Rechercher par libellé, nom court, alias, ID, slug...",
  'admin.taxonomyTreeToolbar.rechercherDansLArborescence': "Rechercher dans l'arborescence",
  'admin.taxonomyTreeToolbar.filtrerParNiveauDeTaxonomie': "Filtrer par niveau de taxonomie",
  'admin.taxonomyTreeToolbar.filtrerParStatutDeN': "Filtrer par statut de nœud",
  'admin.taxonomyTreeToolbar.tousLesNiveaux': "Tous les niveaux",
  'admin.taxonomyTreeToolbar.categoriesRacinesUnivers': "Catégories racines (Univers)",
  'admin.taxonomyTreeToolbar.sousCategories': "Sous-catégories",
  'admin.taxonomyTreeToolbar.tousLesStatuts': "Tous les statuts",
  'admin.taxonomyTreeToolbar.depreciesUniquement': "Dépréciés uniquement",

  // --- admin.taxonomyValidationTab ---
  'admin.taxonomyValidationTab.moteurDAuditValidationD': "Moteur d'Audit & Validation d'Intégrité",
  'admin.taxonomyValidationTab.etatGlobal': "État global",
  'admin.taxonomyValidationTab.aucuneAnomalieDetecteeDansCe': "Aucune anomalie détectée dans ce filtre.",
  'admin.taxonomyValidationTab.laTaxonomieRespecteToutesLes': "La taxonomie respecte toutes les règles de cohérence structurelle.",

  // --- admin.addNodeModal ---
  'admin.addNodeModal.cetteOperationAjouteUnNouveau': "Cette opération ajoute un nouveau nœud dans le référentiel canonique en mode brouillon.",
  'admin.addNodeModal.nomCompletCanoniqueFrancais': "Nom complet canonique (Français)",
  'admin.addNodeModal.exEquipementsDeProtectionIndividuelle': "Ex: Équipements de protection individuelle",
  'admin.addNodeModal.exEquipementsPro': "Ex: Équipements Pro",
  'admin.addNodeModal.descriptionInterneOuSeoPour': "Description interne ou SEO pour cette catégorie...",
  'admin.addNodeModal.schemaDEtat': "Schéma d'état",
  'admin.addNodeModal.apercuDuRenduUi': "Aperçu du rendu UI :",
  'admin.addNodeModal.renduStandardDetailleSeo': "Rendu standard (détaillé/SEO) :",
  'admin.addNodeModal.vehicule': "Véhicule",
  'admin.addNodeModal.nUdPubliableAutoriseLa': "Nœud publiable (autorise la création directe d'annonces)",

  // --- admin.attributeEditModal ---
  'admin.attributeEditModal.lesAttributsCanoniquesSontDefinis': "Les attributs canoniques sont définis de manière centralisée et réutilisés dans les différentes catégories.",
  'admin.attributeEditModal.libelleDeLAttributFrancais': "Libellé de l'attribut (Français)",
  'admin.attributeEditModal.exCapaciteDeStockage': "Ex: Capacité de stockage",
  'admin.attributeEditModal.typeDeDonnee': "Type de donnée",
  'admin.attributeEditModal.uniteDeMesureOptionnelle': "Unité de mesure (optionnelle)",
  'admin.attributeEditModal.groupeDePublication': "Groupe de publication",
  'admin.attributeEditModal.texteDAideOuPlaceholder': "Texte d'aide ou placeholder (vendeur)",
  'admin.attributeEditModal.exIndiquezLaCapaciteReelle': "Ex: Indiquez la capacité réelle de la batterie en kWh",
  'admin.attributeEditModal.libelleAfficheFrancais': "Libellé affiché (Français)",
  'admin.attributeEditModal.retirerCetteOption': "Retirer cette option",
  'admin.attributeEditModal.nombreNumerique': "Nombre (Numérique)",
  'admin.attributeEditModal.menuDeroulantSelectUnique': "Menu déroulant (Select unique)",
  'admin.attributeEditModal.booleenOuiNon': "Booléen (Oui / Non)",
  'admin.attributeEditModal.anneeMillesime': "Année (Millésime)",
  'admin.attributeEditModal.general': "Général",
  'admin.attributeEditModal.specificationsTechniques': "Spécifications techniques",
  'admin.attributeEditModal.mentionsLegalesNormes': "Mentions légales & Normes",

  // --- admin.deleteNodeModal ---
  'admin.deleteNodeModal.laSuppressionPermanenteEstStrictement': "La suppression permanente est strictement protégée pour préserver l'intégrité de la marketplace.",
  'admin.deleteNodeModal.suppressionBloqueeParLesRegles': "Suppression bloquée par les règles de sécurité :",
  'admin.deleteNodeModal.deprecier': "déprécier",
  'admin.deleteNodeModal.ceNUdEstEligible': "Ce nœud est éligible à la suppression :",

  // --- admin.deprecateNodeModal ---
  'admin.deprecateNodeModal.laDepreciationRetireCetteRubrique': "La dépréciation retire cette rubrique des nouvelles publications tout en préservant l'intégrité des annonces existantes.",
  'admin.deprecateNodeModal.categorieDeRemplacementSuccesseurLogique': "Catégorie de remplacement / Successeur logique (optionnel)",
  'admin.deprecateNodeModal.garantiesDeRetrocompatibilite': "Garanties de rétrocompatibilité :",
  'admin.deprecateNodeModal.lesAnnoncesExistantesPublieesSous': "Les annonces existantes publiées sous cette catégorie restent 100% consultables.",
  'admin.deprecateNodeModal.leWizardDePublicationNe': "Le wizard de publication ne proposera plus cette rubrique aux vendeurs.",
  'admin.deprecateNodeModal.siUnSuccesseurEstDefini': "Si un successeur est défini, les redirections de recherche s'appliqueront harmonieusement.",
  'admin.deprecateNodeModal.aucunSuccesseurDirectDepreciationSimple': "-- Aucun successeur direct (dépréciation simple) --",

  // --- admin.iconPickerModal ---
  'admin.iconPickerModal.selectionnerUneIconeCanonique': "Sélectionner une icône canonique",
  'admin.iconPickerModal.choisissezParmiLeRegistreDes': "Choisissez parmi le registre des icônes vectorielles standardisées Shongre.",
  'admin.iconPickerModal.rechercherUneIconeExCar': "Rechercher une icône (ex: Car, Home, Phone...)",

  // --- admin.moveNodeModal ---
  'admin.moveNodeModal.reorganisezLaHierarchieEnDeplacant': "Réorganisez la hiérarchie en déplaçant ce nœud et l'ensemble de ses sous-catégories.",
  'admin.moveNodeModal.choisirLeNouveauParentDe': "Choisir le nouveau parent de destination",
  'admin.moveNodeModal.impactStructurelDuDeplacement': "Impact structurel du déplacement :",
  'admin.moveNodeModal.racinePrincipaleNiveauCategorieRacine': "📂 Racine principale (Niveau Catégorie Racine)",

  // --- admin.taxonomyNodeEditor SEO templates ---
  'admin.taxonomyNodeEditor.exempleTitreSeo': "Ex: Petites annonces {category} d'occasion - Shongre",
  'admin.taxonomyNodeEditor.exempleDescriptionSeo':
    'Ex: Achetez et vendez vos articles {category} en toute sécurité avec paiement séquestre Shongre...',
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
type PluralBaseKey<K extends string> = K extends `${infer Base}_one` ? Base : never;

/** What `t()` accepts: every stored key, plus the base of each countable one. */
export type MessageKey = CatalogueKey | PluralBaseKey<CatalogueKey>;

/**
 * A catalogue for another locale.
 *
 * Partial on purpose: a locale is allowed to ship incrementally, and anything
 * it has not translated falls back to French rather than rendering a raw key.
 */
export type MessageCatalogue = Partial<Record<CatalogueKey, string>>;
