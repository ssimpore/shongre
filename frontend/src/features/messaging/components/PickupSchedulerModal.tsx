import React, { useState } from "react";
import { Select } from "../../../design-system";
import { Calendar } from "lucide-react";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { FormField, Input } from "../../../design-system/primitives/FormField";
import { useTranslation } from "../../../i18n/I18nProvider";

interface PickupSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, timeSlot: string, address: string) => Promise<void>;
  defaultAddress?: string;
}

export const PickupSchedulerModal: React.FC<PickupSchedulerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultAddress = "",
}) => {
  const { t } = useTranslation();
  const [date, setDate] = useState("2026-08-20");
  const [timeSlot, setTimeSlot] = useState("14h00 - 15h00");
  const [address, setAddress] = useState(
    defaultAddress || "Place de la Comédie, 34000 Montpellier",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !timeSlot || !address.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(date, timeSlot, address.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("messaging.pickupSchedulerModal.planifierLaRemiseEnMain")}
      description={t("messaging.pickupSchedulerModal.convenezDUnCreneauEt")}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <FormField
          label={t("messaging.pickupSchedulerModal.dateDuRendezVous")}
          required
        >
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </FormField>

        <FormField
          label={t("messaging.pickupSchedulerModal.creneauHoraire")}
          required
        >
          <Select
            size="compact"
            className="w-full"
            labelledByAncestor
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
          >
            <option value="10h00 - 12h00">
              {t("messaging.pickupSchedulerModal.matinee10h0012h00")}
            </option>
            <option value="12h00 - 14h00">Pause midi (12h00 - 14h00)</option>
            <option value="14h00 - 16h00">
              {t("messaging.pickupSchedulerModal.apresMidi14h0016h00")}
            </option>
            <option value="16h00 - 18h00">
              {t("messaging.pickupSchedulerModal.finDApresMidi16h00")}
            </option>
            <option value="18h00 - 20h00">
              {t("messaging.pickupSchedulerModal.soiree18h0020h00")}
            </option>
          </Select>
        </FormField>

        <FormField
          label={t("messaging.pickupSchedulerModal.lieuDeRendezVousEspace")}
          required
        >
          <Input
            type="text"
            placeholder={t(
              "messaging.pickupSchedulerModal.exDevantLeMetroPlace",
            )}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </FormField>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" fullWidth onClick={onClose} type="button">
            Annuler
          </Button>
          <Button
            variant="primary"
            fullWidth
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Calendar className="w-icon-md h-icon-md" />}
          >
            {t("messaging.pickupSchedulerModal.confirmerLeRendezVous")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
