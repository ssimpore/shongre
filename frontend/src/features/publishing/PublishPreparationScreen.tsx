import React from "react";
import { Camera, ClipboardList, Truck } from "lucide-react";
import { OnboardingPreparationPage } from "../../design-system/components/OnboardingPreparationPage";
import { useTranslation } from "../../i18n/I18nProvider";

interface PublishPreparationScreenProps {
  hasSavedDraft: boolean;
  isReady: boolean;
  onStart: () => void;
}

export const PublishPreparationScreen: React.FC<
  PublishPreparationScreenProps
> = ({ hasSavedDraft, isReady, onStart }) => {
  const { t } = useTranslation();

  return (
    <OnboardingPreparationPage
      eyebrow={t("publishing.publishWizard.votreAnnonce")}
      title={t("publishing.preparation.title")}
      description={t("publishing.preparation.description")}
      checklistTitle={t("publishing.preparation.checklistTitle")}
      items={[
        {
          title: t("publishing.preparation.photosTitle"),
          description: t("publishing.preparation.photosDescription"),
          icon: Camera,
        },
        {
          title: t("publishing.preparation.detailsTitle"),
          description: t("publishing.preparation.detailsDescription"),
          icon: ClipboardList,
        },
        {
          title: t("publishing.preparation.handoverTitle"),
          description: t("publishing.preparation.handoverDescription"),
          icon: Truck,
        },
      ]}
      actionLabel={t(
        hasSavedDraft
          ? "publishing.preparation.resume"
          : "publishing.preparation.start",
      )}
      durationLabel={t("publishing.preparation.duration")}
      statusLabel={t(
        !isReady
          ? "publishing.preparation.loadingDraft"
          : hasSavedDraft
            ? "publishing.preparation.savedDraftReady"
            : "publishing.preparation.autosave",
      )}
      onStart={onStart}
      isReady={isReady}
    />
  );
};
