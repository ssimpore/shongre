import { Smartphone } from "lucide-react";
import React, { useEffect, useState } from "react";
import { services } from "../../../api/client/service-registry";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { Button, FormField, Input, Notice } from "../../../design-system";
import { Modal } from "../../../design-system/primitives/Modal";
import { useTranslation } from "../../../i18n/I18nProvider";
import { AUTH_CONSTRAINTS } from "@shongre/contracts/auth";

export interface PhoneVerificationModalProps {
  initialPhone?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verifiedPhone: string) => void;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  initialPhone = "",
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { effectiveConfig } = useMarketLocation();
  const [phone, setPhone] = useState(initialPhone);
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPhone(initialPhone);
    setOtpCode("");
    setError(null);
  }, [initialPhone, isOpen]);

  if (!isOpen) return null;

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      setError(t("auth.phoneVerificationModal.phoneRequired"));
      return;
    }
    if (otpCode.length !== AUTH_CONSTRAINTS.verificationCodeLength) {
      setError(
        t("auth.phoneVerificationModal.codeLength", {
          count: AUTH_CONSTRAINTS.verificationCodeLength,
        }),
      );
      return;
    }
    const fullPhone = normalizedPhone.startsWith("+")
      ? normalizedPhone
      : `${effectiveConfig.localization.phonePrefix} ${normalizedPhone}`;
    setIsLoading(true);
    setError(null);
    try {
      const verified = await services.auth.verifyPhone(fullPhone, otpCode);
      if (!verified) {
        setError(t("auth.phoneVerificationModal.validateError"));
        return;
      }
      onSuccess(fullPhone);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("auth.phoneVerificationModal.validateError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("auth.phoneVerificationModal.verificationDuNumeroDeTelephone")}
      description={t(
        "auth.phoneVerificationModal.laVerificationTelephoniqueProtegeLes",
      )}
      headerIcon={
        <span className="flex h-10 w-10 items-center justify-center rounded-control bg-primary-light text-primary">
          <Smartphone className="h-icon-lg w-icon-lg" aria-hidden="true" />
        </span>
      }
    >
      <form onSubmit={verify} className="space-y-4">
        {error ? <Notice variant="error">{error}</Notice> : null}
        <FormField
          label={t("auth.phoneVerificationModal.phoneNumber")}
          required
        >
          <Input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={effectiveConfig.localization.phonePlaceholder}
            autoComplete="tel"
            required
          />
        </FormField>
        <FormField
          label={t("auth.phoneVerificationModal.saisissezLeCodeRecuPar")}
          required
        >
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={AUTH_CONSTRAINTS.verificationCodeLength}
            value={otpCode}
            onChange={(event) =>
              setOtpCode(event.target.value.replace(/\D/g, ""))
            }
            required
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {t("common.validate")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
