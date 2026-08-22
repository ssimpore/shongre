import { MessageCatalogue } from "./messages.fr";

/**
 * English (en-US).
 *
 * Note `common.listingCount_one` / `_other`: English puts 0 in the plural
 * ("0 listings") while French puts it in the singular ("0 annonce"). Nothing
 * here encodes that — `Intl.PluralRules` does, per locale, which is why the
 * catalogue only ever declares the forms and never the rule.
 */
export const messagesEn: MessageCatalogue = {
  // --- Generic actions and states -----------------------------------------
  "common.loading": "Loading…",
  "common.retry": "Try again",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.notifications": "Notifications",
  "a11y.skipToContent": "Skip to main content",
  "common.close": "Close",
  "common.search": "Search",
  "common.seeAll": "See all",
  "common.back": "Back",
  "common.error": "Something went wrong",
  "common.listingCount_one": "{count} listing",
  "common.listingCount_other": "{count} listings",
  "common.resultCount_one": "{count} result",
  "common.resultCount_other": "{count} results",
  "common.reviewCount_one": "{count} review",
  "common.reviewCount_other": "{count} reviews",

  // --- Primary navigation ---------------------------------------------------
  "nav.home": "Home",
  "nav.search": "Search",
  "nav.messages": "Messages",
  "nav.account": "Account",
  "nav.sell": "Sell",
  "nav.favorites": "Favourites",
  "nav.notifications": "Notifications",
  "nav.categories": "Categories",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.mobileLabel": "Mobile navigation",
  "nav.categoryNavigation": "Category navigation",
  "nav.category.immobilier": "Property",
  "nav.category.vehicules": "Vehicles",
  "nav.category.materielPro": "Pro equipment",
  "nav.category.emploi": "Jobs",
  "nav.category.mode": "Fashion",
  "nav.category.maisonJardin": "Home & Garden",
  "nav.category.famille": "Family",
  "nav.category.electronique": "Electronics",
  "nav.category.loisirs": "Leisure",
  "nav.category.autres": "More",
  "nav.category.cours": "Tutoring",
  "nav.category.bonsPlans": "Deals!",
  "nav.unreadMessages_one": "{count} unread message",
  "nav.unreadMessages_other": "{count} unread messages",

  // --- Footer ---------------------------------------------------------------
  "footer.findTutor": "Find a tutor",
  "footer.offerCourses": "Offer tutoring",
  "footer.legalHeading": "Legal information",
  "footer.terms": "Terms of use",
  "footer.privacy": "Privacy policy",
  "footer.cookies": "Cookie settings",
  "footer.legalNotices": "Legal notice",
  "footer.accessibility": "Accessibility (WCAG 2.2 AA)",
  "footer.copyright": "© {year} Shongre SAS. All rights reserved.",
  "footer.sectionCategories": "Top categories",
  "footer.sectionCities": "Cities & regions",
  "footer.createProAccount": "Create a Pro account",
  "footer.storeDirectory": "Store directory",
  "footer.boostGrid": "Options & boosts pricing",
  "footer.safetyTips": "Safety tips",
  "footer.contactSupport": "Contact support",
  "footer.currentDeals": "Current deals",
  "footer.comingSoon": "{name} — coming soon",
  "footer.newsletterPitch":
    "Get our weekly pick of listings and verified discounts.",
  "footer.hosted": "Hosted",
  "footer.appPitch": "Take Shongre with you everywhere.",
  "footer.trust.escrowTitle": "100% secure payment",
  "footer.trust.escrowBody":
    "Your payment is protected until your order arrives as described.",
  "footer.trust.deliveryTitle": "Delivery built in",
  "footer.trust.deliveryBody":
    "Send via Mondial Relay pickup point, Colissimo, or hand over securely in person.",
  "footer.trust.verifiedTitle": "Verified sellers & business numbers",
  "footer.trust.verifiedBody":
    "Identities checked and companies registered with the French trade register.",
  "footer.trust.supportTitle": "Customer support, 7 days a week",
  "footer.trust.supportBody":
    "A dedicated team based in France to help you and moderate listings.",

  // --- Language selector ----------------------------------------------------
  "language.choose": "Choose language",
  "language.current": "Language: {language}. Click to change.",
  "language.preferences": "Preferences…",

  // --- Cookie consent -------------------------------------------------------
  "consent.title": "Your privacy preferences",
  "consent.body":
    "We use cookies that are strictly necessary for the site to work. With your " +
    "agreement, we add audience measurement and personalisation. You can change " +
    "your mind at any time from “Cookie settings”.",
  "consent.learnMore": "Learn more",
  "consent.acceptAll": "Accept all",
  "consent.rejectAll": "Reject all",
  "consent.customise": "Customise",
  "consent.panelTitle": "Cookie settings",
  "consent.panelDescription":
    "Choose purpose by purpose. Your choice is kept for 6 months.",
  "consent.saveChoices": "Save my choices",
  "consent.alwaysOn": "Always on — the service cannot run without them.",
  "consent.category.necessary": "Strictly necessary",
  "consent.category.necessaryDescription":
    "Session, security and remembering your preferences (market, language, location). " +
    "Without them, the site cannot work.",
  "consent.category.analytics": "Audience measurement",
  "consent.category.analyticsDescription":
    "Anonymised traffic statistics, so we can tell which pages are useful and fix " +
    "the ones that are not.",
  "consent.category.marketing": "Personalisation & advertising",
  "consent.category.marketingDescription":
    "Listing recommendations and campaign measurement. Refusing does not reduce how " +
    "many listings you see, only how personalised they are.",

  // --- migrated surfaces ---
  "proDirectory.rechercherParNomDeBoutique": "Search by store name or city…",
  "proDirectory.rechercherUneBoutiqueProfessionnelle":
    "Search for a professional store",
  "proDirectory.aucuneBoutiqueProfessionnelleTrouvee":
    "No professional store found",
  "proDirectory.aucunCommercantOuArtisanNe":
    "No trader or craftsperson matches your search by name or city.",
  "proDirectory.effacerLaRecherche": "Clear search",
  "shell.accountLayout.navigationDuCompte": "Account navigation",
  "shell.accountLayout.comptePro": "Pro account",
  "shell.accountLayout.proBadge": "Pro",
  "shell.accountLayout.roleAdministrateur": "Administrator",
  "shell.accountLayout.roleSuperAdministrateur": "Super administrator",
  "shell.accountLayout.seDeconnecter": "Sign out",
  "shell.focusedLayout.quitterEtRevenirAL": "Leave and return home",
  "shell.header.fermerLeMenu": "Close menu",
  "shell.header.fermerLeMenuMobile": "Close mobile menu",
  "shell.header.compteProfessionnel": "Professional account",
  "shell.header.verifie": "Verified",
  "shell.locationPickerModal.zoneGeographique": "Area",
  "shell.locationPickerModal.rayonDeRecherche": "Search radius",
  "shell.preferencesModal.preferencesRegionales": "Regional preferences",
  "shell.preferencesModal.personnalisezVotrePaysDeNavigation":
    "Set your browsing country, display currency and language",
  "shell.preferencesModal.marchePays": "Market / Country",
  "shell.preferencesModal.langueDeLInterface": "Interface language",
  "shell.errorBoundary.uneErreurInattendueEstSurvenue":
    "Something unexpected went wrong",
  "shell.errorBoundary.applicationARencontreUnProbleme":
    "The app hit a temporary display problem.",
  "shell.errorBoundary.retourAccueil": "Back home",
  "shell.errorBoundary.actualiserLaPage": "Reload the page",
  "ui.badge.profilVerifie": "Verified profile",
  "ui.categoryFilterRail.faireDefilerLesCategoriesVers":
    "Scroll categories left",
  "ui.categoryFilterRail.filtresParCategorie": "Category filters",
  "ui.categoryFilterRail.afficherToutesLesAnnoncesActives":
    "Show all active listings",
  "ui.categoryFilterRail.faireDefilerLesCategoriesVers2":
    "Scroll categories right",
  "ui.categoryFilterRail.toutesLesAnnonces": "All listings",
  "ui.globalSearchBar.rechercheGlobale": "Site search",
  "ui.globalSearchBar.selectionnerUneCategorie": "Select a category",
  "ui.globalSearchBar.rechercherUneCategorie": "Search a category…",
  "ui.globalSearchBar.rechercherUneAnnonce": "Search listings",
  "ui.globalSearchBar.effacerLeTexte": "Clear text",
  "ui.globalSearchBar.lancerLaRecherche": "Run search",
  "ui.globalSearchBar.rechercheMobile": "Mobile search",
  "ui.globalSearchBar.rechercheEtFiltres": "Search and filters",
  "ui.globalSearchBar.filtrerLesCategories": "Filter categories…",
  "ui.globalSearchBar.recherchePrincipaleDePetitesAnnonces":
    "Main classifieds search",
  "ui.globalSearchBar.filtrerParCategorie": "Filter by category",
  "ui.globalSearchBar.chercherUneCategorie": "Find a category…",
  "ui.globalSearchBar.effacerLaRecherche": "Clear search",
  "ui.globalSearchBar.lancerLaRechercheDePetites": "Run classifieds search",
  "ui.globalSearchBar.toutesLesCategories": "All categories",
  "ui.globalSearchBar.categories": "Categories",
  "ui.listingCard.annonceALaUne": "Featured listing",
  "ui.listingCard.noteAvis": "Rated {rating} out of 5, {count} reviews",
  "ui.listingCard.nombrePhotos": "{count} photos",
  "ui.listingCard.ajouterAuxFavoris": "Add to favorites",
  "ui.noResultsFound.conseilsPourTrouverVotreBonheur":
    "Tips for finding what you want:",
  "ui.searchAutocomplete.suggestionsDeRecherche": "Search suggestions",
  "ui.searchAutocomplete.categoriesRayons": "Categories & departments",
  "ui.searchAutocomplete.recherchesRecentes": "Recent searches",
  "ui.searchAutocomplete.recherchesLesPlusPopulaires": "Most popular searches",
  "ui.sellerCard.verifie": "Verified",
  "ui.sellerCard.visiterLaBoutiqueOfficielleCatalogue":
    "Visit the official store & catalogue",
  "ui.sellerCard.visiterLaBoutique": "Visit the store",
  "ui.sellerCard.voirLeProfilAnnonces": "View profile & listings",
  "ui.sellerCard.voirLeProfil": "View profile",
  "auth.forgotPasswordPage.votreEmailExempleFr": "your.email@example.com",
  "auth.forgotPasswordPage.collezLeTokenRecuPar":
    "Paste the token you received by email",
  "auth.forgotPasswordPage.nouveauMotDePasse": "New password",
  "auth.loginPage.ex123456Ou84921049": "e.g. 123456 or 8492-1049",
  "auth.loginPage.votreEmailExempleFr": "your.email@example.com",
  "auth.loginPage.resterConnecteSurCetAppareil":
    "Stay signed in on this device",
  "auth.loginPage.acheteurVendeur": "Buyer / Seller",
  "auth.loginPage.siretVitrineVerifiee": "Business number & verified store",
  "auth.social.or": "or continue with",
  "auth.social.google": "Continue with Google",
  "auth.social.apple": "Continue with Apple",
  "auth.social.facebook": "Continue with Facebook",
  "auth.social.failed": "This sign-in method is temporarily unavailable.",
  "auth.social.privacy":
    "By continuing, you agree to the Terms of use and acknowledge the Privacy policy.",
  "auth.callback.loading": "Securely validating your sign-in…",
  "auth.callback.success": "Sign-in confirmed. Redirecting…",
  "auth.callback.linked": "Account connected successfully.",
  "auth.callback.cancelled": "Sign-in was cancelled. No changes were made.",
  "auth.callback.linkRequired":
    "A Shongre account already exists. Sign in to it, then connect this provider from Sign-in & security.",
  "auth.callback.emailRequired":
    "This provider did not confirm your email address. Verify one to finish creating your account.",
  "auth.callback.title": "Secure sign-in",
  "auth.callback.subtitle": "Shongre is validating the sign-in provider’s response",
  "auth.callback.emailLabel": "Email address to verify",
  "auth.callback.verifyEmail": "Verify this address",
  "auth.callback.backToLogin": "Back to sign-in",
  "auth.callback.signInExisting": "Sign in to the existing account",
  "auth.security.title": "Sign-in & security",
  "auth.security.description":
    "Manage your sign-in methods and the devices that can access your account.",
  "auth.security.loading": "Loading security settings…",
  "auth.security.confirmIdentity": "Confirm your identity",
  "auth.security.confirmDescription": "This confirmation protects changes to your sign-in methods.",
  "auth.security.currentPassword": "Current password",
  "auth.security.confirm": "Confirm",
  "auth.security.methods": "Sign-in methods",
  "auth.security.passwordProvider": "Email and password",
  "auth.security.connected": "Connected",
  "auth.security.notConnected": "Not connected",
  "auth.security.linkedOn": "Connected on",
  "auth.security.lastUsed": "Last used",
  "auth.security.privateRelay": "Apple private relay",
  "auth.security.disconnect": "Disconnect",
  "auth.security.connect": "Connect",
  "auth.security.unavailable": "Unavailable",
  "auth.security.changePassword": "Change password",
  "auth.security.addPassword": "Add a password",
  "auth.security.newPassword": "New password",
  "auth.security.savePassword": "Save password",
  "auth.security.devices": "Signed-in devices",
  "auth.security.devicesDescription": "Immediately revoke any device you do not recognize.",
  "auth.security.refresh": "Refresh",
  "auth.security.lastActivity": "Last activity",
  "auth.security.thisDevice": "This device",
  "auth.security.signOut": "Sign out",
  "auth.security.revoke": "Revoke",
  "auth.security.noSessions": "No active sessions.",
  "auth.security.signOutOthers": "Sign out other devices",
  "auth.security.secretsNotice": "Provider tokens and OAuth secrets are never displayed on this page.",
  "auth.onboarding.title": "How will you use Shongre?",
  "auth.onboarding.description": "Your sign-in method is ready. This choice now adapts your journey without changing your identity.",
  "auth.onboarding.continue": "Continue",
  "auth.registerPages.creezVotreCompteGratuitEn":
    "Create your free account in a minute and buy and sell with confidence",
  "auth.registerPages.14RueDesAntiquaires": "14 Antique Row",
  "auth.registerPages.evolutionDeCompteSouple": "Flexible account upgrades:",
  "auth.registerPages.vendeurProfessionnel": "Professional seller",
  "auth.registerPages.identiteDuGerant": "Director's identity",
  "auth.verifyEmailPage.verificationDAdresseEmail":
    "Email address verification",
  "auth.verifyEmailPage.confirmezVotreAdresseEmailPour":
    "Confirm your email address to secure your account and unlock every feature",
  "auth.verifyEmailPage.collezIciVotreJetonDe":
    "Paste your validation token here",
  "auth.verifyEmailPage.renvoyerUnEmailDeValidation": "Resend validation email",
  "auth.accountTypeSelector.depotDAnnoncesGratuitEt":
    "Free, instant listing publication",
  "auth.accountTypeSelector.paiementSecuriseAvecSequestre":
    "Secure payment held in escrow",
  "auth.accountTypeSelector.messagerieInstantaneeDirecte":
    "Direct instant messaging",
  "auth.accountTypeSelector.badgeOfficielVendeurProVerifie":
    "Official Verified Pro Seller badge",
  "auth.accountTypeSelector.vitrineDeBoutiquePersonnalisable":
    "Customisable storefront",
  "auth.accountTypeSelector.facturationAutomatiqueAvecTva":
    "Automatic invoicing with VAT",
  "auth.authLayout.conformiteRgpdFranceUe": "GDPR compliant, France & EU",
  "auth.authLayout.protectionAcheteurVendeur": "Buyer & seller protection",
  "auth.mFAModal.copierLaCleSecrete": "Copy secret key",
  "auth.mFAModal.copierLesCodesDeSecours": "Copy backup codes",
  "auth.passwordField.robustesseDuMotDePasse": "Password strength:",
  "auth.passwordField.8CaracteresMinimum": "8 characters minimum",
  "auth.passwordField.1CaractereSpecial": "1 special character",
  "auth.upgradeToProModal.exAtelierEbenisterieDupont":
    "e.g. Dupont Cabinetmaking Workshop",
  "auth.upgradeToProModal.12RueDuCommerce75011":
    "12 Commerce Street, 75011 Paris",
  "auth.upgradeToProModal.verificationLegale": "Legal verification:",
  "categories.categoriesPage.filtrerUneCategorieSousCategorie":
    "Filter a category or subcategory…",
  "categories.categoriesPage.toutesLesCategories": "All categories",
  "categories.categoriesPage.voirToutesLesAnnonces": "See all listings",
  "categories.categoriesPage.voirTout": "See all",
  "categories.categoriesPage.aucuneCategorieTrouvee": "No category found",
  "collections.collectionsPage.chercherUneThematique": "Find a theme…",
  "collections.collectionsPage.annoncesDeLaCollection":
    "Listings in this collection",
  "collections.collectionsPage.filtrerDansLaSelection":
    "Filter within the selection…",
  "collections.collectionsPage.toutesLesCollections": "All collections",
  "collections.collectionsPage.leMotDeLaRedaction": "From the editors",
  "collections.collectionsPage.aucuneCollectionTrouvee": "No collection found",
  "collections.collectionsPage.aucuneAnnonceTrouvee": "No listing found",
  "collections.collectionsPage.decouvrirDAutresCollections":
    "Discover other collections",
  "favorites.favoritesPage.aucunFavoriPourLeMoment": "No favourites yet",
  "favorites.favoritesPage.cliquezSurLeCUr":
    "Tap the heart on a listing to save it and find it again here.",
  "home.homePage.ceMarcheVientDOuvrir":
    "This market has just opened. Post the first listing, or switch market from the header to explore other countries.",
  "home.homePage.explorerLeCatalogue": "Browse the catalogue",
  "home.homePage.toutesLesNouveautes": "All new listings",
  "home.homePage.voirTout": "See all",
  "home.homePage.toutesLesOffres": "All deals",
  "home.homePage.tousLesProfessionnels": "All professionals",
  "home.trendingNow.kicker": "What's moving",
  "home.trendingNow.explorerTout": "Explore all",
  "home.trendingNow.topics": "Trending topics",
  "home.trendingNow.topicsAnnouncement_one": "{count} trend updated",
  "home.trendingNow.topicsAnnouncement_other": "{count} trends updated",
  "home.trendingNow.voirTout": "See all",
  "home.trendingNow.annonces": "listings",
  "home.trendingNow.topicPosition": "topic {position}",
  "home.homeCategoryExplorer.5CategoriesPrincipales": "5 main categories",
  "home.homeCategoryExplorer.toutesLesCategories": "All categories",
  // --- home.homeRecentSearches ---
  "home.homeRecentSearches.recherchesRecentes": "Recent searches",
  "home.homeRecentSearches.touteLaFrance": "All France",
  "home.homeRecentSearches.supprimerCetteRecherche": "Delete this search",
  // --- home.homeCollectionsSection ---
  "home.homeCollectionsSection.tendanceEnCeMoment": "Trending right now",
  "home.homeCollectionsSection.laPieceManquante": "The missing part",
  "home.homeCollectionsSection.aVeloEnFamille": "Family biking",
  "home.homeCollectionsSection.amenagezVotreExterieur": "Outdoor living",
  "home.homeCollectionsSection.unPetitPlongeon": "A quick dip?",
  "home.homeCollectionsSection.deLAir": "Fresh air!",
  "home.homeCollectionsSection.thematiquesCollections": "themed collections",
  "home.homeCollectionsSection.toutesLesCollections": "All collections",
  "home.homeCollectionsSection.voirTout": "See all",
  "legal.legalPages.conditionsGeneralesDUtilisationCgu": "Terms of Use",
  "legal.legalPages.derniereMiseAJourFevrier": "Last updated: February 2026",
  "legal.legalPages.1ObjetDeLaPlateforme": "1. Purpose of the platform",
  "legal.legalPages.laPlateformeShongreEstUn":
    "Shongre is a service connecting buyers and sellers (private individuals and professionals) for publishing classified listings, negotiating, and completing transactions securely in mainland France.",
  "legal.legalPages.2SequestreProtectionAcheteur":
    "2. Escrow & buyer protection",
  "legal.legalPages.lorsquUneTransactionEstEffectuee":
    "When a transaction is made through the online payment system, funds are held in a French escrow account until the buyer confirms the item was received as described.",
  "legal.legalPages.3EngagementsDesProfessionnels":
    "3. Obligations of professional sellers",
  "legal.legalPages.lesVendeursProfessionnelsSEngagent":
    "Professional sellers undertake to provide a valid SIRET business number, to honour the statutory 14-day right of withdrawal, and to issue invoices compliant with French tax requirements.",
  "legal.legalPages.politiqueDeConfidentialiteRgpd": "Privacy Policy & GDPR",
  "legal.legalPages.shongreAttacheLaPlusGrande":
    "Shongre treats the protection of your personal data as a priority, in accordance with the General Data Protection Regulation (GDPR 2016/679) and the French Data Protection Act.",
  "legal.legalPages.principeDeMinimisation": "Data minimisation:",
  "legal.legalPages.mentionsLegales": "Legal Notice",
  "legal.legalPages.editeur": "Publisher:",
  "legal.legalPages.shongreSasAuCapitalDe":
    "Shongre SAS, share capital €50,000 — Paris Trade Register 912 345 678",
  "legal.legalPages.siegeSocial": "Registered office:",
  "legal.legalPages.directeurDeLaPublication": "Publication director:",
  "legal.legalPages.antoineFabrePresident": "Antoine Fabre, President",
  "legal.legalPages.hebergement": "Hosting:",
  "legal.legalPages.serveursSecurisesSituesEnFrance":
    "Secure servers located in mainland France.",
  "legal.legalPages.declarationDAccessibiliteWcag2":
    "Accessibility Statement (WCAG 2.2 AA)",
  "legal.legalPages.shongreSEngageARendre":
    "Shongre is committed to making its platform accessible to everyone, including people with disabilities, in line with the international WCAG 2.2 level AA standards.",
  "legal.legalPages.navigationIntegraleAuClavierAvec":
    "Full keyboard navigation with a visible focus indicator",
  "legal.legalPages.contrastesTypographiquesSuperieursAuxRatios":
    "Text contrast above the 4.5:1 ratio",
  "legal.legalPages.labelsEtAttributsAriaSur":
    "Labels and ARIA attributes on every interactive control",
  "legal.legalPages.conseilsDeSecuriteAntiFraude": "Safety & Fraud Prevention",
  "legal.legalPages.refusezLesVirementsDirectsMandats":
    "Refuse direct bank transfers, Western Union money orders and uncertified cheques.",
  "legal.legalPages.utilisezLeSequestreShongre": "Use Shongre escrow",
  "legal.legalPages.votreArgentEstProtegeJusqu":
    "Your money is protected until you confirm the parcel you received is as described.",
  "listings.listingDetailPage.annonceIntrouvableOuSupprimee":
    "Listing not found or removed",
  "listings.listingDetailPage.cetteAnnonceNEstPlus":
    "This listing is no longer available or was withdrawn by its seller. Similar items may still be listed.",
  "listings.listingDetailPage.partagerLAnnonce": "Share listing",
  "listings.listingDetailPage.signalerCetteAnnonce": "Report this listing",
  "listings.listingDetailPage.votreMessage": "Your message",
  "listings.listingDetailPage.bonjourVotreArticleMInteresse":
    "Hello, I'm very interested in your item. Is it still available?…",
  "listings.listingDetailPage.faireUneOffreDePrix": "Make an offer",
  "listings.listingDetailPage.montantDeVotreOffre": "Your offer (€)",
  "listings.listingDetailPage.aidezLEquipeDeModeration":
    "Help the moderation team keep Shongre safe",
  "listings.listingDetailPage.motifDuSignalement": "Reason for reporting",
  "listings.listingDetailPage.precisionsComplementaires": "Additional details",
  "listings.listingDetailPage.expliquezCeQuiVousSemble":
    "Tell us what looks wrong…",
  "listings.listingDetailPage.annonceIntrouvable": "Listing not found",
  "listings.listingDetailPage.vendeurPro": "Pro seller",
  "listings.listingDetailPage.referenceAnnonce": "Listing reference:",
  "listings.listingDetailPage.vousEtesLAuteurDe": "This is your own listing",
  "listings.listingDetailPage.voirTout": "See all",
  "listings.listingDetailPage.annoncesSimilaires": "Similar listings",
  "listings.listingMediaGallery.photoPrecedente": "Previous photo",
  "listings.listingMediaGallery.agrandirEnPleinEcran": "View full screen",
  "listings.listingMediaGallery.fermerLePleinEcran": "Exit full screen",
  "listings.listingSafetyNotice.garantieSecuriteShongre":
    "Shongre guarantee & safety",
  "listings.listingSellerTrustSection.vendeurPro": "Pro seller",
  "listings.listingSellerTrustSection.verifie": "Verified",
  "messaging.messagingPage.cetUtilisateurNePourraPlus":
    "This user will no longer be able to message you or interact with your listings.",
  "messaging.messagingPage.signalerLaConversation": "Report conversation",
  "messaging.messagingPage.aidezLEquipeDeModeration":
    "Help the moderation team keep Shongre safe.",
  "messaging.messagingPage.fermerLaVuePleinEcran": "Exit full screen",
  "messaging.messagingPage.vuePleinEcran": "Full screen",
  "messaging.messagingPage.aucunMessagePourLeMoment": "No messages yet",
  "messaging.messagingPage.selectionnezUneConversation":
    "Select a conversation",
  "messaging.conversationContextBar.reservee": "Reserved",
  "messaging.conversationHeader.retourAuxConversations":
    "Back to conversations",
  "messaging.conversationHeader.identiteVerifiee": "Identity verified",
  "messaging.conversationHeader.optionsDeLaConversation":
    "Conversation options",
  "messaging.conversationHeader.utilisateurBloque": "User blocked",
  "messaging.conversationHeader.voirLeProfilPublic": "View public profile",
  "messaging.conversationHeader.debloquerLUtilisateur": "Unblock user",
  "messaging.conversationHeader.signalerLaConversation": "Report conversation",
  "messaging.conversationList.rechercherParNomOuAnnonce":
    "Search by name or listing…",
  "messaging.conversationList.effacerLaRecherche": "Clear search",
  "messaging.conversationList.aucuneConversationTrouvee":
    "No conversation found",
  "messaging.makeOfferModal.faireUneOffreDePrix": "Make an offer",
  "messaging.makeOfferModal.montantDeVotreOffre": "Your offer (€)",
  "messaging.messageComposer.apercuPieceJointe": "Attachment preview",
  "messaging.messageComposer.supprimerLaPhoto": "Remove photo",
  "messaging.messageComposer.joindreUnePhoto": "Attach a photo",
  "messaging.messageComposer.ecrivezVotreMessageEntreePour":
    "Write your message… (Enter to send)",
  "messaging.messageComposer.photoPreteAEtreEnvoyee": "Photo ready to send",
  "messaging.messageComposer.seraTransmiseAvecVotreMessage":
    "Will be sent with your message",
  "messaging.messageComposer.ajouterUnePhotoALa":
    "Add a photo to the conversation",
  "messaging.messageTimeline.historiqueDeLaConversation":
    "Conversation history",
  "messaging.messageTimeline.photoPartagee": "Shared photo",
  "messaging.messageTimeline.debutDeLaConversation":
    "Start of the conversation",
  "messaging.messageTimeline.echec": "Failed",
  "messaging.pickupSchedulerModal.planifierLaRemiseEnMain":
    "Schedule the handover",
  "messaging.pickupSchedulerModal.convenezDUnCreneauEt":
    "Agree a time and a safe place to hand the item over with confidence.",
  "messaging.pickupSchedulerModal.dateDuRendezVous": "Meeting date",
  "messaging.pickupSchedulerModal.creneauHoraire": "Time slot",
  "messaging.pickupSchedulerModal.lieuDeRendezVousEspace":
    "Meeting place (a public space is recommended)",
  "messaging.pickupSchedulerModal.exDevantLeMetroPlace":
    "e.g. outside the station, town square…",
  "messaging.pickupSchedulerModal.matinee10h0012h00": "Morning (10:00 – 12:00)",
  "messaging.pickupSchedulerModal.apresMidi14h0016h00":
    "Afternoon (14:00 – 16:00)",
  "messaging.pickupSchedulerModal.finDApresMidi16h00":
    "Late afternoon (16:00 – 18:00)",
  "messaging.pickupSchedulerModal.soiree18h0020h00": "Evening (18:00 – 20:00)",
  "newsletter.newsletterLandingPage.laNewsletterShongre":
    "The Shongre newsletter",
  "newsletter.newsletterLandingPage.100SansSpam": "100% spam-free",
  "newsletter.newsletterLandingPage.uneFrequenceRaisonneeDUn":
    "A sensible one to two emails a week, at most.",
  "newsletter.newsletterLandingPage.contenuEditorialSoigne":
    "Carefully edited content",
  "newsletter.newsletterLandingPage.desSelectionsManuellesPrepareesPar":
    "Hand-picked selections put together by our teams in France.",
  "newsletter.newsletterLandingPage.desinscriptionInstantanee":
    "Instant unsubscribe",
  "newsletter.newsletterLandingPage.unLienDeDesabonnementEn":
    "A one-click unsubscribe link in every email we send.",
  "newsletter.newsletterPreferencesPage.vosThematiquesFavorites":
    "Your favourite topics",
  "newsletter.newsletterUnsubscribePage.votreAdresseEmail":
    "Your email address",
  "newsletter.newsletterUnsubscribePage.votreEmailExempleFr":
    "your.email@example.com",
  "newsletter.newsletterPreviewModal.simulationDeRenduResponsiveDe":
    "Responsive preview of the newsletter campaign.",
  "newsletter.newsletterPreviewModal.velo": "Bike",
  "newsletter.newsletterPreviewModal.preheader": "Preheader:",
  "newsletter.newsletterPreviewModal.veloGravelAluminium":
    "Aluminium gravel bike",
  "newsletter.newsletterPreviewModal.gererMesPreferences":
    "Manage my preferences",
  "newsletter.newsletterPreviewModal.seDesabonnerEn1Clic":
    "Unsubscribe in one click",
  "newsletter.newsletterSignup.votreEmailCom": "you@email.com",
  "newsletter.newsletterSignup.votreAdresseEmail": "Your email address",
  "newsletter.newsletterSignup.saisissezVotreAdresseEmail":
    "Enter your email address",
  "newsletter.newsletterSignup.inscriptionConfirmee": "Subscription confirmed",
  "newsletter.newsletterSignup.vousEtesBienInscrit": "You're subscribed",
  "newsletter.newsletterSignup.laSelectionShongre": "The Shongre selection",
  "notifications.notificationPreferencesPage.chargementDeVosPreferencesDe":
    "Loading your notification preferences…",
  "notifications.notificationPreferencesPage.retourAuCentreDeNotifications":
    "Back to notification centre",
  "notifications.notificationPreferencesPage.categorieDAlerte":
    "Alert category",
  "notifications.notificationPreferencesPage.surLApplication": "In the app:",
  "notifications.notificationPreferencesPage.parEmail": "By email:",
  "notifications.notificationPreferencesPage.surMobilePush":
    "On mobile (push):",
  "notifications.notificationsPage.centreDeNotifications":
    "Notification centre",
  "notifications.notificationDemoToolbar.simulateurDEvenementsTempsReel":
    "Real-time event simulator (demo mode)",
  "notifications.notificationPanel.panneauDesNotifications":
    "Notifications panel",
  "notifications.notificationPanel.preferencesDeNotifications":
    "Notification preferences",
  "notifications.notificationPanel.toutLire": "Mark all read",
  "notifications.notificationPanel.aucuneNotificationPourLeMoment":
    "No notifications yet",
  "notifications.notificationPanel.voirToutesLesNotifications":
    "See all notifications",
  "profile.sellerPublicPage.sectionsDuProfilVendeur": "Seller profile sections",
  "profile.proBusinessInfo.numeroSiret": "SIRET number",
  "profile.proBusinessInfo.adresseDuSiegeBoutique":
    "Registered office / store address",
  "profile.proBusinessInfo.droitDeRetractation": "Right of withdrawal",
  "profile.proBusinessInfo.factureAvecTvaSurDemande": "VAT invoice on request",
  "profile.proBusinessInfo.garantieLegaleDeConformite2":
    "Statutory warranty of conformity (2 years)",
  "profile.proBusinessInfo.emballageProfessionnelRenforce":
    "Reinforced professional packaging",
  "profile.sellerCatalog.effacerLaRecherche": "Clear search",
  "profile.sellerCatalog.aucunArticleNeCorrespondA":
    "No item matches your selection",
  "profile.sellerCatalog.essayezDeModifierVotreMot":
    "Try a different keyword, or reset your category and price filters.",
  "profile.sellerCatalog.reinitialiserLesFiltres": "Reset filters",
  "profile.sellerCatalog.fourchetteDePrix": "Price range (€):",
  "profile.sellerProfileHeader.partagerCeProfil": "Share this profile",
  "profile.sellerProfileHeader.optionsSupplementaires": "More options",
  "profile.sellerProfileHeader.tauxDeReponse": "Response rate",
  "profile.sellerProfileHeader.delaiMoyen": "Average response time",
  "profile.sellerReportModal.signalerCeProfil": "Report this profile",
  "profile.sellerReportModal.decrivezPrecisementLesFaitsConstates":
    "Describe exactly what you saw, with listing links or message excerpts…",
  "profile.sellerTrustIndicators.paiementSecurise": "Secure payment",
  "profile.sellerTrustIndicators.livraisonRetrait": "Delivery & collection",
  "profile.sellerTrustIndicators.reactiviteCertifiee":
    "Certified responsiveness",
  "publishing.publishWizard.exCanapeDAngleIphone":
    "e.g. corner sofa, iPhone 15, cars, bikes…",
  "publishing.publishWizard.titreDeLAnnonce": "Listing title",
  "publishing.publishWizard.exCanapeScandinave3Places":
    "e.g. Scandinavian 3-seater sofa, beige bouclé fabric",
  "publishing.publishWizard.descriptionDetaillee": "Detailed description",
  "publishing.publishWizard.vendsCanapeEnExcellentEtat":
    "Selling a sofa in excellent condition, very comfortable. Original receipt included…",
  "publishing.publishWizard.faireUnDonGratuit0": "Give it away free (€0)",
  "publishing.publishWizard.idealPourDesencombrerEtDonner":
    "Ideal for decluttering and giving your things a second life",
  "publishing.publishWizard.prixNegociable": "Price negotiable",
  "publishing.publishWizard.permetAuxAcheteursDeFaire":
    "Lets buyers make offers",
  "publishing.publishWizard.quantiteEnStock": "Quantity in stock",
  "publishing.publishWizard.referenceInterneSkuFacultatif":
    "Internal reference / SKU (optional)",
  "publishing.publishWizard.autoriserLeContactDirectEt":
    "Allow direct contact and messaging",
  "publishing.publishWizard.autoriserLePaiementSecuriseDirect":
    "Allow direct secure payment",
  "publishing.publishWizard.brouillonAutoSauvegarde":
    "Draft saved automatically",
  "publishing.publishWizard.categorieActiveValidee": "Selected category:",
  "publishing.publishWizard.criteresDetailles": "Detailed criteria",
  "publishing.publishWizard.selectionnerUneOption": "Select an option…",
  "publishing.publishWizard.exempleDemo": "Demo example",
  "publishing.publishWizard.gestionDesStocksReferenceProfessionnelle":
    "Stock management & professional reference",
  "publishing.publishWizard.achatEnLigneDirectSans":
    "Direct online purchase (no reservation)",
  "publishing.publishWizard.reservationAvecAcompte": "Reservation with deposit",
  "publishing.publishWizard.livraisonEnColisMondialRelay":
    "Parcel delivery (Mondial Relay, Colissimo)",
  "publishing.publishWizard.transportDeMeublesGrosColis":
    "Furniture & bulky item transport (Cocolis)",
  "publishing.publishWizard.optionsAvancees": "Advanced options",
  "publishing.publishWizard.garantieSecuriteTransfrontaliere":
    "Cross-border guarantee & safety:",
  "publishing.publishWizard.categorie": "Category",
  "publishing.publishWizard.marchesDeDiffusion": "Publication markets",
  "publishing.publishWizard.modesDeTransaction": "Transaction methods",
  "savedsearches.savedSearchesPage.aucuneRechercheSauvegardee":
    "No saved searches",
  "savedsearches.savedSearchesPage.lancezUneRecherchePuisCliquez":
    "Run a search, then tap 'Save this search' to be alerted about new listings.",
  "search.searchPage.etat": "Condition",
  "search.resultsHeading": "Search results",
  "search.exploreMapView.recadrerSurLesAnnonces": "Recentre on the listings",
  "search.exploreMapView.changerLeStyleDeCarte": "Change map style",
  "search.exploreMapView.fermerLaPrevisualisation": "Close preview",
  "search.exploreMapView.cliquezPourCentrer": "Click to centre",
  "search.searchPage.masquerLePanneauDeFiltres": "Hide the filter panel",
  "search.searchPage.livraisonDisponible": "Delivery available",
  "search.searchPage.paiementSecuriseEnLigne": "Secure online payment",
  "search.searchPage.sauvegarderCetteRecherche": "Save this search",
  "search.searchPage.effacerTousLesFiltres": "Clear all filters",
  "search.searchPage.filtresDeRecherche": "Search filters",
  "search.searchPage.resultatsDeRecherche": "Search results",
  "search.searchPage.recherchePersonnalisee": "Custom search",
  "search.searchPage.categories": "Categories",
  "search.searchPage.sousCategories": "Subcategories",
  "search.searchPage.trierPar": "Sort by:",
  "search.searchPage.trierPar2": "Sort by",
  "sellerworkspace.accountOverviewPage.presentezVousBrievementAuxAutres":
    "Introduce yourself briefly to the rest of the community…",
  "sellerworkspace.accountOverviewPage.comptePro": "Pro account",
  "sellerworkspace.accountOverviewPage.verifie": "Verified",
  "sellerworkspace.accountOverviewPage.numeroDeTelephone": "Phone number",
  "sellerworkspace.accountOverviewPage.annoncesActives": "Active listings",
  "sellerworkspace.accountOverviewPage.annoncesSauvegardees": "Saved listings",
  "sellerworkspace.accountOverviewPage.recusJustificatifs":
    "Receipts & documents",
  "sellerworkspace.accountOverviewPage.telephone": "Phone",
  "sellerworkspace.myListingsPage.filtrerMesAnnoncesParStatut":
    "Filter my listings by status",
  "sellerworkspace.myListingsPage.gererLesPaysDePublication":
    "Manage publication countries",
  "sellerworkspace.myListingsPage.boosterLAnnonce": "Boost listing",
  "sellerworkspace.myListingsPage.supprimerLAnnonce": "Delete listing",
  "sellerworkspace.proDashboardPage.siretVerifie": "SIRET verified",
  "sellerworkspace.proDashboardPage.tauxDeConversion": "Conversion rate",
  "sellerworkspace.proDashboardPage.surLesFichesArticles": "On item pages",
  "sellerworkspace.proDashboardPage.volumeDeVentesEstime":
    "Estimated sales volume",
  "sellerworkspace.proDashboardPage.ceMoisCi": "This month",
  "sellerworkspace.proStorefrontEditorPage.numeroSiret14Chiffres":
    "SIRET number (14 digits)",
  "sellerworkspace.proStorefrontEditorPage.presentationDeLEntrepriseSavoir":
    "About the business & expertise",
  "sellerworkspace.proStorefrontEditorPage.telephoneCommercial":
    "Business phone",
  "sellerworkspace.proStorefrontEditorPage.voirMaVitrineEnDirect":
    "View my live storefront on the site",
  "sellerworkspace.billingHistoryModal.historiqueDeFacturationRecus":
    "Billing history & receipts",
  "sellerworkspace.billingHistoryModal.consultezEtTelechargezVosFactures":
    "View and download your invoices, subscriptions and visibility options",
  "sellerworkspace.billingHistoryModal.toutesLesFacturesShongreSas":
    "All Shongre SAS invoices include French VAT at the statutory 20%.",
  "sellerworkspace.bulkImportModal.importMassifDeCatalogueCsv":
    "Bulk catalogue import (CSV / Excel)",
  "sellerworkspace.bulkImportModal.importezSimultanementDesDizainesD":
    "Import dozens of professional listings at once, with prices, stock and photos",
  "sellerworkspace.bulkImportModal.deposezVotreFichierCsvIci":
    "Drop your CSV file here",
  "support.contactPage.votreNomComplet": "Your full name",
  "support.contactPage.votreAdresseEmail": "Your email address",
  "support.contactPage.objetDeLaDemande": "Subject",
  "support.contactPage.objetDeVotreDemande": "What is your request about?",
  "support.contactPage.detaillezVotreSituation": "Tell us more",
  "support.contactPage.decrivezVotreProblemeLesDemarches":
    "Describe the problem, what you have already tried, or your questions…",
  "support.contactPage.echangeDirectAvecLeVendeur":
    "Talk directly to the seller",
  "support.contactPage.3RedigezVotreMessage": "3. Write your message",
  "support.contactPage.jpgPngOuPdfMax": "JPG, PNG or PDF (max 10 MB)",
  "support.helpCenterPage.rechercherUneQuestionExSequestre":
    "Search a question (e.g. escrow, transfer, dispute…)",
  "support.helpCenterPage.rechercherUneQuestionDansL": "Search the help centre",
  "support.helpCenterPage.questionsFrequentes": "Frequently asked questions",
  "support.helpCenterPage.vousNAvezPasTrouve": "Didn't find your answer?",
  "support.supportRequestDetailPage.ecrivezVotreMessageOuVos":
    "Write your message or extra details here…",
  "support.supportRequestDetailPage.retourAMesDemandes": "Back to my requests",
  "support.supportRequestDetailPage.marquerCommeResolu": "Mark as resolved",
  "support.supportRequestDetailPage.simulerReponseConseillerDemo":
    "Simulate an agent reply (demo)",
  "support.supportContextCard.ouvrirLAnnonce": "Open listing",
  "support.supportContextCard.detacherLAnnonce": "Detach listing",
  "support.supportContextCard.voirLaCommande": "View order",
  "support.supportContextCard.detacherLaCommande": "Detach order",
  "transactions.directPurchaseCheckoutModal.nomPrenom": "Full name",
  "transactions.directPurchaseCheckoutModal.telephone": "Phone",
  "transactions.directPurchaseCheckoutModal.numeroDeCarte": "Card number",
  "transactions.directPurchaseCheckoutModal.quantite": "Quantity:",
  "transactions.directPurchaseCheckoutModal.1ChoisissezVotreModeDe":
    "1. Choose how you want to receive it",
  "transactions.directPurchaseCheckoutModal.adresseDeLivraison":
    "Delivery address",
  "transactions.directPurchaseCheckoutModal.protectionAcheteurSequestre":
    "Buyer protection & escrow",
  "transactions.directPurchaseCheckoutModal.totalARegler": "Total to pay",
  "transactions.directPurchaseCheckoutModal.2MoyenDePaiementSecurise":
    "2. Secure payment method",
  "transactions.directPurchaseCheckoutModal.connexionChiffreeSsl256Bits":
    "256-bit SSL encrypted connection, PCI-DSS compliant",
  "transactions.directPurchaseCheckoutModal.achatDirectConfirme":
    "Purchase confirmed",
  "transactions.directPurchaseCheckoutModal.codeSecretDeRemiseEn":
    "Secret handover code",
  "transactions.directPurchaseCheckoutModal.expeditionEnCours":
    "Dispatch in progress",
  "transactions.transactionsPage.enAttenteConfirmationVendeur":
    "Awaiting seller confirmation",
  "transactions.transactionsPage.colisExpedie": "Parcel dispatched",
  "transactions.transactionsPage.livreEnAttenteValidation":
    "Delivered — awaiting confirmation",
  "transactions.transactionsPage.finaliseePayee": "Completed & paid",
  "transactions.transactionsPage.annuleeRemboursee": "Cancelled & refunded",
  "transactions.transactionsPage.garantieSequestreShongre":
    "Shongre escrow guarantee:",
  "transactions.transactionsPage.paiementSousSequestre":
    "Payment held in escrow",
  "transactions.transactionsPage.validationVendeur": "Seller confirmation",
  "transactions.transactionsPage.fondsVerses": "Funds paid out",
  "transactions.disputeModal.signalerUnProblemeOuvrirUn":
    "Report a problem / open a dispute",
  "transactions.disputeModal.lesFondsSousSequestreResteront":
    "Funds held in escrow stay frozen until Shongre customer service resolves the case.",
  "transactions.disputeModal.expliquezCeQuiSEst":
    "Explain what happened (condition of the parcel, item not as described, exchanges with the other party…)",
  "transactions.disputeModal.protectionAcheteurVendeurActive":
    "Buyer & seller protection active",
  "transactions.disputeModal.ajouterDesPhotosOuJustificatifs":
    "Add photos or supporting documents",
  "transactions.disputeModal.jpgPngOuPdfMax": "JPG, PNG or PDF (max 10 MB)",
  "transactions.leaveReviewModal.partagezVotreExperienceAvecCet":
    "Share your experience with this user (speed, courtesy, item as described…)",
  "transactions.reservationCheckoutModal.remiseEnMainPropreSecurisee":
    "Secure handover in person, free",
  "transactions.reservationCheckoutModal.exEnCentreVilleSamedi":
    "e.g. in the town centre, Saturday afternoon",
  "transactions.reservationCheckoutModal.livraisonEnPointRelaisMondial":
    "Mondial Relay pickup point delivery, €4.90",
  "transactions.reservationCheckoutModal.livraisonADomicileColissimo6":
    "Colissimo home delivery, €6.90",
  "transactions.reservationCheckoutModal.nomEtPrenom": "First and last name",
  "transactions.reservationCheckoutModal.nEtNomDeRue":
    "House number and street",
  "transactions.reservationCheckoutModal.vendeur": "Seller:",
  "transactions.reservationCheckoutModal.choisissezVotreModeDObtention":
    "Choose how you want to get it:",
  "transactions.reservationCheckoutModal.remiseEnMainPropreSecurisee2":
    "Secure handover in person",
  "transactions.reservationCheckoutModal.votreNumeroDeTelephonePour":
    "Your phone number (to arrange the meeting):",
  "transactions.reservationCheckoutModal.disponibilitesOuLieuSouhaite":
    "Availability or preferred place:",
  "transactions.reservationCheckoutModal.livraisonEnPointRelaisMondial2":
    "Pickup point delivery (Mondial Relay)",
  "transactions.reservationCheckoutModal.pointRelaisSelectionne":
    "Selected pickup point:",
  "transactions.reservationCheckoutModal.tabacPresseDesHalles15":
    "Tabac Presse des Halles (15 rue République, 13001 Marseille)",
  "transactions.reservationCheckoutModal.epicerieBioDuVieuxPort":
    "Épicerie Bio du Vieux-Port (4 quai des Belges, 13001 Marseille)",
  "transactions.reservationCheckoutModal.livraisonADomicileColissimo":
    "Home delivery (Colissimo)",
  "transactions.reservationCheckoutModal.nomDuDestinataire": "Recipient name:",
  "transactions.reservationCheckoutModal.detailDesCoutsEtGaranties":
    "Cost and guarantee breakdown:",
  "transactions.reservationCheckoutModal.paiement100ProtegeSousSequestre":
    "Payment 100% protected in escrow",
  "transactions.reservationCheckoutModal.prixDeLArticle": "Item price:",
  "transactions.reservationCheckoutModal.totalARegler": "Total to pay:",
  "transactions.reservationCheckoutModal.choisissezVotreMoyenDePaiement":
    "Choose your payment method:",
  "transactions.reservationCheckoutModal.titulaireDeLaCarte": "Cardholder name",
  "transactions.reservationCheckoutModal.numeroDeCarte": "Card number",
  "transactions.reservationCheckoutModal.chiffrementSsl256BitsEt":
    "256-bit SSL encryption and 3D Secure 2.0 authentication.",
  "transactions.reservationCheckoutModal.votreCodeSecretDeConfirmation":
    "Your secret handover confirmation code",
  "transactions.reservationCheckoutModal.regleDeSecurite": "Safety rule:",
  "transactions.sellerPayoutModal.transfererMesGainsVersMon":
    "Transfer my earnings to my bank account",
  "transactions.sellerPayoutModal.selectionnezLeMontantEtLe":
    "Choose the amount and how quickly you want the transfer.",
  "transactions.sellerPayoutModal.virementStandardGratuit24A":
    "Standard transfer, free, 24 to 48 working hours",
  "transactions.sellerPayoutModal.virementInstantane090Credite":
    "Instant transfer, €0.90, credited in under 10 minutes",
  "transactions.sellerPayoutModal.montantDuVirement": "Transfer amount (€)",
  "transactions.sellerPayoutModal.typeDeVirement": "Transfer type",
  "transactions.sellerPayoutModal.delaiSepaClassique24A":
    "Standard SEPA timing (24 to 48 working hours)",
  "transactions.sellerPayoutModal.crediteEnMoinsDe10":
    "Credited to your IBAN in under 10 minutes",
  "transactions.sellerPayoutModal.montantPreleveDuSolde":
    "Amount taken from your balance:",
  "transactions.sellerPayoutModal.montantNetVerseSurVotre":
    "Net amount paid into your account:",
  "transactions.sellerPayoutModal.virementsExecutesViaMangopayEtablissement":
    "Transfers are executed via Mangopay, an electronic money institution authorised by the ACPR.",
  "transactions.transactionDetailModal.paiementGarantiParLeService":
    "Payment guaranteed by Shongre's secure escrow service",
  "transactions.transactionDetailModal.exSamedi22AoutA":
    "e.g. Saturday 22 August at 14:30",
  "transactions.transactionDetailModal.ex12RueDesRemparts":
    "e.g. 12 rue des Remparts, Bordeaux",
  "transactions.transactionDetailModal.refuserLaReservation":
    "Decline the reservation?",
  "transactions.transactionDetailModal.confirmerLaReceptionConforme":
    "Confirm the item arrived as described?",
  "transactions.transactionDetailModal.annulerVotreReservation":
    "Cancel your reservation?",
  "transactions.transactionDetailModal.actionRequiseAccepterOuRefuser":
    "Action needed: accept or decline the reservation",
  "transactions.transactionDetailModal.codeSecretDeConfirmation":
    "Secret confirmation code",
  "transactions.transactionDetailModal.uniquementApresAvoirVerifieLa":
    "only once you have checked the item is as described",
  "transactions.transactionDetailModal.avezVousBienRecuL":
    "Did you receive the item?",
  "transactions.transactionDetailModal.rendezVousDeRemiseConvenu":
    "Agreed handover meeting",
  "transactions.transactionDetailModal.datePrevue": "Scheduled date:",
  "transactions.transactionDetailModal.telephoneDeContact": "Contact phone:",
  "transactions.transactionDetailModal.dateEtHeure": "Date and time:",
  "transactions.transactionDetailModal.lieuDeRencontre": "Meeting place:",
  "transactions.transactionDetailModal.numeroDeTelephoneDirect":
    "Direct phone number:",
  "transactions.transactionDetailModal.recapitulatifFinancier":
    "Financial summary:",
  "transactions.transactionDetailModal.fraisDePort": "Shipping:",
  "transactions.transactionDetailModal.totalRegleParLAcheteur":
    "Total paid by the buyer:",
  "transactions.transactionDetailModal.montantNetVerseAuVendeur":
    "Net amount paid to the seller:",
  "transactions.transactionDetailModal.historiqueDuDossier": "Case history:",
  "transactions.transactionDetailModal.signalerUnProblemeLitige":
    "Report a problem / dispute",
  "verification.verificationCenterPage.checklistDesVerifications":
    "Verification checklist",
  "verification.verificationCenterPage.motifDuRejet": "Reason for rejection:",
  "verification.verificationCenterPage.capacitesPermissionsDuCompte":
    "Account capabilities & permissions",
  "verification.verificationCenterPage.journalDesEvenementsDeConformite":
    "Compliance event log",
  "verification.bankPayoutModal.exJeanDupontOuSarl":
    "e.g. Jean Dupont or Boutique Ltd",
  "verification.businessVerificationModal.14RueDeLArtisanat":
    "14 Craftsmen's Row",
  "verification.businessVerificationModal.entrepriseIdentifieeDansLeRepertoire":
    "Business found in the official SIRENE register.",
  "verification.businessVerificationModal.presidentDirecteurGeneralGerant":
    "President / CEO / Managing director",
  "verification.businessVerificationModal.mandataireExpressementHabiliteDelegationDe":
    "Expressly authorised representative (delegation of authority)",
  "verification.businessVerificationModal.documentObligatoireDelivreParLe":
    "Mandatory document issued by the Commercial Court registry",
  "verification.businessVerificationModal.pourAccelererLaValidationDes":
    "To speed up approval of escrow transfers",
  "verification.businessVerificationModal.modeDemonstrationShongre":
    "Shongre demo mode",
  "verification.identityVerificationModal.formatsAcceptesJpgPngPdf":
    "Accepted formats: JPG, PNG, PDF (max 8 MB)",
  "verification.identityVerificationModal.requisPourLaValidationOptique":
    "Required for optical validation",
  "verification.identityVerificationModal.modeDemonstrationShongre":
    "Shongre demo mode",
  "verification.trustBadge.identiteOfficielleVerifieeCniPasseport":
    "Official identity verified (ID card / passport)",
  "verification.trustBadge.entrepriseCertifieeAuRegistreDu":
    "Business certified in the Trade Register (RCS)",
  "verification.trustBadge.numeroDeTelephoneVerifiePar":
    "Phone number verified by SMS",
  "verification.trustBadge.compteBancaireSepaValidePour":
    "SEPA bank account approved for escrow",
  "verification.trustBadge.identiteVerifiee": "Identity verified",
  "verification.trustBadge.proCertifieRcs": "RCS certified pro",
  "verification.trustBadge.telephoneCertifie": "Phone verified",
  "verification.trustBadge.ibanVerifie": "IBAN verified",
  "verification.trustBadge.compte2fa": "2FA enabled",
  "verification.trustBadge.boutiqueProVerifiee": "Verified pro store",
  "verification.trustBadge.vendeurDeConfiance": "Trusted seller",
  "verification.trustBadge.membreVerifie": "Verified member",
  "verification.trustBadge.compteDebutant": "New account",
  "security.requirePermission.compteSuspendu": "Account suspended",
  "admin.adminAuditLogsPage.rechercherParActeurActionCible":
    "Search by actor, action, target, details…",
  "admin.adminAuditLogsPage.rechercherDansLeRegistreD": "Search the audit log",
  "admin.adminAuditLogsPage.filtrerLeJournalParType":
    "Filter the log by action type",
  "admin.adminAuditLogsPage.voirLePayloadComplet": "View full payload",
  "admin.adminAuditLogsPage.reinitialiserLeRegistreDAudit":
    "Reset the audit log?",
  "admin.adminAuditLogsPage.conformiteRgpdSecuritePlateforme":
    "GDPR compliance & platform security",
  "admin.adminAuditLogsPage.actionSysteme": "System action",
  "admin.adminAuditLogsPage.detailsMotif": "Details & reason",
  "admin.adminAuditLogsPage.detail": "Detail",
  "admin.adminAuditLogsPage.role": "Role:",
  "admin.adminAuditLogsPage.details": "Details:",
  "admin.adminAuditLogsPage.etatPrecedent": "Previous state:",
  "admin.adminAuditLogsPage.nouvelEtat": "New state:",
  "admin.adminLayout.retourALaPlaceDe": "Back to the marketplace",
  "admin.adminLayout.sectionsDeLaConsole": "Console sections",
  "admin.adminLayout.placeDeMarche": "Marketplace",
  "admin.adminLayout.statutDeSession": "Session status",
  "admin.adminLayout.sessionAuthentifieeRbac": "RBAC authenticated session",
  "admin.adminMarketsPage.supprimerLaSurchargeEtReactiver":
    "Remove the override and restore dynamic inheritance from France",
  "admin.adminMarketsPage.ajouterUnNouveauMarchePays":
    "Add a new market / country",
  "admin.adminMarketsPage.creezUnNouveauPaysQui":
    "Create a new country that automatically inherits 100% of the reference French configuration.",
  "admin.adminMarketsPage.exItPtDeUk": "e.g. IT, PT, DE, UK",
  "admin.adminMarketsPage.exItItPtPt": "e.g. it-IT, pt-PT, de-DE",
  "admin.adminMarketsPage.bientotDisponible": "Coming soon",
  "admin.adminMarketsPage.archive": "Archived",
  "admin.adminMarketsPage.franceFrEstLeMarche":
    "France (`FR`) is the canonical reference market",
  "admin.adminMarketsPage.ajouterUnMarche": "Add a market",
  "admin.adminMarketsPage.moteurDHeritageHierarchiqueEn":
    "Cascading hierarchical inheritance engine:",
  "admin.adminMarketsPage.marcheSourceCanonique100":
    "Canonical source market (100%)",
  "admin.adminMarketsPage.bientot": "Soon",
  "admin.adminMarketsPage.selectionnerUnMarche": "Select a market:",
  "admin.adminMarketsPage.gestionDesCategoriesParMarche":
    "Category management per market:",
  "admin.adminMarketsPage.parametreRegle": "Setting / rule",
  "admin.adminMarketsPage.statutDuMarche": "Market status",
  "admin.adminMarketsPage.surcharge": "✏️ Overridden",
  "admin.adminMarketsPage.tauxDeTvaStandard": "Standard VAT rate",
  "admin.adminMarketsPage.fraisProtectionAcheteur": "Buyer protection fee",
  "admin.adminMarketsPage.reservationAvecSequestre": "Reservation with escrow",
  "admin.adminMarketsPage.nomDuMarche": "Market name",
  "admin.adminMarketsPage.localeParDefaut": "Default locale",
  "admin.adminMarketsPage.bientotDisponibleVitrine": "Coming soon (showcase)",
  "admin.adminMarketsPage.actifOperationnel": "Active (operational)",
  "admin.adminMarketsPage.activeTrue": "Enabled (true)",
  "admin.adminMarketsPage.desactiveFalse": "Disabled (false)",
  "admin.adminMarketsPage.regleDePersistance": "Persistence rule:",
  "admin.adminModerationPage.supprimerCetteAnnonce": "Delete this listing",
  "admin.adminModerationPage.auditDeSecuriteIaGemini":
    "Gemini AI security audit",
  "admin.adminModerationPage.supprimerDefinitivementLAnnonce":
    "Permanently delete the listing?",
  "admin.adminModerationPage.suspendreLeCompteUtilisateur":
    "Suspend the user account",
  "admin.adminModerationPage.motifLegalEtContractuelDe":
    "Legal and contractual grounds for suspension",
  "admin.adminModerationPage.exSignalementsMultiplesPourNon":
    "e.g. multiple reports for non-compliance or attempted fraud…",
  "admin.adminModerationPage.controleDesContenusEtProfils":
    "Content and profile review",
  "admin.adminModerationPage.laFileDeSignalementsCommunautaires":
    "The community report queue is clear and up to date.",
  "admin.adminModerationPage.cliquezSurAuditIaPour":
    "Click “AI audit” to analyse the risks",
  "admin.adminModerationPage.annonce": "Listing",
  "admin.adminModerationPage.vendeur": "Seller",
  "admin.adminModerationPage.actionsDeModeration": "Moderation actions",
  "admin.adminModerationPage.analyseDeConformiteEtDetection":
    "Running compliance analysis and fraud detection…",
  "admin.adminModerationPage.scoreDeRisqueDetecte": "Detected risk score",
  "admin.adminModerationPage.syntheseDeLAgentIa": "AI agent summary:",
  "admin.adminModerationPage.elementsSignales": "Flagged items:",
  "admin.adminMonetizationPage.gestionDesFormulesDAbonnement":
    "Pro subscription plan management",
  "admin.adminMonetizationPage.personnalisationVitrineBanniereStory":
    "Storefront customisation (banner, story)",
  "admin.adminNewsletterPage.aucuneCampagneCreee": "No campaign created",
  "admin.adminNewsletterPage.creezUnePremiereCampagnePour":
    "Create a first campaign to send a selection of listings to newsletter subscribers.",
  "admin.adminNewsletterPage.creerUneCampagneNewsletter":
    "Create a newsletter campaign",
  "admin.adminNewsletterPage.redigezEtCiblezUneNouvelle":
    "Write and target a new edition of the Shongre selection.",
  "admin.adminNewsletterPage.nomInterneDeLaCampagne": "Internal campaign name",
  "admin.adminNewsletterPage.exSelectionVelosVintageSemaine":
    "e.g. Bikes & Vintage selection, week 34",
  "admin.adminNewsletterPage.objetDeLEmail": "Email subject",
  "admin.adminNewsletterPage.exLesMeilleuresAffairesVelo":
    "e.g. 🚲 The best bike deals of the week",
  "admin.adminNewsletterPage.texteDApercuPreheader": "Preview text (preheader)",
  "admin.adminNewsletterPage.exJusquA40Sur":
    "e.g. Up to 40% off verified gravel bikes.",
  "admin.adminNewsletterPage.audienceCiblee": "Target audience",
  "admin.adminNewsletterPage.audienceCibleeParLEnvoi":
    "Audience targeted by this send",
  "admin.adminNewsletterPage.thematique": "Theme",
  "admin.adminNewsletterPage.thematiqueCibleeParLEnvoi":
    "Theme targeted by this send",
  "admin.adminNewsletterPage.titreDAccrocheDansL": "Headline inside the email",
  "admin.adminNewsletterPage.texteDIntroductionEditorial":
    "Editorial introduction",
  "admin.adminNewsletterPage.quelquesPhrasesPourContextualiserLa":
    "A few sentences to set up the selection…",
  "admin.adminNewsletterPage.envoyee": "Sent",
  "admin.adminNewsletterPage.programmee": "Scheduled",
  "admin.adminNewsletterPage.prete": "Ready",
  "admin.adminNewsletterPage.historiqueDesCampagnes": "Campaign history",
  "admin.adminNewsletterPage.apercu": "Preview",
  "admin.adminOverviewPage.utilisateursEnregistres": "Registered users",
  "admin.adminOverviewPage.verificationsProEnAttente":
    "Pro verifications pending",
  "admin.adminOverviewPage.catalogueDAnnonces": "Listing catalogue",
  "admin.adminRolesMatrixPage.filtrerUnePermissionExListing":
    "Filter a permission (e.g. listing.create, user.suspend)…",
  "admin.adminRolesMatrixPage.filtrerLesPermissionsParCategorie":
    "Filter permissions by category",
  "admin.adminRolesMatrixPage.matriceDesPermissionsParRole":
    "Permission matrix by role",
  "admin.adminRolesMatrixPage.permissionSensibleOuIrreversible":
    "Sensitive or irreversible permission",
  "admin.adminRolesMatrixPage.controleDAccesBaseSur":
    "Role-based access control",
  "admin.adminRolesMatrixPage.votreIdentiteActive": "Your active identity:",
  "admin.adminRolesMatrixPage.toutesLesCategories": "All categories",
  "admin.adminRolesMatrixPage.annoncesCatalogues": "Listings & catalogues",
  "admin.adminRolesMatrixPage.moderationSignalements": "Moderation & reports",
  "admin.adminRolesMatrixPage.administrationSysteme": "System administration",
  "admin.adminRolesMatrixPage.securiteAudit": "Security & audit",
  "admin.adminRolesMatrixPage.marchesTerritoires": "Markets & territories",
  "admin.adminTaxonomyPage.taxonomieSynchronisee": "Taxonomy synchronised",
  "admin.adminUsersPage.rechercherUnNomEmailEntreprise":
    "Search a name, email, company, SIRET…",
  "admin.adminUsersPage.rechercherUnUtilisateur": "Search a user",
  "admin.adminUsersPage.filtrerParTypeDeCompte": "Filter by account type",
  "admin.adminUsersPage.filtrerParRolePlateforme": "Filter by platform role",
  "admin.adminUsersPage.seConnecterEnTantQue": "Sign in as this user",
  "admin.adminUsersPage.noteInterneDeVerificationDes":
    "Internal register verification note",
  "admin.adminUsersPage.suspendreUnCompteUtilisateur": "Suspend a user account",
  "admin.adminUsersPage.motifLegalDeLaMesure":
    "Legal grounds for the precautionary measure",
  "admin.adminUsersPage.exInfractionAuxReglesDe":
    "e.g. breach of safety rules or attempted fraud…",
  "admin.adminUsersPage.reactiverLeCompte": "Reactivate the account?",
  "admin.adminUsersPage.gestionDesComptesVerificationsKbis":
    "Account management & KBIS verifications",
  "admin.adminUsersPage.tousLesTypesDeCompte": "All account types",
  "admin.adminUsersPage.typeRole": "Type & role",
  "admin.adminUsersPage.statutVerification": "Status & verification",
  "admin.adminUsersPage.marcheVille": "Market / city",
  "admin.adminVerificationsPage.filesDAttenteDeVerification":
    "Verification queues",
  "admin.adminVerificationsPage.motifDuRefusDeVerification":
    "Reason for rejecting the verification",
  "admin.adminVerificationsPage.indiquezLaRaisonPreciseDu":
    "State the precise reason for refusal",
  "admin.adminVerificationsPage.exDocumentFlouDateDe":
    "e.g. blurred document, expired validity date, deregistered SIRET…",
  "admin.adminVerificationsPage.fileDeModerationKycKyb":
    "KYC / KYB moderation queue",
  "admin.adminVerificationsPage.dossiersDIdentiteEnFile":
    "Identity cases in the queue",
  "admin.adminVerificationsPage.piece": "Document:",
  "admin.adminVerificationsPage.comptesBancairesDeSequestreEnregistres":
    "Registered escrow bank accounts",
  "admin.adminVerificationsPage.journalDAuditInalterableDes":
    "Tamper-proof verification audit log",
  "admin.crmAiProspectingPage.decrivezLesProspectsQueVous":
    "Describe the prospects you are looking for (e.g. design furniture stores in Paris)…",
  "admin.crmAiProspectingPage.prospectionB2bAssisteeParIa":
    "AI-assisted B2B prospecting",
  "admin.crmAiProspectingPage.explorationDesRegistresDEntreprises":
    "Exploring company registers and extracting activity signals…",
  "admin.crmAiProspectingPage.compteShongreOuFicheCrm":
    "Existing Shongre account or CRM record detected",
  "admin.crmAiProspectingPage.importe": "Imported",
  "admin.crmUniversalSearch.label": "Universal CRM search",
  "admin.crmUniversalSearch.clear": "Clear CRM search",
  "admin.crmUniversalSearch.loading": "Searching…",
  "admin.crmUniversalSearch.results": "CRM results ({count})",
  "admin.crmUniversalSearch.noResults":
    "No contact, company, or opportunity matches this search.",
  "admin.crmUniversalSearch.resultsList": "CRM search results",
  "admin.crmCompaniesPage.rechercherUneEntrepriseDomaineSecteur":
    "Search a company, domain, sector…",
  "admin.crmCompaniesPage.filtrerLesEntreprisesParCycle":
    "Filter companies by lifecycle stage",
  "admin.crmCompaniesPage.ajouterUneEntreprise": "Add a company",
  "admin.crmCompaniesPage.enregistrezUneNouvelleEntrepriseOu":
    "Record a new company or Pro store in the CRM.",
  "admin.crmCompaniesPage.nomCommercialDeLEntreprise": "Company trading name",
  "admin.crmCompaniesPage.secteurDActivite": "Sector",
  "admin.crmCompaniesPage.exMobilierDecoration": "e.g. Furniture & Décor",
  "admin.crmCompaniesPage.villeRegion": "City / region",
  "admin.crmCompanyDetailPage.cetteEntrepriseNExistePlus":
    "This company is no longer in the CRM, or has been merged into another record.",
  "admin.crmCompanyDetailPage.cycleDeVieDeL": "Company lifecycle stage",
  "admin.crmCompanyDetailPage.toutesLesEntreprises": "All companies",
  "admin.crmCompanyDetailPage.changerDeStatut": "Change status:",
  "admin.crmCompanyDetailPage.syntheseCommercialeIa": "AI sales summary",
  "admin.crmCompanyDetailPage.opportunitesAssociees": "Linked opportunities",
  "admin.crmCompanyDetailPage.aucuneOpportuniteOuverte":
    "No open opportunities.",
  "admin.crmCompanyDetailPage.aucunContactRattache": "No linked contacts.",
  "admin.crmContactDetailPage.ceContactNExistePlus":
    "This contact is no longer in the CRM, or has been merged into another record.",
  "admin.crmContactDetailPage.cycleDeVieDuContact": "Contact lifecycle stage",
  "admin.crmContactDetailPage.planifierUneTache": "Schedule a task",
  "admin.crmContactDetailPage.titreDeLaTache": "Task title",
  "admin.crmContactDetailPage.exRappelerPourPlanifierLa":
    "e.g. Call back to schedule the demo",
  "admin.crmContactDetailPage.dateDEcheance": "Due date",
  "admin.crmContactDetailPage.tousLesContacts": "All contacts",
  "admin.crmContactDetailPage.changerDeStatut": "Change status:",
  "admin.crmContactDetailPage.comptePlateformeShongreRattache":
    "Linked Shongre platform account",
  "admin.crmContactDetailPage.voirLaVitrinePublique":
    "View the public storefront",
  "admin.crmContactDetailPage.typeDeCompte": "Account type",
  "admin.crmContactDetailPage.noteVendeur": "Seller rating",
  "admin.crmContactDetailPage.historiqueDesEchangesNotes":
    "Interaction history & notes",
  "admin.crmContactDetailPage.tachesAssociees": "Linked tasks",
  "admin.crmContactDetailPage.aucuneTachePlanifiee": "No tasks scheduled.",
  "admin.crmContactsPage.rechercherParNomEmailEntreprise":
    "Search by name, email, company…",
  "admin.crmContactsPage.filtrerLesContactsParCycle":
    "Filter contacts by lifecycle stage",
  "admin.crmContactsPage.aucunContactNeCorrespondAux":
    "No contact matches the filters",
  "admin.crmContactsPage.elargissezLaRechercheOuReinitialisez":
    "Broaden the search or reset the filters to see the whole portfolio.",
  "admin.crmContactsPage.creerUnContactCrm": "Create a CRM contact",
  "admin.crmContactsPage.ajoutezUnInterlocuteurOuProspect":
    "Add a contact or prospect to the sales database.",
  "admin.crmContactsPage.prenom": "First name",
  "admin.crmContactsPage.telephone": "Phone",
  "admin.crmContactsPage.exGerant": "e.g. Manager",
  "admin.crmContactsPage.exMaisonDecoParis": "e.g. Maison Déco Paris",
  "admin.crmOverviewPage.voirLePipeline": "View pipeline",
  "admin.crmOverviewPage.opportunites": "Opportunities",
  "admin.crmOverviewPage.valeurDuPipeline": "Pipeline value",
  "admin.crmOverviewPage.tachesATraiter": "Tasks to handle",
  "admin.crmOverviewPage.prospectionAssisteeParIa": "AI-assisted prospecting",
  "admin.crmOverviewPage.tachesAFaire": "Tasks to do",
  "admin.crmPipelinePage.etapePrecedente": "Previous stage",
  "admin.crmPipelinePage.etapeSuivante": "Next stage",
  "admin.crmPipelinePage.creerUneOpportuniteCommerciale":
    "Create a sales opportunity",
  "admin.crmPipelinePage.ajoutezUnDealAuPipeline":
    "Add a deal to the sales pipeline.",
  "admin.crmPipelinePage.titreDeLOpportunite": "Opportunity title",
  "admin.crmPipelinePage.exAdhesionForfaitProBusiness":
    "e.g. Pro Business plan signup",
  "admin.crmPipelinePage.entrepriseConcernee": "Company",
  "admin.crmPipelinePage.typeDOpportunite": "Opportunity type",
  "admin.crmPipelinePage.valeurEstimee": "Estimated value (€)",
  "admin.crmPipelinePage.nouvelleOpportunite": "New opportunity",
  "admin.crmTasksPage.aucuneTacheDansCetteVue": "No tasks in this view",
  "admin.crmTasksPage.lesRelancesPlanifieesApparaitrontIci":
    "Scheduled follow-ups appear here. Change the filter to see other due dates.",
  "admin.crmTasksPage.creerUneTache": "Create a task",
  "admin.crmTasksPage.ajoutezUnRappelOuUne":
    "Add a reminder or a sales action.",
  "admin.crmTasksPage.titreDeLaTache": "Task title",
  "admin.crmTasksPage.exRelancerMarcPourSignature":
    "e.g. Follow up with Marc for signature",
  "admin.crmTasksPage.compteOuContactAssocie": "Linked account or contact",
  "admin.crmTasksPage.dateDEcheance": "Due date",
  "admin.crmTasksPage.priorite": "Priority",
  "admin.crmTasksPage.prioriteDeLaTache": "Task priority",
  "admin.crmTasksPage.nouvelleTache": "New task",
  "admin.activityTimeline.ajouterUneNoteCommercialeCompte":
    "Add a sales note, call report or remark…",
  "admin.duplicateConflictModal.entrepriseExistanteDetectee":
    "Existing company detected",
  "admin.duplicateConflictModal.uneCorrespondanceAEteTrouvee":
    "A match was found with an account already registered on Shongre.",
  "admin.duplicateConflictModal.doublonPotentielIdentifie":
    "Potential duplicate identified",
  "admin.enrichmentDiffModal.examinezEtSelectionnezLesInformations":
    "Review and select the suggested public information before updating.",
  "admin.enrichmentDiffModal.secteurDActivite": "Sector",
  "admin.enrichmentDiffModal.syntheseCommercialeIa": "AI sales summary",
  "admin.enrichmentDiffModal.100ValideHumain": "100% human-approved",
  "admin.evidenceDrawer.fitShongreEstime": "Estimated Shongre fit",
  "admin.evidenceDrawer.consulterLaSource": "View the source",
  "admin.adminProviderDetailPage.cetIdentifiantDePrestataireN":
    "This provider identifier is not listed in the canonical Shongre registry. It may have been removed or renamed.",
  "admin.adminProviderDetailPage.retourAuCatalogueDesFournisseurs":
    "Back to the provider catalogue",
  "admin.adminProviderDetailPage.capacitesFournies": "Capabilities provided:",
  "admin.adminProviderDetailPage.configurationCles": "Configuration & keys",
  "admin.adminProviderDetailPage.marchesSurcharges": "Markets & overrides",
  "admin.adminProviderDetailPage.santeTestsDemo": "Health & demo tests",
  "admin.adminProviderDetailPage.utilisationDependances":
    "Usage & dependencies",
  "admin.adminProvidersPage.matriceMultiMarches": "Multi-market matrix",
  "admin.adminProvidersPage.capacitesTestees": "Capabilities tested:",
  "admin.providerCatalogTable.rechercherParNomCapaciteEx":
    "Search by name, capability (e.g. payment.card), code…",
  "admin.providerCatalogTable.operationnel": "Operational",
  "admin.providerCatalogTable.degrade": "Degraded",
  "admin.providerCatalogTable.toutesLesCategories": "All categories",
  "admin.providerCatalogTable.tousLesStatuts": "All statuses",
  "admin.providerCatalogTable.desactive": "Disabled",
  "admin.providerCatalogTable.toutesLesSantes": "All health states",
  "admin.providerCatalogTable.capacitesPrisesEnCharge":
    "Supported capabilities",
  "admin.providerCatalogTable.statutSante": "Status & health",
  "admin.providerCatalogTable.marchesSupportes": "Supported markets",
  "admin.providerConfigurationForm.etatDActivation": "Activation state",
  "admin.providerConfigurationForm.sandboxEnvironnementDeTestPartenaire":
    "Sandbox (partner test environment)",
  "admin.providerConfigurationForm.productionServeurSecurise":
    "Production (secure server)",
  "admin.providerConfigurationForm.prioriteDeRoutage": "Routing priority",
  "admin.providerConfigurationForm.securiteCertifiee": "Certified security",
  "admin.providerConfigurationForm.aucunParametreRequisPourCette":
    "No settings required for this integration.",
  "admin.providerConfigurationForm.statutDesIdentifiants": "Credential status:",
  "admin.providerConfigurationForm.cleConfigureeEtValidee":
    "✓ Key configured and validated",
  "admin.providerConfigurationForm.nonConfiguree": "⚠ Not configured",
  "admin.providerConfigurationForm.cleRevoqueeOuInvalide":
    "✗ Key revoked or invalid",
  "admin.providerConfigurationForm.cleExpiree": "⌛ Key expired",
  "admin.providerHealthSimulator.operationnelHealthy": "Operational (healthy)",
  "admin.providerHealthSimulator.toutesLesRequetesAboutissent":
    "All requests succeed",
  "admin.providerHealthSimulator.degradeDegraded": "Degraded",
  "admin.providerHealthSimulator.ralentissementsOuEchecsPartiels":
    "Slowdowns or partial failures",
  "admin.providerHealthSimulator.basculeImmediateSurLeSecours":
    "Immediate failover to the backup",
  "admin.providerHealthSimulator.succesNominalReponseValideHttps":
    "✓ Nominal success (valid HTTPS 200 response)",
  "admin.providerHealthSimulator.identifiantsOuCleSecreteNon":
    "⚠ Credentials or secret key not configured",
  "admin.providerHealthSimulator.depassementDeDelaiTimeoutHttp":
    "⌛ Timed out (HTTP 504)",
  "admin.providerHealthSimulator.parametresRejetesParLePartenaire":
    "✗ Parameters rejected by the partner (400)",
  "admin.providerMarketMatrix.legende": "Key:",
  "admin.providerMarketMatrix.referenceFranceActive": "France reference active",
  "admin.providerMarketMatrix.heriteDeFrance": "Inherited from France",
  "admin.providerMarketMatrix.personnaliseSurcharge": "Customised (overridden)",
  "admin.providerMarketMatrix.desactiveIndisponible": "Disabled / unavailable",
  "admin.providerMarketMatrix.fonctionnaliteCapacite": "Feature / capability",
  "admin.providerMarketOverridesTab.exTransporteurDedieZoneFrontaliere":
    "e.g. dedicated carrier, border zone…",
  "admin.providerMarketOverridesTab.prioriteDeRoutage": "Routing priority:",
  "admin.providerMarketOverridesTab.activeDansCePays":
    "Enabled in this country",
  "admin.providerMarketOverridesTab.prioriteLocale": "Local priority",
  "admin.providerMarketOverridesTab.aucuneSurchargeDefinie":
    "No override defined.",
  "admin.providerOverviewDashboard.aucuneModificationRecenteEnregistree":
    "No recent changes recorded.",
  "admin.providerRoutingManager.operationnel": "Operational",
  "admin.providerRoutingManager.pretPourBascule": "Ready for failover",
  "admin.providerRoutingManager.marcheCible": "Target market:",
  "admin.providerRoutingManager.franceReference": "🇫🇷 France (reference)",
  "admin.providerRoutingManager.aucunSecoursDefini": "No backup defined",
  "admin.taxonomyAttributeRegistryTab.rechercherParLibelleIdOu":
    "Search by label, ID or attribute code…",
  "admin.taxonomyAttributeRegistryTab.rechercherUnAttribut":
    "Search an attribute",
  "admin.taxonomyAttributeRegistryTab.registreCentralDesAttributsCanoniques":
    "Central registry of canonical attributes",
  "admin.taxonomyAttributeRegistryTab.tousLesTypesDeDonnees": "All data types",
  "admin.taxonomyAttributeRegistryTab.nombreNumerique": "Number (numeric)",
  "admin.taxonomyAttributeRegistryTab.menuDeroulantSelect": "Dropdown (select)",
  "admin.taxonomyAttributeRegistryTab.booleenOuiNon": "Boolean (yes/no)",
  "admin.taxonomyAttributeRegistryTab.anneeMillesime": "Year",
  "admin.taxonomyAuditTab.filtrerLesLogsDAudit": "Filter the audit logs…",
  "admin.taxonomyAuditTab.journalDAuditTracabiliteDes":
    "Audit log & operation traceability",
  "admin.taxonomyAuditTab.operateur": "Operator",
  "admin.taxonomyAuditTab.details": "Details",
  "admin.taxonomyDraftPublishTab.publierLesModificationsDeTaxonomie":
    "Publish the taxonomy changes?",
  "admin.taxonomyDraftPublishTab.annulerToutesLesModificationsEn":
    "Discard all pending changes?",
  "admin.taxonomyDraftPublishTab.detailDesChangementsEtages":
    "Staged change details",
  "admin.taxonomyDraftPublishTab.historiqueDesVersionsPubliees":
    "Published version history",
  "admin.taxonomyDraftPublishTab.publiePar": "Published by",
  "admin.taxonomyHierarchyTree.monterDUnRang": "Move up one place",
  "admin.taxonomyHierarchyTree.descendreDUnRang": "Move down one place",
  "admin.taxonomyHierarchyTree.ajouterUneSousRubrique": "Add a subcategory",
  "admin.taxonomyHierarchyTree.aucuneRubriqueNeCorrespondA":
    "No category matches your filters.",
  "admin.taxonomyImportExportTab.contenuJsonDeTaxonomie":
    "Taxonomy JSON content",
  "admin.taxonomyImportExportTab.reinitialiserLaTaxonomieDOrigine":
    "Reset to the original taxonomy?",
  "admin.taxonomyImportExportTab.exporterLaTaxonomieCanoniqueJson":
    "Export the canonical taxonomy (JSON)",
  "admin.taxonomyImportExportTab.importerUneArborescenceExterne":
    "Import an external tree",
  "admin.taxonomyNodeEditor.nomCompletDeLaCategorie":
    "Full category name (French)",
  "admin.taxonomyNodeEditor.exVoituresMaterielPro": "e.g. Cars, Pro equipment…",
  "admin.taxonomyNodeEditor.schemaDEtat": "Condition schema",
  "admin.taxonomyNodeEditor.descriptionCanoniqueEtEditorialeDe":
    "Canonical and editorial description of the category…",
  "admin.taxonomyNodeEditor.couleurDAccentuationDeLa": "Category accent colour",
  "admin.taxonomyNodeEditor.ajouterUnSynonymeExSmartphone":
    "Add a synonym (e.g. smartphone, mobile, handset…)",
  "admin.taxonomyNodeEditor.ajouterUnSynonyme": "Add a synonym",
  "admin.taxonomyNodeEditor.retirerCetElement": "Remove this item",
  "admin.taxonomyNodeEditor.statutOperationnel": "Operational status",
  "admin.taxonomyNodeEditor.modeleDeTitreSeoMeta":
    "SEO title template (meta title)",
  "admin.taxonomyNodeEditor.modeleDeMetaDescription":
    "Meta description template",
  "admin.taxonomyNodeEditor.selectionnezUneCategorieDansL":
    "Select a category in the tree to edit it.",
  "admin.taxonomyNodeEditor.deprecie": "Deprecated",
  "admin.taxonomyNodeEditor.renduStandardPageAnnonceH1":
    "Standard rendering (listing page, H1, SEO):",
  "admin.taxonomyNodeEditor.produitStandardNeufTresBon":
    "Standard product (new, very good condition…)",
  "admin.taxonomyNodeEditor.vehicule0KmExcellentControle":
    "Vehicle (0 km, excellent, roadworthiness test…)",
  "admin.taxonomyNodeEditor.immobilierNeufVefaRenoveA":
    "Property (new build, renovated, needs work…)",
  "admin.taxonomyNodeEditor.professionnelNeufGarantiReconditionne":
    "Professional (new with warranty, refurbished…)",
  "admin.taxonomyNodeEditor.serviceADomicileEnAtelier":
    "Service (at home, in workshop, remote…)",
  "admin.taxonomyNodeEditor.actifEnLigneEtIndexable":
    "Active (live and indexable)",
  "admin.taxonomyNodeEditor.brouillonInvisibleAuxUtilisateurs":
    "Draft (hidden from users)",
  "admin.taxonomyNodeEditor.desactive": "Disabled",
  "admin.taxonomyNodeEditor.deprecieArchivageProgressif":
    "Deprecated (phased archiving)",
  "admin.taxonomyNodeEditor.nUdPubliableSelectionnableComme":
    "Publishable node (selectable as a listing's final category)",
  "admin.taxonomyNodeEditor.deprecier": "Deprecate",
  "admin.taxonomyNodeEditor.choisirDansLeRegistre":
    "-- Choose from the registry --",
  "admin.taxonomyNodeEditor.schemaDePublicationResoluEffectif":
    "Resolved publication schema (effective for the seller)",
  "admin.taxonomyNodeEditor.primaryCta": "Primary action",
  "admin.taxonomyNodeEditor.moderationReviewMode": "Moderation level",
  "admin.taxonomyNodeEditor.standardDurationDays": "Standard duration (days)",
  "admin.taxonomyNodeEditor.standardMediaAllowance": "Included photos",
  "admin.taxonomyNodeEditor.savePublicationConfiguration":
    "Save configuration",
  "admin.taxonomyNodeEditor.cta.contactSeller": "Contact seller",
  "admin.taxonomyNodeEditor.cta.apply": "Apply",
  "admin.taxonomyNodeEditor.cta.requestQuote": "Request a quote",
  "admin.taxonomyNodeEditor.cta.requestVisit": "Request a viewing",
  "admin.taxonomyNodeEditor.cta.requestTestDrive": "Request a test drive",
  "admin.taxonomyNodeEditor.cta.requestLesson": "Request a lesson",
  "admin.taxonomyNodeEditor.cta.checkAvailability": "Check availability",
  "admin.taxonomyNodeEditor.cta.proposeExchange": "Propose an exchange",
  "admin.taxonomyNodeEditor.review.standard": "Standard",
  "admin.taxonomyNodeEditor.review.enhanced": "Enhanced",
  "admin.taxonomyNodeEditor.review.manual": "Manual review",
  "admin.taxonomyNodeEditor.optionsDEtat": "Condition options:",
  "admin.taxonomyNodeEditor.venteAutorisee": "Selling allowed:",
  "admin.taxonomyNodeEditor.sequestreCbActif": "Card escrow active:",
  "admin.taxonomyNodeEditor.frontiereDArchitecture": "Architecture boundary:",
  "admin.taxonomyNodeEditor.eligibiliteIntrinseque": "intrinsic eligibility",
  "admin.taxonomyNodeEditor.gestionnaireDePrestataires": "Provider manager",
  "admin.taxonomyNodeEditor.paiementSecuriseEnLigneSequestre":
    "Secure online payment (Shongre escrow)",
  "admin.taxonomyNodeEditor.reservationAvecAcompteDeSequestre":
    "Reservation with escrow deposit",
  "admin.taxonomyNodeEditor.donGratuitAutorise": "Free giveaway allowed",
  "admin.taxonomyNodeEditor.trocEchangeAutorise": "Swap / exchange allowed",
  "admin.taxonomyNodeEditor.locationAutorisee": "Renting allowed",
  "admin.taxonomyNodeEditor.architectureMultiMarchesHeritageFrance":
    "Multi-market architecture & inheritance from France:",
  "admin.taxonomyNodeEditor.autoriserLIndexationParLes":
    "Allow search engine indexing (robots: index, follow)",
  "admin.taxonomyNodeEditor.vendeurParticulier": "Private seller",
  "admin.taxonomyNodeEditor.vendeurProfessionnel": "Professional seller",
  "admin.taxonomyNodeEditor.marche": "Market:",
  "admin.taxonomyNodeEditor.simulationDuFormulaireDePublication":
    "Simulation of the real publication form",
  "admin.taxonomyNodeEditor.annoncesActivesAssociees":
    "Linked active listings:",
  "admin.taxonomyNodeEditor.sousCategoriesDependantes":
    "Dependent subcategories:",
  "admin.taxonomyNodeEditor.surchargesMarchesActives":
    "Active market overrides:",
  "admin.taxonomyNodeEditor.politiqueDIntegriteCanonique":
    "Canonical integrity policy:",
  "admin.taxonomyTreeToolbar.rechercherParLibelleNomCourt":
    "Search by label, short name, alias, ID, slug…",
  "admin.taxonomyTreeToolbar.rechercherDansLArborescence": "Search the tree",
  "admin.taxonomyTreeToolbar.filtrerParNiveauDeTaxonomie":
    "Filter by taxonomy level",
  "admin.taxonomyTreeToolbar.filtrerParStatutDeN": "Filter by node status",
  "admin.taxonomyTreeToolbar.tousLesNiveaux": "All levels",
  "admin.taxonomyTreeToolbar.categoriesRacinesUnivers":
    "Root categories (universes)",
  "admin.taxonomyTreeToolbar.sousCategories": "Subcategories",
  "admin.taxonomyTreeToolbar.tousLesStatuts": "All statuses",
  "admin.taxonomyTreeToolbar.depreciesUniquement": "Deprecated only",
  "admin.taxonomyValidationTab.moteurDAuditValidationD":
    "Audit engine & integrity validation",
  "admin.taxonomyValidationTab.etatGlobal": "Overall state",
  "admin.taxonomyValidationTab.aucuneAnomalieDetecteeDansCe":
    "No anomaly detected in this filter.",
  "admin.taxonomyValidationTab.laTaxonomieRespecteToutesLes":
    "The taxonomy satisfies every structural consistency rule.",
  "admin.addNodeModal.cetteOperationAjouteUnNouveau":
    "This adds a new node to the canonical registry, in draft state.",
  "admin.addNodeModal.nomCompletCanoniqueFrancais":
    "Full canonical name (French)",
  "admin.addNodeModal.exEquipementsDeProtectionIndividuelle":
    "e.g. Personal protective equipment",
  "admin.addNodeModal.exEquipementsPro": "e.g. Pro equipment",
  "admin.addNodeModal.descriptionInterneOuSeoPour":
    "Internal or SEO description for this category…",
  "admin.addNodeModal.schemaDEtat": "Condition schema",
  "admin.addNodeModal.apercuDuRenduUi": "UI rendering preview:",
  "admin.addNodeModal.renduStandardDetailleSeo":
    "Standard rendering (detailed / SEO):",
  "admin.addNodeModal.vehicule": "Vehicle",
  "admin.addNodeModal.nUdPubliableAutoriseLa":
    "Publishable node (allows listings to be created directly)",
  "admin.attributeEditModal.lesAttributsCanoniquesSontDefinis":
    "Canonical attributes are defined centrally and reused across categories.",
  "admin.attributeEditModal.libelleDeLAttributFrancais":
    "Attribute label (French)",
  "admin.attributeEditModal.exCapaciteDeStockage": "e.g. Storage capacity",
  "admin.attributeEditModal.typeDeDonnee": "Data type",
  "admin.attributeEditModal.uniteDeMesureOptionnelle":
    "Unit of measurement (optional)",
  "admin.attributeEditModal.groupeDePublication": "Publication group",
  "admin.attributeEditModal.texteDAideOuPlaceholder":
    "Help text or placeholder (seller)",
  "admin.attributeEditModal.exIndiquezLaCapaciteReelle":
    "e.g. Give the actual battery capacity in kWh",
  "admin.attributeEditModal.libelleAfficheFrancais": "Displayed label (French)",
  "admin.attributeEditModal.retirerCetteOption": "Remove this option",
  "admin.attributeEditModal.nombreNumerique": "Number (numeric)",
  "admin.attributeEditModal.menuDeroulantSelectUnique":
    "Dropdown (single select)",
  "admin.attributeEditModal.booleenOuiNon": "Boolean (yes / no)",
  "admin.attributeEditModal.anneeMillesime": "Year",
  "admin.attributeEditModal.general": "General",
  "admin.attributeEditModal.specificationsTechniques":
    "Technical specifications",
  "admin.attributeEditModal.mentionsLegalesNormes": "Legal notices & standards",
  "admin.deleteNodeModal.laSuppressionPermanenteEstStrictement":
    "Permanent deletion is strictly protected to preserve the marketplace's integrity.",
  "admin.deleteNodeModal.suppressionBloqueeParLesRegles":
    "Deletion blocked by the safety rules:",
  "admin.deleteNodeModal.deprecier": "deprecate",
  "admin.deleteNodeModal.ceNUdEstEligible":
    "This node is eligible for deletion:",
  "admin.deprecateNodeModal.laDepreciationRetireCetteRubrique":
    "Deprecating removes this category from new listings while preserving existing ones.",
  "admin.deprecateNodeModal.categorieDeRemplacementSuccesseurLogique":
    "Replacement category / logical successor (optional)",
  "admin.deprecateNodeModal.garantiesDeRetrocompatibilite":
    "Backwards-compatibility guarantees:",
  "admin.deprecateNodeModal.lesAnnoncesExistantesPublieesSous":
    "Existing listings published under this category remain fully viewable.",
  "admin.deprecateNodeModal.leWizardDePublicationNe":
    "The publication wizard will stop offering this category to sellers.",
  "admin.deprecateNodeModal.siUnSuccesseurEstDefini":
    "If a successor is set, search redirects will apply cleanly.",
  "admin.deprecateNodeModal.aucunSuccesseurDirectDepreciationSimple":
    "-- No direct successor (simple deprecation) --",
  "admin.iconPickerModal.selectionnerUneIconeCanonique":
    "Select a canonical icon",
  "admin.iconPickerModal.choisissezParmiLeRegistreDes":
    "Choose from Shongre's registry of standardised vector icons.",
  "admin.iconPickerModal.rechercherUneIconeExCar":
    "Search an icon (e.g. Car, Home, Phone…)",
  "admin.moveNodeModal.reorganisezLaHierarchieEnDeplacant":
    "Reorganise the hierarchy by moving this node and all of its subcategories.",
  "admin.moveNodeModal.choisirLeNouveauParentDe":
    "Choose the new destination parent",
  "admin.moveNodeModal.impactStructurelDuDeplacement":
    "Structural impact of the move:",
  "admin.moveNodeModal.racinePrincipaleNiveauCategorieRacine":
    "📂 Main root (root category level)",
  "admin.taxonomyNodeEditor.exempleTitreSeo":
    "e.g. Second-hand {category} classifieds - Shongre",
  "admin.taxonomyNodeEditor.exempleDescriptionSeo":
    "e.g. Buy and sell your {category} items safely with Shongre escrow payment...",

  // --- migrated surfaces ---
  "shell.demoRoleSwitcher.modeDemo": "Demo mode",
  "shell.demoRoleSwitcher.testerLes6ProfilsEt":
    "Try the 6 profiles and journeys without a password:",
  "shell.demoRoleSwitcher.changerDeRolePourTester":
    "Switch user profile to test",
  "shell.demoRoleSwitcher.sessionUpdated": "Demo session updated",
  "shell.demoRoleSwitcher.sessionUnchanged": "Session unchanged",
  "shell.demoRoleSwitcher.guestActivated":
    "You are now browsing as a signed-out visitor.",
  "shell.demoRoleSwitcher.personaActivated":
    "The {profile} profile is now active with its own data and permissions.",
  "shell.demoRoleSwitcher.switchFailed":
    "Unable to switch profile. Please try again.",
  "shell.demoRoleSwitcher.accesDirectAuxProfilsPublics":
    "Direct access to public profiles",
  "shell.demoRoleSwitcher.0AnnonceParticulier": "📦 0 listings (private)",
  "shell.demoRoleSwitcher.0AnnoncePro": "📦 0 listings (pro)",
  "shell.demoRoleSwitcher.profilSuspenduSecurite":
    "🚫 Suspended profile (security)",
  "shell.header.tableauDeBordCompte": "Account dashboard",
  "shell.header.deconnexion": "Sign out",
  "shell.header.connectezVousPourGererVos":
    "Sign in to manage your listings and messages",
  "shell.header.explorerSurLaCarte": "Explore on the map",
  "shell.header.bonsPlansPrixReduits": "Deals & reduced prices",
  "shell.header.tableauDeBord": "Dashboard",
  "shell.header.mesAnnonces": "My listings",
  "shell.locationPickerModal.appliquerLaZone": "Apply area",
  "shell.preferencesModal.validerLesPreferences": "Save preferences",
  "ui.categoryFilterRail.sousCategories": "Subcategories:",
  "ui.dropdownMenu.selectionne": "selected",
  "ui.dropdownMenu.aucunResultatTrouve": "No results found",
  "ui.globalSearchBar.toutesLesCategories2": "All categories",
  "ui.listingCard.livraisonCourt": "Delivery",
  "ui.priceRangeSlider.reinitialiser": "Reset",
  "ui.searchAutocomplete.entree": "Enter ↵",
  "ui.searchAutocomplete.effacerTout": "Clear all",
  "ui.statePanel.detailsTechniques": "Technical details",
  "ui.uIComponents.negociable": "Negotiable",
  "admin.adminAuditLogsPage.tracabiliteConformite": "Traceability & compliance",
  "admin.adminAuditLogsPage.registreDAuditSecurite": "Security audit log",
  "admin.adminAuditLogsPage.enregistrementImmuableDesModificationsDe":
    "Immutable record of permission changes, suspensions, moderation and privileged operations.",
  "admin.adminAuditLogsPage.reinitialiser": "Reset",
  "admin.adminAuditLogsPage.aucunEvenementDAuditEnregistre":
    "No matching audit event recorded.",
  "admin.adminMarketsPage.valeurCanoniqueFranceDefaut":
    "⭐ Canonical France value (default)",
  "admin.adminMarketsPage.heriteDeFrance": "🔄 Inherited from France 🇫🇷",
  "admin.adminMarketsPage.identiqueAFrance": "(Same as France)",
  "admin.adminMarketsPage.reinitialiserSurFrance": "Reset to France",
  "admin.adminMarketsPage.gestionMultiMarchesTerritoires":
    "Multi-market & territory management",
  "admin.adminMarketsPage.gerezLesPaysActivesDevises":
    "Manage enabled countries, currencies, gateways, taxes, quotas and compliance rules.",
  "admin.adminMarketsPage.chaqueParametreNonExplicitementConfigure":
    "Any setting not explicitly configured for Belgium, Spain or Switzerland inherits automatically and dynamically from the French reference configuration. Resetting a setting removes its local override and immediately restores the dynamic link to France.",
  "admin.adminMarketsPage.referenceCanonique": "Canonical reference",
  "admin.adminMarketsPage.toutReinitialiserSurFrance":
    "Reset everything to France",
  "admin.adminMarketsPage.vousEditezActuellementLa":
    "You are currently editing the",
  "admin.adminMarketsPage.creerAvecHeritageFrance":
    "Create with French inheritance",
  "admin.adminMarketsPage.cetteValeurSeraEnregistreeEn":
    "This value will be saved as an override specific to this market. You can return to the dynamic French value at any time by clicking “Reset”.",
  "admin.adminMarketsPage.enregistrerLaSurcharge": "Save the override",
  "admin.adminModerationPage.moderationSecurite": "Moderation & security",
  "admin.adminModerationPage.fileDeModerationSignalements":
    "Moderation & report queue",
  "admin.adminModerationPage.surveillanceEnTempsReelDes":
    "Real-time monitoring of user reports, Gemini AI-assisted fraud audits and restricted account control.",
  "admin.adminModerationPage.classerSansSuite": "Dismiss",
  "admin.adminModerationPage.suspendreLeProfil": "Suspend the profile",
  "admin.adminModerationPage.leverLaSuspension": "Lift the suspension",
  "admin.adminModerationPage.masquerLAnnonce": "Hide the listing",
  "admin.adminMonetizationPage.revenusMonetisation": "Revenue & monetisation",
  "admin.adminMonetizationPage.formulesProQuotasOptionsDe":
    "Pro plans, quotas & promotion options",
  "admin.adminMonetizationPage.configurezLesQuotasDAnnonces":
    "Configure active listing quotas, commissions and access rights to exclusive features for professional sellers.",
  "admin.adminMonetizationPage.quotaMaxDAnnoncesActives":
    "Max active listing quota",
  "admin.adminMonetizationPage.commissionSurVente": "Sales commission (%)",
  "admin.adminMonetizationPage.mettreAJour": "Update",
  "admin.adminNewsletterPage.editionDesSelectionsHebdomadairesCiblage":
    "Editing weekly selections, audience targeting and send simulation.",
  "admin.adminNewsletterPage.abonnesActifsFr": "Active subscribers (FR)",
  "admin.adminNewsletterPage.84CeMoisCi": "+8.4% this month",
  "admin.adminNewsletterPage.tauxDOuvertureEstime": "Estimated open rate",
  "admin.adminNewsletterPage.moyenneSurLes5Dernieres":
    "Average over the last 5 editions",
  "admin.adminNewsletterPage.campagnesDiffusees": "Campaigns sent",
  "admin.adminNewsletterPage.editionsHebdomadairesEtFlash":
    "Weekly and flash editions",
  "admin.adminOverviewPage.vousOperezAvecLeRole":
    "You are operating with the role",
  "admin.adminOverviewPage.verifierMesPermissions": "Check my permissions",
  "admin.adminOverviewPage.conformiteEtSecurite": "Compliance and security",
  "admin.adminOverviewPage.offresActivesEtArchivees":
    "Active and archived listings",
  "admin.adminOverviewPage.dossiersProfessionnelsAVerifier":
    "Professional cases to verify",
  "admin.adminOverviewPage.gerer": "Manage",
  "admin.adminOverviewPage.toutesLesImmatriculationsKbisSoumises":
    "Every submitted KBIS registration has been verified.",
  "admin.adminOverviewPage.dernieresActionsDAuditSecurite":
    "Latest security audit actions",
  "admin.adminOverviewPage.par": "By:",
  "admin.adminRolesMatrixPage.matriceInteractiveDesRolesPermissions":
    "Interactive role & permission matrix",
  "admin.adminRolesMatrixPage.cartographieCompleteEtExhaustiveDes":
    "A complete map of access privileges for the 13 roles on the Shongre platform. Every sensitive action is checked rigorously at the repository and controller level.",
  "admin.adminRolesMatrixPage.permissionPerimetre": "Permission & scope",
  "admin.adminRolesMatrixPage.aucunePermissionNeCorrespondA":
    "No permission matches your search criteria.",
  "admin.adminTaxonomyPage.gestionAdministrationDeLaTaxonomie":
    "Taxonomy management & administration",
  "admin.adminTaxonomyPage.referentielCanoniqueUniquePilotantL":
    "The single canonical reference driving the category tree, publication forms, search facets, escrow capabilities and multi-market behaviour.",
  "admin.adminTaxonomyPage.selectionnezUneCategorieDansL":
    "Select a category in the tree to open its editor.",
  "admin.adminUsersPage.gouvernanceDesIdentites": "Identity governance",
  "admin.adminUsersPage.annuaireDesUtilisateursVerifications":
    "User directory & verifications",
  "admin.adminUsersPage.consultezEtAdministrezLEnsemble":
    "View and administer every account (private, professional and internal staff).",
  "admin.adminVerificationsPage.conformiteLcbFt": "Compliance & AML-CTF",
  "admin.adminVerificationsPage.poleDeVerificationSecurite":
    "Verification & security unit",
  "admin.adminVerificationsPage.examinezLesPiecesDIdentite":
    "Review the identity documents, KBIS extracts and bank accounts submitted by members and professional stores.",
  "admin.adminVerificationsPage.aucunDossierKycEnAttente":
    "No KYC case awaiting verification.",
  "admin.adminVerificationsPage.validerLIdentite": "Approve the identity",
  "admin.adminVerificationsPage.aucunDossierKybEnAttente":
    "No KYB case awaiting verification.",
  "admin.adminVerificationsPage.verifiePourVirements": "Verified for transfers",
  "admin.crmAiProspectingPage.decouvrezDeFutursVendeursPro":
    "Discover future Pro sellers from public sources",
  "admin.crmAiProspectingPage.recherchezEnLangageNaturelDes":
    "Search in plain language for businesses, craftspeople and traders whose catalogue suits Shongre. Every recommendation is backed by verifiable public web sources.",
  "admin.crmAiProspectingPage.signauxDetectes": "Signals detected:",
  "admin.crmCompaniesPage.repertoireDesBoutiquesProMarques":
    "Directory of Pro stores, brands and Shongre partner companies.",
  "admin.crmCompaniesPage.aucuneEntrepriseTrouvee": "No company found.",
  "admin.crmCompaniesPage.vendeurProActif": "Active Pro seller",
  "admin.crmCompanyDetailPage.retourAuxEntreprises": "Back to companies",
  "admin.crmCompanyDetailPage.vendeurProActif": "Active Pro seller",
  "admin.crmContactDetailPage.retourAuxContacts": "Back to contacts",
  "admin.crmContactDetailPage.tache": "+ Task",
  "admin.crmContactsPage.baseUnifieeDesAcheteursVendeurs":
    "A unified base of Shongre buyers, Pro sellers and sales prospects.",
  "admin.crmContactsPage.reinitialiserLesFiltres": "Reset filters",
  "admin.crmContactsPage.compteShongreLie": "Linked Shongre account",
  "admin.crmOverviewPage.tableauDeBordCrmPipeline": "CRM dashboard & pipeline",
  "admin.crmOverviewPage.issusDeLaProspectionIa":
    "From AI prospecting & inbound",
  "admin.crmOverviewPage.enCoursDeNegociation": "Under negotiation",
  "admin.crmOverviewPage.rappelsDemosPlanifiees": "Reminders & scheduled demos",
  "admin.crmOverviewPage.opportunitesCommercialesRecentes":
    "Recent sales opportunities",
  "admin.crmOverviewPage.trouvezDeNouveauxVendeursProfessionnels":
    "Find new qualified professional sellers",
  "admin.crmOverviewPage.decrivezEnLangageNaturelLes":
    "Describe your target companies in plain language and discover their potential for Shongre automatically.",
  "admin.crmOverviewPage.lancerUneRechercheIa": "Start an AI search",
  "admin.crmOverviewPage.echeance": "Due:",
  "admin.crmPipelinePage.pipelineDesVentesForfaitsPro":
    "Sales pipeline & Pro plans",
  "admin.crmPipelinePage.suiviDesNegociationsAbonnementsPro":
    "Tracking negotiations, Pro subscriptions and key account acquisitions.",
  "admin.crmPipelinePage.aucuneOpportunite": "No opportunities",
  "admin.crmTasksPage.tachesRelancesCommerciales": "Tasks & sales follow-ups",
  "admin.crmTasksPage.suiviDesActionsAppelsDemos":
    "Tracking actions, calls, demos and signatures to close.",
  "admin.crmTasksPage.creerUneTache2": "Create a task",
  "admin.crmTasksPage.voirToutesLesTaches": "See all tasks",
  "admin.crmTasksPage.lieA": "Linked to:",
  "admin.activityTimeline.evenementsIa": "AI events",
  "admin.activityTimeline.etapesPipeline": "Stages & pipeline",
  "admin.activityTimeline.aucuneActiviteEnregistreePourCe":
    "No activity recorded for this filter.",
  "admin.activityTimeline.par": "By:",
  "admin.duplicateConflictModal.creerQuandMemeSepare":
    "Create separately anyway",
  "admin.duplicateConflictModal.associerLaRechercheAL":
    "Link the search to the existing record",
  "admin.evidenceDrawer.pourquoiCetteEntrepriseCorrespond":
    "Why this company is a match",
  "admin.evidenceDrawer.cesInformationsSontIssuesExclusivement":
    "This information comes exclusively from public professional sources. It must be approved by an operator before any contact is made.",
  "admin.adminProviderDetailPage.retourAuxIntegrations": "Back to integrations",
  "admin.adminProviderDetailPage.desactive": "Disabled",
  "admin.adminProviderDetailPage.fonctionnalitesShongreDependantesDeCe":
    "Shongre features that depend on this provider",
  "admin.adminProviderDetailPage.fonctionnalitesDirectes": "Direct features:",
  "admin.adminProvidersPage.administrationSystemeIntegrations":
    "System administration & integrations",
  "admin.adminProvidersPage.fournisseursIntegrationsExternes":
    "Providers & external integrations",
  "admin.adminProvidersPage.gestionCentraliseeDeToutesLes":
    "Central management of every third-party gateway (payments, carriers, auth, email, AI, maps, KYC/KYB) with French inheritance and failover mechanisms.",
  "admin.adminProvidersPage.executezUnTestDeConnectivite":
    "Run a connectivity test and validate the credentials configured for this provider.",
  "admin.adminProvidersPage.lancerLeTest": "Run the test",
  "admin.providerAuditLogsTab.journalDAuditTracabiliteDes":
    "Audit log & change traceability",
  "admin.providerAuditLogsTab.aucunEvenementDAuditEnregistre":
    "No audit event recorded for this integration.",
  "admin.providerCatalogTable.affichageDe": "Showing",
  "admin.providerCatalogTable.reinitialiserLesFiltres": "Reset filters",
  "admin.providerCatalogTable.aucunFournisseurNeCorrespondAux":
    "No provider matches the search criteria.",
  "admin.providerCatalogTable.desactive2": "Disabled",
  "admin.providerCatalogTable.tous": "All (*)",
  "admin.providerCatalogTable.gerer": "Manage",
  "admin.providerConfigurationForm.parametresGenerauxDActivationDeploiement":
    "General activation & deployment settings",
  "admin.providerConfigurationForm.rendLePrestataireOperationnelPour":
    "Makes the provider operational for the platform",
  "admin.providerConfigurationForm.contexteDExecution": "Execution context",
  "admin.providerConfigurationForm.parametresTechniquesClesDApi":
    "Technical settings & API keys",
  "admin.providerConfigurationForm.lesClesSecretesSontGerees":
    "Secret keys are managed server-side and are never returned to the browser in clear text.",
  "admin.providerConfigurationForm.protectionRenforceeLeSecretReel":
    "Hardened protection: the real secret is injected confidentially into the server key vault (Vault / KMS).",
  "admin.providerConfigurationForm.enregistrerLaConfiguration":
    "Save the configuration",
  "admin.providerHealthSimulator.etatDeSanteDisponibiliteEn":
    "Health & availability in real time",
  "admin.providerHealthSimulator.controlezLEtatDeSante":
    "Control the simulated health state to test resilience and failover to backup providers.",
  "admin.providerHealthSimulator.simulateurDeTestsDeterministesDiagnostic":
    "Deterministic test simulator & API diagnostics",
  "admin.providerHealthSimulator.scenarioDeTestAExecuter":
    "Test scenario to run:",
  "admin.providerHealthSimulator.executerLeTestDeDiagnostic":
    "Run the diagnostic test",
  "admin.providerImpactModal.analyseDImpactOperationnel":
    "Operational impact analysis",
  "admin.providerImpactModal.veuillezExaminerAttentivementLesRepercussions":
    "Please review carefully the effects on territorial markets and on live features.",
  "admin.providerImpactModal.marchesTerritoriauxAffectes":
    "Affected territorial markets",
  "admin.providerImpactModal.cesMarchesHeritentActuellementDe":
    "These markets currently inherit from France and will adopt this change automatically.",
  "admin.providerImpactModal.fonctionnalitesDeLaMarketplaceConcernees":
    "Marketplace features affected",
  "admin.providerImpactModal.disponibiliteDUnPrestataireDe":
    "Availability of a backup provider (fallback)",
  "admin.providerImpactModal.secoursPret": "Backup ready",
  "admin.providerImpactModal.sansSecours": "No backup",
  "admin.providerImpactModal.confirmerLaModification": "Confirm the change",
  "admin.providerMarketMatrix.matriceDeCouvertureMultiMarches":
    "Multi-market coverage matrix & French inheritance",
  "admin.providerMarketMatrix.laFranceEstLeMarche":
    "France (🇫🇷) is the reference market. Other countries inherit its configuration automatically unless explicitly overridden.",
  "admin.providerMarketMatrix.ref": "REF",
  "admin.providerMarketMatrix.referenceActive": "Reference active",
  "admin.providerMarketMatrix.nonConfigure": "Not configured",
  "admin.providerMarketMatrix.heriteDeFr": "↳ Inherited from FR",
  "admin.providerMarketMatrix.personnalise": "★ Customised",
  "admin.providerMarketMatrix.desactive": "Disabled",
  "admin.providerMarketOverridesTab.selectionnezLeMarcheAInspecter":
    "Select the market to inspect or override:",
  "admin.providerMarketOverridesTab.baseDHeritage": "Inheritance base",
  "admin.providerMarketOverridesTab.touteModificationApporteeALa":
    "Any change made to France is applied immediately to markets with no override.",
  "admin.providerMarketOverridesTab.configurationPersonnalisee":
    "★ Custom configuration",
  "admin.providerMarketOverridesTab.heriteDeFrance": "↳ Inherited from France",
  "admin.providerMarketOverridesTab.noteDeConformiteOuMotif":
    "Compliance note or reason for the override:",
  "admin.providerMarketOverridesTab.reinitialiserSurFrance": "Reset to France",
  "admin.providerMarketOverridesTab.appliquerLaSurcharge": "Apply the override",
  "admin.providerOverviewDashboard.integrationsRepertoriees":
    "Integrations listed",
  "admin.providerOverviewDashboard.santeOperationnelle": "Operational health",
  "admin.providerOverviewDashboard.heritageFranceActif":
    "French inheritance active",
  "admin.providerOverviewDashboard.etatDesFonctionsCritiquesDe":
    "State of the platform's critical functions (France • reference)",
  "admin.providerOverviewDashboard.resolutionEnDirectDuPrestataire":
    "Live resolution of the primary provider and its effective operating state.",
  "admin.providerOverviewDashboard.matriceMultiMarches": "Multi-market matrix",
  "admin.providerOverviewDashboard.degrade": "Degraded",
  "admin.providerOverviewDashboard.repartitionParDomaineCategorie":
    "Breakdown by domain & category",
  "admin.providerOverviewDashboard.changementsRecents": "Recent changes",
  "admin.providerRoutingManager.gestionnaireDeRoutagePrioritesSecours":
    "Routing manager, priorities & failover",
  "admin.providerRoutingManager.configurezLesPrestatairesPrimairesEt":
    "Configure primary providers and their automatic failover when one becomes unavailable.",
  "admin.taxonomyAttributeRegistryTab.moteurRecherche": "Search engine",
  "admin.taxonomyAttributeRegistryTab.utilisePar": "Used by",
  "admin.taxonomyAttributeRegistryTab.editer": "Edit",
  "admin.taxonomyAuditTab.historiqueChronologiqueDeToutesLes":
    "Chronological history of every category creation, change, move and deprecation.",
  "admin.taxonomyAuditTab.aucunEvenementDAuditTrouve": "No audit event found.",
  "admin.taxonomyDraftPublishTab.annulerLesModifications": "Discard changes",
  "admin.taxonomyDraftPublishTab.publierLesModifications": "Publish changes",
  "admin.taxonomyDraftPublishTab.publicationBloqueeDesAnomaliesCritiques":
    "Publishing blocked: critical anomalies were detected. Please check the tab",
  "admin.taxonomyHierarchyTree.deprecie": "Deprecated",
  "admin.taxonomyHierarchyTree.modifiezVotreRechercheOuReinitialisez":
    "Change your search or reset the criteria.",
  "admin.taxonomyImportExportTab.generezUnExportCompletEt":
    "Generate a complete, structured export covering the tree, attributes, market overrides and capabilities.",
  "admin.taxonomyImportExportTab.telechargerLExportJson":
    "Download the JSON export",
  "admin.taxonomyImportExportTab.collezLeSchemaJsonA":
    "Paste the JSON schema to import. The engine validates syntax and structure before applying any change.",
  "admin.taxonomyImportExportTab.reinitialiserSurLeBaselineCanonique":
    "Reset to the canonical baseline",
  "admin.taxonomyNodeEditor.deplacer": "Move",
  "admin.taxonomyNodeEditor.deprecier2": "Deprecate",
  "admin.taxonomyNodeEditor.hierarchie": "Hierarchy:",
  "admin.taxonomyNodeEditor.apercuDuRenduVisuel": "Visual rendering preview:",
  "admin.taxonomyNodeEditor.iconeVectorielle": "Vector icon:",
  "admin.taxonomyNodeEditor.amelioreLesResultatsDuMoteur":
    "Improves search engine results",
  "admin.taxonomyNodeEditor.cycleDeViePublication": "Lifecycle & publication",
  "admin.taxonomyNodeEditor.zoneDeDanger": "Danger zone",
  "admin.taxonomyNodeEditor.laSuppressionEstDefinitiveEt":
    "Deletion is permanent and affects every listing attached to this category. Prefer",
  "admin.taxonomyNodeEditor.supprimerCeNUd": "Delete this node",
  "admin.taxonomyNodeEditor.reglesAutomatiquesDeLaTaxonomie":
    "(automatic taxonomy rules)",
  "admin.taxonomyNodeEditor.aucunAttributHeriteDesCategories":
    "No attributes inherited from parent categories.",
  "admin.taxonomyNodeEditor.herite": "Inherited",
  "admin.taxonomyNodeEditor.cesAttributsEnrichissentLeFormulaire":
    "These attributes extend the publication form for this node specifically.",
  "admin.taxonomyNodeEditor.aucunAttributLocalAssigneChoisissez":
    "No local attribute assigned. Pick one from the central registry above.",
  "admin.taxonomyNodeEditor.facettesDeFiltresDeriveesPour":
    "Filter facets derived for the search page",
  "admin.taxonomyNodeEditor.laTaxonomieDefinitL": "The taxonomy defines the",
  "admin.taxonomyNodeEditor.modesDeTransactionAutorises":
    "Permitted transaction modes",
  "admin.taxonomyNodeEditor.modesDeLivraisonRemiseEligibles":
    "Eligible delivery & handover modes",
  "admin.taxonomyNodeEditor.laFrance": "France (",
  "admin.taxonomyNodeEditor.apercuGoogleSearch": "Google Search preview:",
  "admin.taxonomyNodeEditor.rapportDImpactRetrocompatibilite":
    "Impact & backwards-compatibility report",
  "admin.taxonomyTreeToolbar.ajouterUneCategorie": "Add a category",
  "admin.taxonomyTreeToolbar.deplierTout": "Expand all",
  "admin.taxonomyTreeToolbar.replierTout": "Collapse all",
  "admin.taxonomyValidationTab.controleAutomatiqueDeStructureUnicite":
    "Automatic checks on structure, uniqueness of IDs and slugs, and consistency of capabilities and attributes.",
  "admin.attributeEditModal.ajouterUneOption": "Add an option",
  "admin.attributeEditModal.aucuneOptionDefinieCliquezSur":
    'No option defined. Click "Add an option".',
  "admin.deleteNodeModal.pourEviterDInvaliderDes":
    "To avoid invalidating listings or breaking SEO paths, it is strongly recommended to",
  "admin.deleteNodeModal.aucuneAnnonceActiveNiSous":
    "No active listing or dependent subcategory was detected. The entity will be removed from the canonical registry.",
  "admin.deleteNodeModal.deprecierALaPlace": "Deprecate instead",
  "admin.moveNodeModal.lesCapacitesEtAttributsHerites":
    "Inherited capabilities and attributes will be re-evaluated against the new parent.",
  "auth.forgotPasswordPage.environnementDeDemonstrationCliquezCi":
    "Demo environment — click below to go straight to the reset step:",
  "auth.forgotPasswordPage.accederAuFormulaireDeNouveau":
    "Go to the new password form",
  "auth.forgotPasswordPage.adresseEmailDeVotreCompte":
    "Your account email address",
  "auth.forgotPasswordPage.envoyerLeLienDeReinitialisation":
    "Send the reset link",
  "auth.forgotPasswordPage.jetonDeValidationToken": "Validation token",
  "auth.forgotPasswordPage.confirmerLeNouveauMotDe": "Confirm the new password",
  "auth.forgotPasswordPage.mettreAJourMonMot": "Update my password",
  "auth.forgotPasswordPage.renvoyerUnNouvelEmail": "← Send a new email",
  "auth.loginPage.codeDeSecurite2faOu": "2FA security code or backup code",
  "auth.loginPage.pourLeTestVousPouvez": "For testing: you can use the code",
  "auth.loginPage.validerEtContinuer": "Confirm and continue",
  "auth.loginPage.retourALEcranDe": "← Back to sign-in",
  "auth.loginPage.motDePasse": "Password",
  "auth.loginPage.motDePasseOublie": "Forgot your password?",
  "auth.loginPage.connexionRapideDemo": "Quick demo sign-in",
  "auth.loginPage.1ClicSansMotDe": "One click, no password",
  "auth.registerPages.creerVotreCompteShongre": "Create your Shongre account",
  "auth.registerPages.rejoignezLaCommunauteDeCommerce":
    "Join the secure circular-commerce community in France and across Europe.",
  "auth.registerPages.1SelectionnezVotreProfilD": "1. Choose your account type",
  "auth.registerPages.nomEtPrenomOuPseudonyme": "Full name or username",
  "auth.registerPages.conditionsGeneralesDUtilisation": "Terms of Use",
  "auth.registerPages.politiqueDeConfidentialite": "Privacy Policy",
  "auth.registerPages.jeSouhaiteRecevoirParEmail":
    "I'd like to receive deals, exclusive offers and community news by email (optional).",
  "auth.registerPages.creerMonCompteParticulier": "Create my private account",
  "auth.registerPages.ouvrirUnCompteProfessionnel":
    "Open a professional account",
  "auth.registerPages.accedezALaVitrineOfficielle":
    "Get the official storefront, the Verified Pro badge and automated VAT invoicing.",
  "auth.registerPages.nomEtPrenomDuResponsable":
    "Full name of the manager / contact",
  "auth.registerPages.telephoneCommercial": "Business phone",
  "auth.registerPages.continuerVersLesInformationsEntreprise": "Continue",
  "auth.registerPages.adresseDuSiegeSocialMagasin":
    "Registered office / store address",
  "auth.registerPages.conditionsGeneralesDeVenteProfessionnelles":
    "Professional Terms of Sale",
  "auth.verifyEmailPage.emailValideAvecSucces": "Email verified",
  "auth.verifyEmailPage.votreCompteEstDesormaisSecurise":
    "Your account is now secured and the “Email verified” badge is live on your profile.",
  "auth.verifyEmailPage.accederAMonEspace": "Go to my account",
  "auth.verifyEmailPage.tokenDemo": "Demo token:",
  "auth.verifyEmailPage.jetonDeValidationOuCode":
    "Validation token or verification code",
  "auth.accountTypeSelector.pourAcheterEnTouteSecurite":
    "To buy safely and sell your everyday items with no signup fee.",
  "auth.accountTypeSelector.pourLesEntreprisesArtisansBoutiques":
    "For registered companies, craftspeople, stores and traders.",
  "auth.mFAModal.activerLaDoubleAuthentification2fa":
    "Enable two-factor authentication (2FA)",
  "auth.mFAModal.protegezVotreCompteEtVos":
    "Protect your account and your transactions with a standard authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, etc.).",
  "auth.mFAModal.1ScannezCeQrCode":
    "1. Scan this QR code with your authenticator app",
  "auth.mFAModal.ouSaisissezLaCleManuellement": "Or enter the key manually:",
  "auth.mFAModal.2CodesDeSecoursA": "2. Single-use backup codes",
  "auth.mFAModal.conservezCesCodesDansUn":
    "Keep these codes somewhere safe. They let you sign in again if you lose access to your phone.",
  "auth.mFAModal.3EntrezLeCodeA": "3. Enter the 6-digit code from your app",
  "auth.mFAModal.verifierEtActiverLe2fa": "Verify and enable 2FA",
  "auth.phoneVerificationModal.verificationDuNumeroDeTelephone":
    "Phone number verification",
  "auth.phoneVerificationModal.laVerificationTelephoniqueProtegeLes":
    "Phone verification protects buyers and sellers during in-person handovers and builds trust.",
  "auth.phoneVerificationModal.paysEtIndicatif": "Country and dialling code",
  "auth.phoneVerificationModal.recevoirMonCodeParSms": "Send my code by SMS",
  "auth.phoneVerificationModal.saisissezLeCodeRecuPar":
    "Enter the code you received by SMS (6 digits)",
  "auth.phoneVerificationModal.confirmerLeNumero": "Confirm the number",
  "auth.phoneVerificationModal.changerDeNumero": "Change number",
  "auth.upgradeToProModal.passerEnCompteProfessionnel":
    "Switch to a professional account",
  "auth.upgradeToProModal.conservezToutesVosAnnoncesAvis":
    "Keep all your existing listings, reviews and messages while unlocking the custom storefront, the Verified Pro badge and invoicing features.",
  "auth.upgradeToProModal.numeroDeTvaIntracommunautaire": "EU VAT number",
  "auth.upgradeToProModal.telephoneProfessionnel": "Business phone",
  "auth.upgradeToProModal.adresseDuSiegeSocialBoutique":
    "Registered office / store address",
  "auth.upgradeToProModal.confirmerLaMiseANiveau": "Confirm the upgrade",
  "categories.categoriesPage.toutesNosCategories": "All our categories",
  "categories.categoriesPage.explorezLEnsembleDesCategories":
    "Explore every Shongre category and subcategory. Find verified listings near you, or anywhere in France, in seconds.",
  "categories.categoriesPage.affichageDe": "Showing",
  "categories.categoriesPage.afficherToutesLesCategories":
    "Show all categories",
  "collections.collectionsPage.toutesNosCollections": "All our collections",
  "collections.collectionsPage.decouvrezDesUniversThematiquesPenses":
    "Discover themed worlds put together to inspire you: deals, vintage furniture, refurbished tech, light mobility, back-to-school and makers from across the regions.",
  "collections.collectionsPage.voirToutesLesCollections": "See all collections",
  "collections.collectionsPage.aucuneAnnonceNeCorrespondAux":
    "No listing matches the active filters in this collection.",
  "collections.collectionsPage.reinitialiserLesFiltres": "Reset filters",
  "errors.notFoundPage.laPageQueVousRecherchez":
    "The page you're looking for doesn't exist or has moved.",
  "errors.notFoundPage.retourALAccueil": "Back home",
  "errors.notFoundPage.rechercherUneAnnonce": "Search listings",
  "favorites.favoritesPage.retrouvezLesAnnoncesQueVous":
    "Find the listings you've saved",
  "favorites.favoritesPage.viderLesFavoris": "Clear favourites",
  "favorites.favoritesPage.annoncesSauvegardees": "Saved listings",
  "favorites.favoritesPage.explorerLesAnnonces": "Browse listings",
  "home.homePage.trouvezLaPerleRare": "Find the rare gem,",
  "home.homePage.sansTracas": "hassle-free.",
  "home.homePage.achetezEtVendezEnToute":
    "Buy and sell with confidence: secure payments, built-in delivery and verified sellers.",
  "home.homePage.garantiesShongre": "Shongre guarantees",
  "home.homePage.paiementsSecurises": "Secure payments",
  "home.homePage.livraisonIntegree": "Built-in delivery",
  "home.homePage.vendeursVerifies": "Verified sellers",
  "home.homePage.annoncesRecentes": "Recent listings",
  "home.homePage.lesDernieresOffresPublieesPres":
    "The latest listings posted near you",
  "home.homePage.reprendreOuVousEnEtiez": "Pick up where you left off",
  "home.homePage.meilleuresOffres": "Best deals",
  "home.homePage.lesAnnoncesQueVousAvez": "The listings you viewed recently",
  "home.homePage.desReductionsJusquA50": "Up to 50% off recent, verified items",
  "home.homePage.desProfessionnelsVerifiesAvecCatalogue":
    "Verified professionals, with catalogues and guarantees",
  "home.homePage.vousEtesCommercantArtisanOu":
    "Are you a trader, craftsperson or dealer?",
  "home.homePage.ouvrezVotreVitrineOfficielleEn":
    "Open your official storefront in a few clicks, get the certified Pro badge and profitability analytics, and import your catalogues in bulk.",
  "home.homePage.decouvrirLesForfaitsPro": "Explore the Pro plans",
  "home.homePage.creerMonComptePro": "Create my Pro account",
  "home.heroBoostedScroll.carouselLabel": "Featured listings",
  "home.heroBoostedScroll.previous": "Previous listing",
  "home.heroBoostedScroll.next": "Next listing",
  "home.heroBoostedScroll.annoncesControlees": "Checked listings",
  "home.heroBoostedScroll.securiteFiabiliteEtQualiteAssurees":
    "Safety, reliability and quality assured.",
  "home.heroBoostedScroll.enSavoirPlus": "Learn more",
  "home.heroBoostedScroll.livraison": "Delivery",
  "home.homeCategoryExplorer.explorerParCategorie": "Explore by category",
  "home.homeCategoryExplorer.desMillionsDAnnoncesVerifiees":
    "Millions of verified listings, sorted precisely to match your plans and interests.",
  "home.homeCollectionsSection.nosCollectionsDuMoment":
    "Our collections right now",
  "home.homeCollectionsSection.desSelectionsThematiquesPrepareesPour":
    "Themed selections put together to uncover unique, durable, verified finds.",
  "legal.legalPages.offresVerifieesAPrixReduits":
    "Verified offers at reduced prices",
  "legal.legalPages.articlesDontLePrixA":
    "Items whose price the seller recently lowered",
  "legal.legalPages.annoncesEnPromotion": "Discounted listings",
  "legal.legalPages.paginationLabel": "Discounted listings pagination",
  "legal.legalPages.previousPage": "Previous",
  "legal.legalPages.nextPage": "Next",
  "legal.legalPages.pageStatus": "Page {current} of {total}",
  "listings.listingDetailPage.explorerLesAnnoncesSimilaires":
    "Browse similar listings",
  "listings.listingDetailPage.retourALAccueil": "Back home",
  "listings.listingDetailPage.aLaUne": "Featured",
  "listings.listingDetailPage.signalerOuDemanderDeL":
    "Report or get help with this listing",
  "listings.listingDetailPage.prixDeLArticle": "Item price",
  "listings.listingDetailPage.protectionAcheteurIncluseCalculeeAu":
    "Buyer protection included, calculated at payment",
  "listings.listingDetailPage.modifierMonAnnonce": "Edit my listing",
  "listings.listingDetailPage.gererMesAnnoncesStats":
    "Manage my listings & stats",
  "listings.listingDetailPage.reserverLArticle": "Reserve the item",
  "listings.listingDetailPage.offreDePrix": "Make an offer",
  "listings.listingDetailPage.offreDePrixCourt": "Offer",
  "listings.listingDetailPage.message": "Message",
  "listings.listingDetailPage.selectionDArticlesRecommandesSelon":
    "Recommended items matching your criteria",
  "listings.listingDetailPage.envoyerLeMessage": "Send message",
  "listings.listingDetailPage.envoyerLeSignalement": "Send report",
  "listings.listingDetailPage.reserver": "Reserve",
  "listings.listingFulfillmentSummary.remiseExpedition": "Handover & shipping",
  "listings.listingFulfillmentSummary.choixDefinitifALaCommande":
    "Final choice made at checkout",
  "listings.listingFulfillmentSummary.livraisonEnColisAvecSuivi":
    "Tracked parcel delivery",
  "listings.listingFulfillmentSummary.mondialRelayPointRelaisLocker":
    "Mondial Relay (pickup point & locker) or Colissimo home delivery",
  "listings.listingFulfillmentSummary.aPartirDe399": "From €3.99",
  "listings.listingFulfillmentSummary.transportDeMeublesGrosColis":
    "Furniture & bulky item transport",
  "listings.listingFulfillmentSummary.livraisonParTransporteurSpecialiseCocolis":
    "Delivery by specialist carrier Cocolis",
  "listings.listingFulfillmentSummary.surDevisTransport":
    "Transport quoted on request",
  "listings.listingFulfillmentSummary.retraitDirectDansLeMagasin":
    "Collect directly from the Pro seller's store",
  "listings.listingSafetyNotice.sequestreGaranti": "Escrow guaranteed",
  "listings.listingSafetyNotice.paiementChiffre3dSecure":
    "3-D Secure encrypted payment",
  "listings.listingSellerTrustSection.aProposDuVendeur": "About the seller",
  "messaging.messagingPage.vosEchangesAvecLesAcheteurs":
    "Your conversations with buyers and sellers appear here, with secure payment and order tracking.",
  "messaging.messagingPage.parcourirLesAnnonces": "Browse listings",
  "messaging.messagingPage.choisissezUneConversationDansLa":
    "Pick a conversation from the list on the left to talk safely with your buyers and sellers.",
  "messaging.messagingPage.etesVousSurDeVouloir":
    "Are you sure you want to block this user? You can unblock them at any time from the conversation options.",
  "messaging.messagingPage.confirmerLeBlocage": "Confirm block",
  "messaging.messagingPage.votreSignalementSeraExamineEn":
    "Your report will be prioritised by our moderation team. In an emergency or a suspected scam, we act immediately.",
  "messaging.messagingPage.envoyerLeSignalement": "Send report",
  "messaging.messagingPage.pieceJointeEnPleinEcran": "Attachment, full screen",
  "messaging.conversationContextBar.suiviDeCommande": "Order tracking",
  "messaging.conversationContextBar.faireUneOffre": "Make an offer",
  "messaging.conversationContextBar.fixerRendezVous": "Arrange a meeting",
  "messaging.conversationHeader.simulerReponse": "Simulate reply",
  "messaging.messageTimeline.posezVosQuestionsAuVendeur":
    "Ask the seller your questions, or agree a meeting point.",
  "messaging.messageTimeline.reessayer": "Try again",
  "messaging.pickupSchedulerModal.confirmerLeRendezVous": "Confirm the meeting",
  "newsletter.newsletterConfirmPage.abonnementConfirme":
    "Subscription confirmed",
  "newsletter.newsletterConfirmPage.vousRecevrezChaqueSemaineLes":
    "Each week you'll get the best finds and deals. You can change your preferences or unsubscribe at any time.",
  "newsletter.newsletterConfirmPage.explorerLesAnnonces": "Browse listings",
  "newsletter.newsletterConfirmPage.gererMesThematiques": "Manage my topics",
  "newsletter.newsletterLandingPage.neManquezPlusAucunePepite":
    "Never miss a find or a good deal again",
  "newsletter.newsletterLandingPage.chaqueSemaineRecevezDansVotre":
    "Every week, get a selection of one-of-a-kind items, verified price drops and advice on buying and selling with confidence.",
  "newsletter.newsletterLandingPage.ceQueVousTrouverezDans":
    "What you'll find in our editions",
  "newsletter.newsletterLandingPage.vousGardezLeControleTotal":
    "You stay fully in control of your preferences and can unsubscribe in one click.",
  "newsletter.newsletterPreferencesPage.newsletterPreferencesMarketing":
    "Newsletter & marketing preferences",
  "newsletter.newsletterPreferencesPage.gerezVosAbonnementsAuxSelections":
    "Manage your subscriptions to weekly selections, deals and Shongre news.",
  "newsletter.newsletterPreferencesPage.seDesabonner": "Unsubscribe",
  "newsletter.newsletterPreferencesPage.seReabonner": "Resubscribe",
  "newsletter.newsletterPreferencesPage.cochezLesThematiquesQuiVous":
    "Tick the topics that interest you to tailor your next editions.",
  "newsletter.newsletterPreferencesPage.communicationsObligatoiresDeService":
    "Essential service communications",
  "newsletter.newsletterPreferencesPage.memeSiVousEtesDesabonne":
    "Even if you unsubscribe from the newsletter, you'll keep receiving essential emails about your account security, your escrow payments and your order tracking.",
  "newsletter.newsletterUnsubscribePage.desabonnementNewsletter":
    "Newsletter unsubscribe",
  "newsletter.newsletterUnsubscribePage.vousPouvezVousDesabonnerEn":
    "You can unsubscribe from all our selections and deals in one click.",
  "newsletter.newsletterUnsubscribePage.desabonnementPrisEnCompte":
    "Unsubscribe confirmed",
  "newsletter.newsletterUnsubscribePage.vousContinuerezARecevoirLes":
    "You'll keep receiving the necessary notifications about your account security and your ongoing transactions.",
  "newsletter.newsletterUnsubscribePage.jeMeSuisTrompeMe":
    "That was a mistake — resubscribe me",
  "newsletter.newsletterUnsubscribePage.retourALAccueil": "Back home",
  "newsletter.newsletterPreviewModal.laSelectionDeLaSemaine":
    "This week's selection",
  "newsletter.newsletterPreviewModal.fermerLApercu": "Close preview",
  "newsletter.newsletterSignup.vousRecevrezNosSelectionsEt":
    "You'll receive our selections and deals. You can unsubscribe in one click at any time.",
  "newsletter.newsletterSignup.recevezNosMeilleuresPepitesBons":
    "Get our best finds & deals",
  "newsletter.newsletterSignup.chaqueSemaineUneSelectionExclusive":
    "Every week, an exclusive selection of verified listings, price drops and advice for buying and selling.",
  "newsletter.newsletterSignup.jAccepteDeRecevoirLa":
    "I agree to receive the Shongre newsletter. You can unsubscribe in one click at any time.",
  "notifications.notificationPreferencesPage.preferencesDeNotifications":
    "Notification preferences",
  "notifications.notificationPreferencesPage.choisissezPrecisementLesAlertesQue":
    "Choose exactly which alerts you want on each channel.",
  "notifications.notificationsPage.misesAJourEnDirect":
    "Live updates about your listings, messages, orders and security.",
  "notifications.notificationsPage.toutMarquerCommeLu": "Mark all as read",
  "notifications.notificationsPage.preferences": "Preferences",
  "notifications.notificationsPage.vosAlertesConcernantLesBaisses":
    "Your alerts about price drops, meetings and messages will appear here.",
  "notifications.notificationDemoToolbar.cliquezSurUnScenarioPour":
    "Click a scenario to inject a real notification instantly and test the display, badges and deep links.",
  "notifications.notificationPanel.vosAlertesMessagesEtTransactions":
    "Your alerts, messages and transactions will appear here.",
  "pro.proDirectoryPage.trouvezDesCommercantsEtArtisans":
    "Find traders and craftspeople you can trust",
  "pro.proDirectoryPage.toutesLesEntreprisesReferenceesPossedent":
    "Every listed business has a verified SIRET number and offers professional guarantees.",
  "profile.sellerPublicPage.lUtilisateurOuLaBoutique":
    "The user or store you asked for doesn't exist, or the link is wrong.",
  "profile.sellerPublicPage.retourALAccueil": "Back home",
  "profile.sellerPublicPage.rechercherDesAnnonces": "Search listings",
  "profile.sellerPublicPage.ceCompteVendeurAEte":
    "This seller account has been restricted or suspended by our moderation team for compliance and safety reasons. Their listings are no longer visible.",
  "profile.sellerPublicPage.retournerAuxAnnonces": "Back to listings",
  "profile.proBusinessInfo.mentionsLegalesInformationsEntreprise":
    "Legal notice & company information",
  "profile.proBusinessInfo.venteExclusiveEnLigneAvec":
    "Online sales only, with secure shipping.",
  "profile.proBusinessInfo.zonesDeLivraisonCouvertes":
    "Delivery areas covered:",
  "profile.proBusinessInfo.servicesInclusParCeVendeur":
    "Services included by this pro seller:",
  "profile.sellerCatalog.publierUnePremiereAnnonce": "Post a first listing",
  "profile.sellerCatalog.explorerLesAnnoncesDuMarche":
    "Browse marketplace listings",
  "profile.sellerCatalog.effacerLesPrix": "Clear prices",
  "profile.sellerCatalog.sousCategories": "Subcategories:",
  "profile.sellerCatalog.reinitialiserLesFiltres2": "Reset filters",
  "profile.sellerCatalog.catalogueDuVendeur": "Seller catalogue",
  "profile.sellerProfileHeader.verifie": "Verified",
  "profile.sellerProfileHeader.gererMesAnnonces": "Manage my listings",
  "profile.sellerProfileHeader.partagerCeProfil2": "Share this profile",
  "profile.sellerProfileHeader.signalerCeProfil": "Report this profile",
  "profile.sellerReportModal.motifPrincipalDuSignalement":
    "Main reason for reporting:",
  "profile.sellerReportModal.detailsComplementairesFacultatifMaisRecommande":
    "Extra details (optional but recommended):",
  "profile.sellerReportModal.envoyerLeSignalement": "Send report",
  "profile.sellerReviewsTab.avisCertifiesSuiteAUne":
    "Verified reviews following a transaction completed on Shongre.",
  "profile.sellerReviewsTab.affichageDesAvisAvecLa": "Showing reviews rated",
  "profile.sellerReviewsTab.afficherTousLesAvis": "Show all reviews",
  "profile.sellerReviewsTab.achatVerifie": "Verified purchase",
  "profile.sellerTrustIndicators.garantiesSignauxDeConfiance":
    "Guarantees & trust signals",
  "profile.sellerTrustIndicators.remiseEnMainPropreOu":
    "Handover in person, or shipping with a tracking number",
  "publishing.publishWizard.votreAnnonce": "Your listing",
  "publishing.publishWizard.deposerUneAnnonceSurShongre":
    "Post a listing on Shongre",
  "publishing.publishWizard.queSouhaitezVousPublier":
    "What would you like to post?",
  "publishing.publishWizard.selectionnezLIntentionEtLa":
    "Choose the intent and the exact category in the Shongre taxonomy.",
  "publishing.publishWizard.typeDAnnonceIntention": "Listing type (intent)",
  "publishing.publishWizard.rechercherUneCategorieOuUn":
    "Search a category or a type of item",
  "publishing.publishWizard.ouParcourezLesUnivers": "Or browse the universes",
  "publishing.publishWizard.etatDuBienProduit": "Condition of the item",
  "publishing.publishWizard.photosDeVotreAnnonce": "Photos for your listing",
  "publishing.publishWizard.lesAnnoncesAvecAuMoins":
    "Listings with at least 3 photos get 5× more contacts. The first photo is used as the cover.",
  "publishing.publishWizard.titreDescriptionDetaillee":
    "Title & detailed description",
  "publishing.publishWizard.redigezUnTitreClairOu":
    "Write a clear title, or use the Gemini AI assistant.",
  "publishing.publishWizard.assistantIaRedactionGemini":
    "Gemini AI writing assistant",
  "publishing.publishWizard.generezUneDescriptionOptimiseePour":
    "Generate a description optimised for SEO and conversion",
  "publishing.publishWizard.genererAvecLIa": "Generate with AI",
  "publishing.publishWizard.prixDeVenteStock": "Sale price & stock",
  "publishing.publishWizard.commentSouhaitezVousVendre":
    "How would you like to sell?",
  "publishing.publishWizard.activezLesOptionsDeTransaction":
    "Enable the transaction options allowed for this category.",
  "publishing.publishWizard.lesAcheteursPeuventVousPoser":
    "Buyers can ask you questions through Shongre messaging.",
  "publishing.publishWizard.sequestreGaranti": "Escrow guaranteed",
  "publishing.publishWizard.lAcheteurPeutPayerImmediatement":
    "The buyer can pay immediately by card. Your funds are protected.",
  "publishing.publishWizard.permetALAcheteurDe":
    "Lets the buyer hold the item while you agree a meeting time.",
  "publishing.publishWizard.modesDeRemiseExpedition":
    "Handover & shipping options",
  "publishing.publishWizard.determinezCommentLesAcheteursPeuvent":
    "Decide how buyers can get the item.",
  "publishing.publishWizard.gratuitAvecValidationParCode":
    "Free, confirmed with a 6-digit secret PIN at the meeting.",
  "publishing.publishWizard.etiquettePrepayeeGenereeAutomatiquementL":
    "Prepaid label generated automatically. The buyer pays the postage.",
  "publishing.publishWizard.gabaritDuColisPoidsEstime":
    "Parcel size (estimated weight)",
  "publishing.publishWizard.idealPourCanapesTablesElectromenager":
    "Ideal for sofas, tables and heavy appliances, with a specialist carrier.",
  "publishing.publishWizard.localisationDuBien": "Item location",
  "publishing.publishWizard.parRespectPourVotreVie":
    "To protect your privacy, only the town and postcode are shown publicly.",
  "publishing.publishWizard.marchesEtPaysDeDiffusion":
    "Publication markets and countries",
  "publishing.publishWizard.diffusezVotreAnnonceSimultanementSur":
    "Publish your listing on several Shongre markets at once to maximise its reach.",
  "publishing.publishWizard.tousLesMarches": "All markets",
  "publishing.publishWizard.marcheDOriginePrincipal": "Home market (primary)",
  "publishing.publishWizard.categorieEligible": "✓ Category eligible",
  "publishing.publishWizard.categorieRestreinte": "✕ Category restricted",
  "publishing.publishWizard.livraison": "Delivery",
  "publishing.publishWizard.sequestre": "Escrow",
  "publishing.publishWizard.toutesLesTransactionsMultiMarches":
    "Every multi-market transaction is automatically covered by Shongre escrow. Prices are converted transparently and local VAT is applied in line with European and Swiss regulations.",
  "publishing.publishWizard.optionsDeVisibiliteBoostFacultatif":
    "Visibility & boost options (optional)",
  "publishing.publishWizard.multipliezVosVuesEnPositionnant":
    "Multiply your views by placing your listing at the top of results across all your selected markets.",
  "publishing.publishWizard.paidOptionsUnavailable":
    "Paid options are temporarily unavailable. Free standard publication remains available.",
  "publishing.publishWizard.standardIncludes":
    "Includes {photos} photos, messaging and listing management for {days} days.",
  "publishing.publishWizard.free": "Free",
  "publishing.publishWizard.loadingOptionalOffers":
    "Loading optional offers…",
  "publishing.publishWizard.recapitulatifDeVotreAnnonce":
    "Summary of your listing",
  "publishing.publishWizard.relisezVotreAnnonceVousPourrez":
    "Check your listing over. You can edit it at any time after publishing.",
  "publishing.publishWizard.apercuDansLesResultatsDe":
    "Preview in search results",
  "publishing.publishWizard.precedent": "Back",
  "publishing.publishWizard.publierMonAnnonceMaintenant":
    "Publish my listing now",
  "savedsearches.savedSearchesPage.recevezDesAlertesInstantaneesDes":
    "Get instant alerts as soon as a new listing matches your criteria",
  "savedsearches.savedSearchesPage.voirLesAnnonces": "View listings",
  "savedsearches.savedSearchesPage.lancerUneRecherche": "Start a search",
  "search.exploreMapView.touteLaFrance": "All of France",
  "search.exploreMapView.verifie": "Verified",
  "search.exploreMapView.voirLAnnonce": "View listing",
  "search.searchPage.livraisonDisponible2": "Delivery available",
  "search.searchPage.effacerTout": "Clear all",
  "search.searchPage.categories2": "Categories",
  "search.searchPage.sousCategorie": "Subcategory",
  "search.searchPage.typeDeVendeur": "Seller type",
  "search.searchPage.filtresSpecifiques": "Specific filters",
  "search.searchPage.categorie": "Category",
  "search.searchPage.criteresSpecifiques": "Specific criteria",
  "sellerworkspace.accountOverviewPage.gerezVosAnnoncesVosVentes":
    "Manage your listings, sales, messages and favourites in one place.",
  "sellerworkspace.accountOverviewPage.deposerUneAnnonce": "Post a listing",
  "sellerworkspace.accountOverviewPage.niveauxDeSecuriteVerificationsDu":
    "Security levels",
  "sellerworkspace.accountOverviewPage.centreDeVerificationKycKyb":
    "(KYC / KYB / IBAN) →",
  "sellerworkspace.accountOverviewPage.nonVerifie": "Not verified",
  "sellerworkspace.accountOverviewPage.desactive": "Disabled",
  "sellerworkspace.accountOverviewPage.protectionRenforceeGoogleMicrosoftAuth":
    "Hardened protection with Google/Microsoft Authenticator",
  "sellerworkspace.accountOverviewPage.coordonneesInformationsDuProfil":
    "Contact details & profile information",
  "sellerworkspace.accountOverviewPage.visiblesSurVosAnnoncesEt":
    "Shown on your listings and during in-person handovers",
  "sellerworkspace.accountOverviewPage.nomEtPrenomPseudonyme":
    "Full name / username",
  "sellerworkspace.accountOverviewPage.numeroDeTelephone2": "Phone number",
  "sellerworkspace.accountOverviewPage.biographiePresentation":
    "Bio / introduction",
  "sellerworkspace.accountOverviewPage.enregistrerLesModifications":
    "Save changes",
  "sellerworkspace.accountOverviewPage.toutesMesAnnonces": "All my listings →",
  "sellerworkspace.accountOverviewPage.vousNAvezPasEncore":
    "You haven't posted a listing yet.",
  "sellerworkspace.accountOverviewPage.passezALaVitesseSuperieure":
    "Step things up",
  "sellerworkspace.accountOverviewPage.vousVendezRegulierementEnTant":
    "Do you sell regularly as a professional?",
  "sellerworkspace.accountOverviewPage.profitezDUneBoutiqueDediee":
    "Get a dedicated store with your logo, the verified Pro badge and discounts on boosts.",
  "sellerworkspace.accountOverviewPage.passerEnComptePro":
    "Switch to a Pro account",
  "sellerworkspace.myListingsPage.gestionDeMesAnnonces": "Managing my listings",
  "sellerworkspace.myListingsPage.suivezLesVuesActivezDes":
    "Track views, turn on visibility boosts and manage your stock",
  "sellerworkspace.myListingsPage.deposerUneAnnonce": "Post a listing",
  "sellerworkspace.myListingsPage.choisissezUneOptionDeVisibilite":
    "Choose a visibility option to sell faster:",
  "sellerworkspace.myListingsPage.selectionnezLesPaysEuropeensDans":
    "Choose the European countries where your listing will be visible and purchasable:",
  "sellerworkspace.myListingsPage.enregistrerLesMarches": "Save markets",
  "sellerworkspace.proDashboardPage.tableauDeBordVendeurPro":
    "Pro seller dashboard",
  "sellerworkspace.proDashboardPage.suiviDesPerformancesDeVotre":
    "Tracking your catalogue's performance and customer conversion",
  "sellerworkspace.proDashboardPage.facturesRecus": "Invoices & receipts",
  "sellerworkspace.proDashboardPage.evolutionDeLAudience7":
    "Audience trend (last 7 days)",
  "sellerworkspace.proDashboardPage.articlesPharesDeVotreBoutique":
    "Your store's top items",
  "sellerworkspace.proPlansPage.developpezVosVentesAvecNos":
    "Grow your sales with plans built for you",
  "sellerworkspace.proPlansPage.sansEngagementActivezVotreVitrine":
    "No commitment. Turn on your custom storefront, import your inventory in bulk and get exclusive discounts on visibility options.",
  "sellerworkspace.proPlansPage.lePlusPopulaire": "Most popular",
  "sellerworkspace.proPlansPage.optionsDeMiseEnAvant":
    "À la carte promotion options",
  "sellerworkspace.proPlansPage.aActiverSurNImporte":
    "Enable on any listing to sell faster",
  "sellerworkspace.proStorefrontEditorPage.cesInformationsSontAfficheesSur":
    "This information appears on your official store page and on every one of your listings.",
  "sellerworkspace.proStorefrontEditorPage.banniereLogoDeLaBoutique":
    "Store banner & logo",
  "sellerworkspace.proStorefrontEditorPage.enregistrerLesModifications":
    "Save changes",
  "sellerworkspace.billingHistoryModal.payee": "Paid",
  "sellerworkspace.billingHistoryModal.recu": "Receipt",
  "sellerworkspace.billingHistoryModal.aucuneFactureNeCorrespondA":
    "No invoice matches this filter.",
  "sellerworkspace.bulkImportModal.modeleCsvVierge": "Blank CSV template",
  "sellerworkspace.bulkImportModal.chargerUnExemple4Articles":
    "Load an example (4 items)",
  "sellerworkspace.bulkImportModal.parcourirUnFichierCsv":
    "Browse for a CSV file…",
  "sellerworkspace.bulkImportModal.utilisezNotreModeleAvecSeparateur":
    "Use our template with a semicolon (;) separator, containing Title, Category, Price, Condition and Stock columns.",
  "support.contactPage.votreDemandeABienEte":
    "Your request has been logged by the Shongre customer support team.",
  "support.contactPage.numeroDeDossier": "Case number",
  "support.contactPage.retourALAccueil": "Back home",
  "support.contactPage.envoyerUneAutreDemande": "Send another request",
  "support.contactPage.contacterLeSupportShongre": "Contact Shongre support",
  "support.contactPage.selectionnezLeMotifDeVotre":
    "Pick the reason for your request so we can route you to the right team.",
  "support.contactPage.1QuelEstLeSujet": "1. What is your request about?",
  "support.contactPage.2PrecisezVotreSituation":
    "2. Tell us about your situation",
  "support.contactPage.besoinDOuvrirUnLitige":
    "Need to open a dispute on a current order?",
  "support.contactPage.pourGelerLesFondsSous":
    "To freeze the funds held in escrow and be refunded if an item never arrives or is not as described, you must open a formal dispute from the transaction itself.",
  "support.contactPage.accederAMesAchatsPour":
    "Go to my purchases to open the dispute",
  "support.contactPage.leSupportShongreNIntervient":
    "Shongre support does not handle questions about the item itself (availability, price negotiation). Contact the seller directly through secure messaging.",
  "support.contactPage.ouvrirLaMessagerie": "Open messaging",
  "support.contactPage.piecesJointesOuCapturesD":
    "Attachments or screenshots (optional)",
  "support.contactPage.ajouterUneCaptureOuUn":
    "Add a screenshot or document (demo simulation)",
  "support.helpCenterPage.commentPouvonsNousVousAider": "How can we help?",
  "support.helpCenterPage.retrouvezLesReponsesAuxQuestions":
    "Find answers to common questions about escrow, delivery, publishing and your account.",
  "support.helpCenterPage.aucunArticleNeCorrespondA":
    "No article matches your search. You can contact our team below.",
  "support.helpCenterPage.notreEquipeDeSupportClient":
    "Our France-based customer support team helps you 7 days a week with your orders, listings and questions.",
  "support.supportRequestDetailPage.retourAMesDemandes2": "Back to my requests",
  "support.supportRequestDetailPage.ouvrirUneNouvelleDemande":
    "open a new request",
  "support.supportRequestDetailPage.repondreANotreEquipe": "Reply to our team",
  "support.supportRequestsPage.suivezLEtatDeVos":
    "Track your cases and talk directly to Shongre customer service.",
  "support.supportRequestsPage.siVousRencontrezUneDifficulte":
    "If you run into trouble with a transaction, a listing or your account, our team is here to help.",
  "support.supportRequestsPage.contacterLeSupport": "Contact support",
  "support.supportContextCard.annonceLiee": "Linked listing",
  "support.supportContextCard.commandeSequestreLie": "Linked order / escrow",
  "transactions.directPurchaseCheckoutModal.selectionnezParmiLesOptionsReellement":
    "Choose from the options actually available for this item.",
  "transactions.directPurchaseCheckoutModal.fondsConservesSousSequestreBancaire":
    "Funds held in bank escrow until the item is confirmed as described.",
  "transactions.directPurchaseCheckoutModal.paiementEnLigneTemporairementIndisponible":
    "Online payment temporarily unavailable",
  "transactions.directPurchaseCheckoutModal.leSystemeDeSequestreEn":
    "The online escrow system is temporarily unavailable on this market. You can contact the seller to arrange an in-person handover.",
  "transactions.directPurchaseCheckoutModal.referenceCommande":
    "Order reference:",
  "transactions.directPurchaseCheckoutModal.communiquezCeCodeAuVendeur":
    "Give this code to the seller at the meeting, and only after you have checked the item.",
  "transactions.transactionsPage.transactionsReservationsSequestre":
    "Transactions, reservations & escrow",
  "transactions.transactionsPage.gerezVosReservationsVosRemises":
    "Manage your reservations, your handovers and the release of secured funds",
  "transactions.transactionsPage.gererLeDossier": "Manage the case",
  "transactions.disputeModal.enOuvrantCeDossierAucun":
    "Once this case is open, no payout happens until the situation is settled between both parties or arbitrated by our team.",
  "transactions.disputeModal.motifPrincipalDuLitige":
    "Main reason for the dispute",
  "transactions.disputeModal.descriptionDetailleeDesFaits":
    "Detailed account of what happened",
  "transactions.leaveReviewModal.ceQueVousAvezParticulierement":
    "What you particularly appreciated:",
  "transactions.leaveReviewModal.commentaireDetailleFacultatif":
    "Detailed comment (optional)",
  "transactions.reservationCheckoutModal.detailsCouts": "Details & costs",
  "transactions.reservationCheckoutModal.paiementSequestre": "Escrow payment",
  "transactions.reservationCheckoutModal.rendezVousDirectAvecValidation":
    "Meet in person, confirmed with a 6-digit secret code.",
  "transactions.reservationCheckoutModal.retraitChezUnCommercantPartenaire":
    "Collect from a partner shop with real-time tracking (3–4 days).",
  "transactions.reservationCheckoutModal.directementDansVotreBoiteAux":
    "Straight to your letterbox, or signed for (48h).",
  "transactions.reservationCheckoutModal.continuerVersLeRecapitulatif":
    "Continue to the summary",
  "transactions.reservationCheckoutModal.lArgentNeSeraVerse":
    "The money is only paid to the seller once the item has been handed over as described. If the seller declines, or the item is not as described, you are refunded in full.",
  "transactions.reservationCheckoutModal.passerAuPaiementSecurise":
    "Go to secure payment",
  "transactions.reservationCheckoutModal.referenceDossier": "Case reference:",
  "transactions.reservationCheckoutModal.accederAuSuiviDeMa":
    "Track my reservation",
  "transactions.sellerPayoutModal.toutTransferer": "Transfer everything",
  "transactions.transactionDetailModal.articleReserve": "Item reserved",
  "transactions.transactionDetailModal.refuserEtRembourser":
    "Decline and refund",
  "transactions.transactionDetailModal.securiteMainPropre": "Handover safety",
  "transactions.transactionDetailModal.donnezCeCodeSecretA":
    "Give this 6-digit secret code to the seller at the meeting,",
  "transactions.transactionDetailModal.demandezALAcheteurSon":
    "Ask the buyer for their 6-digit confirmation code at handover to release your funds immediately:",
  "transactions.transactionDetailModal.validerLaRemise": "Confirm the handover",
  "transactions.transactionDetailModal.renseignerLeNumeroDeSuivi":
    "Enter the parcel tracking number:",
  "transactions.transactionDetailModal.siLeColisEstArrive":
    "If the parcel has arrived and the item matches the description, confirm receipt to release the funds to the seller.",
  "transactions.transactionDetailModal.jAiBienRecuL":
    "I received the item as described",
  "transactions.transactionDetailModal.enregistrerLeRendezVous":
    "Save the meeting",
  "transactions.transactionDetailModal.annulerMaReservation":
    "Cancel my reservation",
  "transactions.transactionDetailModal.laisserUneEvaluation": "Leave a review",
  "verification.verificationCenterPage.verifie": "Verified",
  "verification.verificationCenterPage.refuse": "Rejected",
  "verification.verificationCenterPage.nonCommence": "Not started",
  "verification.verificationCenterPage.centreDeConfianceSecurite":
    "Trust & security centre",
  "verification.verificationCenterPage.shongreUtiliseUnModeleDe":
    "Shongre uses a progressive trust model. Complete each step as you go to unlock higher limits and reassure the community.",
  "verification.verificationCenterPage.indiceDeConfiance": "Trust score",
  "verification.verificationCenterPage.modeDemonstrationSimulerUnProfil":
    "Demo mode: simulate a user profile",
  "verification.verificationCenterPage.checklistDesVerifications2":
    "Verification checklist",
  "verification.verificationCenterPage.completezChaqueDimensionPourRenforcer":
    "Complete each area to build buyer confidence and lift the limits on your account.",
  "verification.verificationCenterPage.debloquezChaquePalierPourAcceder":
    "Unlock each tier to reach its limits and reserved features.",
  "verification.verificationCenterPage.debloque": "Unlocked",
  "verification.verificationCenterPage.verrouille": "Locked",
  "verification.verificationCenterPage.historiqueInalterableDesChangementsD":
    "Tamper-proof history of status changes and compliance approvals.",
  "verification.verificationCenterPage.aucuneActionEnregistreePourLe":
    "No action recorded yet.",
  "verification.bankPayoutModal.coordonneesBancairesDeVirement":
    "Bank details for transfers",
  "verification.bankPayoutModal.sequestreSecuriseVirementsDeVentes":
    "Secure escrow & sales payouts",
  "verification.bankPayoutModal.nomDuTitulaireDuCompte":
    "Account holder's name",
  "verification.bankPayoutModal.leNomDoitCorrespondreA":
    "The name must match your identity document or your company's registered name.",
  "verification.bankPayoutModal.numeroIbanZoneSepa": "IBAN (SEPA area)",
  "verification.bankPayoutModal.etablissementBancaire": "Bank",
  "verification.businessVerificationModal.verificationEntrepriseKybKbis":
    "Business verification (KYB / KBIS)",
  "verification.businessVerificationModal.verifier": "Verify",
  "verification.businessVerificationModal.saisissezVotreSiretPourRemplir":
    "Enter your SIRET to fill in the official INSEE / SIRENE data automatically.",
  "verification.businessVerificationModal.adresseDuSiegeSocial":
    "Registered office address",
  "verification.businessVerificationModal.representantLegal":
    "Legal representative",
  "verification.businessVerificationModal.indiquezLIdentiteDuMandataire":
    "Give the identity of the company officer or director authorised to act for the business on Shongre.",
  "verification.businessVerificationModal.nomCompletDuRepresentantLegal":
    "Full name of the legal representative",
  "verification.businessVerificationModal.fonctionQualiteAuSeinDe":
    "Role / capacity within the company",
  "verification.businessVerificationModal.televersezLesDocumentsOfficielsAttestant":
    "Upload the official documents proving your organisation's legal existence and payment details.",
  "verification.businessVerificationModal.declarationDeConformite":
    "Compliance declaration",
  "verification.businessVerificationModal.declarationDesBeneficiairesEffectifsRbe":
    "Declaration of beneficial owners (RBE / AML-CTF)",
  "verification.businessVerificationModal.enApplicationDeLaDirective":
    "Under the European anti-money-laundering directive and the French Monetary and Financial Code, I certify that the registration details and declared beneficial owners are truthful and accurate.",
  "verification.businessVerificationModal.jeCertifieSurLHonneur":
    "I certify that the documents provided are accurate and accept Shongre's compliance check.",
  "verification.businessVerificationModal.validationInstantaneeParSimulationDu":
    "Instant approval by simulated RCS register lookup",
  "verification.identityVerificationModal.verificationDIdentiteOfficielleKyc":
    "Official identity verification (KYC)",
  "verification.identityVerificationModal.typeDePieceDIdentite":
    "Type of official identity document",
  "verification.identityVerificationModal.prenomS": "First name(s)",
  "verification.identityVerificationModal.nomDeFamille": "Surname",
  "verification.identityVerificationModal.dateDeNaissance": "Date of birth",
  "verification.identityVerificationModal.paysEmetteur": "Issuing country",
  "verification.identityVerificationModal.continuerVersLesDocuments":
    "Continue to documents",
  "verification.identityVerificationModal.televersezUnePhotoNetteEt":
    "Upload a sharp, uncropped photo of your original document. All four corners must be visible, with no glare.",
  "verification.identityVerificationModal.numeroDuDocumentFacultatifLu":
    "Document number (optional / read by OCR)",
  "verification.identityVerificationModal.verificationBiometrique":
    "Biometric check",
  "verification.identityVerificationModal.unRapideControleDePresence":
    "A quick liveness check confirms you are the rightful holder of the document provided.",
  "verification.identityVerificationModal.regardezLObjectifSansLunettes":
    "Look at the camera without sunglasses or headwear.",
  "verification.identityVerificationModal.validationInstantaneeParSimulationOcr":
    "Instant approval by simulated OCR / liveness check",
  "security.requireAuth.cettePageEstReserveeAux":
    "This page is for registered Shongre members. Sign in, or create a free account in a minute.",
  "security.requireAuth.creerUnCompte": "Create an account",
  "security.requirePermission.vousDevezEtreConnectePour":
    "You must be signed in to access this section.",
  "security.requirePermission.creerUnCompte": "Create an account",
  "security.requirePermission.retourALAccueil": "Back home",
  "security.requirePermission.contacterLeSupportDeSecurite":
    "Contact security support",
  "security.requirePermission.decouvrirLesOffresPro": "Explore the Pro plans",
  "security.requirePermission.retourAMonCompte": "Back to my account",

  // --- publishCta ---
  "publishCta.accountSuspended": "Account suspended",
  "publishCta.accountInactive": "Account inactive",
  "publishCta.suspendedShort": "Suspended",
  "publishCta.inactiveShort": "Inactive",
  "publishCta.postListing": "Post a listing",
  "publishCta.postListingShort": "Post",
  "publishCta.becomeSeller": "Become a seller",
  "publishCta.becomeSellerShort": "Sell",

  // --- home.trust ---

  /* --- Page metadata ---------------------------------------------------
     Document title and meta description for each routed page. Kept in the
     catalogue like any other visible copy: the title is read aloud on every
     route change and is the label of the browser tab. */
  "meta.favorites.title": "My saved listings",
  "meta.favorites.description": "Find the listings you have saved on Shongre.",
  "meta.savedSearches.title": "My saved searches",
  "meta.savedSearches.description":
    "Manage your saved searches and Shongre alerts.",
  "meta.messaging.title": "Messages",
  "meta.messaging.description":
    "Your conversations with buyers and sellers, offers and order tracking.",
  "meta.notifications.title": "Notification centre",
  "meta.notifications.description":
    "Search alerts, price drops and offer updates.",
  "meta.notificationPreferences.title": "Notification preferences",
  "meta.notificationPreferences.description":
    "Choose which alerts you receive on each channel.",
  "meta.transactions.title": "Transactions, reservations & escrow",
  "meta.transactions.description":
    "Track your purchases, sales and the release of funds.",
  "meta.verificationCenter.title": "Account security & verification",
  "meta.verificationCenter.description":
    "Email, phone, identity, business and bank details.",
  "meta.supportRequests.title": "Help & support",
  "meta.supportRequests.description":
    "Your Shongre support requests and their progress.",
  "meta.supportRequestDetail.title": "Support request detail",
  "meta.supportRequestDetail.description":
    "Follow your conversation with Shongre support.",
  "meta.accountOverview.title": "My account",
  "meta.accountOverview.description":
    "Overview of your account, verifications and contact details.",
  "meta.myListings.title": "Manage my listings",
  "meta.myListings.description":
    "Track views, activate visibility boosts and manage your stock.",
  "meta.proDashboard.title": "Pro seller dashboard",
  "meta.proDashboard.description":
    "Performance of your commercial catalogue and customer conversion.",
  "meta.proStorefrontEditor.title": "Customise my professional storefront",
  "meta.proStorefrontEditor.description":
    "Banner, introduction and highlights for your Pro shop.",
  "meta.publishWizard.title": "Post a listing",
  "meta.publishWizard.description":
    "Publish a listing on Shongre in three steps: category, description and handover.",
  "meta.newsletterPreferences.title": "Newsletter preferences",
  "meta.newsletterPreferences.description":
    "Manage your Shongre selections and deals subscriptions.",
  "meta.newsletterConfirm.title": "Subscription confirmation",
  "meta.newsletterConfirm.description":
    "Confirm your Shongre newsletter subscription.",
  "meta.newsletterUnsubscribe.title": "Newsletter unsubscribe",
  "meta.newsletterUnsubscribe.description":
    "Manage or end your Shongre newsletter subscription.",
  "meta.adminOverview.title": "Administration console",
  "meta.adminOverview.description": "Overview of platform governance.",
  "meta.adminModeration.title": "Moderation & reports",
  "meta.adminModeration.description":
    "Moderation queue for listings and reports.",
  "meta.adminUsers.title": "User directory & verifications",
  "meta.adminUsers.description":
    "Administration of individual, professional and internal accounts.",
  "meta.adminVerifications.title": "Verification & security desk",
  "meta.adminVerifications.description":
    "KYC, KYB and bank detail files awaiting review.",
  "meta.adminMarkets.title": "Multi-market & territory management",
  "meta.adminMarkets.description":
    "Configuration of markets, currencies and locales.",
  "meta.adminTaxonomy.title": "Taxonomy administration",
  "meta.adminTaxonomy.description":
    "Categories, subcategories and marketplace attributes.",
  "meta.adminMonetization.title": "Pro plans, quotas & promotion",
  "meta.adminMonetization.description":
    "Configuration of professional plans and paid options.",
  "meta.adminRolesMatrix.title": "Roles & permissions matrix",
  "meta.adminRolesMatrix.description":
    "Reference of platform roles and their permissions.",
  "meta.adminAuditLogs.title": "Security audit log",
  "meta.adminAuditLogs.description":
    "Journal of sensitive actions performed on the platform.",
  "meta.adminNewsletter.title": "Campaigns & newsletters",
  "meta.adminNewsletter.description":
    "History and preparation of marketing campaigns.",
  "meta.adminProviders.title": "Providers & external integrations",
  "meta.adminProviders.description":
    "Integration catalogue, routing and failover.",
  "meta.adminProviderDetail.title": "Provider configuration",
  "meta.adminProviderDetail.description":
    "Access keys, markets, health and audit log for this provider.",
  "meta.crmOverview.title": "CRM & pipeline dashboard",
  "meta.crmOverview.description": "Prospects, opportunities and sales tasks.",
  "meta.crmContacts.title": "Contacts & counterparts",
  "meta.crmContacts.description": "Directory of Shongre commercial contacts.",
  "meta.crmContactDetail.title": "Contact record",
  "meta.crmContactDetail.description":
    "History and opportunities linked to this contact.",
  "meta.crmCompanies.title": "Companies & B2B sellers",
  "meta.crmCompanies.description":
    "Directory of companies tracked by the sales team.",
  "meta.crmCompanyDetail.title": "Company record",
  "meta.crmCompanyDetail.description":
    "Contacts, opportunities and activity for this company.",
  "meta.crmPipeline.title": "Sales pipeline & Pro plans",
  "meta.crmPipeline.description":
    "Tracking of negotiations and professional subscriptions.",
  "meta.crmAiProspecting.title": "AI-assisted prospecting",
  "meta.crmAiProspecting.description":
    "Find qualified future professional sellers.",
  "meta.crmTasks.title": "Tasks & sales follow-ups",
  "meta.crmTasks.description": "Reminders, demos and scheduled follow-ups.",

  /* --- Accessible names carrying their target ---------------------------
     Repeated icon controls (tree rows, kanban cards, log rows) previously had
     only a `title`, which is not surfaced on touch and repeated verbatim for
     every row. These name the row they act on. */
  "admin.taxonomyHierarchyTree.replierNode": "Collapse {name}",
  "admin.taxonomyHierarchyTree.deplierNode": "Expand {name}",
  "admin.taxonomyHierarchyTree.monterNode": "Move {name} up one place",
  "admin.taxonomyHierarchyTree.descendreNode": "Move {name} down one place",
  "admin.taxonomyHierarchyTree.ajouterSousRubriqueNode":
    "Add a subcategory to {name}",
  "admin.crmPipelinePage.etapePrecedenteOpp":
    "Move “{name}” to the previous stage",
  "admin.crmPipelinePage.etapeSuivanteOpp": "Move “{name}” to the next stage",
  "admin.adminAuditLogsPage.voirLePayloadDe":
    "View the full payload for “{action}”",

  /* Accessible names for controls that previously had only a placeholder. */
  "messaging.messageComposer.votreMessage": "Your message",
  "profile.sellerCatalog.prixMinimum": "Minimum price in euros",
  "profile.sellerCatalog.prixMaximum": "Maximum price in euros",
  "publishing.publishWizard.rechercherUneCategorie":
    "Search for a category or item type",
  "admin.taxonomyNodeEditor.copierLIdStable": "Copy stable identifier {id}",
  "messaging.conversationList.filtres": "conversation filters",
  "common.scrollRailLeft": "Scroll {label} left",
  "common.scrollRailRight": "Scroll {label} right",
  "admin.crmPipelinePage.colonnesDuPipeline": "pipeline columns",
  "messaging.conversationList.messagerie": "Messages",

  /* Counted, so French keeps 0 in the singular and other locales get their
     own few/many categories instead of a hand-rolled `> 1 ? 's' : ''`. */
  "admin.adminUsersPage.utilisateursTrouves_one": "{count} user found",
  "admin.adminUsersPage.utilisateursTrouves_other": "{count} users found",
  "proDirectory.boutiquesDisponibles_one": "{count} shop available",
  "proDirectory.boutiquesDisponibles_other": "{count} shops available",
  "notifications.notificationPreferencesPage.canalPourAlerte":
    "{channel} — {alert}",
  "notifications.notificationPreferencesPage.canalApplication": "In the app",
  "notifications.notificationPreferencesPage.canalEmail": "By email",
  "notifications.notificationPreferencesPage.canalPush": "On mobile (push)",
  "common.removeFilter": "Remove the {name} filter",
  "admin.accountType.individual": "Individual account",
  "admin.accountType.professional": "Professional account",
  "admin.accountType.internal": "Internal staff",
  "shell.demoRoleSwitcher.roleHorsPersonasDemo":
    "Platform role outside the demo personas",
  "sellerworkspace.proDashboardPage.pasEncoreDeDonnees": "No data yet",
  "sellerworkspace.proDashboardPage.totalVuesUniques":
    "Total: {count} unique views",
  "errors.notFoundPage.explorerLesCategories": "Browse categories",
  "errors.notFoundPage.toutesLesCategories": "All categories",
};
