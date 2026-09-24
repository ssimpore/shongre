/**
 * French copy loaded with the seller-owned surfaces — the publish wizard's
 * photo assist, price estimate and timing card, and the workspace's away mode
 * and auto-renew controls — instead of the shared shell. Every visitor pays
 * for the shell; only a seller opens these.
 */
export const sellerCatalogueFr = {
  "publishing.publishWizard.timing.title": "Publication et renouvellement",
  "publishing.publishWizard.timing.description":
    "Publiez maintenant ou à la date de votre choix, et gardez l’annonce en ligne sans y penser.",
  "publishing.publishWizard.timing.scheduleLabel":
    "Publier plus tard (facultatif)",
  "publishing.publishWizard.timing.scheduleHint":
    "Entre 15 minutes et 30 jours. L’annonce reste un brouillon jusqu’à cette date.",
  "publishing.publishWizard.timing.scheduleError":
    "Choisissez une date entre 15 minutes et 30 jours après maintenant.",
  "publishing.publishWizard.timing.publishNow":
    "Finalement, publier maintenant",
  "publishing.publishWizard.timing.autoRenewLabel":
    "Renouveler automatiquement",
  "publishing.publishWizard.timing.autoRenewDescription":
    "À l’expiration, l’annonce est prolongée d’une période équivalente, jusqu’à trois fois. Sa date de publication ne change pas.",
  "publishing.publishWizard.timing.scheduledToast":
    "Votre annonce sera publiée le {date}.",
  "publishing.publishWizard.photoAssist.title": "Pré-remplir depuis vos photos",
  "publishing.publishWizard.photoAssist.description":
    "L’assistant propose un titre, une description et, s’il les voit, la marque et le modèle. Vous gardez la main sur tout.",
  "publishing.publishWizard.photoAssist.action": "Analyser les photos",
  "publishing.publishWizard.photoAssist.noPhotos":
    "Ajoutez au moins une photo pour lancer l’assistant.",
  "publishing.publishWizard.photoAssist.applied":
    "Proposition appliquée aux champs encore vides. Relisez avant de publier.",
  "publishing.publishWizard.photoAssist.nothingRecognized":
    "L’assistant n’a rien reconnu de sûr sur ces photos.",
  "publishing.publishWizard.photoAssist.error":
    "L’assistance photo est indisponible pour le moment.",
  "publishing.publishWizard.photoAssist.categoryHint":
    "Ces photos ressemblent plutôt à « {label} ».",
  "publishing.publishWizard.photoAssist.useCategory":
    "Utiliser cette catégorie",
  "publishing.publishWizard.priceEstimate.soldTitle_one":
    "Prix constaté sur {count} vente récente d’articles comparables",
  "publishing.publishWizard.priceEstimate.soldTitle_other":
    "Prix constatés sur {count} ventes récentes d’articles comparables",
  "publishing.publishWizard.priceEstimate.askingTitle_one":
    "Prix demandé pour {count} annonce comparable en ligne",
  "publishing.publishWizard.priceEstimate.askingTitle_other":
    "Prix demandés pour {count} annonces comparables en ligne",
  "publishing.publishWizard.priceEstimate.range":
    "La moitié se situe entre {low} et {high} ; prix médian {median}.",
  "publishing.publishWizard.priceEstimate.advisory":
    "À titre indicatif : votre prix reste libre.",
  "sellerworkspace.autoRenew.badge": "Renouvellement auto",
  "sellerworkspace.autoRenew.toggle":
    "Renouvellement automatique à l’expiration",
  "sellerworkspace.autoRenew.enabledToast":
    "Renouvellement automatique activé : l’annonce sera prolongée à son expiration, jusqu’à trois fois.",
  "sellerworkspace.autoRenew.disabledToast":
    "Renouvellement automatique désactivé.",
  "sellerworkspace.autoRenew.error":
    "Le réglage n’a pas été enregistré. Réessayez.",
  "sellerworkspace.scheduled.badge": "Programmée le {date}",
  "sellerworkspace.away.title": "Mode absence",
  "sellerworkspace.away.description":
    "Partez l’esprit tranquille : vos annonces sont mises en pause et les acheteurs sont prévenus de votre retour.",
  "sellerworkspace.away.activeTitle": "Absent jusqu’au {date}",
  "sellerworkspace.away.activeDescription":
    "Vos annonces sont en pause et reviendront en ligne automatiquement à votre retour.",
  "sellerworkspace.away.start": "Activer",
  "sellerworkspace.away.end": "Je suis de retour",
  "sellerworkspace.away.untilLabel": "Date de retour",
  "sellerworkspace.away.untilHint": "Entre demain et 90 jours.",
  "sellerworkspace.away.messageLabel":
    "Message pour les acheteurs (facultatif)",
  "sellerworkspace.away.messageHint": "{count}/{max} caractères",
  "sellerworkspace.away.messagePlaceholder":
    "Ex. : De retour le 12, je réponds dès mon retour.",
  "sellerworkspace.away.confirm": "Activer le mode absence",
  "sellerworkspace.away.enabledToast_one":
    "Mode absence activé : {count} annonce mise en pause.",
  "sellerworkspace.away.enabledToast_other":
    "Mode absence activé : {count} annonces mises en pause.",
  "sellerworkspace.away.endedToast_one":
    "Bon retour ! {count} annonce est de nouveau en ligne.",
  "sellerworkspace.away.endedToast_other":
    "Bon retour ! {count} annonces sont de nouveau en ligne.",
  "sellerworkspace.away.error":
    "Le mode absence n’a pas été enregistré. Réessayez.",
  "sellerworkspace.removal.deleted": "Le brouillon a été supprimé.",
  "sellerworkspace.removal.archived":
    "L’annonce n’est plus en ligne. Elle reste dans vos annonces archivées avec ses messages et ses commandes.",
  "sellerworkspace.removal.error": "L’annonce n’a pas pu être retirée.",
  "sellerworkspace.removal.confirmDraft":
    "Ce brouillon sera supprimé définitivement.",
  "sellerworkspace.removal.confirmPublished":
    "L’annonce sera retirée du site. Elle restera dans vos annonces archivées avec ses messages et ses commandes.",
  "sellerworkspace.removal.confirmAction": "Retirer du site",
  "sellerworkspace.removal.confirmDelete": "Supprimer",
} as const;

export type SellerMessageKey = keyof typeof sellerCatalogueFr;
