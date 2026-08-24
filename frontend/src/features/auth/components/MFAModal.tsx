import React, { useState } from "react";
import { ShieldCheck, Copy, Check, AlertCircle } from "lucide-react";
import { authService } from "../../../domains/auth/auth.service";
import { Button } from "../../../design-system/primitives/Button";
import { IconButton } from "../../../design-system/primitives/IconButton";
import { Image } from "../../../design-system/primitives/Image";
import { Modal } from "../../../design-system/primitives/Modal";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface MFAModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MFAModal: React.FC<MFAModalProps> = ({
  userId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [setupData] = useState(() => authService.generateMFASetup(userId));
  const [code, setCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(setupData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(setupData.backupCodes.join("\n"));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Veuillez saisir le code à 6 chiffres.");
      return;
    }

    setIsLoading(true);
    try {
      const res = authService.enableMFA(userId, code, setupData.backupCodes);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'activation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={t("auth.mFAModal.activerLaDoubleAuthentification2fa")}
      description={t("auth.mFAModal.protegezVotreCompteEtVos")}
      headerIcon={
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-surface text-success">
          <ShieldCheck className="h-5 w-5" />
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5">
        {/* Step 1: QR Code */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
          <span className="text-xs font-bold text-stone-900 block mb-2">
            {t("auth.mFAModal.1ScannezCeQrCode")}
          </span>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Image
              src={setupData.qrCodeUrl}
              alt="2FA QR Code"
              sizes="128px"
              className="w-32 h-32 rounded-lg border border-stone-300 bg-white p-1"
            />
            <div className="flex-1 min-w-0">
              <span className="text-micro text-stone-500 font-semibold block mb-1">
                {t("auth.mFAModal.ouSaisissezLaCleManuellement")}
              </span>
              <div className="flex items-center gap-2">
                <code className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-mono font-bold text-stone-900 select-all">
                  {setupData.secret}
                </code>
                <IconButton
                  size="sm"
                  variant="outline"
                  onClick={handleCopySecret}
                  ariaLabel={t("auth.mFAModal.copierLaCleSecrete")}
                >
                  {copiedSecret ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </IconButton>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Backup recovery codes */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-900">
              {t("auth.mFAModal.2CodesDeSecoursA")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyBackupCodes}
              aria-label={t("auth.mFAModal.copierLesCodesDeSecours")}
              className="text-primary"
              leftIcon={
                copiedBackup ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )
              }
            >
              {copiedBackup ? "Copiés" : "Copier les 8 codes"}
            </Button>
          </div>
          <p className="text-micro text-stone-500 mb-2.5">
            {t("auth.mFAModal.conservezCesCodesDansUn")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {setupData.backupCodes.map((code) => (
              <div
                key={code}
                className="px-2 py-1 bg-white border border-stone-200 rounded font-mono text-micro text-center font-bold text-stone-700"
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Verification form */}
        <form onSubmit={handleVerify} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              {t("auth.mFAModal.3EntrezLeCodeA")}
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="123456"
              required
              className="w-full px-4 py-3 text-center tracking-code text-xl font-black bg-stone-50 border border-stone-300 rounded-control text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white h-control-touch"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={isLoading}
          >
            {t("auth.mFAModal.verifierEtActiverLe2fa")}
          </Button>
        </form>
      </div>
    </Modal>
  );
};
