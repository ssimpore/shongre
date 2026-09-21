/**
 * French copy for the internal Staff console.
 *
 * Held out of `messages.fr` because it is Staff-only: shipped in the shared
 * shell it was 151.6 KiB of source (40.1 KiB gzip) downloaded by every
 * anonymous visitor to the homepage, for screens they can never open. Admin
 * surfaces load it explicitly through `useTranslation(adminCatalogueFr)`, the
 * same supplemental-catalogue path the delivery and digital catalogues use.
 */
export const adminCatalogueFr = {
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
  "admin.homepageConfigurationPanel.automaticCollections":
    "Automatique : catégories avec des annonces",
  "admin.homepageConfigurationPanel.manualCollections":
    "Manuelle : choisir et ordonner les catégories",
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
  "admin.currencies.enable": "Activer",
  "admin.currencies.disable": "Désactiver",
  "admin.currencies.code": "Code ISO 4217",
  "admin.currencies.name": "Nom public",
  "admin.currencies.symbol": "Symbole",
  "admin.currencies.minorDigits": "Décimales de la devise",
  "admin.currencies.currencyEnabled": "Devise disponible",
  "admin.currencies.rateEnabled": "Taux disponible",
  "admin.currencies.reason": "Motif auditable",
  "admin.currencies.reasonHint": "{minimum} caractères minimum.",
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
  "admin.currencies.marketRateRequirement":
    "Une devise doit être active et disposer d’un taux valide avant la soumission.",
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
  "admin.taxonomyHeader.title": "Navigation de l’en-tête",
  "admin.taxonomyHeader.description":
    "Sélectionnez les catégories et les liens de ce marché, définissez leur ordre et leur visibilité, et adaptez les libellés des liens.",
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
  "admin.taxonomyHeader.selectedTitle": "Entrées de navigation ({count})",
  "admin.taxonomyHeader.linkLabel": "Libellé de {name}",
  "admin.taxonomyHeader.empty":
    "Aucune entrée de navigation n’est configurée pour ce marché.",
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

  // --- API environment toolbar ---
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
  "admin.taxonomyNodeEditor.copierLIdStable":
    "Copier l'identifiant stable {id}",
  "admin.crmPipelinePage.colonnesDuPipeline": "colonnes du pipeline",
  "admin.adminUsersPage.utilisateursTrouves_one": "{count} utilisateur trouvé",
  "admin.adminUsersPage.utilisateursTrouves_other":
    "{count} utilisateurs trouvés",
  "admin.accountType.individual": "Compte particulier",
  "admin.accountType.professional": "Compte professionnel",
  "admin.accountType.internal": "Collaborateur interne",
  "admin.accountType.staff": "Collaborateur interne",
  "admin.staff.filterLabel": "Filtrer par statut Staff",
  "admin.staff.filterAll": "Tous les statuts Staff",
  "admin.staff.status.none": "Aucun accès Staff",
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
  "admin.immo.marketsTableLabel": "Tableau des marchés immobiliers",
  "admin.immo.visibilityOptionsTableLabel": "Tableau des options de visibilité",
  "admin.immo.listingsTableLabel": "Tableau des annonces immobilières",
  "admin.solutions.catalogTableLabel": "Tableau du catalogue de solutions",
  "admin.monetization.firstTableLabel": "Tableau des grilles de commission",
  "admin.monetization.secondTableLabel": "Tableau des paliers de commission",
  "admin.employment.tableLabel": "Tableau des offres d’emploi",
  "admin.auto.tableLabel": "Tableau des annonces automobiles",
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
  "admin.adminTaxonomyPage.schemaV1Migration": "Schéma v4 & Migration",
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
  "admin.homepageConfigurationPanel.nombreMaximalDAnnonces":
    "Nombre maximal d’annonces",
  "admin.homepageConfigurationPanel.nombreMinimalDAnnoncesEligibles":
    "Nombre minimal d’annonces éligibles",
  "admin.homepageConfigurationPanel.categoriesDeLExplorateur":
    "Catégories de l’explorateur",
  "admin.homepageConfigurationPanel.categoriesDeLExplorateurDescription":
    "Sélectionnez les univers, leur ordre, leur seuil, leur visibilité et leurs marchés cibles.",
  "admin.homepageConfigurationPanel.marchesCibles": "Marchés cibles",
  "admin.homepageConfigurationPanel.sousSectionActive": "Sous-section active",
  "admin.homepageConfigurationPanel.collectionsAffichees":
    "Collections affichées",
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
  "admin.taxonomyEditor.title": "Révisions du référentiel",
  "admin.taxonomyEditor.description":
    "Modifiez le brouillon partagé, examinez les contrôles puis publiez une révision commune aux parcours.",
  "admin.taxonomyEditor.failed": "Impossible de charger la taxonomie.",
  "admin.taxonomyEditor.invalidRecords":
    "Le fichier doit contenir des objets de taxonomie.",
  "admin.taxonomyEditor.saved":
    "Brouillon enregistré. La révision publique reste disponible jusqu’à publication.",
  "admin.taxonomyEditor.published": "Révision publiée.",
  "admin.taxonomyEditor.restored": "Révision publique restaurée.",
  "admin.taxonomyEditor.conflict":
    "La révision a changé pendant l’export. Rechargez puis recommencez.",
  "admin.taxonomyEditor.reload": "Recharger",
  "admin.taxonomyEditor.loading": "Chargement…",
  "admin.taxonomyEditor.draftRevision": "Brouillon",
  "admin.taxonomyEditor.publishedRevision": "Publication",
  "admin.taxonomyEditor.resource": "Ressource",
  "admin.taxonomyEditor.record": "Enregistrement",
  "admin.taxonomyEditor.empty": "Aucun enregistrement.",
  "admin.taxonomyEditor.previous": "Précédent",
  "admin.taxonomyEditor.next": "Suivant",
  "admin.taxonomyEditor.add": "Ajouter",
  "admin.taxonomyEditor.export": "Exporter la ressource",
  "admin.taxonomyEditor.import": "Importer un fichier",
  "admin.taxonomyEditor.importReady":
    "Import chargé dans l’éditeur. Vérifiez les définitions avant l’enregistrement.",
  "admin.taxonomyEditor.definition": "Définition structurée (JSON)",
  "admin.taxonomyEditor.importLimit":
    "Les imports sont enregistrés dans le brouillon par lots de 200. En cas d’erreur, rechargez pour voir les lots enregistrés. Vérifiez l’ensemble avant publication.",
  "admin.taxonomyEditor.reason": "Motif de la modification",
  "admin.taxonomyEditor.save": "Enregistrer le brouillon",
  "admin.taxonomyEditor.preview": "Contrôler le brouillon",
  "admin.taxonomyEditor.publish": "Publier la révision",
  "admin.taxonomyEditor.valid": "Structure valide",
  "admin.taxonomyEditor.invalid": "Erreurs de structure à corriger",
  "admin.taxonomyEditor.impact":
    "Impact — catégories / types d’annonce / champs / options :",
  "admin.taxonomyEditor.contentReview":
    "Les contrôles de structure ne certifient pas l’exhaustivité métier ni les règles juridiques. Examinez les avertissements.",
  "admin.taxonomyEditor.history": "Historique des publications",
  "admin.taxonomyEditor.restore": "Restaurer",
  "admin.taxonomyEditor.resource.categories": "Hiérarchie",
  "admin.taxonomyEditor.resource.listingTypes": "Types d’annonce",
  "admin.taxonomyEditor.resource.attributes": "Champs réutilisables",
  "admin.taxonomyEditor.resource.attributeGroups": "Groupes de champs",
  "admin.taxonomyEditor.resource.optionSets": "Jeux d’options",
  "admin.taxonomyEditor.resource.options": "Options et références",
  "admin.taxonomyEditor.resource.optionParentLinks":
    "Dépendances entre options",
  "admin.taxonomyEditor.resource.bindings": "Règles des champs par catégorie",
  "admin.taxonomyEditor.resource.dependencies": "Conditions de formulaire",
  "admin.taxonomyEditor.resource.validationRules": "Règles de validation",
  "admin.taxonomyEditor.resource.aliases": "Identités historiques",
  "admin.taxonomy.editReferences": "Modifier dans la taxonomie",
  "admin.taxonomy.referenceActive": "Actif",
  "admin.taxonomy.referenceInactive": "Inactif",
  "admin.taxonomyEditor.resource.referenceEntries": "Référentiels des domaines",
  "admin.taxonomyEditor.resource.referenceData": "Sources et statut de revue",
  "admin.taxonomyEditor.resource.presentations": "Présentation et parcours",
  "admin.taxonomyEditor.resource.discovery": "Recherche et référencement",
  "admin.taxonomyV1GovernanceTab.gouvernanceDuSchemaV1Genere":
    "Gouvernance du schéma v4 généré",
  "admin.taxonomyV1GovernanceTab.projectionPubliqueEnLectureSeuleLesReglesPriveesJuridiquesEt":
    "Projection publique en lecture seule. Les règles privées, juridiques et de risque restent exclusivement côté backend.",
  "admin.taxonomyV1GovernanceTab.ressourcesDeTaxonomieV1":
    "Ressources de taxonomie v1",
  "admin.taxonomyV1GovernanceTab.rechercherUnTypeDAnnonce":
    "Rechercher un type d’annonce",
  "admin.taxonomyV1GovernanceTab.marchesActifs": "Marchés actifs",
  "admin.taxonomyV1GovernanceTab.100ResultatsAffichesSur":
    "100 résultats affichés sur",
  "admin.taxonomyV1GovernanceTab.liensParentEnfantExplicitesPilotentLesSelecteursEnCascadeSans":
    "liens parent-enfant explicites pilotent les sélecteurs en cascade sans dupliquer les options.",
  "admin.taxonomyV1GovernanceTab.matriceResolue": "Matrice résolue",
  "admin.taxonomyV1GovernanceTab.liaisonsSourcesFiltreesDansCetteProjectionPourExclureLesChamps":
    "liaisons sources, filtrées dans cette projection pour exclure les champs privés.",
  "admin.taxonomyV1GovernanceTab.frBeEtChSontDisponiblesSelonChaqueEnregistrementSn":
    "FR, BE et CH sont disponibles selon chaque enregistrement. SN et BF restent « bientôt disponible », non publiables et non indexables.",
  "admin.taxonomyV1GovernanceTab.lEligibiliteParticulierProfessionnelEstPorteeParLesCategoriesTypes":
    "L’éligibilité particulier/professionnel est portée par les catégories, types d’annonce et attributs, puis résolue côté backend.",
  "admin.taxonomyV1GovernanceTab.sourceNormalisee": "… · source normalisée",
  "admin.taxonomyV1GovernanceTab.identitesV3Revues": "identités v3 revues ·",
  "admin.taxonomyV1GovernanceTab.annoncesDeDemonstrationConserveesAucunReferencementAmbigu":
    "annonces de démonstration conservées · aucun référencement ambigu.",
  "admin.taxonomyV1GovernanceTab.dryRunDesAnnoncesDeDemonstration":
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
  "admin.adminOverviewPage.actionQueueTitle": "À traiter",
  "admin.adminOverviewPage.actionQueueDescription":
    "Uniquement les dossiers autorisés par votre rôle et votre périmètre.",
  "admin.adminOverviewPage.reviewReports": "Examiner les signalements",
  "admin.adminOverviewPage.reviewProfessionals": "Vérifier les professionnels",
  "admin.adminOverviewPage.openItems": "dossiers ouverts",
  "admin.adminOverviewPage.traiterSignalementsCount":
    "Traiter les signalements ({count})",

  // --- Delivery & courier -------------------------------------------------
} as const;

export type AdminMessageKey = keyof typeof adminCatalogueFr;
