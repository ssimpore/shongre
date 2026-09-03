import React, { useState, useEffect } from "react";
import { Smartphone, RefreshCw } from "lucide-react";
import { authService } from "../../../domains/auth/auth.service";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import { SUPPORTED_MARKETS } from "../../../configuration/market.config";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { AUTH_CONSTRAINTS } from "@shongre/contracts/auth";
import { FormField, Input, Notice, Select } from "../../../design-system";
import { secondsToMilliseconds } from "../../../utilities/time";

export interface PhoneVerificationModalProps {
  userId: string;
  initialPhone?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verifiedPhone: string) => void;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  userId,
  initialPhone = "",
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { activeMarket } = useMarketLocation();
  const [step, setStep] = useState<"input" | "otp">("input");
  const [phone, setPhone] = useState(initialPhone);
  const [selectedCountry, setSelectedCountry] = useState(activeMarket.code);
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(
    AUTH_CONSTRAINTS.verificationCodeResendCooldownSeconds,
  );

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (step === "otp" && countdown > 0) {
      timer = setInterval(
        () => setCountdown((current) => current - 1),
        secondsToMilliseconds(1),
      );
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  if (!isOpen) return null;

  const currentMarket =
    SUPPORTED_MARKETS[selectedCountry] || SUPPORTED_MARKETS[activeMarket.code];

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      setError(t("auth.phoneVerificationModal.phoneRequired"));
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = phone.startsWith("+")
        ? phone
        : `${currentMarket.phonePrefix} ${phone}`;
      const res = authService.sendPhoneCode(userId, fullPhone);
      if (res.success) {
        setStep("otp");
        setCountdown(AUTH_CONSTRAINTS.verificationCodeResendCooldownSeconds);
        setDemoCodeHint(res.demoCode || null);
        setSuccessMessage(res.message);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || t("auth.phoneVerificationModal.sendError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otpCode.length !== AUTH_CONSTRAINTS.verificationCodeLength) {
      setError(
        t("auth.phoneVerificationModal.codeLength", {
          count: AUTH_CONSTRAINTS.verificationCodeLength,
        }),
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = authService.verifyPhoneCode(userId, otpCode);
      if (res.success) {
        onSuccess(phone);
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || t("auth.phoneVerificationModal.validateError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    const fullPhone = phone.startsWith("+")
      ? phone
      : `${currentMarket.phonePrefix} ${phone}`;
    const res = authService.sendPhoneCode(userId, fullPhone);
    if (res.success) {
      setCountdown(AUTH_CONSTRAINTS.verificationCodeResendCooldownSeconds);
      setDemoCodeHint(res.demoCode || null);
      setSuccessMessage(t("auth.phoneVerificationModal.resendSuccess"));
      setError(null);
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
          <Smartphone className="h-icon-lg w-icon-lg" />
        </div>
      }
    >
      {error && (
        <Notice variant="error" className="mb-4">
          {error}
        </Notice>
      )}

      {successMessage && step === "otp" && (
        <Notice variant="success" className="mb-4">
          <div>
            <p>{successMessage}</p>
            {demoCodeHint && (
              <p className="mt-1 font-bold">
                {t("auth.phoneVerificationModal.demoCode", {
                  code: demoCodeHint,
                })}
              </p>
            )}
          </div>
        </Notice>
      )}

      {step === "input" ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <FormField
              className="col-span-1"
              label={t("auth.phoneVerificationModal.paysEtIndicatif")}
            >
              <Select
                aria-label={t("auth.phoneVerificationModal.paysEtIndicatif")}
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
              >
                {Object.values(SUPPORTED_MARKETS).map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.flag} {m.code} ({m.phonePrefix})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              className="col-span-2"
              label={t("auth.phoneVerificationModal.phoneNumber")}
              required
            >
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={currentMarket.phonePlaceholder}
                required
              />
            </FormField>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={isLoading}
          >
            {t("auth.phoneVerificationModal.recevoirMonCodeParSms")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <FormField
            label={t("auth.phoneVerificationModal.saisissezLeCodeRecuPar")}
            required
          >
            <Input
              type="text"
              inputMode="numeric"
              maxLength={AUTH_CONSTRAINTS.verificationCodeLength}
              value={otpCode}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="123456"
              autoFocus
              required
              className="text-center font-bold tracking-code"
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={isLoading}
          >
            {t("auth.phoneVerificationModal.confirmerLeNumero")}
          </Button>

          <div className="flex items-center justify-between text-xs pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep("input")}
              className="text-stone-500"
            >
              {t("auth.phoneVerificationModal.changerDeNumero")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={countdown > 0}
              className={countdown > 0 ? "text-stone-500" : "text-primary"}
              leftIcon={<RefreshCw className="w-icon-xs h-icon-xs" />}
            >
              {countdown > 0
                ? t("auth.phoneVerificationModal.resendCountdown", {
                    count: countdown,
                  })
                : t("auth.phoneVerificationModal.resend")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
