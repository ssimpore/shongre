import React from "react";
import { Modal } from "../../design-system/primitives/Modal";
import { Button } from "../../design-system/primitives/Button";
import { useTranslation } from "../../i18n/I18nProvider";
import { useMarketLocation } from "../providers/MarketLocationProvider";

export const MarketChangeConfirmationModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    pendingMarketChange,
    isChangingMarket,
    marketChangeFailed,
    confirmMarketChange,
    cancelMarketChange,
  } = useMarketLocation();

  return (
    <Modal
      isOpen={Boolean(pendingMarketChange)}
      onClose={cancelMarketChange}
      title={t("shell.marketDetection.confirmTitle")}
      description={
        pendingMarketChange
          ? t("shell.marketDetection.confirmCrossDomain", {
              country: pendingMarketChange.name,
            })
          : undefined
      }
      maxWidth="md"
    >
      {marketChangeFailed ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          {t("shell.marketDetection.handoffFailed")}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={cancelMarketChange}
          disabled={isChangingMarket}
        >
          {t("common.cancel")}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={confirmMarketChange}
          disabled={isChangingMarket}
        >
          {isChangingMarket
            ? t("common.loading")
            : pendingMarketChange
              ? t("shell.marketDetection.confirmAction", {
                  country: pendingMarketChange.name,
                })
              : t("common.confirm")}
        </Button>
      </div>
    </Modal>
  );
};
