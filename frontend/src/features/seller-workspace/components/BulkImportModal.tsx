import React, { useState } from "react";
import {
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { Badge } from "../../../design-system/primitives/Badge";
import { useToast } from "../../../app/providers/ToastProvider";
import { UserProfile } from "../../../types";
import { useTranslation } from "../../../i18n/I18nProvider";
import { services } from "../../../api/client/service-registry";
import type {
  BulkImportValidationCode,
  BulkListingImportRow,
} from "../../../api/contracts/listings.contract";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { useRegionalFormatters } from "../../../hooks/useRegionalFormatters";
import { PUBLICATION_CONSTRAINTS } from "@shongre/contracts/publication";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onImportCompleted: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onImportCompleted,
}) => {
  const { t, locale } = useTranslation();
  const { activeMarket, location } = useMarketLocation();
  const { formatMoney } = useRegionalFormatters();
  const toast = useToast();
  const [parsedItems, setParsedItems] = useState<BulkListingImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadSample = async () => {
    const template = await services.listings.getBulkImportTemplate(locale);
    const blob = new Blob([template.content], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", template.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("sellerworkspace.bulkImportModal.csvDownloaded"));
  };

  const parseCsv = async (content: string) => {
    try {
      const rows = await services.listings.parseBulkImportCsv({
        content,
        marketCode: activeMarket.code,
        defaultCity: location.city || currentUser.city,
        defaultPostalCode: location.postalCode || currentUser.postalCode,
      });
      setParsedItems(rows);
    } catch {
      setParsedItems([]);
      toast.error(t("sellerworkspace.bulkImportModal.csvParseError"));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      await parseCsv(text);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    const validItems = parsedItems.filter((i) => i.isValid);
    if (validItems.length === 0) return;

    setIsImporting(true);
    try {
      const published = await services.listings.publishBulkListings({
        sellerId: currentUser.id,
        marketCode: activeMarket.code,
        rows: validItems,
      });

      toast.success(
        t("sellerworkspace.bulkImportModal.importSuccess", {
          count: published.length,
        }),
      );
      onImportCompleted();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("sellerworkspace.bulkImportModal.importError"),
      );
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedItems.filter((i) => i.isValid).length;
  const validationLabel = (code?: BulkImportValidationCode) => {
    switch (code) {
      case "TITLE_REQUIRED":
        return t("sellerworkspace.bulkImportModal.validationTitleRequired");
      case "TITLE_TOO_SHORT":
        return t("sellerworkspace.bulkImportModal.validationTitleTooShort");
      case "TITLE_TOO_LONG":
        return t("publishing.publishWizard.titleTooLong", {
          max: PUBLICATION_CONSTRAINTS.title.maxLength,
        });
      case "CATEGORY_INVALID":
        return t("sellerworkspace.bulkImportModal.validationCategoryInvalid");
      case "ATTRIBUTES_INVALID":
        return t("sellerworkspace.bulkImportModal.validationAttributesInvalid");
      case "PRICE_INVALID":
        return t("sellerworkspace.bulkImportModal.validationPriceInvalid");
      default:
        return "";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("sellerworkspace.bulkImportModal.importMassifDeCatalogueCsv")}
      description={t(
        "sellerworkspace.bulkImportModal.importezSimultanementDesDizainesD",
      )}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-soft rounded-xl border border-border-subtle">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              leftIcon={<Download className="w-icon-sm h-icon-sm" />}
            >
              {t("sellerworkspace.bulkImportModal.modeleCsvVierge")}
            </Button>
          </div>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hover text-text-inverse font-bold text-xs transition-colors shadow-xs">
              <Upload className="w-icon-sm h-icon-sm" />
              {t("sellerworkspace.bulkImportModal.parcourirUnFichierCsv")}
            </span>
          </label>
        </div>

        {/* CSV preview table */}
        {parsedItems.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-text-supporting font-bold">
              <span>
                {t("sellerworkspace.bulkImportModal.rowsDetected", {
                  total: parsedItems.length,
                  valid: validCount,
                })}
              </span>
              {validCount < parsedItems.length && (
                <span className="text-warning flex items-center gap-1">
                  <AlertTriangle className="w-icon-sm h-icon-sm" />
                  {t("sellerworkspace.bulkImportModal.invalidRows", {
                    count: parsedItems.length - validCount,
                  })}
                </span>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto border border-border-base rounded-xl divide-y divide-border-subtle text-xs bg-bg-surface">
              {parsedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-2.5 flex items-center justify-between gap-3 ${
                    !item.isValid
                      ? "bg-danger-surface/50"
                      : "hover:bg-surface-soft"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-text-inverse-subtle text-micro w-4">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-text-main truncate max-w-xs">
                      {item.title}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {t("sellerworkspace.bulkImportModal.quantity", {
                        count: item.stock,
                      })}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-text-main">
                      {formatMoney(item.price)}
                    </span>
                    {item.isValid ? (
                      <Badge variant="success" size="sm">
                        {t("sellerworkspace.bulkImportModal.valid")}
                      </Badge>
                    ) : (
                      <Badge variant="urgent" size="sm">
                        {validationLabel(item.validationErrorCode)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-border-disabled rounded-2xl text-center space-y-2 bg-surface-soft/50">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-text-inverse-subtle" />
            <h4 className="font-bold text-text-strong text-sm">
              {t("sellerworkspace.bulkImportModal.deposezVotreFichierCsvIci")}
            </h4>
            <p className="text-xs text-text-tertiary max-w-sm mx-auto">
              {t(
                "sellerworkspace.bulkImportModal.utilisezNotreModeleAvecSeparateur",
              )}
            </p>
          </div>
        )}

        {/* Modal actions */}
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-border-subtle">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            {t("sellerworkspace.bulkImportModal.cancel")}
          </Button>

          <Button
            variant="primary"
            size="md"
            disabled={validCount === 0 || isImporting}
            isLoading={isImporting}
            onClick={handleExecuteImport}
            leftIcon={<CheckCircle2 className="w-icon-md h-icon-md" />}
          >
            {t("sellerworkspace.bulkImportModal.importAndPublish", {
              count: validCount,
            })}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
