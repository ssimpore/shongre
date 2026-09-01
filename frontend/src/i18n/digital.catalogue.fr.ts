/**
 * Feature-local French catalogue for the lazily loaded digital-product flows.
 * Shared cards, menus, and transaction surfaces keep their small label subset
 * in the application-shell catalogue.
 */
export const digitalMessagesFr = {
  "digital.common.title": "Produits numériques",
  "digital.common.simulated": "Simulation — aucun paiement ni accès réel",
  "digital.common.noShipping": "Aucune livraison physique",
  "digital.common.loading": "Chargement des accès numériques…",
  "digital.common.error":
    "Les informations numériques sont temporairement indisponibles.",
  "digital.common.retry": "Réessayer",
  "digital.common.empty": "Aucun achat numérique pour ce marché.",
  "digital.purchases.title": "Mes achats numériques",
  "digital.purchases.description":
    "Téléchargements, liens, identifiants et accès en préparation sont regroupés ici.",
  "digital.purchases.download": "Télécharger",
  "digital.purchases.open": "Ouvrir le lien",
  "digital.purchases.reveal": "Afficher mes accès",
  "digital.purchases.provisioning": "Accès en préparation",
  "digital.purchases.copy": "Copier",
  "digital.purchases.copied": "Copié",
  "digital.purchases.mask": "Masquer les accès",
  "digital.purchases.leaveTitle": "Vous quittez Shongre",
  "digital.purchases.leaveDescription":
    "Vérifiez le domaine avant de poursuivre. Les paramètres secrets du lien restent masqués.",
  "digital.purchases.continue": "Continuer vers le service",
  "digital.purchases.cancel": "Annuler",
  "digital.purchases.report": "Signaler un problème d’accès",
  "digital.purchases.reportDescription":
    "Décrivez le problème sans saisir de lien, mot de passe, code ou autre secret.",
  "digital.purchases.reportSubmit": "Envoyer au support",
  "digital.purchases.reportSent":
    "Le signalement a été transmis sans inclure de secret.",
  "digital.purchases.unavailable": "Accès indisponible",
  "digital.purchases.expired": "Accès expiré",
  "digital.purchases.revoked": "Accès révoqué",
  "digital.purchases.limitReached": "Limite d’accès atteinte",
  "digital.purchases.paymentPending": "Paiement en cours de confirmation",
  "digital.purchases.paymentFailed": "Paiement échoué ou annulé",
  "digital.purchases.processing": "Préparation de l’accès",
  "digital.purchases.disputed": "Accès suspendu pendant le litige",
  "digital.purchases.refunded": "Commande remboursée",
  "digital.purchases.available": "Accès disponible",
  "digital.purchases.version": "Version {version}",
  "digital.fulfillment.heading": "Mode de remise du produit",
  "digital.fulfillment.description":
    "Choisissez explicitement une remise physique ou numérique. La catégorie ne décide jamais du mode de remise.",
  "digital.fulfillment.physical": "Produit physique",
  "digital.fulfillment.file": "Fichier à télécharger",
  "digital.fulfillment.link": "Lien d’accès",
  "digital.fulfillment.credentials": "Lien et identifiants",
  "digital.fulfillment.provisioned": "Accès créé après paiement",
  "digital.fulfillment.combined": "Lien et identifiants combinés",
  "digital.fulfillment.profileRequired":
    "Acceptez d’abord les responsabilités vendeur applicables à ce marché.",
  "digital.fulfillment.policyDisabled":
    "La vente numérique reste désactivée tant que les décisions de marché requises ne sont pas approuvées.",
  "digital.fulfillment.productVersion": "Version du produit",
  "digital.fulfillment.receivedDescription": "Ce que l’acheteur recevra",
  "digital.fulfillment.compatibility": "Compatibilité, une valeur par ligne",
  "digital.fulfillment.requirements": "Prérequis, une valeur par ligne",
  "digital.fulfillment.provisioningHours": "Délai de remise en heures",
  "digital.fulfillment.privateFile": "Fichier privé payé",
  "digital.fulfillment.upload": "Téléverser et contrôler",
  "digital.fulfillment.uploading": "Téléversement et contrôle en cours…",
  "digital.fulfillment.linkLabel": "Lien d’accès secret",
  "digital.fulfillment.displayDomain": "Domaine affiché à l’acheteur",
  "digital.fulfillment.accessClass": "Classe d’accès autorisée",
  "digital.fulfillment.username": "Identifiant",
  "digital.fulfillment.password": "Mot de passe, code ou clé",
  "digital.fulfillment.protect": "Valider et protéger l’accès",
  "digital.fulfillment.protected": "Accès chiffré et masqué",
  "digital.fulfillment.uniqueInventory": "Clés uniques, une par ligne",
  "digital.fulfillment.importInventory": "Chiffrer et importer l’inventaire",
  "digital.fulfillment.inventoryReady": "{count} accès uniques disponibles",
  "digital.fulfillment.ready":
    "Configuration prête pour validation et modération.",
  "digital.seller.title": "Vendre des produits numériques",
  "digital.seller.description":
    "Configurez les modes de remise que vous utilisez et consultez les exigences projetées par la politique du marché.",
  "digital.seller.save": "Accepter les responsabilités",
  "digital.seller.current": "Responsabilités à jour pour la version {version}",
  "digital.seller.requirements": "Exigences applicables",
  "digital.seller.noReacceptance":
    "Les vendeurs existants ne sont sollicités à nouveau que lorsqu’une nouvelle version de politique l’exige.",
  "digital.seller.invalidCombination":
    "Cette combinaison de modes de remise n’est pas autorisée pour ce marché.",
  "digital.seller.security":
    "Les fichiers privés, liens, identifiants et codes ne doivent jamais être placés dans le texte public de l’annonce. La remise et l’assistance restent soumises aux contrôles affichés ci-dessous.",
  "digital.seller.files": "Fichiers autorisés",
  "digital.seller.verification": "Vérifications requises",
  "digital.seller.provisioningDeadline": "Délai maximal de préparation",
  "digital.seller.accessLimits": "Téléchargements / affichages par défaut",
  "digital.seller.tasks": "Accès à préparer",
  "digital.seller.tasksDescription":
    "Seules les commandes dont le paiement a été confirmé par Shongre apparaissent ici. Les données saisies sont protégées et ne sont jamais envoyées dans les notifications.",
  "digital.seller.noTasks": "Aucun accès numérique n’est à préparer.",
  "digital.seller.taskDeadline": "À remettre avant le {date}",
  "digital.seller.destinationUrl": "Lien HTTPS d’accès",
  "digital.seller.username": "Identifiant facultatif",
  "digital.seller.accessSecret": "Mot de passe, code ou clé",
  "digital.seller.completeTask": "Protéger et remettre l’accès",
  "digital.admin.title": "Opérations produits numériques",
  "digital.admin.description":
    "États des fichiers, inventaires, accès et signalements sans afficher les secrets ni les clés de stockage.",
  "digital.admin.assets": "Fichiers privés",
  "digital.admin.inventory": "Inventaires d’accès",
  "digital.admin.reports": "Signalements ouverts",
  "digital.admin.entitlements": "Droits d’accès",
  "digital.admin.approve": "Approuver",
  "digital.admin.reject": "Rejeter",
  "digital.admin.policy": "Politique de marché",
  "digital.admin.policyDescription":
    "Les changements créent une nouvelle version désactivée. L’activation exige des preuves fiscales, juridiques, de remboursement, de retrait et de paiement.",
  "digital.admin.categories":
    "Identifiants de catégories autorisées, séparés par des virgules",
  "digital.admin.domains":
    "Domaines externes approuvés, séparés par des virgules",
  "digital.admin.mimeTypes": "Types MIME autorisés",
  "digital.admin.extensions": "Extensions autorisées",
  "digital.admin.accessClasses": "Classes d’accès autorisées",
  "digital.admin.prohibitedClasses": "Classes d’accès interdites",
  "digital.admin.taxEvidence": "Version de politique fiscale approuvée",
  "digital.admin.refundEvidence":
    "Version de politique de remboursement approuvée",
  "digital.admin.withdrawalEvidence":
    "Version de présentation du retrait approuvée",
  "digital.admin.paymentEvidence": "Configuration de paiement approuvée",
  "digital.admin.legalEvidence": "Preuve d’approbation juridique",
  "digital.admin.fulfillmentTypes": "Modes de remise autorisés",
  "digital.admin.capabilities": "Capacités activables",
  "digital.admin.changeReason": "Motif auditable du changement",
  "digital.admin.createDraft": "Créer une version désactivée",
  "digital.admin.activate": "Activer cette version",
  "digital.admin.failClosed":
    "Une version incomplète ou sans preuves reste désactivée. Son activation impose une nouvelle acceptation aux vendeurs concernés.",
  "digital.asset.processing": "Traitement en cours",
  "digital.asset.ready": "Prêt",
  "digital.asset.quarantined": "En quarantaine",
  "digital.asset.rejected": "Rejeté",
  "digital.asset.unavailable": "Indisponible",
  "digital.checkout.processing":
    "Retour du prestataire reçu. Le paiement reste en cours de confirmation par le serveur ; aucun accès n’est encore accordé.",
  "digital.checkout.cancelled":
    "Le paiement a été annulé. Aucun accès numérique n’a été accordé.",
  "digital.checkout.refresh": "Actualiser l’état",
  "digital.nav.purchases": "Achats numériques",
  "digital.nav.seller": "Vente numérique",
  "digital.nav.admin": "Produits numériques",
  "meta.digitalPurchases.title": "Mes achats numériques",
  "meta.digitalPurchases.description":
    "Accès authentifié aux achats numériques Shongre.",
  "meta.digitalSeller.title": "Vendre des produits numériques",
  "meta.digitalSeller.description":
    "Responsabilités et modes de remise numériques du vendeur.",
  "meta.digitalAdmin.title": "Administration des produits numériques",
  "meta.digitalAdmin.description":
    "Vue opérationnelle privée des produits numériques Shongre.",
} as const;

export type DigitalMessageKey = keyof typeof digitalMessagesFr;
